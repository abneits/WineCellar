import { test, expect, beforeEach } from "@playwright/test";
import { truncateAll, goto } from "./helpers/fixtures.js";

// Minimal valid JPEG (1×1 white pixel) — same bytes as API fixtures
const VALID_JPEG = Buffer.from([
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
]);

async function uploadJpeg(page: import("@playwright/test").Page): Promise<boolean> {
  const fileInputs = page.locator('input[type="file"]');
  const count = await fileInputs.count();
  if (count === 0) return false;
  // Use gallery input (nth(1) has no capture attribute) to avoid camera permission issues
  const fileInput = count > 1 ? fileInputs.nth(1) : fileInputs.first();
  await fileInput.setInputFiles({ name: "wine.jpg", mimeType: "image/jpeg", buffer: VALID_JPEG });
  return true;
}

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
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
  });

  test("uploading an image transitions to queued state and shows manual entry option", async ({ page }) => {
    await goto(page, "/scan");

    const uploaded = await uploadJpeg(page);
    if (!uploaded) return;

    // State transitions to "queued" — "Bottle Saved!" heading appears
    await expect(page.getByText(/bottle saved/i).first()).toBeVisible({ timeout: 10_000 });

    // In queued state, "Fill in details now" link is visible
    await expect(page.getByText("Fill in details now")).toBeVisible({ timeout: 5_000 });
  });

  test("manual entry form is rendered and submit button enables when name is filled", async ({ page }) => {
    await goto(page, "/scan");

    // "Fill in details now" requires queued state — upload first
    const uploaded = await uploadJpeg(page);
    if (!uploaded) test.skip();
    await expect(page.getByText(/bottle saved/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByText("Fill in details now").click();

    // Form should be visible — verify by waiting for the submit button to appear (initially disabled)
    const submitBtn = page.getByRole("button", { name: /add to cellar/i });
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
    await expect(submitBtn).toBeDisabled();

    // Fill the wine name (only required field per WineForm logic)
    // The first input with placeholder "Château Margaux" is the name field
    const nameInput = page.getByPlaceholder("Château Margaux").first();
    await nameInput.fill("Manual Scan Wine");

    // Submit button should now be enabled
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
  });

  test("page has no horizontal overflow on mobile", async ({ page }) => {
    await goto(page, "/scan");
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
