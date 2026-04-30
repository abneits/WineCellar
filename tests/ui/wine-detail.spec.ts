import { test, expect, beforeEach } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, truncateAll, goto } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

test.describe("Wine detail (/cellar/:id)", () => {
  test("displays wine name and producer", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Detail Wine", producer: "Detail Producer" });
    await apiAddToCellar(wine.id, 2);

    await goto(page, `/cellar/${wine.id}`);
    await expect(page.getByText("Detail Wine")).toBeVisible();
    await expect(page.getByText("Detail Producer")).toBeVisible();
  });

  test("displays vintage when set", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Vintage Wine", vintage: 2015 });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    await expect(page.getByText("2015")).toBeVisible();
  });

  test("displays wine color", async ({ page }) => {
    const wine = await apiCreateWine({ color: "white", name: "White Detail" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    // Color appears in the subtitle "white · Bordeaux · Bordeaux, France" — use a more specific locator
    await expect(page.locator("p").filter({ hasText: /white.*bordeaux/i }).first()).toBeVisible();
  });

  test("displays region and country", async ({ page }) => {
    const wine = await apiCreateWine({
      name: "Region Wine",
      region: "Burgundy",
      country: "France",
    });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    await expect(page.getByText("Burgundy")).toBeVisible();
    await expect(page.getByText("France")).toBeVisible();
  });

  test("displays current quantity from cellar", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Qty Detail Wine" });
    await apiAddToCellar(wine.id, 7);

    await goto(page, `/cellar/${wine.id}`);
    await expect(page.getByText("7")).toBeVisible();
  });

  test("dynamic route works — real ID in URL is resolved correctly", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Dynamic Route Wine" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    await expect(page.getByText("__placeholder__")).not.toBeVisible();
    await expect(page.getByText("Dynamic Route Wine")).toBeVisible();
  });

  test("consume button is visible", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Consume Wine" });
    await apiAddToCellar(wine.id, 3);

    await goto(page, `/cellar/${wine.id}`);
    // The button is labeled "Open a Bottle" in the UI
    const consumeBtn = page.getByRole("button", { name: /open a bottle|consume|drink/i });
    await expect(consumeBtn).toBeVisible();
  });

  test("consuming a bottle decrements the displayed quantity", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Consume Qty Wine" });
    await apiAddToCellar(wine.id, 4);

    await goto(page, `/cellar/${wine.id}`);
    const consumeBtn = page.getByRole("button", { name: /open a bottle|consume|drink/i });
    await consumeBtn.click();

    // Dialog: fill occasion field if present
    const occasionInput = page.getByRole("textbox", { name: /occasion/i })
      .or(page.getByPlaceholder(/occasion|dinner/i));
    if (await occasionInput.count() > 0) {
      await occasionInput.fill("UI test dinner");
    }
    // Confirm button in dialog is "Open" or "Opening…"
    const confirmBtn = page.getByRole("button", { name: /^open$|^opening/i });
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    }

    // After consuming 1 bottle from 4 → 3 remain
    await expect(page.getByText("3")).toBeVisible({ timeout: 8000 });
  });

  test("delete button is visible", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Delete Wine" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    // The button is labeled "Delete wine" in the UI
    const deleteBtn = page.getByRole("button", { name: /delete wine/i });
    await expect(deleteBtn).toBeVisible();
  });

  test("deleting navigates back to /cellar", async ({ page }) => {
    const wine = await apiCreateWine({ name: "To Delete Wine" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    const deleteBtn = page.getByRole("button", { name: /delete wine/i });
    await deleteBtn.click();

    // The app uses window.confirm() — Playwright auto-accepts it by default
    // Wait for navigation to /cellar (list page)
    await expect(page).toHaveURL(/\/cellar$/, { timeout: 10_000 });
  });

  test("needs_review wine shows validation form", async ({ page, request }) => {
    const scanRes = await request.post("/api/wines/scan", {
      multipart: {
        image: {
          name: "scan.jpg",
          mimeType: "image/jpeg",
          buffer: Buffer.from(
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4n",
            "base64"
          ),
        },
      },
    });
    const { id } = await scanRes.json() as { id: string };

    await request.put(`/api/wines/${id}/recognition`, {
      data: {
        name: "Review Wine",
        producer: "Review Producer",
        vintage: 2018,
        appellation: "Bordeaux",
        region: "Bordeaux",
        country: "France",
        color: "red",
        grape_varieties: ["Merlot"],
        ai_confidence: 0.5,
        description: "Low confidence",
      },
    });

    await goto(page, `/cellar/${id}`);
    const form = page.locator("form");
    await expect(form.first()).toBeVisible({ timeout: 8000 });
  });

  test("page is accessible on mobile viewport", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Mobile Detail Wine" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
