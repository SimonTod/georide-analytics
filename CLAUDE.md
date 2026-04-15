# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GeoRide Analytics** is a web application that provides complementary statistics for GeoRide GPS tracker owners. It connects to the public GeoRide API using the user's own credentials to surface analytics not available in the official app.

Target user: GeoRide GPS tracker owner (motorcycle/scooter) who wants richer analytics and trip management from a browser.

**In scope (v1):**
1. Analytics dashboard — aggregate riding statistics, charts, personal records
2. GPX / CSV export — export any trip for use in Strava, Komoot, etc.
3. Trip tagging & notes — categorize trips, add free-text notes, compare similar routes

**Explicitly out of scope:** real-time tracking, alarms, lock/unlock control, anything requiring Socket.IO.

---

## Architecture

### Monorepo structure

```
/
├── frontend/   React + Vite + TypeScript SPA
└── backend/    Node.js + Hono + TypeScript REST API
```

### Key architectural principle — credential isolation

The GeoRide Bearer token **never leaves the browser and never touches our backend**. This is non-negotiable: the GeoRide token grants physical control of the user's vehicle (lock, unlock, siren). Our backend must never store or proxy it.

### Authentication flow

```
1. Browser  →  api.georide.com    POST /user/login  { email, password }
2. Browser  ←  api.georide.com    { authToken, ... }   (GeoRide Bearer token)

3. Browser  →  our backend        POST /auth  { georide_token }
4. Backend  →  api.georide.com    GET /user   (one-time token verification only)
5. Backend  ←  api.georide.com    { user_id, email }
6. Backend creates/finds user in our DB by georide_user_id, issues own JWT
7. Browser  ←  our backend        { jwt }              (our app JWT)

Ongoing:
  Browser → api.georide.com   (GeoRide token from sessionStorage — clears on tab close)
  Browser → our backend       (our JWT from localStorage)
```

The backend uses the GeoRide token **once** to prove identity, then discards it. It never stores it.

### Data flow

```
Frontend (React SPA)
  │
  ├─ GeoRide API calls (trips, positions) ──► https://api.georide.com  (direct, token in sessionStorage)
  │
  └─ Metadata calls (tags, notes) ──────────► Our backend  (JWT in Authorization header)
                                                  │
                                                  └─► PostgreSQL
                                                        └─ trip_metadata (georide_trip_id, tag, note, ...)
```

---

## GeoRide API Reference

**Base URL:** `https://api.georide.com`  
**Auth:** `Authorization: Bearer {token}` on all endpoints except login.

### Endpoints used by this project

| Method | Path | Description |
|--------|------|-------------|
| POST | `/user/login` | Auth; body `{ email, password }`; returns `{ authToken, id, email }` |
| GET | `/user/new-token` | Renew token |
| POST | `/user/logout` | Revoke token |
| GET | `/user` | Get user profile (used by backend for token verification) |
| GET | `/user/trackers` | List trackers with current state |
| GET | `/tracker/{trackerId}/trips` | List trips; query params: `from`, `to` |
| GET | `/tracker/{trackerId}/trips/positions` | GPS positions; date format: `YYYYMMDDTHHmmSS` |

### Key data models

**GeoRideTrackerTrip** (from `/trips`):
`trip_id`, `tracker_id`, `average_speed`, `max_speed`, `distance`, `duration`, `start_time`, `end_time`, `start_lat`, `start_lon`, `end_lat`, `end_lon`, `start_address`, `end_address`

**GeoRideTrackerPosition** (from `/trips/positions`):
`fixtime`, `latitude`, `longitude`, `altitude`, `speed` (m/s), `address`

**GeoRideTracker** (from `/user/trackers`):
`tracker_id`, `tracker_name`, `latitude`, `longitude`, `speed`, `moving`, `is_locked`, `odometer` (meters), `external_battery_voltage`, `model`, `version`, `role`

**Note:** Lean angle, weather per trip, and tire pressure data are **not** available through the public API (app-only).

---

## Backend — `backend/`

**Framework:** Hono (Node.js)  
**Language:** TypeScript  
**Database:** PostgreSQL

### Responsibilities

The backend is intentionally minimal. It only handles:
1. `POST /auth` — verify GeoRide token, create/find user, return JWT
2. CRUD for trip metadata (tags, notes) scoped to the authenticated user

### Database schema (core)

```sql
-- Users identified by their GeoRide user_id
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  georide_user_id INTEGER UNIQUE NOT NULL,
  email         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- One metadata row per trip per user
CREATE TABLE trip_metadata (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  georide_trip_id INTEGER NOT NULL,
  tag             TEXT,          -- e.g. 'commute', 'leisure', 'sport', 'track'
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, georide_trip_id)
);
```

### JWT

Sign with `HS256`, payload: `{ sub: user.id, georide_user_id }`. No GeoRide token stored.

---

## Frontend — `frontend/`

**Framework:** React + Vite  
**Language:** TypeScript  
**Key libraries:** react-leaflet (maps), Recharts (charts), React Query / TanStack Query (data fetching)

### Token storage

- GeoRide token → `sessionStorage` (intentional: cleared when tab closes, never sent to our backend)
- Our app JWT → `localStorage`

### Features to implement

**1. Analytics dashboard**
- Aggregate stats: total km, number of trips, average/max speed — filterable by period (week/month/year/custom)
- Charts: km per month (bar), speed distribution (histogram), time-of-day heatmap
- Personal records: longest trip, highest top speed, most km in a day

