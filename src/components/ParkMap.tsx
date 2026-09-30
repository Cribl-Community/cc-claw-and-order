import type { KeyboardEvent } from 'react'
import parkMapUrl from '../assets/park-map.webp'
import type { ConfigSettings, ParkModel } from '../model/types'
import { enclosureContainmentStatus } from '../model/status'
import '../styles/park-map.css'

/** viewBox matches the illustrated map aspect (1400×876). */
const VB_W = 1000
const VB_H = 626

/**
 * Ellipse hit areas on the illustrated map. Coordinates are viewBox units.
 * Labels are baked into the artwork, so the overlay only carries status.
 */
const HOTSPOTS: Record<
  string,
  { cx: number; cy: number; rx: number; ry: number; dotX: number; dotY: number }
> = {
  'enc-apex-paddock': { cx: 290, cy: 148, rx: 155, ry: 68, dotX: 168, dotY: 108 },
  'enc-raptor-hold': { cx: 735, cy: 155, rx: 160, ry: 72, dotX: 868, dotY: 112 },
  'enc-spitter-glen': { cx: 205, cy: 312, rx: 115, ry: 78, dotX: 118, dotY: 258 },
  'enc-trihorn-valley': { cx: 500, cy: 328, rx: 108, ry: 78, dotX: 582, dotY: 268 },
  'enc-gentle-giants': { cx: 800, cy: 348, rx: 125, ry: 82, dotX: 890, dotY: 292 },
}

export function ParkMap({
  park,
  config,
  now,
  onSelectAsset,
}: {
  park: ParkModel
  config: ConfigSettings
  now: number
  onSelectAsset: (id: string) => void
}) {
  const onKeyDown = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectAsset(id)
    }
  }

  return (
    <div className="park-map" role="group" aria-label="Park map">
      <svg className="park-map__svg" viewBox={`0 0 ${VB_W} ${VB_H}`} xmlns="http://www.w3.org/2000/svg">
        <image href={parkMapUrl} x={0} y={0} width={VB_W} height={VB_H} />
        {park.enclosures.map((enc) => {
          const spot = HOTSPOTS[enc.id]
          if (!spot) return null
          const status = enclosureContainmentStatus(enc, config, now)
          return (
            <g
              key={enc.id}
              className={`park-map__marker park-map__marker--${status}`}
              role="button"
              tabIndex={0}
              aria-label={`${enc.name}: ${status}`}
              onClick={() => onSelectAsset(enc.id)}
              onKeyDown={onKeyDown(enc.id)}
            >
              <ellipse
                className="park-map__hit"
                cx={spot.cx}
                cy={spot.cy}
                rx={spot.rx}
                ry={spot.ry}
              />
              <circle className="park-map__marker-ring" cx={spot.dotX} cy={spot.dotY} r={16} />
              <circle className="park-map__marker-dot" cx={spot.dotX} cy={spot.dotY} r={10} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
