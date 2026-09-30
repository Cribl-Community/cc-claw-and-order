import { Button, Text } from '@capra/core'
import { PageFrame } from '../components/PageFrame'
import { ScenarioControls } from '../components/ScenarioControls'
import { usePark } from '../state/usePark'

/** Placeholder — real Overview in Task 8. Temporary open buttons for Task 7 verify. */
export function OverviewPage() {
  const { park, setSelection } = usePark()
  const sampleIncident = park.incidents[0]
  const sampleEnclosure = park.enclosures[0]

  return (
    <PageFrame title="Park Overview" actions={<ScenarioControls compact />}>
      <div className="app-grid-span-12">
        <Text>Park overview placeholder.</Text>
        <div className="overview-temp-actions">
          {sampleIncident ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelection({ kind: 'incident', id: sampleIncident.id })}
            >
              Open sample incident
            </Button>
          ) : null}
          {sampleEnclosure ? (
            <Button
              size="sm"
              variant="tertiary"
              onClick={() => setSelection({ kind: 'asset', id: sampleEnclosure.id })}
            >
              Open sample enclosure
            </Button>
          ) : null}
        </div>
      </div>
    </PageFrame>
  )
}
