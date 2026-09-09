export const ACCURACY_GATE = 80

// Tuned together with SPAWN_DENSITY against scripts/verify-spawn.mjs. At 50 m
// and 0.30 density a stationary player had nothing in reach 24% of the time,
// which reads as "nothing is clickable" rather than "go for a walk".
export const CATCH_RADIUS  = 70

export const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
}

export const STARTING_BALLS = 20
