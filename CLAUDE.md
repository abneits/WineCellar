# CLAUDE.md — Wine Cellar Manager

## Project Overview
Self-hosted wine cellar management app. Scan bottles, manage inventory, rate wines, get food pairing suggestions. AI processing is fully offloaded to external n8n workflows — the backend has zero AI dependency. Single Docker container serves both frontend and backend. Mobile-first.

## Tech Stack (DO NOT change these choices)
- **Backend**: Go 1.22+ — Chi router, pgx for PostgreSQL, standard library where possible
- **Frontend**: Next.js 14+ (App Router) — TypeScript, Tailwind CSS, shadcn/ui components
- **Database**: PostgreSQL 15+ (remote, already running — do NOT create Docker service for it)
- **AI Processing**: Handled entirely by n8n (external) — backend only proxies webhook calls
- **Containerization**: Single Dockerfile — multi-stage build, Go binary serves API on :8080, Next.js static export served by Go or reverse-proxied

## Architecture

```
┌─────────────────────────────────┐
│  Single Docker Container        │
│                                 │
│  ┌───────────┐  ┌────────────┐  │
│  │ Next.js   │  │ Go Backend │  │
│  │ (static)  │←→│   :8080    │  │
│  └───────────┘  └─────┬──────┘  │
│                        │         │
└────────────────────────┼─────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
        ┌──────────┐ ┌──────┐ ┌──────────┐
        │ PostgreSQL│ │ n8n  │ │ n8n      │
        │ (remote) │ │batch │ │ webhooks │
        └──────────┘ └──┬───┘ └────┬─────┘
                         │          │
                         ▼          ▼
                      ┌──────────────┐
                      │   Ollama     │
                      │  (remote)    │
                      └──────────────┘
```

**The backend has NO direct dependency on Ollama. All AI goes through n8n.**

## Single Container Strategy

The Dockerfile uses a multi-stage build:
1. **Stage 1 — Frontend build**: Node.js builds Next.js as static export (`next export` / `output: 'export'`)
2. **Stage 2 — Backend build**: Go compiles the API binary
3. **Stage 3 — Runtime**: Minimal image (alpine/distroless), Go binary serves both the API routes (`/api/*`) and the static frontend files (everything else)

The Go backend embeds or serves the frontend static files from a directory. No Nginx, no separate process. Single binary, single port (:8080).

```
/api/*          → Go handlers
/*              → Static Next.js files (HTML/JS/CSS)
```

Docker Compose only defines ONE service (the app). PostgreSQL and n8n are external.

## Project Structure
```
wine-cellar-manager/
├── docker-compose.yml          # Single service + env config
├── Dockerfile                  # Multi-stage: frontend build → backend build → runtime
├── CLAUDE.md
├── README.md
│
├── backend/
│   ├── main.go                 # Entry point — serves API + static files
│   ├── config/                 # Env config loading
│   ├── handlers/               # HTTP handlers (wine, cellar, tasting, webhook proxy)
│   ├── models/                 # Go structs matching DB schema
│   ├── services/               # Business logic + n8n webhook client
│   ├── repository/             # Database queries (pgx)
│   ├── middleware/              # CORS, logging
│   └── migrations/             # SQL migration files
│
├── frontend/
│   ├── package.json
│   ├── next.config.js          # output: 'export' for static build
│   ├── tailwind.config.js
│   └── src/
│       ├── app/                # App Router pages
│       ├── components/
│       ├── hooks/
│       ├── lib/                # API client, utils
│       └── types/
```

## Database Schema (PostgreSQL)

4 tables: `wines`, `cellar_entries`, `tasting_notes`, `consumption_log`.

