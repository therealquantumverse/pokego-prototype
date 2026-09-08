import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ACCURACY_GATE, CATCH_RADIUS } from './config'
import { useGeolocation, isCalibrated, distanceMeters } from './lib/geo'
import { logCatchAttempt } from './lib/log'
import { CLUSTER_META } from './pois'
import { loadOrCreateSpawn, spawnRare, getInitialMapCenter } from './lib/spawn'
import './App.css'

// ── Marker icons ─────────────────────────────────────────────────────────────

const playerIcon = L.divIcon({
  className: '',
  html: `<div class="player-pokeball"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function makeCreatureIcon(poi, state) {
  const cls = ['creature-wrap', state, poi.isRare ? 'rare' : ''].filter(Boolean).join(' ')
  return L.divIcon({
    className: '',
    html: `<div class="${cls}">
      <div class="creature-emoji">${poi.emoji}</div>
      <div class="creature-shadow"></div>
    </div>`,
    iconSize: [44, 52],
    iconAnchor: [22, 50],
  })
}

// ── Map helpers ───────────────────────────────────────────────────────────────

function MapBridge({ onMap }) {
  const map = useMap()
  useEffect(() => { onMap(map) }, [map, onMap])
  return null
}

function FirstFixCenter({ target }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !target) return
    map.setView([target.lat, target.lng], 17)
    done.current = true
  }, [map, target])
  return null
}

function AccuracyCircle({ position, accuracy }) {
  if (!position || accuracy == null) return null
  return (
    <Circle
      center={[position.lat, position.lng]}
      radius={accuracy}
      pathOptions={{ color: '#e31e24', weight: 1, fillColor: '#e31e24', fillOpacity: 0.08, dashArray: '4 4' }}
    />
  )
}

// ── UI components ─────────────────────────────────────────────────────────────

function GpsStatusBadge({ geo }) {
  const calibrated = isCalibrated(geo)
  if (geo.status === 'denied') return <span className="gps-badge denied">Location Off</span>
  if (geo.status === 'unavailable' || geo.status === 'timeout') return <span className="gps-badge unavailable">GPS unavail.</span>
  if (geo.status === 'waiting' || geo.status === 'idle') return <span className="gps-badge calibrating">GPS acquiring…</span>
  if (!calibrated) return <span className="gps-badge calibrating">{Math.round(geo.accuracy)}m / {ACCURACY_GATE}m</span>
  return <span className="gps-badge ready">GPS ready</span>
}

function DeniedModal() {
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent)
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true">
      <div className="modal">
        <h2>📍 Location blocked for this site</h2>
        <p>Your iPhone's Location Services is on — but Safari has blocked <em>this page</em> specifically.</p>
        {isIOS ? (
          <>
            <p className="modal-instructions modal-instructions--step">
              <strong>Quick fix:</strong> In Safari's address bar, tap the <strong>aA</strong> icon → <strong>Website Settings</strong> → <strong>Location</strong> → <strong>Allow</strong>
            </p>
            <p className="modal-instructions modal-instructions--alt">
              Or: Settings → Privacy &amp; Security → Location Services → Safari → While Using
            </p>
          </>
        ) : (
          <p className="modal-instructions">
            Tap the lock icon in your browser address bar → Site settings → Location → Allow
          </p>
        )}
        <p className="modal-instructions">Then tap Reload.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    </div>
  )
}

function GpsStuckBanner() {
  return (
    <div className="gps-stuck-banner">
      <p>📡 GPS signal is slow</p>
      <p className="gps-stuck-hint">Try moving near a window or stepping outside for a clear sky view. Location permission is already granted.</p>
      <button className="btn-gps-retry" onClick={() => window.location.reload()}>Retry</button>
    </div>
  )
}

function StartScreen({ onStart }) {
  return (
    <div className="start-backdrop">
      <div className="start-pokeball" aria-hidden="true"></div>
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
      <div className="start-pokeball" aria-hidden="true"></div>
      <h1 className="start-logo">Poké<em>GO</em></h1>
      <p className="start-tagline">Locating you…</p>
      <p className="start-hint" style={{ marginTop: 0, fontSize: 14, color: '#6b7280' }}>
        Step outside or near a window for faster GPS lock
      </p>
    </div>
  )
}

function EncounterCard({ poi, geo, onCatch, onFlee }) {
  const dist = geo.position ? distanceMeters(geo.position, poi) : null
  return (
    <div className="encounter-backdrop" onClick={onFlee}>
      <div className="encounter-card" onClick={e => e.stopPropagation()}>
        <div className="encounter-header">
          <span className="encounter-emoji">{poi.emoji}</span>
          <h2 className="encounter-name">{poi.name}</h2>
          {dist != null && <p className="encounter-dist">{Math.round(dist)}m away</p>}
          {poi.isRare && <span className="encounter-rare-badge">✨ RARE</span>}
        </div>
        <button className="btn-catch" onClick={onCatch}>🎯 Catch!</button>
        <button className="btn-flee" onClick={onFlee}>Run Away</button>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

// Default map center — shown only before GPS fires for the first time.
const FALLBACK_CENTER = getInitialMapCenter() || { lat: 40.7128, lng: -74.006 }

function App() {
  const [started, setStarted] = useState(() => localStorage.getItem('gps_started') === '1')
  const geo = useGeolocation(started)

  const [map, setMap]       = useState(null)
  const handleMap           = useCallback((m) => setMap(m), [])

  // Spawned creatures — null until first calibrated GPS fix
  const [spawned, setSpawned]               = useState(null)
  const spawnTriggered                       = useRef(false)

  // Caught set and unlocked rares — persisted across reloads
  const [caught, setCaught] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pokego_caught') || '[]')) } catch { return new Set() }
  })
  const [unlockedRareClusters, setUnlockedRareClusters] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pokego_rares') || '[]')) } catch { return new Set() }
  })

  const [toast, setToast]       = useState(null)
  const [encounter, setEncounter] = useState(null)
  const toastTimer               = useRef(null)
  const [gpsStuck, setGpsStuck]  = useState(false)
  const stuckTimer               = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // Spawn creatures once GPS gets a clean fix
  useEffect(() => {
    if (spawnTriggered.current || !isCalibrated(geo) || !geo.position) return
    spawnTriggered.current = true
    setSpawned(loadOrCreateSpawn(geo.position, distanceMeters))
  }, [geo])

  useEffect(() => {
    if (geo.status === 'waiting') {
      stuckTimer.current = setTimeout(() => setGpsStuck(true), 20000)
    } else {
      clearTimeout(stuckTimer.current)
      setGpsStuck(false)
    }
    return () => clearTimeout(stuckTimer.current)
  }, [geo.status])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  // Persist caught and rares to localStorage
  useEffect(() => {
    localStorage.setItem('pokego_caught', JSON.stringify([...caught]))
  }, [caught])
  useEffect(() => {
    localStorage.setItem('pokego_rares', JSON.stringify([...unlockedRareClusters]))
  }, [unlockedRareClusters])

  const allPois = useMemo(() => {
    if (!spawned) return []
    const rares = [...unlockedRareClusters].map(key => spawnRare(key, spawned)).filter(Boolean)
    return [...spawned, ...rares]
  }, [spawned, unlockedRareClusters])

  function poiState(poi) {
    if (caught.has(poi.id)) return 'caught'
    if (!isCalibrated(geo) || !geo.position) return 'locked'
    return distanceMeters(geo.position, poi) <= CATCH_RADIUS ? 'catchable' : 'locked'
  }

  function handleMarkerClick(poi) {
    if (caught.has(poi.id)) {
      showToast(`Already caught ${poi.emoji}`)
      return
    }

    const dist = geo.position ? distanceMeters(geo.position, poi) : null

    if (!isCalibrated(geo) || !geo.position) {
      showToast(`GPS calibrating — wait for accuracy < ${ACCURACY_GATE}m`)
      logCatchAttempt({ outcome: 'gate_blocked', distance: dist, accuracy: geo.accuracy, poi })
      return
    }
    if (dist > CATCH_RADIUS) {
      showToast(`Too far! Move ${Math.round(dist - CATCH_RADIUS)}m closer`)
      logCatchAttempt({ outcome: 'gate_blocked', distance: dist, accuracy: geo.accuracy, poi })
      return
    }

    setEncounter(poi)
  }

  function handleCatch() {
    const poi = encounter
    if (!poi) return
    setEncounter(null)

    const dist = geo.position ? distanceMeters(geo.position, poi) : null
    logCatchAttempt({ outcome: 'caught', distance: dist, accuracy: geo.accuracy, poi })

    const nextCaught = new Set(caught)
    nextCaught.add(poi.id)
    setCaught(nextCaught)

    const key = poi.cluster
    if (key && CLUSTER_META[key] && !unlockedRareClusters.has(key)) {
      const clusterDone = (spawned || []).filter(p => p.cluster === key).every(p => nextCaught.has(p.id))
      if (clusterDone) {
        setUnlockedRareClusters(prev => new Set([...prev, key]))
        const c = CLUSTER_META[key]
        showToast(`${c.name} complete! A rare ${c.rareEmoji} appeared!`)
        return
      }
    }

    showToast(`Caught ${poi.emoji} ${poi.name}!`)
  }

  function recenter() {
    if (geo.position && map) map.setView([geo.position.lat, geo.position.lng], 17)
  }

  const showDenied   = geo.status === 'denied'
  const totalPossible = (spawned?.length ?? 0) + unlockedRareClusters.size

  // Show waiting screen until creatures spawn
  const showWaiting = started && !spawned && geo.status !== 'denied'

  return (
    <div className="app-shell">
      {/* Full-screen map */}
      <div className="map-wrap">
        <MapContainer center={[FALLBACK_CENTER.lat, FALLBACK_CENTER.lng]} zoom={spawned ? 17 : 14} className="app-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapBridge onMap={handleMap} />
          <FirstFixCenter target={geo.position} />
          {geo.position && (
            <>
              <AccuracyCircle position={geo.position} accuracy={geo.accuracy} />
              <Marker
                position={[geo.position.lat, geo.position.lng]}
                icon={playerIcon}
                title="You"
              />
            </>
          )}
          {allPois.map(poi => (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              icon={makeCreatureIcon(poi, poiState(poi))}
              eventHandlers={{ click: () => handleMarkerClick(poi) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Top overlay */}
      <div className="top-bar">
        <button className="trainer-avatar" title="Trainer" aria-label="Trainer profile">🧢</button>
        <div className="top-center">
          <GpsStatusBadge geo={geo} />
        </div>
        <button className="nearby-btn" title="Nearby Pokémon" aria-label="Nearby">🔭</button>
      </div>

      {/* Bottom nav */}
      <div className="bottom-nav">
        <button className="nav-btn" aria-label="Items">🎒<span>Items</span></button>
        <div className="nav-center">
          <div className="caught-badge">{caught.size} / {totalPossible}</div>
          <button className="pokeball-nav-btn" onClick={recenter} title="Recenter" aria-label="Recenter on me">
            <div className="pokeball"></div>
          </button>
        </div>
        <button className="nav-btn" aria-label="Pokédex">📖<span>Pokédex</span></button>
      </div>

      {/* Screens & overlays */}
      {!started && <StartScreen onStart={() => { localStorage.setItem('gps_started', '1'); setStarted(true) }} />}
      {showWaiting && !gpsStuck && <WaitingForGps />}
      {showDenied && <DeniedModal />}
      {encounter && (
        <EncounterCard
          poi={encounter}
          geo={geo}
          onCatch={handleCatch}
          onFlee={() => setEncounter(null)}
        />
      )}
      {gpsStuck && geo.status === 'waiting' && <GpsStuckBanner />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

export default App
