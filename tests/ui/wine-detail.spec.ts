import { test, expect } from "@playwright/test";
import { apiCreateWine, apiAddToCellar, goto } from "./helpers/fixtures.js";

// ---------------------------------------------------------------------------
// Wine detail — /cellar/:id
// ---------------------------------------------------------------------------

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
    await expect(page.getByText(/white/i)).toBeVisible();
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
    // The page must NOT show __placeholder__ and must show the wine name
    await expect(page.getByText("__placeholder__")).not.toBeVisible();
    await expect(page.getByText("Dynamic Route Wine")).toBeVisible();
  });

  test("consume button is visible", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Consume Wine" });
    await apiAddToCellar(wine.id, 3);

    await goto(page, `/cellar/${wine.id}`);
    const consumeBtn = page.getByRole("button", { name: /consume|drink|ouvrir/i });
    await expect(consumeBtn).toBeVisible();
  });

  test("consuming a bottle decrements the displayed quantity", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Consume Qty Wine" });
    await apiAddToCellar(wine.id, 4);

    await goto(page, `/cellar/${wine.id}`);
    const consumeBtn = page.getByRole("button", { name: /consume|drink|ouvrir/i });
    await consumeBtn.click();

    // Fill occasion field if present and confirm
    const occasionInput = page.getByRole("textbox", { name: /occasion/i })
      .or(page.getByPlaceholder(/occasion/i));
    if (await occasionInput.count() > 0) {
      await occasionInput.fill("UI test dinner");
    }
    const confirmBtn = page.getByRole("button", { name: /confirm|valider|ok/i });
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    }

    // After consuming: quantity should be 3
    await expect(page.getByText("3")).toBeVisible({ timeout: 8000 });
  });

  test("delete button is visible", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Delete Wine" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    const deleteBtn = page.getByRole("button", { name: /delete|supprimer/i });
    await expect(deleteBtn).toBeVisible();
  });

  test("deleting navigates back to /cellar", async ({ page }) => {
    const wine = await apiCreateWine({ name: "To Delete Wine" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    const deleteBtn = page.getByRole("button", { name: /delete|supprimer/i });
    await deleteBtn.click();

    // Confirm deletion if a dialog appears
    const confirmBtn = page.getByRole("button", { name: /confirm|yes|oui|valider/i });
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    }
    await expect(page).toHaveURL(/\/cellar$/, { timeout: 8000 });
  });

  test("needs_review wine shows validation form", async ({ page, request }) => {
    // Scan a wine then push to needs_review
    const form = new FormData();
    const b64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQ==";
    const binary = Buffer.from(b64, "base64");
    const scanRes = await request.post("/api/wines/scan", {
      multipart: {
        image: { name: "scan.jpg", mimeType: "image/jpeg", buffer: binary },
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
    // The validation form should be visible
    const form2 = page.getByRole("form").or(page.locator("form"));
    await expect(form2.first()).toBeVisible({ timeout: 8000 });
  });

  test("page is accessible on mobile viewport", async ({ page }) => {
    const wine = await apiCreateWine({ name: "Mobile Detail Wine" });
    await apiAddToCellar(wine.id, 1);

    await goto(page, `/cellar/${wine.id}`);
    // No horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
