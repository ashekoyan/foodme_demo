---
name: reproduce-bug
description: Reproduce a FoodMe defect (by FM-BUG-NN id or a plain description) with a failing automated test before fixing it, then write the report in the project's bug format. Use when given a bug id, a Jira ticket, or "this behaves wrong".
---

# Reproduce a bug

Goal: a **failing test that demonstrates the defect**, then a report. Do not fix first.

## 1. Locate it
- If given `FM-BUG-NN`: `grep -rn "FM-BUG-NN" apps --exclude-dir=node_modules` and `git log --all --grep "FM-BUG-NN"`. Seeded bugs are marked with `// FM-BUG-NN` comments (backend services/DTOs, admin `OrderShow.jsx`) and cart logic lives in `apps/web/src/hooks/useCart.ts`.
- If given only a description, find the owning layer first: storefront (`apps/web/src/pages|components`), back office (`apps/admin/src/pages`), or API (`apps/backend/.../service`, `controller`).
- Intentional demo behaviour is not a bug: random API latency, `FlakyHeartbeatJob` / `flakyHeartbeat` errors, `/api/debug/boom`.

## 2. Write the failing test
- UI behaviour -> Playwright spec under `apps/web/e2e` or `apps/admin/e2e`, following `.claude/rules/e2e-tests.md` (no `waitForTimeout`, role/label selectors, unique `e2e-<ts>@example.com` data). Reuse `e2e/helpers.ts` and `e2e/auth.ts`.
- API/business rule -> controller test in `apps/backend/src/test/java/am/foodme/backend/` (H2 `test` profile, seed in `src/test/resources/data.sql`).
- Put the id in the test title or a comment so it is greppable: `// FM-BUG-NN`.

## 3. Run it to prove it fails for the right reason
Use `/run-regression` setup (local backend on :8081). Run only the new spec, e.g. `npx playwright test e2e/cart-rules.spec.ts`. Run it **twice**: a bug that fails once but passes once is a flake, not a bug.
Never reproduce against the Render URL beyond read-only GETs (`.claude/rules/production-safety.md`).

## 4. Report
Use the exact format in `.claude/rules/bug-report.md` (Title, ID, Environment, Severity, Steps, Expected, Actual, Evidence, Suspected area). Cite `file:line` only if verified by reading the code.

## 5. Stop and hand back
Present the report and the failing test. Fix only if the user asks; then the fix commit subject ends with the id, e.g. `Fix <what> (FM-BUG-NN)`, and the same test must pass.
