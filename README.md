# PantherPark

Predicts FIU campus parking and plans a student's whole trip: upload your class schedule, get told when to leave and which lot to drive to.

Built for ShellHacks 2026.

## Architecture

```
/collector       Standalone Python poller. Polls the live FIU Panther Park API
                  every 60s and writes a time series into Supabase. Zero heavy
                  deps (requests + python-dotenv only) -- run it first, leave
                  it running for the whole event. Every minute not collected
                  is permanently lost (no historical endpoint exists on FIU's
                  API).

/backend         FastAPI app. Handles compute the browser/DB can't do:
                    - schedule ingest (PDF via pdfplumber/pymupdf, images via
                      Gemini 3.8 Flash)
                    - demand modelling (campus-wide arrival curve from real
                      Fall 2026 registrar sections)
                    - calibration (per-lot scale factor learned from live
                      observed occupancy)
                    - prediction + recommendation (nearest lot with available
                      space, real Google Maps directions link)
                    - leave-now (target time + live rate-of-change urgency)

/frontend        React + TypeScript + Vite + Leaflet. Live map, schedule
                  upload, per-class plan, leave-now banner, Supabase Auth
                  (email+password) with a fully-functional guest mode,
                  data-provenance panel.

/supabase        SQL migration for the pantherpark_* tables. This project
                  reuses an existing Supabase project (shared with an
                  unrelated app) rather than provisioning a new one -- every
                  table is namespaced pantherpark_ to avoid collisions.

/scripts         build_demand_chart.py: renders the campus demand curve.

/data            Local cache of every external API response (never
                  re-requested), the collector's local durability backup
                  (snapshots.jsonl), and the generated demand chart.
```

## Data sources

- **FIU Panther Park API** (`api.parking.fiu.edu`, public, no auth): live facility
  occupancy, digital signs, wayfinding graph. No historical endpoint exists --
  all history comes from the collector's own polling.
- **FIU public class search API** (`classes.fiu.edu`, undocumented, public, no
  auth): real Fall 2026 (`termCode=1268`) sections. Has no room/building field
  at all -- confirmed across 30+ real sections. Building assignment for a
  student's own plan comes only from what's actually printed on their
  uploaded schedule; a subject-code guess was tried and dropped after the
  test fixture proved it wrong (a CS course meeting at a health-sciences
  building).

## Data provenance

Every number is tagged `live` (a real API reading), `modelled` (real
registrar data + calibration against observed occupancy), or `simulated`
(not enough calibration history yet -- falls back to the lot's current live
reading). See `/provenance` in the app.

## Privacy

Uploaded schedules (PDF or screenshot) are parsed entirely in memory and
discarded immediately -- never written to disk, never stored in the
database. There is no `raw_upload` column anywhere in the schema. Guest mode
extends the same posture to the whole session: every Supabase write in the
frontend routes through one file (`frontend/src/lib/persistence.ts`), which
no-ops when there's no logged-in session.

## Setup

### 1. Supabase

Reuses an existing project via the CLI (see `/supabase/migrations`):

```
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Copy `.env.example` -> `.env` in `/collector`, `/backend`, and `/frontend`,
filling in your project's URL, service-role key (collector only), and anon
key (backend + frontend).

### 2. Collector (start this first)

```
cd collector
pip install -r requirements.txt
python collector.py
```

### 3. Backend

```
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```

Needs a `GEMINI_API_KEY` (from [aistudio.google.com](https://aistudio.google.com/apikey))
for the schedule-screenshot ingest path. PDF ingest works without it.

### 4. Frontend

```
cd frontend
npm install
npm run dev
```

## Demo account

A pre-confirmed demo account exists for the live demo (avoids relying on
Supabase's rate-limited transactional email on stage):
`pantherpark.demo@shellhacks.dev`.
