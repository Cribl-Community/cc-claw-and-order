import {
  Alert,
  Button,
  Divider,
  Link,
  Modal,
  NumberField,
  Radio,
  RadioGroup,
  SelectField,
  Switch,
  TabNav,
  Text,
  Toast,
  type Key,
} from '@capra/core'
import { useEffect, useMemo, useState } from 'react'
import logo from '../assets/claw_and_order_logo.png'
import { DemoModeBadge } from '../components/DemoModeBadge'
import { PageFrame } from '../components/PageFrame'
import { KV_KEYS } from '../kv/keys'
import type { ConfigSettings, ScenarioId } from '../model/types'
import { usePark } from '../state/usePark'

type SettingsTab = 'demo' | 'preferences' | 'thresholds' | 'about'

const TAB_ITEMS = [
  { key: 'demo', name: 'Demo & scenario', href: '#demo' },
  { key: 'preferences', name: 'Operator preferences', href: '#preferences' },
  { key: 'thresholds', name: 'Park thresholds', href: '#thresholds' },
  { key: 'about', name: 'About', href: '#about' },
] as const

const LANDING_ITEMS: { id: ConfigSettings['defaultLanding']; label: string }[] = [
  { id: '/', label: 'Park Overview' },
  { id: '/enclosures', label: 'Enclosures' },
  { id: '/compatibility', label: 'Compatibility' },
  { id: '/services', label: 'Services' },
  { id: '/settings', label: 'Settings' },
]

const DENSITY_ITEMS: { id: ConfigSettings['density']; label: string }[] = [
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'compact', label: 'Compact' },
]

const TICK_MS_ITEMS: { id: string; label: string; ms: number }[] = [
  { id: '2000', label: 'Fast (2s)', ms: 2_000 },
  { id: '5000', label: 'Default (5s)', ms: 5_000 },
  { id: '10000', label: 'Slow (10s)', ms: 10_000 },
]

function isLanding(key: Key | null): key is ConfigSettings['defaultLanding'] {
  return (
    key === '/' ||
    key === '/enclosures' ||
    key === '/compatibility' ||
    key === '/services' ||
    key === '/settings'
  )
}

function isDensity(key: Key | null): key is ConfigSettings['density'] {
  return key === 'compact' || key === 'comfortable'
}

function cloneConfig(config: ConfigSettings): ConfigSettings {
  return { ...config }
}

function configsEqual(a: ConfigSettings, b: ConfigSettings): boolean {
  return (
    a.scenario === b.scenario &&
    a.paused === b.paused &&
    a.tickMs === b.tickMs &&
    a.defaultLanding === b.defaultLanding &&
    a.staleThresholdSec === b.staleThresholdSec &&
    a.density === b.density &&
    a.guestCapacity === b.guestCapacity &&
    a.queueWarnMin === b.queueWarnMin &&
    a.queueCritMin === b.queueCritMin &&
    a.fenceVoltageMin === b.fenceVoltageMin &&
    a.hatchAlertDays === b.hatchAlertDays
  )
}

/** Persistable fields that apply on Save (not scenario/pause). */
function persistablePartial(draft: ConfigSettings): Partial<ConfigSettings> {
  return {
    tickMs: draft.tickMs,
    defaultLanding: draft.defaultLanding,
    staleThresholdSec: draft.staleThresholdSec,
    density: draft.density,
    guestCapacity: draft.guestCapacity,
    queueWarnMin: draft.queueWarnMin,
    queueCritMin: draft.queueCritMin,
    fenceVoltageMin: draft.fenceVoltageMin,
    hatchAlertDays: draft.hatchAlertDays,
    scenario: draft.scenario,
    paused: draft.paused,
  }
}

