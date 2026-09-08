# Map style backup (pre-vector-map migration)

This is a reference copy of the `MAP_STYLE` array from `app.js` (the warm, sandy/parchment raster map style, tuned for bright-sunlight readability), preserved here because switching to Google's vector map renderer (Map ID) drops local JS `styles:` support entirely — per Google's own API reference: *"This feature is not available when using a map ID, or when using vector maps (use cloud-based maps styling instead)."*

Once the vector-map migration happens, this same visual result needs to be manually recreated as a Cloud Console "Map Style" tied to the new Map ID (the Console's visual style editor covers the same category of rules — feature type / element type / visibility / color — but uses a different JSON schema, not a paste-this-in job). This file exists so the intended visual result stays in version control even after the live source of truth moves to Cloud Console.

See also: `project_sabri_map_rotation_design.md` in Claude's memory for the full design-scoping investigation (vector vs. raster-transform tradeoffs, marker counter-rotation cost, permission-flow options) and the decision made from it.

## Original source

`app.js`, `const MAP_STYLE`, immediately above `initMap()`. Comment there: "Warm, sandy/parchment style tuned for bright-sunlight readability — the opposite of a typical dark/night map style." Also hides default Google POI business icons/labels (they compete visually with the app's own place pins) and hides transit.

## The style array

```json
[
  { "elementType": "geometry", "stylers": [{ "color": "#F2E9DA" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#3A2F22" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#F2E9DA" }, { "weight": 3 }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#A9CBD8" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#EFE3CF" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#E4D8BE" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#C9D9B5" }] },
  { "featureType": "poi", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "poi.business", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#FBF6EC" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#F7EFDD" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#E9C989" }] },
  { "featureType": "road", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#C9B896" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
]
```

## Color reference (for manually recreating in Cloud Console)

| Element | Color |
|---|---|
| Base geometry fill | `#F2E9DA` (sandy parchment) |
| Label text fill | `#3A2F22` (dark brown) |
| Label text stroke/halo | `#F2E9DA`, weight 3 |
| Water | `#A9CBD8` (soft blue) |
| Landscape | `#EFE3CF` (tan) |
| POI geometry | `#E4D8BE` (muted tan) |
| Park geometry | `#C9D9B5` (green) |
| Road geometry | `#FBF6EC` (off-white) |
| Arterial road geometry | `#F7EFDD` |
| Highway geometry | `#E9C989` (amber) |
| Administrative boundary stroke | `#C9B896` |

Visibility `off`: POI icons/labels, business POIs, road icons, transit.
