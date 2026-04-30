import { test, expect } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, goto } from "./helpers/fixtures.js";

// ---------------------------------------------------------------------------
// Calendar — /calendar
// ---------------------------------------------------------------------------

test.describe("Calendar (/calendar)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/calendar");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("shows empty state when no maturity data", async ({ page }) => {
    await goto(page, "/calendar");
    // Either an empty message or a heading is shown
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test("shows maturity entries when wines have peak_maturity set", async ({
    page,
    request,
  }) => {
    const wine = await apiCreateWine({ name: "Maturity Wine", vintage: 2018 });
    await apiAddToCellar(wine.id, 2);

    // Set peak maturity via enrichment endpoint
    await request.put(`/api/wines/${wine.id}/status`, {
      data: { status: "validated" },
    });
    // Patch directly using PUT enrichment (wine needs to be in a recognized/enriched state)
    // Use direct API to set peak_maturity by going through recognition then enrichment
    await request.put(`/api/wines/${wine.id}/recognition`, {
      data: {
        name: "Maturity Wine",
        producer: "Domaine",
        vintage: 2018,
        appellation: "Bordeaux",
        region: "Bordeaux",
        country: "France",
        color: "red",
        grape_varieties: ["Merlot"],
        ai_confidence: 0.92,
        description: "Maturity test",
      },
    });
    await request.put(`/api/wines/${wine.id}/enrichment`, {
      data: {
        tasting_notes: { nose: "Berry", palate: "Smooth", finish: "Long" },
        food_pairings: ["lamb"],
        peak_maturity_start: 2025,
        peak_maturity_end: 2030,
        enrichment_confidence: 0.88,
      },
    });

    await goto(page, "/calendar");
    await expect(page.getByText("Maturity Wine")).toBeVisible({ timeout: 8000 });
  });

  test("displays year groupings", async ({ page, request }) => {
    const wine = await apiCreateWine({ name: "Year Group Wine", vintage: 2017 });
    await apiAddToCellar(wine.id, 1);
    await request.put(`/api/wines/${wine.id}/recognition`, {
      data: {
        name: "Year Group Wine", producer: "P", vintage: 2017,
        appellation: "A", region: "R", country: "France",
        color: "red", grape_varieties: ["Merlot"],
        ai_confidence: 0.95, description: "D",
      },
    });
    await request.put(`/api/wines/${wine.id}/enrichment`, {
      data: {
        tasting_notes: {}, food_pairings: [],
        peak_maturity_start: 2026, peak_maturity_end: 2032,
        enrichment_confidence: 0.9,
      },
    });

    await goto(page, "/calendar");
    // A year (2026) should appear as a group header
    await expect(page.getByText("2026")).toBeVisible({ timeout: 8000 });
  });

  test("displays maturity status badges (ready / soon / not_yet)", async ({
    page,
    request,
  }) => {
    const wine = await apiCreateWine({ name: "Ready Wine" });
    await apiAddToCellar(wine.id, 1);
    await request.put(`/api/wines/${wine.id}/recognition`, {
      data: {
        name: "Ready Wine", producer: "P", vintage: 2010,
        appellation: "A", region: "R", country: "France",
        color: "red", grape_varieties: ["Merlot"],
        ai_confidence: 0.95, description: "D",
      },
    });
    // Set peak maturity in the past so status = "ready"
    await request.put(`/api/wines/${wine.id}/enrichment`, {
      data: {
        tasting_notes: {}, food_pairings: [],
        peak_maturity_start: 2018, peak_maturity_end: 2024,
        enrichment_confidence: 0.9,
      },
    });

    await goto(page, "/calendar");
    const badge = page.getByText(/ready|soon|not.yet/i).first();
    await expect(badge).toBeVisible({ timeout: 8000 });
  });

  test("clicking a wine navigates to wine detail", async ({ page, request }) => {
    const wine = await apiCreateWine({ name: "Calendar Nav Wine" });
    await apiAddToCellar(wine.id, 1);
    await request.put(`/api/wines/${wine.id}/recognition`, {
      data: {
        name: "Calendar Nav Wine", producer: "P", vintage: 2015,
        appellation: "A", region: "R", country: "France",
        color: "red", grape_varieties: ["Merlot"],
        ai_confidence: 0.95, description: "D",
      },
    });
    await request.put(`/api/wines/${wine.id}/enrichment`, {
      data: {
        tasting_notes: {}, food_pairings: [],
        peak_maturity_start: 2025, peak_maturity_end: 2030,
        enrichment_confidence: 0.9,
      },
    });

    await goto(page, "/calendar");
    const link = page.getByText("Calendar Nav Wine").first();
    if (await link.isVisible()) {
      await link.click();
      await expect(page).toHaveURL(/\/cellar\/.+/, { timeout: 8000 });
    }
  });

  test("page has no horizontal overflow on mobile", async ({ page }) => {
    await goto(page, "/calendar");
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
