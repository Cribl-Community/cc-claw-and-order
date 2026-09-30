import { describe, expect, it } from 'vitest'
import { createSeedPark } from '../data/seed'
import { FLEET_BATTERY_MIN_PCT, isDepartureUncovered } from './fleet'
import { DEFAULT_CONFIG } from '../state/defaults'

describe('isDepartureUncovered', () => {
  const now = Date.parse('2026-09-30T17:00:00Z')

  it('marks charging vehicle as uncovered', () => {
    const park = createSeedPark()
    const vehicle = park.vehicles.find((v) => v.id === 'veh-ev-03')
    expect(vehicle?.readiness).toBe('charging')
    expect(
      isDepartureUncovered({ vehicleId: 'veh-ev-03' }, vehicle, now, DEFAULT_CONFIG.staleThresholdSec),
    ).toBe(true)
  })

  it('marks battery under 70% as uncovered even when ready', () => {
    const vehicle = {
      id: 'veh-x',
      model: 'Claw Coach CC-12',
      routeId: 'route-safari-alpha',
      batteryPct: FLEET_BATTERY_MIN_PCT - 1,
      readiness: 'ready' as const,
      chargerId: null,
      seats: 12,
      occupiedSeats: 0,
      lastReadingAt: now,
    }
    expect(
      isDepartureUncovered({ vehicleId: 'veh-x' }, vehicle, now, DEFAULT_CONFIG.staleThresholdSec),
    ).toBe(true)
  })

  it('marks stale reading as uncovered', () => {
    const vehicle = {
      id: 'veh-x',
      model: 'Claw Coach CC-12',
      routeId: 'route-safari-alpha',
      batteryPct: 90,
      readiness: 'ready' as const,
      chargerId: null,
      seats: 12,
      occupiedSeats: 0,
      lastReadingAt: now - (DEFAULT_CONFIG.staleThresholdSec + 10) * 1000,
    }
    expect(
      isDepartureUncovered({ vehicleId: 'veh-x' }, vehicle, now, DEFAULT_CONFIG.staleThresholdSec),
    ).toBe(true)
  })

  it('marks missing vehicle as uncovered', () => {
    expect(
      isDepartureUncovered(
        { vehicleId: 'veh-missing' },
        undefined,
        now,
        DEFAULT_CONFIG.staleThresholdSec,
      ),
    ).toBe(true)
  })

  it('covers a ready fresh vehicle with enough charge', () => {
    const vehicle = {
      id: 'veh-x',
      model: 'Claw Coach CC-12',
      routeId: 'route-safari-alpha',
      batteryPct: 88,
      readiness: 'ready' as const,
      chargerId: null,
      seats: 12,
      occupiedSeats: 0,
      lastReadingAt: now,
    }
    expect(
      isDepartureUncovered({ vehicleId: 'veh-x' }, vehicle, now, DEFAULT_CONFIG.staleThresholdSec),
    ).toBe(false)
  })
})
