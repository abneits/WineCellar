# Wine Cellar Manager

Self-hosted personal wine cellar management app. Scan bottle labels, manage inventory, track consumption, rate wines, get AI food pairing suggestions.

## Architecture

```
┌─────────────────────────────────┐
│  Single Docker Container        │
│                                 │
│  Go binary :8080                │
│    /api/*  → REST API           │
│    /*      → Next.js static     │
└────────────────┬────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
PostgreSQL      n8n         n8n
(external)    (batch)    (webhooks)
                 │            │
                 └─────┬──────┘
                       ▼
                    Ollama
                  (external)
```

**The Go backend has zero direct dependency on Ollama.** All AI processing goes through n8n workflows. The backend only exposes endpoints for n8n to call and proxies the food pairing webhook.

Docker Compose defines **one service** (the app). PostgreSQL, n8n, and Ollama are external.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go, Chi router, pgx/v5 |
| Frontend | Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind CSS v4 |
| UI components | shadcn/ui (@base-ui/react) |
| Data fetching | TanStack Query v5 |
| Database | PostgreSQL 15+ (external) |
| AI orchestration | n8n (external) → Ollama (external) |

## Getting Started

### Prerequisites

- Docker
- PostgreSQL 15+ instance (running externally)
- n8n instance (running externally) with wine workflows configured
- Ollama instance (running externally) with `llama3.2-vision` and `mistral` models

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/winecellar
SERVER_PORT=8080
CORS_ORIGINS=*
N8N_PAIRING_WEBHOOK_URL=http://n8n:5678/webhook/wine-pairing
MAX_IMAGE_SIZE_MB=10
```

### Run

```bash
cp .env.example .env
# edit .env with your values
docker compose up --build
```

App available at `http://localhost:8080`.

## Features

- **Scan** — photograph a bottle label, queued for overnight AI recognition via n8n + Ollama Vision
- **Manual entry** — add any wine directly, bypasses AI entirely
- **Cellar management** — track quantity, location, purchase price
- **Consume** — decrement stock, log occasion
- **Tasting notes** — 1–5 star ratings with comments; pending rating modal on app load
- **Food pairing** — describe a meal, get AI recommendations from your actual cellar
- **Maturity calendar** — which wines are in their drinking window now, soon, or not yet

## Wine Status Lifecycle

```
Scan photo      → pending_recognition
n8n Vision      → recognized  (or needs_review if confidence < 80%)
n8n enrichment  → enriched
User validates  → validated   ← final state
AI failure      → failed
Manual entry    → validated   (direct)
```

## API Routes

```
# Wines
POST   /api/wines/scan              Upload photo → status pending_recognition
POST   /api/wines                   Create wine (manual, status validated)
GET    /api/wines                   List wines (filterable, paginated)
GET    /api/wines/:id
PUT    /api/wines/:id
DELETE /api/wines/:id
GET    /api/wines/:id/image         ?size=thumbnail for thumbnail

# n8n callbacks
GET    /api/wines/pending           ?status=&limit= — includes base64 image
PUT    /api/wines/:id/recognition   n8n posts AI recognition result
PUT    /api/wines/:id/enrichment    n8n posts enrichment data
PUT    /api/wines/:id/status        n8n marks as failed

# Cellar
POST   /api/cellar
GET    /api/cellar
GET    /api/cellar/stats
GET    /api/cellar/recent
GET    /api/cellar/maturity
GET    /api/cellar/:id
PUT    /api/cellar/:id
DELETE /api/cellar/:id
POST   /api/cellar/:id/consume

# Tastings
POST   /api/tastings
GET    /api/tastings                ?wine_id= to filter
GET    /api/tastings/pending
PUT    /api/tastings/:id

# AI (proxied to n8n webhook)
POST   /api/ai/pairing              {prompt, cellar[]} → n8n → recommendation
```

## Database Schema

4 tables: `wines`, `cellar_entries`, `tasting_notes`, `consumption_log`.

### wines
| Column | Type |
|---|---|
| id | UUID PK |
| name, appellation, region, country, producer | VARCHAR |
| vintage | INTEGER |
| color | VARCHAR CHECK (red/white/rosé/sparkling/dessert/orange/yellow) |
| grape_varieties, tasting_notes, food_pairings, ai_raw_response, web_search_data | JSONB |
| alcohol_content | DECIMAL(4,2) |
| peak_maturity_start, peak_maturity_end | INTEGER |
| average_price | DECIMAL(10,2) |
| ai_confidence | DECIMAL(3,2) |
| image, image_thumbnail | BYTEA |
| status | VARCHAR(30) |
| created_at, updated_at | TIMESTAMPTZ |

### cellar_entries
`id`, `wine_id` FK, `quantity`, `location`, `purchase_date`, `purchase_price`, `added_at`

### tasting_notes
`id`, `wine_id` FK, `rating` (1–5), `comment`, `tasted_at`, `created_at`

### consumption_log
`id`, `cellar_entry_id` FK, `wine_id` FK, `quantity`, `consumed_at`, `occasion`, `rated` BOOLEAN

## Project Structure

```
├── Dockerfile              # Multi-stage: Node build → Go build → alpine runtime
├── docker-compose.yml      # Single service
├── backend/
│   ├── main.go             # Entry point, router, static file handler
│   ├── config/
│   ├── handlers/           # wine.go, cellar.go, tasting.go, ai.go
│   ├── models/
│   ├── repository/         # wine_repo.go, cellar_repo.go, tasting_repo.go
│   ├── middleware/          # cors.go, logging.go
│   └── migrations/         # 001–007 SQL files, applied at startup
└── frontend/
    ├── next.config.ts      # output: 'export'
    └── src/
        ├── app/            # App Router pages
        ├── components/
        ├── lib/api.ts      # Centralized API client
        └── types/index.ts
```
