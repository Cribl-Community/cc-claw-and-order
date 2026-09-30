import type {
  Attraction,
  Charger,
  Dinosaur,
  Enclosure,
  Incident,
  Infrastructure,
  LabState,
  ParkModel,
  SafariRoute,
  Species,
  Vehicle,
} from '../model/types'
import { PARK_OVERVIEW_SERIES } from '../model/selectors'

export const SEED_NOW = Date.parse('2026-09-30T17:00:00Z')

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

function speciesCatalog(): Species[] {
  return [
    {
      id: 'species-tyrannosaurus',
      displayName: 'Tyrannosaurus rex',
      diet: 'carnivore',
      inherentThreat: 5,
      agility: 2,
      sizeClass: 'XL',
      behaviorTags: ['apex-predator', 'solitary'],
      tempRangeC: { min: 18, max: 32 },
      humidityRangePct: { min: 40, max: 70 },
      containmentClass: 5,
      maxGroupSize: 2,
      preyOf: [],
      predatorOf: ['species-velociraptor', 'species-gallimimus', 'species-triceratops'],
    },
    {
      id: 'species-velociraptor',
      displayName: 'Velociraptor',
      diet: 'carnivore',
      inherentThreat: 4,
      agility: 5,
      sizeClass: 'M',
      behaviorTags: ['pack-hunter', 'intelligent'],
      tempRangeC: { min: 20, max: 34 },
      humidityRangePct: { min: 45, max: 75 },
      containmentClass: 4,
      maxGroupSize: 6,
      preyOf: ['species-tyrannosaurus'],
      predatorOf: ['species-gallimimus'],
    },
    {
      id: 'species-triceratops',
      displayName: 'Triceratops',
      diet: 'herbivore',
      inherentThreat: 3,
      agility: 2,
      sizeClass: 'L',
      behaviorTags: ['herd', 'defensive'],
      tempRangeC: { min: 16, max: 30 },
      humidityRangePct: { min: 35, max: 65 },
      containmentClass: 3,
      maxGroupSize: 8,
      preyOf: ['species-tyrannosaurus'],
      predatorOf: [],
    },
    {
      id: 'species-brachiosaurus',
      displayName: 'Brachiosaurus',
      diet: 'herbivore',
      inherentThreat: 2,
      agility: 1,
      sizeClass: 'XL',
      behaviorTags: ['gentle-giant', 'slow-moving'],
      tempRangeC: { min: 18, max: 28 },
      humidityRangePct: { min: 50, max: 80 },
      containmentClass: 2,
      maxGroupSize: 4,
      preyOf: [],
      predatorOf: [],
    },
    {
      id: 'species-dilophosaurus',
      displayName: 'Dilophosaurus',
      diet: 'carnivore',
      inherentThreat: 3,
      agility: 3,
      sizeClass: 'M',
      behaviorTags: ['ambush', 'venom-display'],
      tempRangeC: { min: 22, max: 36 },
      humidityRangePct: { min: 55, max: 85 },
      containmentClass: 4,
      maxGroupSize: 3,
      preyOf: ['species-tyrannosaurus'],
      predatorOf: [],
    },
    {
      id: 'species-gallimimus',
      displayName: 'Gallimimus',
      diet: 'omnivore',
      inherentThreat: 2,
      agility: 5,
      sizeClass: 'M',
      behaviorTags: ['flock', 'fast-runner'],
      tempRangeC: { min: 20, max: 33 },
      humidityRangePct: { min: 40, max: 70 },
      containmentClass: 2,
      maxGroupSize: 12,
      preyOf: ['species-velociraptor', 'species-tyrannosaurus'],
      predatorOf: [],
    },
  ]
}

