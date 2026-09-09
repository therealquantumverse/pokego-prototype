// Deterministic per-species creature art. Every species id maps to one stable
// design, so the same creature always looks the same across sessions and
// devices without shipping 60 image files.

export const TYPE_PALETTE = {
  grass:    { base: '#5ec25e', dark: '#2f8f3f', light: '#a8e6a0' },
  water:    { base: '#4aa8f0', dark: '#1f6fd0', light: '#a5d9ff' },
  fire:     { base: '#ff7a3c', dark: '#d8351b', light: '#ffc48f' },
  electric: { base: '#f7d038', dark: '#c99a00', light: '#ffeda1' },
  rock:     { base: '#b09368', dark: '#7d6440', light: '#dcc7a3' },
  ground:   { base: '#d2a15a', dark: '#9a6f33', light: '#f0d3a6' },
  ice:      { base: '#7fd8e8', dark: '#3d9fb8', light: '#d3f4fa' },
  ghost:    { base: '#8b6fd6', dark: '#5a3fa8', light: '#c9b8f5' },
  dragon:   { base: '#6f5ae0', dark: '#4433a8', light: '#b3a4f7' },
  bug:      { base: '#a8c73a', dark: '#748c1c', light: '#dcea9a' },
  flying:   { base: '#9fc4f0', dark: '#6690c4', light: '#d8e9ff' },
  steel:    { base: '#9aa5b5', dark: '#66707e', light: '#d5dce5' },
  dark:     { base: '#5b5468', dark: '#332e3d', light: '#948ca6' },
  fighting: { base: '#d05a3a', dark: '#963218', light: '#f0a58c' },
  poison:   { base: '#b45ad0', dark: '#7d2f96', light: '#e2aef0' },
}

const FALLBACK = { base: '#c9c2b4', dark: '#8d887c', light: '#e8e3d9' }

