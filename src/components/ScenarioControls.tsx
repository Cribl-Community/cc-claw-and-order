import { Pill, SelectField, Switch, Text } from '@capra/core'
import type { Key } from '@capra/core'
import type { ScenarioId } from '../model/types'
import { usePark } from '../state/usePark'

const SCENARIO_ITEMS: { id: ScenarioId; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'stormOutage', label: 'Storm + Outage' },
]

function isScenarioId(key: Key | null): key is ScenarioId {
  return key === 'normal' || key === 'stormOutage'
}

/** Compact scenario + pause controls (full controls live in Settings). */
export function ScenarioControls({ compact = false }: { compact?: boolean }) {
  const { park, config, setScenario, pause, resume } = usePark()
  const scenario = park.scenario
  const paused = park.paused || config.paused

  return (
    <div
      className={
        compact ? 'scenario-controls scenario-controls--compact' : 'scenario-controls'
      }
    >
      <SelectField
        label="Scenario"
        size="sm"
        items={SCENARIO_ITEMS}
        value={scenario}
        onChange={(key) => {
          if (isScenarioId(key)) setScenario(key)
        }}
      />
      <div className="scenario-controls__pause">
        <Switch
          aria-label="Pause simulation"
          size="sm"
          checked={paused}
          onChange={(e) => {
            if (e.target.checked) pause()
            else resume()
          }}
        />
        <Text variant="body-sm-normal">{paused ? 'Paused' : 'Running'}</Text>
      </div>
      {paused ? (
        <Pill appearance="warning" variant="muted" inline>
          Paused
        </Pill>
      ) : null}
      {!paused && scenario !== 'normal' ? (
        <Pill appearance="warning" variant="muted" inline>
          Storm + Outage
        </Pill>
      ) : null}
    </div>
  )
}
