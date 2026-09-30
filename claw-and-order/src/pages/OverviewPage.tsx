import { Text } from '@capra/core'
import { PageFrame } from '../components/PageFrame'
import { ScenarioControls } from '../components/ScenarioControls'

/** Placeholder — real Overview in Task 8. */
export function OverviewPage() {
  return (
    <PageFrame title="Park Overview" actions={<ScenarioControls compact />}>
      <div className="app-grid-span-12">
        <Text>Park overview placeholder.</Text>
      </div>
    </PageFrame>
  )
}
