import { Button, Divider, Drawer, Link, Text, TextArea } from '@capra/core'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { deriveOperationalStatus, isReadingStale } from '../model/status'
import type {
  Attraction,
  Charger,
  Dinosaur,
  Enclosure,
  Incident,
  Incubator,
  Infrastructure,
  OperationalStatus,
  ParkModel,
  SafariRoute,
  Vehicle,
} from '../model/types'
import { usePark } from '../state/usePark'
import type { Selection } from '../state/ParkProvider'
import { StatusIndicator } from './StatusIndicator'

type Resolved =
  | { type: 'enclosure'; entity: Enclosure }
  | { type: 'dinosaur'; entity: Dinosaur }
  | { type: 'vehicle'; entity: Vehicle }
  | { type: 'infrastructure'; entity: Infrastructure }
  | { type: 'attraction'; entity: Attraction }
  | { type: 'charger'; entity: Charger }
  | { type: 'incubator'; entity: Incubator }
  | { type: 'safariRoute'; entity: SafariRoute }
  | { type: 'incident'; entity: Incident }
  | { type: 'unknown'; id: string }

type ReadingRow = {
  key: string
  label: string
  value: string
  threshold?: string
  status?: OperationalStatus
}

function resolveEntity(park: ParkModel, selection: NonNullable<Selection>): Resolved {
  const { id, kind } = selection
  if (kind === 'incident') {
    const incident = park.incidents.find((i) => i.id === id)
    return incident ? { type: 'incident', entity: incident } : { type: 'unknown', id }
  }

  const enclosure = park.enclosures.find((e) => e.id === id)
  if (enclosure) return { type: 'enclosure', entity: enclosure }

  const dinosaur = park.dinosaurs.find((d) => d.id === id)
  if (dinosaur) return { type: 'dinosaur', entity: dinosaur }

  const vehicle = park.vehicles.find((v) => v.id === id)
  if (vehicle) return { type: 'vehicle', entity: vehicle }

  const infrastructure = park.infrastructure.find((i) => i.id === id)
  if (infrastructure) return { type: 'infrastructure', entity: infrastructure }

  const attraction = park.attractions.find((a) => a.id === id)
  if (attraction) return { type: 'attraction', entity: attraction }

  const charger = park.chargers.find((c) => c.id === id)
  if (charger) return { type: 'charger', entity: charger }

  const incubator = park.lab.incubators.find((i) => i.id === id)
  if (incubator) return { type: 'incubator', entity: incubator }

  const safariRoute = park.safariRoutes.find((r) => r.id === id)
  if (safariRoute) return { type: 'safariRoute', entity: safariRoute }

  return { type: 'unknown', id }
}

function chargerOperationalStatus(
  charger: Charger,
  now: number,
  staleThresholdSec: number,
): OperationalStatus {
  if (isReadingStale(charger.lastReadingAt, now, staleThresholdSec)) return 'unknown'
  if (!charger.powered) return 'critical'
  if (!charger.available) return 'warning'
  return 'normal'
}

function safariRouteOperationalStatus(status: SafariRoute['status']): OperationalStatus {
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

function assetLabel(park: ParkModel, assetId: string): string {
  return (
    park.enclosures.find((e) => e.id === assetId)?.name ??
    park.dinosaurs.find((d) => d.id === assetId)?.name ??
    park.vehicles.find((v) => v.id === assetId)?.id ??
    park.infrastructure.find((i) => i.id === assetId)?.name ??
    park.attractions.find((a) => a.id === assetId)?.name ??
    park.chargers.find((c) => c.id === assetId)?.id ??
    park.lab.incubators.find((i) => i.id === assetId)?.id ??
    park.safariRoutes.find((r) => r.id === assetId)?.name ??
    assetId
  )
}

function formatWhen(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts).toLocaleString()
}

function formatNumber(value: number | null | undefined, unit = ''): string {
  if (value == null) return '—'
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return unit ? `${rounded} ${unit}` : rounded
}

