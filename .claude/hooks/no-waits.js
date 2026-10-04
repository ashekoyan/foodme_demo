#!/usr/bin/env node
// PreToolUse hook (Write | Edit | MultiEdit): blocks fixed waits in Playwright specs.
// Enforces .claude/rules/e2e-tests.md ("No fixed waits"). Exit code 2 = block, stderr goes to the agent.

const E2E_FILE = /(^|\/)apps\/(web|admin)\/e2e\/.+\.(ts|tsx|js|jsx)$/;
const FIXED_WAIT = /\bwaitForTimeout\s*\(|(^|[^.\w])sleep\s*\(|\bnew Promise\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*setTimeout\s*\(/;

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // never block on a malformed payload
  }

  const ti = input.tool_input || {};
  const file = String(ti.file_path || "").replace(/\\/g, "/");
  if (!E2E_FILE.test(file)) process.exit(0);

  // Only inspect text being written, so editing around an existing wait stays possible.
  const chunks = [];
  if (typeof ti.content === "string") chunks.push(ti.content);
  if (typeof ti.new_string === "string") chunks.push(ti.new_string);
  if (Array.isArray(ti.edits)) for (const e of ti.edits) if (e && typeof e.new_string === "string") chunks.push(e.new_string);

  const offending = chunks
    .join("\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.startsWith("//") && !line.startsWith("*"))
    .filter((line) => FIXED_WAIT.test(line));

  if (offending.length === 0) process.exit(0);

  process.stderr.write(
    [
      `Blocked: fixed wait in ${file}`,
      ...offending.map((l) => `  > ${l}`),
      "",
      "Playwright specs must not use waitForTimeout()/sleep() (see .claude/rules/e2e-tests.md).",
      "The backend adds a random 200-1500 ms delay to API calls, so any fixed number is wrong.",
      "Wait for a condition instead: await expect(locator).toBeVisible() / toHaveCount(n) / toHaveURL(...),",
      "or page.waitForResponse(...). Then retry the edit.",
      "",
    ].join("\n"),
  );
  process.exit(2);
});
