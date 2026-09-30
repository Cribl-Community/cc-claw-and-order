import { describe, expect, it } from 'vitest'
import { createSeedPark } from '../data/seed'
import { assessCompatibility } from './assess'

describe('assessCompatibility', () => {
  it('marks carnivore+herbivore prey conflict as incompatible', () => {
    const park = createSeedPark()
    const result = assessCompatibility({
      park,
      speciesIds: ['species-tyrannosaurus', 'species-triceratops'],
      dinosaurIds: [],
      targetEnclosureId: 'enc-spitter-glen',
    })
    expect(result.verdict).toBe('incompatible')
    expect(result.reasons.some((r) => /prey|predator|predation/i.test(r))).toBe(true)
    expect(result.impact.targetEnclosureId).toBe('enc-spitter-glen')
  })

  it('marks overlapping env + capacity OK as compatible', () => {
    const park = createSeedPark()
    // Gallimimus Scout already lives with brachiosaurs in Gentle Giants (env + capacity OK).
    const result = assessCompatibility({
      park,
      speciesIds: ['species-gallimimus'],
      dinosaurIds: ['dino-scout'],
      targetEnclosureId: 'enc-gentle-giants',
    })
    expect(result.verdict).toBe('compatible')
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.conditions).toEqual([])
    expect(result.impact.targetEnclosureId).toBe('enc-gentle-giants')
    expect(result.impact.attractionIds).toContain('attr-plains-overlook')
  })

  it('marks missing humidity on enclosure as insufficientData', () => {
    const park = createSeedPark()
    const target = park.enclosures.find((e) => e.id === 'enc-gentle-giants')
    expect(target).toBeDefined()
    target!.humidityPct = null

    const result = assessCompatibility({
      park,
      speciesIds: ['species-brachiosaurus'],
      dinosaurIds: [],
      targetEnclosureId: 'enc-gentle-giants',
    })
    expect(result.verdict).toBe('insufficientData')
    expect(result.reasons.some((r) => /humidity/i.test(r))).toBe(true)
  })

  it('marks capacity exceeded as incompatible', () => {
    const park = createSeedPark()
    const target = park.enclosures.find((e) => e.id === 'enc-gentle-giants')
    expect(target).toBeDefined()
    // Occupancy is already 3 (2 brachio + Scout); shrink capacity so adding Sarah exceeds it.
    target!.capacity = 3

    const result = assessCompatibility({
      park,
      speciesIds: [],
      dinosaurIds: ['dino-sarah'],
      targetEnclosureId: 'enc-gentle-giants',
    })
    expect(result.verdict).toBe('incompatible')
    expect(result.reasons.some((r) => /capacity/i.test(r))).toBe(true)
    expect(result.impact.sourceEnclosureIds).toContain('enc-trihorn-valley')
  })

  it('marks behavior tags requiring separation as conditional with conditions', () => {
    const park = createSeedPark()
    // Dilophosaurus (ambush) into raptor hold — no prey link, env OK, capacity OK.
    const result = assessCompatibility({
      park,
      speciesIds: [],
      dinosaurIds: ['dino-ned'],
      targetEnclosureId: 'enc-raptor-hold',
    })
    expect(result.verdict).toBe('conditional')
    expect(result.conditions.length).toBeGreaterThan(0)
    expect(result.conditions.some((c) => /separat/i.test(c))).toBe(true)
  })
})
