/** Recent-window line. Callers pass already-ordered samples; fewer than two draws nothing. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 120
  const h = 28
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 4) + 2
      const y = h - 4 - ((v - min) / span) * (h - 8)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
