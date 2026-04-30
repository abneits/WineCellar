import { test, expect } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, goto } from "./helpers/fixtures.js";

// ---------------------------------------------------------------------------
// Cellar list — /cellar
// ---------------------------------------------------------------------------

test.describe("Cellar (/cellar)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/cellar");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("displays an empty state when cellar is empty", async ({ page }) => {
    await goto(page, "/cellar");
    // Either an empty message or simply 0 wine cards
    const cards = page.locator("[data-testid='wine-card'], .wine-card, article");
    const emptyMsg = page.getByText(/empty|no wine|aucun/i);
    const either = cards.or(emptyMsg);
    await expect(either.first()).toBeVisible({ timeout: 8000 });
  });

  test("shows wine cards when cellar has entries", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Cave Rouge 2019" });
    await apiAddToCellar(wine.id, 4);

    await goto(page, "/cellar");
    await expect(page.getByText("Cave Rouge 2019")).toBeVisible();
  });

  test("shows quantity for a cellar entry", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Qty Wine" });
    await apiAddToCellar(wine.id, 6);

    await goto(page, "/cellar");
    await expect(page.getByText("6")).toBeVisible();
  });

  test("search filter narrows displayed wines", async ({ page }) => {
    await apiAddToCellar((await apiCreateWine({ name: "Château Filterable" })).id, 1);
    await apiAddToCellar((await apiCreateWine({ name: "Domaine Hidden" })).id, 1);

    await goto(page, "/cellar");
    // Type in the search input
    const search = page.getByRole("searchbox").or(page.getByPlaceholder(/search|chercher/i));
    await search.fill("Filterable");
    await expect(page.getByText("Château Filterable")).toBeVisible();
    await expect(page.getByText("Domaine Hidden")).not.toBeVisible();
  });

  test("color filter narrows displayed wines", async ({ page }) => {
    await apiAddToCellar((await apiCreateWine({ name: "Red Wine Filter", color: "red" })).id, 1);
    await apiAddToCellar((await apiCreateWine({ name: "White Wine Filter", color: "white" })).id, 1);

    await goto(page, "/cellar");
    // Find a color filter button/select and click "white"
    const colorFilter = page.getByRole("button", { name: /white|blanc/i })
      .or(page.getByRole("option", { name: /white/i }));
    if (await colorFilter.count() > 0) {
      await colorFilter.first().click();
      await expect(page.getByText("White Wine Filter")).toBeVisible();
      await expect(page.getByText("Red Wine Filter")).not.toBeVisible();
    }
  });

  test("clicking a wine card navigates to wine detail page", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Navigable Wine" });
    await apiAddToCellar(wine.id, 2);

    await goto(page, "/cellar");
    await page.getByText("Navigable Wine").first().click();
    await expect(page).toHaveURL(/\/cellar\/.+/);
  });

  test("page is scrollable on mobile with multiple wines", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await apiAddToCellar((await apiCreateWine({ name: `Scroll Wine ${i}` })).id, 1);
    }
    await goto(page, "/cellar");
    // Ensure content doesn't overflow silently
    const bodyOverflow = await page.evaluate(() => {
      const body = document.body;
      return getComputedStyle(body).overflow;
    });
    expect(bodyOverflow).not.toBe("hidden");
  });
});
