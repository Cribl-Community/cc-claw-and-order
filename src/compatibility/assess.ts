import type { Dinosaur, Enclosure, ParkModel, Species } from '../model/types'
import {
  hasSeparationTag,
  pairViability,
  readingInRange,
  viabilityReason,
} from './rules'

export type CompatVerdict = 'compatible' | 'conditional' | 'incompatible' | 'insufficientData'

export interface CompatResult {
  verdict: CompatVerdict
  reasons: string[]
  conditions: string[]
  impact: {
    sourceEnclosureIds: string[]
    targetEnclosureId: string
    attractionIds: string[]
    summary: string
  }
}

/** Size, threat, and agility only. Does not check enclosure climate or capacity. */
export function assessPair(park: ParkModel, dinosaurIds: string[]): CompatResult {
  const selectedDinos = dinosaurIds
    .map((id) => park.dinosaurs.find((d) => d.id === id))
    .filter((d): d is Dinosaur => d != null)
  const speciesById = new Map(park.species.map((s) => [s.id, s]))
  const cohortSpecies = [...new Set(selectedDinos.map((d) => d.speciesId))]
    .map((id) => speciesById.get(id))
    .filter((s): s is Species => s != null)

  const reasons: string[] = []
  const conditions: string[] = []
  collectPairFindings(cohortSpecies, reasons, conditions)

  let verdict: CompatVerdict = 'compatible'
  if (reasons.length > 0) verdict = 'incompatible'
  else if (conditions.length > 0) verdict = 'conditional'
  else {
    reasons.push(
      'Size, threat, and agility allow these animals to share. Pick an enclosure to check climate, capacity, and current residents.',
    )
  }

  const names = selectedDinos.map((d) => d.name).join(' and ') || 'selection'
  return {
    verdict,
    reasons,
    conditions,
    impact: {
      sourceEnclosureIds: [...new Set(selectedDinos.map((d) => d.enclosureId))],
      targetEnclosureId: '',
      attractionIds: [],
      summary: `Pair comparison for ${names}. Enclosure not selected. Assessment only — no transfer queued.`,
    },
  }
}

function collectPairFindings(cohortSpecies: Species[], reasons: string[], conditions: string[]) {
  for (let i = 0; i < cohortSpecies.length; i++) {
    for (let j = i + 1; j < cohortSpecies.length; j++) {
      const a = cohortSpecies[i]!
      const b = cohortSpecies[j]!
      const kind = pairViability(a, b)
      if (kind === 'ok') continue
      const line = viabilityReason(a, b, kind)
      if (kind === 'reject') reasons.push(line)
      else conditions.push(line)
    }
  }
}

