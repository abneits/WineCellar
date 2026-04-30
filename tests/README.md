# Wine Cellar — Test Suite

Tests séparés en deux catégories :
- **API** (`api/`) — tests d'intégration HTTP via [Vitest](https://vitest.dev/)
- **UI** (`ui/`) — tests end-to-end navigateur via [Playwright](https://playwright.dev/) (desktop + mobile 375px)

## Prérequis

- Une instance WineCellar déjà lancée (`APP_URL`)
- Une base PostgreSQL de test dédiée avec les migrations appliquées (`TEST_DATABASE_URL`)  
  ⚠️ **Ne jamais pointer vers la base de production.**

## Configuration

```bash
cp .env.example .env
# Remplir APP_URL et TEST_DATABASE_URL
```

## Lancer les tests

### Localement (Node.js 20+)

```bash
npm install
npm test           # API + UI
npm run test:api   # API uniquement
npm run test:ui    # UI uniquement (headless)
npm run test:ui:headed  # UI avec navigateur visible
```

### Via Docker

```bash
# Depuis la racine du projet WineCellar
cd tests/
docker compose run --rm tests              # tout
docker compose run --rm tests npm run test:api
docker compose run --rm tests npm run test:ui
```

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `APP_URL` | URL de l'app WineCellar | `http://localhost:8080` |
| `TEST_DATABASE_URL` | URL PostgreSQL de test | — (requis pour les tests API) |

## Structure

```
tests/
├── api/
│   ├── helpers/
│   │   ├── client.ts      # HTTP client configuré sur APP_URL
│   │   └── fixtures.ts    # helpers create/cleanup + connexion DB
│   ├── wines.test.ts      # CRUD wines, images, filtres, pagination
│   ├── scan.test.ts       # scan, pending, recognition, enrichment, status
│   ├── cellar.test.ts     # cave, stats, recent, maturity, consume
│   ├── tastings.test.ts   # notes de dégustation, pending, update
│   ├── stats.test.ts      # /api/stats, /health
│   └── ai.test.ts         # /api/ai/pairing (erreurs)
│
├── ui/
│   ├── helpers/
│   │   └── fixtures.ts    # helpers API pour créer des données avant les specs
│   ├── dashboard.spec.ts
│   ├── cellar.spec.ts
│   ├── wine-detail.spec.ts
│   ├── scan.spec.ts
│   ├── stats.spec.ts
│   └── calendar.spec.ts
│
├── playwright.config.ts   # desktop (1280×720) + mobile (375×812)
├── Dockerfile
└── docker-compose.yml
```

## Couverture

### API (~70 tests)
- `GET/POST/PUT/DELETE /api/wines` — CRUD complet, filtres, pagination, images
- `POST /api/wines/scan` — scan, états pending/needs_review/recognized
- `PUT /api/wines/{id}/recognition` — logique de confiance (boundary 0.79/0.80), champs manquants
- `PUT /api/wines/{id}/enrichment` — données tasting
- `PUT /api/wines/{id}/status` — états valides/invalides
- `GET/POST/PUT/DELETE /api/cellar` — cave, stats, recent, maturity
- `POST /api/cellar/{id}/consume` — décrémentation, stock insuffisant (409)
- `POST/GET/PUT /api/tastings` — notes, pending, update, rating 1-5
- `GET /api/stats` — toutes les clés, cohérence avec données réelles
- `GET /health`
- `POST /api/ai/pairing` — erreurs 400/503

### UI (~60 tests × 2 viewports = ~120 runs)
- Dashboard : nav, stats cards, pairing widget, pending section
- Cellar : liste, filtres client-side, navigation
- Wine detail : affichage, consume, delete, route `__placeholder__`, formulaire needs_review
- Scan : upload, état queued, formulaire manuel
- Stats : charts recharts, sections par couleur/région/vintage
- Calendar : groupes par année, badges ready/soon/not_yet, liens
