import type { KeyboardEvent } from 'react'
import type { ConfigSettings, Enclosure, ParkModel } from '../model/types'
import { enclosureContainmentStatus } from '../model/status'
import '../styles/park-map.css'

/** Simplified T-rex side profile for schematic watermark (no photography). */
const DINO_WATERMARK_PATH =
  'M2.2 6.8c0.2-1.1 0.8-2.1 1.8-2.6 0.4-0.2 0.7-0.6 0.8-1.1 0.1-0.4 0.4-0.7 0.8-0.8' +
  ' 0.5-0.1 1 0.2 1.2 0.6 0.3 0.5 0.8 0.8 1.4 0.7 0.4-0.1 0.7 0.2 0.8 0.6' +
  ' 0.1 0.5-0.2 1-0.7 1.1-0.6 0.2-1.1 0.6-1.3 1.2-0.2 0.5-0.6 0.9-1.1 1.1' +
  ' -0.4 0.1-0.7 0.5-0.7 0.9v0.6c0 0.3-0.2 0.5-0.5 0.5s-0.5-0.2-0.5-0.5' +
  ' v-0.4c0-0.3-0.2-0.5-0.5-0.5s-0.5 0.2-0.5 0.5v0.3c0 0.3-0.2 0.5-0.5 0.5' +
  ' -0.2 0-0.4-0.1-0.5-0.3-0.2-0.5-0.1-1.1 0.2-1.6z'

function enclosureCenter(enc: Enclosure): { x: number; y: number } {
  return {
    x: enc.map.x + enc.map.w / 2,
    y: enc.map.y + enc.map.h / 2,
  }
}

function shortLabel(name: string): string {
  const parts = name.split(/\s+/)
  if (parts.length <= 2) return name
  return parts.slice(0, 2).join(' ')
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
  const enclosures = park.enclosures
  const byId = new Map(enclosures.map((e) => [e.id, e]))

  let maxX = 1
  let maxY = 1
  for (const enc of enclosures) {
    maxX = Math.max(maxX, enc.map.x + enc.map.w)
    maxY = Math.max(maxY, enc.map.y + enc.map.h)
  }
  const pad = 0.6
  const viewW = maxX + pad * 2
  const viewH = maxY + pad * 2

  const routes = park.safariRoutes.map((route) => {
    const points = route.stopEnclosureIds
      .map((id) => byId.get(id))
      .filter((e): e is Enclosure => e != null)
      .map(enclosureCenter)
    const d =
      points.length === 0
        ? ''
        : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return { id: route.id, d }
  })

  const onKeyDown = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelectAsset(id)
    }
  }

  return (
    <div className="park-map" role="group" aria-label="Schematic park map">
      <svg
        className="park-map__svg"
        viewBox={`${-pad} ${-pad} ${viewW} ${viewH}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="park-map__watermark"
          d={DINO_WATERMARK_PATH}
          transform={`translate(${viewW * 0.35}, ${viewH * 0.15}) scale(0.9)`}
          aria-hidden
        />

        {enclosures.map((enc) => (
          <rect
            key={`zone-${enc.id}`}
            className="park-map__zone"
            x={enc.map.x}
            y={enc.map.y}
            width={enc.map.w}
            height={enc.map.h}
            rx={0.12}
            aria-hidden
          />
        ))}

        {routes.map((route) =>
          route.d ? (
            <path key={route.id} className="park-map__route" d={route.d} />
          ) : null,
        )}

        {enclosures.map((enc) => {
          const status = enclosureContainmentStatus(enc, config, now)
          const c = enclosureCenter(enc)
          return (
            <g
              key={`marker-${enc.id}`}
              className={`park-map__marker park-map__marker--${status}`}
              role="button"
              tabIndex={0}
              aria-label={`${enc.name}: ${status}`}
              onClick={() => onSelectAsset(enc.id)}
              onKeyDown={onKeyDown(enc.id)}
            >
              {/* Full-zone hit target so label/dot clicks select the enclosure */}
              <rect
                className="park-map__hit"
                x={enc.map.x}
                y={enc.map.y}
                width={enc.map.w}
                height={enc.map.h}
                rx={0.12}
              />
              <text className="park-map__zone-label" x={enc.map.x + 0.15} y={enc.map.y + 0.4}>
                {enc.zone}
              </text>
              <circle className="park-map__marker-ring" cx={c.x} cy={c.y} r={0.38} />
              <circle className="park-map__marker-dot" cx={c.x} cy={c.y} r={0.22} />
              <text
                className="park-map__marker-label"
                x={c.x}
                y={c.y + enc.map.h / 2 - 0.15}
                textAnchor="middle"
              >
                {shortLabel(enc.name)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
