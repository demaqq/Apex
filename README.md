# Apex — Northstar CareOS

A front-end hospital management demo. Pick a professional role (physician, nurse, consultant, imaging/lab, flow coordinator or administrator) and get a workspace tailored to it, all sharing one patient record.

All data is synthetic and saved in the browser's local storage. Use **Restore demo data** in the profile menu to start over.

## Features

Twelve role workspaces (physician, consultant, intern, nurse, imaging/lab, pharmacist, front desk, anaesthetist, physiotherapist, flow coordinator, billing officer, administrator), each landing on its own home screen.

- **Front desk and triage** — registration, a triage evaluation with suggested ESI, and an ED scoreboard against ESI target times
- **Patient record** — clinical alerts, NEWS2 observation chart with escalation, staged orders, referrals, clinical evaluation with ICD-10 differentials, discharge summary with medication reconciliation, paediatric growth chart
- **Wards** — bed board with bed states, SBAR shift handover with acknowledgement, medication and transfusion round
- **Diagnostics and services** — laboratory and imaging pipelines (collection, analysis, verification), pharmacy verification and dispensing with stock, interaction checker and prescribing warnings, operating theatres with safety checklist and anaesthesia record, physiotherapy, nutrition and blood bank worklists
- **Operations** — operations center, animated care-flow map, roster and pagers, billing from orders with payments and claims, emergency codes with banners and optional alert sound, audit trail, staff accounts and department units
- **Interface** — light and dark themes (follows the device), keyboard shortcuts (press <kbd>?</kbd>), search across patients, orders, staff and modules (<kbd>/</kbd>)

## Run locally

Requires [Bun](https://bun.sh) (or Node 20+ with npm).

```bash
bun install
bun run dev        # http://localhost:3000
```

Demo access key: `NORTHSTAR`

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server on port 3000 |
| `bun run build` | Type-check and build to `dist/` |
| `bun run typecheck` | Type-check only |
| `bun run preview` | Serve the production build |

## Project layout

```
src/
  App.tsx              routes (pages are lazy-loaded)
  store/HospitalStore  app state, actions and persistence
  data.ts              seed data and clinical helpers (ESI calculation)
  types.ts             domain types
  components/          app shell, patient drawer, clinical dialogs, UI primitives
  pages/               one file per screen
  styles/              base tokens, shell, page and shared view styles
```
