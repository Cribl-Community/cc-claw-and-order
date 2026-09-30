# Fleet and Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monitoring Fleet (`/fleet`) and Lab (`/lab`) pages with expanded park model, derived alerts, and Services summaries that link across.

**Architecture:** Extend the single in-memory `ParkModel`. Pure selectors decide departure coverage and incubator bounds. `syncIncidents` recomputes three new stable incident ids. Pages are Capra overview-style brand panels; rows open the existing drawer. No park mutations from these pages.

**Tech Stack:** React + Capra 1.16, Vitest, Vite, existing ParkProvider / drawer / brand CSS.

## Global Constraints

- Demo Mode always labeled; unknown/stale never shown as healthy.
- Ack does not clear an active fault.
- Battery coverage threshold is fixed at 70% (not Settings).
- No new KV keys; no operator actions that assign vehicles or close doors.
- Facility illustrations out of scope.
- Mirror finished files into `/Users/johnowen/GitHub Repositories/personal/claw-and-order` when done.
- Commit only when the user asks (user said implement, not commit each task).

---

### Task 1: Model types + seed

**Files:**
- Modify: `src/model/types.ts`
- Modify: `src/data/seed.ts`
- Modify: `src/data/seed.test.ts`

- [ ] **Step 1: Update types**

Replace `Incubator` / `LabState`; add `Egg`, `LabMachine`; add `Vehicle.lastReadingAt`; extend `defaultLanding`:

```ts
export interface Egg {
  id: string
  speciesId: string
  weightG: number | null
  weightRangeG: { min: number; max: number }
}

export interface Incubator {
  id: string
  name: string
  speciesId: string
  expectedHatchAt: number
  tempC: number | null
  humidityPct: number | null
  tempRangeC: { min: number; max: number }
  humidityRangePct: { min: number; max: number }
  door: 'closed' | 'open' | 'unknown'
  powered: boolean
  eggs: Egg[]
  lastReadingAt: number
}

export interface LabMachine {
  id: string
  name: string
  kind: 'cold-storage' | 'freezer' | 'airlock'
  tempC: number | null
  tempRangeC: { min: number; max: number } | null
  powered: boolean
  lastReadingAt: number
}

export interface LabState {
  incubators: Incubator[]
  machines: LabMachine[]
}
```

Vehicle gains `lastReadingAt: number`. `ConfigSettings.defaultLanding` adds `'/fleet' | '/lab'`.

- [ ] **Step 2: Reseed lab, vehicles, departures, incidents**

- Four incubators; `inc-01` door `open`; `inc-02` has an egg weight well below range (e.g. range 800–1000, weight 400).
- Machines: `lab-cold-storage`, `lab-freezer`, `lab-airlock`.
- Vehicles get `lastReadingAt: now - N`.
- Assign an upcoming departure to `veh-ev-03` (charging, 54%).
- Seed incidents: `inc-lab-door`, `inc-lab-weight`, `inc-fleet-uncovered` (active true).

- [ ] **Step 3: Fix seed.test for incubator count ≥ 4; run `npx vitest run src/data/seed.test.ts`**

---

### Task 2: Selectors + incident sync

**Files:**
- Create: `src/model/fleet.ts`
- Create: `src/model/lab.ts`
- Create: `src/model/fleet.test.ts`
- Create: `src/model/lab.test.ts`
- Modify: `src/sim/tick.ts` (`syncIncidents`)
- Modify: `src/sim/scenario.ts`
- Modify: `src/sim/clock.ts`

- [ ] **Step 1: Fleet helpers**

```ts
export const FLEET_BATTERY_MIN_PCT = 70

export function isDepartureUncovered(
  departure: { vehicleId: string },
  vehicle: Vehicle | undefined,
  now: number,
  staleThresholdSec: number,
): boolean

export function fleetSummaryStatus(park, config, now): OperationalStatus
```

Uncovered when missing vehicle, readiness not `ready`, battery null/stale, or battery < 70.

- [ ] **Step 2: Lab helpers**

```ts
export function incubatorInBounds(inc: Incubator, now, staleThresholdSec): boolean
export function anyDoorOpen(park): boolean
export function anyEggOutOfWeight(park): boolean
export function labSummaryStatus(park, config, now): OperationalStatus
```

In bounds: door closed, powered, fresh, temp/humidity in range, every egg weight in range (null weight → not in bounds).

- [ ] **Step 3: Wire syncIncidents + scenario + clock**

`syncIncidents` sets `active` for the three new ids from the helpers. Storm sets all `machines[].powered = false` (remove `coldStorage` mutation). Clock shifts vehicle `lastReadingAt`, incubator `lastReadingAt` + `expectedHatchAt`, machine `lastReadingAt`. Tick nudges temps/humidity/battery/weights without closing doors or healing out-of-range weight past the boundary; drop stored incubator `status`; update machines instead of `coldStorage`.

- [ ] **Step 4: Tests listed in spec §11; run vitest on fleet/lab/tick/scenario**

---

### Task 3: Drawer + Settings landing

**Files:**
- Modify: `src/components/InvestigationDrawer.tsx`
- Modify: `src/pages/SettingsPage.tsx` (landing options if enumerated)

- [ ] Resolve `labMachine` via `park.lab.machines`.
- [ ] Incubator panel: door, power, ranges, eggs, freshness.
- [ ] Vehicle panel: battery vs 70%, next departure.
- [ ] Machine panel: power, temp/range, freshness.

---

### Task 4: FleetPage + LabPage + nav/routes

**Files:**
- Create: `src/pages/FleetPage.tsx`
- Create: `src/pages/LabPage.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/App.tsx`

- [ ] Capra Overview-style brand panels matching Services.
- [ ] Fleet: 4 KPI cards + departures + vehicles + chargers tables.
- [ ] Lab: 4 KPI cards + incubators + machines tables.
- [ ] Nav: Services, Fleet, Lab (icons from `@capra/icons`).
- [ ] Routes `/fleet`, `/lab`.

---

### Task 5: Slim Services + verify

**Files:**
- Modify: `src/pages/ServicesPage.tsx`

- [ ] Remove safari/lab tables and dead helpers.
- [ ] Add two summary lines (fleet worst status, lab worst status) linking with `useNavigate` or Capra Link to `/fleet` and `/lab`.
- [ ] `npx tsc -b --pretty false` and full `npx vitest run`.
- [ ] Browser-check `/fleet`, `/lab`, `/services`.
- [ ] Mirror changed files to community clone.

---

## Spec coverage check

| Spec § | Task |
|---|---|
| Pages/nav/Services split | 4, 5 |
| Fleet coverage + 70% | 2, 4 |
| Lab bounds, door, eggs, machines | 1, 2, 4 |
| Incidents + sync | 2 |
| Tick/clock/storm | 2 |
| Drawer | 3 |
| Tests §11 | 2, 5 |
| Out of scope honored | all |
