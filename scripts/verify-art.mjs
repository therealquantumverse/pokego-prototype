// Verifies the properties the creature art generator claims.
// Run: node scripts/verify-art.mjs
import { SPECIES } from '../src/species.js'
import { creatureSvg, trainerSvg, TYPE_PALETTE } from '../src/lib/creatureArt.js'
import { spawnsNear } from '../src/lib/spawn.js'

let failures = 0
function check(name, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!pass) failures++
}

// Gradient ids and the aria-label are the only per-instance parts; strip them so
// two renders of the same design compare equal.
const shape = (svg) => svg.replace(/cg\d+/g, 'G').replace(/aria-label="[^"]*"/, '')

// 1. Every species is visually distinct. This is the whole point: the emoji the
//    art replaced had 60 species sharing 39 glyphs.
const shapes = SPECIES.map(s => shape(creatureSvg(s)))
const unique = new Set(shapes)
check('every species has a distinct design', unique.size === SPECIES.length,
  `${unique.size}/${SPECIES.length} unique`)

// 2. Art is stable across renders — a creature must not change appearance when
//    its marker is recreated on the next spawn refresh.
const stable = SPECIES.every(s => shape(creatureSvg(s)) === shape(creatureSvg(s)))
check('art is deterministic per species', stable)

// 3. Spawned instances carry a per-spawn seed in `id`; art must key off
//    `speciesId` or the same creature redesigns itself on every respawn.
const spawns = spawnsNear({ lat: 40.7429, lng: -73.8779 }, Date.UTC(2026, 8, 8, 15, 0, 0))
const bySpecies = {}
for (const sp of spawns) (bySpecies[sp.speciesId] ??= []).push(shape(creatureSvg(sp)))
const drifted = Object.entries(bySpecies)
  .filter(([, v]) => new Set(v).size > 1)
  .map(([k]) => k)
check('two spawns of one species render identically', drifted.length === 0,
  drifted.length ? `drifted: ${drifted.join(', ')}` : `${spawns.length} spawns sampled`)

// 4. A spawn and its species record must produce the same art.
const mismatched = spawns.filter(sp => {
  const rec = SPECIES.find(s => s.id === sp.speciesId)
  return rec && shape(creatureSvg(sp)) !== shape(creatureSvg(rec))
})
check('spawn art matches its species-record art', mismatched.length === 0)

// 5. Gradient ids are unique per render. Same-id defs across sibling markers
//    means removing one marker takes the gradient with it and the survivors
//    render black.
const ids = SPECIES.map(s => creatureSvg(s).match(/id="(cg\d+)"/)?.[1])
check('gradient ids are unique per rendered instance',
  new Set(ids).size === ids.length && ids.every(Boolean))

// 6. Every type used by the roster has a palette, or those creatures render grey.
const usedTypes = [...new Set(SPECIES.flatMap(s => s.types))]
const unpainted = usedTypes.filter(t => !TYPE_PALETTE[t])
check('every roster type has a palette', unpainted.length === 0,
  unpainted.length ? `missing: ${unpainted.join(', ')}` : `${usedTypes.length} types`)

// 7. Output is well-formed enough to inject, and closes every tag it opens.
const balanced = SPECIES.every(s => {
  const svg = creatureSvg(s)
  const open = (svg.match(/<g[ >]/g) || []).length
  return svg.startsWith('<svg') && svg.trim().endsWith('</svg>') &&
    open === (svg.match(/<\/g>/g) || []).length
})
check('generated SVG is balanced', balanced)
check('trainer sprite renders', trainerSvg().startsWith('<svg') && trainerSvg().includes('</svg>'))

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`)
process.exit(failures === 0 ? 0 : 1)