### wines
- `id` UUID PK, `name` VARCHAR(255), `appellation` VARCHAR(255), `region` VARCHAR(255), `country` VARCHAR(100)
- `producer` VARCHAR(255), `vintage` INTEGER, `color` VARCHAR(20) CHECK (red/white/rosé/sparkling/dessert/orange)
- `grape_varieties` JSONB, `alcohol_content` DECIMAL(4,2), `description` TEXT
- `tasting_notes` JSONB, `food_pairings` JSONB
- `peak_maturity_start` INTEGER, `peak_maturity_end` INTEGER, `average_price` DECIMAL(10,2)
- `ai_confidence` DECIMAL(3,2), `ai_raw_response` JSONB, `web_search_data` JSONB
- `image` BYTEA, `image_thumbnail` BYTEA
- **`status` VARCHAR(30)** — `pending_recognition`, `pending_enrichment`, `recognized`, `enriched`, `failed`, `validated`
- `created_at` TIMESTAMP, `updated_at` TIMESTAMP

### cellar_entries
- `id` UUID PK, `wine_id` UUID FK→wines, `quantity` INTEGER
- `location` VARCHAR(100), `purchase_date` DATE, `purchase_price` DECIMAL(10,2), `added_at` TIMESTAMP

### tasting_notes
- `id` UUID PK, `wine_id` UUID FK→wines, `rating` INTEGER (1-5), `comment` TEXT
- `tasted_at` DATE, `created_at` TIMESTAMP

### consumption_log
- `id` UUID PK, `cellar_entry_id` UUID FK→cellar_entries, `wine_id` UUID FK→wines
- `quantity` INTEGER, `consumed_at` TIMESTAMP, `occasion` VARCHAR(255), `rated` BOOLEAN DEFAULT false

## API Routes

```
# Wines
POST   /api/wines/scan              — Save photo + create wine with status "pending_recognition"
POST   /api/wines                   — Create wine (manual entry, status "validated")
PUT    /api/wines/:id               — Update wine details
GET    /api/wines                   — List wines (filterable, paginated)
GET    /api/wines/:id               — Wine detail
GET    /api/wines/:id/image         — Serve bottle image
DELETE /api/wines/:id               — Delete wine

# n8n integration endpoints
GET    /api/wines/pending           — List wines by status (?status=pending_recognition&limit=10), includes base64 image
PUT    /api/wines/:id/recognition   — n8n sends AI recognition results
PUT    /api/wines/:id/enrichment    — n8n sends enrichment data (web search, tasting notes, pairings, maturity)
PUT    /api/wines/:id/status        — Update wine status (e.g. mark as failed)

# Cellar
POST   /api/cellar                  — Add to cellar (with quantity multiplier)
PUT    /api/cellar/:id              — Update entry
DELETE /api/cellar/:id              — Remove entry
POST   /api/cellar/:id/consume      — Consume bottle(s)
GET    /api/cellar                  — List cellar
GET    /api/cellar/stats            — Statistics
GET    /api/cellar/recent           — Last 5 additions
GET    /api/cellar/maturity         — Maturity calendar data

# Tastings
POST   /api/tastings                — Add rating + note
GET    /api/tastings                — List notes
GET    /api/tastings/pending        — Unrated consumed wines
PUT    /api/tastings/:id            — Update note

# AI (proxied to n8n webhook)
POST   /api/ai/pairing              — Proxy: builds payload (prompt + cellar inventory) → calls n8n webhook → returns response
```

## Wine Status Lifecycle

```
User scans bottle
    → pending_recognition (photo saved, no AI data yet)

n8n batch job overnight, calls Ollama Vision
    → recognized (AI data filled in, waiting for validation)

n8n enrichment step (web search, tasting notes, maturity, pairings)
    → enriched (all data complete, waiting for validation)

User validates or edits
    → validated (final state)

If AI fails
    → failed (user notified, can fill manually)

Manual entry (user fills everything)
    → validated (skips AI entirely)
```

## n8n Integration

The backend talks to n8n in two ways:

### 1. n8n calls our API (batch processing, overnight)
n8n CRON triggers → `GET /api/wines/pending?status=pending_recognition` → processes each → `PUT /api/wines/:id/recognition`

