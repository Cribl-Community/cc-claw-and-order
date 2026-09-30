import { useEffect, useState } from 'react'
import { usePark } from './usePark'

/**
 * Wall-clock "now" for staleness, refreshed on the sim tick (or once while paused).
 * Avoids calling Date.now() during render.
 */
export function useSimNow(): number {
  const { config, park } = usePark()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (config.paused || park.paused) return
    const id = window.setInterval(() => setNow(Date.now()), config.tickMs)
    return () => window.clearInterval(id)
  }, [config.paused, config.tickMs, park.paused])

  return now
}
