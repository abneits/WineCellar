# AGENTS.md — Wine Cellar Manager

## Architecture in one sentence
Single Docker container (Go binary on :8080) serves both the REST API (`/api/*`) and the Next.js static export (`/*`). PostgreSQL, n8n, and Ollama are **all external** — never add them to docker-compose.

## Hard constraints (do not violate)
- **No Ollama calls from Go** — backend has zero AI dependency. All AI goes through n8n.
- **No n8n workflow code** — backend only exposes endpoints n8n calls, and proxies the pairing webhook.
- **No PostgreSQL service in docker-compose** — it's an external pre-existing instance.
- **Images stored as BYTEA in PostgreSQL** — no filesystem or external object storage.
- **Single port :8080, single process** — no Nginx, no sidecar.
- **Every feature must work on mobile (320px+)**.

## Go version
`go.mod` declares `go 1.26.2` and the Dockerfile uses `golang:1.26-alpine` (current stable).

## Dynamic routes in static export
Next.js static export cannot generate real dynamic routes. The workaround used here:
- `cellar/[id]/page.tsx` calls `generateStaticParams()` returning `[{ id: "__placeholder__" }]`
- The Go `staticFileHandler` in `main.go` replaces any real UUID segment with `__placeholder__` to find the HTML file
- The client component reads the real ID from `window.location.pathname` when `useParams()` returns `"__placeholder__"`

Do not remove `generateStaticParams` or the `__placeholder__` pattern — it's how dynamic routes work.

## Dev commands

```bash
# Frontend (from frontend/)
npm run dev        # dev server (not static — hits a real Next.js server)
npm run build      # produces static export in frontend/out/
npm run lint       # eslint

# Backend (from backend/)
go build ./...
go test ./...
go test ./handlers/...   # handlers have unit tests with mock repos

# Full container build
docker compose build
docker compose up
```

There is no `NEXT_PUBLIC_API_URL` — the frontend always hits the same origin (`/api/*`). Do not add one.

## Frontend stack specifics
- **Next.js 16.2.2** with `output: 'export'` — SSR and route handlers are unavailable
- **React 19.2.4** — concurrent features, new hooks
- **Tailwind CSS v4** — config via `@theme` in `globals.css`, not `tailwind.config.js`
- **shadcn/ui** built on `@base-ui/react` (not Radix UI) — check `components.json` before adding components
- **TanStack Query v5** — `useQuery` API differs from v4; `staleTime` is 30s globally
- **`ReactQueryDevtools` removed** — not imported, not in `package.json`

## Backend conventions
- Router: `go-chi/chi/v5` — use `{id}` param syntax, not `:id`
- Database: `pgx/v5` — do **not** use `database/sql` + `pq`
- Errors: always `{"error": "message"}` JSON
- UUIDs: `google/uuid`
- Migrations: plain `.sql` files in `backend/migrations/`, applied in filename order at startup, tracked in `schema_migrations` table
- `config.go` reads env vars — add new vars there, not inline

## Wine status lifecycle
```
pending_recognition → recognized (or needs_review if confidence < 80%)
                    → enriched
                    → validated   ← final state
                    → failed      ← at any point
Manual entry        → validated   (skips AI entirely)
```
`needs_review` is set automatically by `UpdateRecognition` when `ai_confidence < 0.80` or key identity fields are missing.

## n8n integration pattern

**Food pairing (synchronous)**
- backend → n8n: `POST N8N_PAIRING_WEBHOOK_URL` with `{prompt, cellar[]}`, 60s timeout

**Wine recognition + enrichment (async via llm_queue)**
- backend inserts tasks into shared `llm_queue` table (separate DB: `QUEUE_DATABASE_URL`)
- n8n CRON every minute: `SELECT ... LIMIT 1` → Ollama → `POST callback_url`
- `callback_url` for detection: `APP_BASE_URL/api/wines/:id/recognition`
- `callback_url` for enrichment: `APP_BASE_URL/api/wines/:id/enrichment`
- If `QUEUE_DATABASE_URL` not set → queueRepo is nil → scan works, tasks not queued (WARN log)
- Schema: `docs/llm_queue.sql` — run manually on the shared database
- Prompts and task builders: `backend/repository/queue_repo.go`


## Pages et navigation
- Bottom nav : Dashboard, Cellar, Scan, **Stats**, Calendar — pas de Pairings tab
- Food pairing intégré dans le Dashboard (`PairingWidget`) entre les stats cards et les pending bottles
- `/pairing` n'existe plus

## Stats
- `GET /api/stats` — `backend/handlers/stats.go` + `backend/repository/stats_repo.go`
- Page : `frontend/src/app/stats/page.tsx` — recharts (pie couleurs, barres régions/millésimes, consommation mensuelle, distribution notes, top 5 vins)

## THUMBNAIL_WIDTH
Env var correctement câblée : `config.go` → `NewWineRepo(pool, cfg.ThumbnailWidth)` → `wineRepo.thumbnailWidth`; default 300.

## `color` enum
Migration `007` added `yellow` as a valid wine color. The check constraint is: `red, white, rosé, sparkling, dessert, orange, yellow`. The TypeScript `WineColor` type in `frontend/src/types/index.ts` also includes `yellow`.

## Cellar list filtering
`GET /api/cellar` returns all entries — filtering by search/color is done **client-side** in `frontend/src/app/cellar/page.tsx`. Intentionnel : cave personnelle, volume faible.
