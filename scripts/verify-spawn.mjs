// Verifies the properties the spawn engine claims. Run: node scripts/verify-spawn.mjs
import {
  spawnsNear, biomeForCell, cellCoords, cellKey,
  SPAWN_WINDOW_MS, SCAN_RADIUS_CELLS,
} from '../src/lib/spawn.js'
import { computeCP, cpmAt } from '../src/lib/stats.js'
import { CATCH_RADIUS } from '../src/config.js'

// Inlined rather than imported from lib/geo.js, which pulls in React hooks.
function distanceMeters(a, b) {
  const R = 6371000, toRad = d => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

let failures = 0
function check(name, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) failures++
}

const HERE = { lat: 40.7429, lng: -73.8779 } // Elmhurst, Queens
const T0 = Date.UTC(2026, 8, 8, 15, 0, 0)

// 1. CPM anchors, against pokemongohub's published table.
check('CPM L1 = 0.094', cpmAt(1) === 0.094)
check('CPM L20 = 0.5974', cpmAt(20) === 0.5974)
check('CPM L40 = 0.7903001', cpmAt(40) === 0.7903001)

// 2. CP formula against a known external value: Mewtwo (300/182/214), perfect
//    IVs at level 40, is 4178 CP in the live game.
const mewtwo = { baseAtk: 300, baseDef: 182, baseSta: 214 }
const perfect = { atk: 15, def: 15, sta: 15 }
const mewtwoCP = computeCP(mewtwo, perfect, 40)
check('CP formula reproduces Mewtwo max CP 4178', mewtwoCP === 4178, `got ${mewtwoCP}`)

// 3. Determinism — same place, same clock, same result.
const a = spawnsNear(HERE, T0)
const b = spawnsNear(HERE, T0)
check('same (place, time) yields identical spawns',
  JSON.stringify(a) === JSON.stringify(b), `${a.length} spawns`)

// 4. World consistency — a second device a few metres away, inside the same
//    cell block, sees the same creatures.
const nudged = { lat: HERE.lat + 0.00002, lng: HERE.lng - 0.00002 }
const c = spawnsNear(nudged, T0)
const idsA = new Set(a.map(s => s.id))
const overlap = c.filter(s => idsA.has(s.id)).length
check('nearby device sees the same creatures',
  overlap > 0 && overlap === Math.min(a.length, c.length),
  `${overlap}/${c.length} shared`)

// 5. Liveness — the world turns over.
const later = spawnsNear(HERE, T0 + 2 * SPAWN_WINDOW_MS)
const idsLater = new Set(later.map(s => s.id))
const carried = [...idsA].filter(id => idsLater.has(id)).length
check('spawn set fully turns over after two windows',
  carried === 0, `${carried} carried over, ${later.length} new`)

// 6. Staggering — despawns are spread out, not a synchronised wipe.
const despawnBuckets = new Set(a.map(s => Math.floor(s.despawnAt / 60000)))
check('despawn times are staggered across minutes',
  despawnBuckets.size > Math.min(3, a.length), `${despawnBuckets.size} distinct minutes`)

// 7. Density — enough to play with, not a swarm.
const cells = (2 * SCAN_RADIUS_CELLS + 1) ** 2
check('spawn density is playable', a.length >= 5 && a.length <= cells,
  `${a.length} live across ${cells} cells`)

// 7b. Reachability — the check above counts the whole 175 m scan block, so it
//     passed while every creature sat outside CATCH_RADIUS and the map was
//     untappable. What matters is how often a *stationary* player has something
//     in reach, sampled across many places and times.
{
  const N = 2000
  let dead = 0, reachable = 0
  for (let i = 0; i < N; i++) {
    const pos = { lat: HERE.lat + (Math.random() - 0.5) * 0.02,
                  lng: HERE.lng + (Math.random() - 0.5) * 0.02 }
    const now = T0 + Math.floor(Math.random() * 24 * 3600 * 1000)
    const inReach = spawnsNear(pos, now)
      .filter(s => distanceMeters(pos, s) <= CATCH_RADIUS)
    reachable += inReach.length
    if (inReach.length === 0) dead++
  }
  const deadPct = 100 * dead / N
  check('a stationary player almost always has something in reach',
    deadPct <= 5, `nothing catchable ${deadPct.toFixed(1)}% of the time, ` +
    `mean ${(reachable / N).toFixed(2)} in range`)
}

// 8. Place matters — biomes vary across the scanned block, and the species mix
//    differs between them.
const { cx, cy } = cellCoords(HERE.lat, HERE.lng)
const biomesSeen = new Set()
for (let dx = -6; dx <= 6; dx++)
  for (let dy = -6; dy <= 6; dy++) biomesSeen.add(biomeForCell(cellKey(cx + dx, cy + dy)))
check('multiple biomes occur across a neighbourhood',
  biomesSeen.size >= 2, [...biomesSeen].join(', '))

// 9. Night gating — Noctilume is day-weight 0, so it must never appear by day.
const noon = Date.UTC(2026, 8, 8, 16, 0, 0)   // 12:00 EDT
const dayRun = []
for (let i = 0; i < 40; i++) {
  dayRun.push(...spawnsNear({ lat: HERE.lat + i * 0.01, lng: HERE.lng }, noon))
}
const nocturnalByDay = dayRun.filter(s => s.speciesId === 'noctilume').length
check('night-only species never spawns during the day',
  nocturnalByDay === 0, `${dayRun.length} daytime spawns sampled`)

// 10. Stats are in range.
const badIV = a.find(s =>
  [s.ivs.atk, s.ivs.def, s.ivs.sta].some(v => v < 0 || v > 15))
check('all IVs within 0–15', !badIV)
const badLevel = a.find(s => s.level < 1 || s.level > 30)
check('all wild levels within 1–30', !badLevel)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
