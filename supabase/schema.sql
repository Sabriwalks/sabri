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
  language text,
  voice text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent — safe to re-run against a database that already has the
-- original profiles table from before language/voice/onboarding_complete
-- existed (create table if not exists is a no-op there, so these columns
-- would otherwise never get added).
alter table profiles add column if not exists language text;
alter table profiles add column if not exists voice text;
alter table profiles add column if not exists onboarding_complete boolean not null default false;

-- Which of the 4 fixed guide archetypes (historian/local_friend/storyteller/
-- wanderer — see GUIDE_ARCHETYPES in server.js) this user wants narrating
-- to them. The archetype's personality is fixed; only its generated
-- name/bio/style vary per city (see guide_personas below).
alter table profiles add column if not exists preferred_archetype text not null default 'local_friend';

-- Behavior-derived interests, distinct from the stated `interests` column
-- gathered at onboarding — produced by an occasional Claude pass over a
-- user's interaction_events (see server.js inferInterestsForUser). Used to
-- subtly weight, never override, stated interests.
alter table profiles add column if not exists inferred_interests jsonb;

-- Pillar 3 (ENABLE_NEEDS_ROUTING) food/place ranking — stated dietary needs
-- (vegetarian, vegan, halal, kosher, allergies, etc.), same shape/pattern
-- as `interests` above (a controlled-vocabulary-flavored text array, not a
-- single enum, since a person can have more than one).
alter table profiles add column if not exists dietary_restrictions text[] default '{}';

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

-- Generated guide personas — a shared cache across ALL users, not
-- per-user data. The first user to ever request a given (city, archetype)
-- combination triggers one Claude call (see /api/get-persona); everyone
-- after that for the same city+archetype gets an instant row read. The
-- archetype's fixed personality/focus lives in server.js's
-- GUIDE_ARCHETYPES constant, never in this table.
create table if not exists guide_personas (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  country text,
  archetype text not null check (archetype in ('historian', 'local_friend', 'storyteller', 'wanderer')),
  generated_name text not null,
  generated_bio text not null,
  style_notes text not null,
  created_at timestamptz not null default now(),
  unique (city, archetype)
);

-- language added after the fact — a persona's generated NAME is now
-- matched to the gender of whichever OpenAI TTS voice is the default for
-- that language (see VOICE_GENDER/resolveDefaultVoiceForLanguage in
-- server.js), so the same city+archetype needs a different persona per
-- language (an English tour and a Spanish tour of the same city can
-- reasonably end up with a differently-gendered guide, since English's
-- default voice is male and Spanish's is female). Existing rows default to
-- 'en' — they were generated before this existed, when English was
-- implicitly the only case that mattered for the very first cohort.
alter table guide_personas add column if not exists language text not null default 'en';
do $$
begin
  alter table guide_personas drop constraint guide_personas_city_archetype_key;
exception
  when undefined_object then null;
end $$;
do $$
begin
  alter table guide_personas add constraint guide_personas_city_archetype_language_key unique (city, archetype, language);
exception
  when duplicate_object then null;
end $$;

-- Per-user, unlike guide_personas above (which is a shared content cache
-- with no notion of any individual user). Tracks whether THIS user has
-- already had a full self-introduction from a given persona in a given
-- city, so it fires once ever per user+city+archetype rather than once per
-- session — staying in Jerusalem a week with the same historian persona
-- should mean one introduction, not one every session/day. See
-- /api/check-persona-introduction and buildPersonaGuidance's
-- isFirstPersonaMeeting branch in server.js. Guests (no account) get an
-- equivalent client-side-only check via localStorage instead of a row
-- here — same guest/signed-in split already used for profile/settings
-- persistence elsewhere in this app.
create table if not exists user_persona_introductions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  city text not null,
  archetype text not null,
  introduced_at timestamptz not null default now(),
  unique (user_id, city, archetype)
);

