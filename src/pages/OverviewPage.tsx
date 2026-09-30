import { Card, EmptyState, ListItem, Pill } from '@capra/core'
import { AlertOutlined, WarningOutlined } from '@capra/icons'
import { MetricCard } from '../components/MetricCard'
import { PageFrame } from '../components/PageFrame'
import { ParkMap } from '../components/ParkMap'
import { ScenarioControls } from '../components/ScenarioControls'
import {
  isIncidentAcknowledged,
  selectOverviewMetrics,
  selectPrioritizedIncidents,
} from '../model/selectors'
import type { OperationalStatus } from '../model/types'
import { usePark } from '../state/usePark'
import { useSimNow } from '../state/useSimNow'

function metricStatus(
  kind: 'critical' | 'attention' | 'wait' | 'guests' | 'tour',
  value: number,
  config: { guestCapacity: number; queueWarnMin: number; queueCritMin: number },
): OperationalStatus {
  switch (kind) {
    case 'critical':
      return value > 0 ? 'critical' : 'normal'
    case 'attention':
      if (value === 0) return 'normal'
      return value >= 3 ? 'critical' : 'warning'
    case 'wait':
      if (value >= config.queueCritMin) return 'critical'
      if (value >= config.queueWarnMin) return 'warning'
      return 'normal'
    case 'guests': {
      const load = value / Math.max(config.guestCapacity, 1)
      if (load >= 0.95) return 'critical'
      if (load >= 0.8) return 'warning'
      return 'normal'
    }
    case 'tour':
      if (value < 40) return 'critical'
      if (value < 70) return 'warning'
      return 'normal'
  }
}

export function OverviewPage() {
  const { park, config, operator, setSelection } = usePark()
  const metrics = selectOverviewMetrics(park, config, operator)
  const incidents = selectPrioritizedIncidents(park, operator)
  const now = useSimNow()
  const attractionStatus: OperationalStatus =
    metrics.attractionsAvailable === 0
      ? 'critical'
      : metrics.attractionsAvailable < park.attractions.length
        ? 'warning'
        : 'normal'

  return (
    <PageFrame title="Park Overview" actions={<ScenarioControls compact />}>
      <div className="app-grid-span-12 overview-kpi-row">
        <MetricCard
          label="Critical incidents"
          value={metrics.criticalIncidents}
          status={metricStatus('critical', metrics.criticalIncidents, config)}
        />
        <MetricCard
          label="Animals needing attention"
          value={metrics.animalsNeedingAttention}
          status={metricStatus('attention', metrics.animalsNeedingAttention, config)}
        />
        <MetricCard
          label="Attractions available"
          value={`${metrics.attractionsAvailable}/${park.attractions.length}`}
          status={attractionStatus}
        />
        <MetricCard
          label="Guests in park"
          value={metrics.guestsInPark.toLocaleString()}
          status={metricStatus('guests', metrics.guestsInPark, config)}
        />
        <MetricCard
          label="Typical wait"
          value={`${metrics.typicalWaitMinutes} min`}
          status={metricStatus('wait', metrics.typicalWaitMinutes, config)}
        />
        <MetricCard
          label="Longest wait"
          value={`${metrics.longestWaitMinutes} min`}
          status={metricStatus('wait', metrics.longestWaitMinutes, config)}
        />
        <MetricCard
          label="Tour readiness"
          value={`${metrics.tourReadinessPct}%`}
          status={metricStatus('tour', metrics.tourReadinessPct, config)}
        />
      </div>

      <div className="app-grid-span-7">
        <div className="overview-panel">
        <Card>
          <Card.Header>
            <Card.Title>Park map</Card.Title>
            <Card.Description>Schematic zones, safari routes, enclosure status</Card.Description>
          </Card.Header>
          <Card.Content>
            <ParkMap
              park={park}
              config={config}
              now={now}
              onSelectAsset={(id) => setSelection({ kind: 'asset', id })}
            />
          </Card.Content>
        </Card>
        </div>
      </div>

      <div className="app-grid-span-5">
        <div className="overview-panel">
        <Card>
          <Card.Header>
            <Card.Title>Incidents</Card.Title>
            <Card.Description>Severity first, then unacknowledged</Card.Description>
          </Card.Header>
          <Card.Content>
            {incidents.length === 0 ? (
              <EmptyState
                title="No active incidents"
                description="Park operations are clear. New faults will appear here."
                size="md"
              />
            ) : (
              <ul className="overview-incident-list">
                {incidents.map((incident) => {
                  const acked = isIncidentAcknowledged(incident.id, operator)
                  const SeverityIcon =
                    incident.severity === 'critical' ? AlertOutlined : WarningOutlined
                  return (
                    <li key={incident.id}>
                      <ListItem
                        as="button"
                        type="button"
                        FORCE__className="overview-incident-list__item"
                        onClick={() => setSelection({ kind: 'incident', id: incident.id })}
                      >
                        <ListItem.Leading>
                          <SeverityIcon size="sm" aria-hidden />
                        </ListItem.Leading>
                        <ListItem.Content>
                          <ListItem.Label>{incident.title}</ListItem.Label>
                          <ListItem.Description>
                            {acked ? 'Acknowledged' : 'Unacknowledged'} ·{' '}
                            {new Date(incident.openedAt).toLocaleTimeString()}
                          </ListItem.Description>
                        </ListItem.Content>
                        <ListItem.Trailing>
                          <Pill
                            appearance={incident.severity === 'critical' ? 'danger' : 'warning'}
                            variant="muted"
                            inline
                          >
                            {incident.severity === 'critical' ? 'Critical' : 'Warning'}
                          </Pill>
                        </ListItem.Trailing>
                      </ListItem>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card.Content>
        </Card>
        </div>
      </div>
    </PageFrame>
  )
}
