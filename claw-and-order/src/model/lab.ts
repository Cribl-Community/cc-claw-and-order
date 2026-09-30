import { isReadingStale, worseStatus } from './status'
import type {
  ConfigSettings,
  Egg,
  Incubator,
  LabMachine,
  OperationalStatus,
  ParkModel,
} from './types'

export function eggWeightInRange(egg: Egg): boolean {
  if (egg.weightG == null) return false
  return egg.weightG >= egg.weightRangeG.min && egg.weightG <= egg.weightRangeG.max
}

export function anyEggOutOfWeight(park: ParkModel): boolean {
  return park.lab.incubators.some((inc) => inc.eggs.some((egg) => !eggWeightInRange(egg)))
}

export function anyDoorOpen(park: ParkModel): boolean {
  return park.lab.incubators.some((inc) => inc.door === 'open')
}

export function incubatorInBounds(
  incubator: Incubator,
  now: number,
  staleThresholdSec: number,
): boolean {
  if (incubator.door !== 'closed') return false
  if (!incubator.powered) return false
  if (isReadingStale(incubator.lastReadingAt, now, staleThresholdSec)) return false
  if (incubator.tempC == null || incubator.humidityPct == null) return false
  if (
    incubator.tempC < incubator.tempRangeC.min ||
    incubator.tempC > incubator.tempRangeC.max
  ) {
    return false
  }
  if (
    incubator.humidityPct < incubator.humidityRangePct.min ||
    incubator.humidityPct > incubator.humidityRangePct.max
  ) {
    return false
  }
  return incubator.eggs.every(eggWeightInRange)
}

export function incubatorOperationalStatus(
  incubator: Incubator,
  now: number,
  staleThresholdSec: number,
): OperationalStatus {
  if (isReadingStale(incubator.lastReadingAt, now, staleThresholdSec)) return 'unknown'
  if (incubator.door === 'unknown') return 'unknown'
  if (incubator.tempC == null || incubator.humidityPct == null) return 'unknown'
  if (incubator.eggs.some((egg) => egg.weightG == null)) return 'unknown'

  let status: OperationalStatus = 'normal'
  if (incubator.door === 'open') status = worseStatus(status, 'warning')
  if (!incubator.powered) status = worseStatus(status, 'warning')
  if (
    incubator.tempC < incubator.tempRangeC.min ||
    incubator.tempC > incubator.tempRangeC.max
  ) {
    status = worseStatus(status, 'warning')
  }
  if (
    incubator.humidityPct < incubator.humidityRangePct.min ||
    incubator.humidityPct > incubator.humidityRangePct.max
  ) {
    status = worseStatus(status, 'warning')
  }
  if (incubator.eggs.some((egg) => !eggWeightInRange(egg))) {
    status = worseStatus(status, 'warning')
  }
  return status
}

export function machineOperationalStatus(
  machine: LabMachine,
  now: number,
  staleThresholdSec: number,
): OperationalStatus {
  if (isReadingStale(machine.lastReadingAt, now, staleThresholdSec)) return 'unknown'
  let status: OperationalStatus = 'normal'
  if (!machine.powered) status = worseStatus(status, 'warning')
  if (machine.tempRangeC != null) {
    if (machine.tempC == null) return 'unknown'
    if (machine.tempC < machine.tempRangeC.min || machine.tempC > machine.tempRangeC.max) {
      status = worseStatus(status, 'warning')
    }
  }
  return status
}

export function worstEggWeightDeviation(incubator: Incubator): {
  weightG: number | null
  range: { min: number; max: number } | null
  outOfRange: boolean
} {
  let worst: Egg | null = null
  let worstDelta = -1
  for (const egg of incubator.eggs) {
    if (egg.weightG == null) {
      return { weightG: null, range: egg.weightRangeG, outOfRange: true }
    }
    const below = egg.weightRangeG.min - egg.weightG
    const above = egg.weightG - egg.weightRangeG.max
    const delta = Math.max(below, above, 0)
    if (delta > worstDelta) {
      worstDelta = delta
      worst = egg
    }
  }
  if (worst == null) return { weightG: null, range: null, outOfRange: false }
  return {
    weightG: worst.weightG,
    range: worst.weightRangeG,
    outOfRange: !eggWeightInRange(worst),
  }
}

export function labKpis(
  park: ParkModel,
  config: ConfigSettings,
  now: number,
): {
  incubatorsInBounds: number
  incubatorsTotal: number
  doorsOpen: number
  machinesPowered: number
  machinesTotal: number
  hatchesInWindow: number
} {
  const incubatorsInBounds = park.lab.incubators.filter((inc) =>
    incubatorInBounds(inc, now, config.staleThresholdSec),
  ).length
  const doorsOpen = park.lab.incubators.filter((inc) => inc.door === 'open').length
  const machinesPowered = park.lab.machines.filter((m) => m.powered).length
  const windowMs = config.hatchAlertDays * 86_400_000
  const hatchesInWindow = park.lab.incubators.filter((inc) => {
    const delta = inc.expectedHatchAt - now
    return delta >= 0 && delta <= windowMs
  }).length
  return {
    incubatorsInBounds,
    incubatorsTotal: park.lab.incubators.length,
    doorsOpen,
    machinesPowered,
    machinesTotal: park.lab.machines.length,
    hatchesInWindow,
  }
}

export function labSummaryStatus(
  park: ParkModel,
  config: ConfigSettings,
  now: number,
): OperationalStatus {
  let status: OperationalStatus = 'normal'
  for (const inc of park.lab.incubators) {
    status = worseStatus(status, incubatorOperationalStatus(inc, now, config.staleThresholdSec))
  }
  for (const machine of park.lab.machines) {
    status = worseStatus(status, machineOperationalStatus(machine, now, config.staleThresholdSec))
  }
  const windowMs = config.hatchAlertDays * 86_400_000
  const soon = park.lab.incubators.some((inc) => {
    const delta = inc.expectedHatchAt - now
    return delta >= 0 && delta <= windowMs
  })
  if (soon) status = worseStatus(status, 'warning')
  return status
}
