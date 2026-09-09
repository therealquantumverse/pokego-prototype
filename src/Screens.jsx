import { useMemo, useState } from 'react'
import { SPECIES, SPECIES_BY_ID } from './species'
import { creatureSvg, trainerSvg, paletteFor } from './lib/creatureArt'
import { computeCP } from './lib/stats'
import { distanceMeters } from './lib/geo'
import { CATCH_RADIUS } from './config'

function Art({ species, className = '', aura = true }) {
  return (
    <div
      className={`art ${className}`}
      dangerouslySetInnerHTML={{ __html: creatureSvg(species, { aura }) }}
    />
  )
}

function Sheet({ title, subtitle, onClose, children }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="sheet-sub">{subtitle}</p>}
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

function TypeChips({ types }) {
  return (
    <div className="chips">
      {types.map((t) => (
        <span key={t} className="chip" style={{ background: paletteFor({ types: [t] }).dark }}>
          {t}
        </span>
      ))}
    </div>
  )
}

// ── Pokédex ───────────────────────────────────────────────────────────────────

function DexDetail({ species, seen, onBack }) {
  const chain = useMemo(() => {
    // Walk to the base form, then forward, so any member shows the whole line.
    let base = species
    for (let i = 0; i < 5; i++) {
      const prev = SPECIES.find((s) => s.evolvesTo === base.id)
      if (!prev) break
      base = prev
    }
    const out = [base]
    for (let i = 0; i < 5 && out[out.length - 1].evolvesTo; i++) {
      const next = SPECIES_BY_ID[out[out.length - 1].evolvesTo]
      if (!next) break
      out.push(next)
    }
    return out
  }, [species])

  const maxCp = computeCP(species, { atk: 15, def: 15, sta: 15 }, 40)

  return (
    <div className="dex-detail">
      <button className="sheet-back" onClick={onBack}>‹ All creatures</button>
      <div className="dex-hero">
        <Art species={species} className={seen ? '' : 'silhouette'} />
        <div>
          <h3>{seen ? species.name : '???'}</h3>
          <TypeChips types={species.types} />
          <span className={`rarity rarity-${species.rarity}`}>{species.rarity}</span>
        </div>
      </div>

      {seen ? (
        <>
          <p className="dex-desc">{species.desc}</p>
          <div className="stat-rows">
            <StatRow label="Attack"  value={species.baseAtk} />
            <StatRow label="Defense" value={species.baseDef} />
            <StatRow label="Stamina" value={species.baseSta} />
          </div>
          <div className="dex-facts">
            <div><span>Max CP</span><strong>{maxCp}</strong></div>
            <div><span>Catch rate</span><strong>{Math.round(species.bcr * 100)}%</strong></div>
            <div><span>Flee rate</span><strong>{Math.round(species.fleeRate * 100)}%</strong></div>
          </div>

          {chain.length > 1 && (
            <div className="evo-chain">
              <h4>Evolution line</h4>
              <div className="evo-row">
                {chain.map((s, i) => (
                  <div className="evo-step" key={s.id}>
                    {i > 0 && (
                      <div className="evo-arrow">
                        <span>›</span>
                        <small>{chain[i - 1].evolveCost} candy</small>
                      </div>
                    )}
                    <div className="evo-mon">
                      <Art species={s} className="evo-art" aura={false} />
                      <span className="evo-name">{s.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="dex-desc muted">Catch this creature to unlock its entry.</p>
      )}
    </div>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <div className="stat-bar"><div style={{ width: `${Math.min(100, (value / 180) * 100)}%` }} /></div>
      <strong>{value}</strong>
    </div>
  )
}

export function PokedexScreen({ dex, onClose }) {
  const [selected, setSelected] = useState(null)
  const pct = Math.round((dex.size / SPECIES.length) * 100)

  return (
    <Sheet
      title="Pokédex"
      subtitle={`${dex.size} of ${SPECIES.length} registered · ${pct}%`}
      onClose={onClose}
    >
      {selected ? (
        <DexDetail species={selected} seen={dex.has(selected.id)} onBack={() => setSelected(null)} />
      ) : (
        <div className="dex-grid">
          {SPECIES.map((s, i) => {
            const seen = dex.has(s.id)
            return (
              <button key={s.id} className="dex-cell" onClick={() => setSelected(s)}>
                <span className="dex-num">#{String(i + 1).padStart(3, '0')}</span>
                <Art species={s} className={seen ? '' : 'silhouette'} aura={seen} />
                <span className="dex-name">{seen ? s.name : '???'}</span>
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}

// ── Bag ───────────────────────────────────────────────────────────────────────

export function BagScreen({ balls, onClose }) {
  return (
    <Sheet title="Bag" subtitle={`${balls} item${balls === 1 ? '' : 's'} carried`} onClose={onClose}>
      <ul className="item-list">
        <li className={balls === 0 ? 'item empty' : 'item'}>
          <div className="item-icon"><div className="pokeball" /></div>
          <div className="item-text">
            <strong>Poké Ball</strong>
            <span>Throw it at a wild creature to catch it.</span>
          </div>
          <span className="item-qty">×{balls}</span>
        </li>
      </ul>
      {balls === 0 && <p className="bag-warning">You are out of Poké Balls.</p>}
    </Sheet>
  )
}

// ── Trainer ───────────────────────────────────────────────────────────────────

export const XP_PER_LEVEL = 500
export const levelFromXp = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1

export function TrainerScreen({ xp, dex, catches, balls, onClose }) {
  const level    = levelFromXp(xp)
  const intoLevel = xp % XP_PER_LEVEL
  const pct      = Math.round((intoLevel / XP_PER_LEVEL) * 100)

  return (
    <Sheet title="Trainer" subtitle={`Level ${level}`} onClose={onClose}>
      <div className="trainer-hero">
        <div className="trainer-big" dangerouslySetInnerHTML={{ __html: trainerSvg() }} />
        <div className="trainer-xp">
          <div className="xp-bar"><div style={{ width: `${pct}%` }} /></div>
          <span>{intoLevel} / {XP_PER_LEVEL} XP to level {level + 1}</span>
        </div>
      </div>
      <div className="trainer-stats">
        <div><strong>{catches}</strong><span>Creatures caught</span></div>
        <div><strong>{dex.size}</strong><span>Species registered</span></div>
        <div><strong>{xp}</strong><span>Total XP</span></div>
        <div><strong>{balls}</strong><span>Balls remaining</span></div>
      </div>
    </Sheet>
  )
}

// ── Nearby ────────────────────────────────────────────────────────────────────

export function NearbyScreen({ pois, position, onSelect, onClose }) {
  const ranked = useMemo(() => {
    if (!position) return []
    return pois
      .map((p) => ({ poi: p, dist: distanceMeters(position, p) }))
      .sort((a, b) => a.dist - b.dist)
  }, [pois, position])

  const inRange = ranked.filter((r) => r.dist <= CATCH_RADIUS).length

  return (
    <Sheet
      title="Nearby"
      subtitle={position ? `${ranked.length} wild · ${inRange} in range` : 'Waiting for GPS…'}
      onClose={onClose}
    >
      {ranked.length === 0 ? (
        <p className="dex-desc muted">
          {position ? 'Nothing around right now. Walk a block and check again.' : 'Acquiring your location…'}
        </p>
      ) : (
        <ul className="nearby-list">
          {ranked.map(({ poi, dist }) => {
            const reachable = dist <= CATCH_RADIUS
            return (
              <li key={poi.id}>
                <button
                  className={reachable ? 'nearby-row reachable' : 'nearby-row'}
                  onClick={() => reachable && onSelect(poi)}
                  disabled={!reachable}
                >
                  <Art species={poi} className="nearby-art" />
                  <div className="nearby-text">
                    <strong>{poi.name}</strong>
                    <span>CP {poi.cp} · {poi.types.join(' / ')}</span>
                  </div>
                  <span className="nearby-dist">
                    {Math.round(dist)}m
                    <small>{reachable ? 'in range' : 'walk closer'}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
