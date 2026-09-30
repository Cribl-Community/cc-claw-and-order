import { Alert, Table, Text, defineColumns, type Key } from '@capra/core'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetricCard } from '../components/MetricCard'
import { PageFrame } from '../components/PageFrame'
import { StatusIndicator } from '../components/StatusIndicator'
import { fleetKpis, fleetSummaryStatus } from '../model/fleet'
import { labKpis, labSummaryStatus } from '../model/lab'
import { selectOverviewMetrics } from '../model/selectors'
import type {
  Attraction,
  ConfigSettings,
  OperationalStatus,
  ParkModel,
} from '../model/types'
import { usePark } from '../state/usePark'
import { useSimNow } from '../state/useSimNow'

type AttractionRow = {
  id: string
  name: string
  zone: string
  status: OperationalStatus
  statusLabel: string
  queueLength: number
  waitMinutes: number
  waitStatus: OperationalStatus
  crowding: string
  crowdingStatus: OperationalStatus
}

function attractionOperationalStatus(status: Attraction['status']): OperationalStatus {
  if (status === 'closed') return 'critical'
  return status
}

function attractionStatusLabel(status: Attraction['status']): string {
  if (status === 'closed') return 'Closed'
  if (status === 'normal') return 'Open'
  if (status === 'warning') return 'Degraded'
  if (status === 'critical') return 'Critical'
  return 'Unknown'
}

function waitStatus(waitMinutes: number, config: ConfigSettings): OperationalStatus {
  if (waitMinutes >= config.queueCritMin) return 'critical'
  if (waitMinutes >= config.queueWarnMin) return 'warning'
  return 'normal'
}

function crowdingLabel(crowding: Attraction['crowding']): string {
  switch (crowding) {
    case 'low':
      return 'Low'
    case 'moderate':
      return 'Moderate'
    case 'high':
      return 'High'
    default:
      return 'Unknown'
  }
}

function crowdingStatus(crowding: Attraction['crowding']): OperationalStatus {
  switch (crowding) {
    case 'low':
      return 'normal'
    case 'moderate':
      return 'warning'
    case 'high':
      return 'critical'
    default:
      return 'unknown'
  }
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="app-grid-span-12 overview-panel overview-panel--brand services-panel">
      <h2 className="overview-panel__title">{title}</h2>
      <p className="overview-panel__sub">{description}</p>
      <div className="services-panel__body">{children}</div>
    </section>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <h2 className="app-grid-span-12 services-section">{children}</h2>
}

function NameLink({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="text-link"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
    >
      {label}
    </button>
  )
}

function StatusCell({ status, label }: { status: OperationalStatus; label?: string }) {
  return <StatusIndicator status={status} label={label} />
}

function serviceDegradationAlerts(park: ParkModel): {
  appearance: 'warning' | 'danger'
  title: string
  body: string
}[] {
  const alerts: { appearance: 'warning' | 'danger'; title: string; body: string }[] = []

  const powerCritical = park.infrastructure.filter(
    (i) => i.kind === 'power' && (i.status === 'critical' || i.status === 'warning'),
  )
  const weatherInfra = park.infrastructure.filter(
    (i) => i.kind === 'weather' && (i.status === 'critical' || i.status === 'warning'),
  )
  const unpoweredChargers = park.chargers.filter((c) => !c.powered)
  const stormy =
    park.weather.condition === 'storm' ||
    park.weather.condition === 'rain' ||
    park.weather.severity >= 2

  if (powerCritical.length > 0 || unpoweredChargers.length > 0) {
    const names = powerCritical.map((p) => p.name).join(', ') || 'Grid'
    const chargerNote =
      unpoweredChargers.length > 0
        ? ` ${unpoweredChargers.length} charger hub${unpoweredChargers.length === 1 ? '' : 's'} without power.`
        : ''
    alerts.push({
      appearance: powerCritical.some((p) => p.status === 'critical') ? 'danger' : 'warning',
      title: 'Power degrading guest services',
      body: `${names} affecting fences, chargers, and tour readiness.${chargerNote}`,
    })
  }

  if (stormy || weatherInfra.length > 0) {
    const condition =
      park.weather.condition === 'clear'
        ? 'elevated weather risk'
        : `${park.weather.condition} (severity ${park.weather.severity})`
    alerts.push({
      appearance:
        park.weather.condition === 'storm' || park.weather.severity >= 3 ? 'danger' : 'warning',
      title: 'Weather impacting park services',
      body: `Conditions: ${condition}. Expect longer waits, crowding, and safari delays or cancellations.`,
    })
  }

  return alerts
}

