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
      map: { x: 2, y: 1, w: 3, h: 2 },
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
      map: { x: 6, y: 2, w: 2, h: 2 },
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
      map: { x: 4, y: 4, w: 3, h: 2 },
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
      map: { x: 3, y: 7, w: 4, h: 2 },
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
      map: { x: 1, y: 5, w: 2, h: 2 },
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
      name: 'T. rex Kingdom',
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
        { id: 'dep-alpha-1', departsAt: dep1, vehicleId: 'veh-ev-01', seats: 12, occupied: 9 },
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

function vehicles(): Vehicle[] {
  return [
    { id: 'veh-ev-01', routeId: 'route-safari-alpha', batteryPct: 88, readiness: 'ready', chargerId: null, seats: 12, occupiedSeats: 9 },
    { id: 'veh-ev-02', routeId: 'route-safari-alpha', batteryPct: 76, readiness: 'ready', chargerId: null, seats: 12, occupiedSeats: 4 },
    { id: 'veh-ev-03', routeId: 'route-safari-alpha', batteryPct: 54, readiness: 'charging', chargerId: 'charger-hub-a', seats: 12, occupiedSeats: 0 },
    { id: 'veh-ev-04', routeId: 'route-safari-beta', batteryPct: 91, readiness: 'ready', chargerId: null, seats: 10, occupiedSeats: 7 },
    { id: 'veh-ev-05', routeId: 'route-safari-beta', batteryPct: 82, readiness: 'ready', chargerId: null, seats: 10, occupiedSeats: 2 },
    { id: 'veh-ev-06', routeId: 'route-safari-beta', batteryPct: 61, readiness: 'charging', chargerId: 'charger-hub-b', seats: 10, occupiedSeats: 0 },
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
        speciesId: 'species-velociraptor',
        expectedHatchAt: now + 12 * DAY_MS,
        tempC: 29,
        humidityPct: 68,
        status: 'normal',
      },
      {
        id: 'inc-02',
        speciesId: 'species-triceratops',
        expectedHatchAt: now + 21 * DAY_MS,
        tempC: 25,
        humidityPct: 55,
        status: 'normal',
      },
    ],
    coldStorage: { tempC: 4, status: 'normal', lastReadingAt: now - 8 * 60_000 },
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
  ]
}

export function createSeedPark(): ParkModel {
  const now = SEED_NOW
  return {
    tick: 0,
    seededAt: now,
    scenario: 'normal',
    paused: false,
    species: speciesCatalog(),
    dinosaurs: dinosaurs(),
    enclosures: enclosures(now),
    attractions: attractions(),
    safariRoutes: safariRoutes(now),
    vehicles: vehicles(),
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
    readingHistory: {},
  }
}
