import { test, expect } from "@playwright/test";

test("Saipan market homepage renders", async ({ page }) => {
  await page.goto("/m/saipan");
  await expect(page.getByRole("heading", { name: /Saipan grocery prices/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Scan a receipt/i })).toBeVisible();
});

test("scan requires authentication", async ({ page }) => {
  await page.goto("/scan");
  await expect(page).toHaveURL(/login/);
});
