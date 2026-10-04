import { test, expect } from "@playwright/test";
import { createAccountAtCheckout, registerCustomerViaApi } from "./auth";
import { addFirstDishToCart } from "./helpers";

const API = process.env.VITE_API_BASE_URL || "http://localhost:8081";

test.describe("Customer sign-in", () => {
  test("existing customer signs in and lands on their orders", async ({ page, request }) => {
    const { email } = await registerCustomerViaApi(request, API);

    await page.goto("/login");
    const form = page.getByRole("form", { name: "Sign in" });
    await form.getByLabel("Email").fill(email);
    await form.getByLabel("Password").fill("secret123");
    await form.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Account, E2E Customer/ }).first()).toBeVisible();
  });

  test("wrong password shows an error and stays signed out", async ({ page, request }) => {
    const { email } = await registerCustomerViaApi(request, API);

    await page.goto("/login");
    const form = page.getByRole("form", { name: "Sign in" });
    await form.getByLabel("Email").fill(email);
    await form.getByLabel("Password").fill("not-the-password");
    await form.getByRole("button", { name: "Sign in" }).click();

    await expect(form.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Checkout validation", () => {
  test("delivery order without city and street is blocked", async ({ page }) => {
    await addFirstDishToCart(page);
    await page.locator("aside.uc-panel").getByRole("link", { name: "Go to checkout" }).click();
    await createAccountAtCheckout(page);

    await page.getByRole("button", { name: "Delivery To your door" }).click();
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByText("City is required")).toBeVisible();
    await expect(page.getByText("Street is required")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
  });
});
