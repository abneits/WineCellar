/**
 * Test fixtures: helpers to create and clean up test data via the API
 * and directly via PostgreSQL (for reliable teardown).
 */

import pg from "pg";
import { api } from "./client.js";

// ---------------------------------------------------------------------------
// DB client (direct cleanup)
// ---------------------------------------------------------------------------

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error("TEST_DATABASE_URL is not set");
    _pool = new pg.Pool({ connectionString: url });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

/** Truncate all app tables in the test database — use in beforeEach/afterAll. */
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
// Wine fixtures
// ---------------------------------------------------------------------------

export interface WinePayload {
  name?: string;
  producer?: string;
  vintage?: number;
  appellation?: string;
  region?: string;
  country?: string;
  color?: string;
  grape_varieties?: string[];
  alcohol_content?: number;
  description?: string;
}

export interface Wine {
  id: string;
  name: string;
  producer: string;
  vintage?: number;
  appellation: string;
  region: string;
  country: string;
  color: string;
  grape_varieties: string[];
  alcohol_content?: number;
  description: string;
  status: string;
  has_image: boolean;
  created_at: string;
  updated_at: string;
}

export function winePayload(overrides: WinePayload = {}): WinePayload {
  return {
    name: "Château Test",
    producer: "Domaine Test",
    vintage: 2018,
    appellation: "Saint-Émilion Grand Cru",
    region: "Bordeaux",
    country: "France",
    color: "red",
    grape_varieties: ["Merlot"],
    alcohol_content: 13.5,
    description: "A test wine",
    ...overrides,
  };
}

export async function createWine(overrides: WinePayload = {}): Promise<Wine> {
  const res = await api.post<Wine>("/api/wines", winePayload(overrides));
  if (res.status !== 201) {
    throw new Error(`createWine failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

/** Create a wine with a real JPEG image attached (multipart). */
export async function createWineWithImage(overrides: WinePayload = {}): Promise<Wine> {
  const form = new FormData();
  form.append("wine", JSON.stringify(winePayload(overrides)));
  // Minimal 1×1 white JPEG (631 bytes)
  const jpegBytes = minimalJpeg();
  form.append("image", new Blob([jpegBytes], { type: "image/jpeg" }), "label.jpg");
  const res = await api.postForm<Wine>("/api/wines/with-image", form);
  if (res.status !== 201) {
    throw new Error(`createWineWithImage failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

/** Create a wine with pending_recognition status (via scan endpoint). */
export async function scanWine(): Promise<{ id: string; status: string; has_image: boolean }> {
  const form = new FormData();
  const jpegBytes = minimalJpeg();
  form.append("image", new Blob([jpegBytes], { type: "image/jpeg" }), "scan.jpg");
  const res = await api.postForm<{ id: string; status: string; has_image: boolean }>(
    "/api/wines/scan",
    form
  );
  if (res.status !== 201) {
    throw new Error(`scanWine failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ---------------------------------------------------------------------------
// Cellar fixtures
// ---------------------------------------------------------------------------

export interface CellarEntry {
  id: string;
  wine_id: string;
  quantity: number;
  location: string;
  purchase_price?: number;
  added_at: string;
}

export async function addToCellar(
  wineId: string,
  overrides: { quantity?: number; location?: string; purchase_price?: number } = {}
): Promise<CellarEntry> {
  const res = await api.post<CellarEntry>("/api/cellar", {
    wine_id: wineId,
    quantity: overrides.quantity ?? 3,
    location: overrides.location ?? "Cave A",
    purchase_price: overrides.purchase_price ?? 25.0,
  });
  if (res.status !== 201) {
    throw new Error(`addToCellar failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ---------------------------------------------------------------------------
// Tasting fixtures
// ---------------------------------------------------------------------------

export interface TastingNote {
  id: string;
  wine_id: string;
  rating: number;
  comment: string;
  tasted_at: string;
  created_at: string;
}

export async function createTasting(
  wineId: string,
  overrides: { rating?: number; comment?: string } = {}
): Promise<TastingNote> {
  const res = await api.post<TastingNote>("/api/tastings", {
    wine_id: wineId,
    rating: overrides.rating ?? 4,
    comment: overrides.comment ?? "Test tasting note",
  });
  if (res.status !== 201) {
    throw new Error(`createTasting failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ---------------------------------------------------------------------------
// Recognition payload helpers
// ---------------------------------------------------------------------------

export function recognitionPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Château Margaux",
    producer: "Château Margaux",
    vintage: 2015,
    appellation: "Margaux",
    region: "Bordeaux",
    country: "France",
    color: "red",
    grape_varieties: ["Cabernet Sauvignon"],
    alcohol_content: 13.0,
    description: "Grand vin de Bordeaux",
    ai_confidence: 0.92,
    ai_raw_response: '{"raw": true}',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Minimal 1×1 JPEG helper (no dependency)
// ---------------------------------------------------------------------------

function minimalJpeg(): Uint8Array {
  // A valid 1×1 white JPEG, base64 encoded
  const b64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U" +
    "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN" +
    "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
    "MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAA" +
    "AgIBBAMAAAAAAAAAAAAAAQIDBAUREiExQf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEA" +
    "AAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwXi9p2nYa1aoxzStGpPlZuSST+5JNk8nk" +
    "k8n3oAKAP//Z";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
