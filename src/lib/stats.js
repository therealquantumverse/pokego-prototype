// CP / IV mechanics, matching Pokémon GO's published formulas.
//
//   CP = floor( (Atk+AtkIV) * sqrt(Def+DefIV) * sqrt(Sta+StaIV) * CPM(level)^2 / 10 )
//
// Attack is unsquared while Defense and Stamina are square-rooted, which is why
// glass cannons post far higher CP than bulky species at the same level.

import { randInt } from './rng.js'

// CPM by integer Pokémon level, index 0 = level 1.
// Anchors verified against pokemongohub.net/post/wiki/cp-mechanics:
// L1 0.094, L10 0.4225, L20 0.5974, L30 0.7317, L40 0.7903001.
export const CPM = [
  0.094, 0.16639787, 0.21573247, 0.25572005, 0.29024988,
  0.3210876, 0.34921268, 0.37523559, 0.39956728, 0.4225,
  0.44310755, 0.46279839, 0.48168495, 0.49985844, 0.51739395,
  0.53435433, 0.55079269, 0.56675452, 0.58227891, 0.5974,
  0.61215729, 0.62656713, 0.64065295, 0.65443563, 0.667934,
  0.68116492, 0.69414365, 0.70688421, 0.71939909, 0.7317,
  0.73776948, 0.74378943, 0.74976104, 0.75568551, 0.76156384,
  0.76739717, 0.7731865, 0.77893275, 0.78463697, 0.7903001,
]

export const MAX_LEVEL = CPM.length

// Wild encounters cap well below the power-up ceiling; 30 is GO's unboosted cap.
export const MAX_WILD_LEVEL = 30

export function cpmAt(level) {
  const i = Math.min(Math.max(Math.round(level), 1), MAX_LEVEL) - 1
  return CPM[i]
}

export function rollIVs(rng) {
  return { atk: randInt(rng, 0, 15), def: randInt(rng, 0, 15), sta: randInt(rng, 0, 15) }
}

export function ivPercent(ivs) {
  return Math.round(((ivs.atk + ivs.def + ivs.sta) / 45) * 100)
}

export function computeCP(species, ivs, level) {
  const m = cpmAt(level)
  const atk = (species.baseAtk + ivs.atk) * m
  const def = Math.sqrt((species.baseDef + ivs.def) * m)
  const sta = Math.sqrt((species.baseSta + ivs.sta) * m)
  return Math.max(10, Math.floor((atk * def * sta) / 10))
}

export function computeHP(species, ivs, level) {
  return Math.max(10, Math.floor((species.baseSta + ivs.sta) * cpmAt(level)))
}
