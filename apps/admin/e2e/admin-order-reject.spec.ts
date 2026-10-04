import { test, expect } from "@playwright/test";
import { loginAsAdmin, createOrderViaApi } from "./helpers";

test.describe("Admin order rejection", () => {
  test("rejecting needs a reason; with one the order is rejected and locked", async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);
    const order = await createOrderViaApi(request);

    await page.goto("/#/orders");
    await page.getByRole("button", { name: "Refresh" }).click();
    await page.getByText(order.number).click();
    await expect(page).toHaveURL(/#\/orders\/\d+\/show/);

    await page.getByRole("button", { name: "Mark as REJECTED" }).click();
    const dialog = page.getByRole("dialog", { name: "Reject order" });
    await expect(dialog).toBeVisible();

    // An empty reason is refused and the dialog stays open.
    await dialog.getByRole("button", { name: "Reject order" }).click();
    await expect(page.getByText("A rejection reason is required")).toBeVisible();
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Rejection reason").fill("Kitchen closed for the day");
    await dialog.getByRole("button", { name: "Reject order" }).click();

    await expect(page.getByText("Order status updated")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("REJECTED").first()).toBeVisible();
    // REJECTED is terminal: no further status actions are offered.
    await expect(page.getByRole("button", { name: /^Mark as / })).toHaveCount(0);
  });
});
