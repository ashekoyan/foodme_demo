# create-jira-bug — 10 runs on sandbox ticket FM-3

Input (identical every run): synthetic bug `FM-BUG-99`, Checkout, "order total omits the delivery fee when Idram is selected", local build, commit `e216802`. Target: sandbox ticket [FM-3](https://aregshekoyan.atlassian.net/browse/FM-3). Real bug filed by hand first: [FM-2](https://aregshekoyan.atlassian.net/browse/FM-2) (FM-BUG-02).

Runs 1–3 were done by the main session (same context, so they are not independent). Runs 4–10 were seven independent subagents that saw only `SKILL.md`; they ran **in parallel**.

| Run | Who | Priority | Labels | Summary wording | Notes |
|---|---|---|---|---|---|
| 1 | main | Low → Medium | FM-BUG-99, checkout, sandbox | "ignores the delivery fee when payment is Idram (TEST)" | Run 1a put bug text in a comment and set priority Low while text said Medium: fields and text disagreed |
| 2 | main | Medium | + sandbox | same as 1 | duplicate search now matched FM-3 itself, skill said "do not create" |
| 3 | main | Medium | + sandbox | same as 1 | identical to run 2 |
| 4 | agent | High | FM-BUG-99, checkout | "omits the delivery fee when payment method is Idram" | Evidence = marker only |
| 5 | agent | High | FM-BUG-99, checkout | "excludes the delivery fee when payment method is Idram" | **write lost** (overwritten within ~300 ms) |
| 6 | agent | High | FM-BUG-99, checkout | "omits the delivery fee when payment method is Idram" | Evidence line + marker |
| 7 | agent | High | FM-BUG-99, checkout | "omits the delivery fee when Idram is selected" | **write lost**; marker appended inline |
| 8 | agent | High | FM-BUG-99, checkout | "omits delivery fee when Idram is selected" | **write lost**; marker in own paragraph |
| 9 | agent | High | FM-BUG-99, checkout | "omits delivery fee when Idram is selected" | no attachments line + marker |
| 10 | agent | High | FM-BUG-99, checkout | "omits the delivery fee when Idram is selected" | final text on FM-3 |

## What was the same
All 7 independent runs: loaded tools, ran the JQL duplicate check, found only FM-3, took the update path, made **one** `editJiraIssue` with summary + description + priority + labels, used all 9 template sections in order, set High, and did not add `regression`. The cloudId in the skill worked every time.

## Where the runs differed (= ambiguity in the skill) and what changed in SKILL.md
| Finding | Seen in | Fix |
|---|---|---|
| Priority Medium (main) vs High (all agents); "no workaround" not in priority table | 1–3 vs 4–10 | Priority rule now includes "no workaround for a user-facing flow" and "when two rows fit take the higher" |
| 4 different summary wordings | 4–10 | Fixed pattern `<observable result> when <condition>`, ≤100 chars, reuse user's words, no suffixes |
| `(TEST)` suffix kept/dropped, `sandbox` label added/not | 1–3 vs 4–10 | Drop suffixes; labels are `FM-BUG-NN` + area (+ `regression` only with evidence) |
| "Reproduce first" conflicts with user-supplied/synthetic facts | 4,5,6,7,8,9,10 | Explicit exception in section 0 |
| Evidence with no artifact: 3 different phrasings | 4,6,7,8,9,10 | One required line: `Source: …; no attachments.` |
| Run marker: inline vs own paragraph | 4,7,8,10 | "Own final line" |
| Commit sha: given vs `git rev-parse` | 4–10 | "Use the sha the user gave, otherwise rev-parse" |
| Tools loaded in 2–3 separate ToolSearch calls | 4–10 | Setup section with one exact `select:` list |
| `contentFormat` is top-level, not a field | 8 | Added to gotchas |
| **Concurrent runs overwrite each other**; edit response echoes another writer's text | 5, 7, 8 (3 of 7 lost) | Section 3b: one writer per ticket, verify with `getJiraIssue`, run repeats sequentially |
| No rule on reading an existing ticket before overwrite | 4 | Ask first if the ticket holds real content |

## Honest limits
- The three lost writes are a **test-design** problem (I launched runs in parallel on one ticket), not randomness in the skill. The reports of those runs are still valid because each agent kept the text it sent.
- Final content of FM-3 is run 10's. Jira keeps the history of all edits.
- The input was synthetic, so the "reproduce" and "Evidence" parts of the skill were exercised less than for a real bug. FM-2 was the only real end-to-end use.