export function SettingsPage() {
  const {
    config,
    kvStatus,
    updateConfig,
    setScenario,
    pause,
    resume,
    resetSimulation,
    clearOperatorState,
  } = usePark()

  const [tab, setTab] = useState<SettingsTab>('demo')
  const [draft, setDraft] = useState<ConfigSettings>(() => cloneConfig(config))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  /** Keeps Save enabled after apply-on-Save when KV persist fails (draft already matches live config). */
  const [persistPending, setPersistPending] = useState(false)

  const dirty = useMemo(
    () => persistPending || !configsEqual(draft, config),
    [draft, config, persistPending],
  )

  // Keep draft aligned with live config when clean (e.g. Overview scenario controls).
  useEffect(() => {
    if (!dirty) setDraft(cloneConfig(config))
  }, [config, dirty])

  // Scenario/pause apply immediately elsewhere — mirror into draft while dirty.
  useEffect(() => {
    setDraft((d) =>
      d.scenario === config.scenario && d.paused === config.paused
        ? d
        : { ...d, scenario: config.scenario, paused: config.paused },
    )
  }, [config.scenario, config.paused])

  function patchDraft(partial: Partial<ConfigSettings>) {
    setDraft((d) => ({ ...d, ...partial }))
    setSaveError(null)
    setPersistPending(false)
  }

  function handleScenarioChange(value: string) {
    const scenario = value as ScenarioId
    if (scenario !== 'normal' && scenario !== 'stormOutage') return
    patchDraft({ scenario })
    setScenario(scenario)
  }

  function handlePauseChange(checked: boolean) {
    patchDraft({ paused: checked })
    if (checked) pause()
    else resume()
  }

  function handleCancel() {
    if (persistPending) {
      Toast.info(
        'Settings already apply in memory. Save again to persist to storage; reload the app to discard.',
      )
      return
    }
    setDraft(cloneConfig(config))
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const next = cloneConfig({ ...draft, ...persistablePartial(draft) })
      const result = await updateConfig(persistablePartial(draft), { persist: true })
      setDraft(next)
      if (!result.ok) {
        const message = result.error ?? 'Could not save settings'
        setSaveError(message)
        setPersistPending(true)
        Toast.error(message)
        return
      }
      setPersistPending(false)
      Toast.success('Settings saved')
    } finally {
      setSaving(false)
    }
  }

  function confirmResetSimulation() {
    Modal.danger({
      title: 'Reset simulation?',
      content:
        'This reseeds the park to Normal, unpauses ticks, and discards in-memory incident and reading history. Operator acknowledgments and notes are kept.',
      confirmButtonText: 'Reset simulation',
      cancelButtonText: 'Cancel',
      onConfirm: () => {
        void resetSimulation().then(() => {
          Toast.info('Simulation reset to Normal')
        })
      },
    })
  }

  function confirmResetOperatorState() {
    Modal.danger({
      title: 'Reset operator state?',
      content: (
        <div className="settings-modal-copy">
          <Text>
            This permanently clears operator acknowledgments and notes from the app KV store.
            The following keys will be emptied:
          </Text>
          <ul>
            <li>
              <code>{KV_KEYS.acks}</code>
            </li>
            <li>
              <code>{KV_KEYS.notes}</code>
            </li>
          </ul>
          <Text>This cannot be undone. Park simulation state is not reseeded.</Text>
        </div>
      ),
      confirmButtonText: 'Clear operator state',
      cancelButtonText: 'Cancel',
      onConfirm: async () => {
        const result = await clearOperatorState()
        if (!result.ok) {
          const message = result.error ?? 'Could not clear operator state'
          Toast.error(message)
          throw new Error(message)
        }
        Toast.warning('Operator acknowledgments and notes cleared')
      },
    })
  }

  const showActions = tab !== 'about'

  return (
    <PageFrame
      title="Settings"
      actions={
        showActions ? (
          <div className="settings-page__actions">
            <Button variant="secondary" disabled={!dirty || saving} onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!dirty || saving}
              pending={saving}
              onClick={() => {
                void handleSave()
              }}
            >
              Save
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="app-grid-span-12 settings-page">
        {kvStatus.error ? (
          <Alert appearance="warning" title="Settings storage">
            Could not load or write saved settings ({kvStatus.error}). Using in-memory values;
            Save may fail until KV is available.
          </Alert>
        ) : null}

        {saveError ? (
          <Alert appearance="danger" title="Save failed">
            {saveError}
          </Alert>
        ) : null}

        <TabNav
          activeKey={tab}
          aria-label="Settings sections"
          onTabPress={(key) => {
            if (
              key === 'demo' ||
              key === 'preferences' ||
              key === 'thresholds' ||
              key === 'about'
            ) {
              setTab(key)
            }
          }}
          items={[...TAB_ITEMS]}
        />

        {tab === 'demo' ? (
          <section className="settings-panel" aria-label="Demo and scenario">
            <Text as="h2" variant="heading-sm">
              Demo & scenario
            </Text>
            <Text variant="body-sm-normal">
              Demo Mode is always on. Scenario and pause apply immediately; tick speed applies on
              Save.
            </Text>

            <div className="settings-field">
              <Text variant="body-sm-semibold">Demo Mode</Text>
              <div className="settings-inline">
                <Switch aria-label="Demo Mode" checked disabled />
                <DemoModeBadge />
                <Text variant="body-sm-normal">Always on — cannot be disabled</Text>
              </div>
            </div>

            <div className="settings-field">
              <Text variant="body-sm-semibold" id="settings-scenario-label">
                Scenario
              </Text>
              <RadioGroup
                aria-labelledby="settings-scenario-label"
                layout="vertical"
                name="scenario"
                value={draft.scenario}
                onChange={(e) => handleScenarioChange(e.target.value)}
              >
                <Radio value="normal">Normal</Radio>
                <Radio value="stormOutage">Storm + Outage</Radio>
              </RadioGroup>
            </div>

            <div className="settings-field">
              <div className="settings-inline">
                <Switch
                  aria-label="Pause simulation"
                  checked={draft.paused}
                  onChange={(e) => handlePauseChange(e.target.checked)}
                />
                <Text variant="body-sm-normal">
                  {draft.paused ? 'Paused — ticks frozen' : 'Running'}
                </Text>
              </div>
            </div>

            <SelectField
              label="Tick speed"
              helperText="How often the park simulation advances. Applied when you Save."
              items={TICK_MS_ITEMS.map(({ id, label }) => ({ id, label }))}
              value={String(draft.tickMs)}
              onChange={(key) => {
                const match = TICK_MS_ITEMS.find((item) => item.id === key)
                if (match) patchDraft({ tickMs: match.ms })
              }}
            />

            <Divider type="horizontal">
              <Text as="h3" variant="body-sm-semibold">
                Destructive actions
              </Text>
            </Divider>

            <div className="settings-danger-row">
              <div className="settings-danger-copy">
                <Text variant="body-sm-semibold">Reset simulation</Text>
                <Text variant="body-sm-normal">
                  Reseed park inventory and return to Normal / running. Does not clear
                  acknowledgments or notes.
                </Text>
              </div>
              <Button appearance="danger" variant="secondary" onClick={confirmResetSimulation}>
                Reset simulation
              </Button>
            </div>

            <div className="settings-danger-row">
              <div className="settings-danger-copy">
                <Text variant="body-sm-semibold">Reset operator state</Text>
                <Text variant="body-sm-normal">
                  Clears KV keys <code>{KV_KEYS.acks}</code> and <code>{KV_KEYS.notes}</code>.
                  Requires confirmation — acknowledgments are not cleared silently.
                </Text>
              </div>
              <Button appearance="danger" variant="secondary" onClick={confirmResetOperatorState}>
                Reset operator state
              </Button>
            </div>
          </section>
        ) : null}

        {tab === 'preferences' ? (
          <section className="settings-panel" aria-label="Operator preferences">
            <Text as="h2" variant="heading-sm">
              Operator preferences
            </Text>
            <Text variant="body-sm-normal">
              Preference edits apply and persist when you Save. Cancel reverts unsaved changes.
            </Text>

            <SelectField
              label="Default landing route"
              helperText="Preferred start view after opening the app (stored in settings)."
              items={LANDING_ITEMS}
              value={draft.defaultLanding}
              onChange={(key) => {
                if (isLanding(key)) patchDraft({ defaultLanding: key })
              }}
            />

            <SelectField
              label="Table density"
              helperText="Compact densifies Enclosures tables."
              items={DENSITY_ITEMS}
              value={draft.density}
              onChange={(key) => {
                if (isDensity(key)) patchDraft({ density: key })
              }}
            />

            <NumberField
              label="Stale data threshold (seconds)"
              helperText="Readings older than this are treated as unknown/stale."
              min={30}
              max={3_600}
              step={30}
              value={draft.staleThresholdSec}
              onChange={(value) => {
                if (Number.isFinite(value)) patchDraft({ staleThresholdSec: value })
              }}
            />

            <Alert appearance="info" title="Investigation drawer">
              Selecting an asset or incident opens the shared investigation drawer. Drawer behavior
              is fixed in this demo build; there is no separate preference toggle.
            </Alert>
          </section>
        ) : null}

        {tab === 'thresholds' ? (
          <section className="settings-panel" aria-label="Park thresholds">
            <Text as="h2" variant="heading-sm">
              Park thresholds
            </Text>
            <Text variant="body-sm-normal">
              Threshold edits recompute alert and incident severity on the next tick after Save —
              they do not apply on every keystroke.
            </Text>

            <NumberField
              label="Guest capacity"
              min={100}
              max={50_000}
              step={100}
              value={draft.guestCapacity}
              onChange={(value) => {
                if (Number.isFinite(value)) patchDraft({ guestCapacity: value })
              }}
            />

            <NumberField
              label="Queue warn (minutes)"
              min={1}
              max={240}
              step={1}
              value={draft.queueWarnMin}
              onChange={(value) => {
                if (Number.isFinite(value)) patchDraft({ queueWarnMin: value })
              }}
            />

            <NumberField
              label="Queue critical (minutes)"
              min={1}
              max={240}
              step={1}
              value={draft.queueCritMin}
              onChange={(value) => {
                if (Number.isFinite(value)) patchDraft({ queueCritMin: value })
              }}
            />

            <NumberField
              label="Fence voltage minimum"
              helperText="Enclosure fence readings below this trigger warning/critical status."
              min={1_000}
              max={20_000}
              step={100}
              value={draft.fenceVoltageMin}
              onChange={(value) => {
                if (Number.isFinite(value)) patchDraft({ fenceVoltageMin: value })
              }}
            />

            <NumberField
              label="Hatch alert window (days)"
              helperText="Incubators expected to hatch within this many days surface as alerts."
              min={1}
              max={90}
              step={1}
              value={draft.hatchAlertDays}
              onChange={(value) => {
                if (Number.isFinite(value)) patchDraft({ hatchAlertDays: value })
              }}
            />
          </section>
        ) : null}

        {tab === 'about' ? (
          <section className="settings-panel settings-about" aria-label="About">
            <img
              className="settings-about__logo"
              src={logo}
              alt="Claw & Order"
              width={280}
            />
            <DemoModeBadge />
            <Text as="h2" variant="heading-sm">
              Claw & Order Control
            </Text>
            <p className="settings-about__promise">
              <Text variant="body-md-normal">
                Understand the park. Protect its inhabitants. Deliver an extraordinary visit.
              </Text>
            </p>
            <Alert appearance="info" title="Demo Mode">
              This console always runs in Demo Mode. Inventory, sensor readings, weather, and
              incidents are simulated in the browser — not live park or Cribl telemetry. Operator
              acknowledgments, notes, and saved settings persist in the app-scoped KV store when
              the Cribl platform proxy is available.
            </Alert>
            <Text variant="body-sm-normal">
              Brand voice, color, and logo guidance live in the repository at{' '}
              <code>assets/Claw-and-Order-Brand-Guide.pdf</code>. See also the Marketplace{' '}
              <code>README.md</code> for customer-facing Demo Mode notes.
            </Text>
            <Link href="https://docs.cribl.io/apps" isExternal>
              Cribl Apps documentation
            </Link>
          </section>
        ) : null}
      </div>
    </PageFrame>
  )
}
