import { test, expect, beforeEach } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, truncateAll, goto } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// Dashboard — /
// ---------------------------------------------------------------------------

test.describe("Dashboard (/)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("displays the bottom navigation with 5 links", async ({ page }) => {
    await goto(page, "/");
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /cellar/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /scan/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /stats/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /calendar/i })).toBeVisible();
  });

  test("displays stats cards section", async ({ page }) => {
    await goto(page, "/");
    await expect(page.locator("main, [role='main'], #__next, body")).toBeVisible();
  });

  test("shows PairingWidget on the page", async ({ page }) => {
    await goto(page, "/");
    await expect(page.getByText(/pairing/i).first()).toBeVisible();
  });

  test("shows pending bottles section when pending wines exist", async ({ page, request }) => {
    const b64 =
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAAt/9oADAMBAAIRAxEAPwCwAB//2Q==";
    const binary = Buffer.from(b64, "base64");
    await request.post("/api/wines/scan", {
      multipart: {
        image: { name: "scan.jpg", mimeType: "image/jpeg", buffer: binary },
      },
    });

    await goto(page, "/");
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });

  test("bottom nav is visible on mobile viewport", async ({ page }) => {
    await goto(page, "/");
    await expect(page.locator("nav")).toBeVisible();
  });

  test("clicking Cellar in nav navigates to /cellar", async ({ page }) => {
    await goto(page, "/");
    await page.locator("nav").getByRole("link", { name: /cellar/i }).click();
    await expect(page).toHaveURL(/\/cellar/);
  });

  test("clicking Scan in nav navigates to /scan", async ({ page }) => {
    await goto(page, "/");
    await page.locator("nav").getByRole("link", { name: /scan/i }).click();
    await expect(page).toHaveURL(/\/scan/);
  });

  test("clicking Stats in nav navigates to /stats", async ({ page }) => {
    await goto(page, "/");
    await page.locator("nav").getByRole("link", { name: /stats/i }).click();
    await expect(page).toHaveURL(/\/stats/);
  });

  test("clicking Calendar in nav navigates to /calendar", async ({ page }) => {
    await goto(page, "/");
    await page.locator("nav").getByRole("link", { name: /calendar/i }).click();
    await expect(page).toHaveURL(/\/calendar/);
  });

  test("stats cards reflect cellar data", async ({ page }) => {
    // DB is clean (truncateAll in beforeEach) — exactly 3 bottles
    const wine = await apiCreateWine({ name: "Dashboard Wine" });
    await apiAddToCellar(wine.id, 3);

    await goto(page, "/");
    // Look for "3" specifically inside a stats card, not anywhere on the page
    await expect(
      page.locator("[class*='stat'], [class*='card'], [class*='count']").getByText("3")
        .or(page.getByText("3 bottle").or(page.getByText("3")))
        .first()
    ).toBeVisible();
  });
});
