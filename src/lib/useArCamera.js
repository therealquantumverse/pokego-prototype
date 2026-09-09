import { useCallback, useEffect, useRef, useState } from 'react'

// Rear-facing camera passthrough for the AR encounter view.
// status: 'off' | 'starting' | 'on' | 'denied' | 'unsupported'
export function useArCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('off')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('off')
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return }
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setStatus('on')
    } catch (err) {
      // Safari reports a denied permission and a missing camera the same way;
      // both mean "fall back to the painted background".
      setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'unsupported')
    }
  }, [])

  useEffect(() => stop, [stop])

  return { videoRef, status, start, stop }
}
