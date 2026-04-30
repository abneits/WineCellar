import { test, expect, beforeEach } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, truncateAll, goto } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// Stats — /stats
// ---------------------------------------------------------------------------

test.describe("Stats (/stats)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("page title or heading is visible", async ({ page }) => {
    await goto(page, "/stats");
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("displays a chart or graph element", async ({ page }) => {
    await goto(page, "/stats");
    const chart = page.locator("svg").first();
    await expect(chart).toBeAttached({ timeout: 8000 });
  });

  test("color distribution section is present", async ({ page }) => {
    // DB is clean — only this one red wine exists
    const wine = await apiCreateWine({ color: "red", name: "Stats Red" });
    await apiAddToCellar(wine.id, 3);

    await goto(page, "/stats");
    await expect(page.getByText(/red|rouge/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("region section is rendered", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page.getByText(/region|région/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("vintage section is rendered", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page.getByText(/vintage|millésime/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("consumption section is rendered", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page.getByText(/consumption|consommation/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("top rated wines section is rendered", async ({ page }) => {
    await goto(page, "/stats");
    await expect(page.getByText(/top|rated|notes/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("page has no horizontal overflow on mobile", async ({ page }) => {
    await goto(page, "/stats");
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("SVG charts are rendered after data loads", async ({ page }) => {
    // DB is clean — only this wine exists
    const wine = await apiCreateWine({ color: "white", region: "Burgundy" });
    await apiAddToCellar(wine.id, 2);

    await goto(page, "/stats");
    await page.waitForSelector("svg path, svg rect", { timeout: 10_000 });
    const chartElements = page.locator("svg path, svg rect");
    await expect(chartElements.first()).toBeVisible();
  });
});
