# Claw & Order Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Claw & Order Control — a Capra/Cribl demo ops console with four connected park views plus Settings, deterministic Demo Mode simulation (Normal + Storm/Outage), KV-persisted acks/notes/config, and a shared investigation Drawer.

**Architecture:** Single in-memory `ParkModel` + simulation clock/scenario overlay feeds all routes via React context. Operator acks/notes and Config settings persist to Cribl KV. Capra `VerticalNavigation` shell, Overview/Tables/Setup-Config page templates, shared Drawer for asset/incident detail. Frontend-only (remove backend scaffold).

**Tech Stack:** React 19, React Router 7, TypeScript, Vite, `@capra/core` / `@capra/icons` / `@capra/theme`, Vitest for unit tests, Cribl app KV via `fetch(CRIBL_API_URL + '/kvstore/...')`.

## Global Constraints

- Always label **Demo Mode**; never present sim data as live production telemetry.
- Capra semantic tokens via `token()` in CSS; shell owns light/dark; brand hexes (`#0B1C2C`, `#17232E`, `#F2AD24`, `#F6EBD2`, `#ACBAC6`) are accents/reference only.
- Status always = color + icon + text; unknown/stale never shown as healthy.
- Acknowledgment must not clear an ongoing fault (`active` stays true until readings/scenario recover).
- One park model — guests, queues, populations, KPIs must stay consistent across views.
- Compatibility is assess-only (no inventory mutation).
- Compact inventory: ~8–10 dinosaurs, 5–6 species, 4–5 enclosures, 3 walking attractions, 2 safari routes, ~6 EVs.
- Capra nav rules: `VerticalNavigation`; Settings + Documentation in footer; no logo inside nav.
- `@capra/core@1.16` has no `PageHeader` export — implement page headers with Capra `Text` + action slot matching template intent (12-col grid, `token('spacing.lg')`).
- Do not rebuild Cribl product Top Navigation; app chrome is VerticalNavigation + content.
- Confirm before destructive resets / clearing operator KV state.
- Only commit when the user asks during execution, unless the user explicitly enables plan commit steps — prefer staging logical units and asking before commits.
- Brand assets: `assets/claw_and_order_logo.png`, guide `assets/Claw-and-Order-Brand-Guide.pdf`.
- Spec: `docs/superpowers/specs/2026-09-30-claw-and-order-control-design.md`.

---

## File structure

```
src/
  main.tsx
  host-theme.ts
  App.tsx
  App.css
  vite-env.d.ts
  brand/
    colors.ts
    logo.ts                    # import path helper for logo asset
  model/
    types.ts
    selectors.ts
    status.ts
  data/
    seed.ts                    # deterministic inventory seed
  sim/
    prng.ts
    clock.ts
    scenario.ts
    tick.ts
  compatibility/
    rules.ts
    assess.ts
  kv/
    client.ts
    keys.ts
  state/
    defaults.ts
    ParkProvider.tsx
    usePark.ts
  components/
    AppShell.tsx
    PageFrame.tsx
    DemoModeBadge.tsx
    StatusIndicator.tsx
    MetricCard.tsx
    ParkMap.tsx
    InvestigationDrawer.tsx
    ScenarioControls.tsx
  pages/
    OverviewPage.tsx
    EnclosuresPage.tsx
    CompatibilityPage.tsx
    ServicesPage.tsx
    SettingsPage.tsx
  styles/
    layout.css
    park-map.css
    brand.css
public/ or src/assets/         # copy/serve logo for Vite
src/model/__tests__/...
src/sim/__tests__/...
src/compatibility/__tests__/...
```

Copy logo into `src/assets/claw_and_order_logo.png` (Vite-friendly import) while keeping originals under `assets/`.

---

### Task 1: Frontend-only cleanup + Vitest + theme bridge

