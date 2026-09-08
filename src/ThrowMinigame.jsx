import { useCallback, useEffect, useRef, useState } from 'react'
import { cpmAt, ivPercent } from './lib/stats'

// ── Constants ─────────────────────────────────────────────────────────────────
const RING_PERIOD = 2400   // ms — full shrink cycle
const RING_MAX   = 1.00
const RING_MIN   = 0.28

function ringScaleNow(startMs) {
  const t = ((Date.now() - startMs) % RING_PERIOD) / RING_PERIOD
  return RING_MAX - (RING_MAX - RING_MIN) * t
}

function throwBonusFor(scale) {
  if (scale <= 0.42) return { label: 'Excellent!', mult: 2.0, cls: 'excellent' }
  if (scale <= 0.68) return { label: 'Great!',     mult: 1.7, cls: 'great'     }
  return                     { label: 'Nice!',      mult: 1.3, cls: 'nice'      }
}

function catchProbability(bcr, level, throwMult, curveMult) {
  const base = Math.min(bcr / (2 * cpmAt(level)), 1)
  const exp  = throwMult * curveMult          // ball=1.0, berry=1.0, medal=1.0
  return 1 - Math.pow(1 - base, exp)
}

function detectCurveball(path) {
  if (path.length < 8) return false
  const first = path[0]
  const last  = path[path.length - 1]
  const dx = last.x - first.x
  const dy = last.y - first.y
  const len = Math.hypot(dx, dy)
  if (len < 30) return false
  // Max perpendicular deviation from the straight line first→last
  const maxDev = path.reduce((max, p) => {
    const dev = Math.abs((p.x - first.x) * dy - (p.y - first.y) * dx) / len
    return Math.max(max, dev)
  }, 0)
  return maxDev > 38
}

