import {
  Alert,
  Button,
  Card,
  Checkbox,
  Label,
  Pill,
  SelectField,
  Text,
  type Key,
} from '@capra/core'
import { useMemo, useState } from 'react'
import {
  assessCompatibility,
  type CompatResult,
  type CompatVerdict,
} from '../compatibility/assess'
import { PageFrame } from '../components/PageFrame'
import { usePark } from '../state/usePark'

const VERDICT_PILL: Record<
  CompatVerdict,
  { label: string; appearance: 'success' | 'warning' | 'danger' | 'default' | 'info' }
> = {
  compatible: { label: 'Compatible', appearance: 'success' },
  conditional: { label: 'Conditional', appearance: 'warning' },
  incompatible: { label: 'Incompatible', appearance: 'danger' },
  insufficientData: { label: 'Insufficient data', appearance: 'info' },
}

function keysToStrings(keys: Iterable<Key>): string[] {
  return [...keys].map(String)
}

export function CompatibilityPage() {
  const { park } = usePark()
  const [speciesIds, setSpeciesIds] = useState<string[]>([])
  const [dinosaurIds, setDinosaurIds] = useState<string[]>([])
  const [targetEnclosureId, setTargetEnclosureId] = useState<string | null>(null)
  const [result, setResult] = useState<CompatResult | null>(null)

  const speciesItems = useMemo(
    () =>
      park.species.map((s) => ({
        id: s.id,
        label: `${s.displayName} (${s.diet})`,
      })),
    [park.species],
  )

  const enclosureItems = useMemo(
    () =>
      park.enclosures.map((e) => ({
        id: e.id,
        label: `${e.name} (${e.zone})`,
      })),
    [park.enclosures],
  )

  const canAssess =
    targetEnclosureId != null && (speciesIds.length > 0 || dinosaurIds.length > 0)

  function onAssess() {
    if (!targetEnclosureId) return
    setResult(
      assessCompatibility({
        park,
        speciesIds,
        dinosaurIds,
        targetEnclosureId,
      }),
    )
  }

  const verdictMeta = result ? VERDICT_PILL[result.verdict] : null

  return (
    <PageFrame title="Compatibility Planner">
      <div className="app-grid-span-12">
        <Alert appearance="info" title="Fictional simulation rules.">
          Compatibility verdicts are demo-only. Assess does not move inventory or change the
          park model.
        </Alert>
      </div>

      <div className="app-grid-span-6">
        <Card>
          <Card.Header>
            <Card.Title>Selection</Card.Title>
            <Card.Description>
              Choose species and/or dinosaurs, then a target enclosure.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="compat-form">
              <SelectField
                label="Species"
                placeholder="Select species"
                selectionMode="multiple"
                canSearch
                searchPlaceholder="Search species"
                items={speciesItems}
                value={speciesIds}
                onChange={(keys) => {
                  setSpeciesIds(keysToStrings(keys))
                  setResult(null)
                }}
              />

              <div className="compat-checkbox-block">
                <Label>Dinosaurs</Label>
                <div className="compat-checkbox-list" role="group" aria-label="Dinosaurs">
                  {park.dinosaurs.map((d) => {
                    const sp = park.species.find((s) => s.id === d.speciesId)
                    const checked = dinosaurIds.includes(d.id)
                    return (
                      <Checkbox
                        key={d.id}
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...dinosaurIds, d.id]
                            : dinosaurIds.filter((id) => id !== d.id)
                          setDinosaurIds(next)
                          setResult(null)
                        }}
                      >
                        {d.name}
                        {sp ? ` (${sp.displayName})` : ''}
                      </Checkbox>
                    )
                  })}
                </div>
              </div>

              <SelectField
                label="Target enclosure"
                placeholder="Select enclosure"
                items={enclosureItems}
                value={targetEnclosureId}
                onChange={(key) => {
                  setTargetEnclosureId(key == null ? null : String(key))
                  setResult(null)
                }}
              />

              <Button variant="primary" disabled={!canAssess} onClick={onAssess}>
                Assess
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>

      <div className="app-grid-span-6">
        <Card>
          <Card.Header>
            <Card.Title>Result</Card.Title>
            <Card.Description>Verdict, reasons, conditions, and impact.</Card.Description>
          </Card.Header>
          <Card.Content>
            {result == null || verdictMeta == null ? (
              <Text variant="body-sm-normal" color="subtle">
                Run Assess to see a fictional compatibility verdict. Nothing is applied to the
                park.
              </Text>
            ) : (
              <div className="compat-result">
                <div className="compat-result__verdict">
                  <Text variant="body-sm-semibold">Verdict</Text>
                  <Pill appearance={verdictMeta.appearance} variant="muted" inline>
                    {verdictMeta.label}
                  </Pill>
                </div>

                <div className="compat-result__block">
                  <Text variant="body-sm-semibold" as="h3">
                    Reasons
                  </Text>
                  <ul className="compat-result__list">
                    {result.reasons.map((r) => (
                      <li key={r}>
                        <Text variant="body-sm-normal">{r}</Text>
                      </li>
                    ))}
                  </ul>
                </div>

                {result.conditions.length > 0 ? (
                  <div className="compat-result__block">
                    <Text variant="body-sm-semibold" as="h3">
                      Conditions
                    </Text>
                    <ul className="compat-result__list">
                      {result.conditions.map((c) => (
                        <li key={c}>
                          <Text variant="body-sm-normal">{c}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="compat-result__block">
                  <Text variant="body-sm-semibold" as="h3">
                    Impact
                  </Text>
                  <Text variant="body-sm-normal">{result.impact.summary}</Text>
                  <Text variant="body-xs-normal" color="subtle">
                    Sources: {result.impact.sourceEnclosureIds.join(', ') || '—'} · Target:{' '}
                    {result.impact.targetEnclosureId} · Attractions:{' '}
                    {result.impact.attractionIds.join(', ') || '—'}
                  </Text>
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </PageFrame>
  )
}
