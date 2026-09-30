import { SelectField, Text, type Key } from '@capra/core'
import { useMemo, useState } from 'react'
import { emptyState, speciesIllustration, speciesSilhouette } from '../assets/art'
import {
  assessCompatibility,
  assessPair,
  type CompatResult,
  type CompatVerdict,
} from '../compatibility/assess'
import { PageFrame } from '../components/PageFrame'
import type { ParkModel, Species } from '../model/types'
import { usePark } from '../state/usePark'

const VERDICT_LABEL: Record<CompatVerdict, string> = {
  compatible: 'Compatible',
  conditional: 'Conditional',
  incompatible: 'Incompatible',
  insufficientData: 'Insufficient data',
}

const SIZE_LABEL: Record<Species['sizeClass'], string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  XL: 'Extra large',
}

function numClass(kind: 'threat' | 'agility', n: number): string {
  if (kind === 'threat') {
    if (n >= 4) return 'compat-num--bad'
    if (n === 3) return 'compat-num--warn'
    return 'compat-num--ok'
  }
  if (n >= 4) return 'compat-num--ok'
  if (n <= 2) return 'compat-num--bad'
  return 'compat-num--warn'
}

function SpeciesArt({ speciesId, name }: { speciesId: string; name: string }) {
  const illustration = speciesIllustration(speciesId)
  const silhouette = speciesSilhouette(speciesId)
  if (illustration) {
    return (
      <img className="compat-portrait__art" src={illustration} alt={name} data-art="illustration" />
    )
  }
  if (silhouette) {
    return (
      <img
        className="compat-portrait__art compat-portrait__art--mark"
        src={silhouette}
        alt=""
        data-art="silhouette"
      />
    )
  }
  return null
}

