import { test, expect } from "@playwright/test";

test("Saipan market homepage renders", async ({ page }) => {
  await page.goto("/m/saipan");
  await expect(page.getByRole("heading", { name: /What food actually costs/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Scan$/i }).first()).toBeVisible();
});

test("scan requires authentication", async ({ page }) => {
  await page.goto("/scan");
  await expect(page).toHaveURL(/login/);
});