export function paletteFor(species) {
  return TYPE_PALETTE[species.types?.[0]] ?? FALLBACK
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Pull successive small integers out of one hash so each trait is independent.
function traits(id) {
  const h = hash(id)
  return {
    body:    (h        ) % 4,
    ears:    (h >>> 3  ) % 6,
    eyes:    (h >>> 6  ) % 4,
    mouth:   (h >>> 9  ) % 3,
    pattern: (h >>> 12 ) % 4,
    limbs:   (h >>> 15 ) % 3,
    tilt:    ((h >>> 18) % 9) - 4,
  }
}

// Body silhouettes, all centred on x=50 and sitting on y=86.
const BODIES = [
  'M50 22 C71 22 82 40 82 58 C82 76 68 86 50 86 C32 86 18 76 18 58 C18 40 29 22 50 22 Z',
  'M50 18 C69 18 79 38 79 58 C79 77 66 87 50 87 C34 87 21 77 21 58 C21 38 31 18 50 18 Z',
  'M50 20 C64 20 72 32 72 44 C72 52 85 62 85 71 C85 81 70 87 50 87 C30 87 15 81 15 71 C15 62 28 52 28 44 C28 32 36 20 50 20 Z',
  'M50 24 C74 24 86 42 86 60 C86 77 70 87 50 87 C30 87 14 77 14 60 C14 42 26 24 50 24 Z',
]

function ears(kind, p) {
  switch (kind) {
    case 1: return `<path d="M30 28 L22 6 L42 22 Z" fill="${p.dark}"/><path d="M70 28 L78 6 L58 22 Z" fill="${p.dark}"/>`
    case 2: return `<circle cx="27" cy="24" r="10" fill="${p.dark}"/><circle cx="73" cy="24" r="10" fill="${p.dark}"/>`
    case 3: return `<path d="M34 24 L28 4 L44 20 Z" fill="${p.light}" stroke="${p.dark}" stroke-width="2"/><path d="M66 24 L72 4 L56 20 Z" fill="${p.light}" stroke="${p.dark}" stroke-width="2"/>`
    case 4: return `<path d="M38 22 C34 8 28 6 26 2" stroke="${p.dark}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="26" cy="2" r="5" fill="${p.light}"/><path d="M62 22 C66 8 72 6 74 2" stroke="${p.dark}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="74" cy="2" r="5" fill="${p.light}"/>`
    case 5: return `<ellipse cx="24" cy="20" rx="7" ry="16" transform="rotate(-22 24 20)" fill="${p.dark}"/><ellipse cx="76" cy="20" rx="7" ry="16" transform="rotate(22 76 20)" fill="${p.dark}"/>`
    default: return ''
  }
}

function eyes(kind) {
  const white = '#ffffff'
  switch (kind) {
    case 1: return `<ellipse cx="38" cy="50" rx="8" ry="10" fill="${white}"/><ellipse cx="62" cy="50" rx="8" ry="10" fill="${white}"/><circle cx="38" cy="52" r="5" fill="#17161d"/><circle cx="62" cy="52" r="5" fill="#17161d"/><circle cx="40" cy="49" r="2" fill="${white}"/><circle cx="64" cy="49" r="2" fill="${white}"/>`
    case 2: return `<path d="M30 48 L46 53 L30 57 Z" fill="#17161d"/><path d="M70 48 L54 53 L70 57 Z" fill="#17161d"/>`
    case 3: return `<circle cx="37" cy="50" r="11" fill="${white}"/><circle cx="63" cy="50" r="11" fill="${white}"/><circle cx="37" cy="51" r="6" fill="#17161d"/><circle cx="63" cy="51" r="6" fill="#17161d"/><circle cx="39" cy="48" r="2.5" fill="${white}"/><circle cx="65" cy="48" r="2.5" fill="${white}"/>`
    default: return `<circle cx="38" cy="51" r="6" fill="#17161d"/><circle cx="62" cy="51" r="6" fill="#17161d"/><circle cx="40" cy="49" r="2" fill="${white}"/><circle cx="64" cy="49" r="2" fill="${white}"/>`
  }
}

function mouth(kind) {
  switch (kind) {
    case 1: return `<path d="M43 64 Q50 72 57 64" stroke="#17161d" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
    case 2: return `<path d="M42 64 L58 64 L50 73 Z" fill="#17161d"/>`
    default: return `<path d="M44 65 Q50 69 56 65" stroke="#17161d" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
  }
}

function pattern(kind, p) {
  switch (kind) {
    case 1: return `<ellipse cx="50" cy="72" rx="17" ry="12" fill="${p.light}" opacity="0.85"/>`
    case 2: return `<path d="M28 66 H72 M31 76 H69" stroke="${p.dark}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>`
    case 3: return `<circle cx="35" cy="70" r="4" fill="${p.dark}" opacity="0.5"/><circle cx="52" cy="76" r="5" fill="${p.dark}" opacity="0.5"/><circle cx="66" cy="68" r="3.5" fill="${p.dark}" opacity="0.5"/>`
    default: return ''
  }
}

function limbs(kind, p) {
  switch (kind) {
    case 1: return `<ellipse cx="34" cy="88" rx="10" ry="5" fill="${p.dark}"/><ellipse cx="66" cy="88" rx="10" ry="5" fill="${p.dark}"/>`
    case 2: return `<ellipse cx="16" cy="66" rx="6" ry="9" fill="${p.dark}"/><ellipse cx="84" cy="66" rx="6" ry="9" fill="${p.dark}"/><ellipse cx="36" cy="88" rx="9" ry="5" fill="${p.dark}"/><ellipse cx="64" cy="88" rx="9" ry="5" fill="${p.dark}"/>`
    default: return `<ellipse cx="30" cy="87" rx="8" ry="5" fill="${p.dark}"/><ellipse cx="70" cy="87" rx="8" ry="5" fill="${p.dark}"/>`
  }
}

// Behind-the-body feature, chosen by type so a Water creature reads as Water.
function typeFeature(type, p) {
  switch (type) {
    case 'flying':
      return `<path d="M26 44 C6 28 2 46 12 58 C18 66 24 62 28 56 Z" fill="${p.light}" stroke="${p.dark}" stroke-width="2"/><path d="M74 44 C94 28 98 46 88 58 C82 66 76 62 72 56 Z" fill="${p.light}" stroke="${p.dark}" stroke-width="2"/>`
    case 'dragon':
      return `<path d="M28 40 C4 26 0 52 14 64 C22 71 28 62 30 54 Z" fill="${p.dark}"/><path d="M72 40 C96 26 100 52 86 64 C78 71 72 62 70 54 Z" fill="${p.dark}"/><path d="M50 14 L46 24 L54 24 Z" fill="${p.light}"/>`
    case 'fire':
      return `<path d="M50 4 C58 16 54 22 50 26 C46 22 42 16 50 4 Z" fill="#ffd24a"/><path d="M82 70 C98 62 98 84 84 88 C76 90 74 82 78 78 Z" fill="#ff9d3c"/>`
    case 'water':
      return `<path d="M84 52 C100 44 102 74 86 82 C80 85 78 76 80 70 Z" fill="${p.light}" stroke="${p.dark}" stroke-width="2"/>`
    case 'ice':
      return `<path d="M50 6 L54 20 L46 20 Z" fill="${p.light}"/><path d="M22 34 L30 42 L20 46 Z" fill="${p.light}"/><path d="M78 34 L70 42 L80 46 Z" fill="${p.light}"/>`
    case 'grass':
      return `<path d="M50 22 C40 6 24 8 22 18 C34 20 42 22 50 26 Z" fill="${p.dark}"/><path d="M50 22 C60 6 76 8 78 18 C66 20 58 22 50 26 Z" fill="${p.base}"/>`
    case 'bug':
      return `<path d="M24 46 C6 34 4 56 16 62" stroke="${p.dark}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M76 46 C94 34 96 56 84 62" stroke="${p.dark}" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="52" rx="12" ry="16" fill="${p.light}" opacity="0.5"/><ellipse cx="80" cy="52" rx="12" ry="16" fill="${p.light}" opacity="0.5"/>`
    case 'electric':
      return `<path d="M84 46 L94 60 L86 60 L96 78 L78 62 L86 62 Z" fill="#ffe24a" stroke="${p.dark}" stroke-width="1.5"/>`
    case 'rock':
    case 'ground':
      return `<path d="M32 24 L38 10 L46 24 Z" fill="${p.dark}"/><path d="M54 24 L62 10 L68 24 Z" fill="${p.dark}"/><path d="M12 62 L4 74 L18 76 Z" fill="${p.dark}"/>`
    case 'steel':
      return `<rect x="30" y="30" width="40" height="8" rx="4" fill="${p.light}" stroke="${p.dark}" stroke-width="2"/><path d="M14 58 L2 66 L16 74 Z" fill="${p.light}" stroke="${p.dark}" stroke-width="2"/>`
    case 'ghost':
      return `<path d="M18 78 Q26 92 34 80 Q42 92 50 80 Q58 92 66 80 Q74 92 82 78 L82 86 L18 86 Z" fill="${p.base}" opacity="0.9"/><circle cx="14" cy="28" r="5" fill="${p.light}" opacity="0.7"/><circle cx="86" cy="34" r="4" fill="${p.light}" opacity="0.7"/>`
    case 'dark':
      return `<path d="M50 10 L44 24 L56 24 Z" fill="${p.light}"/><path d="M86 58 C98 54 96 78 84 80" stroke="${p.dark}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    case 'poison':
      return `<circle cx="20" cy="34" r="7" fill="${p.light}" opacity="0.75"/><circle cx="82" cy="28" r="5" fill="${p.light}" opacity="0.75"/><path d="M78 74 C92 70 92 88 80 88" stroke="${p.dark}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    case 'fighting':
      return `<circle cx="14" cy="62" r="10" fill="${p.dark}"/><circle cx="86" cy="62" r="10" fill="${p.dark}"/>`
    default:
      return ''
  }
}

const RARITY_AURA = {
  rare:      '#5ec8ff',
  epic:      '#c07bff',
  legendary: '#ffcf3d',
}

// Spawned creatures carry a per-spawn seed in `id` and the species in
// `speciesId`; species records only have `id`. Art must key off the species so
// the same creature looks the same every time it respawns.
const artKey = (x) => x.speciesId ?? x.id

// Gradient ids must be unique per rendered instance. Two markers of the same
// species would otherwise share one id, and removing the first marker takes the
// definition with it — leaving the survivors filled with black.
let gradSeq = 0

export function creatureSvg(species, { aura = true } = {}) {
  const p = paletteFor(species)
  const t = traits(artKey(species))
  const secondary = species.types?.[1]
  const auraColor = aura ? RARITY_AURA[species.rarity] : null
  const gid = `cg${gradSeq++}`

  return `<svg viewBox="-6 -6 112 112" xmlns="http://www.w3.org/2000/svg" class="creature-svg" role="img" aria-label="${species.name}">
  <defs>
    <radialGradient id="${gid}" cx="38%" cy="30%" r="78%">
      <stop offset="0%" stop-color="${p.light}"/>
      <stop offset="62%" stop-color="${p.base}"/>
      <stop offset="100%" stop-color="${p.dark}"/>
    </radialGradient>
  </defs>
  ${auraColor ? `<circle cx="50" cy="54" r="52" fill="${auraColor}" opacity="0.18"/>` : ''}
  <g transform="rotate(${t.tilt} 50 54)">
    ${typeFeature(species.types?.[0], p)}
    ${secondary ? typeFeature(secondary, TYPE_PALETTE[secondary] ?? p) : ''}
    <g transform="translate(50 56) scale(0.86) translate(-50 -56)">
      ${limbs(t.limbs, p)}
      ${ears(t.ears, p)}
      <path d="${BODIES[t.body]}" fill="url(#${gid})" stroke="${p.dark}" stroke-width="2.8"/>
      ${pattern(t.pattern, p)}
      ${eyes(t.eyes)}
      ${mouth(t.mouth)}
    </g>
  </g>
</svg>`
}

// The player's trainer, not a floating pokeball.
export function trainerSvg() {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="trainer-svg" role="img" aria-label="Trainer">
  <ellipse cx="50" cy="92" rx="26" ry="7" fill="#000" opacity="0.28"/>
  <path d="M28 92 C28 68 36 58 50 58 C64 58 72 68 72 92 Z" fill="#2f6fe0" stroke="#1b3f86" stroke-width="2.5"/>
  <path d="M40 92 L40 74 L60 74 L60 92 Z" fill="#1b4fb0" opacity="0.55"/>
  <circle cx="50" cy="38" r="20" fill="#f5c9a4" stroke="#c08f66" stroke-width="2.5"/>
  <path d="M28 34 C28 18 72 18 72 34 L72 38 L28 38 Z" fill="#e8402f" stroke="#a81f14" stroke-width="2.5"/>
  <path d="M26 38 L74 38 L74 44 L26 44 Z" fill="#e8402f" stroke="#a81f14" stroke-width="2.5"/>
  <circle cx="50" cy="29" r="6" fill="#fff" stroke="#a81f14" stroke-width="2"/>
  <circle cx="43" cy="42" r="3" fill="#2a2a33"/>
  <circle cx="57" cy="42" r="3" fill="#2a2a33"/>
  <path d="M45 50 Q50 54 55 50" stroke="#2a2a33" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`
}
