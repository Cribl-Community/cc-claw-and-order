import { createSeedPark } from '../data/seed'
import type { ConfigSettings, ParkModel, ScenarioId } from '../model/types'

const STALE_OFFSET_MS = 600_000

function clonePark(park: ParkModel): ParkModel {
  return structuredClone(park)
}

function applyStormOutage(park: ParkModel, config: ConfigSettings): ParkModel {
  const next = clonePark(park)
  next.scenario = 'stormOutage'
  next.weather = { condition: 'storm', severity: 3 }

  next.infrastructure = next.infrastructure.map((item) =>
    item.kind === 'power' ? { ...item, status: 'critical' as const } : item,
  )

  next.enclosures = next.enclosures.map((enc) => {
    if (enc.id === 'enc-apex-paddock') {
      return {
        ...enc,
        fenceVoltage: config.fenceVoltageMin - 900,
        tempC: enc.tempC,
        lastReadingAt: enc.lastReadingAt,
      }
    }
    if (enc.id === 'enc-raptor-hold') {
      return {
        ...enc,
        fenceVoltage: null,
        tempC: null,
        humidityPct: null,
        lastReadingAt: park.seededAt - STALE_OFFSET_MS,
      }
    }
    return {
      ...enc,
      fenceVoltage: config.fenceVoltageMin - 400,
    }
  })

  next.chargers = next.chargers.map((c) =>
    c.id === 'charger-hub-c' ? { ...c, powered: false } : c,
  )

  next.safariRoutes = next.safariRoutes.map((route) => ({
    ...route,
    status:
      route.id === 'route-safari-alpha'
        ? ('cancelled' as const)
        : ('delayed' as const),
  }))

  next.attractions = next.attractions.map((a) => ({
    ...a,
    queueLength: Math.max(a.queueLength, 80),
    waitMinutes: Math.max(a.waitMinutes, config.queueWarnMin + 8),
    crowding: 'high' as const,
    status: a.status === 'closed' ? a.status : ('warning' as const),
  }))

  next.lab = {
    ...next.lab,
    machines: next.lab.machines.map((machine) => ({
      ...machine,
      powered: false,
      lastReadingAt: park.seededAt,
    })),
  }

  next.guestsInPark = Math.round(next.guestsInPark * 1.05)
  next.feedback = [
    ...next.feedback,
    {
      id: 'fb-storm-01',
      rating: 2,
      summary: 'Safari cancelled without enough notice at the gate.',
      responseCount: 34,
      createdAt: park.seededAt - 20 * 60_000,
      routeId: 'route-safari-alpha',
    },
    {
      id: 'fb-storm-02',
      rating: 1,
      summary: 'Wait times posted online did not match the park boards.',
      responseCount: 19,
      createdAt: park.seededAt - 15 * 60_000,
      attractionId: 'attr-trex-kingdom',
    },
  ]

  const stormIncidents = [
    {
      id: 'inc-storm-grid',
      severity: 'critical' as const,
      title: 'North grid feeder failure',
      description: 'Storm damage caused a cascading loss on the north distribution feeder.',
      assetIds: ['infra-power-north'],
      affectedAttractionIds: ['attr-trex-kingdom', 'attr-raptor-encounter'],
      affectedRouteIds: ['route-safari-beta'],
      openedAt: park.seededAt - 10 * 60_000,
      active: true,
    },
    {
      id: 'inc-storm-fence',
      severity: 'critical' as const,
      title: 'Apex paddock fence undervoltage',
      description: 'Fence energizer reading below safe minimum during storm load shedding.',
      assetIds: ['enc-apex-paddock'],
      affectedAttractionIds: ['attr-trex-kingdom'],
      affectedRouteIds: [],
      openedAt: park.seededAt - 8 * 60_000,
      active: true,
    },
  ]

  next.incidents = [
    ...next.incidents.map((inc) => ({
      ...inc,
      active: inc.severity === 'warning' ? true : inc.active,
    })),
    ...stormIncidents,
  ]

  return next
}

function applyNormal(park: ParkModel): ParkModel {
  const seed = createSeedPark()
  return {
    ...seed,
    tick: park.tick,
    dinosaurs: park.dinosaurs.map((d) => ({ ...d })),
    readingHistory: park.readingHistory,
    scenario: 'normal',
    paused: park.paused,
  }
}

export function applyScenario(
  park: ParkModel,
  scenario: ScenarioId,
  config: ConfigSettings,
): ParkModel {
  if (scenario === 'stormOutage') {
    return applyStormOutage(park, config)
  }
  return applyNormal(park)
}
