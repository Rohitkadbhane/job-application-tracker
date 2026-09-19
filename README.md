# Jobline — Mini Job Application Tracker

A simple job application tracker built with **Next.js 15 (App Router)**, **TypeScript**, and **Tailwind CSS** for a technical assignment.


## Features

- View all job applications
- Add a new application (Company, Role, Status)
- Edit the status of an existing application
- Delete an application (with confirmation)
- Filter applications by status
- Summary stats: Total Applications, Interviews, Selected
- Loading, empty, and error states with retry
- Fully responsive UI

## Tech Stack

- **Next.js** (App Router) — frontend + backend in one project
- **TypeScript** — type safety across the codebase
- **Tailwind CSS** — styling
- **Zod** — shared validation schema (client + server)
- **Storage:** Local JSON file (`data/applications.json`) — zero setup for local development. Can switch to Upstash Redis for persistent storage on Vercel by setting environment variables (see `.env.example`).

## Getting Started

Requires **Node.js 20.9+**.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. No environment variables or database setup needed — data is stored locally in `data/applications.json`.

### Other Scripts

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checks |
| `npm test` | Run automated tests |

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel (framework preset: Next.js — no config changes needed).
3. (Optional, for persistent data) In Vercel: **Storage → Marketplace → Upstash Redis → Create**, then connect it to the project. This sets the required environment variables automatically.
4. Deploy. Without step 3, the app still works, but data resets between deployments since Vercel's filesystem is temporary.

## Extra Feature: Follow-Up Reminders

Each application can have an optional follow-up date. Jobline automatically flags it as **overdue**, **due today**, or **coming up**, shows a **Follow-ups due** count in the summary, and offers a **Needs Follow-up** filter (sorted most overdue first).

I chose this because job searching mostly involves waiting, and the easiest mistake to make is forgetting to check in on an application. A simple tracker that just stores rows doesn't help with that — a small nudge does.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/applications` | List all applications |
| POST | `/api/applications` | Create a new application |
| PATCH | `/api/applications/:id` | Update an application |
| DELETE | `/api/applications/:id` | Delete an application |
