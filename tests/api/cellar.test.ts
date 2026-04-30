import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { api } from "./helpers/client.js";
import {
  truncateAll,
  closePool,
  createWine,
  addToCellar,
} from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closePool();
});

// ---------------------------------------------------------------------------
// POST /api/cellar — add to cellar
// ---------------------------------------------------------------------------

describe("POST /api/cellar", () => {
  it("adds a wine to the cellar", async () => {
    const wine = await createWine();
    const res = await api.post<{ id: string; quantity: number; wine_id: string }>("/api/cellar", {
      wine_id: wine.id,
      quantity: 6,
      location: "Cave A",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.quantity).toBe(6);
    expect(res.body.wine_id).toBe(wine.id);
  });

  it("accepts optional purchase_price and purchase_date", async () => {
    const wine = await createWine();
    const res = await api.post<{ id: string }>("/api/cellar", {
      wine_id: wine.id,
      quantity: 2,
      location: "Rack B",
      purchase_price: 45.0,
      purchase_date: "2023-06-15",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });

  it("returns 400 when wine_id is missing", async () => {
    const res = await api.post<{ error: string }>("/api/cellar", {
      quantity: 3,
      location: "Cave A",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when quantity is 0", async () => {
    const wine = await createWine();
    const res = await api.post<{ error: string }>("/api/cellar", {
      wine_id: wine.id,
      quantity: 0,
      location: "Cave A",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for unknown wine_id", async () => {
    const res = await api.post<{ error: string }>("/api/cellar", {
      wine_id: "00000000-0000-0000-0000-000000000000",
      quantity: 1,
      location: "Cave A",
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/cellar — list
// ---------------------------------------------------------------------------

describe("GET /api/cellar", () => {
  it("returns an empty list initially", async () => {
    const res = await api.get<unknown[]>("/api/cellar");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it("returns cellar entries with wine details", async () => {
    const wine = await createWine({ name: "Cave Wine" });
    await addToCellar(wine.id, { quantity: 4 });
    const res = await api.get<{ wine?: { name: string }; quantity: number }[]>("/api/cellar");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]?.quantity).toBe(4);
    expect(res.body[0]?.wine?.name).toBe("Cave Wine");
  });

  it("returns multiple entries", async () => {
    const wine1 = await createWine({ name: "Wine 1" });
    const wine2 = await createWine({ name: "Wine 2" });
    await addToCellar(wine1.id);
    await addToCellar(wine2.id);
    const res = await api.get<unknown[]>("/api/cellar");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// GET /api/cellar/{id}
// ---------------------------------------------------------------------------

describe("GET /api/cellar/{id}", () => {
  it("returns a cellar entry by ID", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 3 });
    const res = await api.get<{ id: string; quantity: number }>(`/api/cellar/${entry.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(entry.id);
    expect(res.body.quantity).toBe(3);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await api.get<{ error: string }>("/api/cellar/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/cellar/{id}
// ---------------------------------------------------------------------------

describe("PUT /api/cellar/{id}", () => {
  it("updates location and quantity", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 3, location: "Cave A" });
    const res = await api.put<{ location: string; quantity: number }>(`/api/cellar/${entry.id}`, {
      wine_id: wine.id,
      quantity: 5,
      location: "Cave B",
    });
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(5);
    expect(res.body.location).toBe("Cave B");
  });

  it("returns 404 for unknown ID", async () => {
    const wine = await createWine();
    const res = await api.put<{ error: string }>(
      "/api/cellar/00000000-0000-0000-0000-000000000000",
      { wine_id: wine.id, quantity: 1, location: "X" }
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/cellar/{id}
// ---------------------------------------------------------------------------

describe("DELETE /api/cellar/{id}", () => {
  it("deletes a cellar entry", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id);
    const del = await api.delete(`/api/cellar/${entry.id}`);
    expect(del.status).toBe(204);
    const get = await api.get<{ error: string }>(`/api/cellar/${entry.id}`);
    expect(get.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await api.delete("/api/cellar/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/cellar/{id}/consume
// ---------------------------------------------------------------------------

describe("POST /api/cellar/{id}/consume", () => {
  it("consumes 1 bottle and decrements quantity", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 3 });
    const res = await api.post<{ message?: string }>(`/api/cellar/${entry.id}/consume`, {
      quantity: 1,
      occasion: "Dinner",
    });
    expect(res.status).toBe(204);

    const updated = await api.get<{ quantity: number }>(`/api/cellar/${entry.id}`);
    expect(updated.body.quantity).toBe(2);
  });

  it("consumes multiple bottles at once", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 6 });
    await api.post(`/api/cellar/${entry.id}/consume`, { quantity: 4, occasion: "Party" });
    const updated = await api.get<{ quantity: number }>(`/api/cellar/${entry.id}`);
    expect(updated.body.quantity).toBe(2);
  });

  it("defaults quantity to 1 when quantity < 1", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 3 });
    await api.post(`/api/cellar/${entry.id}/consume`, { quantity: 0, occasion: "Test" });
    const updated = await api.get<{ quantity: number }>(`/api/cellar/${entry.id}`);
    expect(updated.body.quantity).toBe(2);
  });

  it("returns 409 when consuming more than available stock", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 2 });
    const res = await api.post<{ error: string }>(`/api/cellar/${entry.id}/consume`, {
      quantity: 5,
      occasion: "Too many",
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 404 for unknown entry ID", async () => {
    const res = await api.post<{ error: string }>(
      "/api/cellar/00000000-0000-0000-0000-000000000000/consume",
      { quantity: 1, occasion: "Test" }
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/cellar/stats
// ---------------------------------------------------------------------------

describe("GET /api/cellar/stats", () => {
  it("returns zeros when cellar is empty", async () => {
    const res = await api.get<{
      total_bottles: number;
      unique_wines: number;
      total_value: number;
      by_color: Record<string, number>;
    }>("/api/cellar/stats");
    expect(res.status).toBe(200);
    expect(res.body.total_bottles).toBe(0);
    expect(res.body.unique_wines).toBe(0);
    expect(res.body.total_value).toBe(0);
  });

  it("reflects added wines", async () => {
    const wine = await createWine({ color: "red" });
    await addToCellar(wine.id, { quantity: 4, purchase_price: 20 });
    const res = await api.get<{
      total_bottles: number;
      unique_wines: number;
      total_value: number;
      by_color: Record<string, number>;
    }>("/api/cellar/stats");
    expect(res.status).toBe(200);
    expect(res.body.total_bottles).toBe(4);
    expect(res.body.unique_wines).toBe(1);
    expect(res.body.total_value).toBe(80);
    expect(res.body.by_color["red"]).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// GET /api/cellar/recent
// ---------------------------------------------------------------------------

describe("GET /api/cellar/recent", () => {
  it("returns recent entries (max 5)", async () => {
    for (let i = 0; i < 7; i++) {
      const wine = await createWine({ name: `Wine ${i}` });
      await addToCellar(wine.id);
    }
    const res = await api.get<unknown[]>("/api/cellar/recent");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(5);
  });

  it("returns empty array when cellar is empty", async () => {
    const res = await api.get<unknown[]>("/api/cellar/recent");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GET /api/cellar/maturity
// ---------------------------------------------------------------------------

describe("GET /api/cellar/maturity", () => {
  it("returns empty array when no wines have peak maturity set", async () => {
    const wine = await createWine();
    await addToCellar(wine.id);
    const res = await api.get<unknown[]>("/api/cellar/maturity");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns maturity entries with status field", async () => {
    // Create wine with peak maturity via enrichment
    const wine = await createWine();
    // Directly patch via DB to set peak_maturity fields
    const pool = (await import("./helpers/fixtures.js")).getPool();
    await pool.query(
      `UPDATE wines SET peak_maturity_start = 2020, peak_maturity_end = 2030 WHERE id = $1`,
      [wine.id]
    );
    await addToCellar(wine.id, { quantity: 2 });

    const res = await api.get<{ status: string }[]>("/api/cellar/maturity");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const entry = res.body[0];
    expect(["ready", "soon", "not_yet"]).toContain(entry?.status);
  });
});
