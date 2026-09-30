import { describe, expect, it } from 'vitest'
import { createSeedPark, SEED_NOW } from '../data/seed'
import { DEFAULT_CONFIG } from '../state/defaults'
import { advanceTick } from './tick'

describe('advanceTick', () => {
  it('does not change tick when paused', () => {
    const park = createSeedPark()
    const config = { ...DEFAULT_CONFIG, paused: true }
    const next = advanceTick(park, config, SEED_NOW + 60_000)
    expect(next.tick).toBe(park.tick)
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
