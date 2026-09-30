import {
  EMPTY_CELL_PLACEHOLDER,
  Table,
  defineColumns,
  type Key,
} from '@capra/core'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { facilityArt } from '../assets/art'
import { BatteryLevel } from '../components/BatteryLevel'
import { MetricCard } from '../components/MetricCard'
import { PageFrame } from '../components/PageFrame'
import { StatusIndicator } from '../components/StatusIndicator'
import {
  FLEET_BATTERY_MIN_PCT,
  fleetKpis,
  isDepartureUncovered,
} from '../model/fleet'
import { isReadingStale } from '../model/status'
import type { OperationalStatus, SafariRoute, Vehicle } from '../model/types'
import { usePark } from '../state/usePark'
import { useSimNow } from '../state/useSimNow'

type DepartureRow = {
  id: string
  routeId: string
  routeName: string
  routeStatus: OperationalStatus
  routeStatusLabel: string
  departsAt: string
  vehicleId: string
  coverage: OperationalStatus
  coverageLabel: string
  batteryPct: number | null
  batteryStatus: OperationalStatus
  readinessLabel: string
  utilization: string
}

type VehicleRow = {
  id: string
  model: string
  routeName: string
  batteryPct: number | null
  batteryStatus: OperationalStatus
  readiness: OperationalStatus
  readinessLabel: string
  chargerId: string
  seats: string
  nextDeparture: string
}

