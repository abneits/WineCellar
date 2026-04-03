# 🍷 Wine Cellar Manager — Project Specification

## 1. Overview

**Wine Cellar Manager** is a self-hosted, fully dockerized web application designed to manage a personal wine cellar. It leverages local AI models (via Ollama) for bottle recognition, wine research, and food pairing recommendations. The application is mobile-first, with a rich UI inspired by wine cellar aesthetics.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | **Go (Golang)** | High performance, excellent concurrency for handling AI calls and image processing, single binary deployment, strong Docker support, low memory footprint |
| **Frontend** | **Next.js (React) + Tailwind CSS** | Modern SSR/CSR hybrid, excellent mobile support, rich component ecosystem, easy theming |
| **Database** | **PostgreSQL** (remote, pre-existing) | Robust JSON support (`jsonb`), image storage via `bytea` or large objects, full-text search |
| **AI Engine** | **Ollama** (local, pre-existing) | Privacy-first, no API costs, supports vision and text models |
| **AI Models** | **LLaMA 3.2 Vision** (image recognition) + **Open-source LLM** (text/search/pairing) | Local inference, no external dependencies |
| **Containerization** | **Docker + Docker Compose** | Reproducible, isolated services |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
│                                                      │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │   Frontend    │────▶│       Backend (Go)        │  │
│  │   Next.js     │◀────│    REST / WebSocket API   │  │
│  │   :3000       │     │         :8080             │  │
│  └──────────────┘     └──────────┬───────────────┘  │
│                                   │                   │
│                        ┌──────────┴───────────┐      │
│                        │                      │      │
│                        ▼                      ▼      │
│               ┌──────────────┐     ┌──────────────┐  │
│               │   Ollama     │     │  PostgreSQL   │  │
│               │  (external)  │     │  (external)   │  │
│               │  :11434      │     │  :5432        │  │
│               └──────────────┘     └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### 4.1 `wines` table

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique wine identifier |
| `name` | `VARCHAR(255)` | Wine name |
| `appellation` | `VARCHAR(255)` | Appellation / AOC / DOC |
| `region` | `VARCHAR(255)` | Wine region |
| `country` | `VARCHAR(100)` | Country of origin |
| `producer` | `VARCHAR(255)` | Winery / producer name |
| `vintage` | `INTEGER` | Harvest year |
| `color` | `ENUM` | `red`, `white`, `rosé`, `sparkling`, `dessert`, `orange` |
| `grape_varieties` | `JSONB` | Array of grape varieties with percentages |
| `alcohol_content` | `DECIMAL(4,2)` | ABV percentage |
| `description` | `TEXT` | AI-generated or user-edited description |
| `tasting_notes` | `JSONB` | Nose, palate, finish, aromas |
| `food_pairings` | `JSONB` | Suggested food pairings |
| `peak_maturity_start` | `INTEGER` | Year when wine enters drinking window |
| `peak_maturity_end` | `INTEGER` | Year when wine exits drinking window |
| `average_price` | `DECIMAL(10,2)` | Estimated market price |
| `ai_confidence` | `DECIMAL(3,2)` | AI recognition confidence score (0-1) |
| `ai_raw_response` | `JSONB` | Full AI response for debugging |
| `web_search_data` | `JSONB` | Data retrieved from web search |
| `image` | `BYTEA` | Original scanned bottle photo |
| `image_thumbnail` | `BYTEA` | Compressed thumbnail for list views |
| `created_at` | `TIMESTAMP` | Creation date |
| `updated_at` | `TIMESTAMP` | Last update date |

### 4.2 `cellar_entries` table

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique entry identifier |
| `wine_id` | `UUID` (FK → wines) | Reference to the wine |
| `quantity` | `INTEGER` | Number of bottles in stock |
| `location` | `VARCHAR(100)` | Physical location in cellar (e.g., "Rack A, Shelf 3") |
| `purchase_date` | `DATE` | Date of purchase |
| `purchase_price` | `DECIMAL(10,2)` | Price paid per bottle |
| `added_at` | `TIMESTAMP` | When added to cellar |

### 4.3 `tasting_notes` table

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique note identifier |
| `wine_id` | `UUID` (FK → wines) | Reference to the wine |
| `rating` | `INTEGER` | User rating (1-5 stars or 1-100 scale) |
| `comment` | `TEXT` | Free-text tasting note |
| `tasted_at` | `DATE` | Date the wine was tasted |
| `created_at` | `TIMESTAMP` | Creation date |

