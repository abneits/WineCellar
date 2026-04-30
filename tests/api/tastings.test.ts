import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { api } from "./helpers/client.js";
import {
  truncateAll,
  closePool,
  createWine,
  addToCellar,
  createTasting,
} from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closePool();
});

// ---------------------------------------------------------------------------
// POST /api/tastings
// ---------------------------------------------------------------------------

describe("POST /api/tastings", () => {
  it("creates a tasting note", async () => {
    const wine = await createWine();
    const res = await api.post<{ id: string; rating: number; wine_id: string }>("/api/tastings", {
      wine_id: wine.id,
      rating: 4,
      comment: "Excellent balance",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.rating).toBe(4);
    expect(res.body.wine_id).toBe(wine.id);
  });

  it("creates a tasting note with rating=1 (minimum)", async () => {
    const wine = await createWine();
    const res = await api.post<{ rating: number }>("/api/tastings", {
      wine_id: wine.id,
      rating: 1,
      comment: "Not great",
    });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(1);
  });

  it("creates a tasting note with rating=5 (maximum)", async () => {
    const wine = await createWine();
    const res = await api.post<{ rating: number }>("/api/tastings", {
      wine_id: wine.id,
      rating: 5,
      comment: "Perfect",
    });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
  });

  it("returns 400 when rating is 0", async () => {
    const wine = await createWine();
    const res = await api.post<{ error: string }>("/api/tastings", {
      wine_id: wine.id,
      rating: 0,
      comment: "Below minimum",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when rating is 6", async () => {
    const wine = await createWine();
    const res = await api.post<{ error: string }>("/api/tastings", {
      wine_id: wine.id,
      rating: 6,
      comment: "Above maximum",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when wine_id is missing", async () => {
    const res = await api.post<{ error: string }>("/api/tastings", {
      rating: 4,
      comment: "No wine",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown wine_id", async () => {
    const res = await api.post<{ error: string }>("/api/tastings", {
      wine_id: "00000000-0000-0000-0000-000000000000",
      rating: 3,
      comment: "Ghost wine",
    });
    expect(res.status).toBe(400);
  });

  it("accepts optional tasted_at date", async () => {
    const wine = await createWine();
    const res = await api.post<{ tasted_at: string }>("/api/tastings", {
      wine_id: wine.id,
      rating: 3,
      comment: "Past tasting",
      tasted_at: "2022-12-25",
    });
    expect(res.status).toBe(201);
    expect(res.body.tasted_at).toContain("2022-12-25");
  });

  it("defaults tasted_at to today when not provided", async () => {
    const wine = await createWine();
    const res = await api.post<{ tasted_at: string }>("/api/tastings", {
      wine_id: wine.id,
      rating: 3,
      comment: "Today",
    });
    expect(res.status).toBe(201);
    const today = new Date().toISOString().slice(0, 10);
    expect(res.body.tasted_at).toContain(today);
  });

  it("links to a consumption_id when provided", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 2 });
    // consume to get a consumption_id
    await api.post(`/api/cellar/${entry.id}/consume`, { quantity: 1, occasion: "Dinner" });
    const pending = await api.get<{ consumption_id: string }[]>("/api/tastings/pending");
    expect(pending.body.length).toBeGreaterThanOrEqual(1);
    const consumptionId = pending.body[0]?.consumption_id;

    const res = await api.post<{ id: string }>("/api/tastings", {
      wine_id: wine.id,
      consumption_id: consumptionId,
      rating: 4,
      comment: "Linked",
    });
    expect(res.status).toBe(201);

    // pending should no longer include this consumption
    const pendingAfter = await api.get<{ consumption_id: string }[]>("/api/tastings/pending");
    const still = pendingAfter.body.find((p) => p.consumption_id === consumptionId);
    expect(still).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GET /api/tastings
// ---------------------------------------------------------------------------

describe("GET /api/tastings", () => {
  it("returns all tasting notes", async () => {
    const wine1 = await createWine();
    const wine2 = await createWine();
    await createTasting(wine1.id, { rating: 3 });
    await createTasting(wine2.id, { rating: 5 });
    const res = await api.get<unknown[]>("/api/tastings");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("returns empty array when no tastings", async () => {
    const res = await api.get<unknown[]>("/api/tastings");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("filters by wine_id", async () => {
    const wine1 = await createWine();
    const wine2 = await createWine();
    await createTasting(wine1.id, { rating: 3 });
    await createTasting(wine2.id, { rating: 5 });
    const res = await api.get<{ wine_id: string }[]>(`/api/tastings?wine_id=${wine1.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]?.wine_id).toBe(wine1.id);
  });

  it("includes wine details in response", async () => {
    const wine = await createWine({ name: "Tasting Wine" });
    await createTasting(wine.id);
    const res = await api.get<{ wine?: { name: string } }[]>("/api/tastings");
    expect(res.status).toBe(200);
    expect(res.body[0]?.wine?.name).toBe("Tasting Wine");
  });
});

// ---------------------------------------------------------------------------
// GET /api/tastings/pending
// ---------------------------------------------------------------------------

describe("GET /api/tastings/pending", () => {
  it("returns empty array when nothing consumed", async () => {
    const res = await api.get<unknown[]>("/api/tastings/pending");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns pending ratings after consumption", async () => {
    const wine = await createWine({ name: "Pending Wine" });
    const entry = await addToCellar(wine.id, { quantity: 3 });
    await api.post(`/api/cellar/${entry.id}/consume`, { quantity: 1, occasion: "Sunday lunch" });

    const res = await api.get<{ wine_name: string; occasion: string }[]>("/api/tastings/pending");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]?.wine_name).toBe("Pending Wine");
    expect(res.body[0]?.occasion).toBe("Sunday lunch");
  });
});

// ---------------------------------------------------------------------------
// PUT /api/tastings/{id}
// ---------------------------------------------------------------------------

describe("PUT /api/tastings/{id}", () => {
  it("updates rating and comment", async () => {
    const wine = await createWine();
    const tasting = await createTasting(wine.id, { rating: 3, comment: "Initial" });
    const res = await api.put<{ rating: number; comment: string }>(`/api/tastings/${tasting.id}`, {
      wine_id: wine.id,
      rating: 5,
      comment: "Updated!",
    });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe("Updated!");
  });

  it("returns 400 for invalid rating on update", async () => {
    const wine = await createWine();
    const tasting = await createTasting(wine.id);
    const res = await api.put<{ error: string }>(`/api/tastings/${tasting.id}`, {
      wine_id: wine.id,
      rating: 10,
      comment: "Too high",
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown tasting ID", async () => {
    const wine = await createWine();
    const res = await api.put<{ error: string }>(
      "/api/tastings/00000000-0000-0000-0000-000000000000",
      { wine_id: wine.id, rating: 3, comment: "Ghost" }
    );
    expect(res.status).toBe(404);
  });
});
