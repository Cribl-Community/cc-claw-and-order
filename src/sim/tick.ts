import { anyDepartureUncovered } from '../model/fleet'
import { anyDoorOpen, anyEggOutOfWeight } from '../model/lab'
import type { ConfigSettings, Incident, ParkModel } from '../model/types'
import { PARK_OVERVIEW_SERIES, selectOverviewMetrics } from '../model/selectors'
import { isReadingStale } from '../model/status'
import { createPrng } from './prng'

const HISTORY_CAP = 20

function nudge(value: number, delta: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value + delta))
}

/** Nudge weight without crossing back into an in-range band. */
function nudgeWeight(
  weightG: number,
  range: { min: number; max: number },
  delta: number,
): number {
  const next = weightG + delta
  if (weightG < range.min) return Math.min(next, range.min - 1)
  if (weightG > range.max) return Math.max(next, range.max + 1)
  return Math.min(range.max, Math.max(range.min, next))
}

function appendHistory(
  history: ParkModel['readingHistory'],
  assetId: string,
  tick: number,
  values: Record<string, number | null>,
): ParkModel['readingHistory'] {
  const prior = history[assetId] ?? []
  const nextSample = { t: tick, values }
  const merged = [...prior, nextSample].slice(-HISTORY_CAP)
  return { ...history, [assetId]: merged }
}

function syncIncidents(park: ParkModel, config: ConfigSettings, now: number): Incident[] {
  return park.incidents.map((incident) => {
    if (incident.id === 'inc-queue-plains') {
      const attraction = park.attractions.find((a) => a.id === 'attr-plains-overlook')
      const active = (attraction?.waitMinutes ?? 0) >= config.queueWarnMin
      return { ...incident, active }
    }

    if (incident.id === 'inc-storm-grid') {
      return { ...incident, active: park.scenario === 'stormOutage' }
    }

    if (incident.id === 'inc-storm-fence') {
      const apex = park.enclosures.find((e) => e.id === 'enc-apex-paddock')
      const low =
        apex?.fenceVoltage != null && apex.fenceVoltage < config.fenceVoltageMin
      const stale = isReadingStale(apex?.lastReadingAt, now, config.staleThresholdSec)
      return { ...incident, active: park.scenario === 'stormOutage' && (low || stale) }
    }

    if (incident.id === 'inc-lab-door') {
      return { ...incident, active: anyDoorOpen(park) }
    }

    if (incident.id === 'inc-lab-weight') {
      return { ...incident, active: anyEggOutOfWeight(park) }
    }

    if (incident.id === 'inc-fleet-uncovered') {
      return {
        ...incident,
        active: anyDepartureUncovered(park, now, config.staleThresholdSec),
      }
    }

    if (incident.severity === 'critical') {
      return { ...incident, active: true }
    }

    return incident
  })
}

export function advanceTick(park: ParkModel, config: ConfigSettings, now: number): ParkModel {
  if (config.paused || park.paused) {
    return park
  }

  const tick = park.tick + 1
  const rand = createPrng(`${park.seededAt}:${tick}`)
  const jitter = () => (rand() - 0.5) * 2

  let readingHistory = park.readingHistory

  const enclosures = park.enclosures.map((enc) => {
    if (enc.tempC == null && enc.fenceVoltage == null) {
      return enc
    }
    const tempC = enc.tempC == null ? null : nudge(enc.tempC, jitter() * 0.4, 10, 40)
    const humidityPct =
      enc.humidityPct == null ? null : nudge(enc.humidityPct, jitter() * 1.2, 20, 90)
    const fenceVoltage =
      enc.fenceVoltage == null ? null : Math.round(nudge(enc.fenceVoltage, jitter() * 40, 0, 12_000))
    const updated = { ...enc, tempC, humidityPct, fenceVoltage, lastReadingAt: now }
    readingHistory = appendHistory(readingHistory, enc.id, tick, {
      tempC,
      humidityPct,
      fenceVoltage,
    })
    return updated
  })

  const vehicles = park.vehicles.map((veh) => {
    if (veh.batteryPct == null) return veh
    if (isReadingStale(veh.lastReadingAt, now, config.staleThresholdSec)) return veh
    const batteryPct = Math.round(nudge(veh.batteryPct, jitter() * 0.8, 0, 100))
    const updated = { ...veh, batteryPct, lastReadingAt: now }
    readingHistory = appendHistory(readingHistory, veh.id, tick, { batteryPct })
    return updated
  })

  const incubators = park.lab.incubators.map((inc) => {
    const tempC = inc.tempC == null ? null : nudge(inc.tempC, jitter() * 0.3, 18, 36)
    const humidityPct =
      inc.humidityPct == null ? null : nudge(inc.humidityPct, jitter() * 0.8, 40, 90)
    const eggs = inc.eggs.map((egg) => {
      if (egg.weightG == null) return egg
      return {
        ...egg,
        weightG: Math.round(nudgeWeight(egg.weightG, egg.weightRangeG, jitter() * 4)),
      }
    })
    const lastReadingAt =
      tempC == null && humidityPct == null ? inc.lastReadingAt : now
    readingHistory = appendHistory(readingHistory, inc.id, tick, { tempC, humidityPct })
    return { ...inc, tempC, humidityPct, eggs, lastReadingAt }
  })

  const machines = park.lab.machines.map((machine) => {
    if (machine.tempC == null) {
      return { ...machine, lastReadingAt: now }
    }
    if (isReadingStale(machine.lastReadingAt, now, config.staleThresholdSec)) {
      return machine
    }
    const tempC = nudge(machine.tempC, jitter() * 0.2, -40, 20)
    readingHistory = appendHistory(readingHistory, machine.id, tick, { tempC })
    return { ...machine, tempC, lastReadingAt: now }
  })

  const lab = { incubators, machines }

  const attractions =
    park.scenario === 'stormOutage'
      ? park.attractions
      : park.attractions.map((a) => ({
          ...a,
          waitMinutes: Math.max(0, Math.round(nudge(a.waitMinutes, jitter() * 1.5, 0, 120))),
          queueLength: Math.max(0, Math.round(nudge(a.queueLength, jitter() * 3, 0, 200))),
        }))

  const draft: ParkModel = {
    ...park,
    tick,
    enclosures,
    vehicles,
    lab,
    attractions,
    readingHistory,
  }

  const withIncidents = {
    ...draft,
    incidents: syncIncidents(draft, config, now),
  }
  const metrics = selectOverviewMetrics(withIncidents, config, { acks: {}, notes: {} })
  return {
    ...withIncidents,
    readingHistory: appendHistory(withIncidents.readingHistory, PARK_OVERVIEW_SERIES, tick, {
      criticalIncidents: metrics.criticalIncidents,
      longestWaitMinutes: metrics.longestWaitMinutes,
      animalsNeedingAttention: metrics.animalsNeedingAttention,
    }),
  }
}
