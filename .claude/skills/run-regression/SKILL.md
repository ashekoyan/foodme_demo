---
name: run-regression
description: Run the full FoodMe regression locally (Postgres, Spring Boot backend, Playwright for storefront and back office) and report pass/fail with known pre-existing failures separated out. Use when asked to run tests, check for regressions, or verify a change end to end.
---

# Run regression (local, Windows / PowerShell)

Never point this at the Render URL (see `.claude/rules/production-safety.md`). Everything below runs on localhost.

## 0. Preconditions (check, don't assume)
- Refresh PATH first in each PowerShell call, newly installed tools are invisible otherwise:
  `$env:Path=[Environment]::GetEnvironmentVariable('Path','Machine')+';'+[Environment]::GetEnvironmentVariable('Path','User')`
- Needed: Node (npm), JDK 17, PostgreSQL 16 service `postgresql-x64-16` running, DB `foodme` owned by user `foodme` / password `foodme`.
  Check DB: `$env:PGPASSWORD='foodme'; & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U foodme -h localhost -d foodme -tc "select 1"`.
  If missing, stop and tell the user what to install; do not guess passwords.

## 1. Backend on :8081
1. If `http://localhost:8081/actuator/health` already returns `{"status":"UP"}`, reuse it.
2. Otherwise start it in the background from `apps/backend` with `gradlew.bat bootRun` (`Start-Process ... -WindowStyle Hidden -RedirectStandardOutput <log>`), then poll `/actuator/health` every 5 s (up to ~4 min; first start runs Flyway migrations and seeds images).
3. If `gradlew.bat` fails with `ClassNotFoundException: GradleWrapperMain`: `gradle/wrapper/gradle-wrapper.jar` is gitignored (`*.jar`). Generate it with a local Gradle 8.6 (`gradle wrapper --gradle-version 8.6`), then `git checkout -- apps/backend/gradlew apps/backend/gradle/wrapper/gradle-wrapper.properties` so the tracked files stay unchanged.

## 2. Frontend dependencies (once per clone)
Each app pins its own Playwright version, so install the browser **in both**:
```
cd apps/web   ; npm ci ; npx playwright install chromium
cd apps/admin ; npm ci ; npx playwright install chromium
```

## 3. Run the suites
Playwright starts its own Vite dev server (web :5180, admin :5174); the backend must already be up.
```
cd apps/web   ; npx playwright test --reporter=list
cd apps/admin ; npx playwright test --reporter=list
```
Admin runs serially (`fullyParallel: false`). Seeded admin login is `admin` / `admin123`. For a flake check add `--repeat-each=3` to the specs you changed.

- The configs use the `html` reporter, which prints nothing you can count. Use `--reporter=list` to read, or `--reporter=json` with `$env:PLAYWRIGHT_JSON_OUTPUT_NAME='<file>.json'` when you need numbers (`stats.expected / unexpected / flaky`). When parsing the JSON in PowerShell, walk `suites` with an explicit stack, not recursion (recursion overflowed).
- Typical timings: web ≈ 105–117 s, admin ≈ 35–53 s, backend cold start ≈ 25 s when Gradle is warm. If a suite takes more than ~3× that, suspect the machine or the backend, not the tests.
- Each run registers users and orders in the local DB, so it grows; no cleanup needed locally.

Optional gates: `npm run lint` in both apps; backend unit/controller tests: `gradlew.bat test` (H2, no Postgres needed).

## 4. Report
Give a table per suite: passed / failed / total, then each failure with test name, the error line, and which bucket it falls in.

**Known deterministic failure** (10/10 runs, exists before any change; web 27/28):
- `apps/web/e2e/happy-path.spec.ts:117` "admin can login and list orders after a storefront checkout" — opens the admin login on the web dev server (:5180), where it does not exist.

**Known flaky** (observed rate over 10 consecutive runs):
- `apps/admin/e2e/admin-flows.spec.ts:60` "dishes list loads and opens edit" — 3/10. Click on the first row does not navigate (`Expected /#/dishes/\d+, received /#/dishes`).
- `apps/admin/e2e/admin-access.spec.ts:21` "logout returns to login…" — 1/10, 30 s timeout during a slow run (cause not proven).
- `apps/web/e2e/happy-path.spec.ts:45` "dish modal additions raise cart line price" — failed once on a cold first run, 0/10 afterwards.

**Rule for judging a failure:** a test not on these lists is a candidate regression. Before calling it one, re-run only that test (`npx playwright test -g "<title>"`) at least twice. Fails every time = regression: reproduce it and file it per `.claude/rules/bug-report.md`. Passes on re-run = flake: report it with its observed rate, don't hide it. Never edit or skip a listed test to get green.

## 5. Clean up
Stop the backend only if this run started it (find the java process listening on 8081). Leave `test-results/` and `playwright-report/` uncommitted.
