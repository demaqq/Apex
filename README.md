# Apex — Northstar CareOS

A front-end hospital management demo. Pick a professional role (physician, nurse, consultant, imaging/lab, flow coordinator or administrator) and get a workspace tailored to it, all sharing one patient record.

All data is synthetic and saved in the browser's local storage. Use **Restore demo data** in the profile menu to start over.

## Features

- **Triage** — ESI-based triage with a suggested acuity and documented overrides
- **Patient records** — one shared episode per patient: notes, referrals, orders, transfers, discharge
- **Departments & care network** — live bed capacity and interdepartmental referrals
- **Lab & imaging** — order, start and report diagnostic requests; results go straight to the chart
- **Pharmacy** — verify and dispense prescriptions against formulary stock
- **Telehealth** — schedule, start and complete video or in-person visits
- **Billing** — invoices, insurance claims and payments
- **Staff & schedule** — rota and on-duty status
- **Emergency codes & audit** — call and stand down codes; every action is logged

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