**Files:**
- Delete: `config/backend.yml`, `backend/hello.ts`, `backend/net.ts`, `config/schedules.yml`, `tsconfig.backend.json`
- Modify: `tsconfig.json` (remove backend reference), `config/policies.yml` (empty/minimal policies), `config/proxies.yml` (empty/comment-only), `package.json` (add vitest scripts/deps), `vite.config.ts` (vitest config), `src/main.tsx`, `src/host-theme.ts` (create), `src/vite-env.d.ts` (create)

**Interfaces:**
- Produces: `installThemeBridge(onTheme?: (theme: 'light' | 'dark') => void): () => void`
- Produces: Vitest runnable via `npm test`

- [ ] **Step 1: Remove backend scaffold**

Delete the files listed above. Edit `tsconfig.json` to only reference `tsconfig.app.json` and `tsconfig.node.json`.

Set `config/policies.yml` to:

```yaml
policies: []
```

Set `config/proxies.yml` to:

```yaml
# No external domains required for Demo Mode.
```

- [ ] **Step 2: Add Vitest**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```

Add to `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`.

Append to `vite.config.ts`:

```ts
/// keep existing defineConfig; add:
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
```

Ensure `tsconfig.app.json` / vitest types work (`vitest/globals` if using globals).

- [ ] **Step 3: Theme bridge**

Create `src/host-theme.ts` exactly as in `AGENTS.md` (`installThemeBridge` toggling `document.body.classList` for `.dark`).

Update `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@capra/theme/base.css'
import '@capra/core/styles.css'
import '@capra/icons/styles.css'
import { installThemeBridge } from './host-theme'
import App from './App'
import './App.css'
import './styles/layout.css'
import './styles/brand.css'

installThemeBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={window.CRIBL_BASE_PATH || '/'}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Create `src/vite-env.d.ts`:

```ts
export {}

declare global {
  interface Window {
    CRIBL_API_URL: string
    CRIBL_BASE_PATH: string
    getCriblUser?: () => Promise<{
      id: string
      username: string
      email?: string
      firstName?: string
      lastName?: string
      initials?: string
    }>
  }
}
```

Create stub `src/styles/layout.css` and `src/styles/brand.css` with `:root { color-scheme: light dark; }` and shell grid helpers using `token()`.

- [ ] **Step 4: Verify**

```bash
npm test
npm run build
```

Expected: tests pass (none yet OK), build succeeds without backend.

---

### Task 2: Domain types + status helpers + seed data

**Files:**
- Create: `src/model/types.ts`, `src/model/status.ts`, `src/data/seed.ts`
- Test: `src/data/seed.test.ts`

**Interfaces:**
- Produces types: `Species`, `Dinosaur`, `Enclosure`, `Attraction`, `SafariRoute`, `Vehicle`, `Charger`, `LabState`, `Infrastructure`, `WeatherState`, `Incident`, `ParkModel`, `OperationalStatus`, `ScenarioId`, `ConfigSettings`, `OperatorState`
- Produces: `createSeedPark(): ParkModel`
- Produces: `deriveOperationalStatus(...): OperationalStatus`

- [ ] **Step 1: Write failing seed test**

```ts
// src/data/seed.test.ts
import { describe, expect, it } from 'vitest'
import { createSeedPark } from './seed'

describe('createSeedPark', () => {
  it('creates compact consistent inventory', () => {
    const park = createSeedPark()
    expect(park.species.length).toBeGreaterThanOrEqual(5)
    expect(park.species.length).toBeLessThanOrEqual(6)
    expect(park.dinosaurs.length).toBeGreaterThanOrEqual(8)
    expect(park.dinosaurs.length).toBeLessThanOrEqual(10)
    expect(park.enclosures.length).toBeGreaterThanOrEqual(4)
    expect(park.enclosures.length).toBeLessThanOrEqual(5)
    expect(park.attractions.length).toBe(3)
    expect(park.safariRoutes.length).toBe(2)
    expect(park.vehicles.length).toBe(6)
    for (const d of park.dinosaurs) {
      expect(park.enclosures.some((e) => e.id === d.enclosureId)).toBe(true)
      expect(park.species.some((s) => s.id === d.speciesId)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

```bash
npm test -- src/data/seed.test.ts
```

- [ ] **Step 3: Implement types**

`src/model/types.ts` — include at minimum:

```ts
export type Diet = 'carnivore' | 'herbivore' | 'omnivore'
export type ScenarioId = 'normal' | 'stormOutage'
export type OperationalStatus = 'normal' | 'warning' | 'critical' | 'unknown'

