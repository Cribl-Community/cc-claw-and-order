# Claw & Order Control — Design Spec

**Date:** 2026-09-30  
**Status:** Approved for implementation (Approach 1)  
**App:** Cribl App Platform + Capra (`claw-and-order`)

## 1. Product summary

Claw & Order Control is a holistic operations console for the fictional dinosaur park **Claw & Order**. It unifies park operations, animal/enclosure management, and guest experience so operators can see technical conditions and their guest impact in one connected model.

**Demo Mode** is always on and clearly labeled. Data is deterministic simulated park state. Operator acknowledgments, notes, and Config settings persist via Cribl KV store.

## 2. Decisions locked

| Topic | Choice |
|---|---|
| Architecture | Approach 1: single `ParkModel` store + Capra shell + shared Drawer |
| Persistence | KV for acks, notes, and Config; inventory/sim stays in-memory |
| Config scope | Full ops console: demo/scenario, operator prefs, live alert thresholds |
| Theme | Capra semantic tokens; shell owns light/dark; brand hexes as accents only |
| Inventory scale | Compact: ~8–10 dinosaurs, 5–6 species, 4–5 enclosures, 3 walking attractions, 2 safari routes, ~6 EVs |
| Compatibility | Assess only (no apply-move mutating inventory) |
| Backend | Frontend-only; remove unused backend scaffold |
| Branding | `assets/claw_and_order_logo.png` + brand guide colors/voice |

## 3. Brand & visual system

From `assets/Claw-and-Order-Brand-Guide.pdf`:

| Role | Hex (reference) | UI usage |
|---|---|---|
| Deep Navy | `#0B1C2C` | Brand field / logo preference |
| Charcoal | `#17232E` | Panel direction (prefer Capra surface tokens) |
| Fossil Ivory | `#F6EBD2` | Logo lettering reference |
| Amber | `#F2AD24` | Brand accent (sparingly) |
| Slate | `#ACBAC6` | Secondary detail |

**Status semantics (always color + icon + text):**

- Normal → green + check
- Warning → amber + warning
- Critical → red + critical
- Unknown / stale → neutral + explicit “Unknown” / “Stale” label

**Voice:** State condition, location, and consequence. No jokes in critical alerts. Label compatibility rules as fictional simulation rules.

**Logo:** Full lockup in app chrome / page header area (not inside `VerticalNavigation`). Min ~240px wide; preserve proportions; clear space ≥ half emblem height. Raster concept — check edge quality; do not stretch/recolor.

**Typography:** Capra font stack; sentence case for UI; uppercase reserved for logo and short facility IDs; tabular numerals for metrics.

## 4. Architecture

### 4.1 App shell

- React Router with `basename={window.CRIBL_BASE_PATH}`
- Capra `VerticalNavigation` (left) + `PageHeader` + 12-column grid
- Nav items (top):
  1. Park Overview (`HomeOutlined`)
  2. Enclosures
  3. Compatibility
  4. Services
- Nav bottom container: Settings (`Cog`), Documentation (`Book` → external/docs link)
- Shared Capra `Drawer` for asset / incident investigation (portal; works in both themes)
- Persistent **Demo Mode** badge in header
- Scenario / pause indicator when not Normal / when paused

### 4.2 Capra page templates

| Route | Path | Template |
|---|---|---|
| Park Overview | `/` | Overview |
| Enclosures & Dinosaurs | `/enclosures` | Tables (+ ≤4 KPI cards) |
| Compatibility Planner | `/compatibility` | Overview-style form + result modules |
| Park Services | `/services` | Overview |
| Settings (Config) | `/settings` | Setup Config — post-setup tabs + Save |

Do not invent alternate navigation. Follow Capra grid: 12 columns, `token('spacing.lg')` gutters/padding.

### 4.3 State layers

```
┌─────────────────────────────────────────┐
│  ConfigSettings (KV: config/settings)   │  scenario, pause, speed, prefs, thresholds
├─────────────────────────────────────────┤
│  OperatorState (KV: operator/acks,      │  ack ≠ resolved; notes by incident/asset
│                 operator/notes)         │
├─────────────────────────────────────────┤
│  ParkModel (in-memory, seeded)          │  inventory + live readings + incidents
│    + SimulationClock                    │  tick advances derived metrics
│    + ScenarioOverlay                    │  Normal | StormOutage
└─────────────────────────────────────────┘
         ↓ selectors
   Views + Drawer (consistent counts)
```

**Consistency rule:** Guests in park, attraction queues, safari seats, enclosure populations, and headline KPIs are derived from the same `ParkModel` — never duplicated per view.

### 4.4 Persistence (KV)

