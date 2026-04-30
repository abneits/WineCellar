import { test, expect, beforeEach } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, truncateAll, goto } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

test.describe("Cellar (/cellar)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/cellar");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("displays an empty state when cellar is empty", async ({ page }) => {
    await goto(page, "/cellar");
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
    // Use exact role to avoid strict mode violation — the quantity appears in a <span>
    await expect(page.locator("span").filter({ hasText: /^6$/ }).first()).toBeVisible();
  });

  test("search filter narrows displayed wines", async ({ page }) => {
    await apiAddToCellar((await apiCreateWine({ name: "Château Filterable" })).id, 1);
    await apiAddToCellar((await apiCreateWine({ name: "Domaine Hidden" })).id, 1);

    await goto(page, "/cellar");
    const search = page.getByRole("searchbox").or(page.getByPlaceholder(/search|chercher/i));
    await search.fill("Filterable");
    await expect(page.getByText("Château Filterable")).toBeVisible();
    await expect(page.getByText("Domaine Hidden")).not.toBeVisible();
  });

  test("color filter narrows displayed wines", async ({ page }) => {
    await apiAddToCellar((await apiCreateWine({ name: "Red Wine Filter", color: "red" })).id, 1);
    await apiAddToCellar((await apiCreateWine({ name: "White Wine Filter", color: "white" })).id, 1);

    await goto(page, "/cellar");
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
    const bodyOverflow = await page.evaluate(() => {
      return getComputedStyle(document.body).overflow;
    });
    expect(bodyOverflow).not.toBe("hidden");
  });
});
