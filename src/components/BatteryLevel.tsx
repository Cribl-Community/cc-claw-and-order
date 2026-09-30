import type { OperationalStatus } from '../model/types'

/** Four-bar battery glyph. Hover/title shows the percent. */
export function BatteryLevel({
  percent,
  status,
}: {
  percent: number | null
  status: OperationalStatus
}) {
  const bars =
    percent == null || status === 'unknown'
      ? 0
      : percent >= 75
        ? 4
        : percent >= 50
          ? 3
          : percent >= 25
            ? 2
            : percent > 0
              ? 1
              : 0
  const tone =
    status === 'unknown' || percent == null
      ? 'unknown'
      : status === 'critical' || percent < 20
        ? 'critical'
        : status === 'warning' || percent < 70
          ? 'warning'
          : 'normal'
  const label = percent == null ? 'Battery unknown' : `${percent}%`

  return (
    <span
      className={`battery-level battery-level--${tone}`}
      title={label}
      aria-label={label}
    >
      <span className="battery-level__body" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`battery-level__bar${i < bars ? ' battery-level__bar--on' : ''}`}
          />
        ))}
      </span>
      <span className="battery-level__cap" aria-hidden="true" />
    </span>
  )
}
