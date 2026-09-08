// Deterministic spawn engine.
//
// The world is divided into a fixed lat/lng grid. For each (cell, time window)
// pair we seed a PRNG from a hash of that pair and let it decide whether a
// creature spawns, which species, its level, and its IVs.
//
// Because the seed depends only on place and clock, this gives us three things
// with no server involved:
//
//   1. World consistency — two devices standing in the same place at the same
//      time see the same creature with the same stats.
//   2. Liveness — the world turns over every SPAWN_WINDOW_MS, so the map is
//      different when you come back. Nothing is persisted, so nothing goes stale.
//   3. Place matters — biome weighting means a park and a waterfront draw from
//      different species pools.
//
// Spawns are computed, never stored. Only *caught* creatures persist.

import { rngFor, randInt, pickWeighted } from './rng.js'
import { SPECIES, RARITY_WEIGHT } from '../species.js'
import { rollIVs, computeCP, computeHP, MAX_WILD_LEVEL } from './stats.js'

// ~0.00045° latitude ≈ 50 m. Longitude cells narrow toward the poles; at mid
// latitudes they run ~35–40 m wide, which is close enough for gameplay.
//
// Cell size, density and scan radius are tuned together against
// scripts/verify-spawn.mjs: expected live spawns per cell equals SPAWN_DENSITY
// exactly, so catchables within the 50 m radius ≈ (7854 / cellArea) * density.
// At these values that lands near 1.2, which keeps something in reach most of
// the time without turning the map into a swarm.
export const CELL_DEG = 0.00045

export const SPAWN_WINDOW_MS = 30 * 60 * 1000

// Fraction of cells that produce a creature in a given window.
export const SPAWN_DENSITY = 0.30

// Cells scanned in each direction from the player. 3 → a 7×7 block, ~175 m.
export const SCAN_RADIUS_CELLS = 3

const BIOMES = ['urban', 'park', 'water', 'grass', 'forest', 'cave', 'sky']

export function cellCoords(lat, lng) {
  return { cx: Math.floor(lat / CELL_DEG), cy: Math.floor(lng / CELL_DEG) }
}

export function cellKey(cx, cy) {
  return `${cx}_${cy}`
}

export function biomeForCell(key) {
  const rng = rngFor(`biome:${key}`)
  const roll = rng()
  if (roll < 0.10) return 'water'
  if (roll < 0.22) return 'urban'
  if (roll < 0.38) return 'park'
  if (roll < 0.56) return 'grass'
  if (roll < 0.70) return 'forest'
  if (roll < 0.82) return 'cave'
  return 'sky'
}

function isNight(date) {
  const h = date.getHours()
  return h < 6 || h >= 19
}

function speciesCandidates(biome, night) {
  const timeKey = night ? 'night' : 'day'
  return SPECIES.map(s => ({
    species: s,
    weight: (s.biomes[biome] || 0) * (s.time[timeKey] || 0) * (RARITY_WEIGHT[s.rarity] || 0),
  })).filter(e => e.weight > 0)
}

// One cell + one window resolves to at most one creature.
function spawnForCellWindow(cx, cy, windowIndex, now) {
  const key  = cellKey(cx, cy)
  const seed = `${key}:${windowIndex}`
  const rng  = rngFor(seed)

  if (rng() > SPAWN_DENSITY) return null

  // Stagger appearance across the window so the whole map does not flip at once.
  const startOffset = Math.floor(rng() * SPAWN_WINDOW_MS)
  const spawnedAt   = windowIndex * SPAWN_WINDOW_MS + startOffset
  const despawnAt   = spawnedAt + SPAWN_WINDOW_MS
  if (now < spawnedAt || now >= despawnAt) return null

  const biome  = biomeForCell(key)
  const picked = pickWeighted(rng, speciesCandidates(biome, isNight(new Date(now))))
  if (!picked) return null

  const species = picked.species
  const level   = randInt(rng, 1, MAX_WILD_LEVEL)
  const ivs     = rollIVs(rng)

  // Scatter within the cell rather than pinning to its centre, so the field
  // does not read as a grid.
  const lat = (cx + rng()) * CELL_DEG
  const lng = (cy + rng()) * CELL_DEG

  return {
    id: seed,
    cellKey: key,
    speciesId: species.id,
    name:     species.name,
    emoji:    species.emoji,
    types:    species.types,
    rarity:   species.rarity,
    bcr:      species.bcr,
    fleeRate: species.fleeRate,
    biome,
    lat,
    lng,
    level,
    ivs,
    cp: computeCP(species, ivs, level),
    hp: computeHP(species, ivs, level),
    spawnedAt,
    despawnAt,
  }
}

// Every creature currently live within scan range of the player.
export function spawnsNear(position, now = Date.now()) {
  if (!position) return []

  const { cx, cy } = cellCoords(position.lat, position.lng)
  const currentWindow = Math.floor(now / SPAWN_WINDOW_MS)
  const out = []

  for (let dx = -SCAN_RADIUS_CELLS; dx <= SCAN_RADIUS_CELLS; dx++) {
    for (let dy = -SCAN_RADIUS_CELLS; dy <= SCAN_RADIUS_CELLS; dy++) {
      // A staggered spawn from the previous window can still be live.
      for (const w of [currentWindow - 1, currentWindow]) {
        const s = spawnForCellWindow(cx + dx, cy + dy, w, now)
        if (s) out.push(s)
      }
    }
  }
  return out
}

export function secondsUntilDespawn(spawn, now = Date.now()) {
  return Math.max(0, Math.round((spawn.despawnAt - now) / 1000))
}

// Last known position, used only to centre the map before the first GPS fix.
const HOME_KEY = 'pokego_home_v4'

export function rememberHome(position) {
  try { localStorage.setItem(HOME_KEY, JSON.stringify(position)) } catch { /* private mode */ }
}

export function getInitialMapCenter() {
  try {
    const home = JSON.parse(localStorage.getItem(HOME_KEY) || 'null')
    if (home?.lat && home?.lng) return home
  } catch { /* private mode */ }
  return null
}

export { BIOMES }
