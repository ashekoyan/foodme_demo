---
paths:
  - "apps/backend/src/main/resources/db/migration/**"
  - "apps/backend/src/main/java/am/foodme/backend/model/**"
  - "apps/backend/src/test/**"
---

# Database schema and backend tests

- **Never edit an existing migration** (`V1__init.sql`, `V2__images_in_db.sql`, `V3__more_menu_items.sql`). Production already applied them; Flyway checksums will fail startup. Add `V4__<what>.sql` instead.
- Production runs `spring.jpa.hibernate.ddl-auto=validate` and everything lives in schema `foodme`. A new `@Entity` column without a matching migration crashes the app on boot.
- Tests use a **different schema source**: profile `test` (`application-test.properties`) runs H2 in PostgreSQL mode with Flyway **off** and `ddl-auto=create-drop`, plus `src/test/resources/data.sql`. So a change has to work in two places: the Flyway SQL (Postgres) and the Hibernate-generated H2 schema. Avoid Postgres-only SQL in `data.sql`.
- Seed data additions for tests go in `src/test/resources/data.sql`; seed data for real environments goes in a new migration. Don't assume one feeds the other.
- Tests keep latency at 0 (`foodme.latency.*`) and HTTP logging off; don't re-enable them in the test profile.
- Run backend tests with `gradlew.bat test` from `apps/backend` (needs `gradle-wrapper.jar`, see the `run-regression` skill).
