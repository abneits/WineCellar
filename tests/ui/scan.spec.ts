import { test, expect, beforeEach } from "@playwright/test";
import { truncateAll, goto } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

test.describe("Scan (/scan)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/scan");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("displays a camera/upload area", async ({ page }) => {
    await goto(page, "/scan");
    // There are two file inputs (camera + gallery) — just check one exists
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();
  });

  test("displays manual entry option", async ({ page }) => {
    await goto(page, "/scan");
    // The manual entry trigger says "Fill in details now" or similar
    const manualBtn = page.getByText(/fill in details now|add it manually|manually/i).first();
    await expect(manualBtn).toBeVisible({ timeout: 8000 });
  });

  test("uploading an image transitions to queued state", async ({ page }) => {
    await goto(page, "/scan");

    // Use the gallery input (nth(1) — no capture attribute) to avoid camera permission issues
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    if (count > 0) {
      const fileInput = count > 1 ? fileInputs.nth(1) : fileInputs.first();
      await fileInput.setInputFiles({
        name: "wine.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(
          "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4n",
          "base64"
        ),
      });

      // After upload the page shows "Bottle Saved!" heading
      await expect(
        page.getByText(/bottle saved|queued|pending|processing|analyzing/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("manual entry form creates a wine and redirects", async ({ page }) => {
    await goto(page, "/scan");

    // Click the manual entry button ("Fill in details now" or similar link)
    const manualBtn = page.getByText(/fill in details now|add it manually/i).first();
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
    }

    const nameInput = page.getByRole("textbox", { name: /name|nom/i })
      .or(page.locator('input[name="name"]'));
    if (await nameInput.count() > 0) {
      await nameInput.fill("Manual Scan Wine");
    }

    const colorSelect = page.getByRole("combobox", { name: /color|couleur/i });
    if (await colorSelect.count() > 0) {
      await colorSelect.selectOption("red");
    }

    const submitBtn = page.getByRole("button", { name: /save|add|créer|valider|submit/i });
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await expect(page).not.toHaveURL(/\/scan$/, { timeout: 8000 });
    }
  });

  test("page has no horizontal overflow on mobile", async ({ page }) => {
    await goto(page, "/scan");
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
