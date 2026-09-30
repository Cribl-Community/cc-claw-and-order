import { isReadingStale, worseStatus } from './status'
import type {
  ConfigSettings,
  OperationalStatus,
  ParkModel,
  Vehicle,
} from './types'

/** Fixed demo rule — not a Settings control. */
export const FLEET_BATTERY_MIN_PCT = 70

export function isDepartureUncovered(
  _departure: { vehicleId: string },
  vehicle: Vehicle | undefined,
  now: number,
  staleThresholdSec: number,
): boolean {
  if (vehicle == null) return true
  if (vehicle.readiness !== 'ready') return true
  if (vehicle.batteryPct == null) return true
  if (isReadingStale(vehicle.lastReadingAt, now, staleThresholdSec)) return true
  if (vehicle.batteryPct < FLEET_BATTERY_MIN_PCT) return true
  return false
}

export function listUncoveredDepartures(
  park: ParkModel,
  now: number,
  staleThresholdSec: number,
): { departureId: string; vehicleId: string; routeId: string }[] {
  const byId = new Map(park.vehicles.map((v) => [v.id, v]))
  const out: { departureId: string; vehicleId: string; routeId: string }[] = []
  for (const route of park.safariRoutes) {
    for (const dep of route.departures) {
      if (isDepartureUncovered(dep, byId.get(dep.vehicleId), now, staleThresholdSec)) {
        out.push({ departureId: dep.id, vehicleId: dep.vehicleId, routeId: route.id })
      }
    }
  }
  return out
}

export function anyDepartureUncovered(
  park: ParkModel,
  now: number,
  staleThresholdSec: number,
): boolean {
  return listUncoveredDepartures(park, now, staleThresholdSec).length > 0
}

export function fleetKpis(
  park: ParkModel,
  config: ConfigSettings,
  now: number,
): {
  vehiclesReady: number
  vehiclesTotal: number
  departuresCovered: number
  departuresTotal: number
  chargersPowered: number
  chargersTotal: number
  assignedNotReady: number
} {
  const vehiclesReady = park.vehicles.filter((v) => v.readiness === 'ready').length
  let departuresTotal = 0
  let departuresCovered = 0
  let assignedNotReady = 0
  const byId = new Map(park.vehicles.map((v) => [v.id, v]))
  for (const route of park.safariRoutes) {
    for (const dep of route.departures) {
      departuresTotal += 1
      const vehicle = byId.get(dep.vehicleId)
      if (isDepartureUncovered(dep, vehicle, now, config.staleThresholdSec)) {
        if (vehicle != null && vehicle.readiness !== 'ready') assignedNotReady += 1
      } else {
        departuresCovered += 1
      }
    }
  }
  const chargersPowered = park.chargers.filter((c) => c.powered).length
  return {
    vehiclesReady,
    vehiclesTotal: park.vehicles.length,
    departuresCovered,
    departuresTotal,
    chargersPowered,
    chargersTotal: park.chargers.length,
    assignedNotReady,
  }
}

export function fleetSummaryStatus(
  park: ParkModel,
  config: ConfigSettings,
  now: number,
): OperationalStatus {
  const kpis = fleetKpis(park, config, now)
  let status: OperationalStatus = 'normal'
  if (kpis.chargersPowered < kpis.chargersTotal) status = worseStatus(status, 'warning')
  if (kpis.assignedNotReady > 0 || kpis.departuresCovered < kpis.departuresTotal) {
    status = worseStatus(status, 'warning')
  }
  if (kpis.departuresCovered === 0 && kpis.departuresTotal > 0) {
    status = worseStatus(status, 'critical')
  }
  return status
}
