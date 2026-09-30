export type Diet = 'carnivore' | 'herbivore' | 'omnivore'
export type ScenarioId = 'normal' | 'stormOutage'
export type OperationalStatus = 'normal' | 'warning' | 'critical' | 'unknown'

export interface Species {
  id: string
  displayName: string
  diet: Diet
  inherentThreat: 1 | 2 | 3 | 4 | 5
  /** 1 slow … 5 fast. Used for enclosure evasion, not a measured reading. */
  agility: 1 | 2 | 3 | 4 | 5
  sizeClass: 'S' | 'M' | 'L' | 'XL'
  behaviorTags: string[]
  tempRangeC: { min: number; max: number }
  humidityRangePct: { min: number; max: number }
  containmentClass: 1 | 2 | 3 | 4 | 5
  maxGroupSize: number
  preyOf: string[]
  predatorOf: string[]
}

export interface Dinosaur {
  id: string
  name: string
  speciesId: string
  enclosureId: string
  sex: 'F' | 'M' | 'U'
  welfareStatus: OperationalStatus
}

export interface Enclosure {
  id: string
  name: string
  zone: string
  capacity: number
  map: { x: number; y: number; w: number; h: number }
  attractionIds: string[]
  tempC: number | null
  humidityPct: number | null
  fenceVoltage: number | null
  gateStatus: 'secured' | 'open' | 'fault' | 'unknown'
  lastReadingAt: number
  supportedBy: string[]
}

export interface Attraction {
  id: string
  name: string
  enclosureIds: string[]
  status: OperationalStatus | 'closed'
  queueLength: number
  waitMinutes: number
  crowding: 'low' | 'moderate' | 'high' | 'unknown'
  zone: string
}

export interface SafariRoute {
  id: string
  name: string
  stopEnclosureIds: string[]
  status: 'running' | 'delayed' | 'cancelled' | 'unknown'
  departures: { id: string; departsAt: number; vehicleId: string; seats: number; occupied: number }[]
}

export interface Vehicle {
  id: string
  model: string
  routeId: string
  batteryPct: number | null
  readiness: 'ready' | 'charging' | 'maintenance' | 'offline' | 'unknown'
  chargerId: string | null
  seats: number
  occupiedSeats: number
  lastReadingAt: number
}

export interface Charger {
  id: string
  available: boolean
  powered: boolean
  lastReadingAt: number
}

export interface Egg {
  id: string
  speciesId: string
  weightG: number | null
  weightRangeG: { min: number; max: number }
}

export interface Incubator {
  id: string
  name: string
  speciesId: string
  expectedHatchAt: number
  tempC: number | null
  humidityPct: number | null
  tempRangeC: { min: number; max: number }
  humidityRangePct: { min: number; max: number }
  door: 'closed' | 'open' | 'unknown'
  powered: boolean
  eggs: Egg[]
  lastReadingAt: number
}

export interface LabMachine {
  id: string
  name: string
  kind: 'cold-storage' | 'freezer' | 'airlock'
  tempC: number | null
  tempRangeC: { min: number; max: number } | null
  powered: boolean
  lastReadingAt: number
}

export interface LabState {
  incubators: Incubator[]
  machines: LabMachine[]
}

export interface Infrastructure {
  id: string
  name: string
  kind: 'power' | 'weather' | 'network'
  status: OperationalStatus
  supports: string[]
  lastReadingAt: number
}

export interface WeatherState {
  condition: 'clear' | 'rain' | 'storm'
  severity: 0 | 1 | 2 | 3
}

export interface Incident {
  id: string
  severity: 'warning' | 'critical'
  title: string
  description: string
  assetIds: string[]
  affectedAttractionIds: string[]
  affectedRouteIds: string[]
  openedAt: number
  active: boolean
}

export interface GuestFeedback {
  id: string
  rating: 1 | 2 | 3 | 4 | 5
  summary: string
  responseCount: number
  createdAt: number
  attractionId?: string
  routeId?: string
}

export interface ParkModel {
  tick: number
  seededAt: number
  scenario: ScenarioId
  paused: boolean
  species: Species[]
  dinosaurs: Dinosaur[]
  enclosures: Enclosure[]
  attractions: Attraction[]
  safariRoutes: SafariRoute[]
  vehicles: Vehicle[]
  chargers: Charger[]
  lab: LabState
  infrastructure: Infrastructure[]
  weather: WeatherState
  incidents: Incident[]
  guestsInPark: number
  feedback: GuestFeedback[]
  readingHistory: Record<string, { t: number; values: Record<string, number | null> }[]>
}

export interface ConfigSettings {
  scenario: ScenarioId
  paused: boolean
  tickMs: number
  defaultLanding: '/' | '/enclosures' | '/compatibility' | '/services' | '/fleet' | '/lab' | '/settings'
  staleThresholdSec: number
  density: 'compact' | 'comfortable'
  guestCapacity: number
  queueWarnMin: number
  queueCritMin: number
  fenceVoltageMin: number
  hatchAlertDays: number
}

export interface OperatorState {
  acks: Record<string, { acknowledgedAt: number; by: string }>
  notes: Record<string, { text: string; updatedAt: number }>
}
