# Claw & Order Control

Claw & Order Control is a Demo Mode operations console for a simulated dinosaur park—showing how enclosure, safari, lab, and guest conditions connect in one Capra UI.

This README uses fixed section names and a fixed metadata table so it can be rendered as normal Markdown today and parsed into App Gallery components later.

## Summary

Claw & Order Control is a Cribl app for exploring a fictional park operations model in Demo Mode. It helps users see live-style enclosure and fence status, understand guest impact from power and weather cascades, and try assess-only compatibility planning without mutating inventory.

Use this section for the short, customer-facing description that should also work in an overview card or detail page.

## What This App Does

Claw & Order Control is a frontend-only demo console for the fictional park **Claw & Order**. All inventory and telemetry are simulated in the browser. Operator acknowledgments, notes, and Config settings can persist in the app-scoped Cribl KV store when the app runs inside Cribl.

* Primary purpose: Demonstrate a Capra operations console that ties park infrastructure, animals, safari fleet, lab, and guest experience together under an always-on Demo Mode badge.
* Key capabilities:
  * Park Overview with schematic map, KPI strip, and active incidents
  * Enclosures & dinosaurs tables with threat vs operational-risk framing
  * Assess-only compatibility planner using labeled fictional simulation rules
  * Park Services for attractions, safari departures, EV fleet, chargers, feedback, and lab
  * Settings for demo scenario, pause/tick, operator preferences, and alert thresholds
* Intended users:
  * Builders evaluating Cribl Apps + Capra patterns
  * Analysts and operators exploring demo workflows
  * Platform owners reviewing Marketplace community apps
* Works with:
  * Cribl App Platform (Stream / Edge / Search / Lake / Cribl.Cloud hosts that support Apps)

## When To Use This App

* You want a polished Capra demo of multi-page ops UI with shared investigation drawer
* You want to show storm/power cascade effects on fences, chargers, safari, and guest waits
* You want to try compatibility assessment without applying moves to inventory
* You want a frontend-only app that persists only operator prefs/acks/notes via KV

## Before You Install

* Required Cribl product or deployment type: Any Cribl environment that supports Apps (Cribl.Cloud or self-managed Leader with App Platform)
* Required permissions or roles: Ability to install/share Apps; AppUser access for app-scoped KV
* Required external systems or APIs: None — Demo Mode uses simulated park data only
* Required configuration values: None required at install; optional thresholds and scenario via in-app Settings
* Known limits or prerequisites: Inventory and simulation state are in-memory and reset on reload; only KV-backed operator state survives

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
2. Open the Releases section.
3. Download the `.tgz` app package for the version you want.
4. In Cribl, go to Apps and choose import from file.
5. Upload the downloaded `.tgz` file.
6. Review the app details and complete installation.

Use this path when the app has not yet been published to the Cribl Marketplace or when you need to install a specific release artifact manually.

## Configuration

No external API keys or endpoints are required. After install, open **Settings** inside the app to adjust Demo Mode behavior.

| Setting | Required | Description | Example | Scope |
|---|---|---|---|---|
| Scenario | No | Normal operations or storm/outage cascade overlay | `stormOutage` | per-app (KV `config/settings`) |
| Pause simulation | No | Freeze the deterministic sim clock | On | per-app (KV) |
| Tick interval | No | Simulation step interval in milliseconds | `2000` | per-app (KV) |
| Default landing | No | Preferred first page after open (stored; apply on next session as implemented) | `/services` | per-app (KV) |
| Stale threshold | No | Seconds after which readings show Unknown/Stale | `300` | per-app (KV) |
| Fence / queue / hatch thresholds | No | Alert thresholds for fence voltage, wait times, and hatch window | Fence min `9000` V | per-app (KV) |

* Nothing is mandatory for first open — seed Demo Mode runs immediately.
* Safe defaults ship in the app; Save writes Config to KV when the platform KV API is available.
* Leaving fields blank is not applicable; controls use explicit defaults.
* Operator acknowledgments and notes are shared per app instance via KV, not per browser profile.

## How To Use

### Typical Workflow
1. Open the app from the Apps page — Demo Mode badge is always visible.
2. Review Park Overview KPIs, map, and incidents; open any asset or incident in the investigation drawer.
3. Switch scenario to Storm / outage in Settings (or use the demo controls) to see cascade effects; pause freezes; reset restores seed state.
4. Use Enclosures, Compatibility (assess only), and Services for deeper tables and guest/fleet/lab views.
5. Acknowledge incidents and save notes as needed; they persist to KV when available. Acknowledgment does not clear an active fault.

### First-Run Checklist
* Confirm Demo Mode is labeled in the header
* Open an enclosure and an incident in the drawer
* Toggle storm scenario and verify fences/chargers/safari degrade
* Open Settings, change a threshold, Save (when KV is available)
* Toggle Cribl shell light/dark and confirm Capra surfaces follow the host theme

## Permissions

* Core functionality needs App install/share and the automatic AppUser grants for app-scoped KV (`/a/{appId}/kvstore/*`).
* No Cribl product API paths are declared in `config/policies.yml` — the app does not call Stream/Edge/Search config APIs.
* No external proxy domains are required (`config/proxies.yml` is empty by design).
* If KV is unavailable (for example local Vite without platform globals), the sim still runs; Save/ack/note persistence surfaces an error and in-memory behavior continues where applicable.

