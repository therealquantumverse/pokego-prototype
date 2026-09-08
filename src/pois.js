// Creature templates — no hardcoded coordinates.
// Positions are generated dynamically around the player's real GPS fix.

export const CREATURE_TEMPLATES = [
  { id: 'a1', cluster: 'A', name: 'Finling',   emoji: '🐟' },
  { id: 'a2', cluster: 'A', name: 'Zapcat',    emoji: '⚡' },
  { id: 'a3', cluster: 'A', name: 'Bubbit',    emoji: '💧' },
  { id: 'a4', cluster: 'A', name: 'Leafish',   emoji: '🌿' },
  { id: 'b1', cluster: 'B', name: 'Leafish',   emoji: '🌿' },
  { id: 'b2', cluster: 'B', name: 'Spindrift', emoji: '🌀' },
  { id: 'b3', cluster: 'B', name: 'Zapcat',    emoji: '⚡' },
  { id: 'c1', cluster: 'C', name: 'Flameworm', emoji: '🔥' },
  { id: 'c2', cluster: 'C', name: 'Finling',   emoji: '🐟' },
  { id: 'c3', cluster: 'C', name: 'Bubbit',    emoji: '💧' },
  { id: 'c4', cluster: 'C', name: 'Spindrift', emoji: '🌀' },
]

export const CLUSTER_META = {
  A: { name: 'Water Pack',  total: 4, rareId: 'rare_a', rareName: 'Golden Finling', rareEmoji: '✨🐟' },
  B: { name: 'Wind Pack',   total: 3, rareId: 'rare_b', rareName: 'Thundercat',     rareEmoji: '✨⚡' },
  C: { name: 'Fire Pack',   total: 4, rareId: 'rare_c', rareName: 'Infernal Worm',  rareEmoji: '✨🔥' },
}
