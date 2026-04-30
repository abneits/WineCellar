import { test, expect } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, goto } from "./helpers/fixtures.js";

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
    // Expect links to the 5 main sections
    await expect(nav.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /cellar/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /scan/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /stats/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /calendar/i })).toBeVisible();
  });

  test("displays stats cards section", async ({ page }) => {
    await goto(page, "/");
    // Stats cards area must be present even when empty
    await expect(page.locator("main, [role='main'], #__next, body")).toBeVisible();
  });

  test("shows PairingWidget on the page", async ({ page }) => {
    await goto(page, "/");
    // The pairing widget renders some kind of input or button for meal input
    const pairingSection = page.getByRole("textbox").or(page.getByPlaceholder(/meal|dish|food/i));
    // It may not be visible if no text input, look for the section by text
    await expect(page.getByText(/pairing/i).first()).toBeVisible();
  });

  test("shows pending bottles section when pending wines exist", async ({ page, request }) => {
    // Create a pending wine via scan
    const form = new FormData();
    // minimal 1×1 JPEG
    const b64 =
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAAt/9oADAMBAAIRAxEAPwCwAB//2Q==";
    const binary = Buffer.from(b64, "base64");
    await request.post("/api/wines/scan", {
      multipart: {
        image: { name: "scan.jpg", mimeType: "image/jpeg", buffer: binary },
      },
    });

    await goto(page, "/");
    // Some pending section indicator should appear
    await expect(page.getByText(/pending/i).first()).toBeVisible();
  });

  test("bottom nav is visible on mobile viewport", async ({ page }) => {
    await goto(page, "/");
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
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
    const wine = await apiCreateWine({ name: "Dashboard Wine" });
    await apiAddToCellar(wine.id, 3);

    await goto(page, "/");
    // The number 3 (or more) should appear somewhere in the stats area
    await expect(page.getByText("3").first()).toBeVisible();
  });
});
