import {
  Alert,
  Card,
  EMPTY_CELL_PLACEHOLDER,
  Link,
  ListItem,
  Table,
  Text,
  defineColumns,
  type Key,
} from '@capra/core'
import { useCallback, useMemo } from 'react'
import { PageFrame } from '../components/PageFrame'
import { StatusIndicator } from '../components/StatusIndicator'
import { selectSpeciesById } from '../model/selectors'
import { isReadingStale } from '../model/status'
import type {
  Attraction,
  ConfigSettings,
  OperationalStatus,
  ParkModel,
  SafariRoute,
  Vehicle,
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

type DepartureRow = {
  id: string
  routeId: string
  routeName: string
  routeStatus: OperationalStatus
  routeStatusLabel: string
  departsAt: string
  vehicleId: string
  utilization: string
  seats: number
  occupied: number
}

type VehicleRow = {
  id: string
  routeName: string
  battery: string
  batteryStatus: OperationalStatus
  readiness: OperationalStatus
  readinessLabel: string
  chargerId: string
}

type ChargerRow = {
  id: string
  powered: string
  available: string
  status: OperationalStatus
  statusLabel: string
}

type IncubatorRow = {
  id: string
  species: string
  hatchDate: string
  temp: string
  humidity: string
  status: OperationalStatus
}

function attractionOperationalStatus(status: Attraction['status']): OperationalStatus {
  if (status === 'closed') return 'critical'
  return status
}

function attractionStatusLabel(status: Attraction['status']): string {
  if (status === 'closed') return 'Closed'
  switch (status) {
    case 'normal':
      return 'Normal'
    case 'warning':
      return 'Warning'
    case 'critical':
      return 'Critical'
    case 'unknown':
      return 'Unknown'
  }
}

function waitStatus(waitMinutes: number, config: ConfigSettings): OperationalStatus {
  if (waitMinutes >= config.queueCritMin) return 'critical'
  if (waitMinutes >= config.queueWarnMin) return 'warning'
  return 'normal'
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

function routeStatus(status: SafariRoute['status']): OperationalStatus {
  switch (status) {
    case 'running':
      return 'normal'
    case 'delayed':
      return 'warning'
    case 'cancelled':
      return 'critical'
    default:
      return 'unknown'
  }
}

function routeStatusLabel(status: SafariRoute['status']): string {
  switch (status) {
    case 'running':
      return 'Running'
    case 'delayed':
      return 'Delayed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Unknown'
  }
}

function readinessStatus(readiness: Vehicle['readiness']): OperationalStatus {
  switch (readiness) {
    case 'ready':
      return 'normal'
    case 'charging':
      return 'warning'
    case 'maintenance':
    case 'offline':
      return 'critical'
    default:
      return 'unknown'
  }
}

function readinessLabel(readiness: Vehicle['readiness']): string {
  switch (readiness) {
    case 'ready':
      return 'Ready'
    case 'charging':
      return 'Charging'
    case 'maintenance':
      return 'Maintenance'
    case 'offline':
      return 'Offline'
    default:
      return 'Unknown'
  }
}

function batteryStatus(batteryPct: number | null): OperationalStatus {
  if (batteryPct == null) return 'unknown'
  if (batteryPct < 20) return 'critical'
  if (batteryPct < 40) return 'warning'
  return 'normal'
}

function chargerStatus(
  powered: boolean,
  available: boolean,
  lastReadingAt: number,
  now: number,
  staleThresholdSec: number,
): { status: OperationalStatus; label: string } {
  if (isReadingStale(lastReadingAt, now, staleThresholdSec)) {
    return { status: 'unknown', label: 'Stale' }
  }
  if (!powered) return { status: 'critical', label: 'Unpowered' }
  if (!available) return { status: 'warning', label: 'In use' }
  return { status: 'normal', label: 'Available' }
}

function formatReading(value: number | null | undefined, unit: string): string {
  if (value == null) return EMPTY_CELL_PLACEHOLDER
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return `${rounded}${unit}`
}

function NameLink({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <Link
      as="button"
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onOpen()
      }}
    >
      {label}
    </Link>
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
      appearance: park.weather.condition === 'storm' || park.weather.severity >= 3 ? 'danger' : 'warning',
      title: 'Weather impacting park services',
      body: `Conditions: ${condition}. Expect longer waits, crowding, and safari delays or cancellations.`,
    })
  }

  return alerts
}

