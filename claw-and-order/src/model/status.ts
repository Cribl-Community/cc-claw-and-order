import type { OperationalStatus } from './types'

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
