import { Text } from '@capra/core'
import { ParkProvider } from './state/ParkProvider'
import { usePark } from './state/usePark'

/** Temporary smoke UI for Task 5 — replaced by AppShell in Task 6. */
function ParkSmoke() {
  const { park, kvStatus } = usePark()
  return (
    <div style={{ padding: '1rem' }}>
      <Text as="h1" variant="heading">
        Claw & Order — park smoke
      </Text>
      <Text>guestsInPark: {park.guestsInPark}</Text>
      <Text>
        tick: {park.tick} · scenario: {park.scenario}
        {park.paused ? ' · paused' : ''}
      </Text>
      <Text>
        settingsLoaded: {kvStatus.settingsLoaded ? 'yes' : 'no'}
        {kvStatus.error ? ` · error: ${kvStatus.error}` : ''}
      </Text>
    </div>
  )
}

function App() {
  return (
    <ParkProvider>
      <ParkSmoke />
    </ParkProvider>
  )
}

export default App
