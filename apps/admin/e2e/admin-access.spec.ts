import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Admin access control", () => {
  test("unauthenticated visit to a protected page redirects to login", async ({ page }) => {
    await page.goto("/#/orders");
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole("heading", { name: "FoodMe Admin" })).toBeVisible();
  });

  test("an invalid or expired token sends the admin back to login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.evaluate(() => localStorage.setItem("token", "expired.invalid.token"));

    await page.goto("/#/orders");
    await page.reload();
    await expect(page).toHaveURL(/#\/login/);
    await expect(page.getByRole("heading", { name: "FoodMe Admin" })).toBeVisible();
  });

  test("logout returns to login and protected pages are blocked again", async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole("button", { name: /profile/i }).click();
    await page.getByRole("menuitem", { name: /logout/i }).click();
    await expect(page).toHaveURL(/#\/login/);

    await page.goto("/#/orders");
    await expect(page).toHaveURL(/#\/login/);
  });

  test("dashboard shows the summary cards", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/#/");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    for (const label of ["Total orders", "Recent revenue", "Chefs", "Dishes"]) {
      await expect(page.locator("#main-content").getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator("#main-content").getByRole("heading", { name: "Recent orders" })).toBeVisible();
  });
});