// Type → accent color for background glow
const TYPE_COLOR = {
  grass: '#4ade80', fire: '#fb923c', water: '#60a5fa', electric: '#fbbf24',
  rock: '#a78bfa', ground: '#d97706', ghost: '#a855f7', dark: '#6b7280',
  fighting: '#ef4444', steel: '#94a3b8', bug: '#84cc16', flying: '#7dd3fc',
  ice: '#bfdbfe', poison: '#c084fc', dragon: '#818cf8',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ThrowMinigame({ poi, balls, onCatch, onFlee, onRunAway }) {
  const containerRef  = useRef(null)
  const ballRef       = useRef(null)       // draggable ball div
  const flyBallRef    = useRef(null)       // flying ball div
  const animRef       = useRef(null)
  const ringStartRef  = useRef(Date.now())

  const isDragging    = useRef(false)
  const dragPath      = useRef([])
  const dragOffset    = useRef({ x: 0, y: 0 })

  const [phase, setPhase]         = useState('idle')  // idle | throwing | result
  const [result, setResult]       = useState(null)    // { caught, fled, bonus, isCurve }
  const [throwLabel, setThrowLabel] = useState(null)  // brief bonus label during flight
  const [isCurve, setIsCurve]     = useState(false)   // show curveball indicator

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const creaturePos = useCallback(() => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const w = containerRef.current.offsetWidth
    const h = containerRef.current.offsetHeight
    return { x: w / 2, y: h * 0.36 }
  }, [])

  const ballHome = useCallback(() => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const w = containerRef.current.offsetWidth
    const h = containerRef.current.offsetHeight
    return { x: w / 2, y: h * 0.82 }
  }, [])

  function resetBall() {
    dragOffset.current = { x: 0, y: 0 }
    dragPath.current   = []
    if (ballRef.current) ballRef.current.style.transform = 'translate(-50%, -50%)'
    if (flyBallRef.current) {
      flyBallRef.current.style.opacity = '0'
      flyBallRef.current.style.pointerEvents = 'none'
    }
  }

  // ── Pointer handlers ─────────────────────────────────────────────────────────

  function handlePointerDown(e) {
    if (phase !== 'idle') return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    isDragging.current = true
    const rect = containerRef.current.getBoundingClientRect()
    dragPath.current = [{ x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp }]
    dragOffset.current = { x: 0, y: 0 }
  }

  function handlePointerMove(e) {
    if (!isDragging.current || phase !== 'idle') return
    const rect = containerRef.current.getBoundingClientRect()
    const cx   = e.clientX - rect.left
    const cy   = e.clientY - rect.top
    dragPath.current.push({ x: cx, y: cy, t: e.timeStamp })

    const home = ballHome()
    const dx = cx - home.x
    const dy = cy - home.y
    dragOffset.current = { x: dx, y: dy }
    if (ballRef.current) {
      ballRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }
  }

  function handlePointerUp(e) {
    if (!isDragging.current || phase !== 'idle') return
    isDragging.current = false

    const path = dragPath.current
    if (path.length < 3) { resetBall(); return }

    const last  = path[path.length - 1]
    const prev  = path[Math.max(0, path.length - 6)]
    const dt    = last.t - prev.t
    const vy    = dt > 0 ? (last.y - prev.y) / dt * 1000 : 0  // px/s, negative = up

    // Only accept upward throws (moved at least 50px upward, last velocity upward)
    const home = ballHome()
    const movedUp = last.y < home.y - 50

    if (!movedUp || vy > 50) { resetBall(); return }

    const curve = detectCurveball(path)
    const scale = ringScaleNow(ringStartRef.current)
    const bonus = throwBonusFor(scale)

    setIsCurve(curve)
    startThrow(last.x, last.y, bonus, curve)
  }

  // ── Throw animation ──────────────────────────────────────────────────────────

  function startThrow(startX, startY, bonus, curve) {
    setPhase('throwing')
    setThrowLabel(bonus.label)

    if (ballRef.current) ballRef.current.style.opacity = '0'

    const target   = creaturePos()
    const duration = 650
    const t0       = performance.now()

    if (flyBallRef.current) {
      flyBallRef.current.style.opacity = '1'
      flyBallRef.current.style.left    = `${startX - 20}px`
      flyBallRef.current.style.top     = `${startY - 20}px`
    }

    function step(now) {
      const raw    = (now - t0) / duration
      const t      = Math.min(raw, 1)
      const eased  = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

      const x   = startX + (target.x - startX) * eased
      const arc = Math.sin(eased * Math.PI) * 90
      const y   = startY + (target.y - startY) * eased - arc

      // Scale ball down as it approaches creature
      const scale = 1 - eased * 0.45

      if (flyBallRef.current) {
        flyBallRef.current.style.left      = `${x - 20}px`
        flyBallRef.current.style.top       = `${y - 20}px`
        flyBallRef.current.style.transform = `scale(${scale})`
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(step)
      } else {
        resolveThrow(bonus, curve)
      }
    }

    animRef.current = requestAnimationFrame(step)
  }

  // ── Catch resolution ─────────────────────────────────────────────────────────

  function resolveThrow(bonus, curve) {
    setThrowLabel(null)
    if (flyBallRef.current) flyBallRef.current.style.opacity = '0'

    const p      = catchProbability(poi.bcr, poi.level, bonus.mult, curve ? 1.7 : 1.0)
    const caught = Math.random() < p
    const fled   = !caught && Math.random() < (poi.fleeRate || 0.10)

    setResult({ caught, fled, bonus, isCurve: curve })
    setPhase('result')

    if (caught) {
      setTimeout(() => onCatch(poi, bonus), 1600)
    } else if (fled) {
      setTimeout(() => onFlee(poi), 1800)
    } else {
      // Broke out — retry
      setTimeout(() => {
        setPhase('idle')
        setResult(null)
        setThrowLabel(null)
        setIsCurve(false)
        ringStartRef.current = Date.now()
        if (ballRef.current) ballRef.current.style.opacity = '1'
        resetBall()
      }, 1600)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const accentColor = TYPE_COLOR[poi.types?.[0]] ?? '#60a5fa'
  const bHome = { left: '50%', top: '82%' }

  return (
    <div className="throw-screen" ref={containerRef}>
      {/* Radial glow behind creature */}
      <div
        className="throw-glow"
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 36%, ${accentColor}26 0%, transparent 70%)` }}
      />

      {/* Top bar */}
      <div className="throw-topbar">
        <button className="throw-run-btn" onClick={onRunAway}>Run</button>
        <div className="throw-topbar-center">
          <span className="throw-name">{poi.name}</span>
          <span className="throw-cp-badge">CP {poi.cp}</span>
          {poi.ivs && <span className="throw-iv-badge">{ivPercent(poi.ivs)}% IV</span>}
        </div>
        <div className="throw-ball-count">🎯 {balls}</div>
      </div>

      {/* Creature + ring */}
      <div className="throw-creature-zone">
        <div className="throw-ring-wrap">
          {phase !== 'result' && (
            <div className="throw-ring" style={{ '--ring-color': accentColor }} />
          )}
        </div>
        <div
          className={[
            'throw-creature-emoji',
            phase === 'result' && result?.caught  ? 'creature-caught'    : '',
            phase === 'result' && result && !result.caught ? 'creature-broke-out' : '',
          ].filter(Boolean).join(' ')}
        >
          {poi.emoji}
        </div>
        {isCurve && phase === 'idle' && (
          <div className="throw-curve-hint">Curveball!</div>
        )}
      </div>

      {/* Throw bonus label (appears during flight) */}
      {throwLabel && (
        <div className={`throw-bonus-label throw-bonus-${throwBonusFor(ringScaleNow(ringStartRef.current)).cls}`}>
          {throwLabel}
        </div>
      )}

      {/* Result overlay */}
      {phase === 'result' && result && (
        <div className={`throw-result-banner ${result.caught ? 'result-caught' : 'result-miss'}`}>
          {result.caught
            ? `${poi.name} was caught!`
            : result.fled
              ? `${poi.name} fled!`
              : 'It broke free!'}
          {result.isCurve && !result.fled && (
            <div className="throw-result-sub">Curveball! +XP</div>
          )}
        </div>
      )}

      {/* Flying ball (shown only during throw animation) */}
      <div
        ref={flyBallRef}
        className="throw-flying-ball"
        style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
      >
        <div className="pokeball throw-ball-size" />
      </div>

      {/* Draggable ball */}
      <div
        ref={ballRef}
        className="throw-ball-anchor"
        style={{ ...bHome, position: 'absolute', transform: 'translate(-50%, -50%)', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="pokeball throw-ball-size throw-ball-drag" />
        {phase === 'idle' && (
          <div className="throw-drag-hint">Swipe up!</div>
        )}
      </div>
    </div>
  )
}
