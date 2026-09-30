import type { Species } from '../model/types'

/** Fictional simulation: tags that require physical separation when co-housed with other species. */
export const SEPARATION_REQUIRED_TAGS = ['solitary', 'apex-predator', 'ambush'] as const

export type SeparationTag = (typeof SEPARATION_REQUIRED_TAGS)[number]

export function hasSeparationTag(species: Species): SeparationTag | undefined {
  return SEPARATION_REQUIRED_TAGS.find((tag) => species.behaviorTags.includes(tag))
}

/** True when A lists B as prey or B lists A as a predator (directed edges either way). */
export function hasPredatorPreyConflict(a: Species, b: Species): boolean {
  if (a.id === b.id) return false
  return (
    a.predatorOf.includes(b.id) ||
    b.predatorOf.includes(a.id) ||
    a.preyOf.includes(b.id) ||
    b.preyOf.includes(a.id)
  )
}

export function rangesOverlap(
  a: { min: number; max: number },
  b: { min: number; max: number },
): boolean {
  return a.min <= b.max && b.min <= a.max
}

export function readingInRange(
  value: number,
  range: { min: number; max: number },
): boolean {
  return value >= range.min && value <= range.max
}

/** Intersection of species env ranges; null if empty. */
export function intersectRanges(
  ranges: { min: number; max: number }[],
): { min: number; max: number } | null {
  if (ranges.length === 0) return null
  const min = Math.max(...ranges.map((r) => r.min))
  const max = Math.min(...ranges.map((r) => r.max))
  if (min > max) return null
  return { min, max }
}
