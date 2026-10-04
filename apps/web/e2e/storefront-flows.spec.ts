import { test, expect } from "@playwright/test";
import { createAccountAtCheckout } from "./auth";
import { addFirstDishToCart } from "./helpers";

test.describe("Storefront flows", () => {
  test("home CTA navigates to explore and header Explore chefs works", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Order now" }).first().click();
    await expect(page).toHaveURL(/\/explore/);
    await expect(page.getByRole("heading", { name: "Explore chefs", level: 1 })).toBeVisible();

    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Explore chefs" }).click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test("register from header opens orders history", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByRole("tab", { name: "Create account" }).click();
    const form = page.getByRole("form", { name: "Create account" });
    const email = `header-${Date.now()}@example.com`;
    await form.getByLabel("Full name").fill("Header User");
    await form.getByLabel("Email").fill(email);
    await form.getByLabel("Phone").fill("+37491111000");
    await form.getByLabel("Password").fill("secret123");
    await form.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole("heading", { name: "Your orders" })).toBeVisible();
    await expect(page.getByText(/No orders yet/i)).toBeVisible();
  });

  test("empty checkout shows browse message", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText(/Your cart is empty/i)).toBeVisible();
  });

  test("cart quantity increase and remove item", async ({ page }) => {
    const cart = await addFirstDishToCart(page);

    await cart.getByRole("button", { name: "Increase quantity" }).click();
    await expect(cart.locator(".fm-qty-grp p")).toHaveText("2");

    await cart.getByRole("button", { name: "Remove item" }).click();
    await expect(cart.locator(".cic_root")).toHaveCount(0);
    await expect(cart.getByText(/empty/i)).toBeVisible();
  });

  test("delivery shows address fields; takeaway hides them", async ({ page }) => {
    await addFirstDishToCart(page);
    await page.locator("aside.uc-panel").getByRole("link", { name: "Go to checkout" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await expect(page.getByRole("form", { name: "Checkout" })).toHaveCount(0);
    await createAccountAtCheckout(page);

    await page.getByRole("button", { name: "Delivery To your door" }).click();
    await expect(page.getByLabel("City")).toBeVisible();
    await expect(page.getByLabel("Street")).toBeVisible();

    await page.getByRole("button", { name: "Takeaway Pick up" }).click();
    await expect(page.getByLabel("City")).toHaveCount(0);
    await expect(page.getByLabel("Street")).toHaveCount(0);

    await page.getByRole("button", { name: "Delivery To your door" }).click();
    await expect(page.getByLabel("City")).toBeVisible();
  });

  test("payment methods are selectable visual options", async ({ page }) => {
    await addFirstDishToCart(page);
    await page.locator("aside.uc-panel").getByRole("link", { name: "Go to checkout" }).click();
    await createAccountAtCheckout(page);

    const cash = page.getByRole("radio", { name: /Cash on delivery/i });
    const bankCard = page.getByRole("radio", { name: /Bank card/i });
    const idram = page.getByRole("radio", { name: /Idram/i });

    await expect(cash).toBeChecked();
    await bankCard.click();
    await expect(bankCard).toBeChecked();
    await idram.click();
    await expect(idram).toBeChecked();
  });

  test("idram checkout still places a cash order", async ({ page }) => {
    await addFirstDishToCart(page);
    await page.locator("aside.uc-panel").getByRole("link", { name: "Go to checkout" }).click();

    await createAccountAtCheckout(page, "Idram Shopper");
    await page.getByRole("radio", { name: /Idram/i }).click();
    await page.getByRole("button", { name: "Delivery To your door" }).click();
    await page.getByRole("form", { name: "Checkout" }).getByLabel("Full name").fill("Idram Shopper");
    await page.getByRole("form", { name: "Checkout" }).getByLabel("Phone").fill("+37493333445");
    await page.getByRole("form", { name: "Checkout" }).getByLabel("Email").fill("idram@example.com");
    await page.getByLabel("City").fill("Yerevan");
    await page.getByLabel("Street").fill("Tumanyan");
    await page.getByLabel("Building").fill("10");

    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/\/orders\/success/);
    await expect(page.getByText("Order placed!")).toBeVisible();
  });

  test("full delivery checkout shows order number and track link", async ({ page }) => {
    await addFirstDishToCart(page);
    await page.locator("aside.uc-panel").getByRole("link", { name: "Go to checkout" }).click();

    await createAccountAtCheckout(page, "Casey Delivery");
    await page.getByRole("button", { name: "Delivery To your door" }).click();
    await page.getByRole("form", { name: "Checkout" }).getByLabel("Full name").fill("Casey Delivery");
    await page.getByRole("form", { name: "Checkout" }).getByLabel("Phone").fill("+37493333444");
    await page.getByRole("form", { name: "Checkout" }).getByLabel("Email").fill("casey@example.com");
    await page.getByLabel("City").fill("Yerevan");
    await page.getByLabel("Street").fill("Tumanyan");
    await page.getByLabel("Building").fill("10");
    await page.getByLabel("Apartment").fill("5");

    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page).toHaveURL(/\/orders\/success/);
    await expect(page.getByText("Order placed!")).toBeVisible();
    await expect(page.getByText(/Your order number is/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Track order" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to explore" })).toBeVisible();

    await page.getByRole("link", { name: "Track order" }).click();
    await expect(page).toHaveURL(/\/tracking\/FM-/);
    const orderNumber = page.url().match(/FM-\d+/)?.[0];
    expect(orderNumber).toBeTruthy();

    await page.getByRole("link", { name: "All orders" }).click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByText(orderNumber!)).toBeVisible();
  });

  test("chef page from home popular section", async ({ page }) => {
    await page.goto("/");
    const chefsGrid = page.locator("section:has-text('Chefs worth knowing') .grid").first();
    const card = chefsGrid.locator("a.cc_card").first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click();
    await expect(page).toHaveURL(/\/chef\/\d+/);
    await expect(page.locator("button.dc_card").first()).toBeVisible();
  });

  test("missing chef does not ask to clear another chef's cart", async ({ page }) => {
    await addFirstDishToCart(page);
    await page.goto("/chef/999999");

    await expect(page.getByText("Chef not found")).toBeVisible();
    await expect(page.getByText("Switch kitchens?")).toHaveCount(0);
  });

  test("failed order page renders recovery link", async ({ page }) => {
    await page.goto("/orders/failed");
    await expect(page.getByRole("heading", { name: "Order failed" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to explore" })).toBeVisible();
  });
});