| Key | Value |
|---|---|
| `config/settings` | JSON: scenario, paused, tickMs, defaultLanding, staleThresholdSec, density, guestCapacity, queueWarnMin, queueCritMin, fenceVoltageMin, hatchAlertDays, … |
| `operator/acks` | `{ [incidentId]: { acknowledgedAt, by } }` |
| `operator/notes` | `{ [targetId]: { text, updatedAt } }` where targetId is incident or asset id |

On load: fetch KV → merge into app state (defaults if missing). On Save (Settings) or ack/note: PUT KV. Confirm before destructive resets that clear operator state.

### 4.5 Frontend-only cleanup

Remove: `config/backend.yml`, `backend/*`, `tsconfig.backend.json` (+ root `tsconfig.json` reference), `config/schedules.yml`. Keep `apps build` in `package.json`. Empty/minimal `policies.yml` / `proxies.yml` as appropriate (no external APIs required).

## 5. Domain model (compact inventory)

### 5.1 Species (~5–6)

Examples: Tyrannosaurus, Velociraptor, Triceratops, Brachiosaurus, Dilophosaurus, Gallimimus.

Fields: `id`, `displayName`, `diet` (carnivore|herbivore|omnivore), `inherentThreat` (1–5), `sizeClass`, `behaviorTags[]`, `tempRangeC`, `humidityRangePct`, `containmentClass`, `maxGroupSize`, `preyOf[]` / `predatorOf[]` (species ids).

**Inherent threat** vs **operational risk** are separate: threat is species profile; operational risk combines enclosure containment health, welfare, incidents, power.

### 5.2 Dinosaurs (~8–10)

`id`, `name`, `speciesId`, `enclosureId`, `sex`, `welfareStatus`, `notes`.

### 5.3 Enclosures (~4–5)

`id`, `name`, `zone`, `capacity`, `mapRect`, `attractionIds[]`, `tempC`, `humidityPct`, `fenceVoltage`, `gateStatus`, `lastReadingAt`, `supportedBy[]` (infrastructure ids).

### 5.4 Attractions (~3 walking)

`id`, `name`, `enclosureIds[]`, `status`, `queueLength`, `waitMinutes`, `crowding`, `zone`.

### 5.5 Safari (~2 routes, ~6 EVs)

Routes: `id`, `name`, `stopEnclosureIds[]`, `departures[]`, `status`.  
Vehicles: `id`, `routeId`, `batteryPct`, `readiness`, `chargerId`, `seats`, `occupiedSeats`.  
Chargers: `id`, `available`, `powered`.

### 5.6 Lab

Incubators: `id`, `speciesId`, `expectedHatchAt`, `tempC`, `humidityPct`, `status`.  
Cold storage: `tempC`, `status`, `lastReadingAt`.

### 5.7 Infrastructure & weather

Power zones, weather station. `supports[]` links to enclosures, chargers, lab, attractions. Weather: `condition`, `severity`.

### 5.8 Incidents

`id`, `severity`, `title`, `description`, `assetIds[]`, `affectedAttractionIds[]`, `affectedRouteIds[]`, `openedAt`, `active` (from readings/scenario). Acknowledgment is overlay — does not set `active=false`.

### 5.9 Guests

Single `guestsInPark` derived consistently with attraction occupancy + safari seats + baseline foot traffic.

## 6. Simulation

- Deterministic PRNG seeded constant (e.g. `claw-and-order-v1`).
- Tick interval from Config (`tickMs`); Pause freezes ticks.
- **Normal:** mostly healthy readings; 0–1 low-severity issues; tours running.
- **Storm + Power Outage overlay:**
  - Power zone degraded → fence voltage drop, chargers offline, some sensors stale (`unknown`)
  - Critical incidents for fence/power; safari routes delayed/cancelled; walking queues spike; lab incubator/cold-storage warnings; guest feedback volume up
  - Cascades visible on Overview map, Services, and Drawer related-assets
- **Reset:** reseed ParkModel to Normal baseline; optional confirmed clear of operator KV state.
- Stale if `now - lastReadingAt > staleThresholdSec` → treat as unknown.

## 7. Views

### 7.1 Park Overview (`/`) — Overview template

- KPI row (spans ~2 each): critical incidents, animals needing attention, attractions available, guests in park, typical wait, longest wait, tour readiness.
- Schematic park map (SVG): labeled zones, enclosure markers, route lines, status-colored assets; click opens Drawer.
- Prioritized incident list (severity → unacknowledged first); select opens Drawer; ack + notes without clearing active fault.
- Compact scenario/pause controls (full controls live in Settings).

### 7.2 Enclosures & Dinosaurs (`/enclosures`) — Tables template

