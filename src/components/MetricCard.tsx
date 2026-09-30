import { Card, Text } from '@capra/core'
import type { ReactNode } from 'react'
import type { OperationalStatus } from '../model/types'
import { StatusIndicator } from './StatusIndicator'

export function MetricCard({
  label,
  value,
  status,
  trend,
  icon,
  tone = 'default',
  compact = false,
  children,
}: {
  label: string
  value: string | number
  status?: OperationalStatus
  trend?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'brand'
  compact?: boolean
  children?: ReactNode
}) {
  const alert = status === 'warning' || status === 'critical'
  const stack = (
    <div className="metric-card__stack">
      <span className="metric-card__label">
        {icon != null ? <span className="metric-card__icon">{icon}</span> : null}
        {tone === 'brand' ? (
          label
        ) : (
          <Text variant="body-sm-normal" color="subtle">
            {label}
          </Text>
        )}
      </span>
      <span className="metric-card__value">
        {tone === 'brand' ? String(value) : <Text variant="metric-lg">{String(value)}</Text>}
      </span>
      {trend}
      {status != null ? <StatusIndicator status={status} compact /> : null}
      {children}
    </div>
  )

  const className = [
    'metric-card',
    tone === 'brand' ? 'metric-card--brand' : '',
    compact ? 'metric-card--compact' : '',
    alert && tone === 'brand' ? 'metric-card--alert' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (tone === 'brand') {
    return <div className={className}>{stack}</div>
  }

  return (
    <div className={className}>
      <Card>
        <Card.Content>{stack}</Card.Content>
      </Card>
    </div>
  )
}
