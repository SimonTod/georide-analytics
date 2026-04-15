# GeoRide Analytics

> Tableau de bord statistique complémentaire pour les possesseurs d'un tracker GPS GeoRide

GeoRide Analytics est une application web auto-hébergée qui se connecte à l'[API publique GeoRide](https://api.georide.com) avec vos propres identifiants pour vous offrir des analyses, une gestion des trajets et des insights de routes absents de l'application officielle.

**Il ne remplace pas l'app GeoRide** — il lit vos données existantes et en propose une lecture statistique plus riche depuis un navigateur.

---

## Fonctionnalités

### Dashboard

- Statistiques agrégées : km totaux, nombre de trajets, vitesse moyenne/max, temps de conduite
- Sélection de période : 7 derniers jours, mois en cours, année en cours, plage personnalisée
- Comparaison avec la période précédente (delta en %)
- Graphiques :
  - Km par mois (barres)
  - Évolution de la vitesse dans le temps
  - Distribution des vitesses (histogramme)
  - Trajets par jour de la semaine
  - Trajets par heure de la journée (heatmap)
- Records personnels : trajet le plus long, vitesse maximale, meilleure journée en km
- Carte de chaleur des trajets (positions GPS sur carte Leaflet)

### Trajets

- Liste des trajets avec édition de tag et de note directement dans le tableau
- Filtrage de la liste par tag
- Aperçu cartographique au survol (points de départ et d'arrivée)
- **Tagging** — 5 tags prédéfinis : `commute`, `leisure`, `sport`, `track`, `other`
- **Notes libres** par trajet
- **Suggestions d'auto-tag** — après avoir tagué un trajet, les trajets similaires (même zone départ/arrivée) sont détectés ; vous pouvez appliquer le tag en masse ou créer une règle de route
- **Règles de routes** — associez un tag permanent à un itinéraire pour que les trajets futurs soient tagués automatiquement au chargement
- **Comparaison de routes** — les trajets partageant le même itinéraire sont regroupés avec un graphique d'évolution de la durée et de la vitesse moyenne

---

## État d'avancement

| Fonctionnalité | État |
|---|---|
| Dashboard analytique | ✅ Disponible |
| Tagging & notes par trajet | ✅ Disponible |
| Comparaison de routes | ✅ Disponible |
| Règles d'auto-tagging | ✅ Disponible |
| Export GPX / CSV | 🚧 À venir |

---

## Confidentialité & sécurité

GeoRide Analytics est conçu avec l'isolation des credentials comme contrainte non négociable :

- Le **token GeoRide n'est jamais transmis à notre backend** et n'est jamais persisté. Il est conservé uniquement en `sessionStorage` (effacé à la fermeture de l'onglet) et utilisé exclusivement pour appeler l'API GeoRide directement depuis le navigateur.
- Le backend utilise votre token **une seule fois** à la connexion pour vérifier votre identité, puis le jette immédiatement.
- Le backend ne stocke que les métadonnées que vous créez explicitement : tags, notes, règles de routes.

---

## Architecture

```
frontend/   React + Vite + TypeScript (SPA)
backend/    Node.js + Hono + TypeScript (API REST)
            └─► PostgreSQL  (tags, notes, règles de routes)
```

Le frontend appelle l'API GeoRide directement pour les données de trajets et de positions. Le backend ne gère que l'authentification et les métadonnées créées par l'utilisateur.

```
Browser → api.georide.com      (token GeoRide, sessionStorage)
Browser → notre backend        (JWT applicatif, localStorage)
                └─► PostgreSQL
```

---

## Installation

### Prérequis

- Node.js 20+
- Docker (pour PostgreSQL)

### 1. Base de données

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # renseigner JWT_SECRET avec une valeur aléatoire longue
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

L'application est disponible sur <http://localhost:5173>.

### Variables d'environnement

**`backend/.env`**
```
DATABASE_URL=postgresql://georide:dev@localhost:5432/georide_analytics
JWT_SECRET=<secret long et aléatoire>
GEORIDE_API_URL=https://api.georide.com
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env`**
```
VITE_API_URL=http://localhost:3001
VITE_GEORIDE_API_URL=https://api.georide.com
```

---

## Développement

```bash
# Lint
cd backend && npm run lint
cd frontend && npm run lint

# Vérification TypeScript
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit

# Tests
cd backend && npm test
cd frontend && npm run test:ci   # single run
cd frontend && npm test          # mode watch
```

Une pipeline GitHub Actions exécute lint + vérification TypeScript + tests à chaque push et pull request.

---

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite, TypeScript, TanStack Query, Recharts, React Leaflet |
| Backend | Hono, Node.js 20, TypeScript |
| Base de données | PostgreSQL 17 |
| Tests | Jest + ts-jest ESM (backend), Vitest + Testing Library (frontend) |
| CI | GitHub Actions |

---

## Licence

MIT
