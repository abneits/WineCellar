import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { api } from "./helpers/client.js";
import {
  truncateAll,
  closePool,
  createWine,
  createWineWithImage,
  winePayload,
} from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closePool();
});

// ---------------------------------------------------------------------------
// GET /api/wines — list
// ---------------------------------------------------------------------------

describe("GET /api/wines", () => {
  it("returns an empty list when no wines exist", async () => {
    const res = await api.get<{ wines: unknown[]; total: number }>("/api/wines");
    expect(res.status).toBe(200);
    expect(res.body.wines).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("returns created wines", async () => {
    await createWine({ name: "Pomerol A" });
    await createWine({ name: "Pomerol B" });
    const res = await api.get<{ wines: unknown[]; total: number }>("/api/wines");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.wines).toHaveLength(2);
  });

  it("filters by color", async () => {
    await createWine({ color: "red" });
    await createWine({ color: "white" });
    const res = await api.get<{ wines: unknown[]; total: number }>("/api/wines?color=white");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect((res.body.wines[0] as { color: string }).color).toBe("white");
  });

  it("filters by country", async () => {
    await createWine({ country: "France" });
    await createWine({ country: "Italy" });
    const res = await api.get<{ wines: unknown[]; total: number }>("/api/wines?country=Italy");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it("filters by search (name ILIKE)", async () => {
    await createWine({ name: "Château Margaux" });
    await createWine({ name: "Pétrus" });
    const res = await api.get<{ wines: unknown[]; total: number }>("/api/wines?search=margaux");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect((res.body.wines[0] as { name: string }).name).toBe("Château Margaux");
  });

  it("paginates results", async () => {
    await createWine({ name: "Wine 1" });
    await createWine({ name: "Wine 2" });
    await createWine({ name: "Wine 3" });
    const res = await api.get<{ wines: unknown[]; total: number }>("/api/wines?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.wines).toHaveLength(2);
  });

  it("returns second page", async () => {
    await createWine({ name: "Wine 1" });
    await createWine({ name: "Wine 2" });
    await createWine({ name: "Wine 3" });
    const res = await api.get<{ wines: unknown[]; total: number }>("/api/wines?page=2&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.wines).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// POST /api/wines — create
// ---------------------------------------------------------------------------

describe("POST /api/wines", () => {
  it("creates a wine with status=validated", async () => {
    const res = await api.post<{ id: string; status: string }>("/api/wines", winePayload());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.status).toBe("validated");
  });

  it("returns 400 when name is missing", async () => {
    const payload = winePayload();
    delete (payload as Record<string, unknown>).name;
    const res = await api.post<{ error: string }>("/api/wines", payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 for an invalid color", async () => {
    const res = await api.post<{ error: string }>("/api/wines", winePayload({ color: "purple" }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 for an empty body", async () => {
    const res = await api.post<{ error: string }>("/api/wines", {});
    expect(res.status).toBe(400);
  });

  it("accepts all valid wine colors", async () => {
    const colors = ["red", "white", "rosé", "sparkling", "dessert", "orange", "yellow"];
    for (const color of colors) {
      const res = await api.post<{ id: string }>("/api/wines", winePayload({ color }));
      expect(res.status, `color ${color} should return 201`).toBe(201);
    }
  });

  it("creates a wine without optional fields", async () => {
    const res = await api.post<{ id: string; status: string }>("/api/wines", {
      name: "Minimal Wine",
      color: "red",
      country: "France",
      region: "Bordeaux",
      appellation: "Bordeaux",
      producer: "Domaine X",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// GET /api/wines/{id}
// ---------------------------------------------------------------------------

describe("GET /api/wines/{id}", () => {
  it("returns the wine by ID", async () => {
    const wine = await createWine({ name: "Pomerol Test" });
    const res = await api.get<{ id: string; name: string; status: string }>(`/api/wines/${wine.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(wine.id);
    expect(res.body.name).toBe("Pomerol Test");
    expect(res.body.status).toBe("validated");
  });

  it("returns 404 for an unknown ID", async () => {
    const res = await api.get<{ error: string }>("/api/wines/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 for a malformed UUID", async () => {
    const res = await api.get("/api/wines/not-a-uuid");
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/wines/{id} — update
// ---------------------------------------------------------------------------

describe("PUT /api/wines/{id}", () => {
  it("updates name and vintage", async () => {
    const wine = await createWine({ name: "Old Name", vintage: 2010 });
    const res = await api.put<{ id: string; name: string; vintage: number }>(
      `/api/wines/${wine.id}`,
      { ...winePayload({ name: "New Name", vintage: 2020 }) }
    );
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.vintage).toBe(2020);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await api.put<{ error: string }>(
      "/api/wines/00000000-0000-0000-0000-000000000000",
      winePayload()
    );
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/wines/{id}
// ---------------------------------------------------------------------------

describe("DELETE /api/wines/{id}", () => {
  it("deletes a wine", async () => {
    const wine = await createWine();
    const del = await api.delete(`/api/wines/${wine.id}`);
    expect(del.status).toBe(204);
  });

  it("returns 404 after deletion", async () => {
    const wine = await createWine();
    await api.delete(`/api/wines/${wine.id}`);
    const res = await api.get<{ error: string }>(`/api/wines/${wine.id}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown ID", async () => {
    const res = await api.delete("/api/wines/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/wines/with-image — create with image
// ---------------------------------------------------------------------------

describe("POST /api/wines/with-image", () => {
  it("creates a wine with image and status=validated", async () => {
    const wine = await createWineWithImage({ name: "Image Wine" });
    expect(wine.id).toBeTruthy();
    expect(wine.status).toBe("validated");
    expect(wine.has_image).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/wines/{id}/image
// ---------------------------------------------------------------------------

describe("GET /api/wines/{id}/image", () => {
  it("returns image bytes for a wine with image", async () => {
    const wine = await createWineWithImage();
    const res = await api.get(`/api/wines/${wine.id}/image`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\//);
  });

  it("returns thumbnail when size=thumbnail", async () => {
    const wine = await createWineWithImage();
    const res = await api.get(`/api/wines/${wine.id}/image?size=thumbnail`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/image\//);
  });

  it("returns 404 for wine without image", async () => {
    const wine = await createWine();
    const res = await api.get<{ error: string }>(`/api/wines/${wine.id}/image`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for unknown wine ID", async () => {
    const res = await api.get("/api/wines/00000000-0000-0000-0000-000000000000/image");
    expect(res.status).toBe(404);
  });
});
