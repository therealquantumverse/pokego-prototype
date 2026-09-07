// Walk origin: 84-20 Corona Ave, Elmhurst, Queens 11373.
// Nominatim road centroid for Corona Ave (11373): 40.7405, -73.8765.
// Prior value (40.7374, -73.8711) was ~700m SE; corrected 2026-09-07.
export const START_COORD = {
  lat: 40.7405,
  lng: -73.8765,
}

export const START_LABEL = "84-20 Corona Ave, Elmhurst"

// ---------------------------------------------------------------------------
// Geolocation + catch-gate constants
// ---------------------------------------------------------------------------
// Spec: galaxy (2026-09-07), corrected by opus555.
//   - accuracy gate  < 25  (95% confidence radius of the GPS fix)
//   - catch radius   50    (trigger distance from the player to a POI)
// A passing fix means the true position is within ~75m worst case — defensible
// against the 50m trigger, and tight enough that Arm A can't drift to Arm B.
//
// The threshold is a TUNABLE, not a bet: every catch attempt (passed, failed,
// or gate-blocked) logs computed_distance + coords.accuracy + arm + outcome,
// so we can re-run the analysis at a different threshold against real data.
export const ACCURACY_GATE = 25
export const CATCH_RADIUS = 50

// watchPosition options (galaxy spec, 2026-09-07)
export const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
}
