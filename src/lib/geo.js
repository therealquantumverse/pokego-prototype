// Geolocation hook + great-circle distance.
//
// Desktop dev testing: Chrome DevTools > Sensors > Location lets you override
// coordinates without a mock. We test the real Geolocation API, not a fake.

import { useEffect, useRef, useState } from 'react'
import { ACCURACY_GATE, GEO_OPTIONS } from '../config'

// Haversine distance in meters.
export function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// State shape (galaxy spec, 2026-09-07):
//   {
//     status: 'idle' | 'waiting' | 'ready' | 'denied' | 'unavailable' | 'timeout'
//     position: { lat, lng } | null   // most recent fix (ready | calibrating)
//     accuracy: number | null          // most recent coords.accuracy (meters)
//     error: string | null             // last error message
//   }
// Pass enabled=false to keep in 'idle' until a user gesture fires (iOS Safari
// will silently drop watchPosition calls made without a user interaction).
export function useGeolocation(enabled = true) {
  const [state, setState] = useState({
    status: 'idle',
    position: null,
    accuracy: null,
    error: null,
  })
  // Ref so the retry logic can read the latest status without re-subscribing.
  const statusRef = useRef(state.status)

  useEffect(() => {
    if (!enabled) return
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', position: null, accuracy: null, error: 'Geolocation not supported' })
      return
    }

    let retriesLeft = 1 // retry silently once on timeout, then show unavailable
    let firstFix = true

    const onPosition = (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords
      statusRef.current = 'ready'
      setState({
        status: 'ready',
        position: { lat, lng },
        accuracy,
        error: null,
      })
      firstFix = false
      // Log on every position update (galaxy spec #2); the Vercel POST is a later step.
      console.info('[geo]', {
        lat: +lat.toFixed(6),
        lng: +lng.toFixed(6),
        accuracy: +accuracy.toFixed(1),
        ts: Date.now(),
      })
    }

    const onError = (err) => {
      if (err.code === err.TIMEOUT && retriesLeft > 0) {
        retriesLeft -= 1
        return // retry silently; watchPosition will re-fire
      }
      const label =
        err.code === err.PERMISSION_DENIED ? 'denied'
        : err.code === err.POSITION_UNAVAILABLE ? 'unavailable'
        : 'unavailable'
      // Set the ref to the *resolved* label (galaxy review) so the ref and state
      // never disagree, even for the transient `denied` case.
      statusRef.current = label
      setState({ status: label, position: null, accuracy: null, error: err.message })
    }

    setState((s) => (s.status === 'idle' ? { ...s, status: 'waiting' } : s))
    const watchId = navigator.geolocation.watchPosition(onPosition, onError, GEO_OPTIONS)

    // StrictMode double-invokes effects in dev — this cleanup is what prevents
    // two live watchers, doubled log events, and a leak (opus555 finding #2).
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  return state
}

// Convenience: is the current fix good enough to trust?
export function isCalibrated(state) {
  return state.status === 'ready' && state.accuracy != null && state.accuracy < ACCURACY_GATE
}
