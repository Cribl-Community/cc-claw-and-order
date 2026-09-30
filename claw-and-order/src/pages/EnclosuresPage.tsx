import {
  EMPTY_CELL_PLACEHOLDER,
  Table,
  ToggleButtonGroup,
  defineColumns,
  type Key,
} from '@capra/core'
import { AlertOutlined, Bolt, GroupOutlined, Heart, MappingOutlined, UsersOutlined } from '@capra/icons'
import { useCallback, useMemo, useState } from 'react'

type SortDescriptor = {
  column: Key
  direction: 'ascending' | 'descending'
}
import { speciesSilhouette } from '../assets/art'
import { MetricCard } from '../components/MetricCard'
import { PageFrame } from '../components/PageFrame'
import { StatusIndicator } from '../components/StatusIndicator'
import {
  selectDinosaurOperationalRisk,
  selectEnclosureById,
  selectEnclosureOperationalRisk,
  selectEnclosuresPageMetrics,
  selectSpeciesById,
} from '../model/selectors'
import type { OperationalStatus } from '../model/types'
import { usePark } from '../state/usePark'
import { useSimNow } from '../state/useSimNow'

type TabKey = 'dinosaurs' | 'enclosures' | 'species'

type RangeReading = {
  value: number | null
  min: number | null
  max: number | null
  unit: '°C' | '%'
}

type DinoRow = {
  id: string
  name: string
  speciesId: string
  species: string
  enclosure: string
  inherentThreat: number
  operationalRisk: OperationalStatus
  welfare: OperationalStatus
  tempEnv: RangeReading
  humidityEnv: RangeReading
  fenceV: string
  gate: string
  gateStatus: OperationalStatus
}

type EnclosureRow = {
  id: string
  name: string
  zone: string
  occupancy: string
  inherentThreat: string
  operationalRisk: OperationalStatus
  tempEnv: RangeReading
  humidityEnv: RangeReading
  fenceV: string
  gate: string
  gateStatus: OperationalStatus
}

type SpeciesRow = {
  id: string
  name: string
  diet: string
  inherentThreat: number
  sizeClass: string
  containmentClass: number
  tempReq: string
  humidityReq: string
  maxGroup: number
  behaviors: string
}

function formatReading(value: number | null | undefined, unit: string): string {
  if (value == null) return EMPTY_CELL_PLACEHOLDER
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return `${rounded}${unit}`
}

function toRange(
  value: number | null | undefined,
  range: { min: number; max: number } | undefined,
  unit: '°C' | '%',
): RangeReading {
  return {
    value: value ?? null,
    min: range?.min ?? null,
    max: range?.max ?? null,
    unit,
  }
}

function formatDelta(delta: number, unit: '°C' | '%'): string {
  const rounded = Number.isInteger(delta) ? String(delta) : delta.toFixed(1)
  return unit === '%' ? `${rounded}%` : `${rounded}°`
}

function RangeCell({ reading }: { reading: RangeReading }) {
  if (reading.value == null) {
    return <span className="env-range__missing">{EMPTY_CELL_PLACEHOLDER}</span>
  }

  const { value, min, max, unit } = reading
  const valueLabel = formatReading(value, unit)
  const hasBand = min != null && max != null
  const impossible = hasBand && min > max

  let tone: 'in' | 'out' | 'unknown' = 'unknown'
  let state = 'No requirement'
  let marker: number | null = null
  if (hasBand && !impossible) {
    if (value < min) {
      tone = 'out'
      state = `${formatDelta(min - value, unit)} below`
      marker = 0
    } else if (value > max) {
      tone = 'out'
      state = `${formatDelta(value - max, unit)} above`
      marker = 100
    } else {
      tone = 'in'
      state = 'In range'
      marker = max === min ? 50 : ((value - min) / (max - min)) * 100
    }
  } else if (impossible) {
    state = 'No shared range'
  }

  const band = hasBand ? `${min}–${max}${unit}` : null

  return (
    <div className={`env-range env-range--${tone}`}>
      <div className="env-range__head">
        <span className="env-range__value">{valueLabel}</span>
        <span className="env-range__state">{state}</span>
      </div>
      {marker != null ? (
        <div className="env-range__track" aria-hidden>
          <span
            className="env-range__marker"
            style={{ left: `${8 + (marker / 100) * 84}%` }}
          />
        </div>
      ) : null}
      {band ? <div className="env-range__band">Required {band}</div> : null}
    </div>
  )
}

