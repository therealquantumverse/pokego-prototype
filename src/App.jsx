import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { START_COORD, START_LABEL, ACCURACY_GATE, CATCH_RADIUS } from './config'
import { useGeolocation, isCalibrated, distanceMeters } from './lib/geo'
import { logCatchAttempt } from './lib/log'
import { POIS, CLUSTERS } from './pois'
import './App.css'

// ── Map helpers ─────────────────────────────────────────────────────────────

const playerIcon = L.divIcon({
  className: 'player-icon',
  html: `<div class="player-dot"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function makePOIIcon(poi, state) {
  const cls = ['poi-icon', state, poi.isRare ? 'rare' : ''].filter(Boolean).join(' ')
  return L.divIcon({
    className: '',
    html: `<div class="${cls}"><span>${poi.emoji}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  })
}

function MapBridge({ onMap }) {
  const map = useMap()
  useEffect(() => { onMap(map) }, [map, onMap])
  return null
}

// Centers on first fix only; subsequent updates move the marker not the view.
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
      pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.12, dashArray: '4 4' }}
    />
  )
}

function DeniedModal() {
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true">
      <div className="modal">
        <h2>Location needed</h2>
        <p>This game finds creatures near you on the map — it needs your GPS position. Enable location access to play.</p>
        <button className="btn-primary">Got it</button>
      </div>
    </div>
  )
}

function HeaderState({ geo, caught, total }) {
  const calibrated = isCalibrated(geo)
  const gpsLabel = () => {
    if (geo.status === 'denied') return <span className="header-state denied">Location off</span>
    if (geo.status === 'unavailable' || geo.status === 'timeout')
      return <span className="header-state unavailable">GPS unavailable</span>
    if (geo.status === 'waiting' || geo.status === 'idle')
      return <span className="header-state calibrating">GPS acquiring…</span>
    if (!calibrated)
      return <span className="header-state calibrating">GPS calibrating… ({Math.round(geo.accuracy)}m / {ACCURACY_GATE}m)</span>
    return <span className="header-state ready">GPS ready ({Math.round(geo.accuracy)}m)</span>
  }
  return (
    <>
      {gpsLabel()}
      <span className="header-caught">{caught}/{total} caught</span>
    </>
  )
}

function RecenterButton({ map, position }) {
  return (
    <button
      className="recenter"
      title="Recenter on me"
      aria-label="Recenter on me"
      onClick={() => { if (position && map) map.setView([position.lat, position.lng], 17) }}
    >
      ◎
    </button>
  )
}

function getArm() {
  try {
    const p = new URLSearchParams(window.location.search).get('arm')
    if (p === 'b') return 'B'
    if (p === 'a') return 'A'
  } catch {}
  return 'A'
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const geo = useGeolocation()
  const [arm] = useState(getArm)
  const [map, setMap] = useState(null)
  const handleMap = useCallback((m) => setMap(m), [])

  const [caught, setCaught] = useState(() => new Set())
  const [unlockedRareClusters, setUnlockedRareClusters] = useState(() => new Set())
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }, [])

  // Merge regular POIs + any unlocked rares into one list.
  const allPois = useMemo(() => {
    const rares = Object.entries(CLUSTERS)
      .filter(([key]) => unlockedRareClusters.has(key))
      .map(([, c]) => c.rare)
    return [...POIS, ...rares]
  }, [unlockedRareClusters])

  function poiState(poi) {
    if (caught.has(poi.id)) return 'caught'
    if (arm === 'B') return 'catchable'
    if (!isCalibrated(geo) || !geo.position) return 'locked'
    return distanceMeters(geo.position, poi) <= CATCH_RADIUS ? 'catchable' : 'locked'
  }

  function handleCatch(poi) {
    if (caught.has(poi.id)) return

    const dist = geo.position ? distanceMeters(geo.position, poi) : null
    const accuracy = geo.accuracy

    // Arm A gating
    if (arm === 'A') {
      if (!isCalibrated(geo) || !geo.position) {
        showToast(`GPS still calibrating — wait for accuracy < ${ACCURACY_GATE}m`)
        logCatchAttempt({ arm, outcome: 'gate_blocked', distance: dist, accuracy, poi })
        return
      }
      if (dist > CATCH_RADIUS) {
        showToast(`Too far! ${Math.round(dist)}m away — need within ${CATCH_RADIUS}m`)
        logCatchAttempt({ arm, outcome: 'gate_blocked', distance: dist, accuracy, poi })
        return
      }
    }

    logCatchAttempt({ arm, outcome: 'caught', distance: dist, accuracy, poi })

    const nextCaught = new Set(caught)
    nextCaught.add(poi.id)
    setCaught(nextCaught)

    // Check cluster-complete
    const key = poi.cluster
    if (key && CLUSTERS[key] && !unlockedRareClusters.has(key)) {
      const clusterDone = POIS.filter(p => p.cluster === key).every(p => nextCaught.has(p.id))
      if (clusterDone) {
        setUnlockedRareClusters(prev => new Set([...prev, key]))
        const c = CLUSTERS[key]
        showToast(`${c.name} complete! A rare ${c.rare.emoji} appeared nearby!`)
        return
      }
    }

    const creature = poi.name.split(' ').slice(1).join(' ') || poi.name
    showToast(`Caught ${poi.emoji} ${creature}!`)
  }

  const showDenied = geo.status === 'denied'
  const totalBase = POIS.length

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>PokéGo Prototype</h1>
        <span className="header-sub">{START_LABEL}</span>
        <span className="header-state-wrap">
          <HeaderState geo={geo} caught={caught.size} total={totalBase + unlockedRareClusters.size} />
          <span className="header-arm">arm {arm}</span>
        </span>
      </header>
      <div className="map-wrap">
        <MapContainer center={[START_COORD.lat, START_COORD.lng]} zoom={17} className="app-map">
          {/* CartoDB Positron — free, no key, clean light style. */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
          <MapBridge onMap={handleMap} />
          <FirstFixCenter target={geo.position} />
          {geo.position && (
            <>
              <AccuracyCircle position={geo.position} accuracy={geo.accuracy} />
              <Marker position={[geo.position.lat, geo.position.lng]} icon={playerIcon} title={START_LABEL} />
            </>
          )}
          {allPois.map(poi => {
            const state = poiState(poi)
            return (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lng]}
                icon={makePOIIcon(poi, state)}
                eventHandlers={{ click: () => handleCatch(poi) }}
              />
            )
          })}
        </MapContainer>
        <RecenterButton map={map} position={geo.position} />
        {showDenied && <DeniedModal />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </div>
  )
}

export default App