-- language added for the same reason as guide_personas above — a
-- differently-gendered/named persona per language is effectively a
-- different persona from the user's perspective, so switching languages in
-- the same city should trigger a fresh introduction rather than silently
-- reusing the "already met" flag from a different-language persona.
alter table user_persona_introductions add column if not exists language text not null default 'en';
do $$
begin
  alter table user_persona_introductions drop constraint user_persona_introductions_user_id_city_archetype_key;
exception
  when undefined_object then null;
end $$;
do $$
begin
  alter table user_persona_introductions
    add constraint user_persona_introductions_user_id_city_archetype_language_key
    unique (user_id, city, archetype, language);
exception
  when duplicate_object then null;
end $$;

-- Same shared-cache pattern as guide_personas, for a different real
-- problem: real-world multi-turn Q&A about one place produced three
-- different construction dates and two different architectural styles in
-- the same conversation, because Claude was regenerating historical claims
-- fresh on every /api/ask call with no memory of what it already said. The
-- first substantive question about a place generates and caches these
-- facts once (see /api/get-place-facts); every question after that, from
-- this user or anyone else, grounds its answer in the same cached facts
-- instead of re-deriving them. Deliberately a small, fixed set of factual
-- fields (not a free-form narration) — the goal is consistency on the
-- specific claims that are easy to contradict yourself on (dates, style),
-- not caching Sabri's whole personality/narration style for a place.
create table if not exists place_facts (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  place_name text,
  city text,
  construction_period text,
  architectural_style text,
  notable_history text,
  created_at timestamptz not null default now()
);

-- Behavioral event stream — every meaningful interaction signal (narration
-- listened-to-completion vs skipped, pins tapped vs ignored, route
-- deviations, camera usage, etc.), logged fire-and-forget via
-- /api/log-event so it never blocks the actual UX. event_data is a free-form
-- jsonb payload whose shape depends on event_type (see LOGGED_EVENT_TYPES
-- in server.js for the full list and app.js call sites for each shape).
create table if not exists interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  session_id text,
  event_type text not null,
  event_data jsonb default '{}',
  city text,
  created_at timestamptz not null default now()
);

