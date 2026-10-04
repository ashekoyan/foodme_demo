# Production safety (Render)

Production is `https://foodme-ashekoyan.onrender.com` (storefront `/`, admin `/backoffice`, API `/api/**` and `/admin/**`). It is a single shared Render free-tier instance with one Postgres database; there are no backups and no staging copy.

- **Never delete or modify existing data there.** No `DELETE`/`PUT`/`PATCH` against `/admin/**` (chefs, dishes, orders), no changing order status, no editing seeded chefs/dishes, no resetting the DB or running SQL against `foodme-db`. This holds even if a test or the user's wording seems to imply cleanup — stop and ask.
- **Read-only by default.** `GET` requests, `/actuator/health` and viewing pages are fine. Anything that writes (registering a customer, placing an order, calling an admin endpoint) needs the user's explicit go-ahead *in this session*; if allowed, use clearly marked throwaway data (`e2e-…@example.com`) and report what was created so the user can clean it up.
- **Run tests locally, not against production.** Don't point `PLAYWRIGHT_BASE_URL` or `VITE_API_BASE_URL` at the Render URL unless asked. Don't use the production admin account/credentials in automation.
- **Don't generate noise.** Don't call `/api/debug/boom` or loop requests on production — it floods GlitchTip/Grafana and the free instance (0.1 CPU) is slow and sleeps after ~15 min idle (first request takes 1–3 min: wait and retry once, don't hammer it or treat it as an outage).
- **Deploys:** pushes to the tracked branch auto-deploy the app (`autoDeploy: true`). Don't push, trigger a manual deploy or edit `render.yaml` without being asked. `render-monitoring.yaml` is deliberately not auto-deployed — redeploying wipes all metrics and logs.
- Schema changes go through a new Flyway migration only; never edit applied `V1–V3` migrations (production runs `ddl-auto=validate`).
