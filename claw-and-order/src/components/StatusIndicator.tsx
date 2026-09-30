import { Text } from '@capra/core'
import {
  AlertOutlined,
  CircleCheck,
  CircleQuestion,
  WarningOutlined,
  type SvgIcon,
} from '@capra/icons'
import type { OperationalStatus } from '../model/types'

const STATUS_META: Record<OperationalStatus, { label: string; Icon: SvgIcon }> = {
  normal: { label: 'Normal', Icon: CircleCheck },
  warning: { label: 'Warning', Icon: WarningOutlined },
  critical: { label: 'Critical', Icon: AlertOutlined },
  unknown: { label: 'Unknown', Icon: CircleQuestion },
}

export function StatusIndicator({
  status,
  label,
  compact = false,
}: {
  status: OperationalStatus
  /** Override display text (e.g. “Stale”). */
  label?: string
  /** Icon + text only. Use in tight metric cards. */
  compact?: boolean
}) {
  const meta = STATUS_META[status]
  const Icon = meta.Icon
  const text = label ?? meta.label

  return (
    <span
      className={[
        'status-indicator',
        `status-indicator--${status}`,
        compact ? 'status-indicator--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon size="sm" aria-hidden />
      <Text variant="body-sm-normal">{text}</Text>
    </span>
  )
}
