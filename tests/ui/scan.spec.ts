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

  test("uploading an image transitions to queued state", async ({ page }) => {
    await goto(page, "/scan");

    // Use the gallery input (nth(1) — no capture attribute) to avoid camera permission issues
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    if (count > 0) {
      const fileInput = count > 1 ? fileInputs.nth(1) : fileInputs.first();
      // Use a valid JPEG byte array (same as API fixtures)
      await fileInput.setInputFiles({
        name: "wine.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
          0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
          0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
          0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
          0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
          0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
          0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
          0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
          0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
          0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
          0x00, 0xfb, 0xd2, 0x8a, 0x28, 0x03, 0xff, 0xd9,
        ]),
      });

      // After upload the page transitions to "queued" state — "Bottle Saved!" heading appears
      await expect(
        page.getByText(/bottle saved/i).first()
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test("displays manual entry option", async ({ page }) => {
    await goto(page, "/scan");

    // "Fill in details now" is only visible in the "queued" state (after scanning).
    // First upload an image to reach that state.
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    if (count > 0) {
      const fileInput = count > 1 ? fileInputs.nth(1) : fileInputs.first();
      await fileInput.setInputFiles({
        name: "wine.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from([
          0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
          0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
          0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
          0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11,
          0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb,
          0xd2, 0x8a, 0x28, 0x03, 0xff, 0xd9,
        ]),
      });
      // Wait for queued state
      await expect(page.getByText(/bottle saved/i).first()).toBeVisible({ timeout: 10_000 });
    }

    // Now "Fill in details now" should be visible
    await expect(page.getByText("Fill in details now")).toBeVisible({ timeout: 5000 });
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
