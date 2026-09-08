import { CREATURE_TEMPLATES, CLUSTER_META } from '../pois'

const SPAWN_KEY = 'pokego_spawn_v3'
const HOME_KEY  = 'pokego_home_v3'
const RESPAWN_DIST = 400 // metres; regenerate if player drifts this far from home

// Random point at distance [minM, maxM] metres from center in a random direction.
function randomOffset(center, minM, maxM) {
  const r     = minM + Math.random() * (maxM - minM)
  const angle = Math.random() * 2 * Math.PI
  const lat   = center.lat + (r * Math.cos(angle)) / 111320
  const lng   = center.lng + (r * Math.sin(angle)) / (111320 * Math.cos(center.lat * Math.PI / 180))
  return { lat, lng }
}

export function generateSpawn(center) {
  return CREATURE_TEMPLATES.map(t => ({
    ...t,
    ...randomOffset(center, 40, 200),
  }))
}

// Load from localStorage if the player is still near home; otherwise regenerate.
export function loadOrCreateSpawn(center, distanceFn) {
  try {
    const raw  = localStorage.getItem(SPAWN_KEY)
    const home = JSON.parse(localStorage.getItem(HOME_KEY) || 'null')
    if (raw && home && distanceFn(center, home) < RESPAWN_DIST) {
      return JSON.parse(raw)
    }
  } catch {}
  const pois = generateSpawn(center)
  localStorage.setItem(SPAWN_KEY, JSON.stringify(pois))
  localStorage.setItem(HOME_KEY,  JSON.stringify(center))
  return pois
}

// Spawn a rare near the centroid of its cluster with some offset.
export function spawnRare(clusterKey, allSpawned) {
  const members = allSpawned.filter(p => p.cluster === clusterKey)
  if (!members.length) return null
  const lat  = members.reduce((s, p) => s + p.lat, 0) / members.length
  const lng  = members.reduce((s, p) => s + p.lng, 0) / members.length
  const meta = CLUSTER_META[clusterKey]
  return {
    id:     meta.rareId,
    cluster: null,
    isRare: true,
    name:   meta.rareName,
    emoji:  meta.rareEmoji,
    ...randomOffset({ lat, lng }, 20, 80),
  }
}

export function getInitialMapCenter() {
  try {
    const home = JSON.parse(localStorage.getItem(HOME_KEY) || 'null')
    if (home?.lat && home?.lng) return home
  } catch {}
  return null
}