function enclosures(now: number): Enclosure[] {
  return [
    {
      id: 'enc-apex-paddock',
      name: 'Apex Predator Paddock',
      zone: 'North Ridge',
      capacity: 2,
      map: { x: 0.4, y: 0.35, w: 7.2, h: 3.1 },
      attractionIds: ['attr-trex-kingdom'],
      tempC: 26,
      humidityPct: 52,
      fenceVoltage: 8_400,
      gateStatus: 'secured',
      lastReadingAt: now - 2 * 60_000,
      supportedBy: ['infra-power-north', 'infra-network-ops'],
    },
    {
      id: 'enc-raptor-hold',
      name: 'Raptor Containment',
      zone: 'East Jungle',
      capacity: 6,
      map: { x: 8.2, y: 0.35, w: 7.2, h: 3.1 },
      attractionIds: ['attr-raptor-encounter'],
      tempC: 28,
      humidityPct: 62,
      fenceVoltage: 8_200,
      gateStatus: 'secured',
      lastReadingAt: now - 3 * 60_000,
      supportedBy: ['infra-power-north', 'infra-network-ops'],
    },
    {
      id: 'enc-trihorn-valley',
      name: 'Tri-Horn Valley',
      zone: 'Central Plains',
      capacity: 8,
      map: { x: 5.5, y: 4.05, w: 4.8, h: 3.1 },
      attractionIds: ['attr-plains-overlook'],
      tempC: 24,
      humidityPct: 48,
      fenceVoltage: 7_900,
      gateStatus: 'secured',
      lastReadingAt: now - 4 * 60_000,
      supportedBy: ['infra-power-central', 'infra-network-ops'],
    },
    {
      id: 'enc-gentle-giants',
      name: 'Gentle Giants Meadow',
      zone: 'South Basin',
      capacity: 10,
      map: { x: 10.8, y: 4.05, w: 4.6, h: 3.1 },
      attractionIds: ['attr-plains-overlook'],
      tempC: 22,
      humidityPct: 58,
      fenceVoltage: 7_600,
      gateStatus: 'secured',
      lastReadingAt: now - 5 * 60_000,
      supportedBy: ['infra-power-central', 'infra-network-ops'],
    },
    {
      id: 'enc-spitter-glen',
      name: 'Spitter Glen',
      zone: 'West Wetlands',
      capacity: 3,
      map: { x: 0.4, y: 4.05, w: 4.6, h: 3.1 },
      attractionIds: [],
      tempC: 27,
      humidityPct: 72,
      fenceVoltage: 8_100,
      gateStatus: 'secured',
      lastReadingAt: now - 6 * 60_000,
      supportedBy: ['infra-power-central', 'infra-network-ops'],
    },
  ]
}

function dinosaurs(): Dinosaur[] {
  return [
    { id: 'dino-rexy', name: 'Rexy', speciesId: 'species-tyrannosaurus', enclosureId: 'enc-apex-paddock', sex: 'F', welfareStatus: 'normal' },
    { id: 'dino-blue', name: 'Blue', speciesId: 'species-velociraptor', enclosureId: 'enc-raptor-hold', sex: 'F', welfareStatus: 'normal' },
    { id: 'dino-charlie', name: 'Charlie', speciesId: 'species-velociraptor', enclosureId: 'enc-raptor-hold', sex: 'M', welfareStatus: 'normal' },
    { id: 'dino-sarah', name: 'Sarah', speciesId: 'species-triceratops', enclosureId: 'enc-trihorn-valley', sex: 'F', welfareStatus: 'normal' },
    { id: 'dino-cera', name: 'Cera', speciesId: 'species-triceratops', enclosureId: 'enc-trihorn-valley', sex: 'F', welfareStatus: 'normal' },
    { id: 'dino-littlefoot', name: 'Littlefoot', speciesId: 'species-brachiosaurus', enclosureId: 'enc-gentle-giants', sex: 'M', welfareStatus: 'normal' },
    { id: 'dino-ara', name: 'Ara', speciesId: 'species-brachiosaurus', enclosureId: 'enc-gentle-giants', sex: 'F', welfareStatus: 'normal' },
    { id: 'dino-ned', name: 'Ned', speciesId: 'species-dilophosaurus', enclosureId: 'enc-spitter-glen', sex: 'M', welfareStatus: 'normal' },
    { id: 'dino-scout', name: 'Scout', speciesId: 'species-gallimimus', enclosureId: 'enc-gentle-giants', sex: 'U', welfareStatus: 'normal' },
  ]
}