### Cribl API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/a/{appId}/kvstore/config/settings` | Load saved scenario, pause, and threshold settings |
| PUT | `/api/v1/a/{appId}/kvstore/config/settings` | Persist Settings when the operator saves |
| GET | `/api/v1/a/{appId}/kvstore/operator/acks` | Load incident acknowledgments |
| PUT | `/api/v1/a/{appId}/kvstore/operator/acks` | Save incident acknowledgments |
| GET | `/api/v1/a/{appId}/kvstore/operator/notes` | Load operator notes |
| PUT | `/api/v1/a/{appId}/kvstore/operator/notes` | Save operator notes |

This app should handle permission differences gracefully where possible. If a user lacks access to KV, Demo Mode simulation and UI remain usable; persistence actions show a helpful failure instead of failing the whole app.

## External API Access

### Default Configuration
* `config/proxies.yml` — empty; no external domains declared
* `config/policies.yml` — empty policy list; no Cribl product API grants required beyond automatic app KV
* Frontend-only — no `backend.yml` / scheduled functions

### External Endpoints
* None — the app makes no external API calls. Park data is entirely simulated.

## Data And Storage

* KV keys: `config/settings`, `operator/acks`, `operator/notes`
* Park inventory, telemetry, incidents, and reading history live in memory and reset on reload or explicit sim reset
* KV data is app-scoped and shared across users of that installed app instance
* Uninstall removes the app package; platform KV cleanup follows Cribl Apps uninstall behavior
* No browser `localStorage` / `sessionStorage` is used for app data

## Support

### Community Built
This app is provided as a community contribution by John Owen. It is useful for demos, learning Capra Apps patterns, and shared workflows, but it does not carry an official support commitment from Cribl. Maintenance and updates depend on the community maintainer.

Contact: open an issue on the [GitHub repository](https://github.com/Cribl-Community/claw-and-order) or email the author listed in `package.json` (`jowendtd@gmail.com`).

## Known Limitations

* Demo Mode only — not a production park SCADA or real telemetry integration
* Simulation state does not survive reload; only KV-backed settings/acks/notes persist
* Compatibility planner is assess-only; it does not move dinosaurs or rewrite inventory
* Local `npm run dev` without Cribl platform globals cannot persist to KV
* Light/dark theme follows the Cribl shell; full host-theme verification requires an installed Cribl Apps session

## Troubleshooting

### The App Opens But Some Features Do Not Work
Possible causes:
* Missing AppUser / share permissions for KV
* Running outside Cribl where `CRIBL_API_URL` is unavailable
* Unsupported or older App Platform host

### The App Cannot Connect To An API Or Service
Check:
* This app has no external services — if Save/ack fails, confirm platform KV and AppUser grants
* Network or proxy misconfiguration should not apply unless the host itself cannot reach its own API

### The App Works Locally But Not In Cribl
Check:
* Packaged `.tgz` version matches the release you installed
* App was shared with the signed-in user
* Theme and navigation sync require the Cribl shell host messages

## Development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run package
```

* Local preview: `npm run dev` (Vite). Platform globals and KV behave differently than installed mode.
* Package for install: `npm run package` (increments version by default).
* Main source: `src/` (pages, model, sim, components). Brand assets under `assets/` and `src/assets/`.
* Frontend-only: no backend endpoints; `apps build` is a no-op without a backend manifest.

## Project Layout

```text
src/
  App.tsx
  main.tsx
  components/     # shell, drawer, map, shared UI
  pages/          # Overview, Enclosures, Compatibility, Services, Settings
  model/          # types, selectors, status helpers
  sim/            # clock, tick, scenario overlay
  state/          # ParkProvider context
  kv/             # KV client + key constants
  compatibility/  # assess-only engine
  styles/         # brand and page CSS
assets/
  claw_and_order_logo.png
  Claw-and-Order-Brand-Guide.pdf
config/
  policies.yml
  proxies.yml
public/
  favicon.svg
README.md
```

## Versioning And Releases

* Follow semantic versioning in `package.json`
* `npm run package` increments the patch version by default (`--minor` / `--major` / `--version` supported)
* Prefer tagged GitHub Releases with the packaged `.tgz` for reproducible installs
* Document Settings or Demo Mode behavior changes in release notes when they affect operators

## Contributing

* Open issues for bugs or demo-content gaps
* Propose changes via pull request against the working branch
* Keep Capra page templates and Demo Mode labeling intact
* Do not introduce external API dependencies without updating `config/proxies.yml` and this README

## License

This app is licensed under the terms in the repository (see package metadata and any LICENSE file when published). Third-party UI libraries (`@capra/*`, React) retain their own licenses.

## App Metadata

Use this table as the canonical source for gallery fields. Keep the left column labels exactly as written.

| Field | Value |
|---|---|
| App Name | Claw & Order Control |
| App ID | claw-and-order |
| Version | 1.0.0 |
| Author | John Owen |
| Support Model | community-built |
| Support Label | Community Built |
| Support Contact | https://github.com/Cribl-Community/claw-and-order/issues |
| License | See LICENSE |
| License File | [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt) |
| Product Tags | stream, edge, search, lake |
| Category | Demo / Operations |
| Audience | builder, analyst, platform-owner |
| Availability | preview |
| Requires External Access | no |
| Repository | https://github.com/Cribl-Community/claw-and-order |
| Documentation | https://github.com/Cribl-Community/claw-and-order#readme |
| README Schema Version | 1.0 |
