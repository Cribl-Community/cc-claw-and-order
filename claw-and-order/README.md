# Claw & Order

Demo operations console for the fictional dinosaur park Claw & Order. Operators see enclosure health, guest impact, and incidents in one simulated park model.

This README uses fixed section names and a fixed metadata table so it can be rendered as normal Markdown today and parsed into App Gallery components later.

## Summary

Claw & Order is a Cribl app for demonstrating a connected operations console. It helps users watch park conditions, investigate incidents and assets, and see how a storm-and-outage scenario cascades across fences, tours, and guest waits.

## What This App Does

Claw & Order runs a labeled **Demo Mode** simulation. Inventory, readings, and incidents are generated in the browser. Operator acknowledgments and notes persist in the app-scoped Cribl KV store.

* Primary purpose: show a single park model across overview metrics, an enclosure inventory, and an investigation drawer.
* Key capabilities:
  * Park Overview with KPIs, a schematic map, and a prioritized incident list
  * Enclosures view with dinosaur, enclosure, and species tables
  * Scenario switch between Normal and Storm + Outage, plus pause
  * Investigation drawer with status, freshness, related assets, acknowledge, and notes
* Intended users:
  * Demo presenters
  * Builders learning the Cribl App Platform
* Works with:
  * Any Cribl deployment that can install Apps (Cribl.Cloud or hybrid). The demo does not call Stream, Edge, Search, or Lake product APIs.

Compatibility, Park Services, and Settings are present in navigation as placeholders.

## When To Use This App

* Walk through a fictional operations console inside Cribl without connecting production telemetry.
* Show how one in-memory model keeps guest counts, queues, and enclosure status consistent.
* Show KV persistence for operator acknowledgments and notes across reloads.

## Before You Install

* Required Cribl product or deployment type: a Cribl Leader that supports Apps. No Stream, Edge, Search, or Lake group is required.
* Required permissions or roles: a user who can open the installed app. App-scoped KV access is granted when an admin shares the app. No extra product API policies are declared.
* Required external systems or APIs: none.
* Required configuration values: none. The simulation starts from built-in defaults.
* Known limits or prerequisites: Demo Mode cannot be turned off. Data is simulated, not live park or Cribl telemetry.

## Installation

Use Marketplace installation as the default path whenever the app is available there. This gives users the easiest install path and makes future upgrades simpler.

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

No setup form is required. The app loads saved settings from KV when present and otherwise uses these defaults. Scenario and pause are changed from Park Overview. The Settings page does not edit these values yet.

| Setting | Required | Description | Example | Scope |
|---|---|---|---|---|
| Scenario | No | Simulation overlay. `normal` or `stormOutage`. | `normal` | per-app |
| Paused | No | Freezes simulation ticks while paused. | `false` | per-app |
| Tick interval | No | Milliseconds between simulation ticks. | `5000` | per-app |
| Stale threshold | No | Seconds after which a reading is treated as stale. | `300` | per-app |
| Guest capacity | No | Capacity used to color the guests-in-park KPI. | `5000` | per-app |
| Queue warn / crit | No | Wait minutes that mark warning and critical queue status. | `15` / `30` | per-app |
| Fence voltage minimum | No | Volts below which containment is degraded. | `7500` | per-app |
| Hatch alert window | No | Days before an expected hatch that raise an alert. | `7` | per-app |

Blank or missing KV values fall back to the defaults above. Settings are shared for the app through the KV store, not stored per browser.

## How To Use

### Typical Workflow
1. Open the app from the Apps page.
2. Confirm the Demo Mode badge on Park Overview.
3. Review KPIs, the park map, and the incident list.
4. Select an incident or map asset to open the investigation drawer. Acknowledge an incident or save a note.
5. Switch the scenario to Storm + Outage to see cascading fence, power, and guest-wait impact. Pause to freeze ticks.
6. Open Enclosures to compare inherent threat with current operational risk.

### First-Run Checklist
* Open Park Overview and confirm Demo Mode is visible.
* Select an incident and save a note, then reload and confirm the note is still there.
* Switch to Storm + Outage and confirm overview status changes, then switch back to Normal.

## Permissions

Core demo behavior does not call Cribl product configuration APIs. The app reads and writes its own KV keys. If KV is unavailable, the simulation still runs on defaults and a load error is recorded in app state. Acknowledge and note saves report a failure and keep the local change so you can retry.

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

Park inventory, live readings, and the simulation clock stay in memory and reset when the page reloads. Acknowledgments and notes are shared for the app through KV, not private to one browser. Uninstall cleanup of KV data follows the Cribl Apps platform. There is no backend and no scheduled job.

## Support

### Community Built
This app is provided as a community contribution. It may be useful for learning, experimentation, or shared workflows, but it does not carry an official support commitment from Cribl. Maintenance and updates depend on the community maintainer. Open an issue on the [GitHub repository](https://github.com/Cribl-Community/placeholder/issues).

## Known Limitations

* Demo Mode is always on. Nothing in the app is live park or Cribl telemetry.
* Compatibility, Park Services, and Settings are navigation placeholders.
* Scenario and pause changes from Park Overview are not written back to KV.
* Compatibility moves are not applied to inventory.
* The simulation is single-browser. KV shares acknowledgments, notes, and saved settings, not live tick state.
* Reset of operator KV state exists in code and requires an explicit confirmation before it is exposed in the UI.

## Troubleshooting

### The App Opens But Some Features Do Not Work
Possible causes:
* Compatibility, Services, or Settings still show placeholder copy. Use Park Overview and Enclosures.
* KV load failed, so settings and notes fell back to defaults. Check that the app is installed and shared with your user.

### The App Cannot Connect To An API Or Service
Check:
* This app has no external endpoints and no product API policies.
* KV failures surface when acknowledgments or notes do not survive a reload. Confirm the app is running inside Cribl so `CRIBL_API_URL` is set.

### The App Works Locally But Not In Cribl
Check:
* You installed the `.tgz` from `build/`, not the raw repository.
* The packaged version matches the release you intended to install.
* `npm run dev` outside Cribl has no KV host, so saves report `CRIBL_API_URL missing` and the simulation still runs locally.

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
* `src/pages/` — Overview, Enclosures, and placeholder pages
* `src/state/ParkProvider.tsx` — park model, simulation clock, KV load and save
* `src/data/seed.ts` — starting inventory
* `src/sim/` — tick, scenario overlay, deterministic PRNG
* `src/model/` — types and selectors

## Project Layout

```text
src/
  App.tsx
  main.tsx
  host-theme.ts
  components/
  data/
  model/
  pages/
  sim/
  state/
  kv/
  styles/
config/
  policies.yml
  proxies.yml
assets/
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
| Support Contact | https://github.com/Cribl-Community/placeholder/issues |
| License | None |
| License File | |
| Product Tags | |
| Category | operations demo |
| Audience | end-user, builder |
| Availability | preview |
| Requires External Access | no |
| Repository | https://github.com/Cribl-Community/placeholder |
| Documentation | https://docs.cribl.io/apps |
| README Schema Version | 1.0 |
