// ---------------------------------------------------------------------------
// Geolocation + catch-gate constants
// ---------------------------------------------------------------------------
// accuracy gate  < 25  (95% confidence radius of the GPS fix)
// catch radius   50    (trigger distance from the player to a creature)
export const ACCURACY_GATE = 25
export const CATCH_RADIUS  = 50

// watchPosition options
export const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
}
