/**
 * Playwright UI test helpers.
 * Creates test data via the API before UI tests run.
 */

import { type Page, request as playwrightRequest } from "@playwright/test";
import pg from "pg";

const APP_URL = (process.env.APP_URL ?? "http://localhost:8080").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// DB client (direct cleanup — mirrors api/helpers/fixtures.ts)
// ---------------------------------------------------------------------------

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error("TEST_DATABASE_URL is not set");
    _pool = new pg.Pool({ connectionString: url });
  }
  return _pool;
}

/** Wipe all app tables. Call in beforeEach of every UI spec. */
export async function truncateAll(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    TRUNCATE TABLE
      tasting_notes,
      consumption_log,
      cellar_entries,
      wines
    RESTART IDENTITY CASCADE
  `);
}

// ---------------------------------------------------------------------------
// API shortcuts (no browser needed)
// ---------------------------------------------------------------------------

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const ctx = await playwrightRequest.newContext({ baseURL: APP_URL });
  const res = await ctx.post(path, { data: body });
  const json = await res.json();
  await ctx.dispose();
  return json;
}

export interface Wine {
  id: string;
  name: string;
  status: string;
}

export interface CellarEntry {
  id: string;
  wine_id: string;
  quantity: number;
}

export async function apiCreateWine(overrides: Record<string, unknown> = {}): Promise<Wine> {
  return (await apiPost("/api/wines", {
    name: "UI Test Wine",
    producer: "Domaine UI",
    vintage: 2019,
    appellation: "Bordeaux",
    region: "Bordeaux",
    country: "France",
    color: "red",
    grape_varieties: ["Merlot"],
    description: "Created for UI test",
    ...overrides,
  })) as Wine;
}

export async function apiAddToCellar(wineId: string, quantity = 3): Promise<CellarEntry> {
  return (await apiPost("/api/cellar", {
    wine_id: wineId,
    quantity,
    location: "Test Cave",
    purchase_price: 20,
  })) as CellarEntry;
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

/** Wait for the page to be hydrated (no loading skeletons visible). */
export async function waitForHydration(page: Page): Promise<void> {
  // Wait until there are no skeleton loaders on screen
  await page.waitForFunction(() => {
    const skeletons = document.querySelectorAll("[data-slot='skeleton'], .animate-pulse");
    return skeletons.length === 0;
  }, { timeout: 10_000 });
}

/** Navigate to a page and wait for network idle. */
export async function goto(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
}
