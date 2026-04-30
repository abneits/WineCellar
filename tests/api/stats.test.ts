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
// GET /health
// ---------------------------------------------------------------------------

describe("GET /health", () => {
  it("returns 200", async () => {
    const res = await api.get("/health");
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/stats
// ---------------------------------------------------------------------------

describe("GET /api/stats", () => {
  it("returns all expected keys", async () => {
    const res = await api.get<Record<string, unknown>>("/api/stats");
    expect(res.status).toBe(200);

    const keys = [
      "total_bottles",
      "unique_wines",
      "total_consumed",
      "by_color",
      "by_region",
      "by_vintage",
      "consumption_by_month",
      "rating_distribution",
      "top_rated",
    ];
    for (const key of keys) {
      expect(res.body, `key "${key}" must be present`).toHaveProperty(key);
    }
  });

  it("returns zero totals on empty database", async () => {
    const res = await api.get<{
      total_bottles: number;
      unique_wines: number;
      total_consumed: number;
    }>("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.total_bottles).toBe(0);
    expect(res.body.unique_wines).toBe(0);
    expect(res.body.total_consumed).toBe(0);
  });

  it("by_color, by_region, by_vintage are arrays", async () => {
    const res = await api.get<{
      by_color: unknown[];
      by_region: unknown[];
      by_vintage: unknown[];
    }>("/api/stats");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.by_color)).toBe(true);
    expect(Array.isArray(res.body.by_region)).toBe(true);
    expect(Array.isArray(res.body.by_vintage)).toBe(true);
  });

  it("consumption_by_month and rating_distribution are arrays", async () => {
    const res = await api.get<{
      consumption_by_month: unknown[];
      rating_distribution: unknown[];
    }>("/api/stats");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.consumption_by_month)).toBe(true);
    expect(Array.isArray(res.body.rating_distribution)).toBe(true);
  });

  it("top_rated is an array", async () => {
    const res = await api.get<{ top_rated: unknown[] }>("/api/stats");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.top_rated)).toBe(true);
  });

  it("total_bottles reflects cellar quantity", async () => {
    const wine = await createWine({ color: "red" });
    await addToCellar(wine.id, { quantity: 6 });
    const res = await api.get<{ total_bottles: number }>("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.total_bottles).toBe(6);
  });

  it("unique_wines reflects distinct wines in cellar", async () => {
    const wine1 = await createWine();
    const wine2 = await createWine();
    await addToCellar(wine1.id, { quantity: 3 });
    await addToCellar(wine2.id, { quantity: 2 });
    const res = await api.get<{ unique_wines: number }>("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.unique_wines).toBe(2);
  });

  it("total_consumed increases after consumption", async () => {
    const wine = await createWine();
    const entry = await addToCellar(wine.id, { quantity: 5 });
    await api.post(`/api/cellar/${entry.id}/consume`, { quantity: 2, occasion: "Dinner" });
    const res = await api.get<{ total_consumed: number }>("/api/stats");
    expect(res.status).toBe(200);
    expect(res.body.total_consumed).toBe(2);
  });

  it("by_color contains a label/count entry for each added color", async () => {
    const redWine = await createWine({ color: "red" });
    const whiteWine = await createWine({ color: "white" });
    await addToCellar(redWine.id, { quantity: 4 });
    await addToCellar(whiteWine.id, { quantity: 2 });

    const res = await api.get<{ by_color: { label: string; count: number }[] }>("/api/stats");
    expect(res.status).toBe(200);
    const red = res.body.by_color.find((c) => c.label === "red");
    const white = res.body.by_color.find((c) => c.label === "white");
    expect(red?.count).toBe(4);
    expect(white?.count).toBe(2);
  });

  it("top_rated contains wine with avg_rating after tasting", async () => {
    const wine = await createWine({ name: "Top Wine" });
    await createTasting(wine.id, { rating: 5 });

    const res = await api.get<{ top_rated: { name: string; avg_rating: number }[] }>("/api/stats");
    expect(res.status).toBe(200);
    const found = res.body.top_rated.find((w) => w.name === "Top Wine");
    expect(found).toBeDefined();
    expect(found?.avg_rating).toBe(5);
  });

  it("rating_distribution reflects created tastings", async () => {
    const wine = await createWine();
    await createTasting(wine.id, { rating: 4 });
    await createTasting(wine.id, { rating: 4 });
    await createTasting(wine.id, { rating: 5 });

    const res = await api.get<{ rating_distribution: { rating: number; count: number }[] }>(
      "/api/stats"
    );
    expect(res.status).toBe(200);
    const fourStar = res.body.rating_distribution.find((r) => r.rating === 4);
    const fiveStar = res.body.rating_distribution.find((r) => r.rating === 5);
    expect(fourStar?.count).toBe(2);
    expect(fiveStar?.count).toBe(1);
  });
});
