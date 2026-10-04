import { expect, type Page } from "@playwright/test";

export async function addFirstDishToCart(page: Page) {
  await page.goto("/explore");
  await page.locator("a.cc_card").first().click();
  await expect(page).toHaveURL(/\/chef\/\d+/);
  await page.locator("button.dc_card").first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  const cart = page.locator("aside.uc-panel");
  await expect(cart.locator(".cic_root")).toHaveCount(1);
  return cart;
}
