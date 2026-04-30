import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { api } from "./helpers/client.js";
import {
  truncateAll,
  closePool,
  scanWine,
  recognitionPayload,
} from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closePool();
});

// ---------------------------------------------------------------------------
// POST /api/wines/scan
// ---------------------------------------------------------------------------

describe("POST /api/wines/scan", () => {
  it("creates a wine with status=pending_recognition", async () => {
    const res = await scanWine();
    expect(res.status).toBe("pending_recognition");
    expect(res.id).toBeTruthy();
    expect(res.has_image).toBe(true);
  });

  it("returns 400 when no image is provided", async () => {
    const form = new FormData();
    const res = await api.postForm<{ error: string }>("/api/wines/scan", form);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when field name is wrong", async () => {
    const form = new FormData();
    // sending file under wrong field name "photo" instead of "image"
    form.append("photo", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "scan.jpg");
    const res = await api.postForm<{ error: string }>("/api/wines/scan", form);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/wines/pending
// ---------------------------------------------------------------------------

describe("GET /api/wines/pending", () => {
  it("returns pending wines", async () => {
    await scanWine();
    const res = await api.get<unknown[]>("/api/wines/pending");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("returns an empty array when no pending wines", async () => {
    const res = await api.get<unknown[]>("/api/wines/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("limits results via ?limit=", async () => {
    await scanWine();
    await scanWine();
    await scanWine();
    const res = await api.get<unknown[]>("/api/wines/pending?limit=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("filters by status=needs_review", async () => {
    // Create a pending_recognition wine and push it to needs_review
    const scanned = await scanWine();
    await api.put(`/api/wines/${scanned.id}/recognition`, recognitionPayload({ ai_confidence: 0.5 }));

    const res = await api.get<{ id: string; status: string }[]>("/api/wines/pending?status=needs_review");
    expect(res.status).toBe(200);
    const found = res.body.find((w) => w.id === scanned.id);
    expect(found).toBeDefined();
    expect(found?.status).toBe("needs_review");
  });

  it("includes image_base64 in pending response", async () => {
    await scanWine();
    const res = await api.get<{ image_base64?: string }[]>("/api/wines/pending");
    expect(res.status).toBe(200);
    expect(res.body[0]?.image_base64).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// PUT /api/wines/{id}/recognition
// ---------------------------------------------------------------------------

describe("PUT /api/wines/{id}/recognition", () => {
  it("sets status=recognized when confidence >= 0.80 and all fields present", async () => {
    const scanned = await scanWine();
    const res = await api.put<{ status: string }>(
      `/api/wines/${scanned.id}/recognition`,
      recognitionPayload({ ai_confidence: 0.92 })
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("recognized");
  });

  it("sets status=needs_review when confidence < 0.80", async () => {
    const scanned = await scanWine();
    const res = await api.put<{ status: string }>(
      `/api/wines/${scanned.id}/recognition`,
      recognitionPayload({ ai_confidence: 0.75 })
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("needs_review");
  });

  it("sets status=needs_review when confidence = 0.79 (boundary)", async () => {
    const scanned = await scanWine();
    const res = await api.put<{ status: string }>(
      `/api/wines/${scanned.id}/recognition`,
      recognitionPayload({ ai_confidence: 0.79 })
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("needs_review");
  });

  it("sets status=recognized when confidence = 0.80 (boundary)", async () => {
    const scanned = await scanWine();
    const res = await api.put<{ status: string }>(
      `/api/wines/${scanned.id}/recognition`,
      recognitionPayload({ ai_confidence: 0.80 })
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("recognized");
  });

  it("sets status=needs_review when name is missing", async () => {
    const scanned = await scanWine();
    const payload = recognitionPayload({ ai_confidence: 0.95 });
    delete (payload as Record<string, unknown>).name;
    const res = await api.put<{ status: string }>(`/api/wines/${scanned.id}/recognition`, payload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("needs_review");
  });

  it("sets status=needs_review when color is missing", async () => {
    const scanned = await scanWine();
    const payload = recognitionPayload({ ai_confidence: 0.95 });
    delete (payload as Record<string, unknown>).color;
    const res = await api.put<{ status: string }>(`/api/wines/${scanned.id}/recognition`, payload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("needs_review");
  });

  it("sets status=needs_review when country is missing", async () => {
    const scanned = await scanWine();
    const payload = recognitionPayload({ ai_confidence: 0.95 });
    delete (payload as Record<string, unknown>).country;
    const res = await api.put<{ status: string }>(`/api/wines/${scanned.id}/recognition`, payload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("needs_review");
  });

  it("returns 404 for unknown wine ID", async () => {
    const res = await api.put<{ error: string }>(
      "/api/wines/00000000-0000-0000-0000-000000000000/recognition",
      recognitionPayload()
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/wines/{id}/enrichment
// ---------------------------------------------------------------------------

describe("PUT /api/wines/{id}/enrichment", () => {
  it("sets status=enriched and saves enrichment data", async () => {
    // First bring wine to "recognized"
    const scanned = await scanWine();
    await api.put(`/api/wines/${scanned.id}/recognition`, recognitionPayload({ ai_confidence: 0.92 }));

    const res = await api.put<{ status: string }>(`/api/wines/${scanned.id}/enrichment`, {
      tasting_notes: { nose: "Cherry", palate: "Smooth", finish: "Long" },
      food_pairings: ["lamb", "cheese"],
      peak_maturity_start: 2025,
      peak_maturity_end: 2035,
      enrichment_confidence: 0.88,
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("enriched");
  });

  it("returns 404 for unknown wine ID", async () => {
    const res = await api.put<{ error: string }>(
      "/api/wines/00000000-0000-0000-0000-000000000000/enrichment",
      { tasting_notes: {}, food_pairings: [], enrichment_confidence: 0.9 }
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/wines/{id}/status
// ---------------------------------------------------------------------------

describe("PUT /api/wines/{id}/status", () => {
  it("sets status=failed", async () => {
    const scanned = await scanWine();
    const res = await api.put<{ status: string }>(`/api/wines/${scanned.id}/status`, {
      status: "failed",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("failed");
  });

  it("returns 400 for an invalid status value", async () => {
    const scanned = await scanWine();
    const res = await api.put<{ error: string }>(`/api/wines/${scanned.id}/status`, {
      status: "nonexistent_status",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 404 for unknown wine ID", async () => {
    const res = await api.put<{ error: string }>(
      "/api/wines/00000000-0000-0000-0000-000000000000/status",
      { status: "failed" }
    );
    expect(res.status).toBe(404);
  });
});
