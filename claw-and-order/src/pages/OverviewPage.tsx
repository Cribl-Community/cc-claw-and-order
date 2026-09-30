import { useMemo } from 'react'
import { AlertOutlined, WarningOutlined } from '@capra/icons'
import { emptyState } from '../assets/art'
import { MetricCard } from '../components/MetricCard'
import { PageFrame } from '../components/PageFrame'
import { ParkMap } from '../components/ParkMap'
import { ScenarioControls } from '../components/ScenarioControls'
import { Sparkline } from '../components/Sparkline'
import {
  isIncidentAcknowledged,
  PARK_OVERVIEW_SERIES,
  selectAnimalsNeedingAttention,
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

function seriesValues(
  history: { values: Record<string, number | null> }[],
  key: string,
): number[] {
  return history
    .map((sample) => sample.values[key])
    .filter((value): value is number => typeof value === 'number')
}

export function OverviewPage() {
  const { park, config, operator, setSelection } = usePark()
  const metrics = selectOverviewMetrics(park, config, operator)
  const incidents = selectPrioritizedIncidents(park, operator)
  const animals = selectAnimalsNeedingAttention(park)
  const now = useSimNow()
  const history = park.readingHistory[PARK_OVERVIEW_SERIES] ?? []
  const longestAttraction = useMemo(() => {
    const open = park.attractions.filter((a) => a.status !== 'closed')
    return open.reduce<(typeof open)[number] | null>((best, attraction) => {
      if (!best || attraction.waitMinutes > best.waitMinutes) return attraction
      return best
    }, null)
  }, [park.attractions])
  const incidentsEmptyArt = emptyState('no-active-incidents')
  // Match InvestigationDrawer / advanceTick: wall clock for staleness — use sim clock.
  const attractionStatus: OperationalStatus =
    metrics.attractionsAvailable === 0
      ? 'critical'
      : metrics.attractionsAvailable < park.attractions.length
        ? 'warning'
        : 'normal'

  return (
    <PageFrame
      title="Park Overview"
      tone="brand"
      headerVariant="full"
      description="Live control-room status across enclosures, services, fleet, and the lab."
      actions={<ScenarioControls compact />}
    >
      <div className="app-grid-span-12 overview-kpi-row overview-kpi-row--primary">
        <MetricCard
          tone="brand"
          label="Critical incidents"
          value={metrics.criticalIncidents}
          status={metricStatus('critical', metrics.criticalIncidents, config)}
          trend={
            <Sparkline
              values={seriesValues(history, 'criticalIncidents')}
              label="Critical incidents, recent ticks"
            />
          }
        />
        <MetricCard
          tone="brand"
          label="Longest wait"
          value={`${metrics.longestWaitMinutes} min`}
          status={metricStatus('wait', metrics.longestWaitMinutes, config)}
          trend={
            <Sparkline
              values={seriesValues(history, 'longestWaitMinutes')}
              label="Longest wait in minutes, recent ticks"
            />
          }
        >
          {longestAttraction ? (
            <button
              type="button"
              className="overview-link"
              onClick={() => setSelection({ kind: 'asset', id: longestAttraction.id })}
            >
              {longestAttraction.name}
            </button>
          ) : null}
        </MetricCard>
        <MetricCard
          tone="brand"
          label="Animals needing attention"
          value={metrics.animalsNeedingAttention}
          status={metricStatus('attention', metrics.animalsNeedingAttention, config)}
          trend={
            <Sparkline
              values={seriesValues(history, 'animalsNeedingAttention')}
              label="Animals needing attention, recent ticks"
            />
          }
        >
          {animals.length > 0 ? (
            <div className="overview-names">
              {animals.map((animal) => (
                <button
                  key={animal.id}
                  type="button"
                  className="overview-link"
                  onClick={() => setSelection({ kind: 'asset', id: animal.id })}
                >
                  {animal.name}
                </button>
              ))}
            </div>
          ) : null}
        </MetricCard>
      </div>

      <div className="app-grid-span-12 overview-kpi-row overview-kpi-row--secondary">
        <MetricCard
          tone="brand"
          compact
          label="Guests in park"
          value={metrics.guestsInPark.toLocaleString()}
          status={metricStatus('guests', metrics.guestsInPark, config)}
        />
        <MetricCard
          tone="brand"
          compact
          label="Typical wait"
          value={`${metrics.typicalWaitMinutes} min`}
          status={metricStatus('wait', metrics.typicalWaitMinutes, config)}
        />
        <MetricCard
          tone="brand"
          compact
          label="Tour readiness"
          value={`${metrics.tourReadinessPct}%`}
          status={metricStatus('tour', metrics.tourReadinessPct, config)}
        />
        <MetricCard
          tone="brand"
          compact
          label="Attractions available"
          value={`${metrics.attractionsAvailable}/${park.attractions.length}`}
          status={attractionStatus}
        />
      </div>

      <div className="app-grid-span-7">
        <section className="overview-panel overview-panel--brand">
          <h2 className="overview-panel__title">Park map</h2>
          <p className="overview-panel__sub">Habitats and enclosure status</p>
          <ParkMap
            park={park}
            config={config}
            now={now}
            onSelectAsset={(id) => setSelection({ kind: 'asset', id })}
          />
        </section>
      </div>

      <div className="app-grid-span-5">
        <section className="overview-panel overview-panel--brand">
          <h2 className="overview-panel__title">Incidents</h2>
          <p className="overview-panel__sub">Severity first, then unacknowledged</p>
          {incidents.length === 0 ? (
            <div className="compat-empty">
              {incidentsEmptyArt ? (
                <img
                  src={incidentsEmptyArt}
                  alt=""
                  data-art="empty-state"
                />
              ) : null}
              <p className="overview-panel__sub">No active incidents.</p>
            </div>
          ) : (
            <ul className="overview-incident-list">
              {incidents.map((incident) => {
                const acked = isIncidentAcknowledged(incident.id, operator)
                const SeverityIcon =
                  incident.severity === 'critical' ? AlertOutlined : WarningOutlined
                return (
                  <li key={incident.id}>
                    <button
                      type="button"
                      className="overview-incident"
                      onClick={() => setSelection({ kind: 'incident', id: incident.id })}
                    >
                      <SeverityIcon size="sm" aria-hidden />
                      <span>
                        <span className="overview-incident__title">{incident.title}</span>
                        <span className="overview-incident__meta">
                          {acked ? 'Acknowledged' : 'Unacknowledged'} ·{' '}
                          {new Date(incident.openedAt).toLocaleTimeString()}
                        </span>
                      </span>
                      <span className={`overview-pill overview-pill--${incident.severity}`}>
                        {incident.severity === 'critical' ? 'Critical' : 'Warning'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </PageFrame>
  )
}
