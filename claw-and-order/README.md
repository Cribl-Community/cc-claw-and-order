# Claw & Order

Operations console for Claw & Order, the living dinosaur park. Control-room staff use it to watch enclosure health, guest impact, fleet and lab status, and open incidents in one connected park model.

This README uses fixed section names and a fixed metadata table so it can be rendered as normal Markdown today and parsed into App Gallery components later.

## Summary

Claw & Order is a Cribl app for park operations. It gives operators a single view of containment, animal welfare, attractions, safari fleet, and the hatchery lab — then lets them investigate an incident or asset without leaving the console.

## What This App Does

Claw & Order is the park’s day-to-day control room. Live park state drives every view. Operator acknowledgments, investigation notes, and threshold settings persist in the app-scoped Cribl KV store so the next shift picks up where the last one left off.

* Primary purpose: keep enclosure risk, guest experience, and response work in one model.
* Key capabilities:
  * **Park Overview** — KPIs, schematic park map, and a prioritized incident list
  * **Enclosures** — dinosaurs, habitats, and species with threat, welfare, fence, and environment readings
  * **Compatibility** — assess whether two species can share an enclosure before anyone moves animals
  * **Park Services** — attractions, queues, power, and weather impact on guests
  * **Fleet** — safari vehicles, chargers, routes, and departure coverage
  * **Lab** — incubators, cold storage, egg weights, and airlock status
  * **Investigation drawer** — status, freshness, related assets, acknowledge, and notes
  * **Scenario controls** — Normal operations or Storm + Outage, with pause for freeze-frame review
  * **Settings** — alert thresholds, density, and operator preferences
* Intended users:
  * Park control-room operators
  * Shift supervisors and incident responders
  * Enclosure, fleet, and lab leads who need shared situational awareness
* Works with:
  * Any Cribl deployment that can install Apps (Cribl.Cloud or hybrid). The console does not call Stream, Edge, Search, or Lake product APIs.

## When To Use This App

* Run the park control room from one Cribl-hosted console.
* Track how weather and power events cascade into fence voltage, safari coverage, and guest waits.
* Acknowledge incidents and leave notes that survive a reload for the next operator.
* Compare species compatibility before cohabitation decisions.
* Tune alert thresholds for queues, fence voltage, and hatch windows.

## Before You Install

* Required Cribl product or deployment type: a Cribl Leader that supports Apps. No Stream, Edge, Search, or Lake group is required.
* Required permissions or roles: a user who can open the installed app. App-scoped KV access is granted when an admin shares the app. No extra product API policies are declared.
* Required external systems or APIs: none.
* Required configuration values: none. The park boots from built-in defaults and loads any saved settings from KV.
* Known limits or prerequisites: the console is self-contained inside Cribl. Acknowledgments and notes need KV to persist across reloads.

## Installation

Use Marketplace installation as the default path whenever the app is available there. This gives operators the easiest install path and makes future upgrades simpler.

### Install From Marketplace or URL
1. Go to Apps in your Cribl environment.
2. Choose the Marketplace or import from URL option.
3. If the app is available in the Cribl Marketplace, install it directly from there.
4. If the app is distributed as a Marketplace-hosted URL, use the URL to import it.
5. Review the app details and complete installation.

Why this is the preferred path:
* Simplest user experience
* Easier to adopt future releases
* Cleaner upgrade path when newer versions are published

### If The App Is Not Yet In The Cribl Marketplace
1. Go to the app's GitHub repository.
2. Open the Releases section, or use the `build/claw-and-order-1.0.0.tgz` package from this repository.
3. Download the `.tgz` app package for the version you want.
4. In Cribl, go to Apps and choose import from file.
5. Upload the downloaded `.tgz` file.
6. Review the app details and complete installation.

Use this path when the app has not yet been published to the Cribl Marketplace or when you need to install a specific release artifact manually.

## Configuration

No setup form is required. The app loads saved settings from KV when present and otherwise uses these defaults. Scenario and pause are available from Park Overview. Thresholds and preferences are edited under Settings.

| Setting | Required | Description | Example | Scope |
|---|---|---|---|---|
| Scenario | No | Operations overlay. `normal` or `stormOutage`. | `normal` | per-app |
| Paused | No | Freezes park ticks while paused. | `false` | per-app |
| Tick interval | No | Milliseconds between park state updates. | `5000` | per-app |
| Stale threshold | No | Seconds after which a reading is treated as stale. | `300` | per-app |
| Guest capacity | No | Capacity used to color the guests-in-park KPI. | `5000` | per-app |
| Queue warn / crit | No | Wait minutes that mark warning and critical queue status. | `15` / `30` | per-app |
| Fence voltage minimum | No | Volts below which containment is degraded. | `7500` | per-app |
| Hatch alert window | No | Days before an expected hatch that raise an alert. | `7` | per-app |

Blank or missing KV values fall back to the defaults above. Settings are shared for the app through the KV store, not stored per browser.

## How To Use

### Typical Workflow
1. Open the app from the Apps page.
2. Start on Park Overview: KPIs, park map, and the incident list.
3. Select an incident or map asset to open the investigation drawer. Acknowledge an incident or save a note.
4. Open Enclosures to review threat, operational risk, welfare, and fence readings.
5. Use Compatibility before moving animals between habitats.
6. Check Services for queues and guest impact; Fleet for safari readiness; Lab for incubators and cold storage.
7. Switch to Storm + Outage when you need to rehearse cascading fence, power, and wait impact. Pause to freeze the board.
8. Adjust thresholds in Settings when warn or critical bands need a tune.

### First-Run Checklist
* Open Park Overview and confirm KPIs and the incident list load.
* Select an incident and save a note, then reload and confirm the note is still there.
* Switch to Storm + Outage and confirm overview status changes, then switch back to Normal.
* Open Fleet and Lab and confirm vehicle, charger, incubator, and cold-storage panels render.

