# AGENTS.md

This file explains to any AI coding agent (Claude Code, Codex, Cursor, Copilot, etc.) how to work in this repository: what the project is, how to build, run and test it, how it is structured, and which project rules to follow. It is tool-neutral; tool-specific notes are marked as such.

## What this is

FoodMe is a demo food-ordering product used as a QA/DevOps course workshop. It is deliberately seeded with demo behaviours (simulated latency, a flaky heartbeat job, a `/api/debug/boom` endpoint, FM-BUG-xx style bugs in git history) so that error tracking and monitoring have something to observe. Treat those as intentional unless asked to remove them.

Monorepo under `apps/`:

- `apps/backend` — Spring Boot 3.3 / Java 17 / Gradle, Postgres + Flyway, JWT auth, port 8081 (`$PORT` on Render)
- `apps/web` — customer storefront: React 19, Vite, TypeScript, Tailwind 4, TanStack Query, react-hook-form + zod, i18next, Dexie (local cart storage)
- `apps/admin` — back office: React 18, react-admin + MUI, plain JS/JSX
- `infra/monitoring` — one container running Prometheus + Loki + Grafana + Grafana MCP behind nginx (deployed via `render-monitoring.yaml`)

## Live deployment (Render)

Base URL: https://foodme-ashekoyan.onrender.com (service `foodme-ashekoyan`, free plan — sleeps after ~15 min idle, first request can take 1–3 min)

- Storefront: `/`
- Admin back office: `/backoffice`
- Health: `/actuator/health`; Swagger: `/swagger-ui.html`

## Project rules and skills

Read the relevant file before working in that area:

- `.agents/rules/production-safety.md` — never delete/modify data on the Render deployment; read-only by default.
- `.agents/rules/e2e-tests.md` — Playwright conventions (no fixed waits, stable selectors, isolated data).
- `.agents/rules/bug-report.md` — bug report format and `FM-BUG-NN` / commit conventions.
- `.agents/rules/backend-migrations.md` — Flyway/H2 schema rules for the backend.
- `.agents/skills/` — task playbooks (`run-regression`, `reproduce-bug`, `check-prod-health`), each a `SKILL.md`.

`.agents/rules` and `.agents/skills` are symlinks to `.claude/rules` and `.claude/skills` (single source of truth; Claude Code reads `.claude/`, other agents read `.agents/`). Edit files through either path. On Windows, cloning needs Developer Mode and `git config core.symlinks true`.

## Commands

Backend (run from `apps/backend`; use `gradlew.bat` on Windows PowerShell):

```bash
./gradlew build                                   # compile + tests (what CI runs)
./gradlew test                                    # tests only (H2 in-memory, no Postgres needed)
./gradlew test --tests am.foodme.backend.OrderControllerTest            # one class
./gradlew test --tests am.foodme.backend.OrderControllerTest.someMethod # one method
./gradlew bootRun                                 # needs Postgres (DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD, defaults localhost:5432/foodme, foodme/foodme)
```

Frontends (run from `apps/web` or `apps/admin`; both use `npm ci`):

```bash
npm run dev          # Vite dev server
npm run build        # web: tsc -b && vite build; admin: vite build
npm run lint         # web uses oxlint; admin uses eslint
npm run test:e2e     # Playwright
npx playwright test e2e/happy-path.spec.ts   # one spec (web)
```

- Web's Playwright config starts its own dev server on port **5180** and the specs need a **running backend on :8081**. `npm run test:e2e:all` in `apps/web` also runs admin's suite.
- Web's API client defaults to the backend on :8081 in dev; `VITE_API_BASE_URL` overrides.
- CI (`.github/workflows/ci.yml`) runs backend build, web/admin lint+build, Playwright e2e, and Docker image builds. The e2e job references `infra/docker-compose.yml` with a `core` profile, which is **not present in this repo** — don't assume compose works locally.
- API docs: Swagger UI at `/swagger-ui.html` on the backend; health at `/actuator/health`, metrics at `/actuator/prometheus`.

## Architecture

**Single-origin deployment.** The root `apps/backend/Dockerfile` (build context = repo root, see `render.yaml`) builds both SPAs and copies them into the Spring Boot jar's `static/` (storefront at `/`, admin at `/backoffice`). `SpaWebConfig` serves them and falls back to the right `index.html` for extensionless client-side routes. Admin lives at `/backoffice` because `/admin/**` is the JWT-protected admin REST API. Consequently no CORS/URL config is needed in production; `VITE_SENTRY_DSN_WEB` / `VITE_SENTRY_DSN_ADMIN` are build args baked into the bundles. `apps/web` and `apps/admin` also have their own Dockerfiles/`vercel.json` for standalone hosting.

**Backend layout** (`am.foodme.backend`): `controller/api` (public + customer endpoints, incl. `DebugController`), `controller/admin` (admin endpoints), `service`, `repository`, `model`, `dto`, `security` (JWT filter/service, `SecurityConfig`), `exceptionHandler`, `observability`, `config`. Notable pieces:
- `SimulatedLatencyConfig` adds a random 200–1500 ms delay to `/api/**` and `/admin/**` (except images). Tests zero it out.
- `HttpLoggingFilter` logs request/response bodies for `/api` and `/admin` (toggle `HTTP_LOGGING_ENABLED`).
- `FlakyHeartbeatJob` (backend) and `flakyHeartbeat` (web/admin `src/lib`) deliberately emit occasional errors to Sentry/GlitchTip.
- `DatabaseUrlEnvironmentPostProcessor` converts a `postgresql://…` `DATABASE_URL` (Render/Neon) into a JDBC config.
- Images are stored in Postgres (`foodme.image`), seeded from `resources/img-seed` by `ImageSeedRunner`, served at `/api/images/**`.
- All tables live in the `foodme` schema. Hibernate is `ddl-auto=validate`, so **schema changes require a new Flyway migration** in `src/main/resources/db/migration` (currently V1–V3).

**Tests.** Backend tests are controller-level Spring tests using the `test` profile (`application-test.properties`: H2 in PostgreSQL mode, Flyway disabled, schema from Hibernate, seed data from `src/test/resources/data.sql`). New tables/columns therefore need to work in both Flyway SQL and the H2 `create-drop` schema.

**Observability.** Backend ships metrics (Micrometer/Prometheus), JSON logs to Loki (only when `LOKI_PUSH_URL` is set, via a logback `<if>` needing janino), and errors to Sentry-compatible GlitchTip (`SENTRY_DSN`). The monitoring service scrapes the backend using `BACKEND_HOST`.

**Deploy.** `render.yaml` (app + free Postgres, `autoDeploy: true`) and `render-monitoring.yaml` (`autoDeploy` off on purpose — redeploying wipes data on the free plan) are separate blueprints. The backend JVM flags in the Dockerfile are tuned for Render's 512 MB / 0.1 CPU free instance. `.github/workflows/keepalive.yml` is manual-only. The root `README.md` is a non-technical student deploy guide; `infra/monitoring/README.md` has the Grafana MCP details.
