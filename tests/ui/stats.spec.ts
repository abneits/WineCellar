import { test, expect, beforeEach } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, truncateAll, goto } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

test.describe("Stats (/stats)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("page title or heading is visible", async ({ page }) => {
    await goto(page, "/stats");
    // h1 is "Stats"
    await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
  });

  test("displays a chart or graph element", async ({ page }) => {
    await goto(page, "/stats");
    const chart = page.locator("svg").first();
    await expect(chart).toBeAttached({ timeout: 8000 });
  });

  test("color distribution section is present", async ({ page }) => {
    const wine = await apiCreateWine({ color: "red", name: "Stats Red" });
    await apiAddToCellar(wine.id, 3);

    await goto(page, "/stats");
    // Section heading is "By color"
    await expect(page.getByRole("heading", { name: /by color/i })).toBeVisible({ timeout: 8000 });
  });

  test("region section is rendered", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page.getByRole("heading", { name: /by region/i })).toBeVisible({ timeout: 8000 });
  });

  test("vintage section is rendered", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page.getByRole("heading", { name: /by vintage/i })).toBeVisible({ timeout: 8000 });
  });

  test("consumption section is rendered", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page.getByRole("heading", { name: /consumption/i })).toBeVisible({ timeout: 8000 });
  });

  test("top rated wines section is rendered when data exists", async ({ page, request }) => {
    // "Top rated" section is only rendered when top_rated.length > 0 — create a tasting note
    const wine = await apiCreateWine({ name: "Top Rated Wine" });
    await request.post("/api/tastings", {
      data: { wine_id: wine.id, rating: 5, comment: "Excellent" },
    });

    await goto(page, "/stats");
    await expect(page.getByRole("heading", { name: /top rated/i })).toBeVisible({ timeout: 8000 });
  });

  test("page has no horizontal overflow on mobile", async ({ page }) => {
    await goto(page, "/stats");
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("SVG charts are rendered after data loads", async ({ page }) => {
    const wine = await apiCreateWine({ color: "white", region: "Burgundy" });
    await apiAddToCellar(wine.id, 2);

    await goto(page, "/stats");
    // Wait for any SVG element to be visible (not just attached)
    const svg = page.locator("svg").first();
    await expect(svg).toBeVisible({ timeout: 10_000 });
  });
});
