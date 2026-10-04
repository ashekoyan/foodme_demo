# Bug report format

Use this whenever you report, document or fix a defect (Jira ticket text, PR description, commit message, chat summary).

## IDs
Defects are tracked as `FM-BUG-NN` (Jira). Some seeded bugs are marked in code with `// FM-BUG-NN`; flaky tests use `FM-FLAKE-NN`. Always cite the ID if one exists. Don't invent a new number — leave the ID as `TBD` and say so.

## Structure

```
Title: <component> — <what is wrong> (one line, no "bug:" prefix)
ID: FM-BUG-NN | TBD
Environment: local (docker/bootRun) | Render https://foodme-ashekoyan.onrender.com ; app commit <short sha>; browser
Severity: Blocker / Major / Minor / Cosmetic — one line of justification

Steps to reproduce:
1. numbered, starting from a known state (URL, account, cart contents)
2. ...

Expected: <what the product should do>
Actual: <what it does instead, with exact values: "quantity 2 -> item removed", not "cart is broken">

Evidence: failing test name / request+response / console or GlitchTip error / screenshot
Suspected area: file:line (only if verified by reading code; say "unverified" otherwise)
```

## Rules
- Reproduce before reporting. If you could not reproduce, say so and state how many attempts.
- Expected vs Actual are separate, concrete and measurable. One bug per report.
- Fix commits end the subject with the ID, matching history: `Fix cart decrement removing item one step early (FM-BUG-07)`. The body says what was wrong and the invariant restored; keep the diff minimal and add or run a test that fails without the fix.
- Behaviours that are intentional demo features (random API latency, `FlakyHeartbeatJob`/`flakyHeartbeat` errors, `/api/debug/boom`) are not bugs. Mention them as "expected demo behaviour" instead.
