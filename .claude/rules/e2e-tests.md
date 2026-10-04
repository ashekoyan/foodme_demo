---
paths:
  - "apps/web/e2e/**"
  - "apps/admin/e2e/**"
---

# Playwright test rules

Based on real flakes in this repo (`flake-dish-modal.spec.ts` FM-FLAKE-01, `flake-cart-persistence.spec.ts` FM-FLAKE-05).

- **No fixed waits.** Never use `page.waitForTimeout()` or `sleep`. The backend adds a random 200–1500 ms delay to every `/api/**` call (`SimulatedLatencyConfig`), so any fixed number is wrong either too often or too slowly. Wait for an observable condition instead: `await expect(locator).toBeVisible()`, `toHaveCount(n)`, `toHaveURL(...)`, or `page.waitForResponse(...)`.
- **Assert the state before the next action.** Wait for the UI to reflect the previous step before reloading or navigating (the FM-FLAKE-05 fix: wait for `.cic_root` count, *then* `page.reload()`).
- **Selector priority:** `getByRole` (with `name`) > `getByLabel` > `getByText` > a stable class the app already uses (`a.cc_card`, `button.dc_card`, `aside.uc-panel`, `.cic_root`). Forms are addressed as `getByRole("form", { name })`, then fields by label.
- **Never** select by position in the DOM tree, generated/utility classes (`.text-amber-500`, `.tabular-nums`, Tailwind/MUI-generated names), or text that is data (dish/chef names from the seed can change). `.first()`/`.nth()` on a list of cards is acceptable only when the test does not depend on *which* item it gets.
- **Isolated data.** Each test creates its own user with a unique email (`e2e-<timestamp>-<random>@example.com`, see `e2e/auth.ts`); never reuse or depend on another test's account or order. Tests must pass in any order and in parallel (`fullyParallel: true`).
- Don't "fix" a flaky test with `retries`, `test.slow()` or `test.skip`. Find the missing wait condition. If a test fails because the app is wrong, it is a bug — report it (see `bug-report.md`), don't weaken the assertion.
- Web specs need the backend on `:8081`; they run against the Vite dev server on port 5180.
