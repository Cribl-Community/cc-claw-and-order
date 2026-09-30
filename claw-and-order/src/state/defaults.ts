import type { ConfigSettings, OperatorState } from '../model/types'

export const DEFAULT_CONFIG: ConfigSettings = {
  scenario: 'normal',
  paused: false,
  tickMs: 5_000,
  defaultLanding: '/',
  staleThresholdSec: 300,
  density: 'comfortable',
  guestCapacity: 5_000,
  queueWarnMin: 15,
  queueCritMin: 30,
  fenceVoltageMin: 7_500,
  hatchAlertDays: 7,
}

export const EMPTY_OPERATOR: OperatorState = {
  acks: {},
  notes: {},
}
