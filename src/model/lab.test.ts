import { describe, expect, it } from 'vitest'
import { createSeedPark } from '../data/seed'
import { advanceTick } from '../sim/tick'
import { applyScenario } from '../sim/scenario'
import { DEFAULT_CONFIG } from '../state/defaults'
import {
  anyDoorOpen,
  anyEggOutOfWeight,
  incubatorInBounds,
  incubatorOperationalStatus,
} from './lab'

describe('lab bounds', () => {
  it('seeds an open door and out-of-range egg weight', () => {
    const park = createSeedPark()
    expect(anyDoorOpen(park)).toBe(true)
    expect(anyEggOutOfWeight(park)).toBe(true)
    expect(park.lab.incubators).toHaveLength(4)
    expect(park.lab.machines).toHaveLength(3)
  })

  it('marks null temperature as unknown and not in bounds', () => {
    const park = createSeedPark()
    const inc = { ...park.lab.incubators[2]!, tempC: null, door: 'closed' as const }
    expect(incubatorInBounds(inc, park.seededAt, DEFAULT_CONFIG.staleThresholdSec)).toBe(false)
    expect(incubatorOperationalStatus(inc, park.seededAt, DEFAULT_CONFIG.staleThresholdSec)).toBe(
      'unknown',
    )
  })

  it('keeps door and weight incidents active after ack overlay exists', () => {
    const park = createSeedPark()
    const door = park.incidents.find((i) => i.id === 'inc-lab-door')
    const weight = park.incidents.find((i) => i.id === 'inc-lab-weight')
    expect(door?.active).toBe(true)
    expect(weight?.active).toBe(true)
  })

  it('tick does not close a door or heal out-of-range weight', () => {
    const park = createSeedPark()
    const next = advanceTick({ ...park, paused: false }, { ...DEFAULT_CONFIG, paused: false }, park.seededAt)
    const open = next.lab.incubators.find((i) => i.id === 'inc-01')
    expect(open?.door).toBe('open')
    const heavy = next.lab.incubators
      .find((i) => i.id === 'inc-02')
      ?.eggs.find((e) => e.id === 'egg-tri-1')
    expect(heavy?.weightG).toBeLessThan(heavy!.weightRangeG.min)
  })

  it('storm unpowers lab machines without clearing door or weight', () => {
    const park = createSeedPark()
    const storm = applyScenario(park, 'stormOutage', DEFAULT_CONFIG)
    expect(storm.lab.machines.every((m) => !m.powered)).toBe(true)
    expect(anyDoorOpen(storm)).toBe(true)
    expect(anyEggOutOfWeight(storm)).toBe(true)
  })
})
