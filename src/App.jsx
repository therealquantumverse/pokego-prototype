import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ACCURACY_GATE, CATCH_RADIUS, STARTING_BALLS } from './config'
import { useGeolocation, isCalibrated, distanceMeters } from './lib/geo'
import { logCatchAttempt } from './lib/log'
import { spawnsNear, rememberHome, getInitialMapCenter } from './lib/spawn'
import ThrowMinigame from './ThrowMinigame'
import './App.css'

// ── Map tile style (OSM raster — CSS filter below makes it dark) ──────────────

const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

const RARE_TIERS = new Set(['rare', 'epic', 'legendary'])
const FALLBACK_CENTER = getInitialMapCenter() || { lat: 40.7128, lng: -74.006 }

// ── Marker DOM helpers ────────────────────────────────────────────────────────

function makePlayerEl() {
  const el = document.createElement('div')
  el.className = 'player-pokeball'
  return el
}

function makeCreatureEl(poi, state, onTap) {
  const wrap = document.createElement('div')
  wrap.className = ['creature-wrap', state, RARE_TIERS.has(poi.rarity) ? 'rare' : '']
    .filter(Boolean).join(' ')
  wrap.innerHTML = `<div class="creature-emoji">${poi.emoji}</div><div class="creature-shadow"></div>`
  // Both click (desktop) and touchend (mobile) — touchend is critical on iOS
  const fire = (e) => { e.preventDefault(); e.stopPropagation(); onTap(poi) }
  wrap.addEventListener('click', fire)
  wrap.addEventListener('touchend', fire, { passive: false })
  return wrap
}

// ── Compass bearing ───────────────────────────────────────────────────────────

function startCompass(onBearing) {
  function handler(e) {
    const heading =
      e.webkitCompassHeading != null   ? e.webkitCompassHeading   // iOS: CW from north
      : e.absolute && e.alpha != null  ? (360 - e.alpha) % 360    // Android absolute
      : null
    if (heading != null) onBearing(heading)
  }

  if (typeof DeviceOrientationEvent === 'undefined') return () => {}

  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ — request only; silently skip if user hasn't gestured yet
    DeviceOrientationEvent.requestPermission()
      .then(s => {
        if (s === 'granted') window.addEventListener('deviceorientation', handler, true)
      })
      .catch(() => {})
    return () => window.removeEventListener('deviceorientation', handler, true)
  }

  window.addEventListener('deviceorientationabsolute', handler, true)
  window.addEventListener('deviceorientation',         handler, true)
  return () => {
    window.removeEventListener('deviceorientationabsolute', handler, true)
    window.removeEventListener('deviceorientation',         handler, true)
  }
}

// ── UI Components ─────────────────────────────────────────────────────────────

function GpsStatusBadge({ geo }) {
  if (geo.status === 'denied')     return <span className="gps-badge denied">Location Off</span>
  if (geo.status === 'unavailable' || geo.status === 'timeout')
                                   return <span className="gps-badge unavailable">GPS unavail.</span>
  if (geo.status === 'waiting' || geo.status === 'idle')
                                   return <span className="gps-badge calibrating">GPS acquiring…</span>
  if (!isCalibrated(geo))          return <span className="gps-badge calibrating">{Math.round(geo.accuracy)}m</span>
  return <span className="gps-badge ready">GPS ready</span>
}

function DeniedModal() {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true">
      <div className="modal">
        <h2>📍 Location blocked</h2>
        <p>Safari has blocked this page's location access specifically.</p>
        {isIOS ? (
          <>
            <p className="modal-instructions modal-instructions--step">
              Tap the <strong>aA</strong> icon in Safari's address bar → <strong>Website Settings</strong> → <strong>Location</strong> → <strong>Allow</strong>
            </p>
            <p className="modal-instructions modal-instructions--alt">
              Or: Settings → Privacy &amp; Security → Location Services → Safari → While Using
            </p>
          </>
        ) : (
          <p className="modal-instructions">
            Tap the lock icon → Site settings → Location → Allow
          </p>
        )}
        <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    </div>
  )
}

function GpsStuckBanner() {
  return (
    <div className="gps-stuck-banner">
      <p>📡 GPS signal is slow</p>
      <p className="gps-stuck-hint">Step outside or near a window for a clear sky view.</p>
      <button className="btn-gps-retry" onClick={() => window.location.reload()}>Retry</button>
    </div>
  )
}

function StartScreen({ onStart }) {
  return (
    <div className="start-backdrop">
      <div className="start-pokeball" aria-hidden="true" />
      <h1 className="start-logo">Poké<em>GO</em></h1>
      <p className="start-tagline">Wild creatures are nearby…</p>
      <button className="btn-start" onClick={onStart}>▶ Enable GPS &amp; Start</button>
      <p className="start-hint">Tap Allow when your browser asks for location</p>
    </div>
  )
}

