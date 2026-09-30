import { describe, expect, it } from 'vitest'
import { createSeedPark } from '../data/seed'
import { isReadingStale } from '../model/status'
import { DEFAULT_CONFIG } from '../state/defaults'
import { applyScenario } from './scenario'

describe('applyScenario stormOutage', () => {
  it('cascades power → fence/chargers/safari and opens critical incidents', () => {
    const base = createSeedPark()
    const storm = applyScenario(base, 'stormOutage', DEFAULT_CONFIG)
    expect(storm.weather.condition).toBe('storm')
    expect(storm.infrastructure.some((i) => i.kind === 'power' && i.status === 'critical')).toBe(true)
    expect(storm.enclosures.some((e) => e.fenceVoltage !== null && e.fenceVoltage < DEFAULT_CONFIG.fenceVoltageMin)).toBe(
      true,
    )
    expect(storm.chargers.some((c) => !c.powered)).toBe(true)
    expect(storm.safariRoutes.some((r) => r.status === 'delayed' || r.status === 'cancelled')).toBe(true)
    expect(storm.incidents.some((i) => i.active && i.severity === 'critical')).toBe(true)
    expect(storm.attractions.some((a) => a.waitMinutes >= DEFAULT_CONFIG.queueWarnMin)).toBe(true)
  })

  it('cold storage warning uses a fresh reading (not warning+stale)', () => {
    const base = createSeedPark()
    const storm = applyScenario(base, 'stormOutage', DEFAULT_CONFIG)
    const cs = storm.lab.coldStorage
    const stale = isReadingStale(cs.lastReadingAt, storm.seededAt, DEFAULT_CONFIG.staleThresholdSec)
    expect(cs.status).toBe('warning')
    expect(stale).toBe(false)
    expect(cs.status === 'warning' && stale).toBe(false)
  })
})

describe('applyScenario normal', () => {
  it('restores healthy baseline while keeping dinosaur placement', () => {
    const base = createSeedPark()
    const storm = applyScenario(base, 'stormOutage', DEFAULT_CONFIG)
    const moved = {
      ...storm,
      dinosaurs: storm.dinosaurs.map((d, i) =>
        i === 0 ? { ...d, enclosureId: storm.enclosures[1]!.id } : d,
      ),
    }
    const restored = applyScenario(moved, 'normal', DEFAULT_CONFIG)
    expect(restored.weather.condition).toBe('clear')
    expect(restored.enclosures.every((e) => e.fenceVoltage !== null && e.fenceVoltage >= DEFAULT_CONFIG.fenceVoltageMin)).toBe(
      true,
    )
    expect(restored.dinosaurs[0]?.enclosureId).toBe(moved.dinosaurs[0]?.enclosureId)
  })
})