function attractions(): Attraction[] {
  return [
    {
      id: 'attr-trex-kingdom',
      name: 'T. Rex Kingdom',
      enclosureIds: ['enc-apex-paddock'],
      status: 'normal',
      queueLength: 42,
      waitMinutes: 18,
      crowding: 'moderate',
      zone: 'North Ridge',
    },
    {
      id: 'attr-raptor-encounter',
      name: 'Raptor Encounter',
      enclosureIds: ['enc-raptor-hold'],
      status: 'normal',
      queueLength: 28,
      waitMinutes: 12,
      crowding: 'low',
      zone: 'East Jungle',
    },
    {
      id: 'attr-plains-overlook',
      name: 'Plains Overlook Walk',
      enclosureIds: ['enc-trihorn-valley', 'enc-gentle-giants'],
      status: 'normal',
      queueLength: 55,
      waitMinutes: 22,
      crowding: 'moderate',
      zone: 'Central Plains',
    },
  ]
}

function safariRoutes(now: number): SafariRoute[] {
  const dep1 = now + 45 * 60_000
  const dep2 = now + 2 * HOUR_MS
  const dep3 = now + 50 * 60_000
  const dep4 = now + 2.5 * HOUR_MS
  return [
    {
      id: 'route-safari-alpha',
      name: 'Savanna Safari Alpha',
      stopEnclosureIds: ['enc-trihorn-valley', 'enc-gentle-giants', 'enc-spitter-glen'],
      status: 'running',
      departures: [
        // Charging vehicle — uncovered departure for fleet demo.
        { id: 'dep-alpha-1', departsAt: dep1, vehicleId: 'veh-ev-03', seats: 12, occupied: 9 },
        { id: 'dep-alpha-2', departsAt: dep2, vehicleId: 'veh-ev-02', seats: 12, occupied: 4 },
      ],
    },
    {
      id: 'route-safari-beta',
      name: 'Ridge Safari Beta',
      stopEnclosureIds: ['enc-apex-paddock', 'enc-raptor-hold', 'enc-trihorn-valley'],
      status: 'running',
      departures: [
        { id: 'dep-beta-1', departsAt: dep3, vehicleId: 'veh-ev-04', seats: 10, occupied: 7 },
        { id: 'dep-beta-2', departsAt: dep4, vehicleId: 'veh-ev-05', seats: 10, occupied: 2 },
      ],
    },
  ]
}

function vehicles(now: number): Vehicle[] {
  return [
    { id: 'veh-ev-01', model: 'Claw Coach CC-12', routeId: 'route-safari-alpha', batteryPct: 88, readiness: 'ready', chargerId: null, seats: 12, occupiedSeats: 9, lastReadingAt: now - 45_000 },
    { id: 'veh-ev-02', model: 'Claw Coach CC-12', routeId: 'route-safari-alpha', batteryPct: 76, readiness: 'ready', chargerId: null, seats: 12, occupiedSeats: 4, lastReadingAt: now - 50_000 },
    { id: 'veh-ev-03', model: 'Claw Coach CC-12', routeId: 'route-safari-alpha', batteryPct: 54, readiness: 'charging', chargerId: 'charger-hub-a', seats: 12, occupiedSeats: 0, lastReadingAt: now - 30_000 },
    { id: 'veh-ev-04', model: 'Ridge Scout RS-10', routeId: 'route-safari-beta', batteryPct: 91, readiness: 'ready', chargerId: null, seats: 10, occupiedSeats: 7, lastReadingAt: now - 40_000 },
    { id: 'veh-ev-05', model: 'Ridge Scout RS-10', routeId: 'route-safari-beta', batteryPct: 82, readiness: 'ready', chargerId: null, seats: 10, occupiedSeats: 2, lastReadingAt: now - 55_000 },
    { id: 'veh-ev-06', model: 'Ridge Scout RS-10', routeId: 'route-safari-beta', batteryPct: 61, readiness: 'charging', chargerId: 'charger-hub-b', seats: 10, occupiedSeats: 0, lastReadingAt: now - 35_000 },
  ]
}

function chargers(now: number): Charger[] {
  return [
    { id: 'charger-hub-a', available: false, powered: true, lastReadingAt: now - 60_000 },
    { id: 'charger-hub-b', available: false, powered: true, lastReadingAt: now - 90_000 },
    { id: 'charger-hub-c', available: true, powered: true, lastReadingAt: now - 120_000 },
  ]
}

