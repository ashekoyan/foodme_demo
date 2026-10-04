---
name: create-jira-bug
description: File a FoodMe defect in Jira (project FM) in the team's fixed bug format, or fill/update an existing bug ticket. Use when asked to create/log/report a bug in Jira, or to add a fix-verification comment to one. Always searches for a duplicate first.
---

# Create a Jira bug (project FM)

The result must look the same no matter who asks. The reference tickets are **FM-1** and **FM-2**. Match them.

Jira site: `https://aregshekoyan.atlassian.net`, cloudId `8507baaa-aaee-4d73-b5d7-7ff4481ad524` (it worked every time; re-fetch with `getAccessibleAtlassianResources` only if a call rejects it).

## Setup: load the tools in ONE call
The Atlassian tools are usually deferred. Load them together before anything else:
`ToolSearch` query `select:mcp__e1cb94dc-791e-4b89-8edc-35d385d5bb6e__searchJiraIssuesUsingJql,mcp__e1cb94dc-791e-4b89-8edc-35d385d5bb6e__createJiraIssue,mcp__e1cb94dc-791e-4b89-8edc-35d385d5bb6e__editJiraIssue,mcp__e1cb94dc-791e-4b89-8edc-35d385d5bb6e__getJiraIssue,mcp__e1cb94dc-791e-4b89-8edc-35d385d5bb6e__addOrEditJiraIssueComment`
(Loading them in separate calls wastes round trips.)

## 0. Before writing anything
- Creating a ticket is visible to other people. If the user did not ask to *create/fill* it, show the drafted ticket and ask first.
- **Reproduction:** never file a bug nobody has seen fail. If *you* found it, reproduce it first (`reproduce-bug` skill, local `GET`s only, never write to production: `.claude/rules/production-safety.md`). **Exception:** if the user supplies the facts and says the bug is already reproduced, or says it is a synthetic/sandbox example, do not reproduce. Use their facts as given and write in Evidence what that source is (see section 2).
- **Duplicate check (mandatory):** `searchJiraIssuesUsingJql` with `project = FM AND (labels = "FM-BUG-NN" OR summary ~ "FM-BUG-NN")` and, if there is no id, a keyword from the symptom. If a match exists, do **not** create a second ticket. Two cases: (a) the match is the ticket the user told you to fill/update → section 3b; (b) it is another ticket → report its key and offer a comment instead.

## 1. Fields
| Field | Value |
|---|---|
| Project / type | `FM` / `Bug` |
| Summary | `[FM-BUG-NN] <Area>: <observable result> when <condition>` — one line, ≤ 100 chars, reuse the user's own words for the symptom (don't paraphrase), no suffixes like "(TEST)". Area: Cart, Explore, Checkout, Orders, Admin, API… If there is no id yet use `[FM-BUG-TBD]`. |
| Priority | **High:** wrong money/totals, data loss, content unreachable, or no workaround for a user-facing flow. **Medium:** wrong behaviour with a workaround. **Low:** cosmetic. When two rows fit, take the higher. |
| Labels | `FM-BUG-NN` + the area in lower case (`cart`, `explore`, `checkout`…). Add `regression` only if there is evidence it worked before. Add nothing else (no `sandbox`, no `test`). |
| Description | markdown, sections below, in this exact order |

## 2. Description template
```
## Summary             one or two sentences, no priority talk
## Environment         URL or "local build, <url>", Build/commit `<sha>` — "<subject>", Hosting, Browser
## Preconditions
## Steps to reproduce  numbered
## Expected result
## Actual result       exact values, not "broken"
## Suspected root cause   `file` → function if verified in code, otherwise "Not investigated."
## Impact              who/what is affected; workaround or "No workaround."
## Evidence
```
- Commit: use the sha the user gave; otherwise `git rev-parse --short HEAD` and its subject.
- **Evidence with no artifact:** write one line: `Source: <where the repro came from>; no attachments.` (e.g. `Source: user-supplied facts, reproduced locally with Playwright; no attachments.`). Never invent requests, screenshots or test names.
- **Run marker** (only when the user asks for one): its own final line after the Evidence text.

## 3. Tool gotchas
- `createJiraIssue` takes **`issueType`** (not `issueTypeName`), `projectKey`, `summary`, `description`, `contentFormat: "markdown"`.
- **`priority` and `labels` are rejected on create.** Create first, then `editJiraIssue` with `fields: {"priority":{"name":"High"},"labels":[...]}`.
- `contentFormat: "markdown"` is a top-level parameter of `editJiraIssue` / `createJiraIssue` / `addOrEditJiraIssueComment`, not a field.
- Attachments (video/screenshot) cannot be created through these tools; list them under Evidence as "to be attached manually".

## 3b. Updating an existing ticket
When the user names a ticket to fill or fix (e.g. the sandbox `FM-3`):
1. If it already holds real content (not a placeholder or a ticket the user called a sandbox), `getJiraIssue` it first and ask before overwriting the description.
2. Do **one** `editJiraIssue` that sets `summary`, `description`, `priority` and `labels` together, so fields and text cannot disagree (the priority named in the body must equal the field). Replace the whole summary; drop old suffixes such as "(TEST)". Don't put the bug text in a comment.
3. **Verify:** `getJiraIssue` and compare summary, priority, labels and the last line of Evidence with what you sent. The edit response can echo another writer's text.
4. **One writer per ticket.** Several runs editing the same ticket at the same time overwrite each other (observed: 3 of 7 parallel runs lost their text). Run repeats sequentially. If verification shows someone else's text, report it; don't loop edits.

## 4. Verifying a fix
Add a comment (don't rewrite the description) titled `## Fix verification — PASSED|FAILED`, with the steps run, observed values and a regression check. Move to Done only if the user asks (`transitionJiraIssue`).

## 5. Report back
Return the key and URL (`https://aregshekoyan.atlassian.net/browse/FM-N`), the final summary line, priority and labels, and whether verification matched. Never delete tickets.