type ChargerRow = {
  id: string
  powered: string
  vehicleId: string
  status: OperationalStatus
  statusLabel: string
  freshness: string
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
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

function batteryStatus(batteryPct: number | null, lastReadingAt: number, now: number, staleSec: number): OperationalStatus {
  if (batteryPct == null || isReadingStale(lastReadingAt, now, staleSec)) return 'unknown'
  if (batteryPct < 20) return 'critical'
  if (batteryPct < FLEET_BATTERY_MIN_PCT) return 'warning'
  return 'normal'
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

export function FleetPage() {
  const { park, config, selection, setSelection } = usePark()
  const now = useSimNow()
  const tableDensity = config.density === 'compact' ? 'compact' : 'default'
  const kpis = fleetKpis(park, config, now)
  const vehiclesById = useMemo(() => new Map(park.vehicles.map((v) => [v.id, v])), [park.vehicles])
  const routeNameById = useMemo(
    () => new Map(park.safariRoutes.map((r) => [r.id, r.name])),
    [park.safariRoutes],
  )

  const openAsset = useCallback(
    (id: string) => setSelection({ kind: 'asset', id }),
    [setSelection],
  )

  const departureRows: DepartureRow[] = useMemo(
    () =>
      park.safariRoutes.flatMap((route) =>
        route.departures.map((dep) => {
          const vehicle = vehiclesById.get(dep.vehicleId)
          const uncovered = isDepartureUncovered(
            dep,
            vehicle,
            now,
            config.staleThresholdSec,
          )
          const utilPct = dep.seats === 0 ? 0 : Math.round((dep.occupied / dep.seats) * 100)
          return {
            id: dep.id,
            routeId: route.id,
            routeName: route.name,
            routeStatus: routeStatus(route.status),
            routeStatusLabel: routeStatusLabel(route.status),
            departsAt: formatWhen(dep.departsAt),
            vehicleId: dep.vehicleId,
            coverage: uncovered ? 'warning' : 'normal',
            coverageLabel: uncovered ? 'Uncovered' : 'Covered',
            batteryPct: vehicle?.batteryPct ?? null,
            batteryStatus: vehicle
              ? batteryStatus(
                  vehicle.batteryPct,
                  vehicle.lastReadingAt,
                  now,
                  config.staleThresholdSec,
                )
              : 'unknown',
            readinessLabel: vehicle ? readinessLabel(vehicle.readiness) : 'Missing',
            utilization: `${dep.occupied}/${dep.seats} (${utilPct}%)`,
          }
        }),
      ),
    [park.safariRoutes, vehiclesById, now, config.staleThresholdSec],
  )

  const vehicleRows: VehicleRow[] = useMemo(() => {
    return park.vehicles.map((v) => {
      const next = park.safariRoutes
        .flatMap((route) =>
          route.departures
            .filter((dep) => dep.vehicleId === v.id)
            .map((dep) => dep.departsAt),
        )
        .sort((a, b) => a - b)[0]
      return {
        id: v.id,
        model: v.model,
        routeName: routeNameById.get(v.routeId) ?? EMPTY_CELL_PLACEHOLDER,
        batteryPct: v.batteryPct,
        batteryStatus: batteryStatus(v.batteryPct, v.lastReadingAt, now, config.staleThresholdSec),
        readiness: readinessStatus(v.readiness),
        readinessLabel: readinessLabel(v.readiness),
        chargerId: v.chargerId ?? EMPTY_CELL_PLACEHOLDER,
        seats: `${v.occupiedSeats}/${v.seats}`,
        nextDeparture: next == null ? EMPTY_CELL_PLACEHOLDER : formatWhen(next),
      }
    })
  }, [park.vehicles, park.safariRoutes, routeNameById, now, config.staleThresholdSec])

  const chargerRows: ChargerRow[] = useMemo(
    () =>
      park.chargers.map((c) => {
        const occupant = park.vehicles.find((v) => v.chargerId === c.id)
        const stale = isReadingStale(c.lastReadingAt, now, config.staleThresholdSec)
        let status: OperationalStatus = 'normal'
        let statusLabel = 'Available'
        if (stale) {
          status = 'unknown'
          statusLabel = 'Stale'
        } else if (!c.powered) {
          status = 'critical'
          statusLabel = 'Unpowered'
        } else if (occupant) {
          status = 'warning'
          statusLabel = 'In use'
        }
        return {
          id: c.id,
          powered: c.powered ? 'Yes' : 'No',
          vehicleId: occupant?.id ?? EMPTY_CELL_PLACEHOLDER,
          status,
          statusLabel,
          freshness: formatWhen(c.lastReadingAt),
        }
      }),
    [park.chargers, park.vehicles, now, config.staleThresholdSec],
  )

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

  const onTableSelectionChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const id = [...keys][0]
    if (typeof id === 'string' && id.length > 0) setSelection({ kind: 'asset', id })
  }

  const onDepartureSelectionChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const id = [...keys][0]
    if (typeof id !== 'string') return
    const row = departureRows.find((r) => r.id === id)
    if (row) setSelection({ kind: 'asset', id: row.vehicleId })
  }

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
          label: 'Route',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.routeStatus} label={item.routeStatusLabel} />
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
        {
          id: 'coverage',
          label: 'Coverage',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.coverage} label={item.coverageLabel} />
          ),
        },
        {
          id: 'batteryPct',
          label: 'Battery',
          allowsSorting: true,
          render: (_value, item) => (
            <BatteryLevel percent={item.batteryPct} status={item.batteryStatus} />
          ),
        },
        { id: 'readinessLabel', label: 'Readiness', allowsSorting: true },
        { id: 'utilization', label: 'Seats', allowsSorting: true },
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
        { id: 'model', label: 'Model', allowsSorting: true },
        { id: 'routeName', label: 'Route', allowsSorting: true },
        {
          id: 'batteryPct',
          label: 'Battery',
          allowsSorting: true,
          render: (_value, item) => (
            <BatteryLevel percent={item.batteryPct} status={item.batteryStatus} />
          ),
        },
        {
          id: 'readiness',
          label: 'Readiness',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.readiness} label={item.readinessLabel} />
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
        { id: 'seats', label: 'Seats', allowsSorting: true },
        { id: 'nextDeparture', label: 'Next departure', allowsSorting: true },
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
        {
          id: 'vehicleId',
          label: 'Vehicle',
          allowsSorting: true,
          render: (_value, item) =>
            item.vehicleId === EMPTY_CELL_PLACEHOLDER ? (
              item.vehicleId
            ) : (
              <NameLink label={item.vehicleId} onOpen={() => openAsset(item.vehicleId)} />
            ),
        },
        {
          id: 'status',
          label: 'Status',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.status} label={item.statusLabel} />
          ),
        },
        { id: 'freshness', label: 'Last reading', allowsSorting: true },
      ]),
    [openAsset],
  )

  const coveredStatus: OperationalStatus =
    kpis.departuresCovered < kpis.departuresTotal ? 'warning' : 'normal'
  const readyStatus: OperationalStatus =
    kpis.vehiclesReady < kpis.vehiclesTotal ? 'warning' : 'normal'
  const chargerStatus: OperationalStatus =
    kpis.chargersPowered < kpis.chargersTotal ? 'warning' : 'normal'
  const assignedStatus: OperationalStatus = kpis.assignedNotReady > 0 ? 'warning' : 'normal'

  return (
    <PageFrame title="Fleet">
      <div className="app-grid-span-12 overview-kpi-row">
        <MetricCard
          tone="brand"
          label="Vehicles ready"
          value={`${kpis.vehiclesReady}/${kpis.vehiclesTotal}`}
          status={readyStatus}
        />
        <MetricCard
          tone="brand"
          label="Departures covered"
          value={`${kpis.departuresCovered}/${kpis.departuresTotal}`}
          status={coveredStatus}
        />
        <MetricCard
          tone="brand"
          label="Chargers powered"
          value={`${kpis.chargersPowered}/${kpis.chargersTotal}`}
          status={chargerStatus}
        />
        <MetricCard
          tone="brand"
          label="Assigned not ready"
          value={String(kpis.assignedNotReady)}
          status={assignedStatus}
        />
      </div>

      <Panel
        title="Departures"
        description={`A departure is uncovered when its vehicle is not ready, stale, or under ${FLEET_BATTERY_MIN_PCT}% charge.`}
      >
        <Table
          columns={departureColumns}
          visibleColumns={[
            'routeName',
            'routeStatus',
            'departsAt',
            'vehicleId',
            'coverage',
            'batteryPct',
            'readinessLabel',
            'utilization',
          ]}
          items={departureRows}
          density={tableDensity}
          selectionMode="single"
          selectedKeys={selectedDepartureKeys}
          onSelectionChange={onDepartureSelectionChange}
        />
      </Panel>

      <Panel title="EV fleet" description="Battery, readiness, charger, and next assigned departure.">
        {facilityArt('vehicle') ? (
          <img
            className="facility-art"
            src={facilityArt('vehicle')}
            alt=""
            data-art="facility"
          />
        ) : null}
        <Table
          columns={vehicleColumns}
          visibleColumns={[
            'id',
            'model',
            'routeName',
            'batteryPct',
            'readiness',
            'chargerId',
            'seats',
            'nextDeparture',
          ]}
          items={vehicleRows}
          density={tableDensity}
          selectionMode="single"
          selectedKeys={selectedAssetKeys}
          onSelectionChange={onTableSelectionChange}
        />
      </Panel>

      <Panel title="Chargers" description="Power, occupant, and freshness. Unpowered is not available.">
        {facilityArt('charger') ? (
          <img
            className="facility-art"
            src={facilityArt('charger')}
            alt=""
            data-art="facility"
          />
        ) : null}
        <Table
          columns={chargerColumns}
          visibleColumns={['id', 'powered', 'vehicleId', 'status', 'freshness']}
          items={chargerRows}
          density={tableDensity}
          selectionMode="single"
          selectedKeys={selectedAssetKeys}
          onSelectionChange={onTableSelectionChange}
        />
      </Panel>
    </PageFrame>
  )
}
