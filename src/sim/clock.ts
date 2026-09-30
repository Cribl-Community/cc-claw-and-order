import type { ParkModel } from '../model/types'

/** Shift seeded timestamps so freshness is relative to `now`, not a fixed clock. */
export function anchorParkClock(park: ParkModel, now: number): ParkModel {
  const delta = now - park.seededAt
  if (delta === 0) return park
  const shift = (t: number) => t + delta

  return {
    ...park,
    seededAt: now,
    enclosures: park.enclosures.map((enc) => ({
      ...enc,
      lastReadingAt: shift(enc.lastReadingAt),
    })),
    chargers: park.chargers.map((charger) => ({
      ...charger,
      lastReadingAt: shift(charger.lastReadingAt),
    })),
    infrastructure: park.infrastructure.map((item) => ({
      ...item,
      lastReadingAt: shift(item.lastReadingAt),
    })),
    lab: {
      ...park.lab,
      incubators: park.lab.incubators.map((incubator) => ({
        ...incubator,
        expectedHatchAt: shift(incubator.expectedHatchAt),
      })),
      coldStorage: {
        ...park.lab.coldStorage,
        lastReadingAt: shift(park.lab.coldStorage.lastReadingAt),
      },
    },
    incidents: park.incidents.map((incident) => ({
      ...incident,
      openedAt: shift(incident.openedAt),
    })),
    feedback: park.feedback.map((item) => ({
      ...item,
      createdAt: shift(item.createdAt),
    })),
    safariRoutes: park.safariRoutes.map((route) => ({
      ...route,
      departures: route.departures.map((departure) => ({
        ...departure,
        departsAt: shift(departure.departsAt),
      })),
    })),
    readingHistory: Object.fromEntries(
      Object.entries(park.readingHistory).map(([id, samples]) => [
        id,
        samples.map((sample) => ({ ...sample, t: shift(sample.t) })),
      ]),
    ),
  }
}
