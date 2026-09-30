import {
  EMPTY_CELL_PLACEHOLDER,
  Table,
  defineColumns,
  type Key,
} from '@capra/core'
import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { facilityArt } from '../assets/art'
import { MetricCard } from '../components/MetricCard'
import { PageFrame } from '../components/PageFrame'
import { StatusIndicator } from '../components/StatusIndicator'
import {
  incubatorOperationalStatus,
  labKpis,
  machineOperationalStatus,
  worstEggWeightDeviation,
} from '../model/lab'
import { selectSpeciesById } from '../model/selectors'
import { isReadingStale } from '../model/status'
import type { OperationalStatus } from '../model/types'
import { usePark } from '../state/usePark'
import { useSimNow } from '../state/useSimNow'

type IncubatorRow = {
  id: string
  name: string
  species: string
  door: string
  doorStatus: OperationalStatus
  temp: string
  humidity: string
  eggCount: number
  weight: string
  weightStatus: OperationalStatus
  hatchDate: string
  status: OperationalStatus
}

type MachineRow = {
  id: string
  name: string
  kind: string
  powered: string
  temp: string
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

function formatReading(value: number | null | undefined, unit: string): string {
  if (value == null) return EMPTY_CELL_PLACEHOLDER
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return `${rounded}${unit}`
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

export function LabPage() {
  const { park, config, selection, setSelection } = usePark()
  const now = useSimNow()
  const speciesById = selectSpeciesById(park)
  const tableDensity = config.density === 'compact' ? 'compact' : 'default'
  const kpis = labKpis(park, config, now)

  const openAsset = useCallback(
    (id: string) => setSelection({ kind: 'asset', id }),
    [setSelection],
  )

  const incubatorRows: IncubatorRow[] = useMemo(
    () =>
      park.lab.incubators.map((inc) => {
        const species = speciesById.get(inc.speciesId)
        const worst = worstEggWeightDeviation(inc)
        const weight =
          worst.weightG == null || worst.range == null
            ? EMPTY_CELL_PLACEHOLDER
            : `${worst.weightG} g · ${worst.range.min}–${worst.range.max}`
        let weightStatus: OperationalStatus = 'normal'
        if (worst.weightG == null) weightStatus = 'unknown'
        else if (worst.outOfRange) weightStatus = 'warning'
        const doorStatus: OperationalStatus =
          inc.door === 'open' ? 'warning' : inc.door === 'unknown' ? 'unknown' : 'normal'
        return {
          id: inc.id,
          name: inc.name,
          species: species?.displayName ?? EMPTY_CELL_PLACEHOLDER,
          door: inc.door,
          doorStatus,
          temp: formatReading(inc.tempC, '°C'),
          humidity: formatReading(inc.humidityPct, '%'),
          eggCount: inc.eggs.length,
          weight,
          weightStatus,
          hatchDate: new Date(inc.expectedHatchAt).toLocaleDateString(),
          status: incubatorOperationalStatus(inc, now, config.staleThresholdSec),
        }
      }),
    [park.lab.incubators, speciesById, now, config.staleThresholdSec],
  )

  const airlock = useMemo(
    () => park.lab.machines.find((m) => m.kind === 'airlock') ?? null,
    [park.lab.machines],
  )

  const airlockStatus = useMemo(() => {
    if (airlock == null) return null
    const status = machineOperationalStatus(airlock, now, config.staleThresholdSec)
    const stale = isReadingStale(airlock.lastReadingAt, now, config.staleThresholdSec)
    let statusLabel = 'Secured'
    if (stale) statusLabel = 'Stale'
    else if (!airlock.powered) statusLabel = 'Unpowered'
    else if (status === 'warning') statusLabel = 'Warning'
    else if (status === 'unknown') statusLabel = 'Unknown'
    else if (status === 'normal') statusLabel = 'Secured'
    return { status, statusLabel }
  }, [airlock, now, config.staleThresholdSec])

  const machineRows: MachineRow[] = useMemo(
    () =>
      park.lab.machines
        .filter((machine) => machine.kind !== 'airlock')
        .map((machine) => {
          const status = machineOperationalStatus(machine, now, config.staleThresholdSec)
          const stale = isReadingStale(machine.lastReadingAt, now, config.staleThresholdSec)
          let statusLabel = 'Normal'
          if (stale) statusLabel = 'Stale'
          else if (!machine.powered) statusLabel = 'Unpowered'
          else if (status === 'warning') statusLabel = 'Out of range'
          else if (status === 'unknown') statusLabel = 'Unknown'
          return {
            id: machine.id,
            name: machine.name,
            kind: machine.kind,
            powered: machine.powered ? 'Yes' : 'No',
            temp:
              machine.tempRangeC == null
                ? EMPTY_CELL_PLACEHOLDER
                : formatReading(machine.tempC, '°C'),
            status,
            statusLabel,
            freshness: formatWhen(machine.lastReadingAt),
          }
        }),
    [park.lab.machines, now, config.staleThresholdSec],
  )

  const selectedAssetKeys = useMemo(() => {
    if (selection?.kind !== 'asset') return new Set<Key>()
    return new Set<Key>([selection.id])
  }, [selection])

  const onTableSelectionChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const id = [...keys][0]
    if (typeof id === 'string' && id.length > 0) setSelection({ kind: 'asset', id })
  }

  const incubatorColumns = useMemo(
    () =>
      defineColumns<IncubatorRow>([
        {
          id: 'name',
          label: 'Incubator',
          allowsSorting: true,
          render: (_value, item) => <NameLink label={item.name} onOpen={() => openAsset(item.id)} />,
        },
        { id: 'species', label: 'Species', allowsSorting: true },
        {
          id: 'door',
          label: 'Door',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.doorStatus} label={item.door} />
          ),
        },
        { id: 'temp', label: 'Temp', allowsSorting: true },
        { id: 'humidity', label: 'Humidity', allowsSorting: true },
        { id: 'eggCount', label: 'Eggs', allowsSorting: true },
        {
          id: 'weight',
          label: 'Worst weight',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.weightStatus} label={item.weight} />
          ),
        },
        { id: 'hatchDate', label: 'Expected hatch', allowsSorting: true },
        {
          id: 'status',
          label: 'Status',
          allowsSorting: true,
          render: (_value, item) => <StatusIndicator status={item.status} />,
        },
      ]),
    [openAsset],
  )

  const machineColumns = useMemo(
    () =>
      defineColumns<MachineRow>([
        {
          id: 'name',
          label: 'Machine',
          allowsSorting: true,
          render: (_value, item) => <NameLink label={item.name} onOpen={() => openAsset(item.id)} />,
        },
        { id: 'kind', label: 'Kind', allowsSorting: true },
        { id: 'powered', label: 'Powered', allowsSorting: true },
        { id: 'temp', label: 'Temp', allowsSorting: true },
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

  const boundsStatus: OperationalStatus =
    kpis.incubatorsInBounds < kpis.incubatorsTotal ? 'warning' : 'normal'
  const doorsStatus: OperationalStatus = kpis.doorsOpen > 0 ? 'warning' : 'normal'
  const powerStatus: OperationalStatus =
    kpis.machinesPowered < kpis.machinesTotal ? 'warning' : 'normal'
  const hatchStatus: OperationalStatus = kpis.hatchesInWindow > 0 ? 'warning' : 'normal'

  return (
    <PageFrame title="Lab">
      <div className="app-grid-span-12 overview-kpi-row">
        <MetricCard
          tone="brand"
          label="Incubators in bounds"
          value={`${kpis.incubatorsInBounds}/${kpis.incubatorsTotal}`}
          status={boundsStatus}
        />
        <MetricCard
          tone="brand"
          label="Doors open"
          value={String(kpis.doorsOpen)}
          status={doorsStatus}
        />
        <MetricCard
          tone="brand"
          label="Machines powered"
          value={`${kpis.machinesPowered}/${kpis.machinesTotal}`}
          status={powerStatus}
        />
        <MetricCard
          tone="brand"
          label="Hatches in window"
          value={String(kpis.hatchesInWindow)}
          status={hatchStatus}
        />
      </div>

      {airlock && airlockStatus ? (
        <section className="app-grid-span-12 overview-panel overview-panel--brand services-panel lab-airlock">
          <div className="lab-airlock__header">
            <div>
              <h2 className="overview-panel__title">Lab airlock</h2>
              <p className="overview-panel__sub">
                Primary ingress and egress. Power loss or a stale reading means the lab boundary is
                unknown.
              </p>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => openAsset(airlock.id)}
            >
              Investigate
            </button>
          </div>
          <button
            type="button"
            className="lab-airlock__body"
            onClick={() => openAsset(airlock.id)}
          >
            <div className="lab-airlock__value">{airlock.powered ? 'Powered' : 'Unpowered'}</div>
            <StatusIndicator status={airlockStatus.status} label={airlockStatus.statusLabel} />
            <p className="services-cold__meta">
              Last reading {formatWhen(airlock.lastReadingAt)}
            </p>
          </button>
        </section>
      ) : null}

      <Panel
        title="Incubators"
        description="Door open is a security warning. Climate or egg weight outside range is operational."
      >
        {facilityArt('incubator') ? (
          <img
            className="facility-art"
            src={facilityArt('incubator')}
            alt=""
            data-art="facility"
          />
        ) : null}
        <Table
          columns={incubatorColumns}
          visibleColumns={[
            'name',
            'species',
            'door',
            'temp',
            'humidity',
            'eggCount',
            'weight',
            'hatchDate',
            'status',
          ]}
          items={incubatorRows}
          density={tableDensity}
          selectionMode="single"
          selectedKeys={selectedAssetKeys}
          onSelectionChange={onTableSelectionChange}
        />
      </Panel>

      <Panel
        title="Cold storage"
        description="Specimen cooler and sample freezer. Unpowered or out of range is a warning."
      >
        {facilityArt('cold-storage') ? (
          <img
            className="facility-art"
            src={facilityArt('cold-storage')}
            alt=""
            data-art="facility"
          />
        ) : null}
        <Table
          columns={machineColumns}
          visibleColumns={['name', 'kind', 'powered', 'temp', 'status', 'freshness']}
          items={machineRows}
          density={tableDensity}
          selectionMode="single"
          selectedKeys={selectedAssetKeys}
          onSelectionChange={onTableSelectionChange}
        />
      </Panel>
    </PageFrame>
  )
}