### 4.4 `consumption_log` table

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` (PK) | Unique log identifier |
| `cellar_entry_id` | `UUID` (FK → cellar_entries) | Which cellar entry was consumed |
| `wine_id` | `UUID` (FK → wines) | Reference to the wine |
| `quantity` | `INTEGER` | Number of bottles removed |
| `consumed_at` | `TIMESTAMP` | When the bottle was opened |
| `occasion` | `VARCHAR(255)` | Optional: what was the occasion |
| `rated` | `BOOLEAN` | Whether user has rated this consumption |

---

## 5. API Endpoints

### 5.1 Wine Management

```
POST   /api/wines/scan              Upload photo → AI recognition → return suggestions
POST   /api/wines                   Create wine (manual or validated AI result)
PUT    /api/wines/:id               Update wine details
GET    /api/wines                   List all wines (with filters, pagination)
GET    /api/wines/:id               Get wine details
GET    /api/wines/:id/image         Get wine bottle image (full or thumbnail)
DELETE /api/wines/:id               Delete a wine
```

### 5.2 Cellar Management

```
POST   /api/cellar                  Add wine to cellar (with quantity multiplier)
PUT    /api/cellar/:id              Update cellar entry (quantity, location)
DELETE /api/cellar/:id              Remove entry from cellar
POST   /api/cellar/:id/consume      Remove bottle(s) from stock (consume)
GET    /api/cellar                  List cellar contents (with filters, sorting)
GET    /api/cellar/stats            Cellar statistics (total bottles, value, etc.)
GET    /api/cellar/recent           Last 5 added bottles
GET    /api/cellar/maturity         Upcoming maturity calendar
```

### 5.3 Tasting & Rating

```
POST   /api/tastings                Add tasting note + rating
GET    /api/tastings                List tasting notes
GET    /api/tastings/pending        Get consumed wines pending rating
PUT    /api/tastings/:id            Update a tasting note
```

### 5.4 AI Assistant

```
POST   /api/ai/pairing              Food pairing recommendation (text prompt)
POST   /api/ai/search               Web search for wine info via AI
```

---

## 6. Core Features

### 6.1 Bottle Scanning & AI Recognition

**Flow:**

1. User opens camera / uploads photo from mobile
2. Photo is sent to backend (`POST /api/wines/scan`)
3. Backend sends image to **Ollama (LLaMA 3.2 Vision)** with a structured prompt
4. Vision model extracts: wine name, producer, vintage, appellation, color, etc.
5. Backend sends extracted info to **text LLM** for enrichment and web search
6. Results are returned to the frontend as a **pre-filled form**
7. User reviews, edits if needed, and **validates or rejects**
8. If rejected → user can manually fill in all fields
9. On validation → wine + photo are saved to PostgreSQL
10. User sets **quantity multiplier** (how many bottles to add)

**AI Prompt Strategy (Vision Model):**

```
Analyze this wine bottle image. Extract the following information in JSON format:
- name: full wine name as written on the label
- producer: winery or producer name
- vintage: year (integer or null)
- appellation: appellation, AOC, DOC, AVA, etc.
- region: wine region
- country: country of origin
- color: one of [red, white, rosé, sparkling, dessert, orange]
- grape_varieties: array of grape names if visible
- alcohol_content: ABV if visible (number)
- any_additional_info: any other relevant text from the label

Respond ONLY with valid JSON, no additional text.
```

### 6.2 Validation Workflow

```
┌──────────┐     ┌──────────────┐     ┌───────────────┐
│  Scan    │────▶│  AI Analysis │────▶│  Review Form  │
│  Photo   │     │  + Enrichment│     │  (pre-filled) │
└──────────┘     └──────────────┘     └───────┬───────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                              ┌─────▼─────┐        ┌─────▼──────┐
                              │  Validate │        │  Reject /  │
                              │  & Save   │        │  Edit      │
                              └───────────┘        └─────┬──────┘
                                                          │
                                                   ┌──────▼──────┐
                                                   │ Manual Form │
                                                   │ (empty or   │
                                                   │  pre-filled)│
                                                   └─────────────┘
