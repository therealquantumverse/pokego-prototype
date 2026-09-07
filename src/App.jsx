import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { START_COORD, START_LABEL, ACCURACY_GATE } from './config'
import { useGeolocation, isCalibrated } from './lib/geo'
import './App.css'

// Player marker: solid blue dot with a white ring (Leaflet div-icon, no image assets).
// box-sizing:border-box fixes the 3px anchor drift from the 3px border (opus555 #5).
const playerIcon = L.divIcon({
  className: 'player-icon',
  html: `<div class="player-dot"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// react-leaflet v5 does not forward ref to MapContainer. Expose the map as a
// plain value (callback) instead of a ref so consumers can call setView during
// an event handler without touching ref.current during render.
function MapBridge({ onMap }) {
  const map = useMap()
  useEffect(() => {
    onMap(map)
  }, [map, onMap])
  return null
}

// Auto-centers on the FIRST fix only; never again unless the player taps
// recenter. Subsequent position updates move the marker, not the view (opus555 #1).
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

// Accuracy circle: radius = coords.accuracy. Shows the uncertainty shrink as
// GPS settles — explains the gate instead of announcing it (opus555 #4).
function AccuracyCircle({ position, accuracy }) {
  if (!position || accuracy == null) return null
  return (
    <Circle
      center={[position.lat, position.lng]}
      radius={accuracy}
      pathOptions={{
        color: '#2563eb',
        weight: 1,
        fillColor: '#2563eb',
        fillOpacity: 0.12,
        dashArray: '4 4',
      }}
    />
  )
}

function DeniedModal() {
  return (
    <div className="modal-backdrop" role="alertdialog" aria-modal="true">
      <div className="modal">
        <h2>Location needed</h2>
        <p>
          This game works by finding creatures near you on the map, so it needs
          your GPS position. Enable location access to play.
        </p>
        <button className="btn-primary">Got it</button>
      </div>
    </div>
  )
}

function HeaderState({ geo }) {
  const calibrated = isCalibrated(geo)
  if (geo.status === 'denied') return <span className="header-state denied">Location off</span>
  if (geo.status === 'unavailable' || geo.status === 'timeout')
    return <span className="header-state unavailable">GPS unavailable</span>
  if (geo.status === 'waiting' || geo.status === 'idle')
    return <span className="header-state calibrating">GPS acquiring…</span>
  if (!calibrated)
    return (
      <span className="header-state calibrating">
        GPS calibrating… ({Math.round(geo.accuracy)}m / gate {ACCURACY_GATE}m)
      </span>
    )
  return <span className="header-state ready">GPS ready ({Math.round(geo.accuracy)}m)</span>
}

function RecenterButton({ map, position }) {
  const onClick = () => {
    if (position && map) map.setView([position.lat, position.lng], 17)
  }
  return (
    <button className="recenter" onClick={onClick} title="Recenter on me" aria-label="Recenter on me">
      ◎
    </button>
  )
}

// Arm flag from URL (?arm=a or ?arm=b). Opus555: the control arm is the
// highest-value line of code — without it we can't tell location-locked
// progression from ordinary unlock-gating.
function getArm() {
  try {
    const p = new URLSearchParams(window.location.search).get('arm')
    if (p === 'b') return 'B'
    if (p === 'a') return 'A'
  } catch {}
  return 'A'
}

function App() {
  const geo = useGeolocation()
  const [arm] = useState(getArm)
  const [map, setMap] = useState(null)
  const handleMap = (m) => setMap(m)

  // Derive the modal during render — no effect, no setState-in-effect (opus555).
  const showDenied = geo.status === 'denied'

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>PokéGo Prototype</h1>
        <span className="header-sub">{START_LABEL}</span>
        <span className="header-state-wrap">
          <HeaderState geo={geo} />
          <span className="header-arm">arm {arm}</span>
        </span>
      </header>
      <div className="map-wrap">
        <MapContainer center={[START_COORD.lat, START_COORD.lng]} zoom={17} className="app-map">
          {/*
            Tile source: swap from tile.openstreetmap.org to a free-tier /
            self-hosted provider (e.g. Protomaps) before the field test — a
            one-line change here (opus555 #3). Deferred to the pre-field-test
            pass so this step stays focused on geolocation.
          */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBridge onMap={handleMap} />
          <FirstFixCenter target={geo.position} />
          {geo.position && (
            <>
              <AccuracyCircle position={geo.position} accuracy={geo.accuracy} />
              <Marker
                position={[geo.position.lat, geo.position.lng]}
                icon={playerIcon}
                title={START_LABEL}
              />
            </>
          )}
        </MapContainer>
        <RecenterButton map={map} position={geo.position} />
        {showDenied && <DeniedModal />}
      </div>
    </div>
  )
}

export default App
