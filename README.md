# Jobline

A mini job application tracker built with **Next.js 15 (App Router)**, **TypeScript** and **Tailwind CSS v4**.
Every application is drawn as a small line with stops (Applied → Interview → Selected), so you can see where each one stands at a glance.

> **Extra feature: follow-up reminders.** Give any application an optional follow-up date. Jobline flags it as *overdue*, *due today* or *coming up*, adds a **Follow-ups due** number to the summary, and offers a **Needs follow-up** filter that sorts the most overdue first. Job hunting is mostly waiting, and the thing that goes wrong is forgetting to check in, so the tracker should nudge you instead of just storing rows.

## Features

- View all applications (newest first)
- Add an application: company, role, status (Applied / Interview / Rejected / Selected), optional follow-up date
- Edit an application, or change its status straight from the list
- Delete with confirmation
- Filter by status; live counts on every filter
- Summary: total applications, interviews, selected, follow-ups due
- Loading skeleton, empty state, "no matches" state, error state with retry, success/error toasts
- Optimistic status changes and deletes that roll back if the server refuses
- Fully responsive, keyboard accessible, respects reduced-motion

## Quick start

Requires **Node.js 20.9 or newer**.

```bash
npm install
npm run dev          # http://localhost:3000
```

No database setup is needed: data is stored in `data/applications.json` (created on first write).

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js + TypeScript rules) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit + integration tests (Vitest) |

## Storage

Storage sits behind a small interface (`src/server/repository/types.ts`) and the driver is chosen from environment variables:

| Driver | When it is used | Good for |
| --- | --- | --- |
| **JSON file** | Default (no env vars) | Local development, a single server |
| **Upstash Redis** | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set | Deployed apps (Vercel) |

Copy `.env.example` to `.env.local` to configure. `DATA_FILE` changes where the JSON file lives.

**Why two drivers?** Vercel functions have a read-only disk (only `/tmp`, which is wiped between invocations), so a JSON file or SQLite file cannot persist there. The file driver keeps local setup at zero effort; the Redis driver makes the deployed demo actually remember your data.

### Anonymous workspaces
There is no login. On first visit the server issues an `httpOnly` cookie containing a random UUID, and all data is stored under that id. Each browser therefore sees only its own applications, so a public demo doesn't turn into a shared scratchpad. Clearing cookies starts a fresh, empty workspace.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project →** import the repo (framework preset: Next.js, no settings to change).
3. In the project: **Storage → Marketplace → Upstash Redis → Create**, and connect it to the project. This injects the REST URL/token environment variables (either the `UPSTASH_REDIS_REST_*` or `KV_REST_API_*` names work).
4. Redeploy. Add an application, refresh the page: it is still there.

Without step 3 the app still runs, but data is written to `/tmp` and will disappear.

## API

All responses are JSON: `{ "data": ... }` on success, `{ "error": { "code", "message", "fieldErrors?" } }` on failure. Requests with a body must be `Content-Type: application/json`.

| Method | Path | Body | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/applications` | – | `200` array | `503` storage down |
| POST | `/api/applications` | `{ company, role, status?, followUpDate? }` | `201` created | `400` bad JSON, `415` wrong content type, `422` validation, `409` limit (500) |
| PATCH | `/api/applications/:id` | any of `company`, `role`, `status`, `followUpDate` | `200` updated | `400` bad id, `404`, `422` |
| DELETE | `/api/applications/:id` | – | `200` `{ id }` | `400`, `404` |

```bash
curl -c jar -b jar -H 'Content-Type: application/json' \
  -d '{"company":"Acme","role":"Engineer","followUpDate":"2026-10-01"}' \
  http://localhost:3000/api/applications
```

## Project structure

```
src/
  app/
    layout.tsx, page.tsx, globals.css   App shell, fonts, design tokens
    error.tsx, not-found.tsx            Route-level error and 404 pages
    api/applications/route.ts           GET (list), POST (create)
    api/applications/[id]/route.ts      PATCH (update), DELETE
  components/
    tracker/                            Feature components (JobTracker, ApplicationRow, StageTrack, FilterBar, ...)
    ui/                                 Generic building blocks (Button, Modal, Toast, Icons, Spinner)
  hooks/useApplications.ts              Data loading + optimistic mutations
  lib/                                  Code shared by browser and server: types, validation, dates, API client
  server/                               Server-only: HTTP helpers, workspace cookie, storage drivers
tests/                                  Vitest unit + integration tests
```

## Design decisions and trade-offs

- **Filtering is client-side.** The client loads the whole list once and filters in memory, so filters are instant and the summary always reflects everything. This is right for tens or hundreds of items (capped at 500 per workspace). Beyond that you would add server-side filtering and pagination.
- **Optimistic UI for status changes and deletes**, pessimistic for add/edit. Status changes are frequent and low-risk, so they should feel instant; add/edit have validation that only the server can fully judge, so the form waits for it.
- **One validation schema (zod) shared by browser and server.** The browser gives instant feedback; the server is the real gatekeeper.
- **Follow-up dates are plain `YYYY-MM-DD` strings**, compared as whole calendar days, so "today" never flips with timezone or daylight saving. Reminders only apply to *Applied* and *Interview*; a rejected or selected application no longer needs a nudge (the date is kept, just not shown).
- **Redis writes use one hash field per application**, so two tabs editing different applications can't overwrite each other. The JSON driver serialises writes through a queue and writes atomically (temp file + rename).
- **No auth.** Cookie-scoped workspaces keep visitors apart, but this is not a security boundary: anyone holding the cookie has the data. A real product would add accounts.

## Testing

`npm test` runs 43 tests:

- validation rules and follow-up date maths
- JSON-file driver (CRUD, workspace isolation, 25 concurrent writes, corrupted-file handling)
- Redis driver against an in-memory fake of Upstash's REST API
- UI integration tests: the real React components talk to the real route handlers and the real file store (add, validation, status change and reload, rollback on failure, filters, follow-ups, edit, delete, error and retry states)

## Accessibility

Native `<dialog>` (focus trap, Escape, inert background), native `<select>` for status, labelled icon buttons, `aria-pressed` filters, live-region announcements for results and toasts, visible focus rings, colour never the only signal (status and reminders always have text), `prefers-reduced-motion` honoured.

## Future improvements

Accounts (NextAuth) and a real database (Postgres + Drizzle); notes and a status-history timeline per application; search and sorting; email/push reminders; drag-and-drop board view; CSV export; URL-synced filters; undo for delete; dark mode.
