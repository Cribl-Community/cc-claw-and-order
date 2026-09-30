import type { Species } from '../model/types'

/** Tags that require physical separation when co-housed with other species. */
export const SEPARATION_REQUIRED_TAGS = ['solitary', 'apex-predator', 'ambush'] as const

export type SeparationTag = (typeof SEPARATION_REQUIRED_TAGS)[number]

export function hasSeparationTag(species: Species): SeparationTag | undefined {
  return SEPARATION_REQUIRED_TAGS.find((tag) => species.behaviorTags.includes(tag))
}

const SIZE_RANK = { S: 1, M: 2, L: 3, XL: 4 } as const

export function sizeRank(size: Species['sizeClass']): number {
  return SIZE_RANK[size]
}

/** Large (L/XL) and high threat (4+). These animals dominate an enclosure. */
export function isDominantThreat(species: Species): boolean {
  return sizeRank(species.sizeClass) >= 3 && species.inherentThreat >= 4
}

/**
 * Evasion exception: at least two size classes smaller, fast (agility ≥ 4),
 * and low threat (≤ 2). A medium runner can evade an extra-large apex; a
 * large or slow animal cannot.
 */
export function canEvade(animal: Species, dominant: Species): boolean {
  return (
    sizeRank(animal.sizeClass) <= sizeRank(dominant.sizeClass) - 2 &&
    animal.agility >= 4 &&
    animal.inherentThreat <= 2
  )
}

export type PairViability = 'ok' | 'evasion' | 'reject'

/** Cohabitation check from size, threat, and agility. */
export function pairViability(a: Species, b: Species): PairViability {
  if (a.id === b.id) return 'ok'
  const dominants = [a, b].filter(isDominantThreat)
  if (dominants.length === 2) return 'reject'
  if (dominants.length === 1) {
    const threat = dominants[0]!
    const other = threat === a ? b : a
    return canEvade(other, threat) ? 'evasion' : 'reject'
  }
  if (hasPredatorPreyConflict(a, b)) return 'reject'
  return 'ok'
}

export function viabilityReason(a: Species, b: Species, kind: Exclude<PairViability, 'ok'>): string {
  const dominant = isDominantThreat(a) ? a : isDominantThreat(b) ? b : null
  if (kind === 'evasion' && dominant) {
    const other = dominant === a ? b : a
    return `${other.displayName} can share with ${dominant.displayName} only because it is much smaller (size ${other.sizeClass} vs ${dominant.sizeClass}), fast (agility ${other.agility}), and low threat (${other.inherentThreat}).`
  }
  if (dominant) {
    const other = dominant === a ? b : a
    const prey = hasPredatorPreyConflict(a, b)
      ? ` Predator/prey conflict between ${a.displayName} and ${b.displayName}.`
      : ''
    return `${dominant.displayName} (size ${dominant.sizeClass}, threat ${dominant.inherentThreat}, agility ${dominant.agility}) cannot share with ${other.displayName} (size ${other.sizeClass}, threat ${other.inherentThreat}, agility ${other.agility}). Cohabitants must be much smaller, fast, and low threat.${prey}`
  }
  return `Predator/prey conflict between ${a.displayName} and ${b.displayName}.`
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
