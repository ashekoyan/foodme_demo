---
name: check-prod-health
description: Read-only smoke check of the deployed FoodMe app on Render (health, storefront, back office, public API). Use when asked whether production is up or after a deploy. Never writes data.
---

# Check production health (read-only)

Base URL: `https://foodme-ashekoyan.onrender.com`. Allowed: GET requests only. Do not register users, place orders, call `/admin/**`, or hit `/api/debug/boom` (`.claude/rules/production-safety.md`).

## Steps
1. **Health** — `GET /actuator/health`, expect `{"status":"UP"}`.
   Free tier sleeps after ~15 min idle: the first request can take 1–3 min. If it times out, wait and retry **once** (use a long timeout, e.g. 180 s). Do not loop or report an outage after one cold-start timeout.
2. **Storefront** — `GET /` returns 200 and HTML.
3. **Back office** — `GET /backoffice` returns 200 and HTML (the admin REST API is `/admin/**`, not this path).
4. **Public API** — `GET /api/chef/active?page=0&size=12` returns 200 with `exploreChefResponseDtoList` non-empty. (Seed has 6 active chefs.)
5. **Swagger (optional)** — `GET /swagger-ui.html` returns 200.

PowerShell example:
```
Invoke-WebRequest https://foodme-ashekoyan.onrender.com/actuator/health -UseBasicParsing -TimeoutSec 180
```

## Report
One line per check: ✅/❌, HTTP status, response time. Mention if the first call was a cold start. On failure give status code and body, and say whether it looks like a cold start, a failed deploy (check Render logs, which you cannot see), or an app error. Don't change anything on Render yourself.
