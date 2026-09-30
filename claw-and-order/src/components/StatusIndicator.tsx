import { Pill, Text } from '@capra/core'
import {
  AlertOutlined,
  CircleCheck,
  CircleQuestion,
  WarningOutlined,
  type SvgIcon,
} from '@capra/icons'
import type { OperationalStatus } from '../model/types'

type PillAppearance = 'default' | 'info' | 'danger' | 'warning' | 'success' | 'highlight'

const STATUS_META: Record<
  OperationalStatus,
  { label: string; appearance: PillAppearance; Icon: SvgIcon }
> = {
  normal: { label: 'Normal', appearance: 'success', Icon: CircleCheck },
  warning: { label: 'Warning', appearance: 'warning', Icon: WarningOutlined },
  critical: { label: 'Critical', appearance: 'danger', Icon: AlertOutlined },
  unknown: { label: 'Unknown', appearance: 'default', Icon: CircleQuestion },
}

export function StatusIndicator({
  status,
  label,
}: {
  status: OperationalStatus
  /** Override display text (e.g. “Stale”). */
  label?: string
}) {
  const meta = STATUS_META[status]
  const Icon = meta.Icon
  const text = label ?? meta.label

  return (
    <span className="status-indicator">
      <Icon size="sm" aria-hidden />
      <Text variant="body-sm-normal">{text}</Text>
      <Pill appearance={meta.appearance} variant="muted" inline>
        {meta.label}
      </Pill>
    </span>
  )
}