export interface Species {
  id: string
  displayName: string
  diet: Diet
  inherentThreat: 1 | 2 | 3 | 4 | 5
  sizeClass: 'S' | 'M' | 'L' | 'XL'
  behaviorTags: string[]
  tempRangeC: { min: number; max: number }
  humidityRangePct: { min: number; max: number }
  containmentClass: 1 | 2 | 3 | 4 | 5
  maxGroupSize: number
  preyOf: string[]
  predatorOf: string[]
}

export interface Dinosaur {
  id: string
  name: string
  speciesId: string
  enclosureId: string
  sex: 'F' | 'M' | 'U'
  welfareStatus: OperationalStatus
}

export interface Enclosure {
  id: string
  name: string
  zone: string
  capacity: number
  map: { x: number; y: number; w: number; h: number }
  attractionIds: string[]
  tempC: number | null
  humidityPct: number | null
  fenceVoltage: number | null
  gateStatus: 'secured' | 'open' | 'fault' | 'unknown'
  lastReadingAt: number
  supportedBy: string[]
}

export interface Attraction {
  id: string
  name: string
  enclosureIds: string[]
  status: OperationalStatus | 'closed'
  queueLength: number
  waitMinutes: number
  crowding: 'low' | 'moderate' | 'high' | 'unknown'
  zone: string
}

export interface SafariRoute {
  id: string
  name: string
  stopEnclosureIds: string[]
  status: 'running' | 'delayed' | 'cancelled' | 'unknown'
  departures: { id: string; departsAt: number; vehicleId: string; seats: number; occupied: number }[]
}

export interface Vehicle {
  id: string
  routeId: string
  batteryPct: number | null
  readiness: 'ready' | 'charging' | 'maintenance' | 'offline' | 'unknown'
  chargerId: string | null
  seats: number
  occupiedSeats: number
}

export interface Charger {
  id: string
  available: boolean
  powered: boolean
  lastReadingAt: number
}

export interface Incubator {
  id: string
  speciesId: string
  expectedHatchAt: number
  tempC: number | null
  humidityPct: number | null
  status: OperationalStatus
}

export interface LabState {
  incubators: Incubator[]
  coldStorage: { tempC: number | null; status: OperationalStatus; lastReadingAt: number }
}

export interface Infrastructure {
  id: string
  name: string
  kind: 'power' | 'weather' | 'network'
  status: OperationalStatus
  supports: string[]
  lastReadingAt: number
}

export interface WeatherState {
  condition: 'clear' | 'rain' | 'storm'
  severity: 0 | 1 | 2 | 3
}

export interface Incident {
  id: string
  severity: 'warning' | 'critical'
  title: string
  description: string
  assetIds: string[]
  affectedAttractionIds: string[]
  affectedRouteIds: string[]
  openedAt: number
  active: boolean
}

export interface GuestFeedback {
  id: string
  rating: 1 | 2 | 3 | 4 | 5
  summary: string
  responseCount: number
  createdAt: number
  attractionId?: string
  routeId?: string
}

export interface ParkModel {
  tick: number
  seededAt: number
  scenario: ScenarioId
  paused: boolean
  species: Species[]
  dinosaurs: Dinosaur[]
  enclosures: Enclosure[]
  attractions: Attraction[]
  safariRoutes: SafariRoute[]
  vehicles: Vehicle[]
  chargers: Charger[]
  lab: LabState
  infrastructure: Infrastructure[]
  weather: WeatherState
  incidents: Incident[]
  guestsInPark: number
  feedback: GuestFeedback[]
  readingHistory: Record<string, { t: number; values: Record<string, number | null> }[]>
}