-- Tester bug/feedback reports (Settings > Report a Problem). Deliberately
-- NOT gated behind sign-in — user_id is nullable so someone can report a
-- problem before ever completing onboarding, which is exactly when a lot
-- of real bugs surface. screenshot_url stores a Storage PATH (not a public
-- URL — the feedback-screenshots bucket below is private), resolved to a
-- signed URL on demand by the admin dashboard (see server.js).
create table if not exists feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  message text not null,
  screenshot_url text,
  app_context jsonb default '{}',
  status text not null default 'new' check (status in ('new', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

-- Centralized third-party API spend tracking (Anthropic, OpenAI, Google
-- Maps/Places, Serper, OpenWeatherMap) — written via a single thin wrapper
-- around each provider client (see logApiUsage/API_PRICING in server.js),
-- not scattered logging calls per endpoint. Costs are approximate/
-- illustrative (fixed per-provider rates, not a live pricing lookup) —
-- good enough for trend/budget tracking at this stage, not meant to be
-- exact accounting. on delete set null (not cascade) deliberately — a
-- deleted user's past API spend already happened and is still real
-- historical cost data worth keeping in aggregate, even once the user_id
-- it was attributed to no longer resolves to anything.
create table if not exists api_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  endpoint text not null,
  units numeric,
  cost_usd numeric not null default 0,
  user_id uuid references profiles (id) on delete set null,
  meta jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Curated, quality-gated cache of full narrations for popular places —
-- distinct from place_facts (which caches a handful of structured
-- historical facts for Q&A grounding, not a full narration). Only a place
-- that's crossed POPULARITY_THRESHOLD_USERS distinct visitors in the last
-- 30 days (see checkPlacePopularity in server.js) gets a canonical
-- narration generated at all, and only an approved one (a human reviews
-- every row via the admin dashboard's review queue, same
-- pending/approved/rejected pattern as feedback_reports) is ever eligible
-- to be served — see getApprovedCanonicalNarration/maybePromoteToReviewQueue
-- in server.js. Never served verbatim: a cheap personalization wrapper call
-- adapts it to the current listener at serve time (see
-- streamPersonalizedFromCanonical), so this stores the substantive
-- content — facts, structure, framing — not the final spoken text.
create table if not exists canonical_narrations (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  place_name text not null,
  city text,
  country text,
  narration_text text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Pillar 2 (ENABLE_RELATIONSHIP_CONTINUITY) — region-scoped "trip memory".
-- Scoped to `region_key` (city — the only geographic tier already used
-- consistently elsewhere, e.g. interaction_events.city, walk_sessions.city;
-- there is no established neighborhood-tier concept to reuse), not
-- per-session and not cross-trip. Populated opportunistically by extracting
-- 1-3 short natural-language facts from a user's recent conversation/event
-- history on the same cadence as inferred_interests (see
-- maybeTriggerRegionMemoryExtraction in app.js and /api/extract-region-
-- memory in server.js) — a new function called alongside the existing
-- inference job, not a change to it. Read back into narration via
-- buildRegionMemoryGuidance (server.js), only when ENABLE_RELATIONSHIP_
-- CONTINUITY is on.
create table if not exists region_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  region_key text not null,
  memory_text text not null,
  source_type text, -- 'stated_preference' | 'reaction' | 'answer'
  created_at timestamptz not null default now()
);

-- Pillar 3 (ENABLE_NEEDS_ROUTING) — Guided Tour detour-and-resume cache.
-- Holds a snapshot of a planned tour's remaining stops at the moment the
-- user accepts a meal/weather detour suggestion, so the app can reconnect
-- to the next planned stop afterward without regenerating the tour. Rows
-- are cleaned up by a daily Vercel Cron job (see /api/cron/cleanup-detour-
-- cache in server.js, mirroring the existing /api/cron/check-budget
-- pattern) roughly 1 day after creation — this codebase has no pg_cron/TTL
-- extension in use, so a daily cron sweep (the one background-job mechanism
-- that already exists here) was chosen over a new piece of infrastructure.
create table if not exists tour_detour_cache (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid references profiles (id) on delete set null,
  remaining_stops jsonb not null,
  detour_reason text, -- 'meal' | 'weather_shade' | 'weather_shelter'
  created_at timestamptz not null default now()
);

create index if not exists visited_places_user_id_idx on visited_places (user_id, visited_at desc);
create index if not exists walk_sessions_user_id_idx on walk_sessions (user_id, started_at desc);
create index if not exists user_questions_user_id_idx on user_questions (user_id, asked_at desc);
create index if not exists interaction_events_user_id_idx on interaction_events (user_id);
create index if not exists interaction_events_event_type_idx on interaction_events (event_type);
create index if not exists interaction_events_created_at_idx on interaction_events (created_at desc);
create index if not exists feedback_reports_status_created_at_idx on feedback_reports (status, created_at desc);
create index if not exists place_facts_place_id_idx on place_facts (place_id);
create index if not exists user_persona_introductions_user_id_idx on user_persona_introductions (user_id);
create index if not exists api_usage_created_at_idx on api_usage (created_at desc);
create index if not exists api_usage_provider_idx on api_usage (provider);
create index if not exists canonical_narrations_status_idx on canonical_narrations (status);
create index if not exists region_memory_user_region_idx on region_memory (user_id, region_key);
create index if not exists tour_detour_cache_created_at_idx on tour_detour_cache (created_at);

-- The backend always talks to Supabase with the service_role key (which
-- bypasses RLS entirely), so these policies exist purely as defense in
-- depth in case the anon/authenticated key is ever used to touch these
-- tables directly — every user can only ever see or write their own rows.
alter table profiles enable row level security;
alter table walk_sessions enable row level security;
alter table visited_places enable row level security;
alter table user_questions enable row level security;
alter table guide_personas enable row level security;
alter table interaction_events enable row level security;
alter table feedback_reports enable row level security;
alter table place_facts enable row level security;
alter table user_persona_introductions enable row level security;
alter table api_usage enable row level security;
alter table canonical_narrations enable row level security;
alter table region_memory enable row level security;
alter table tour_detour_cache enable row level security;
-- No anon/authenticated policy for tour_detour_cache — like api_usage and
-- canonical_narrations, this is purely a server-side implementation detail
-- (detour/resume bookkeeping keyed by session_id), never queried directly
-- by a browser with the anon key.
-- No anon/authenticated policy for canonical_narrations, same reasoning as
-- api_usage — the threshold-check/cache-serve logic and the admin review
-- queue both only ever run through the server's service-role client, never
-- queried directly by a browser.

drop policy if exists "Users manage their own profile" on profiles;
create policy "Users manage their own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage their own walk sessions" on walk_sessions;
create policy "Users manage their own walk sessions" on walk_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own visited places" on visited_places;
create policy "Users manage their own visited places" on visited_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own questions" on user_questions;
create policy "Users manage their own questions" on user_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own persona introductions" on user_persona_introductions;
create policy "Users manage their own persona introductions" on user_persona_introductions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own region memory" on region_memory;
create policy "Users manage their own region memory" on region_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- guide_personas is shared, non-sensitive cached content (a generated
-- name/bio/style per city+archetype, nothing user-specific) — readable by
-- anyone, but only ever written by the server's service-role client
-- (/api/get-persona), which bypasses RLS entirely, so no insert/update
-- policy is needed here.
drop policy if exists "Anyone can read guide personas" on guide_personas;
create policy "Anyone can read guide personas" on guide_personas
  for select using (true);

-- Same reasoning as guide_personas above: shared, non-sensitive cached
-- facts, only ever written server-side via /api/get-place-facts.
drop policy if exists "Anyone can read place facts" on place_facts;
create policy "Anyone can read place facts" on place_facts
  for select using (true);

drop policy if exists "Users manage their own interaction events" on interaction_events;
create policy "Users manage their own interaction events" on interaction_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Anyone (signed in or fully anonymous) can file a bug report — that's the
-- whole point, reporting shouldn't require completing onboarding first.
-- Deliberately no select/update policy for anon/authenticated: only the
-- server's service-role client (which bypasses RLS) can read or triage
-- reports, via the admin dashboard — a tester should never be able to read
-- back OTHER people's reports through the anon key.
drop policy if exists "Anyone can submit feedback" on feedback_reports;
create policy "Anyone can submit feedback" on feedback_reports
  for insert with check (true);

-- Feedback screenshots — private bucket (public = false): uploadable by
-- anyone (same "no sign-in required" reasoning as the table above), but
-- only ever readable via signed URLs the admin dashboard generates
-- server-side with the service-role client, which bypasses storage RLS
-- entirely. No select policy is added here for the same reason none is
-- added for the table itself.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-screenshots', 'feedback-screenshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Anyone can upload feedback screenshots" on storage.objects;
create policy "Anyone can upload feedback screenshots" on storage.objects
  for insert with check (bucket_id = 'feedback-screenshots');

-- Belt-and-suspenders, added after a real incident: service_role's defining
-- trait is BYPASSRLS (it skips row-level security policies), which is a
-- SEPARATE Postgres permission layer from table-level GRANTs (INSERT,
-- SELECT, etc.). Supabase normally auto-provisions these grants, but tables
-- created via raw SQL through the SQL Editor (as this whole file is) can
-- end up without them, producing "permission denied for table X" even with
-- a genuine, correctly-scoped service_role key — which is exactly what
-- happened here. These are idempotent and safe to re-run.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Simple daily-per-provider spend rollup, read by both the admin
-- dashboard's spend section and the daily budget-check cron
-- (/api/cron/check-budget in server.js, see vercel.json's crons array).
-- Deliberately just a view, not a materialized one — api_usage is nowhere
-- near large enough yet for that to matter, and a plain view never goes
-- stale.
create or replace view api_usage_daily as
select
  date_trunc('day', created_at) as day,
  provider,
  count(*) as request_count,
  sum(cost_usd) as total_cost_usd
from api_usage
group by 1, 2
order by 1 desc, 2;