```

### 6.3 Quantity Multiplier

- Displayed as a numeric stepper (`-` / `+`) on the validation form
- Default value: **1**
- Range: 1–99
- Determines how many bottles are added to `cellar_entries.quantity`

### 6.4 Cellar Dashboard

The main view displays:

- **Total bottles count** and **estimated total value**
- **Distribution charts** (by color, region, vintage)
- **Last 5 bottles added** (card list with thumbnail, name, vintage)
- **Maturity calendar** (upcoming wines reaching peak drinking window)
- **Quick actions**: Scan, Search, Consume

### 6.5 Maturity Calendar

- Calendar view (month/year navigation)
- Shows wines entering their `peak_maturity_start` window
- Color-coded: 🟢 Ready now | 🟡 Soon (< 1 year) | 🔴 Not yet
- Click on a wine → detail view

### 6.6 Food Pairing AI Assistant

- Simple text input: *"I'm having grilled lamb with rosemary and roasted vegetables"*
- Sends prompt to **text LLM via Ollama** with cellar inventory as context
- AI responds with top 3-5 bottle recommendations **from the user's cellar**
- Each recommendation includes: wine name, why it pairs well, serving temperature

### 6.7 Rating System

- **On site open**: modal popup listing consumed wines without a rating
- Rating: **1–5 stars** (visual star picker)
- Optional comment text area
- "Skip" and "Rate later" options
- Ratings visible on wine detail page

### 6.8 Consume / Remove from Stock

- On any wine detail or cellar list: "Open a bottle" button
- Quantity selector (default 1)
- Optional: occasion text field
- Decrements `cellar_entries.quantity`
- Creates entry in `consumption_log`
- If quantity reaches 0 → entry marked as depleted (not deleted, for history)

### 6.9 Manual Wine Entry

- Full form with all wine fields
- Photo upload (optional)
- Available when:
  - AI fails to recognize a bottle
  - User rejects AI suggestion
  - User wants to add a wine without scanning

---

## 7. UI / UX Design

### 7.1 Design Theme

- **Color palette**: Deep burgundy (#722F37), dark wood (#3E2723), cream/parchment (#FFF8E7), gold accents (#C9A84C), charcoal (#2C2C2C)
- **Typography**: Serif headings (Playfair Display or Cormorant Garamond), sans-serif body (Inter)
- **Visual elements**: Subtle wine stain textures, cork/wood grain backgrounds, elegant card borders
- **Dark mode default** (wine cellar ambiance)

### 7.2 Mobile-First Layout

- Bottom navigation bar (Dashboard, Cellar, Scan, Pairings, Profile)
- Swipe gestures on cellar list (swipe to consume / rate)
- Camera integration for scanning (native camera API)
- Touch-friendly controls: large tap targets (min 44px), stepper buttons
- Pull-to-refresh on lists

### 7.3 Key Screens

1. **Dashboard** — stats, recent additions, maturity alerts, pending ratings modal
2. **Cellar List** — searchable, filterable grid/list view with thumbnails
3. **Wine Detail** — full info, photo, tasting notes, actions (consume, rate, edit)
4. **Scan** — camera viewfinder → AI processing → validation form
5. **Pairing Assistant** — chat-like interface with text input
6. **Maturity Calendar** — month view with wine markers
7. **Stats** — charts and analytics (distribution, value over time)

---

## 8. Docker Compose Configuration

```yaml
version: "3.9"

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://user:password@host:5432/winecellar
      - OLLAMA_URL=http://host.docker.internal:11434
      - OLLAMA_VISION_MODEL=llama3.2-vision
      - OLLAMA_TEXT_MODEL=mistral
      - CORS_ORIGINS=http://localhost:3000
    restart: unless-stopped
