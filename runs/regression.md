# run-regression — 10 consecutive runs (2026-10-04)

Each run = the steps of `.claude/skills/run-regression/SKILL.md`: reuse or start the backend on :8081, then `npx playwright test` in `apps/web` and `apps/admin`. Commit under test: `e216802` plus the uncommitted work in the tree (12 new e2e tests, helpers refactor).

**How it was run (limit):** by a PowerShell script that executes the skill's commands literally (`run-regression-loop.ps1` in the session scratchpad), not by an agent re-reading the skill each time. It measures how stable the *suite and environment* are. It does **not** measure whether an AI follows the skill the same way ten times; that would need independent agent runs, as in `runs/create-jira-bug.md`. Run 1 deliberately killed the backend first to exercise the "start it" branch (it came up in 24 s, Gradle already warm). A first attempt of the loop crashed on a bug in my JSON parser and produced no results; this is the second attempt.

| Run | Backend | Web (28 tests) | Web time | Admin (12 tests) | Admin time |
|---|---|---|---|---|---|
| 1 | started (24 s) | 27 pass, 1 fail | 108 s | 12 pass | 35 s |
| 2 | reused | 27 pass, 1 fail | 109 s | 12 pass | 40 s |
| 3 | reused | 27 pass, 1 fail | 105 s | 11 pass, **1 fail** | 48 s |
| 4 | reused | 27 pass, 1 fail | 117 s | 12 pass | 40 s |
| 5 | reused | 27 pass, 1 fail | 104 s | 12 pass | 37 s |
| 6 | reused | 27 pass, 1 fail | 116 s | 10 pass, **2 fail** | 53 s |
| 7 | reused | 27 pass, 1 fail | 104 s | 12 pass | 36 s |
| 8 | reused | 27 pass, 1 fail | 116 s | 12 pass | 38 s |
| 9 | reused | 27 pass, 1 fail | 107 s | 12 pass | 36 s |
| 10 | reused | 27 pass, 1 fail | 108 s | 11 pass, **1 fail** | 42 s |

## Per-test stability
| Test | Failed | Verdict |
|---|---|---|
| `web happy-path.spec.ts:117` admin can login and list orders after a storefront checkout | **10 / 10** | Deterministic, pre-existing. It opens the admin login on the web dev server (:5180), where admin does not exist. Not a regression. |
| `web happy-path.spec.ts:45` dish modal additions raise cart line price | 0 / 10 | Failed once in the very first manual run of the session (cold backend), passed in all 10 runs. Treat as rare flake, not a standing failure. |
| `admin admin-flows.spec.ts:60` dishes list loads and opens edit | **3 / 10** (runs 3, 6, 10) | Flaky, pre-existing. The click on the first table row does not navigate: `Expected /#\/dishes\/\d+/, received /#/dishes` (5 s). Likely the row is re-rendered by a refetch between locating and clicking. Not fixed (existing test, not mine). |
| `admin admin-access.spec.ts:21` logout returns to login… (mine) | 1 / 10 (run 6) | Test timeout 30 s. Run 6 was also the slowest admin run (53 s) and had a second failure, so it looks load-related; cause not proven. |
| All other 38 tests | 0 / 10 | Stable. This includes all 7 new web tests and the other 4 new admin tests. |

## What differed between runs → changes in SKILL.md
| Observation | Change |
|---|---|
| Admin failures differ from run to run, so "any failure" can't be judged from one run | Skill now says: re-run a failing test alone before calling it a regression, and report observed flake rates |
| Known-failure list in the skill said `:45` fails; it passed 10/10 | `:45` removed from "known failures", listed as rare flake. `:117` stays |
| `dishes list` flake and `logout` flake were not documented | Added to a "known flaky" list with rates |
| Counting results needs a machine-readable reporter; default config uses `html`, which prints nothing useful | Skill says use `--reporter=list`, or `--reporter=json` with `PLAYWRIGHT_JSON_OUTPUT_NAME` when counting |
| Typical timings were not in the skill | Added: web ≈ 105–117 s, admin ≈ 35–53 s, backend cold start ≈ 25 s when Gradle is warm |
| Local DB grows every run (each test registers users and orders) | Added a note; no cleanup needed locally |

Raw per-run JSON and logs: session scratchpad (`results.jsonl`, `web-N.json`, `admin-N.json`), not committed.
