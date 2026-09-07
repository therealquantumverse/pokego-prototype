// Elmhurst field-test POI data — origin 84-20 Corona Ave, Elmhurst Queens 11373.
// Walking loop: south on Corona → east on 88th Ave → north on Junction Blvd →
// up to Queens Blvd → back south. ~14 min at a slow walk, ~1.2 km.
//
// Three clusters: catch all in a cluster to unlock a rare creature in that area.

export const POIS = [
  // ── Cluster A: Bodega Row (near origin, south leg) ──────────────────────
  { id: 'a1', cluster: 'A', name: 'Deli Finling',      emoji: '🐟', lat: 40.7374, lng: -73.8711 },
  { id: 'a2', cluster: 'A', name: 'Bus Stop Zapcat',   emoji: '⚡', lat: 40.7368, lng: -73.8716 },
  { id: 'a3', cluster: 'A', name: 'Laundry Bubbit',    emoji: '💧', lat: 40.7360, lng: -73.8720 },
  { id: 'a4', cluster: 'A', name: 'Corner Leafish',    emoji: '🌿', lat: 40.7352, lng: -73.8722 },

  // ── Cluster B: Queens Blvd (north leg) ──────────────────────────────────
  { id: 'b1', cluster: 'B', name: 'Pharmacy Leafish',  emoji: '🌿', lat: 40.7385, lng: -73.8703 },
  { id: 'b2', cluster: 'B', name: 'Newsstand Spindrift', emoji: '🌀', lat: 40.7395, lng: -73.8696 },
  { id: 'b3', cluster: 'B', name: 'Subway Zapcat',     emoji: '⚡', lat: 40.7404, lng: -73.8690 },

  // ── Cluster C: East Loop (86th St / Junction Blvd) ──────────────────────
  { id: 'c1', cluster: 'C', name: 'Playground Flameworm', emoji: '🔥', lat: 40.7386, lng: -73.8672 },
  { id: 'c2', cluster: 'C', name: 'Bodega Finling',    emoji: '🐟', lat: 40.7373, lng: -73.8663 },
  { id: 'c3', cluster: 'C', name: 'Stoop Bubbit',      emoji: '💧', lat: 40.7358, lng: -73.8668 },
  { id: 'c4', cluster: 'C', name: 'Bench Spindrift',   emoji: '🌀', lat: 40.7350, lng: -73.8695 },
]

// Rare creatures unlocked when all POIs in a cluster are caught.
export const CLUSTERS = {
  A: {
    name: 'Bodega Row',
    total: 4,
    rare: { id: 'rare_a', cluster: null, isRare: true, name: 'Golden Finling', emoji: '✨🐟', lat: 40.7363, lng: -73.8716 },
  },
  B: {
    name: 'Queens Blvd',
    total: 3,
    rare: { id: 'rare_b', cluster: null, isRare: true, name: 'Thundercat',     emoji: '✨⚡', lat: 40.7395, lng: -73.8699 },
  },
  C: {
    name: 'East Loop',
    total: 4,
    rare: { id: 'rare_c', cluster: null, isRare: true, name: 'Infernal Worm',  emoji: '✨🔥', lat: 40.7367, lng: -73.8676 },
  },
}