export function assessCompatibility(input: {
  park: ParkModel
  speciesIds: string[]
  dinosaurIds: string[]
  targetEnclosureId: string
}): CompatResult {
  const { park, speciesIds, dinosaurIds, targetEnclosureId } = input
  const reasons: string[] = []
  const conditions: string[] = []

  const target = park.enclosures.find((e) => e.id === targetEnclosureId)
  const selectedDinos = dinosaurIds
    .map((id) => park.dinosaurs.find((d) => d.id === id))
    .filter((d): d is Dinosaur => d != null)

  const sourceEnclosureIds = [
    ...new Set(selectedDinos.map((d) => d.enclosureId).filter((id) => id !== targetEnclosureId)),
  ]

  const attractionIds = target
    ? [...new Set([...target.attractionIds, ...attractionsForEnclosures(park, sourceEnclosureIds)])]
    : []

  const impactBase = {
    sourceEnclosureIds,
    targetEnclosureId,
    attractionIds,
  }

  if (!target) {
    return {
      verdict: 'insufficientData',
      reasons: [`Target enclosure "${targetEnclosureId}" was not found.`],
      conditions: [],
      impact: {
        ...impactBase,
        summary: 'Cannot assess — unknown target enclosure.',
      },
    }
  }

  const speciesById = new Map(park.species.map((s) => [s.id, s]))
  const residents = park.dinosaurs.filter((d) => d.enclosureId === targetEnclosureId)
  const incoming = selectedDinos.filter((d) => d.enclosureId !== targetEnclosureId)

  const cohortSpeciesIds = new Set<string>()
  for (const id of speciesIds) cohortSpeciesIds.add(id)
  for (const d of residents) cohortSpeciesIds.add(d.speciesId)
  for (const d of selectedDinos) cohortSpeciesIds.add(d.speciesId)

  const cohortSpecies = [...cohortSpeciesIds]
    .map((id) => speciesById.get(id))
    .filter((s): s is Species => s != null)

  // --- Size, threat, agility, then remaining predator/prey ---
  collectPairFindings(cohortSpecies, reasons, conditions)
  if (reasons.length > 0) {
    return finish('incompatible', reasons, conditions, impactBase, target, selectedDinos)
  }

  // --- Capacity ---
  const plannedOccupancy = residents.length + incoming.length
  // Species-only selections (no matching dino already counted) count as +1 planned slot each.
  const representedSpecies = new Set([
    ...residents.map((d) => d.speciesId),
    ...selectedDinos.map((d) => d.speciesId),
  ])
  let virtualAdds = 0
  for (const sid of speciesIds) {
    if (!representedSpecies.has(sid)) {
      virtualAdds += 1
      representedSpecies.add(sid)
    }
  }
  const totalPlanned = plannedOccupancy + virtualAdds
  if (totalPlanned > target.capacity) {
    reasons.push(
      `Proposed occupancy ${totalPlanned} exceeds enclosure capacity ${target.capacity}.`,
    )
    return finish('incompatible', reasons, conditions, impactBase, target, selectedDinos)
  }

  // --- maxGroupSize per species ---
  const countBySpecies = new Map<string, number>()
  for (const d of residents) {
    countBySpecies.set(d.speciesId, (countBySpecies.get(d.speciesId) ?? 0) + 1)
  }
  for (const d of incoming) {
    countBySpecies.set(d.speciesId, (countBySpecies.get(d.speciesId) ?? 0) + 1)
  }
  for (const sid of speciesIds) {
    if (!countBySpecies.has(sid)) countBySpecies.set(sid, 1)
  }
  for (const [sid, count] of countBySpecies) {
    const sp = speciesById.get(sid)
    if (sp && count > sp.maxGroupSize) {
      reasons.push(
        `${sp.displayName} planned count ${count} exceeds max group size ${sp.maxGroupSize}.`,
      )
    }
  }
  if (reasons.length > 0) {
    return finish('incompatible', reasons, conditions, impactBase, target, selectedDinos)
  }

  // --- Env data sufficiency ---
  if (target.tempC == null) {
    reasons.push('Target enclosure is missing temperature reading.')
    return finish('insufficientData', reasons, conditions, impactBase, target, selectedDinos)
  }
  if (target.humidityPct == null) {
    reasons.push('Target enclosure is missing humidity reading.')
    return finish('insufficientData', reasons, conditions, impactBase, target, selectedDinos)
  }

  // --- Env overlap with enclosure readings ---
  for (const sp of cohortSpecies) {
    if (!readingInRange(target.tempC, sp.tempRangeC)) {
      reasons.push(
        `${sp.displayName} temp range ${sp.tempRangeC.min}–${sp.tempRangeC.max}°C does not include enclosure ${formatReading(target.tempC)}°C.`,
      )
    }
    if (!readingInRange(target.humidityPct, sp.humidityRangePct)) {
      reasons.push(
        `${sp.displayName} humidity range ${sp.humidityRangePct.min}–${sp.humidityRangePct.max}% does not include enclosure ${formatReading(target.humidityPct)}%.`,
      )
    }
  }
  if (reasons.length > 0) {
    return finish('incompatible', reasons, conditions, impactBase, target, selectedDinos)
  }

  // --- Behavior separation (conditional) ---
  const distinctSpecies = cohortSpecies.length
  const totalAnimals = Math.max(totalPlanned, residents.length + incoming.length)
  for (const sp of cohortSpecies) {
    const tag = hasSeparationTag(sp)
    if (!tag) continue
    const needsSeparation =
      distinctSpecies > 1 || (tag === 'solitary' && totalAnimals > 1)
    if (needsSeparation) {
      conditions.push(
        `Separate ${sp.displayName} (${tag}) from co-housed animals with physical barriers and monitoring.`,
      )
    }
  }
  if (conditions.length > 0) {
    reasons.push('Behavior tags require physical separation and monitoring before co-housing.')
    return finish('conditional', reasons, conditions, impactBase, target, selectedDinos)
  }

  reasons.push(
    `Environment and capacity are within limits for ${cohortSpecies.map((s) => s.displayName).join(', ') || 'selection'} in ${target.name}.`,
  )
  return finish('compatible', reasons, conditions, impactBase, target, selectedDinos)
}

function attractionsForEnclosures(park: ParkModel, enclosureIds: string[]): string[] {
  const ids: string[] = []
  for (const eid of enclosureIds) {
    const enc = park.enclosures.find((e) => e.id === eid)
    if (enc) ids.push(...enc.attractionIds)
  }
  return ids
}

function formatReading(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function finish(
  verdict: CompatVerdict,
  reasons: string[],
  conditions: string[],
  impactBase: {
    sourceEnclosureIds: string[]
    targetEnclosureId: string
    attractionIds: string[]
  },
  target: Enclosure,
  selectedDinos: Dinosaur[],
): CompatResult {
  const moveLabel =
    selectedDinos.length > 0
      ? selectedDinos.map((d) => d.name).join(', ')
      : 'selected species'
  const sourceLabel =
    impactBase.sourceEnclosureIds.length > 0
      ? impactBase.sourceEnclosureIds.join(', ')
      : 'none'
  const attrLabel =
    impactBase.attractionIds.length > 0
      ? impactBase.attractionIds.join(', ')
      : 'none'
  const summary = `Assessing ${moveLabel} → ${target.name} (${target.id}). Source enclosure(s): ${sourceLabel}. Linked attractions: ${attrLabel}. Assessment only — no transfer queued.`

  return {
    verdict,
    reasons,
    conditions,
    impact: { ...impactBase, summary },
  }
}