function gateToStatus(status: string | undefined): OperationalStatus {
  switch (status) {
    case 'secured':
      return 'normal'
    case 'open':
      return 'warning'
    case 'fault':
      return 'critical'
    default:
      return 'unknown'
  }
}

function gateLabel(status: string | undefined): string {
  switch (status) {
    case 'secured':
      return 'Secured'
    case 'open':
      return 'Open'
    case 'fault':
      return 'Fault'
    default:
      return 'Unknown'
  }
}

const STATUS_SORT_RANK: Record<OperationalStatus, number> = {
  normal: 0,
  unknown: 1,
  warning: 2,
  critical: 3,
}

function readingSortValue(value: unknown): number | undefined {
  if (typeof value !== 'object' || value == null || !('unit' in value) || !('value' in value)) {
    return undefined
  }
  const reading = (value as RangeReading).value
  return reading ?? Number.POSITIVE_INFINITY
}

function compareValues(a: unknown, b: unknown): number {
  const rangeA = readingSortValue(a)
  const rangeB = readingSortValue(b)
  if (rangeA != null && rangeB != null) return rangeA - rangeB
  if (
    typeof a === 'string' &&
    typeof b === 'string' &&
    a in STATUS_SORT_RANK &&
    b in STATUS_SORT_RANK
  ) {
    return STATUS_SORT_RANK[a as OperationalStatus] - STATUS_SORT_RANK[b as OperationalStatus]
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' })
}

function sortRows<T extends { id: string | number }>(
  items: T[],
  sortDescriptor: SortDescriptor | undefined,
): T[] {
  if (!sortDescriptor?.column) return items
  const column = String(sortDescriptor.column) as keyof T
  const direction = sortDescriptor.direction === 'descending' ? -1 : 1
  return items.slice().sort((left, right) => {
    const cmp = compareValues(left[column], right[column])
    return cmp * direction
  })
}

function NameLink({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="table-name-link"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
    >
      {label}
    </button>
  )
}

function StatusCell({ status }: { status: OperationalStatus }) {
  return <StatusIndicator status={status} compact />
}

function threatTone(level: number): 'ok' | 'warn' | 'bad' {
  if (level >= 4) return 'bad'
  if (level >= 3) return 'warn'
  return 'ok'
}

function ThreatCell({ value }: { value: number | string }) {
  if (value === EMPTY_CELL_PLACEHOLDER || value === '' || value == null) {
    return <>{EMPTY_CELL_PLACEHOLDER}</>
  }
  const level = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(level)) return <>{String(value)}</>
  return <span className={`threat-num threat-num--${threatTone(level)}`}>{value}</span>
}

function metricStatusForCount(value: number): OperationalStatus {
  if (value === 0) return 'normal'
  if (value >= 3) return 'critical'
  return 'warning'
}

function capacityStatus(pct: number): OperationalStatus {
  if (pct >= 95) return 'critical'
  if (pct >= 80) return 'warning'
  return 'normal'
}

function fenceMetricStatus(avg: number | null, unknowns: number, min: number): OperationalStatus {
  if (avg == null) return unknowns > 0 ? 'unknown' : 'normal'
  if (avg < min * 0.85) return 'critical'
  if (avg < min || unknowns > 0) return 'warning'
  return 'normal'
}