## Permissions

Core console behavior does not call Cribl product configuration APIs. The app reads and writes its own KV keys. If KV is unavailable, the park still runs on defaults and a load error is recorded in app state. Acknowledge and note saves report a failure and keep the local change so you can retry.

### Cribl API Endpoints Used

The platform proxies these app-scoped KV calls. They are granted with the app and are not listed in `config/policies.yml`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/a/{appId}/kvstore/config/settings` | Load saved scenario, pause, and threshold settings |
| PUT | `/api/v1/a/{appId}/kvstore/config/settings` | Save settings when a persist path runs |
| GET | `/api/v1/a/{appId}/kvstore/operator/acks` | Load incident acknowledgments |
| PUT | `/api/v1/a/{appId}/kvstore/operator/acks` | Save acknowledgments |
| GET | `/api/v1/a/{appId}/kvstore/operator/notes` | Load operator notes |
| PUT | `/api/v1/a/{appId}/kvstore/operator/notes` | Save operator notes |

`window.getCriblUser()` supplies the username stored on an acknowledgment when the host provides it.

## External API Access

This app does not call external APIs.

### Default Configuration
* `config/proxies.yml` — no external domains
* `config/policies.yml` — empty policy list

### External Endpoints

None.

## Data And Storage

| KV key | Contents |
|---|---|
| `config/settings` | Scenario, pause, tick interval, landing route, stale threshold, density, and alert thresholds |
| `operator/acks` | Acknowledgment time and operator id by incident id. An acknowledgment does not clear the incident. |
| `operator/notes` | Note text and update time by incident or asset id |

Park inventory, live readings, and the operations clock stay in the console session and refresh while the app is open. Acknowledgments and notes are shared for the app through KV, not private to one browser. Uninstall cleanup of KV data follows the Cribl Apps platform. There is no backend and no scheduled job.

## Support

### Community Built
This app is provided as a community contribution. It may be useful for shared park workflows and learning the Cribl App Platform, but it does not carry an official support commitment from Cribl. Maintenance and updates depend on the community maintainer. Open an issue on the [GitHub repository](https://github.com/Cribl-Community/cc-claw-and-order/issues).

## Known Limitations

* Compatibility assessments are advisory — they do not automatically move animals in inventory.
* Live tick state is per browser session. KV shares acknowledgments, notes, and saved settings across operators, not the in-session clock.
* Reset of operator KV state requires an explicit confirmation in Settings.
* The console does not ingest Stream, Edge, Search, or Lake product telemetry.

## Troubleshooting

### The App Opens But Some Features Do Not Work
Possible causes:
* KV load failed, so settings and notes fell back to defaults. Check that the app is installed and shared with your user.
* Scenario or pause controls are on Park Overview; threshold edits live under Settings.

### The App Cannot Connect To An API Or Service
Check:
* This app has no external endpoints and no product API policies.
* KV failures surface when acknowledgments or notes do not survive a reload. Confirm the app is running inside Cribl so `CRIBL_API_URL` is set.

### The App Works Locally But Not In Cribl
Check:
* You installed the `.tgz` from `build/`, not the raw repository.
* The packaged version matches the release you intended to install.
* `npm run dev` outside Cribl has no KV host, so saves report `CRIBL_API_URL missing` and the console still runs locally.

## Development

```bash
npm install
npm run dev
npm test
npm run package -- --version 1.0.0
```

`npm run package` builds the app and writes `build/claw-and-order-<version>.tgz`. With no version flag it increments the patch version before packing.

The app is frontend-only. There is no `config/backend.yml`. `apps build` in `npm run build` is a no-op without a backend manifest.

Main source:

* `src/App.tsx` — routes
* `src/pages/` — Overview, Enclosures, Compatibility, Services, Fleet, Lab, Settings
* `src/state/ParkProvider.tsx` — park model, operations clock, KV load and save
* `src/data/seed.ts` — starting inventory
* `src/sim/` — tick, scenario overlay, deterministic PRNG
* `src/model/` — types and selectors

## Project Layout

```text
src/
  App.tsx
  main.tsx
  host-theme.ts
  assets/
  components/
  compatibility/
  data/
  kv/
  model/
  pages/
  sim/
  state/
  styles/
config/
  policies.yml
  proxies.yml
docs/
public/
build/                 packaged .tgz (created by npm run package)
README.md
package.json
```

## Versioning And Releases

* Follow semantic versioning. Current package version is `1.0.0`.
* `npm run package` bumps the patch version unless you pass `--version`, `--minor`, or `--major`.
* Install a specific build by uploading the matching `.tgz`.

## Contributing

Open an issue or pull request on the GitHub repository. Keep customer-facing copy in this README and developer platform notes in `AGENTS.md`. Match existing TypeScript and Capra UI patterns.

## License

No license file is included in this repository.

## App Metadata

Use this table as the canonical source for gallery fields. Keep the left column labels exactly as written.

| Field | Value |
|---|---|
| App Name | Claw & Order |
| App ID | claw-and-order |
| Version | 1.0.0 |
| Author | John Owen |
| Support Model | community-built |
| Support Label | Community Built |
| Support Contact | https://github.com/Cribl-Community/cc-claw-and-order/issues |
| License | None |
| License File | |
| Product Tags | |
| Category | operations |
| Audience | end-user, builder |
| Availability | preview |
| Requires External Access | no |
| Repository | https://github.com/Cribl-Community/cc-claw-and-order |
| Documentation | https://docs.cribl.io/apps |
| README Schema Version | 1.0 |

---

**Disclaimer:** Claw & Order is a fictional park. This example app was built for the CriblCON 26 App Hackathon.
