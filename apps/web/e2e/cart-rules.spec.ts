import { test, expect, type Page } from "@playwright/test";
import { addFirstDishToCart } from "./helpers";

// Starts adding the first dish of the SECOND chef while the cart holds a dish
// from the first chef, and stops at the "Switch kitchens?" prompt.
async function tryAddFromSecondChef(page: Page) {
  await page.goto("/explore");
  await page.locator("a.cc_card").nth(1).click();
  await expect(page).toHaveURL(/\/chef\/\d+/);
  await page.locator("button.dc_card").first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Switch kitchens?")).toBeVisible();
}

test.describe("Cart rules", () => {
  // FM-BUG-07: decrementing at quantity 2 must lower it to 1, not delete the item.
  test("decreasing quantity from 2 to 1 keeps the item", async ({ page }) => {
    const cart = await addFirstDishToCart(page);

    await cart.getByRole("button", { name: "Increase quantity" }).click();
    await expect(cart.locator(".fm-qty-grp p")).toHaveText("2");

    await cart.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(cart.locator(".fm-qty-grp p")).toHaveText("1");
    await expect(cart.locator(".cic_root")).toHaveCount(1);
  });

  test("decreasing quantity at the minimum removes the item", async ({ page }) => {
    const cart = await addFirstDishToCart(page);
    await expect(cart.locator(".fm-qty-grp p")).toHaveText("1");

    await cart.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(cart.locator(".cic_root")).toHaveCount(0);
    await expect(cart.getByText(/empty/i)).toBeVisible();
  });

  test("adding a dish from another chef and confirming replaces the cart", async ({ page }) => {
    await addFirstDishToCart(page);
    await tryAddFromSecondChef(page);

    await page.getByRole("button", { name: "Clear & continue" }).click();
    await expect(page.getByText("Switch kitchens?")).toHaveCount(0);
    await expect(page.locator("aside.uc-panel .cic_root")).toHaveCount(1);
  });

  test("adding a dish from another chef and cancelling keeps the old cart", async ({ page }) => {
    await addFirstDishToCart(page);
    await tryAddFromSecondChef(page);

    await page.getByRole("button", { name: "Keep cart & browse" }).click();
    await expect(page.getByText("Switch kitchens?")).toHaveCount(0);

    // The original chef's item must still be in the persisted cart.
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText(/Your cart is empty/i)).toHaveCount(0);
  });
});