export interface ConfigSettings {
  scenario: ScenarioId
  paused: boolean
  tickMs: number
  defaultLanding: '/' | '/enclosures' | '/compatibility' | '/services' | '/settings'
  staleThresholdSec: number
  density: 'compact' | 'comfortable'
  guestCapacity: number
  queueWarnMin: number
  queueCritMin: number
  fenceVoltageMin: number
  hatchAlertDays: number
}

export interface OperatorState {
  acks: Record<string, { acknowledgedAt: number; by: string }>
  notes: Record<string, { text: string; updatedAt: number }>
}
```

- [ ] **Step 4: Implement `status.ts` + `seed.ts`**

`deriveOperationalStatus` maps null/stale → `unknown`; below thresholds → warning/critical.

`createSeedPark()` builds named fictional inventory (e.g. Rexy, Blue, Sarah, Littlefoot) with linked enclosures/attractions/routes, Normal weather, healthy fence voltages, baseline guests, 0–1 minor incidents, incubators with future hatch dates, and empty `readingHistory` seed points. Use fixed timestamps relative to a constant `SEED_NOW = Date.parse('2026-09-30T17:00:00Z')`.

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test -- src/data/seed.test.ts
```

---

### Task 3: PRNG, tick, scenario overlay

**Files:**
- Create: `src/sim/prng.ts`, `src/sim/tick.ts`, `src/sim/scenario.ts`
- Test: `src/sim/scenario.test.ts`, `src/sim/tick.test.ts`

**Interfaces:**
- Consumes: `ParkModel`, `ConfigSettings`, `createSeedPark`
- Produces: `createPrng(seed: string): () => number`
- Produces: `applyScenario(park: ParkModel, scenario: ScenarioId, config: ConfigSettings): ParkModel`
- Produces: `advanceTick(park: ParkModel, config: ConfigSettings, now: number): ParkModel`

- [ ] **Step 1: Failing scenario test**

