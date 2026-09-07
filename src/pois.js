// Elmhurst field-test POI data — origin 84-20 Corona Ave, Elmhurst Queens 11373.
// Corrected geocode 2026-09-07: road centroid 40.7405 / -73.8765 (Nominatim).
// Prior value (40.7374 / -73.8711) was ~700m SE — POIs were off the street.
//
// Walking loop: east on Corona Ave → north one block → east → south → back west.
// ~14 min at a slow walk. Three clusters; catch all in a cluster to unlock a rare.

export const POIS = [
  // ── Cluster A: Bodega Row (on Corona Ave, near origin) ──────────────────
  { id: 'a1', cluster: 'A', name: 'Deli Finling',       emoji: '🐟', lat: 40.7405, lng: -73.8765 },
  { id: 'a2', cluster: 'A', name: 'Bus Stop Zapcat',    emoji: '⚡', lat: 40.7400, lng: -73.8771 },
  { id: 'a3', cluster: 'A', name: 'Laundry Bubbit',     emoji: '💧', lat: 40.7396, lng: -73.8778 },
  { id: 'a4', cluster: 'A', name: 'Corner Leafish',     emoji: '🌿', lat: 40.7404, lng: -73.8755 },

  // ── Cluster B: North Block (one street north of Corona Ave) ─────────────
  { id: 'b1', cluster: 'B', name: 'Pharmacy Leafish',   emoji: '🌿', lat: 40.7415, lng: -73.8768 },
  { id: 'b2', cluster: 'B', name: 'Newsstand Spindrift',emoji: '🌀', lat: 40.7424, lng: -73.8762 },
  { id: 'b3', cluster: 'B', name: 'Subway Zapcat',      emoji: '⚡', lat: 40.7432, lng: -73.8754 },

  // ── Cluster C: East Loop (82nd St area, looping back) ───────────────────
  { id: 'c1', cluster: 'C', name: 'Playground Flameworm', emoji: '🔥', lat: 40.7420, lng: -73.8742 },
  { id: 'c2', cluster: 'C', name: 'Bodega Finling',     emoji: '🐟', lat: 40.7408, lng: -73.8737 },
  { id: 'c3', cluster: 'C', name: 'Stoop Bubbit',       emoji: '💧', lat: 40.7396, lng: -73.8742 },
  { id: 'c4', cluster: 'C', name: 'Bench Spindrift',    emoji: '🌀', lat: 40.7393, lng: -73.8758 },
]

// Rare creatures unlocked when all POIs in a cluster are caught.
export const CLUSTERS = {
  A: {
    name: 'Bodega Row',
    total: 4,
    rare: { id: 'rare_a', cluster: null, isRare: true, name: 'Golden Finling', emoji: '✨🐟', lat: 40.7400, lng: -73.8767 },
  },
  B: {
    name: 'North Block',
    total: 3,
    rare: { id: 'rare_b', cluster: null, isRare: true, name: 'Thundercat',     emoji: '✨⚡', lat: 40.7424, lng: -73.8762 },
  },
  C: {
    name: 'East Loop',
    total: 4,
    rare: { id: 'rare_c', cluster: null, isRare: true, name: 'Infernal Worm',  emoji: '✨🔥', lat: 40.7407, lng: -73.8742 },
  },
}
