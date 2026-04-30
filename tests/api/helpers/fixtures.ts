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
  // Minimal valid JPEG (1x1 white pixel) decodable by Go's image/jpeg package.
  // Raw bytes of a standard JFIF JPEG with a single white pixel.
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
    0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
    0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
    0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
    0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
    0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd2, 0x8a, 0x28, 0x03, 0xff, 0xd9,
  ]);
  return bytes;
}
