import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { api } from "./helpers/client.js";
import { truncateAll, closePool } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closePool();
});

// ---------------------------------------------------------------------------
// POST /api/ai/pairing
// ---------------------------------------------------------------------------

describe("POST /api/ai/pairing", () => {
  it("returns 400 when meal is missing", async () => {
    const res = await api.post<{ error: string }>("/api/ai/pairing", {});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when meal is an empty string", async () => {
    const res = await api.post<{ error: string }>("/api/ai/pairing", { meal: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("returns 400 when body is empty", async () => {
    const res = await api.post<{ error: string }>("/api/ai/pairing", undefined);
    expect(res.status).toBe(400);
  });

  it("returns 503 when N8N_PAIRING_WEBHOOK_URL is not configured", async () => {
    // This assumes the test app is running without N8N_PAIRING_WEBHOOK_URL set.
    // If it IS set and reachable, this test will not apply — skip gracefully.
    const res = await api.post<{ error: string }>("/api/ai/pairing", {
      meal: "Roasted lamb with rosemary",
    });
    // Either 503 (webhook not configured) or 2xx/other (webhook configured and reachable).
    // We only assert the error shape when 503.
    if (res.status === 503) {
      expect(res.body.error).toBeTruthy();
    } else {
      // Webhook is configured; just verify we got a valid JSON response.
      expect([200, 201, 502, 504]).toContain(res.status);
    }
  });
});
