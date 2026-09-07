// Catch-attempt event log.
//
// Every catch attempt — passed, failed, or gate-blocked — is logged with the
// fields below. This is what makes the accuracy gate (25m) a TUNABLE after the
// field test rather than a bet we can't revisit: we re-run the analysis at a
// different threshold against this real data.
//
//   arm          'A' (must be within CATCH_RADIUS) | 'B' (catches from anywhere)
//   outcome      'caught' | 'missed' | 'gate_blocked'
//   distance     meters to the nearest POI (computed_distance)
//   accuracy     coords.accuracy in meters at the moment of the attempt
//   poi          the POI the attempt was against (id/name), if any
//
// The phone call at the day-8 interview is still the primary instrument; this
// log is corroboration. The Vercel serverless POST of these records is a
// separate, later step (galaxy, 2026-09-07).
export function logCatchAttempt({ arm, outcome, distance, accuracy, poi }) {
  const record = {
    arm,
    outcome,
    distance: distance == null ? null : +distance.toFixed(1),
    accuracy: accuracy == null ? null : +accuracy.toFixed(1),
    poi: poi ? (typeof poi === 'string' ? poi : poi.name) : null,
    ts: Date.now(),
  }
  console.info('[catch]', record)
  return record
}