export function EnclosuresPage() {
  const { park, config, setSelection, selection } = usePark()
  const [tab, setTab] = useState<TabKey>('dinosaurs')
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>({
    column: 'name',
    direction: 'ascending',
  })
  const now = useSimNow()

  const metrics = selectEnclosuresPageMetrics(park, config, now)
  const speciesById = selectSpeciesById(park)
  const enclosureById = selectEnclosureById(park)
  const tableDensity = config.density === 'compact' ? 'compact' : 'default'

  const dinoRows: DinoRow[] = park.dinosaurs.map((dino) => {
    const species = speciesById.get(dino.speciesId)
    const enclosure = enclosureById.get(dino.enclosureId)
    return {
      id: dino.id,
      name: dino.name,
      speciesId: dino.speciesId,
      species: species?.displayName ?? EMPTY_CELL_PLACEHOLDER,
      enclosure: enclosure?.name ?? EMPTY_CELL_PLACEHOLDER,
      inherentThreat: species?.inherentThreat ?? 0,
      operationalRisk: selectDinosaurOperationalRisk(park, dino, config, now),
      welfare: dino.welfareStatus,
      tempEnv: toRange(enclosure?.tempC, species?.tempRangeC, '°C'),
      humidityEnv: toRange(enclosure?.humidityPct, species?.humidityRangePct, '%'),
      fenceV: formatReading(enclosure?.fenceVoltage ?? null, ' V'),
      gate: gateLabel(enclosure?.gateStatus),
      gateStatus: gateToStatus(enclosure?.gateStatus),
    }
  })

  const enclosureRows: EnclosureRow[] = park.enclosures.map((enc) => {
    const occupants = park.dinosaurs.filter((d) => d.enclosureId === enc.id)
    const occupantSpecies = occupants
      .map((d) => speciesById.get(d.speciesId))
      .filter((s): s is NonNullable<typeof s> => s != null)
    const maxThreat =
      occupantSpecies.length === 0
        ? EMPTY_CELL_PLACEHOLDER
        : String(Math.max(...occupantSpecies.map((s) => s.inherentThreat)))
    const tempRanges = occupantSpecies.map((s) => s.tempRangeC)
    const humidityRanges = occupantSpecies.map((s) => s.humidityRangePct)
    const tightTemp =
      tempRanges.length === 0
        ? undefined
        : {
            min: Math.max(...tempRanges.map((r) => r.min)),
            max: Math.min(...tempRanges.map((r) => r.max)),
          }
    const tightHumidity =
      humidityRanges.length === 0
        ? undefined
        : {
            min: Math.max(...humidityRanges.map((r) => r.min)),
            max: Math.min(...humidityRanges.map((r) => r.max)),
          }
    return {
      id: enc.id,
      name: enc.name,
      zone: enc.zone,
      occupancy: `${occupants.length}/${enc.capacity}`,
      inherentThreat: maxThreat,
      operationalRisk: selectEnclosureOperationalRisk(park, enc, config, now),
      tempEnv: toRange(enc.tempC, tightTemp, '°C'),
      humidityEnv: toRange(enc.humidityPct, tightHumidity, '%'),
      fenceV: formatReading(enc.fenceVoltage, ' V'),
      gate: gateLabel(enc.gateStatus),
      gateStatus: gateToStatus(enc.gateStatus),
    }
  })

  const speciesRows: SpeciesRow[] = park.species.map((species) => ({
    id: species.id,
    name: species.displayName,
    diet: species.diet,
    inherentThreat: species.inherentThreat,
    sizeClass: species.sizeClass,
    containmentClass: species.containmentClass,
    tempReq: `${species.tempRangeC.min}–${species.tempRangeC.max}°C`,
    humidityReq: `${species.humidityRangePct.min}–${species.humidityRangePct.max}%`,
    maxGroup: species.maxGroupSize,
    behaviors:
      species.behaviorTags.length === 0
        ? EMPTY_CELL_PLACEHOLDER
        : species.behaviorTags.join(', '),
  }))

  const openAsset = useCallback(
    (id: string) => setSelection({ kind: 'asset', id }),
    [setSelection],
  )

  const dinoColumns = useMemo(
    () =>
      defineColumns<DinoRow>([
        { id: 'name', label: 'Name', allowsSorting: true, render: (_value, item) => <NameLink label={item.name} onOpen={() => openAsset(item.id)} /> },
        {
          id: 'species',
          label: 'Species',
          allowsSorting: true,
          render: (_value, item) => {
            const mark = speciesSilhouette(item.speciesId)
            return (
              <span className="species-cell">
                {mark ? (
                  <img className="species-cell__mark" src={mark} alt="" data-art="silhouette" />
                ) : null}
                {item.species}
              </span>
            )
          },
        },
        { id: 'enclosure', label: 'Enclosure', allowsSorting: true },
        { id: 'inherentThreat', label: 'Threat', allowsSorting: true, render: (value) => <ThreatCell value={value as number} /> },
        {
          id: 'operationalRisk',
          label: 'Risk',
          allowsSorting: true,
          render: (value) => <StatusCell status={value as OperationalStatus} />,
        },
        {
          id: 'welfare',
          label: 'Welfare',
          allowsSorting: true,
          render: (value) => <StatusCell status={value as OperationalStatus} />,
        },
        {
          id: 'tempEnv',
          label: 'Temperature',
          allowsSorting: true,
          render: (_value, item) => <RangeCell reading={item.tempEnv} />,
        },
        {
          id: 'humidityEnv',
          label: 'Humidity',
          allowsSorting: true,
          render: (_value, item) => <RangeCell reading={item.humidityEnv} />,
        },
        { id: 'fenceV', label: 'Fence V', allowsSorting: true },
        {
          id: 'gate',
          label: 'Gate',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.gateStatus} label={item.gate} />
          ),
        },
      ]),
    [openAsset],
  )

  const enclosureColumns = useMemo(
    () =>
      defineColumns<EnclosureRow>([
        {
          id: 'name',
          label: 'Name',
          allowsSorting: true,
          render: (_value, item) => <NameLink label={item.name} onOpen={() => openAsset(item.id)} />,
        },
        { id: 'zone', label: 'Zone', allowsSorting: true },
        { id: 'occupancy', label: 'Occupancy', allowsSorting: true },
        { id: 'inherentThreat', label: 'Threat', allowsSorting: true, render: (value) => <ThreatCell value={value as string} /> },
        {
          id: 'operationalRisk',
          label: 'Risk',
          allowsSorting: true,
          render: (value) => <StatusCell status={value as OperationalStatus} />,
        },
        {
          id: 'tempEnv',
          label: 'Temperature',
          allowsSorting: true,
          render: (_value, item) => <RangeCell reading={item.tempEnv} />,
        },
        {
          id: 'humidityEnv',
          label: 'Humidity',
          allowsSorting: true,
          render: (_value, item) => <RangeCell reading={item.humidityEnv} />,
        },
        { id: 'fenceV', label: 'Fence V', allowsSorting: true },
        {
          id: 'gate',
          label: 'Gate',
          allowsSorting: true,
          render: (_value, item) => (
            <StatusIndicator status={item.gateStatus} label={item.gate} />
          ),
        },
      ]),
    [openAsset],
  )

  const speciesColumns = useMemo(
    () =>
      defineColumns<SpeciesRow>([
        {
          id: 'name',
          label: 'Name',
          allowsSorting: true,
          render: (_value, item) => {
            const mark = speciesSilhouette(item.id)
            return (
              <span className="species-cell">
                {mark ? (
                  <img className="species-cell__mark" src={mark} alt="" data-art="silhouette" />
                ) : null}
                {item.name}
              </span>
            )
          },
        },
        { id: 'diet', label: 'Diet', allowsSorting: true },
        { id: 'inherentThreat', label: 'Threat', allowsSorting: true, render: (value) => <ThreatCell value={value as number} /> },
        { id: 'sizeClass', label: 'Size', allowsSorting: true },
        { id: 'containmentClass', label: 'Containment', allowsSorting: true },
        { id: 'tempReq', label: 'Temp req', allowsSorting: true },
        { id: 'humidityReq', label: 'Humidity req', allowsSorting: true },
        { id: 'maxGroup', label: 'Max group', allowsSorting: true },
        { id: 'behaviors', label: 'Behaviors', allowsSorting: true },
      ]),
    [],
  )

  const sortedDinos = useMemo(() => sortRows(dinoRows, sortDescriptor), [dinoRows, sortDescriptor])
  const sortedEnclosures = useMemo(
    () => sortRows(enclosureRows, sortDescriptor),
    [enclosureRows, sortDescriptor],
  )
  const sortedSpecies = useMemo(
    () => sortRows(speciesRows, sortDescriptor),
    [speciesRows, sortDescriptor],
  )

  const selectedAssetKeys = useMemo(() => {
    if (selection?.kind !== 'asset') return new Set<Key>()
    return new Set<Key>([selection.id])
  }, [selection])

  const onTableSelectionChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const id = [...keys][0]
    if (typeof id === 'string' && id.length > 0) {
      setSelection({ kind: 'asset', id })
    }
  }

  const onTabChange = (keys: Set<Key>) => {
    const next = [...keys][0]
    if (next === 'dinosaurs' || next === 'enclosures' || next === 'species') {
      setTab(next)
      setSortDescriptor({ column: 'name', direction: 'ascending' })
    }
  }

  const fenceValue =
    metrics.avgFenceVoltage == null
      ? EMPTY_CELL_PLACEHOLDER
      : `${metrics.avgFenceVoltage.toLocaleString()} V`

  return (
    <PageFrame title="Enclosures & Dinosaurs">
      <div className="app-grid-span-12 overview-kpi-row">
        <MetricCard
          tone="brand"
          icon={<AlertOutlined size="sm" aria-hidden />}
          label="Enclosure alerts"
          value={metrics.enclosureAlerts}
          status={metricStatusForCount(metrics.enclosureAlerts)}
        />
        <MetricCard
          tone="brand"
          icon={<Heart size="sm" aria-hidden />}
          label="Welfare alerts"
          value={metrics.welfareAlerts}
          status={metricStatusForCount(metrics.welfareAlerts)}
        />
        <MetricCard
          tone="brand"
          icon={<Bolt size="sm" aria-hidden />}
          label="Avg fence voltage"
          value={fenceValue}
          status={fenceMetricStatus(
            metrics.avgFenceVoltage,
            metrics.fenceUnknownCount,
            config.fenceVoltageMin,
          )}
        >
          {metrics.fenceUnknownCount > 0
            ? `${metrics.fenceUnknownCount} unknown reading${metrics.fenceUnknownCount === 1 ? '' : 's'}`
            : null}
        </MetricCard>
        <MetricCard
          tone="brand"
          icon={<UsersOutlined size="sm" aria-hidden />}
          label="Capacity utilization"
          value={`${metrics.capacityUtilizationPct}%`}
          status={capacityStatus(metrics.capacityUtilizationPct)}
        />
      </div>

      <div className="app-grid-span-12 enclosures-table-toolbar">
        <ToggleButtonGroup
          aria-label="Enclosures catalog"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([tab])}
          onSelectionChange={onTabChange}
          items={[
            { key: 'dinosaurs', text: 'Dinosaurs', icon: UsersOutlined },
            { key: 'enclosures', text: 'Enclosures', icon: MappingOutlined },
            { key: 'species', text: 'Species', icon: GroupOutlined },
          ]}
        />
      </div>

      <div className="app-grid-span-12">
        {tab === 'dinosaurs' ? (
          <Table
            columns={dinoColumns}
            visibleColumns={[
              'name',
              'species',
              'enclosure',
              'inherentThreat',
              'operationalRisk',
              'welfare',
              'tempEnv',
              'humidityEnv',
              'fenceV',
              'gate',
            ]}
            items={sortedDinos}
            density={tableDensity}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
            selectionMode="single"
            selectedKeys={selectedAssetKeys}
            onSelectionChange={onTableSelectionChange}
          />
        ) : null}

        {tab === 'enclosures' ? (
          <Table
            columns={enclosureColumns}
            visibleColumns={[
              'name',
              'zone',
              'occupancy',
              'inherentThreat',
              'operationalRisk',
              'tempEnv',
              'humidityEnv',
              'fenceV',
              'gate',
            ]}
            items={sortedEnclosures}
            density={tableDensity}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
            selectionMode="single"
            selectedKeys={selectedAssetKeys}
            onSelectionChange={onTableSelectionChange}
          />
        ) : null}

        {tab === 'species' ? (
          <Table
            columns={speciesColumns}
            visibleColumns={[
              'name',
              'diet',
              'inherentThreat',
              'sizeClass',
              'containmentClass',
              'tempReq',
              'humidityReq',
              'maxGroup',
              'behaviors',
            ]}
            items={sortedSpecies}
            density={tableDensity}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          />
        ) : null}
      </div>
    </PageFrame>
  )
}
