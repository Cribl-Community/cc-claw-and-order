import { enclosureContainmentStatus, isReadingStale, worseStatus } from './status'
import type {
  ConfigSettings,
  Dinosaur,
  Enclosure,
  Incident,
  OperationalStatus,
  OperatorState,
  ParkModel,
  Species,
} from './types'

/** Park-level samples for the overview sparklines. Not an asset id. */
export const PARK_OVERVIEW_SERIES = 'park-overview'

export interface OverviewMetrics {
  criticalIncidents: number
  animalsNeedingAttention: number
  attractionsAvailable: number
  guestsInPark: number
  typicalWaitMinutes: number
  longestWaitMinutes: number
  tourReadinessPct: number
}

export function selectCriticalIncidentCount(park: ParkModel): number {
  return park.incidents.filter((i) => i.active && i.severity === 'critical').length
}

export function selectAnimalsNeedingAttention(park: ParkModel): Dinosaur[] {
  return park.dinosaurs.filter(
    (d) => d.welfareStatus === 'warning' || d.welfareStatus === 'critical',
  )
}

function openAttractions(park: ParkModel) {
  return park.attractions.filter((a) => a.status !== 'closed')
}

function selectTypicalWaitMinutes(park: ParkModel): number {
  const open = openAttractions(park)
  if (open.length === 0) return 0
  const total = open.reduce((sum, a) => sum + a.waitMinutes, 0)
  return Math.round(total / open.length)
}

function selectLongestWaitMinutes(park: ParkModel): number {
  const open = openAttractions(park)
  if (open.length === 0) return 0
  return Math.max(...open.map((a) => a.waitMinutes))
}

function selectAttractionsAvailable(park: ParkModel): number {
  return park.attractions.filter(
    (a) => a.status !== 'closed' && a.status !== 'critical' && a.status !== 'unknown',
  ).length
}

function selectTourReadinessPct(park: ParkModel): number {
  const safariVehicles = park.vehicles.filter((v) =>
    park.safariRoutes.some((r) => r.id === v.routeId),
  )
  if (safariVehicles.length === 0) return 0
  const ready = safariVehicles.filter((v) => v.readiness === 'ready').length
  return Math.round((ready / safariVehicles.length) * 100)
}

export function selectOverviewMetrics(
  park: ParkModel,
  _config: ConfigSettings,
  _operator: OperatorState,
): OverviewMetrics {
  return {
    criticalIncidents: selectCriticalIncidentCount(park),
    animalsNeedingAttention: selectAnimalsNeedingAttention(park).length,
    attractionsAvailable: selectAttractionsAvailable(park),
    guestsInPark: park.guestsInPark,
    typicalWaitMinutes: selectTypicalWaitMinutes(park),
    longestWaitMinutes: selectLongestWaitMinutes(park),
    tourReadinessPct: selectTourReadinessPct(park),
  }
}

export function isIncidentAcknowledged(incidentId: string, operator: OperatorState): boolean {
  return incidentId in operator.acks
}

const severityRank: Record<Incident['severity'], number> = {
  critical: 0,
  warning: 1,
}

/** Active incidents only; critical first, then unacknowledged first, then newest. */
export function selectPrioritizedIncidents(park: ParkModel, operator: OperatorState): Incident[] {
  return park.incidents
    .filter((i) => i.active)
    .slice()
    .sort((a, b) => {
      const sev = severityRank[a.severity] - severityRank[b.severity]
      if (sev !== 0) return sev
      const ackA = isIncidentAcknowledged(a.id, operator) ? 1 : 0
      const ackB = isIncidentAcknowledged(b.id, operator) ? 1 : 0
      if (ackA !== ackB) return ackA - ackB
      return b.openedAt - a.openedAt
    })
}

function incidentStatus(severity: Incident['severity']): OperationalStatus {
  return severity === 'critical' ? 'critical' : 'warning'
}

function activeIncidentsForAssets(park: ParkModel, assetIds: string[]): Incident[] {
  const set = new Set(assetIds)
  return park.incidents.filter(
    (i) => i.active && i.assetIds.some((id) => set.has(id)),
  )
}

export function selectSpeciesById(park: ParkModel): Map<string, Species> {
  return new Map(park.species.map((s) => [s.id, s]))
}

export function selectEnclosureById(park: ParkModel): Map<string, Enclosure> {
  return new Map(park.enclosures.map((e) => [e.id, e]))
}

/** Occupant welfare + containment + linked incidents (not species inherent threat). */
export function selectEnclosureOperationalRisk(
  park: ParkModel,
  enclosure: Enclosure,
  config: ConfigSettings,
  now: number,
): OperationalStatus {
  let risk = enclosureContainmentStatus(enclosure, config, now)
  for (const dino of park.dinosaurs) {
    if (dino.enclosureId !== enclosure.id) continue
    risk = worseStatus(risk, dino.welfareStatus)
  }
  for (const incident of activeIncidentsForAssets(park, [enclosure.id])) {
    risk = worseStatus(risk, incidentStatus(incident.severity))
  }
  return risk
}

/** Welfare + home enclosure containment + linked incidents (not species inherent threat). */
export function selectDinosaurOperationalRisk(
  park: ParkModel,
  dino: Dinosaur,
  config: ConfigSettings,
  now: number,
): OperationalStatus {
  let risk: OperationalStatus = dino.welfareStatus
  const enclosure = park.enclosures.find((e) => e.id === dino.enclosureId)
  if (enclosure) {
    risk = worseStatus(risk, enclosureContainmentStatus(enclosure, config, now))
  }
  for (const incident of activeIncidentsForAssets(park, [dino.id, dino.enclosureId])) {
    risk = worseStatus(risk, incidentStatus(incident.severity))
  }
  return risk
}

export interface EnclosuresPageMetrics {
  enclosureAlerts: number
  welfareAlerts: number
  avgFenceVoltage: number | null
  fenceUnknownCount: number
  capacityUtilizationPct: number
}

export function selectEnclosuresPageMetrics(
  park: ParkModel,
  config: ConfigSettings,
  now: number,
): EnclosuresPageMetrics {
  const enclosureAlerts = park.enclosures.filter((e) => {
    const s = enclosureContainmentStatus(e, config, now)
    return s === 'warning' || s === 'critical'
  }).length

  const knownVoltages: number[] = []
  let fenceUnknownCount = 0
  for (const enc of park.enclosures) {
    const stale = isReadingStale(enc.lastReadingAt, now, config.staleThresholdSec)
    if (enc.fenceVoltage == null || stale) {
      fenceUnknownCount += 1
    } else {
      knownVoltages.push(enc.fenceVoltage)
    }
  }
  const avgFenceVoltage =
    knownVoltages.length === 0
      ? null
      : Math.round(knownVoltages.reduce((sum, v) => sum + v, 0) / knownVoltages.length)

  const capacity = park.enclosures.reduce((sum, e) => sum + e.capacity, 0)
  const capacityUtilizationPct =
    capacity === 0 ? 0 : Math.round((park.dinosaurs.length / capacity) * 100)

  return {
    enclosureAlerts,
    welfareAlerts: selectAnimalsNeedingAttention(park).length,
    avgFenceVoltage,
    fenceUnknownCount,
    capacityUtilizationPct,
  }
}
