// Hardcoded starting coordinate for the prototype.
// Swap this for the real deployment site before recruiting testers.
export const START_COORD = {
  lat: 40.748447,
  lng: -73.985662,
}

export const START_LABEL = "Start point"

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
