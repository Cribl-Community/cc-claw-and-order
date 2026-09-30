import { describe, expect, it } from 'vitest'
import { createSeedPark } from './seed'

describe('createSeedPark', () => {
  it('creates compact consistent inventory', () => {
    const park = createSeedPark()
    expect(park.species.length).toBeGreaterThanOrEqual(5)
    expect(park.species.length).toBeLessThanOrEqual(6)
    expect(park.dinosaurs.length).toBeGreaterThanOrEqual(8)
    expect(park.dinosaurs.length).toBeLessThanOrEqual(10)
    expect(park.enclosures.length).toBeGreaterThanOrEqual(4)
    expect(park.enclosures.length).toBeLessThanOrEqual(5)
    expect(park.attractions.length).toBe(3)
    expect(park.safariRoutes.length).toBe(2)
    expect(park.vehicles.length).toBe(6)
    for (const d of park.dinosaurs) {
      expect(park.enclosures.some((e) => e.id === d.enclosureId)).toBe(true)
      expect(park.species.some((s) => s.id === d.speciesId)).toBe(true)
    }
  })
})