function infrastructure(now: number): Infrastructure[] {
  return [
    {
      id: 'infra-power-north',
      name: 'North Grid Feeder',
      kind: 'power',
      status: 'normal',
      supports: ['enc-apex-paddock', 'enc-raptor-hold', 'charger-hub-a'],
      lastReadingAt: now - 60_000,
    },
    {
      id: 'infra-power-central',
      name: 'Central Grid Feeder',
      kind: 'power',
      status: 'normal',
      supports: ['enc-trihorn-valley', 'enc-gentle-giants', 'enc-spitter-glen', 'charger-hub-b', 'charger-hub-c'],
      lastReadingAt: now - 60_000,
    },
    {
      id: 'infra-weather-main',
      name: 'Main Weather Station',
      kind: 'weather',
      status: 'normal',
      supports: ['enc-apex-paddock', 'enc-gentle-giants', 'attr-plains-overlook'],
      lastReadingAt: now - 30_000,
    },
    {
      id: 'infra-network-ops',
      name: 'Ops Network Core',
      kind: 'network',
      status: 'normal',
      supports: ['enc-apex-paddock', 'enc-raptor-hold', 'enc-trihorn-valley', 'enc-gentle-giants', 'enc-spitter-glen'],
      lastReadingAt: now - 45_000,
    },
  ]
}

function lab(now: number): LabState {
  return {
    incubators: [
      {
        id: 'inc-01',
        name: 'Incubator Bay 1',
        speciesId: 'species-velociraptor',
        expectedHatchAt: now + 12 * DAY_MS,
        tempC: 29,
        humidityPct: 68,
        tempRangeC: { min: 27, max: 32 },
        humidityRangePct: { min: 60, max: 75 },
        door: 'open',
        powered: true,
        eggs: [
          {
            id: 'egg-raptor-1',
            speciesId: 'species-velociraptor',
            weightG: 920,
            weightRangeG: { min: 850, max: 1_050 },
          },
          {
            id: 'egg-raptor-2',
            speciesId: 'species-velociraptor',
            weightG: 980,
            weightRangeG: { min: 850, max: 1_050 },
          },
        ],
        lastReadingAt: now - 90_000,
      },
      {
        id: 'inc-02',
        name: 'Incubator Bay 2',
        speciesId: 'species-triceratops',
        expectedHatchAt: now + 21 * DAY_MS,
        tempC: 25,
        humidityPct: 55,
        tempRangeC: { min: 22, max: 28 },
        humidityRangePct: { min: 45, max: 65 },
        door: 'closed',
        powered: true,
        eggs: [
          {
            id: 'egg-tri-1',
            speciesId: 'species-triceratops',
            // Well below range so tick jitter cannot heal it.
            weightG: 400,
            weightRangeG: { min: 1_800, max: 2_200 },
          },
          {
            id: 'egg-tri-2',
            speciesId: 'species-triceratops',
            weightG: 2_010,
            weightRangeG: { min: 1_800, max: 2_200 },
          },
        ],
        lastReadingAt: now - 2 * 60_000,
      },
      {
        id: 'inc-03',
        name: 'Incubator Bay 3',
        speciesId: 'species-gallimimus',
        expectedHatchAt: now + 35 * DAY_MS,
        tempC: 28,
        humidityPct: 62,
        tempRangeC: { min: 25, max: 31 },
        humidityRangePct: { min: 50, max: 70 },
        door: 'closed',
        powered: true,
        eggs: [
          {
            id: 'egg-galli-1',
            speciesId: 'species-gallimimus',
            weightG: 540,
            weightRangeG: { min: 480, max: 620 },
          },
        ],
        lastReadingAt: now - 75_000,
      },
      {
        id: 'inc-04',
        name: 'Incubator Bay 4',
        speciesId: 'species-dilophosaurus',
        expectedHatchAt: now + 18 * DAY_MS,
        tempC: 30,
        humidityPct: 70,
        tempRangeC: { min: 26, max: 34 },
        humidityRangePct: { min: 55, max: 80 },
        door: 'closed',
        powered: true,
        eggs: [
          {
            id: 'egg-dilo-1',
            speciesId: 'species-dilophosaurus',
            weightG: 710,
            weightRangeG: { min: 650, max: 800 },
          },
          {
            id: 'egg-dilo-2',
            speciesId: 'species-dilophosaurus',
            weightG: 740,
            weightRangeG: { min: 650, max: 800 },
          },
        ],
        lastReadingAt: now - 2 * 60_000,
      },
    ],
    machines: [
      {
        id: 'lab-cold-storage',
        name: 'Specimen cold storage',
        kind: 'cold-storage',
        tempC: 4,
        tempRangeC: { min: 1, max: 6 },
        powered: true,
        lastReadingAt: now - 90_000,
      },
      {
        id: 'lab-freezer',
        name: 'Sample freezer',
        kind: 'freezer',
        tempC: -18,
        tempRangeC: { min: -25, max: -15 },
        powered: true,
        lastReadingAt: now - 2 * 60_000,
      },
      {
        id: 'lab-airlock',
        name: 'Lab airlock',
        kind: 'airlock',
        tempC: null,
        tempRangeC: null,
        powered: true,
        lastReadingAt: now - 60_000,
      },
    ],
  }
}