```ts
import { describe, expect, it } from 'vitest'
import { createSeedPark } from '../data/seed'
import { applyScenario } from './scenario'
import { DEFAULT_CONFIG } from '../state/defaults'

describe('applyScenario stormOutage', () => {
  it('cascades power → fence/chargers/safari and opens critical incidents', () => {
    const base = createSeedPark()
    const storm = applyScenario(base, 'stormOutage', DEFAULT_CONFIG)
    expect(storm.weather.condition).toBe('storm')
    expect(storm.infrastructure.some((i) => i.kind === 'power' && i.status === 'critical')).toBe(true)
    expect(storm.enclosures.some((e) => e.fenceVoltage !== null && e.fenceVoltage < DEFAULT_CONFIG.fenceVoltageMin)).toBe(true)
    expect(storm.chargers.some((c) => !c.powered)).toBe(true)
    expect(storm.safariRoutes.some((r) => r.status === 'delayed' || r.status === 'cancelled')).toBe(true)
    expect(storm.incidents.some((i) => i.active && i.severity === 'critical')).toBe(true)
    expect(storm.attractions.some((a) => a.waitMinutes >= DEFAULT_CONFIG.queueWarnMin)).toBe(true)
  })
})
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

`prng.ts`: mulberry32 from string hash.

`scenario.ts`: pure function cloning park; for `stormOutage` degrade power infra, drop fence voltages, mark some enclosure readings stale (`null` + old `lastReadingAt`), power down chargers, delay/cancel routes, spike queues/waits, set lab cold storage warning, add/update named incidents with `affectedAttractionIds` / `affectedRouteIds`, increase negative feedback. For `normal`, restore seed-like healthy values while preserving dinosaur placement.

`tick.ts`: if paused return park; else bump `tick`, nudge numeric readings slightly via PRNG(seed+tick), append to `readingHistory` (cap 20 samples/asset), re-run incident active flags from thresholds + scenario.

- [ ] **Step 4: Tests PASS**

Also test: `advanceTick` with `paused: true` does not change `tick`.

---

### Task 4: Selectors + defaults + KV client

**Files:**
- Create: `src/model/selectors.ts`, `src/state/defaults.ts`, `src/kv/keys.ts`, `src/kv/client.ts`
- Test: `src/model/selectors.test.ts`

**Interfaces:**
- Produces: `DEFAULT_CONFIG`, `EMPTY_OPERATOR`
- Produces: `selectOverviewMetrics(park, config, operator)`, `selectAnimalsNeedingAttention`, `selectCriticalIncidentCount`, …
- Produces: `kvGet<T>(path)`, `kvPut(path, value)`, `KV_KEYS`

- [ ] **Step 1: Failing selector test** — guests KPI equals `park.guestsInPark`; critical count counts only `active && severity==='critical'` (acks do not reduce count).

- [ ] **Step 2: Implement defaults + selectors + kv**

```ts
// keys.ts
export const KV_KEYS = {
  settings: 'config/settings',
  acks: 'operator/acks',
  notes: 'operator/notes',
} as const
```

```ts
// client.ts
export async function kvGet<T>(path: string): Promise<T | null> {
  const base = window.CRIBL_API_URL
  if (!base) return null
  try {
    const res = await fetch(`${base}/kvstore/${path}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`KV GET ${path} ${res.status}`)
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function kvPut(path: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  const base = window.CRIBL_API_URL
  if (!base) return { ok: false, error: 'CRIBL_API_URL missing' }
  try {
    const res = await fetch(`${base}/kvstore/${path}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
    })
    if (!res.ok) return { ok: false, error: `KV PUT ${path} ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'KV PUT failed' }
  }
}
```

In local vite without Cribl parent, KV no-ops to null/false — UI still works with defaults; show Alert when save fails.

- [ ] **Step 3: Tests PASS**

---

### Task 5: ParkProvider + hooks

**Files:**
- Create: `src/state/ParkProvider.tsx`, `src/state/usePark.ts`

**Interfaces:**
- Produces context value:

```ts
{
  park: ParkModel
  config: ConfigSettings
  operator: OperatorState
  selection: { kind: 'asset' | 'incident'; id: string } | null
  kvStatus: { settingsLoaded: boolean; error?: string }
  setSelection(sel): void
  acknowledgeIncident(id: string): Promise<void>
  saveNote(targetId: string, text: string): Promise<void>
  updateConfig(partial: Partial<ConfigSettings>, opts?: { persist?: boolean }): Promise<void>
  saveConfig(): Promise<void>  // persist current config
  pause(): void
  resume(): void
  setScenario(id: ScenarioId): void
  resetSimulation(opts?: { clearOperator?: boolean }): Promise<void>
}
```

- [ ] **Step 1: Implement provider**

On mount: `createSeedPark()` → apply `config.scenario`; load KV settings/acks/notes in parallel; merge.

`useEffect` interval on `config.tickMs`: if !paused, `setPark(p => advanceTick(p, config, Date.now()))`.

When scenario changes: `setPark(p => applyScenario({...p, scenario}, scenario, config))`.

Ack: update operator.acks locally + `kvPut(KV_KEYS.acks, …)`; never set `incident.active = false`.

Reset: confirm handled by caller; provider reseeds + optionally clears operator + KV.

- [ ] **Step 2: Smoke** — temporary App render of `park.guestsInPark` text; `npm run build` OK. Remove temp UI in Task 6.

---

### Task 6: App shell, routing, shared chrome components

**Files:**
- Create: `src/components/AppShell.tsx`, `PageFrame.tsx`, `DemoModeBadge.tsx`, `StatusIndicator.tsx`, `MetricCard.tsx`, `ScenarioControls.tsx`
- Modify: `src/App.tsx`, `src/App.css`, `src/styles/*`
- Copy: `assets/claw_and_order_logo.png` → `src/assets/claw_and_order_logo.png`

**Interfaces:**
- `AppShell` wraps nav + `<Outlet />` + `InvestigationDrawer` placeholder
- Routes: `/`, `/enclosures`, `/compatibility`, `/services`, `/settings`

- [ ] **Step 1: Capra nav**

Use `VerticalNavigation`, `VerticalNavigation.ItemList`, `VerticalNavigation.Item`, `VerticalNavigation.Footer` with React Router `NavLink`/`useLocation` for `isActive`. Icons from `@capra/icons` (`HomeOutlined`, appropriate enclosure/services icons, `Cog`, `Book`). Documentation item: `href` to Cribl apps docs or brand PDF via `target` carefully — for in-app, link to `/settings` About tab or external `https://docs.cribl.io/apps` with platform linking rules (`target="_blank"` for external).

Logo + title in content header (`PageFrame`), not in nav. Include `DemoModeBadge` (Pill/Tag + text “Demo Mode”).

- [ ] **Step 2: PageFrame**

```tsx
export function PageFrame({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="page-frame">
      <div className="page-frame__header">
        <Text as="h1" variant="heading">{title}</Text>
        <div className="page-frame__actions">{actions}</div>
      </div>
      <div className="page-content-grid">{children}</div>
    </div>
  )
}
```

CSS grid 12 columns per Capra Overview template.

- [ ] **Step 3: StatusIndicator + MetricCard**

StatusIndicator: Capra icon + text + Tag/Pill color. MetricCard: Capra `Card` with label, large tabular value, optional status.

- [ ] **Step 4: Wire App**

`ParkProvider` → `AppShell` → routes with placeholder pages (`Text` only). `npm run build` passes.

---

### Task 7: Investigation Drawer

**Files:**
- Create: `src/components/InvestigationDrawer.tsx`
- Modify: `AppShell.tsx`

**Interfaces:**
- Consumes: `selection`, park, config, operator, acknowledgeIncident, saveNote, setSelection
- Shows readings, thresholds, freshness, related assets, affected attractions/tours, ack + notes

- [ ] **Step 1: Implement Drawer**

Use Capra `Drawer` with `isOpen={!!selection}` `onOpenChange` clearing selection. Resolve entity by id across enclosures/dinos/vehicles/infra/incidents. If `lastReadingAt` older than `staleThresholdSec`, show Unknown/Stale. Trend: last samples from `readingHistory[id]`. Related links call `setSelection`. Incident ack button disabled when already acked; helper text: “Acknowledged does not clear an active fault.”

- [ ] **Step 2: Manual verify** — open from a temporary button; ack persists after reload when KV available.

---

### Task 8: Park Overview + schematic map

**Files:**
- Create: `src/pages/OverviewPage.tsx`, `src/components/ParkMap.tsx`, `src/styles/park-map.css`
- Modify: routes

- [ ] **Step 1: ParkMap SVG**

Schematic zones from enclosure `map` rects; route polylines; status-colored markers; click → `setSelection({ kind:'asset', id })`. Subtle dino silhouette watermark (SVG path, low opacity). No photography.

- [ ] **Step 2: OverviewPage**

KPI cards from selectors; map span 7; incident list span 5 (severity, unacked first); `ScenarioControls` compact; Demo Mode visible. Selecting incident opens Drawer.

---

### Task 9: Enclosures & Dinosaurs page

**Files:**
- Create: `src/pages/EnclosuresPage.tsx`

- [ ] **Step 1: Tables template**

≤4 KPI cards. `TabNav` or `ToggleButtonGroup`: Dinosaurs | Enclosures | Species. Capra `Table` + `defineColumns`. Columns: name link, species, enclosure, inherent threat, operational risk (separate), welfare, fence/env as applicable. Row/name click → Drawer. Empty cells use Capra empty placeholder, not blank.

---

### Task 10: Compatibility engine + page

**Files:**
- Create: `src/compatibility/rules.ts`, `src/compatibility/assess.ts`, `src/pages/CompatibilityPage.tsx`
- Test: `src/compatibility/assess.test.ts`

**Interfaces:**

```ts
export type CompatVerdict = 'compatible' | 'conditional' | 'incompatible' | 'insufficientData'
export interface CompatResult {
  verdict: CompatVerdict
  reasons: string[]
  conditions: string[]
  impact: { sourceEnclosureIds: string[]; targetEnclosureId: string; attractionIds: string[]; summary: string }
}
export function assessCompatibility(input: {
  park: ParkModel
  speciesIds: string[]
  dinosaurIds: string[]
  targetEnclosureId: string
}): CompatResult
```

- [ ] **Step 1: Failing tests** — carnivore+herbivore prey conflict → incompatible; overlapping env + capacity OK → compatible; missing humidity on enclosure → insufficientData; capacity exceeded → incompatible; behavior tags requiring separation → conditional with conditions.

- [ ] **Step 2: Implement assess** — explicit fictional rules; label in UI “Fictional simulation rules.”

- [ ] **Step 3: CompatibilityPage** — multi-selects (SelectField/Checkbox lists), target enclosure, Assess button, result Card with verdict + reasons + impact. No Apply.

---

### Task 11: Services & guest experience page

**Files:**
- Create: `src/pages/ServicesPage.tsx`

- [ ] **Step 1: Overview modules**

Attractions (status, queue, wait, crowding); safari departures + utilization; vehicles battery/readiness; chargers powered/available; feedback list with response counts; lab incubators + hatch dates + cold storage; Alert callouts when weather/power degrade services. Clicks open Drawer.

---

### Task 12: Settings (Config) page

**Files:**
- Create: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Setup Config template**

`TabNav` tabs: Demo & scenario | Operator preferences | Park thresholds | About.

Forms use Capra fields (`Switch`, `SelectField`, `NumberField`). Dirty state; Cancel resets; Save → `saveConfig()` + Toast/Alert on failure.

Demo tab: scenario radios, pause switch, tick speed, Reset simulation (confirm Modal), Reset operator state (confirm Modal naming KV keys cleared).

Thresholds tab: editing `fenceVoltageMin` / queue mins must immediately affect selectors/incidents on next tick (updateConfig with persist false until Save, or Save-required — prefer **Apply on Save** for thresholds to avoid surprise, but scenario/pause apply immediately).

Spec reconciliation: scenario/pause apply immediately; threshold + preference edits require Save to persist and to recompute alert thresholds.

About: logo, brand promise, Demo Mode explanation, link to brand guide path in repo README.

---

### Task 13: README, polish, verification

**Files:**
- Modify: `README.md`, `package.json` displayName if needed (`Claw & Order Control`), ensure logo referenced

- [ ] **Step 1: Customer README** — Marketplace-oriented summary from brand guide; Demo Mode; no external APIs; support model Internal Only / Community as appropriate.

- [ ] **Step 2: Full verification**

```bash
npm test
npm run lint
npm run build
```

Manual checklist:
- [ ] All five nav routes render
- [ ] KPIs match across Overview/Enclosures/Services
- [ ] Storm cascade visible; pause freezes; reset restores
- [ ] Ack persists (when KV available) and fault remains active
- [ ] Compatibility verdicts + fictional rules label
- [ ] Light and dark via shell theme
- [ ] Demo Mode always visible
- [ ] Stale/unknown never green-only

- [ ] **Step 3: Ask user before git commit** of the application (spec/plan already committed separately if desired).

---

## Spec coverage checklist

| Spec section | Task(s) |
|---|---|
| Shell + nav + Demo badge | 6 |
| ParkModel + seed | 2 |
| Sim + storm cascade | 3, 5 |
| KV acks/notes/config | 4, 5, 12 |
| Overview + map + incidents | 8, 7 |
| Enclosures tables + threat vs risk | 9 |
| Compatibility assess-only | 10 |
| Services + lab + feedback | 11 |
| Settings full ops console | 12 |
| Drawer investigation | 7 |
| Brand/theme tokens | 1, 6, 13 |
| Frontend-only cleanup | 1 |
| Consistency selectors | 4, 8–11 |

## Self-review notes

- No `PageHeader` in Capra 1.16 → `PageFrame` substitute documented.
- Commit policy deferred to user ask (overrides plan-skill frequent commits).
- Threshold apply-on-Save vs immediate: documented in Task 12.