function statusWord(status: OperationalStatus): string {
  switch (status) {
    case 'normal':
      return 'Normal'
    case 'warning':
      return 'Warning'
    case 'critical':
      return 'Critical'
    default:
      return 'Unknown'
  }
}

export function ServicesPage() {
  const { park, config, operator, selection, setSelection } = usePark()
  const now = useSimNow()
  const navigate = useNavigate()
  const tableDensity = config.density === 'compact' ? 'compact' : 'default'

  const openAsset = useCallback(
    (id: string) => setSelection({ kind: 'asset', id }),
    [setSelection],
  )

  const degradationAlerts = serviceDegradationAlerts(park)
  const fleetStatus = fleetSummaryStatus(park, config, now)
  const labStatus = labSummaryStatus(park, config, now)
  const fleet = fleetKpis(park, config, now)
  const lab = labKpis(park, config, now)

  const attractionRows: AttractionRow[] = park.attractions.map((a) => ({
    id: a.id,
    name: a.name,
    zone: a.zone,
    status: attractionOperationalStatus(a.status),
    statusLabel: attractionStatusLabel(a.status),
    queueLength: a.queueLength,
    waitMinutes: a.waitMinutes,
    waitStatus: a.status === 'unknown' ? 'unknown' : waitStatus(a.waitMinutes, config),
    crowding: crowdingLabel(a.crowding),
    crowdingStatus: crowdingStatus(a.crowding),
  }))

  const onTableSelectionChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const id = [...keys][0]
    if (typeof id === 'string' && id.length > 0) {
      setSelection({ kind: 'asset', id })
    }
  }

  const selectedAssetKeys = useMemo(() => {
    if (selection?.kind !== 'asset') return new Set<Key>()
    return new Set<Key>([selection.id])
  }, [selection])

  const attractionColumns = useMemo(
    () =>
      defineColumns<AttractionRow>([
        {
          id: 'name',
          label: 'Attraction',
          allowsSorting: true,
          render: (_value, item) => <NameLink label={item.name} onOpen={() => openAsset(item.id)} />,
        },
        { id: 'zone', label: 'Walking zone', allowsSorting: true },
        {
          id: 'status',
          label: 'Availability',
          allowsSorting: true,
          render: (_value, item) => <StatusCell status={item.status} label={item.statusLabel} />,
        },
        { id: 'queueLength', label: 'Queue', allowsSorting: true },
        {
          id: 'waitMinutes',
          label: 'Est. wait',
          allowsSorting: true,
          render: (_value, item) => (
            <span className="services-inline-status">
              <Text variant="body-sm-normal">{item.waitMinutes} min</Text>
              <StatusIndicator status={item.waitStatus} compact />
            </span>
          ),
        },
        {
          id: 'crowding',
          label: 'Crowding',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusCell status={item.crowdingStatus} label={item.crowding} />
          ),
        },
      ]),
    [openAsset],
  )

  const sortedFeedback = useMemo(
    () => park.feedback.slice().sort((a, b) => b.createdAt - a.createdAt),
    [park.feedback],
  )

  const overview = selectOverviewMetrics(park, config, operator)
  const guestLoad = overview.guestsInPark / Math.max(config.guestCapacity, 1)
  const guestStatus: OperationalStatus =
    guestLoad >= 0.95 ? 'critical' : guestLoad >= 0.8 ? 'warning' : 'normal'
  const tourStatus: OperationalStatus =
    overview.tourReadinessPct < 40
      ? 'critical'
      : overview.tourReadinessPct < 70
        ? 'warning'
        : 'normal'
  const longestWaitStatus = waitStatus(overview.longestWaitMinutes, config)
  const attractionStatus: OperationalStatus =
    overview.attractionsAvailable === 0
      ? 'critical'
      : overview.attractionsAvailable < park.attractions.length
        ? 'warning'
        : 'normal'

  return (
    <PageFrame title="Park Services">
      <div className="app-grid-span-12 overview-kpi-row">
        <MetricCard
          tone="brand"
          label="Attractions available"
          value={`${overview.attractionsAvailable}/${park.attractions.length}`}
          status={attractionStatus}
        />
        <MetricCard
          tone="brand"
          label="Longest wait"
          value={`${overview.longestWaitMinutes} min`}
          status={longestWaitStatus}
        />
        <MetricCard
          tone="brand"
          label="Tour readiness"
          value={`${overview.tourReadinessPct}%`}
          status={tourStatus}
        />
        <MetricCard
          tone="brand"
          label="Guests in park"
          value={overview.guestsInPark.toLocaleString()}
          status={guestStatus}
        />
      </div>
      {degradationAlerts.length > 0 ? (
        <div className="app-grid-span-12 services-alerts">
          {degradationAlerts.map((alert) => (
            <Alert key={alert.title} appearance={alert.appearance} title={alert.title} layout="section">
              {alert.body}
            </Alert>
          ))}
        </div>
      ) : null}

      <SectionLabel>Guest experience</SectionLabel>
      <Panel
        title="Attractions"
        description="Availability, queues, and crowding. Select a row to investigate."
      >
        <Table
          columns={attractionColumns}
          visibleColumns={['name', 'zone', 'status', 'queueLength', 'waitMinutes', 'crowding']}
          items={attractionRows}
          density={tableDensity}
          selectionMode="single"
          selectedKeys={selectedAssetKeys}
          onSelectionChange={onTableSelectionChange}
        />
      </Panel>
      <Panel
        title="Guest feedback"
        description="Recent comments. Open the linked attraction or tour."
      >
        {sortedFeedback.length === 0 ? (
          <p className="services-empty">No guest feedback yet.</p>
        ) : (
          <ul className="overview-incident-list">
            {sortedFeedback.map((item) => {
              const targetId = item.attractionId ?? item.routeId
              const meta = `${item.responseCount} response${item.responseCount === 1 ? '' : 's'} · ${formatWhen(item.createdAt)}`
              if (targetId == null) {
                return (
                  <li key={item.id}>
                    <div className="overview-incident">
                      <span>
                        <span className="overview-incident__title">
                          {item.rating}/5 · {item.summary}
                        </span>
                        <span className="overview-incident__meta">{meta}</span>
                      </span>
                    </div>
                  </li>
                )
              }
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className="overview-incident"
                    onClick={() => openAsset(targetId)}
                  >
                    <span>
                      <span className="overview-incident__title">
                        {item.rating}/5 · {item.summary}
                      </span>
                      <span className="overview-incident__meta">{meta}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <SectionLabel>Connected ops</SectionLabel>
      <div className="app-grid-span-6">
        <button
          type="button"
          className="overview-panel overview-panel--brand services-link-card"
          onClick={() => navigate('/fleet')}
        >
          <h2 className="overview-panel__title">Fleet</h2>
          <p className="overview-panel__sub">
            {fleet.departuresCovered}/{fleet.departuresTotal} departures covered ·{' '}
            {fleet.vehiclesReady}/{fleet.vehiclesTotal} vehicles ready
          </p>
          <StatusIndicator status={fleetStatus} label={statusWord(fleetStatus)} />
        </button>
      </div>
      <div className="app-grid-span-6">
        <button
          type="button"
          className="overview-panel overview-panel--brand services-link-card"
          onClick={() => navigate('/lab')}
        >
          <h2 className="overview-panel__title">Lab</h2>
          <p className="overview-panel__sub">
            {lab.incubatorsInBounds}/{lab.incubatorsTotal} incubators in bounds · {lab.doorsOpen}{' '}
            door{lab.doorsOpen === 1 ? '' : 's'} open
          </p>
          <StatusIndicator status={labStatus} label={statusWord(labStatus)} />
        </button>
      </div>
    </PageFrame>
  )
}
