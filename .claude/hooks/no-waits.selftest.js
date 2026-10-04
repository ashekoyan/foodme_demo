// Self-test for no-waits.js: node .claude/hooks/no-waits.selftest.js
const { spawnSync } = require("child_process");
const path = require("path");

const hook = path.join(__dirname, "no-waits.js");
const WIN = "D:\\ACA Projects\\foodme_demo\\apps\\";
const cases = [
  ["Write + waitForTimeout, Windows path", { tool_name: "Write", tool_input: { file_path: WIN + "web\\e2e\\x.spec.ts", content: "await page.waitForTimeout(300);" } }, 2],
  ["Edit + sleep, admin, slash path", { tool_name: "Edit", tool_input: { file_path: "D:/ACA Projects/foodme_demo/apps/admin/e2e/y.spec.ts", old_string: "a", new_string: "await sleep(1000)" } }, 2],
  ["MultiEdit + waitForTimeout", { tool_name: "MultiEdit", tool_input: { file_path: WIN + "web\\e2e\\z.spec.ts", edits: [{ old_string: "a", new_string: "await page.waitForTimeout(1)" }] } }, 2],
  ["clean e2e code", { tool_name: "Write", tool_input: { file_path: WIN + "web\\e2e\\x.spec.ts", content: "await expect(page.locator('a')).toBeVisible();" } }, 0],
  ["comment mentioning it", { tool_name: "Write", tool_input: { file_path: WIN + "web\\e2e\\x.spec.ts", content: "// never use waitForTimeout(300)" } }, 0],
  ["non-e2e file", { tool_name: "Write", tool_input: { file_path: WIN + "web\\src\\a.ts", content: "page.waitForTimeout(5)" } }, 0],
  ["edit elsewhere in a file that already has a wait", { tool_name: "Edit", tool_input: { file_path: WIN + "web\\e2e\\flake-dish-modal.spec.ts", old_string: "x", new_string: "await expect(a).toBeVisible();" } }, 0],
];

let failed = 0;
for (const [name, payload, want] of cases) {
  const r = spawnSync("node", [hook], { input: JSON.stringify(payload), encoding: "utf8" });
  const ok = r.status === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (exit ${r.status}, want ${want})`);
}
const bad = spawnSync("node", [hook], { input: "not json", encoding: "utf8" });
console.log(`${bad.status === 0 ? "PASS" : "FAIL"}  malformed input never blocks  (exit ${bad.status}, want 0)`);
if (bad.status !== 0) failed++;
process.exit(failed ? 1 : 0);
