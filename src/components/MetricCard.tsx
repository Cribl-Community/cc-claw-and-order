import { Card, Text } from '@capra/core'
import type { ReactNode } from 'react'
import type { OperationalStatus } from '../model/types'
import { StatusIndicator } from './StatusIndicator'

export function MetricCard({
  label,
  value,
  status,
  children,
}: {
  label: string
  value: string | number
  status?: OperationalStatus
  children?: ReactNode
}) {
  return (
    <div className="metric-card">
      <Card>
        <Card.Header>
          <Card.Description>{label}</Card.Description>
        </Card.Header>
        <Card.Content>
          <Text variant="metric-lg">{String(value)}</Text>
          {status != null ? <StatusIndicator status={status} compact /> : null}
          {children}
        </Card.Content>
      </Card>
    </div>
  )
}
