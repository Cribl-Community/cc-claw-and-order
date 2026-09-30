import { deriveOperationalStatus, isReadingStale } from '../model/status'
import type { ConfigSettings, Incident, ParkModel } from '../model/types'
import { createPrng } from './prng'

const HISTORY_CAP = 20

function nudge(value: number, delta: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value + delta))
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
    const batteryPct = Math.round(nudge(veh.batteryPct, jitter() * 0.8, 0, 100))
    const updated = { ...veh, batteryPct }
    readingHistory = appendHistory(readingHistory, veh.id, tick, { batteryPct })
    return updated
  })

  const lab = {
    ...park.lab,
    incubators: park.lab.incubators.map((inc) => {
      const tempC = inc.tempC == null ? null : nudge(inc.tempC, jitter() * 0.3, 18, 36)
      const humidityPct =
        inc.humidityPct == null ? null : nudge(inc.humidityPct, jitter() * 0.8, 40, 90)
      const status = deriveOperationalStatus({
        value: tempC,
        lastReadingAt: now,
        now,
        staleThresholdSec: config.staleThresholdSec,
        warnBelow: 24,
        critBelow: 20,
        warnAbove: 32,
        critAbove: 36,
      })
      readingHistory = appendHistory(readingHistory, inc.id, tick, { tempC, humidityPct })
      return { ...inc, tempC, humidityPct, status }
    }),
    coldStorage: (() => {
      const prior = park.lab.coldStorage
      if (prior.tempC == null) {
        return prior
      }
      if (isReadingStale(prior.lastReadingAt, now, config.staleThresholdSec)) {
        return prior
      }
      const tempC = nudge(prior.tempC, jitter() * 0.2, -2, 12)
      const status = deriveOperationalStatus({
        value: tempC,
        lastReadingAt: now,
        now,
        staleThresholdSec: config.staleThresholdSec,
        warnAbove: 6,
        critAbove: 10,
      })
      readingHistory = appendHistory(readingHistory, 'lab-cold-storage', tick, { tempC })
      return { ...prior, tempC, status, lastReadingAt: now }
    })(),
  }

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

  return {
    ...draft,
    incidents: syncIncidents(draft, config, now),
  }
}