function AnimalPane({
  title,
  dinosaurId,
  excludeId,
  park,
  onChange,
}: {
  title: string
  dinosaurId: string | null
  excludeId: string | null
  park: ParkModel
  onChange: (id: string | null) => void
}) {
  const dino = park.dinosaurs.find((d) => d.id === dinosaurId) ?? null
  const species = dino ? (park.species.find((s) => s.id === dino.speciesId) ?? null) : null
  const items = park.dinosaurs
    .filter((d) => d.id !== excludeId)
    .map((d) => {
      const sp = park.species.find((s) => s.id === d.speciesId)
      return { id: d.id, label: sp ? `${d.name} · ${sp.displayName}` : d.name }
    })

  return (
    <section className="overview-panel overview-panel--brand compat-animal">
      <h2 className="overview-panel__title">{title}</h2>
      <div className="compat-portrait">
        {species ? (
          <SpeciesArt speciesId={species.id} name={species.displayName} />
        ) : (
          <Text variant="body-sm-normal" color="subtle">
            Select an animal
          </Text>
        )}
      </div>
      <SelectField
        label="Animal"
        placeholder="Select animal"
        items={items}
        value={dinosaurId}
        onChange={(key: Key | null) => onChange(key == null ? null : String(key))}
      />
      {species && dino ? (
        <>
          <p className="compat-animal__name">
            {speciesSilhouette(species.id) ? (
              <img
                className="compat-animal__mark"
                src={speciesSilhouette(species.id)}
                alt=""
                data-art="silhouette"
              />
            ) : null}
            {dino.name}
          </p>
          <p className="overview-panel__sub">{species.displayName}</p>
          <div className="compat-metrics">
            <div>
              <p className="compat-metrics__label">Threat</p>
              <p className={`compat-metrics__value ${numClass('threat', species.inherentThreat)}`}>
                {species.inherentThreat}
              </p>
            </div>
            <div>
              <p className="compat-metrics__label">Agility</p>
              <p className={`compat-metrics__value ${numClass('agility', species.agility)}`}>
                {species.agility}
              </p>
            </div>
          </div>
          <table className="compat-spec">
            <tbody>
              <tr>
                <th scope="row">Diet</th>
                <td>{species.diet}</td>
              </tr>
              <tr>
                <th scope="row">Size</th>
                <td>
                  {SIZE_LABEL[species.sizeClass]} ({species.sizeClass})
                </td>
              </tr>
              <tr>
                <th scope="row">Containment</th>
                <td>{species.containmentClass}</td>
              </tr>
              <tr>
                <th scope="row">Behavior</th>
                <td>{species.behaviorTags.join(', ')}</td>
              </tr>
              <tr>
                <th scope="row">Temperature</th>
                <td>
                  {species.tempRangeC.min}–{species.tempRangeC.max}°C
                </td>
              </tr>
              <tr>
                <th scope="row">Humidity</th>
                <td>
                  {species.humidityRangePct.min}–{species.humidityRangePct.max}%
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  )
}

export function CompatibilityPage() {
  const { park } = usePark()
  const [dinosaurA, setDinosaurA] = useState<string | null>(null)
  const [dinosaurB, setDinosaurB] = useState<string | null>(null)
  const [targetEnclosureId, setTargetEnclosureId] = useState<string | null>(null)

  const enclosureItems = useMemo(
    () => park.enclosures.map((e) => ({ id: e.id, label: `${e.name} (${e.zone})` })),
    [park.enclosures],
  )

  const result: CompatResult | null = useMemo(() => {
    const dinosaurIds = [dinosaurA, dinosaurB].filter((id): id is string => id != null)
    if (targetEnclosureId && dinosaurIds.length > 0) {
      return assessCompatibility({
        park,
        speciesIds: [],
        dinosaurIds,
        targetEnclosureId,
      })
    }
    if (dinosaurIds.length === 2) return assessPair(park, dinosaurIds)
    return null
  }, [dinosaurA, dinosaurB, park, targetEnclosureId])
  const unassessedArt = emptyState('compatibility-unassessed')
  const residents =
    targetEnclosureId == null
      ? []
      : park.dinosaurs.filter((d) => d.enclosureId === targetEnclosureId)

  return (
    <PageFrame title="Compatibility Planner">
      <div className="app-grid-span-12 compat-board">
        <AnimalPane
          title="Animal A"
          dinosaurId={dinosaurA}
          excludeId={dinosaurB}
          park={park}
          onChange={setDinosaurA}
        />

        <section className="overview-panel overview-panel--brand compat-verdict">
          <h2 className="overview-panel__title">Compatibility</h2>
          <SelectField
            label="Target enclosure"
            placeholder="Select enclosure"
            items={enclosureItems}
            value={targetEnclosureId}
            onChange={(key: Key | null) => setTargetEnclosureId(key == null ? null : String(key))}
          />
          {result == null ? (
            <div className="compat-empty">
              {unassessedArt ? (
                <img src={unassessedArt} alt="" data-art="empty-state" />
              ) : null}
              <Text variant="body-sm-normal" color="subtle">
                Pick two animals to compare size, threat, and agility. Add an enclosure to include
                the animals already housed there.
              </Text>
            </div>
          ) : (
            <VerdictBody
              result={result}
              residents={targetEnclosureId ? residents.map((d) => d.name) : null}
            />
          )}
        </section>

        <AnimalPane
          title="Animal B"
          dinosaurId={dinosaurB}
          excludeId={dinosaurA}
          park={park}
          onChange={setDinosaurB}
        />
      </div>
    </PageFrame>
  )
}

function VerdictBody({
  result,
  residents,
}: {
  result: CompatResult
  residents: string[] | null
}) {
  return (
    <div className="compat-verdict__body">
      <p className={`compat-verdict__word compat-verdict__word--${result.verdict}`}>
        {VERDICT_LABEL[result.verdict]}
      </p>
      <ul className="compat-result__list">
        {result.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
        {result.conditions.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <p className="overview-panel__sub">
        {residents
          ? `Residents included: ${residents.join(', ') || 'none'}. Assessment only — no transfer queued.`
          : 'Enclosure not selected. Assessment only — no transfer queued.'}
      </p>
    </div>
  )
}
