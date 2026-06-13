import type { LatLng } from "./types";

export const INITIAL_CENTER: LatLng = { lat: 49.9929, lng: 8.2473 };
/** Below this zoom we don't query Overpass — too many parking spots, slow + spammy. */
export const PARKING_LOAD_MIN_ZOOM = 11;
/** Map zoom limits. */
export const MAP_MIN_ZOOM = 4;
export const MAP_MAX_ZOOM = 18;
/** Debounce for bbox change → backend query. */
export const BBOX_DEBOUNCE_MS = 400;
