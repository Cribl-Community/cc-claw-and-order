import { describe, expect, it } from 'vitest'
import { createSeedPark, SEED_NOW } from '../data/seed'
import { isReadingStale } from '../model/status'
import { DEFAULT_CONFIG } from '../state/defaults'
import { applyScenario } from './scenario'
import { advanceTick } from './tick'

describe('advanceTick', () => {
  it('does not change tick when config.paused', () => {
    const park = createSeedPark()
    const config = { ...DEFAULT_CONFIG, paused: true }
    const next = advanceTick(park, config, SEED_NOW + 60_000)
    expect(next.tick).toBe(park.tick)
  })

  it('does not change tick when park.paused', () => {
    const park = { ...createSeedPark(), paused: true }
    const next = advanceTick(park, DEFAULT_CONFIG, SEED_NOW + 60_000)
    expect(next.tick).toBe(park.tick)
  })

  it('preserves stale enclosure readings across ticks', () => {
    const storm = applyScenario(createSeedPark(), 'stormOutage', DEFAULT_CONFIG)
    const staleEnc = storm.enclosures.find((e) => e.id === 'enc-raptor-hold')!
    expect(staleEnc.lastReadingAt).not.toBeNull()
    const next = advanceTick(storm, DEFAULT_CONFIG, SEED_NOW + 60_000)
    const after = next.enclosures.find((e) => e.id === 'enc-raptor-hold')!
    expect(after.lastReadingAt).toBe(staleEnc.lastReadingAt)
    expect(
      isReadingStale(after.lastReadingAt, SEED_NOW + 60_000, DEFAULT_CONFIG.staleThresholdSec),
    ).toBe(true)
  })

  it('increments tick and appends reading history when running', () => {
    const park = createSeedPark()
    const next = advanceTick(park, DEFAULT_CONFIG, SEED_NOW + 60_000)
    expect(next.tick).toBe(park.tick + 1)
    const encId = park.enclosures[0]!.id
    expect(next.readingHistory[encId]?.length).toBe(1)
  })

  it('caps reading history at 20 samples per asset', () => {
    let park = createSeedPark()
    for (let i = 0; i < 25; i++) {
      park = advanceTick(park, DEFAULT_CONFIG, SEED_NOW + (i + 1) * 60_000)
    }
    const encId = park.enclosures[0]!.id
    expect(park.readingHistory[encId]?.length).toBeLessThanOrEqual(20)
  })
})