### 2. Backend calls n8n webhook (real-time proxy)
Food pairing: backend builds payload with user prompt + cellar inventory → `POST N8N_PAIRING_WEBHOOK_URL` → returns n8n response to frontend

Payload sent to n8n pairing webhook:
```json
{
  "prompt": "I'm having grilled lamb with rosemary",
  "cellar": [
    {"id": "uuid", "name": "Château X", "vintage": 2018, "color": "red", "region": "Bordeaux", "quantity": 3},
    ...
  ]
}
```

## Key Business Rules

1. **Scan flow**: Photo → save to DB as `pending_recognition` → user sees confirmation + option to fill manually
2. **Quantity multiplier**: On validation, user sets count (1-99, default 1). Creates cellar_entry with that quantity.
3. **Consume**: Decrements cellar_entries.quantity. Creates consumption_log entry. When quantity=0, keep entry for history.
4. **Pending ratings**: On app load, query consumption_log WHERE rated=false. Show modal with star picker.
5. **Pairing**: Backend proxies to n8n webhook with prompt + inventory. Returns AI response. Timeout: 60s.
6. **Manual entry**: Available anytime. Same form, all fields empty, status set to `validated` directly.
7. **Pending recognition notification**: On app load, if wines with status `recognized` or `enriched` exist, show notification "X bottles need your validation".
8. **n8n pending endpoint**: Only returns wines not manually filled (status still `pending_*`). Includes base64 image. Supports `limit` param (default 10).

## UI/UX Rules

- **Mobile-first**: All screens must work on 320px+. Bottom nav bar.
- **Theme**: Dark mode default. Burgundy (#722F37), dark wood (#3E2723), cream (#FFF8E7), gold (#C9A84C).
- **Typography**: Playfair Display (headings), Inter (body).
- **Components**: Use shadcn/ui as base, customize with wine theme.
- **Interactions**: Touch-friendly (44px min targets), swipe gestures on lists.
- **Scan page**: After upload → "Bottle saved! It will be analyzed overnight." + "Fill in details now" button.
- **Dashboard**: Section for pending bottles with thumbnails + "Fill manually" button.
- **Cellar list**: Status badge on wines (pending / recognized / needs validation).

## Code Style

### Go Backend
- Use Chi router for HTTP
- Use pgx/v5 for PostgreSQL (NOT database/sql with pq)
- Return JSON errors as `{"error": "message"}`
- Serve static frontend files from embedded filesystem or `/static` directory
- Handle images as multipart form uploads
- Generate UUIDs with google/uuid
- Migrations: plain SQL files, applied in order at startup
- n8n webhook calls: use standard net/http client with 60s timeout

### Next.js Frontend
- TypeScript strict mode
- App Router with `output: 'export'` for static generation
- API calls through a centralized client (`lib/api.ts`) — all requests go to same origin `/api/*`
- Use React Query (TanStack Query) for data fetching
- Responsive: mobile breakpoint < 768px

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/winecellar

# Server
SERVER_PORT=8080
CORS_ORIGINS=*

# n8n webhooks
N8N_PAIRING_WEBHOOK_URL=http://n8n:5678/webhook/wine-pairing

# Image processing
MAX_IMAGE_SIZE_MB=10
THUMBNAIL_WIDTH=300
```

## Important Constraints
- **NO Ollama dependency** — do not import, install, or call Ollama from the backend. All AI goes through n8n.
- **NO n8n workflow code** — the backend only exposes endpoints for n8n to call and proxies webhook requests. n8n workflows are built separately.
- PostgreSQL is EXTERNAL — never add it to docker-compose
- n8n is EXTERNAL — never add it to docker-compose
- Images stored in PostgreSQL as BYTEA — no external file storage
- No authentication system (single user, local network)
- Single Docker container, single port (:8080), single process
- Every feature must work on mobile