function severityStatus(severity: Incident['severity']): OperationalStatus {
  return severity === 'critical' ? 'critical' : 'warning'
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

function TrendSparkline({
  samples,
  metricKey,
}: {
  samples: { t: number; values: Record<string, number | null> }[]
  metricKey: string
}) {
  const points = samples
    .map((s) => s.values[metricKey])
    .filter((v): v is number => typeof v === 'number')

  if (points.length < 2) {
    return (
      <Text variant="body-sm-normal" color="subtle">
        Not enough samples for trend.
      </Text>
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const w = 220
  const h = 40
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      className="investigation-drawer__sparkline"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      role="img"
      aria-label={`${metricKey} trend, ${points.length} samples`}
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function RelatedLink({
  label,
  onSelect,
}: {
  label: string
  onSelect: () => void
}) {
  return (
    <li>
      <Link
        as="button"
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onSelect()
        }}
      >
        {label}
      </Link>
    </li>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="investigation-drawer__section">
      <Text variant="body-sm-semibold" as="h3">
        {title}
      </Text>
      <div className="investigation-drawer__section-body">{children}</div>
    </section>
  )
}

export function InvestigationDrawer() {
  const {
    park,
    config,
    operator,
    selection,
    setSelection,
    acknowledgeIncident,
    saveNote,
  } = usePark()

  const now = Date.now()
  const resolved = useMemo(
    () => (selection ? resolveEntity(park, selection) : null),
    [park, selection],
  )

  const noteTargetId = selection?.id ?? ''
  const persistedNote = operator.notes[noteTargetId]?.text ?? ''
  const [noteDraft, setNoteDraft] = useState(persistedNote)
  const [ackPending, setAckPending] = useState(false)
  const [notePending, setNotePending] = useState(false)

  useEffect(() => {
    setNoteDraft(persistedNote)
  }, [noteTargetId, persistedNote])

  const history = selection ? (park.readingHistory[selection.id] ?? []) : []

  const title = useMemo(() => {
    if (!resolved) return 'Investigation'
    switch (resolved.type) {
      case 'enclosure':
        return resolved.entity.name
      case 'dinosaur':
        return resolved.entity.name
      case 'vehicle':
        return resolved.entity.id
      case 'infrastructure':
        return resolved.entity.name
      case 'attraction':
        return resolved.entity.name
      case 'charger':
        return resolved.entity.id
      case 'incubator':
        return resolved.entity.id
      case 'safariRoute':
        return resolved.entity.name
      case 'incident':
        return resolved.entity.title
      case 'unknown':
        return resolved.id
    }
  }, [resolved])

  const subtitle = useMemo(() => {
    if (!resolved) return undefined
    switch (resolved.type) {
      case 'enclosure':
        return `Enclosure · ${resolved.entity.zone} · ${resolved.entity.id}`
      case 'dinosaur':
        return `Dinosaur · ${resolved.entity.id}`
      case 'vehicle':
        return `Vehicle · route ${resolved.entity.routeId}`
      case 'infrastructure':
        return `Infrastructure · ${resolved.entity.kind} · ${resolved.entity.id}`
      case 'attraction':
        return `Attraction · ${resolved.entity.zone} · ${resolved.entity.id}`
      case 'charger':
        return `Charger · ${resolved.entity.id}`
      case 'incubator': {
        const species = park.species.find((s) => s.id === resolved.entity.speciesId)
        return `Incubator · ${species?.displayName ?? resolved.entity.speciesId}`
      }
      case 'safariRoute':
        return `Safari route · ${resolved.entity.id}`
      case 'incident':
        return `Incident · ${resolved.entity.id}`
      case 'unknown':
        return 'Unknown asset'
    }
  }, [resolved, park.species])

  const freshness = useMemo(() => {
    if (!resolved) return null
    let lastReadingAt: number | null | undefined
    switch (resolved.type) {
      case 'enclosure':
        lastReadingAt = resolved.entity.lastReadingAt
        break
      case 'infrastructure':
        lastReadingAt = resolved.entity.lastReadingAt
        break
      case 'charger':
        lastReadingAt = resolved.entity.lastReadingAt
        break
      case 'dinosaur': {
        const enc = park.enclosures.find((e) => e.id === resolved.entity.enclosureId)
        lastReadingAt = enc?.lastReadingAt
        break
      }
      default:
        lastReadingAt = undefined
    }

    if (
      lastReadingAt == null &&
      resolved.type !== 'enclosure' &&
      resolved.type !== 'infrastructure' &&
      resolved.type !== 'dinosaur' &&
      resolved.type !== 'charger'
    ) {
      return null
    }

    const stale = isReadingStale(lastReadingAt, now, config.staleThresholdSec)
    return { lastReadingAt, stale }
  }, [resolved, park.enclosures, now, config.staleThresholdSec])

  const primaryStatus: OperationalStatus = useMemo(() => {
    if (!resolved) return 'unknown'
    if (freshness?.stale) return 'unknown'
    switch (resolved.type) {
      case 'enclosure': {
        const fence = deriveOperationalStatus({
          value: resolved.entity.fenceVoltage,
          lastReadingAt: resolved.entity.lastReadingAt,
          now,
          staleThresholdSec: config.staleThresholdSec,
          warnBelow: config.fenceVoltageMin,
          critBelow: config.fenceVoltageMin * 0.85,
        })
        if (resolved.entity.gateStatus === 'fault') return 'critical'
        if (resolved.entity.gateStatus === 'unknown') return 'unknown'
        return fence
      }
      case 'dinosaur':
        return resolved.entity.welfareStatus
      case 'vehicle':
        return readinessStatus(resolved.entity.readiness)
      case 'infrastructure':
        return resolved.entity.status
      case 'attraction':
        return resolved.entity.status === 'closed' ? 'critical' : resolved.entity.status
      case 'charger':
        return chargerOperationalStatus(resolved.entity, now, config.staleThresholdSec)
      case 'incubator': {
        if (resolved.entity.tempC == null || resolved.entity.humidityPct == null) return 'unknown'
        return resolved.entity.status
      }
      case 'safariRoute':
        return safariRouteOperationalStatus(resolved.entity.status)
      case 'incident':
        return severityStatus(resolved.entity.severity)
      default:
        return 'unknown'
    }
  }, [resolved, freshness?.stale, now, config])

  const readings: ReadingRow[] = useMemo(() => {
    if (!resolved) return []
    if (resolved.type === 'enclosure') {
      const e = resolved.entity
      return [
        {
          key: 'tempC',
          label: 'Temperature',
          value: formatNumber(e.tempC, '°C'),
          status: deriveOperationalStatus({
            value: e.tempC,
            lastReadingAt: e.lastReadingAt,
            now,
            staleThresholdSec: config.staleThresholdSec,
          }),
        },
        {
          key: 'humidityPct',
          label: 'Humidity',
          value: formatNumber(e.humidityPct, '%'),
          status: deriveOperationalStatus({
            value: e.humidityPct,
            lastReadingAt: e.lastReadingAt,
            now,
            staleThresholdSec: config.staleThresholdSec,
          }),
        },
        {
          key: 'fenceVoltage',
          label: 'Fence voltage',
          value: formatNumber(e.fenceVoltage, 'V'),
          threshold: `min ${config.fenceVoltageMin.toLocaleString()} V`,
          status: deriveOperationalStatus({
            value: e.fenceVoltage,
            lastReadingAt: e.lastReadingAt,
            now,
            staleThresholdSec: config.staleThresholdSec,
            warnBelow: config.fenceVoltageMin,
            critBelow: config.fenceVoltageMin * 0.85,
          }),
        },
        {
          key: 'gate',
          label: 'Gate',
          value: e.gateStatus,
        },
      ]
    }
    if (resolved.type === 'vehicle') {
      const v = resolved.entity
      return [
        {
          key: 'batteryPct',
          label: 'Battery',
          value: formatNumber(v.batteryPct, '%'),
          threshold: 'warn < 30%',
          status: deriveOperationalStatus({
            value: v.batteryPct,
            lastReadingAt: now,
            now,
            staleThresholdSec: config.staleThresholdSec,
            warnBelow: 30,
            critBelow: 15,
          }),
        },
        { key: 'readiness', label: 'Readiness', value: v.readiness },
        {
          key: 'seats',
          label: 'Occupancy',
          value: `${v.occupiedSeats} / ${v.seats}`,
        },
      ]
    }
    if (resolved.type === 'attraction') {
      const a = resolved.entity
      return [
        {
          key: 'waitMinutes',
          label: 'Wait',
          value: formatNumber(a.waitMinutes, 'min'),
          threshold: `warn ≥ ${config.queueWarnMin} / crit ≥ ${config.queueCritMin} min`,
          status: deriveOperationalStatus({
            value: a.waitMinutes,
            lastReadingAt: now,
            now,
            staleThresholdSec: config.staleThresholdSec,
            // deriveOperationalStatus uses strict >; subtract 1 so ≥ threshold matches sim.
            warnAbove: config.queueWarnMin - 1,
            critAbove: config.queueCritMin - 1,
          }),
        },
        { key: 'queueLength', label: 'Queue length', value: formatNumber(a.queueLength) },
        { key: 'crowding', label: 'Crowding', value: a.crowding },
      ]
    }
    if (resolved.type === 'infrastructure') {
      return [
        {
          key: 'status',
          label: 'Status',
          value: resolved.entity.status,
          status: resolved.entity.status,
        },
      ]
    }
    if (resolved.type === 'dinosaur') {
      const species = park.species.find((s) => s.id === resolved.entity.speciesId)
      const enc = park.enclosures.find((e) => e.id === resolved.entity.enclosureId)
      const encStale = isReadingStale(enc?.lastReadingAt, now, config.staleThresholdSec)
      const welfareStatus: OperationalStatus = encStale ? 'unknown' : resolved.entity.welfareStatus
      return [
        {
          key: 'welfare',
          label: 'Welfare',
          value: encStale ? 'Unknown/Stale' : resolved.entity.welfareStatus,
          status: welfareStatus,
        },
        { key: 'sex', label: 'Sex', value: resolved.entity.sex },
        {
          key: 'species',
          label: 'Species',
          value: species?.displayName ?? resolved.entity.speciesId,
        },
      ]
    }
    if (resolved.type === 'charger') {
      const c = resolved.entity
      const status = chargerOperationalStatus(c, now, config.staleThresholdSec)
      return [
        {
          key: 'powered',
          label: 'Powered',
          value: c.powered ? 'Yes' : 'No',
          status: c.powered ? 'normal' : 'critical',
        },
        {
          key: 'available',
          label: 'Available',
          value: c.available ? 'Yes' : 'No',
          status,
        },
      ]
    }
    if (resolved.type === 'incubator') {
      const inc = resolved.entity
      const species = park.species.find((s) => s.id === inc.speciesId)
      const daysToHatch = (inc.expectedHatchAt - now) / (24 * 60 * 60 * 1000)
      let status: OperationalStatus = inc.status
      if (inc.tempC == null || inc.humidityPct == null) {
        status = 'unknown'
      } else if (daysToHatch >= 0 && daysToHatch <= config.hatchAlertDays && status === 'normal') {
        status = 'warning'
      }
      return [
        {
          key: 'species',
          label: 'Species',
          value: species?.displayName ?? inc.speciesId,
        },
        {
          key: 'expectedHatchAt',
          label: 'Expected hatch',
          value: formatWhen(inc.expectedHatchAt),
          threshold: `hatch alert ≤ ${config.hatchAlertDays} days`,
          status,
        },
        {
          key: 'tempC',
          label: 'Temperature',
          value: formatNumber(inc.tempC, '°C'),
          status: deriveOperationalStatus({
            value: inc.tempC,
            lastReadingAt: now,
            now,
            staleThresholdSec: config.staleThresholdSec,
          }),
        },
        {
          key: 'humidityPct',
          label: 'Humidity',
          value: formatNumber(inc.humidityPct, '%'),
          status: deriveOperationalStatus({
            value: inc.humidityPct,
            lastReadingAt: now,
            now,
            staleThresholdSec: config.staleThresholdSec,
          }),
        },
      ]
    }
    if (resolved.type === 'safariRoute') {
      const route = resolved.entity
      const next = route.departures
        .slice()
        .sort((a, b) => a.departsAt - b.departsAt)
        .slice(0, 3)
      const rows: ReadingRow[] = [
        {
          key: 'status',
          label: 'Route status',
          value: route.status,
          status: safariRouteOperationalStatus(route.status),
        },
        {
          key: 'stops',
          label: 'Stops',
          value: String(route.stopEnclosureIds.length),
        },
      ]
      next.forEach((dep, i) => {
        const utilPct = dep.seats === 0 ? 0 : Math.round((dep.occupied / dep.seats) * 100)
        rows.push({
          key: `dep-${dep.id}`,
          label: i === 0 ? 'Next departure' : `Departure ${i + 1}`,
          value: `${formatWhen(dep.departsAt)} · ${dep.vehicleId} · ${dep.occupied}/${dep.seats} (${utilPct}%)`,
        })
      })
      return rows
    }
    return []
  }, [resolved, park.species, park.enclosures, now, config])

  const relatedAssets = useMemo(() => {
    if (!resolved) return [] as { id: string; label: string; kind: 'asset' | 'incident' }[]
    const links: { id: string; label: string; kind: 'asset' | 'incident' }[] = []

    if (resolved.type === 'enclosure') {
      for (const d of park.dinosaurs.filter((x) => x.enclosureId === resolved.entity.id)) {
        links.push({ id: d.id, label: d.name, kind: 'asset' })
      }
      for (const infraId of resolved.entity.supportedBy) {
        const infra = park.infrastructure.find((i) => i.id === infraId)
        links.push({ id: infraId, label: infra?.name ?? infraId, kind: 'asset' })
      }
    }
    if (resolved.type === 'dinosaur') {
      const enc = park.enclosures.find((e) => e.id === resolved.entity.enclosureId)
      if (enc) links.push({ id: enc.id, label: enc.name, kind: 'asset' })
    }
    if (resolved.type === 'infrastructure') {
      for (const supportId of resolved.entity.supports) {
        links.push({
          id: supportId,
          label: assetLabel(park, supportId),
          kind: 'asset',
        })
      }
    }
    if (resolved.type === 'attraction') {
      for (const encId of resolved.entity.enclosureIds) {
        const enc = park.enclosures.find((e) => e.id === encId)
        links.push({ id: encId, label: enc?.name ?? encId, kind: 'asset' })
      }
    }
    if (resolved.type === 'charger') {
      for (const v of park.vehicles.filter((x) => x.chargerId === resolved.entity.id)) {
        links.push({ id: v.id, label: v.id, kind: 'asset' })
      }
      for (const infra of park.infrastructure.filter((i) => i.supports.includes(resolved.entity.id))) {
        links.push({ id: infra.id, label: infra.name, kind: 'asset' })
      }
    }
    if (resolved.type === 'incubator') {
      // Lab incubators have no direct enclosure/infra edges in the seed model.
    }
    if (resolved.type === 'safariRoute') {
      for (const encId of resolved.entity.stopEnclosureIds) {
        const enc = park.enclosures.find((e) => e.id === encId)
        links.push({ id: encId, label: enc?.name ?? encId, kind: 'asset' })
      }
      for (const v of park.vehicles.filter((x) => x.routeId === resolved.entity.id)) {
        links.push({ id: v.id, label: v.id, kind: 'asset' })
      }
      for (const dep of resolved.entity.departures) {
        if (!links.some((l) => l.id === dep.vehicleId)) {
          links.push({ id: dep.vehicleId, label: dep.vehicleId, kind: 'asset' })
        }
      }
    }
    if (resolved.type === 'vehicle') {
      const route = park.safariRoutes.find((r) => r.id === resolved.entity.routeId)
      if (route) links.push({ id: route.id, label: route.name, kind: 'asset' })
      if (resolved.entity.chargerId) {
        links.push({ id: resolved.entity.chargerId, label: resolved.entity.chargerId, kind: 'asset' })
      }
    }
    if (resolved.type === 'incident') {
      for (const assetId of resolved.entity.assetIds) {
        links.push({ id: assetId, label: assetLabel(park, assetId), kind: 'asset' })
      }
    }
    return links
  }, [resolved, park])

  const affectedAttractions = useMemo(() => {
    if (!resolved) return [] as Attraction[]
    if (resolved.type === 'incident') {
      return resolved.entity.affectedAttractionIds
        .map((id) => park.attractions.find((a) => a.id === id))
        .filter((a): a is Attraction => a != null)
    }
    if (resolved.type === 'enclosure') {
      return resolved.entity.attractionIds
        .map((id) => park.attractions.find((a) => a.id === id))
        .filter((a): a is Attraction => a != null)
    }
    return []
  }, [resolved, park.attractions])

  const affectedRoutes = useMemo(() => {
    if (!resolved || resolved.type !== 'incident') return [] as SafariRoute[]
    return resolved.entity.affectedRouteIds
      .map((id) => park.safariRoutes.find((r) => r.id === id))
      .filter((r): r is SafariRoute => r != null)
  }, [resolved, park.safariRoutes])

  const ack = selection?.kind === 'incident' ? operator.acks[selection.id] : undefined
  const isIncident = resolved?.type === 'incident'
  const trendKey = readings.find((r) => history.some((h) => h.values[r.key] != null))?.key

  const closeDrawer = () => setSelection(null)

  return (
    <Drawer
      isOpen={!!selection}
      onOpenChange={(open) => {
        if (!open) closeDrawer()
      }}
      onClose={closeDrawer}
      placement="right"
      width={440}
      title={
        <>
          <Drawer.Heading>{title}</Drawer.Heading>
          {subtitle ? <Drawer.Description>{subtitle}</Drawer.Description> : null}
        </>
      }
      footer={
        isIncident ? (
          <div className="investigation-drawer__footer">
            <Button
              variant="primary"
              disabled={!!ack}
              pending={ackPending}
              onClick={async () => {
                if (!selection || selection.kind !== 'incident') return
                setAckPending(true)
                try {
                  await acknowledgeIncident(selection.id)
                } finally {
                  setAckPending(false)
                }
              }}
            >
              {ack ? 'Acknowledged' : 'Acknowledge'}
            </Button>
            <Text variant="body-xs-normal" color="subtle">
              Acknowledged does not clear an active fault.
            </Text>
            {ack ? (
              <Text variant="body-xs-normal" color="subtle">
                Acked by {ack.by} · {formatWhen(ack.acknowledgedAt)}
              </Text>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {resolved ? (
        <div className="investigation-drawer">
          <Section title="Status">
            <StatusIndicator
              status={primaryStatus}
              label={freshness?.stale ? 'Unknown/Stale' : undefined}
            />
            {isIncident ? (
              <Text variant="body-sm-normal">
                {(resolved.entity as Incident).active ? 'Active' : 'Inactive'} ·{' '}
                {(resolved.entity as Incident).severity}
              </Text>
            ) : null}
          </Section>

          {freshness ? (
            <Section title="Data freshness">
              <Text variant="body-sm-normal">
                Last update: {formatWhen(freshness.lastReadingAt)}
              </Text>
              {freshness.stale ? (
                <StatusIndicator status="unknown" label="Unknown/Stale" />
              ) : (
                <Text variant="body-sm-normal" color="subtle">
                  Within {config.staleThresholdSec}s threshold
                </Text>
              )}
            </Section>
          ) : null}

          {isIncident ? (
            <Section title="Description">
              <Text variant="body-sm-normal">{(resolved.entity as Incident).description}</Text>
              <Text variant="body-xs-normal" color="subtle">
                Opened {formatWhen((resolved.entity as Incident).openedAt)}
              </Text>
            </Section>
          ) : null}

          {readings.length > 0 ? (
            <Section title="Readings">
              <ul className="investigation-drawer__readings">
                {readings.map((row) => (
                  <li key={row.key} className="investigation-drawer__reading">
                    <div className="investigation-drawer__reading-head">
                      <Text variant="body-sm-semibold">{row.label}</Text>
                      {row.status ? <StatusIndicator status={row.status} /> : null}
                    </div>
                    <Text variant="metric-sm">{row.value}</Text>
                    {row.threshold ? (
                      <Text variant="body-xs-normal" color="subtle">
                        Threshold: {row.threshold}
                      </Text>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {history.length > 0 && trendKey ? (
            <Section title="Trend">
              <Text variant="body-xs-normal" color="subtle">
                {trendKey} · last {history.length} samples
              </Text>
              <TrendSparkline samples={history} metricKey={trendKey} />
            </Section>
          ) : null}

          {relatedAssets.length > 0 ? (
            <Section title="Related assets">
              <ul className="investigation-drawer__links">
                {relatedAssets.map((link) => (
                  <RelatedLink
                    key={`${link.kind}:${link.id}`}
                    label={link.label}
                    onSelect={() => setSelection({ kind: link.kind, id: link.id })}
                  />
                ))}
              </ul>
            </Section>
          ) : null}

          {affectedAttractions.length > 0 ? (
            <Section title="Affected attractions">
              <ul className="investigation-drawer__links">
                {affectedAttractions.map((a) => (
                  <RelatedLink
                    key={a.id}
                    label={a.name}
                    onSelect={() => setSelection({ kind: 'asset', id: a.id })}
                  />
                ))}
              </ul>
            </Section>
          ) : null}

          {affectedRoutes.length > 0 ? (
            <Section title="Affected tours">
              <ul className="investigation-drawer__links">
                {affectedRoutes.map((r) => (
                  <li key={r.id}>
                    <Text variant="body-sm-normal">
                      {r.name} ({r.status})
                    </Text>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Divider />

          <Section title="Notes">
            <TextArea
              label="Operator notes"
              value={noteDraft}
              onChange={setNoteDraft}
              autoSize={{ minRows: 3, maxRows: 8 }}
              helperText="Saved to app KV when available."
            />
            <Button
              variant="secondary"
              pending={notePending}
              disabled={!noteTargetId || noteDraft === persistedNote}
              onClick={async () => {
                if (!noteTargetId) return
                setNotePending(true)
                try {
                  await saveNote(noteTargetId, noteDraft)
                } finally {
                  setNotePending(false)
                }
              }}
            >
              Save note
            </Button>
          </Section>
        </div>
      ) : null}
    </Drawer>
  )
}