function WaitingForGps() {
  return (
    <div className="start-backdrop">
      <div className="start-pokeball" aria-hidden="true" />
      <h1 className="start-logo">Poké<em>GO</em></h1>
      <p className="start-tagline">Locating you…</p>
      <p className="start-hint" style={{ marginTop: 0, fontSize: 14, color: '#6b7280' }}>
        Step outside or near a window for faster GPS lock
      </p>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [started, setStarted] = useState(() => localStorage.getItem('gps_started') === '1')
  const geo = useGeolocation(started)

  // Map refs — never trigger React re-renders
  const mapContainerRef   = useRef(null)
  const mapRef            = useRef(null)
  const playerMarkerRef   = useRef(null)
  const creatureMarkersRef = useRef({})     // id → maplibregl.Marker
  const firstCenterRef    = useRef(false)   // have we centered on player yet?

  const [mapReady, setMapReady] = useState(false)
  const [spawned, setSpawned]   = useState(null)

  const [caught, setCaught] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pokego_caught') || '[]')) } catch { return new Set() }
  })
  const [balls, setBalls] = useState(() => {
    const saved = parseInt(localStorage.getItem('pokego_balls') ?? '', 10)
    return Number.isFinite(saved) ? saved : STARTING_BALLS
  })

  const [toast, setToast]         = useState(null)
  const [encounter, setEncounter] = useState(null)
  const toastTimer                = useRef(null)
  const [gpsStuck, setGpsStuck]   = useState(false)
  const stuckTimer                = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // ── Map init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let map
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style:     MAP_STYLE,
        center:    [FALLBACK_CENTER.lng, FALLBACK_CENTER.lat],
        zoom:      17,
        pitch:     45,           // Pokémon GO perspective tilt
        bearing:   0,
        pitchWithRotate: true,
        attributionControl: false,
        failIfMajorPerformanceCaveat: false,   // allow software WebGL fallback
      })
    } catch (err) {
      console.error('[map] Map init failed:', err)
      return
    }

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    map.on('load', () => setMapReady(true))
    map.on('error', (e) => console.error('[map] runtime error:', e))

    mapRef.current = map

    // Compass bearing — rotate map to face your direction of travel
    const stopCompass = startCompass((heading) => {
      if (mapRef.current) mapRef.current.setBearing(heading)
    })

    return () => {
      stopCompass()
      playerMarkerRef.current?.remove()
      playerMarkerRef.current = null
      Object.values(creatureMarkersRef.current).forEach(m => m.remove())
      creatureMarkersRef.current = {}
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  // ── Spawn creatures on any GPS position (not just calibrated) ───────────────

  useEffect(() => {
    if (!geo.position) return
    const refresh = () => {
      const p = geo.position
      if (!p) return
      rememberHome(p)
      setSpawned(spawnsNear(p))
    }
    refresh()
    const t = setInterval(refresh, 10000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!geo.position])

  // ── Player marker ────────────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map || !geo.position) return

    const lngLat = [geo.position.lng, geo.position.lat]

    if (!playerMarkerRef.current) {
      playerMarkerRef.current = new maplibregl.Marker({ element: makePlayerEl(), anchor: 'center' })
        .setLngLat(lngLat)
        .addTo(map)
    } else {
      playerMarkerRef.current.setLngLat(lngLat)
    }

    // First GPS fix: fly to player position
    if (!firstCenterRef.current) {
      firstCenterRef.current = true
      map.easeTo({ center: lngLat, zoom: 17, pitch: 45, duration: 900 })
    }
  }, [geo.position])

  // ── Creature markers: add/remove when spawn list changes ────────────────────

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const liveIds = new Set(allPois.map(p => p.id))

    // Remove gone markers
    Object.keys(creatureMarkersRef.current).forEach(id => {
      if (!liveIds.has(id)) {
        creatureMarkersRef.current[id].remove()
        delete creatureMarkersRef.current[id]
      }
    })

    // Add new markers
    allPois.forEach(poi => {
      if (creatureMarkersRef.current[poi.id]) return
      const state = geo.position
        ? (distanceMeters(geo.position, poi) <= CATCH_RADIUS ? 'catchable' : 'locked')
        : 'locked'
      const el = makeCreatureEl(poi, state, (p) => handleMarkerClickRef.current(p))
      creatureMarkersRef.current[poi.id] = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([poi.lng, poi.lat])
        .addTo(map)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPois, mapReady])

  // ── Update marker catchable/locked state when player moves ───────────────────

  useEffect(() => {
    if (!geo.position) return
    allPois.forEach(poi => {
      const marker = creatureMarkersRef.current[poi.id]
      if (!marker) return
      const el    = marker.getElement()
      const state = distanceMeters(geo.position, poi) <= CATCH_RADIUS ? 'catchable' : 'locked'
      el.className = ['creature-wrap', state, RARE_TIERS.has(poi.rarity) ? 'rare' : '']
        .filter(Boolean).join(' ')
    })
  }, [geo.position, allPois])

  // ── GPS stuck ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (geo.status === 'waiting') {
      stuckTimer.current = setTimeout(() => setGpsStuck(true), 20000)
    } else {
      clearTimeout(stuckTimer.current)
      setGpsStuck(false)
    }
    return () => clearTimeout(stuckTimer.current)
  }, [geo.status])

  // ── Persist ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('pokego_caught', JSON.stringify([...caught]))
  }, [caught])

  useEffect(() => {
    localStorage.setItem('pokego_balls', String(balls))
  }, [balls])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const allPois = useMemo(
    () => (spawned || []).filter(p => !caught.has(p.id)),
    [spawned, caught],
  )

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  // Stable ref so creature marker closures always call the latest handler
  const handleMarkerClickRef = useRef(null)
  function handleMarkerClick(poi) {
    if (caught.has(poi.id)) { showToast(`Already caught ${poi.emoji}`); return }
    if (!geo.position) { showToast('GPS acquiring — step outside'); return }
    const dist = distanceMeters(geo.position, poi)
    if (dist > CATCH_RADIUS) {
      showToast(`Too far! Move ${Math.round(dist - CATCH_RADIUS)}m closer`)
      logCatchAttempt({ outcome: 'gate_blocked', distance: dist, accuracy: geo.accuracy, poi })
      return
    }
    if (balls <= 0) { showToast('No balls left! Walk to a PokéStop.'); return }
    setEncounter(poi)
  }
  useEffect(() => { handleMarkerClickRef.current = handleMarkerClick })

  function handleCatch(poi, bonus) {
    setCaught(prev => new Set(prev).add(poi.id))
    setBalls(b => Math.max(0, b - 1))
    logCatchAttempt({ outcome: 'caught', bonus: bonus.label, accuracy: geo.accuracy, poi })
    setEncounter(null)
    showToast(`${bonus.label} Caught ${poi.emoji} ${poi.name} — CP ${poi.cp}!`)
  }

  function handleFlee(poi) {
    setBalls(b => Math.max(0, b - 1))
    logCatchAttempt({ outcome: 'fled', accuracy: geo.accuracy, poi })
    setEncounter(null)
    showToast(`${poi.emoji} ${poi.name} fled!`)
  }

  function recenter() {
    if (geo.position && mapRef.current) {
      mapRef.current.easeTo({ center: [geo.position.lng, geo.position.lat], pitch: 45, duration: 400 })
    }
  }

  const showDenied  = geo.status === 'denied'
  const liveCount   = allPois.length
  // Only block with waiting screen before the very first GPS position arrives
  const showWaiting = started && !geo.position && geo.status !== 'denied'

  return (
    <div className="app-shell">
      {/* MapLibre GL container — fills the shell */}
      <div ref={mapContainerRef} className="map-wrap" />

      {/* Top overlay */}
      <div className="top-bar">
        <button className="trainer-avatar" aria-label="Trainer profile">🧢</button>
        <div className="top-center"><GpsStatusBadge geo={geo} /></div>
        <button className="nearby-btn" aria-label="Nearby">🔭</button>
      </div>

      {/* Bottom nav */}
      <div className="bottom-nav">
        <div className="nav-btn-wrap">
          <button className="nav-btn" aria-label="Items">🎒<span>Items</span></button>
          <span className="ball-count-pill">{balls} balls</span>
        </div>
        <div className="nav-center">
          <div className="caught-badge">{caught.size} caught · {liveCount} nearby</div>
          <button className="pokeball-nav-btn" onClick={recenter} aria-label="Recenter">
            <div className="pokeball" />
          </button>
        </div>
        <button className="nav-btn" aria-label="Pokédex">📖<span>Pokédex</span></button>
      </div>

      {/* Screens */}
      {!started && (
        <StartScreen onStart={() => { localStorage.setItem('gps_started', '1'); setStarted(true) }} />
      )}
      {showWaiting && !gpsStuck && <WaitingForGps />}
      {showDenied  && <DeniedModal />}

      {encounter && (
        <ThrowMinigame
          poi={encounter}
          balls={balls}
          onCatch={handleCatch}
          onFlee={handleFlee}
          onRunAway={() => setEncounter(null)}
        />
      )}

      {gpsStuck && geo.status === 'waiting' && <GpsStuckBanner />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
