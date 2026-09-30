import type { ConfigSettings, Enclosure, OperationalStatus } from './types'

export interface DeriveOperationalStatusInput {
  value: number | null
  lastReadingAt?: number | null
  now: number
  staleThresholdSec: number
  /** Value strictly below this is warning (unless below critBelow). */
  warnBelow?: number
  /** Value strictly below this is critical. */
  critBelow?: number
  /** Value strictly above this is warning (unless above critAbove). */
  warnAbove?: number
  /** Value strictly above this is critical. */
  critAbove?: number
}

const STATUS_RANK: Record<OperationalStatus, number> = {
  normal: 0,
  unknown: 1,
  warning: 2,
  critical: 3,
}

/** Returns the worse of two operational statuses. */
export function worseStatus(a: OperationalStatus, b: OperationalStatus): OperationalStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b
}

/** Gate + fence containment health for an enclosure. */
export function enclosureContainmentStatus(
  enclosure: Enclosure,
  config: ConfigSettings,
  now: number,
): OperationalStatus {
  if (enclosure.gateStatus === 'fault') return 'critical'
  if (enclosure.gateStatus === 'unknown') return 'unknown'
  const fence = deriveOperationalStatus({
    value: enclosure.fenceVoltage,
    lastReadingAt: enclosure.lastReadingAt,
    now,
    staleThresholdSec: config.staleThresholdSec,
    warnBelow: config.fenceVoltageMin,
    critBelow: config.fenceVoltageMin * 0.85,
  })
  if (enclosure.gateStatus === 'open') return worseStatus(fence, 'warning')
  return fence
}

export function isReadingStale(
  lastReadingAt: number | null | undefined,
  now: number,
  staleThresholdSec: number,
): boolean {
  if (lastReadingAt == null) return true
  return now - lastReadingAt > staleThresholdSec * 1000
}

/** Maps null/stale readings to unknown; threshold breaches to warning/critical. */
export function deriveOperationalStatus(input: DeriveOperationalStatusInput): OperationalStatus {
  const { value, lastReadingAt, now, staleThresholdSec, warnBelow, critBelow, warnAbove, critAbove } =
    input

  if (value === null) return 'unknown'
  if (isReadingStale(lastReadingAt, now, staleThresholdSec)) return 'unknown'

  if (critBelow !== undefined && value < critBelow) return 'critical'
  if (warnBelow !== undefined && value < warnBelow) return 'warning'

  if (critAbove !== undefined && value > critAbove) return 'critical'
  if (warnAbove !== undefined && value > warnAbove) return 'warning'

  return 'normal'
}