- ≤4 KPI cards: enclosure alerts, welfare alerts, avg fence voltage / unknowns, capacity utilization.
- Tabs or segmented control: Dinosaurs table | Enclosures table | Species profiles.
- Columns emphasize inherent threat vs current operational risk separately.
- Env readings vs species requirements; fence V; gate status.
- Row click → Drawer.

### 7.3 Compatibility Planner (`/compatibility`)

- Multi-select species and/or individual dinosaurs; select target enclosure.
- Engine evaluates fictional rules: diet, predator/prey, behavior, size, population limits, enclosure capacity, containment class, overlapping temp/humidity.
- Verdict: **Compatible | Conditional | Incompatible | Insufficient data** with reasons and required conditions.
- Impact panel: effect on source enclosure(s), target enclosure, and linked viewing attractions (assess only — no inventory mutation).
- Rules labeled as fictional simulation rules.

### 7.4 Park Services & Guest Experience (`/services`) — Overview template

- Attraction availability, walking-zone crowding, queues/waits.
- Safari departures, seat utilization, delays/cancellations.
- EV battery/readiness, charger availability (power-aware).
- Guest feedback list with response counts.
- Lab: incubators, expected hatch dates, cold storage; power/weather impact callouts.
- Asset click → Drawer.

### 7.5 Settings (`/settings`) — Setup Config template

Tabs:

1. **Demo & scenario** — Demo Mode (read-only on), scenario Normal | Storm+Outage, pause, tick speed, Reset simulation, Reset operator state (confirm).
2. **Operator preferences** — default landing route, Drawer behavior, stale-data threshold, density.
3. **Park thresholds** — guest capacity, queue warn/crit minutes, fence voltage minimum, hatch alert window; changing these recompute alert/incident severity against live readings.
4. **About** — brand blurb, Demo Mode explanation, link to brand guide / docs.

Save persists `config/settings` to KV. Cancel reverts dirty form.

## 8. Investigation Drawer

On any asset or incident selection:

- Identity: name/id, location, status (icon+text)
- Data freshness: last update; Unknown/Stale when applicable
- Current readings + units + thresholds (from Config where relevant)
- Short trend sparkline / last N tick samples (in-memory ring buffer)
- Related assets and affected attractions/tours (links that re-target Drawer or navigate)
- Incidents: Acknowledge (disabled if already acked); Notes textarea with save → KV
- Acknowledgment must not clear an ongoing fault

## 9. Error / empty / permission states

- KV read failure → defaults + inline Alert (“Could not load saved settings; using defaults”)
- KV write failure → toast/Alert; keep local dirty state for retry
- Empty tables → Capra `EmptyState`
- Loading → Skeleton matching layout spans
- No Cribl API product calls required for core demo

## 10. Testing & verification

- Unit tests for compatibility engine (diet/predator/capacity/env overlap/insufficient data)
- Unit tests for scenario overlay cascades (power → fence/chargers/safari)
- Unit tests for selectors: KPI consistency across views
- Manual: light/dark via shell theme; Demo Mode visible; ack persists across reload; reset confirmations
- `npm run build` / lint clean

## 11. Out of scope (v1)

- Applying compatibility moves to inventory
- Real Cribl Search/Stream telemetry ingestion
- Multi-user realtime sync beyond shared KV
- Vector logo masters / light-surface logo variant
- Custom theme switcher
- Backend simulation endpoint

## 12. File layout (target)

```
src/
  main.tsx                 # theme bridge + router root
  App.tsx                  # shell: nav + routes + drawer host
  host-theme.ts
  brand/
  data/                    # seed inventory
  model/                   # types, selectors
  sim/                     # clock, scenario overlay, PRNG
  compatibility/           # rule engine
  kv/                      # get/put helpers
  state/                   # ParkProvider, hooks
  components/              # StatusBadge, MetricCard, ParkMap, DemoBadge, …
  pages/
    OverviewPage.tsx
    EnclosuresPage.tsx
    CompatibilityPage.tsx
    ServicesPage.tsx
    SettingsPage.tsx
assets/
  claw_and_order_logo.png
  Claw-and-Order-Brand-Guide.pdf
docs/superpowers/specs/
  2026-09-30-claw-and-order-control-design.md
```

## 13. Success criteria

1. Four operational views + Settings, all Capra-templated and nav-linked.
2. One park model; metrics consistent across views.
3. Storm scenario shows cascading ops + guest impact; pause/reset work.
4. Drawer shows readings/thresholds/freshness/relations; ack ≠ clear.
5. Config changes affect alerts/thresholds; settings/acks/notes survive reload via KV.
6. Demo Mode always labeled; unknown/stale never shown as healthy.
7. Brand logo + guide aesthetics within Capra token constraints; light and dark usable.
