// Seeded, deterministic randomness.
//
// The spawn engine must produce identical results on every device for a given
// (cell, time window). Math.random() cannot do that, so every roll goes through
// a PRNG seeded from a string hash.

// FNV-1a, 32-bit.
export function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// mulberry32 — small, fast, good enough distribution for gameplay rolls.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rngFor(seedString) {
  return mulberry32(hashString(seedString))
}

// Inclusive on both ends.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1))
}

// entries: [{ weight, ...}]. Returns the chosen entry, or null if all weights are 0.
export function pickWeighted(rng, entries) {
  let total = 0
  for (const e of entries) total += e.weight
  if (total <= 0) return null

  let roll = rng() * total
  for (const e of entries) {
    roll -= e.weight
    if (roll < 0) return e
  }
  return entries[entries.length - 1]
}
