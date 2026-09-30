# Fleet and Lab — Design Spec

**Date:** 2026-09-30  
**Status:** Approved for implementation (Approach 1)  
**App:** Cribl App Platform + Capra (`claw-and-order`)

Extends `2026-09-30-claw-and-order-control-design.md`. Where this spec names a new field or route, it wins. Demo Mode, the shared `ParkModel`, the investigation drawer, ack-does-not-clear, and stale-is-not-healthy stay in force.

## 1. Decision

Fleet (`/fleet`) and Lab (`/lab`) are monitoring pages. They do not edit the park. Services keeps guest experience and replaces its safari and lab tables with two summary lines that link here. Both pages use the control-room layout already on Services: status cards, then tables. A row opens the existing drawer.

Nav order: Overview, Enclosures, Compatibility, Services, Fleet, Lab. Settings stays in the footer. `ConfigSettings.defaultLanding` accepts `/fleet` and `/lab`.

## 2. Fleet

The page answers whether the next tours can roll.

**Status cards**

- Vehicles ready
- Departures covered
- Chargers powered
- Vehicles assigned to a departure but not ready

**Departures.** Route, route status, time, assigned vehicle, that vehicle’s charge and readiness, seats filled. Route status is the safari route’s `running`, `delayed`, `cancelled`, or `unknown`. A departure is uncovered when any of these is true:

- no vehicle with that id
- readiness is `charging`, `maintenance`, `offline`, or `unknown`
- battery is null, or the reading is stale
- battery is under 70%

70% is a fixed demo rule in the selector. It is not a Settings control.

**Vehicles.** Route, charge, readiness, charger, seats, next departure.

**Chargers.** Powered, the vehicle whose `chargerId` points at them, freshness. An unpowered charger is not available.

## 3. Lab

The page answers whether the clutch and the room are inside bounds.

**Status cards**

- Incubators in bounds
- Doors open
- Machines powered
- Hatches inside the existing `hatchAlertDays` window

**Incubators.** Four of them. Columns: species, door, temperature, humidity, egg count, worst egg weight against that egg’s range, expected hatch. Eggs are not a separate page. The row summary and the drawer list each egg.

An incubator is in bounds only when its door is `closed`, it is powered, its reading is fresh, temperature and humidity are inside their ranges, and every egg weight is inside `weightRangeG`. An open door is a security warning. Temperature, humidity, or any egg weight outside its range is an operational warning. A null or stale reading is unknown. Unknown is not in bounds and is not a second healthy state.

**Machines.** Cold storage, a sample freezer, and an airlock replace the single `coldStorage` object. Cold storage and the freezer show temperature against a range. The airlock shows power and status only. All three show power and freshness. A machine with no power is a warning.

## 4. Model

Status on these pages is derived. A stored `normal` cannot hide an open door or a dead charger.

**Vehicle.** Add `lastReadingAt: number`. Existing fields stay: `id`, `routeId`, `batteryPct`, `readiness`, `chargerId`, `seats`, `occupiedSeats`.

**Charger.** Unchanged: `id`, `available`, `powered`, `lastReadingAt`.

**Egg.** `id`, `speciesId`, `weightG: number | null`, `weightRangeG: { min, max }`.

**Incubator.** `id`, `name`, `speciesId`, `expectedHatchAt`, `tempC: number | null`, `humidityPct: number | null`, `tempRangeC`, `humidityRangePct`, `door: 'closed' | 'open' | 'unknown'`, `powered: boolean`, `eggs: Egg[]`, `lastReadingAt`. Drop the stored `status` field. Days to hatch is `expectedHatchAt` minus the sim clock.

**Lab machine.** `id`, `name`, `kind: 'cold-storage' | 'freezer' | 'airlock'`, `tempC: number | null`, `tempRangeC: { min, max } | null`, `powered: boolean`, `lastReadingAt`. `tempRangeC` is null for the airlock. `LabState` is `{ incubators, machines }`. Remove `coldStorage`.

Ids:

| Asset | Id |
|---|---|
| Cold storage | `lab-cold-storage` |
| Sample freezer | `lab-freezer` |
| Airlock | `lab-airlock` |

## 5. Seed

Normal seed:

- One incubator door is `open` (`inc-01`).
- One egg weight is outside `weightRangeG` (on `inc-02`). The miss is wide enough that tick jitter cannot cross back into range.
- One upcoming departure is assigned to `veh-ev-03`, which is `charging` at 54%. That departure is uncovered.
- All three lab machines are powered, fresh, and inside range.
- The other incubators are closed, powered, fresh, and inside range.

Storm + Outage keeps its current grid, fence, charger, route, and guest effects. It also sets every lab machine `powered: false`. It does not close the open door or repair the egg weight. Reset restores the normal seed.

## 6. Incidents

New incidents use stable ids. `syncIncidents` recomputes `active` from current readings on each tick and after a scenario change. Acknowledgement does not set `active` false.

| Id | Severity | Active while |
|---|---|---|
| `inc-lab-door` | warning | any incubator door is `open` |
| `inc-lab-weight` | warning | any egg weight is outside `weightRangeG` |
| `inc-fleet-uncovered` | warning | any departure is uncovered |

Asset ids point at the incubator, the incubator that holds the egg, or the vehicle and route. Storm’s existing incidents stay. A missing or stale reading does not raise one of these three; the row shows unknown.

## 7. Tick and clock

`advanceTick` may nudge temperature, humidity, charge, and weight. It does not change `door` or `readiness`. Weight nudges only on the same side of its range as the current value. A null reading stays null. Fresh nudges update `lastReadingAt`. Stale cold-storage behavior moves to the machine with id `lab-cold-storage`.

`anchorParkClock` shifts incubator `expectedHatchAt` and every new `lastReadingAt`, including vehicles and lab machines.

## 8. Selectors and Services

One coverage function decides that a departure is uncovered. The Fleet table, the Services fleet line, and `inc-fleet-uncovered` all call it. One bounds function decides incubator and egg state. The Lab table, the Services lab line, and `inc-lab-door` / `inc-lab-weight` all call it.

Services removes the departure, vehicle, charger, incubator, and cold-storage panels. It keeps attractions and guest feedback. Two lines replace the removed panels: worst fleet status and worst lab status, each linking to its page.

Overview incident list shows the new incidents with no extra UI.

## 9. Drawer

- Incubator: temperature, humidity, ranges, door, power, eggs (species, weight, range), freshness, related species.
- Lab machine: power, temperature and range when present, freshness.
- Vehicle: existing readings, plus charge against 70% and the next departure.

`resolveAsset` learns `labMachine`. Incubator resolution reads the expanded incubator.

## 10. Failure behavior

- Unknown vehicle id on a departure: uncovered.
- Null battery, temperature, humidity, or weight: that metric is unknown.
- Stale `lastReadingAt`: unknown, and a departure that depends on it is uncovered.
- Unpowered charger: not available.
- Unpowered lab machine: warning on the machine row. This is separate from `inc-lab-door` and `inc-lab-weight`.
- No new KV keys. No new buttons that write the park.

## 11. Tests

- Charging, stale, or battery under 70% marks that departure uncovered.
- Open door keeps `inc-lab-door` active after an ack record exists.
- Egg weight outside range keeps `inc-lab-weight` active.
- Null incubator temperature is unknown and is not in bounds.
- Tick does not close a door or pull an out-of-range weight back into range.
- Storm sets lab machines unpowered and does not clear the door or the weight.
- Reset returns the normal seed.
- Services does not render the fleet or lab tables.

## 12. Out of scope

Facility illustrations, new Settings thresholds, operator actions that assign vehicles or close doors, and a separate egg route.