```

> **Note:** Ollama and PostgreSQL are external services (already running), not managed by this compose file.

---

## 9. Project Structure

```
wine-cellar-manager/
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   ├── main.go
│   ├── config/
│   │   └── config.go
│   ├── handlers/
│   │   ├── wine.go
│   │   ├── cellar.go
│   │   ├── tasting.go
│   │   └── ai.go
│   ├── models/
│   │   ├── wine.go
│   │   ├── cellar.go
│   │   ├── tasting.go
│   │   └── consumption.go
│   ├── services/
│   │   ├── ollama.go
│   │   ├── wine_service.go
│   │   └── cellar_service.go
│   ├── repository/
│   │   ├── wine_repo.go
│   │   ├── cellar_repo.go
│   │   └── tasting_repo.go
│   ├── middleware/
│   │   ├── cors.go
│   │   └── logging.go
│   └── migrations/
│       ├── 001_create_wines.sql
│       ├── 002_create_cellar_entries.sql
│       ├── 003_create_tasting_notes.sql
│       └── 004_create_consumption_log.sql
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── public/
│   │   └── fonts/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── cellar/
│   │   │   │   ├── page.tsx          # Cellar list
│   │   │   │   └── [id]/page.tsx     # Wine detail
│   │   │   ├── scan/
│   │   │   │   └── page.tsx          # Scan & validate
│   │   │   ├── pairing/
│   │   │   │   └── page.tsx          # AI pairing assistant
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx          # Maturity calendar
│   │   │   └── stats/
│   │   │       └── page.tsx          # Analytics
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable UI components
│   │   │   ├── wine/                 # Wine-specific components
│   │   │   ├── cellar/               # Cellar components
│   │   │   ├── scan/                 # Scanning components
│   │   │   └── layout/               # Navigation, header, etc.
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api.ts                # API client
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts              # TypeScript interfaces
│   └── .env.local
```

---

## 10. Additional Feature Suggestions

Here are features not in the original spec that could significantly enhance the experience:

### 10.1 🔖 Wishlist
- Save wines you've tried elsewhere or want to buy
- "Add to wishlist" from pairing suggestions
- Mark as purchased when you scan them into your cellar

### 10.2 📊 Value Tracking
- Track estimated value evolution of your cellar over time
- Price alerts: flag wines that have significantly appreciated
- Total cellar valuation on dashboard

### 10.3 🏷️ Custom Tags & Collections
- User-defined tags (e.g., "dinner party", "gift", "special occasion", "everyday")
- Create themed collections: "Summer BBQ wines", "Birthday reserves"
- Filter cellar by tags

### 10.4 📤 Share & Export
- Export cellar inventory as CSV/PDF
- Generate a "wine menu" for dinner parties (select wines → generate printable card)
- Share a wine recommendation link

### 10.5 🌡️ Serving Suggestions
- AI-powered serving temperature recommendation
- Decanting time suggestion based on wine age and type
- Display on wine detail page

### 10.6 📈 Drinking Statistics
- Monthly/yearly consumption charts
- Favorite regions, grapes, producers (based on ratings)
- Average spend per bottle
- "Wine personality" summary

### 10.7 🔔 Notifications (PWA)
- Progressive Web App for push notifications
- "Wine X is entering its peak window this month"
- "You have 3 unrated wines"
- Reminder to restock low-quantity favorites

### 10.8 🗺️ Wine Map
- Visual map showing origin of all wines in cellar
- Click a region → filter wines from that area
- Heat map of favorite regions

### 10.9 📸 Label Archive
- Side-by-side comparison of labels from same producer across vintages
- AI-powered label similarity detection (detect duplicates)

### 10.10 🍽️ Meal Planner Integration
- Plan meals for the week → AI suggests wine pairings for each
- Shopping list: wines to buy based on planned meals

### 10.11 👥 Multi-User Support (Future)
- Household accounts with shared cellar
- Personal ratings per user
- "Reserved" bottles (mark for a specific person/event)

### 10.12 🔍 Smart Search
- Natural language search: "red Bordeaux under 5 years old"
- AI-powered: "something similar to the Châteauneuf I liked last month"

---

## 11. Development Phases

### Phase 1 — Foundation (MVP)
- [ ] Database schema + migrations
- [ ] Go backend: CRUD for wines, cellar, tastings
- [ ] Ollama integration (vision + text)
- [ ] Scan → AI recognition → validation flow
- [ ] Manual wine entry
- [ ] Basic Next.js frontend with mobile layout
- [ ] Docker Compose setup
- [ ] Image storage and retrieval

### Phase 2 — Core Experience
- [ ] Dashboard with stats and recent wines
- [ ] Maturity calendar
- [ ] Food pairing AI assistant
- [ ] Rating system + pending rating modal
- [ ] Consume/remove bottle flow
- [ ] Quantity multiplier on scan
- [ ] Search and filter cellar

### Phase 3 — Polish & Enhancements
- [ ] Wine cellar themed UI (dark mode, textures, typography)
- [ ] Swipe gestures on mobile
- [ ] Charts and analytics (Recharts or Chart.js)
- [ ] PWA setup + notifications
- [ ] Wishlist
- [ ] Tags and collections

---

## 12. Environment Variables

```env
# Backend
DATABASE_URL=postgresql://user:password@host:5432/winecellar
SERVER_PORT=8080
CORS_ORIGINS=http://localhost:3000
MAX_IMAGE_SIZE_MB=10
THUMBNAIL_WIDTH=300
JWT_SECRET=your-secret-key   # if adding auth later

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 13. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Mobile responsiveness | All screens usable on 320px+ |
| Image upload size | Max 10 MB |
| AI response time | < 30s for vision, < 10s for text |
| Database | PostgreSQL 15+ with JSONB support |
| Browser support | Chrome, Safari, Firefox (latest 2 versions) |
| Accessibility | WCAG 2.1 AA (contrast, keyboard nav, screen readers) |
| Offline | PWA: view cellar offline, queue actions |