export function ServicesPage() {
  const { park, config, selection, setSelection } = usePark()
  const now = useSimNow()
  const speciesById = selectSpeciesById(park)
  const tableDensity = config.density === 'compact' ? 'compact' : 'default'
  const routeNameById = useMemo(
    () => new Map(park.safariRoutes.map((r) => [r.id, r.name])),
    [park.safariRoutes],
  )

  const openAsset = useCallback(
    (id: string) => setSelection({ kind: 'asset', id }),
    [setSelection],
  )

  const degradationAlerts = serviceDegradationAlerts(park)

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

  const departureRows: DepartureRow[] = useMemo(
    () =>
      park.safariRoutes.flatMap((route) =>
        route.departures.map((dep) => {
          const utilPct = dep.seats === 0 ? 0 : Math.round((dep.occupied / dep.seats) * 100)
          return {
            id: dep.id,
            routeId: route.id,
            routeName: route.name,
            routeStatus: routeStatus(route.status),
            routeStatusLabel: routeStatusLabel(route.status),
            departsAt: new Date(dep.departsAt).toLocaleString(),
            vehicleId: dep.vehicleId,
            utilization: `${dep.occupied}/${dep.seats} (${utilPct}%)`,
            seats: dep.seats,
            occupied: dep.occupied,
          }
        }),
      ),
    [park.safariRoutes],
  )

  const onTableSelectionChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const id = [...keys][0]
    if (typeof id === 'string' && id.length > 0) {
      setSelection({ kind: 'asset', id })
    }
  }

  const onDepartureSelectionChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const id = [...keys][0]
    if (typeof id !== 'string') return
    const row = departureRows.find((r) => r.id === id)
    if (row) setSelection({ kind: 'asset', id: row.vehicleId })
  }

  const selectedAssetKeys = useMemo(() => {
    if (selection?.kind !== 'asset') return new Set<Key>()
    return new Set<Key>([selection.id])
  }, [selection])

  const selectedDepartureKeys = useMemo(() => {
    if (selection?.kind !== 'asset') return new Set<Key>()
    return new Set<Key>(
      departureRows
        .filter((r) => r.vehicleId === selection.id || r.routeId === selection.id)
        .map((r) => r.id),
    )
  }, [selection, departureRows])

  const vehicleRows: VehicleRow[] = park.vehicles.map((v) => ({
    id: v.id,
    routeName: routeNameById.get(v.routeId) ?? EMPTY_CELL_PLACEHOLDER,
    battery: v.batteryPct == null ? EMPTY_CELL_PLACEHOLDER : `${v.batteryPct}%`,
    batteryStatus: batteryStatus(v.batteryPct),
    readiness: readinessStatus(v.readiness),
    readinessLabel: readinessLabel(v.readiness),
    chargerId: v.chargerId ?? EMPTY_CELL_PLACEHOLDER,
  }))

  const chargerRows: ChargerRow[] = park.chargers.map((c) => {
    const { status, label } = chargerStatus(
      c.powered,
      c.available,
      c.lastReadingAt,
      now,
      config.staleThresholdSec,
    )
    return {
      id: c.id,
      powered: c.powered ? 'Yes' : 'No',
      available: c.available ? 'Yes' : 'No',
      status,
      statusLabel: label,
    }
  })

  const incubatorRows: IncubatorRow[] = park.lab.incubators.map((inc) => {
    const species = speciesById.get(inc.speciesId)
    const daysToHatch = (inc.expectedHatchAt - now) / (24 * 60 * 60 * 1000)
    let status = inc.status
    if (inc.tempC == null || inc.humidityPct == null) {
      status = 'unknown'
    } else if (daysToHatch >= 0 && daysToHatch <= config.hatchAlertDays && status === 'normal') {
      status = 'warning'
    }
    return {
      id: inc.id,
      species: species?.displayName ?? EMPTY_CELL_PLACEHOLDER,
      hatchDate: new Date(inc.expectedHatchAt).toLocaleDateString(),
      temp: formatReading(inc.tempC, '°C'),
      humidity: formatReading(inc.humidityPct, '%'),
      status,
    }
  })

  const coldStorageStale = isReadingStale(
    park.lab.coldStorage.lastReadingAt,
    now,
    config.staleThresholdSec,
  )
  const coldStorageStatus: OperationalStatus = coldStorageStale
    ? 'unknown'
    : park.lab.coldStorage.status
  const coldStorageLabel = coldStorageStale ? 'Stale' : undefined

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

  const departureColumns = useMemo(
    () =>
      defineColumns<DepartureRow>([
        {
          id: 'routeName',
          label: 'Safari',
          allowsSorting: true,
          render: (_value, item) => (
            <NameLink label={item.routeName} onOpen={() => openAsset(item.routeId)} />
          ),
        },
        {
          id: 'routeStatus',
          label: 'Status',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusCell status={item.routeStatus} label={item.routeStatusLabel} />
          ),
        },
        { id: 'departsAt', label: 'Departure', allowsSorting: true },
        {
          id: 'vehicleId',
          label: 'Vehicle',
          allowsSorting: true,
          render: (_value, item) => (
            <NameLink label={item.vehicleId} onOpen={() => openAsset(item.vehicleId)} />
          ),
        },
        { id: 'utilization', label: 'Seat utilization', allowsSorting: true },
      ]),
    [openAsset],
  )

  const vehicleColumns = useMemo(
    () =>
      defineColumns<VehicleRow>([
        {
          id: 'id',
          label: 'Vehicle',
          allowsSorting: true,
          render: (_value, item) => <NameLink label={item.id} onOpen={() => openAsset(item.id)} />,
        },
        { id: 'routeName', label: 'Route', allowsSorting: true },
        {
          id: 'battery',
          label: 'Battery',
          allowsSorting: true,
          render: (_value, item) => (
            <span className="services-inline-status">
              <Text variant="body-sm-normal">{item.battery}</Text>
              <StatusIndicator status={item.batteryStatus} compact />
            </span>
          ),
        },
        {
          id: 'readiness',
          label: 'Readiness',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusCell status={item.readiness} label={item.readinessLabel} />
          ),
        },
        {
          id: 'chargerId',
          label: 'Charger',
          allowsSorting: true,
          render: (_value, item) =>
            item.chargerId === EMPTY_CELL_PLACEHOLDER ? (
              item.chargerId
            ) : (
              <NameLink label={item.chargerId} onOpen={() => openAsset(item.chargerId)} />
            ),
        },
      ]),
    [openAsset],
  )

  const chargerColumns = useMemo(
    () =>
      defineColumns<ChargerRow>([
        {
          id: 'id',
          label: 'Charger',
          allowsSorting: true,
          render: (_value, item) => <NameLink label={item.id} onOpen={() => openAsset(item.id)} />,
        },
        { id: 'powered', label: 'Powered', allowsSorting: true },
        { id: 'available', label: 'Available', allowsSorting: true },
        {
          id: 'status',
          label: 'Status',
          allowsSorting: true,
          render: (_value, item) => <StatusCell status={item.status} label={item.statusLabel} />,
        },
      ]),
    [openAsset],
  )

  const incubatorColumns = useMemo(
    () =>
      defineColumns<IncubatorRow>([
        {
          id: 'id',
          label: 'Incubator',
          allowsSorting: true,
          render: (_value, item) => <NameLink label={item.id} onOpen={() => openAsset(item.id)} />,
        },
        { id: 'species', label: 'Species', allowsSorting: true },
        { id: 'hatchDate', label: 'Expected hatch', allowsSorting: true },
        { id: 'temp', label: 'Temp', allowsSorting: true },
        { id: 'humidity', label: 'Humidity', allowsSorting: true },
        {
          id: 'status',
          label: 'Status',
          allowsSorting: true,
          render: (value) => <StatusCell status={value as OperationalStatus} />,
        },
      ]),
    [openAsset],
  )

  const sortedFeedback = useMemo(
    () => park.feedback.slice().sort((a, b) => b.createdAt - a.createdAt),
    [park.feedback],
  )

  return (
    <PageFrame title="Park Services">
      {degradationAlerts.length > 0 ? (
        <div className="app-grid-span-12 services-alerts">
          {degradationAlerts.map((alert) => (
            <Alert key={alert.title} appearance={alert.appearance} title={alert.title} layout="section">
              {alert.body}
            </Alert>
          ))}
        </div>
      ) : null}

      <div className="app-grid-span-12">
        <div className="overview-panel">
          <Card>
            <Card.Header>
              <Card.Title>Attractions & walking zones</Card.Title>
              <Card.Description>Availability, queues, estimated waits, and crowding</Card.Description>
            </Card.Header>
            <Card.Content>
              <Table
                columns={attractionColumns}
                visibleColumns={['name', 'zone', 'status', 'queueLength', 'waitMinutes', 'crowding']}
                items={attractionRows}
                density={tableDensity}
                selectionMode="single"
                selectedKeys={selectedAssetKeys}
                onSelectionChange={onTableSelectionChange}
              />
            </Card.Content>
          </Card>
        </div>
      </div>

      <div className="app-grid-span-6">
        <div className="overview-panel">
          <Card>
            <Card.Header>
              <Card.Title>Safari departures</Card.Title>
              <Card.Description>Schedule, delays/cancellations, and seat utilization</Card.Description>
            </Card.Header>
            <Card.Content>
              <Table
                columns={departureColumns}
                visibleColumns={[
                  'routeName',
                  'routeStatus',
                  'departsAt',
                  'vehicleId',
                  'utilization',
                ]}
                items={departureRows}
                density={tableDensity}
                selectionMode="single"
                selectedKeys={selectedDepartureKeys}
                onSelectionChange={onDepartureSelectionChange}
              />
            </Card.Content>
          </Card>
        </div>
      </div>

      <div className="app-grid-span-6">
        <div className="overview-panel">
          <Card>
            <Card.Header>
              <Card.Title>Guest feedback</Card.Title>
              <Card.Description>Recent comments with response counts</Card.Description>
            </Card.Header>
            <Card.Content>
              {sortedFeedback.length === 0 ? (
                <Text variant="body-sm-normal" color="subtle">
                  No guest feedback yet.
                </Text>
              ) : (
                <ul className="overview-incident-list">
                  {sortedFeedback.map((item) => {
                    const targetId = item.attractionId ?? item.routeId
                    if (targetId == null) {
                      return (
                        <li key={item.id}>
                          <ListItem FORCE__className="overview-incident-list__item">
                            <ListItem.Content>
                              <ListItem.Label>
                                {item.rating}/5 · {item.summary}
                              </ListItem.Label>
                              <ListItem.Description>
                                {item.responseCount} response
                                {item.responseCount === 1 ? '' : 's'} ·{' '}
                                {new Date(item.createdAt).toLocaleString()}
                              </ListItem.Description>
                            </ListItem.Content>
                          </ListItem>
                        </li>
                      )
                    }
                    return (
                      <li key={item.id}>
                        <ListItem
                          as="button"
                          type="button"
                          FORCE__className="overview-incident-list__item"
                          onClick={() => openAsset(targetId)}
                        >
                          <ListItem.Content>
                            <ListItem.Label>
                              {item.rating}/5 · {item.summary}
                            </ListItem.Label>
                            <ListItem.Description>
                              {item.responseCount} response
                              {item.responseCount === 1 ? '' : 's'} ·{' '}
                              {new Date(item.createdAt).toLocaleString()}
                            </ListItem.Description>
                          </ListItem.Content>
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

      <div className="app-grid-span-6">
        <div className="overview-panel">
          <Card>
            <Card.Header>
              <Card.Title>EV fleet</Card.Title>
              <Card.Description>Battery and readiness for safari vehicles</Card.Description>
            </Card.Header>
            <Card.Content>
              <Table
                columns={vehicleColumns}
                visibleColumns={['id', 'routeName', 'battery', 'readiness', 'chargerId']}
                items={vehicleRows}
                density={tableDensity}
                selectionMode="single"
                selectedKeys={selectedAssetKeys}
                onSelectionChange={onTableSelectionChange}
              />
            </Card.Content>
          </Card>
        </div>
      </div>

      <div className="app-grid-span-6">
        <div className="overview-panel">
          <Card>
            <Card.Header>
              <Card.Title>Chargers</Card.Title>
              <Card.Description>Power-aware availability</Card.Description>
            </Card.Header>
            <Card.Content>
              <Table
                columns={chargerColumns}
                visibleColumns={['id', 'powered', 'available', 'status']}
                items={chargerRows}
                density={tableDensity}
                selectionMode="single"
                selectedKeys={selectedAssetKeys}
                onSelectionChange={onTableSelectionChange}
              />
            </Card.Content>
          </Card>
        </div>
      </div>

      <div className="app-grid-span-7">
        <div className="overview-panel">
          <Card>
            <Card.Header>
              <Card.Title>Lab incubators</Card.Title>
              <Card.Description>Expected hatch dates and climate readings</Card.Description>
            </Card.Header>
            <Card.Content>
              <Table
                columns={incubatorColumns}
                visibleColumns={['id', 'species', 'hatchDate', 'temp', 'humidity', 'status']}
                items={incubatorRows}
                density={tableDensity}
                selectionMode="single"
                selectedKeys={selectedAssetKeys}
                onSelectionChange={onTableSelectionChange}
              />
            </Card.Content>
          </Card>
        </div>
      </div>

      <div className="app-grid-span-5">
        <div className="overview-panel">
          <Card>
            <Card.Header>
              <Card.Title>Cold storage</Card.Title>
              <Card.Description>Specimen cooler status</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="services-cold-storage">
                <div className="services-cold-storage__row">
                  <Text variant="body-sm-semibold">Temperature</Text>
                  <Text variant="body-sm-normal">
                    {formatReading(park.lab.coldStorage.tempC, '°C')}
                  </Text>
                </div>
                <div className="services-cold-storage__row">
                  <Text variant="body-sm-semibold">Status</Text>
                  <StatusIndicator status={coldStorageStatus} label={coldStorageLabel} />
                </div>
                <div className="services-cold-storage__row">
                  <Text variant="body-sm-semibold">Last reading</Text>
                  <Text variant="body-sm-normal">
                    {new Date(park.lab.coldStorage.lastReadingAt).toLocaleString()}
                  </Text>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </PageFrame>
  )
}
