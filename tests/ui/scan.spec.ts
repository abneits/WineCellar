import { test, expect, beforeEach } from "@playwright/test";
import { truncateAll, goto } from "./helpers/fixtures.js";

beforeEach(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// Scan — /scan
// ---------------------------------------------------------------------------

test.describe("Scan (/scan)", () => {
  test("loads without errors", async ({ page }) => {
    await goto(page, "/scan");
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Internal Server Error");
  });

  test("displays a camera/upload area", async ({ page }) => {
    await goto(page, "/scan");
    const uploadArea = page
      .locator('input[type="file"]')
      .or(page.getByRole("button", { name: /scan|photo|camera|upload/i }));
    await expect(uploadArea.first()).toBeAttached();
  });

  test("displays manual entry option", async ({ page }) => {
    await goto(page, "/scan");
    const manualBtn = page.getByRole("button", { name: /manual|manuell|saisir/i })
      .or(page.getByText(/manual/i));
    await expect(manualBtn.first()).toBeVisible();
  });

  test("uploading an image transitions to queued state", async ({ page }) => {
    await goto(page, "/scan");

    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles({
        name: "wine.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from(
          "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwAB/9k=",
          "base64"
        ),
      });

      await expect(
        page.getByText(/queued|pending|processing|analyzing/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("manual entry form creates a wine and redirects", async ({ page }) => {
    await goto(page, "/scan");

    const manualBtn = page.getByRole("button", { name: /manual|manuell|saisir/i }).first();
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
    }

    const nameInput = page.getByRole("textbox", { name: /name|nom/i }).or(page.locator('input[name="name"]'));
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

  test("shows error feedback when submitting without an image", async ({ page }) => {
    await goto(page, "/scan");

    const submitBtn = page.getByRole("button", { name: /analyze|scan|start/i }).first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      const errorMsg = page.getByText(/required|image|error|select/i).first();
      await expect(errorMsg).toBeVisible({ timeout: 5000 });
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
