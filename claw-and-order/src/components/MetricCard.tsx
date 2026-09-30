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
    <Card>
      <Card.Header>
        <Card.Description>{label}</Card.Description>
        {status != null ? (
          <Card.Action>
            <StatusIndicator status={status} />
          </Card.Action>
        ) : null}
      </Card.Header>
      <Card.Content>
        <Text variant="metric-lg">{String(value)}</Text>
        {children}
      </Card.Content>
    </Card>
  )
}