**2. GPX / CSV export**
- Fetch positions from `/tracker/{id}/trips/positions` for a given trip
- Convert to GPX (XML) using `fixtime`, `latitude`, `longitude`, `altitude`
- Convert to CSV with all position fields
- Speed conversion: API returns m/s → convert to km/h for display/export

**3. Trip tagging & notes**
- Predefined tags: `commute`, `leisure`, `sport`, `track`, `other`
- Free-text note per trip
- Filter trip list by tag
- Route comparison: group trips with same start/end addresses, chart duration/speed evolution over time

---

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL (Docker recommended: `docker run -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres`)

### Install dependencies
```bash
cd frontend && npm install
cd backend && npm install
```

### Environment variables

`backend/.env`:
```
DATABASE_URL=postgresql://postgres:dev@localhost:5432/georide_analytics
JWT_SECRET=your-secret-here
GEORIDE_API_URL=https://api.georide.com
```

`frontend/.env`:
```
VITE_API_URL=http://localhost:3001
VITE_GEORIDE_API_URL=https://api.georide.com
```

### Run in development
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

### Build
```bash
cd frontend && npm run build
cd backend && npm run build
```

### Lint
```bash
cd frontend && npm run lint
cd backend && npm run lint
```

### Tests
```bash
cd frontend && npm test        # mode watch (développement)
cd frontend && npm run test:ci # single run (CI / vérification ponctuelle)
cd backend && npm test
```

---

## README

Le fichier `README.md` est le point d'entrée public du projet sur GitHub. Il doit rester synchronisé avec l'état réel de l'application.

**Mettre à jour le README quand :**
- Une nouvelle fonctionnalité est ajoutée → ajouter une entrée dans la section correspondante (Dashboard ou Trajets) et passer son statut à ✅ dans le tableau d'avancement.
- Une fonctionnalité planifiée est commencée ou terminée → mettre à jour son statut dans le tableau d'avancement (`🚧 En cours` ou `✅ Disponible`).
- Une nouvelle page est créée → ajouter une section dédiée dans les fonctionnalités.
- La stack technique évolue (nouvelle lib majeure, changement de BDD, etc.) → mettre à jour le tableau de stack.

Ne pas modifier le README pour des détails d'implémentation internes (refactoring, renommage de variables, etc.) qui ne changent pas ce que l'utilisateur voit.

---

## Tests unitaires

### Stack

| Projet | Framework | Runner | Mocking |
|--------|-----------|--------|---------|
| `backend/` | Jest (via `ts-jest`, preset ESM) | `node --experimental-vm-modules jest` | `jest.unstable_mockModule()` — obligatoire en ESM natif |
| `frontend/` | Vitest 2 + jsdom | `vitest run` (CI) / `vitest` (watch) | `vi.mock()` |

Le frontend utilise en plus `@testing-library/react` et `@testing-library/jest-dom` pour les tests de composants React.

### Fichiers de tests existants

**Backend**
- `src/middleware/auth.test.ts` — middleware `requireAuth` (6 cas : header manquant, mauvais scheme, token invalide, mauvais secret, `JWT_SECRET` absent, token valide)
- `src/routes/metadata.test.ts` — routes CRUD métadonnées + `POST /auto-tag` (12 tests)
- `src/routes/routeRules.test.ts` — routes règles de routage (9 tests)

**Frontend**
- `src/utils/routes.test.ts` — `bucketCoord` et `tripRouteKey`
- `src/utils/stats.test.ts` — `formatDuration` et `computeStats`
- `src/utils/dates.test.ts` — `dateRangeForPeriod`, `previousPeriodRange`, `PERIOD_LABELS`
- `src/utils/routeAnalysis.test.ts` — `analyzeGroupTags` (tous les cas : all-same, partial, none, mixed)
- `src/components/trips/TagBadge.test.tsx` — rendu, labels, couleurs

### Règles à respecter

**Toute fonctionnalité développée doit satisfaire les trois conditions suivantes :**

1. **Lint** — `npm run lint` passe sans erreur dans le projet concerné.
2. **TypeScript** — `npx tsc --noEmit` passe sans erreur.
3. **Tests** — tous les tests existants continuent de passer ; les nouvelles logiques métier et utilitaires sont couvertes par des tests unitaires.

Un développement est considéré **incomplet** tant que l'une de ces conditions n'est pas remplie.

### Consignes pour les nouveaux développements

- Toute nouvelle fonction utilitaire pure (calcul, transformation, formatage) doit être accompagnée de tests unitaires.
- Toute nouvelle route backend doit être couverte : cas nominaux, cas d'erreur (validation, auth), et mock de `pool.query`.
- Les tests de composants React sont réservés aux composants avec logique propre ; les composants purement présentationnels n'ont pas besoin d'être testés.
- Ne pas mocker la base de données avec une vraie connexion : `pool` est toujours mocké dans les tests backend via `jest.unstable_mockModule('../db/index.js', ...)`.
- Les tests de dates utilisent `vi.useFakeTimers()` + `vi.setSystemTime()` et s'exécutent en UTC (`TZ=UTC` dans la CI).

---

## CORS consideration

The GeoRide API may or may not send `Access-Control-Allow-Origin` headers. If direct browser calls are blocked, add a **stateless** proxy route in the backend that forwards GeoRide API calls — the frontend sends its GeoRide token in the request, the backend forwards it as-is and returns the response. The backend must not log or persist the token in this proxy path.