function incidents(now: number): Incident[] {
  return [
    {
      id: 'inc-queue-plains',
      severity: 'warning',
      title: 'Elevated queue at Plains Overlook',
      description: 'Guest wait time is trending above typical midday levels. No service interruption.',
      assetIds: ['attr-plains-overlook'],
      affectedAttractionIds: ['attr-plains-overlook'],
      affectedRouteIds: [],
      openedAt: now - 25 * 60_000,
      active: true,
    },
    {
      id: 'inc-lab-door',
      severity: 'warning',
      title: 'Incubator door open',
      description: 'Incubator Bay 1 reports an open door. Security and climate risk until secured.',
      assetIds: ['inc-01'],
      affectedAttractionIds: [],
      affectedRouteIds: [],
      openedAt: now - 12 * 60_000,
      active: true,
    },
    {
      id: 'inc-lab-weight',
      severity: 'warning',
      title: 'Egg weight outside range',
      description: 'An egg in Incubator Bay 2 is below the required weight band.',
      assetIds: ['inc-02'],
      affectedAttractionIds: [],
      affectedRouteIds: [],
      openedAt: now - 18 * 60_000,
      active: true,
    },
    {
      id: 'inc-fleet-uncovered',
      severity: 'warning',
      title: 'Safari departure uncovered',
      description: 'An upcoming departure is assigned to a vehicle that is not ready to roll.',
      assetIds: ['veh-ev-03', 'route-safari-alpha'],
      affectedAttractionIds: [],
      affectedRouteIds: ['route-safari-alpha'],
      openedAt: now - 8 * 60_000,
      active: true,
    },
  ]
}

function seedOverviewHistory(longestWait: number) {
  const start = Math.max(0, longestWait - 6)
  return Array.from({ length: 8 }, (_, i) => ({
    t: i,
    values: {
      criticalIncidents: 0,
      longestWaitMinutes: Math.round(start + ((longestWait - start) * i) / 7),
      animalsNeedingAttention: 0,
    },
  }))
}

export function createSeedPark(): ParkModel {
  const now = SEED_NOW
  const attractionList = attractions()
  const openWaits = attractionList.filter((a) => a.status !== 'closed').map((a) => a.waitMinutes)
  const longestWait = openWaits.length === 0 ? 0 : Math.max(...openWaits)
  return {
    tick: 0,
    seededAt: now,
    scenario: 'normal',
    paused: false,
    species: speciesCatalog(),
    dinosaurs: dinosaurs(),
    enclosures: enclosures(now),
    attractions: attractionList,
    safariRoutes: safariRoutes(now),
    vehicles: vehicles(now),
    chargers: chargers(now),
    lab: lab(now),
    infrastructure: infrastructure(now),
    weather: { condition: 'clear', severity: 0 },
    incidents: incidents(now),
    guestsInPark: 2_847,
    feedback: [
      {
        id: 'fb-01',
        rating: 4,
        summary: 'Raptor Encounter was thrilling and well staffed.',
        responseCount: 12,
        createdAt: now - 3 * HOUR_MS,
        attractionId: 'attr-raptor-encounter',
      },
      {
        id: 'fb-02',
        rating: 5,
        summary: 'Savanna Safari Alpha — excellent guides.',
        responseCount: 8,
        createdAt: now - 5 * HOUR_MS,
        routeId: 'route-safari-alpha',
      },
    ],
    readingHistory: { [PARK_OVERVIEW_SERIES]: seedOverviewHistory(longestWait) },
  }
}
