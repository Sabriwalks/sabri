-- Sabri database schema.
--
-- supabase-js has no API for executing arbitrary DDL (CREATE TABLE etc.),
-- so server.js cannot create these tables on its own — run this file once
-- in the Supabase SQL editor (or `supabase db push` if you use the CLI).
-- server.js's /api/setup-db endpoint (also checked once on startup) verifies
-- whether this has already been applied and tells you which tables, if any,
-- are still missing.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  reason text,
  interests text[] default '{}',
  companions text,
  depth text,
  home_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists walk_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  neighborhood text,
  city text,
  places_visited text[] default '{}',
  total_narrations integer default 0,
  questions_asked integer default 0
);

create table if not exists visited_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  place_id text not null,
  place_name text,
  neighborhood text,
  city text,
  visited_at timestamptz not null default now(),
  narration_summary text
);

create table if not exists user_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  place_id text,
  question text,
  answer_summary text,
  asked_at timestamptz not null default now()
);

create index if not exists visited_places_user_id_idx on visited_places (user_id, visited_at desc);
create index if not exists walk_sessions_user_id_idx on walk_sessions (user_id, started_at desc);
create index if not exists user_questions_user_id_idx on user_questions (user_id, asked_at desc);

-- The backend always talks to Supabase with the service_role key (which
-- bypasses RLS entirely), so these policies exist purely as defense in
-- depth in case the anon/authenticated key is ever used to touch these
-- tables directly — every user can only ever see or write their own rows.
alter table profiles enable row level security;
alter table walk_sessions enable row level security;
alter table visited_places enable row level security;
alter table user_questions enable row level security;

create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage their own walk sessions" on walk_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own visited places" on visited_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own questions" on user_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
