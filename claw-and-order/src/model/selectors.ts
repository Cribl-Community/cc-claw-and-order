import type {
  ConfigSettings,
  Dinosaur,
  Incident,
  OperatorState,
  ParkModel,
} from './types'

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
