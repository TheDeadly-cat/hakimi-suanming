import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { completeGroupReport } from "./run-node-test-group.mjs";

const execute = promisify(execFile);
const runner = fileURLToPath(new URL("./run-node-test-group.mjs", import.meta.url));
async function fixture(t, sources) {
  const parent = path.resolve(tmpdir());
  const root = await mkdtemp(path.join(parent, "hakimi-node-group-"));
  t.after(async () => {
    assert.ok(root.startsWith(path.join(parent, "hakimi-node-group-")));
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(path.join(root, "scripts"));
  await mkdir(path.join(root, "packages"));
  for (const [name, source] of Object.entries(sources)) await writeFile(path.join(root, "scripts", name), source);
  await writeFile(path.join(root, "scripts/node-test-groups.json"), JSON.stringify({ version: 1,
    groups: [{ id: "fixture", tests: Object.keys(sources).map((name) => `scripts/${name}`) }] }));
  return root;
}
async function invoke(root, group = "fixture") {
  let output;
  // Launch the CLI as a separate top-level test run, not recursively inside the
  // parent node:test worker. Only these generated fixtures receive this environment.
  const environment = { ...process.env };
  delete environment.NODE_TEST_CONTEXT;
  try { output = await execute(process.execPath, [runner, group], { cwd: root, windowsHide: true, env: environment }); }
  catch (error) { output = { ...error, exitCode: error.code }; }
  const stdout = output.stdout ?? "";
  const start = stdout.startsWith("{") ? 0 : stdout.lastIndexOf('\n{');
  if (start < 0) return { output, result: null };
  const result = JSON.parse(stdout.slice(start));
  const report = JSON.parse(await readFile(result.resultPath, "utf8"));
  return { output, result, report };
}
test("whole group records native file results and individual test identities", async (t) => {
  const root = await fixture(t, {
    "first.test.mjs": 'import test from "node:test"; test("same name", () => {});',
    "second.test.mjs": 'import test from "node:test"; test("same name", () => {});'
  });
  const { report, output, result } = await invoke(root);
  assert.equal(output.exitCode, undefined, JSON.stringify(output));
  assert.equal(report.status, "passed");
  assert.equal(report.files.length, 2);
  assert.equal(report.files.every((file) => file.summary.success), true);
  assert.equal(report.tests.filter((item) => item.name === "same name").length, 2);
  assert.equal(new Set(report.tests.filter((item) => item.name === "same name").map((item) => item.file)).size, 2);
  const events = (await readFile(path.join(path.dirname(result.resultPath), "events.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(events.filter((event) => event.type === "test:pass" && event.name === "same name").length, 2);
  assert.ok(events.some((event) => event.type === "test:diagnostic"));
});
test("failed import does not hide the remaining file and yields a nonzero group", async (t) => {
  const root = await fixture(t, {
    "crash.test.mjs": 'throw new Error("fixture load failure");',
    "valid.test.mjs": 'import test from "node:test"; test("still executes", () => {});'
  });
  const { report, output } = await invoke(root);
  assert.equal(output.exitCode, 1);
  assert.equal(report.status, "failed");
  assert.ok(report.tests.some((item) => item.name === "still executes" && item.outcome === "passed"));
});
test("skipped or TODO cases retain names and cannot pass a complete group gate", async (t) => {
  const root = await fixture(t, {
    "partial.test.mjs": 'import test from "node:test"; test.skip("fixture skip", () => {}); test.todo("fixture todo");'
  });
  const { report, output } = await invoke(root);
  assert.equal(output.exitCode, 1);
  assert.equal(report.status, "incomplete");
  assert.ok(report.tests.some((item) => item.name === "fixture skip" && item.outcome === "skipped"));
  assert.ok(report.tests.some((item) => item.name === "fixture todo" && item.outcome === "todo"));
});
test("new unregistered files reject before any test module is loaded", async (t) => {
  const root = await fixture(t, { "registered.test.mjs": 'throw new Error("must not load");' });
  await writeFile(path.join(root, "scripts/extra.test.mjs"), 'throw new Error("must not load");');
  const { output, result } = await invoke(root);
  assert.equal(output.exitCode, 1);
  assert.equal(result, null);
  assert.match(output.stderr, /Unregistered test: scripts\/extra.test.mjs/);
  assert.doesNotMatch(output.stderr, /must not load/);
});
test("missing file results or final summary cannot be reclassified as passing", () => {
  const counts = { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 };
  assert.equal(completeGroupReport({ files: [{ path: "a", summary: null }], summary: { counts, success: true } }).status, "incomplete");
  assert.equal(completeGroupReport({ files: [], summary: null }).status, "incomplete");
});

test("worker exit retains its actual exit code and native failure event", async (t) => {
  const root = await fixture(t, { "exit.test.mjs": "process.exitCode = 7;" });
  const { report, result, output } = await invoke(root);
  assert.equal(output.exitCode, 1);
  assert.equal(report.status, "failed");
  assert.ok(report.tests.some((item) => item.errorDetails?.exitCode === 7));
  const events = (await readFile(path.join(path.dirname(result.resultPath), "events.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
  assert.ok(events.some((event) => event.type === "test:fail" && event.errorDetails?.exitCode === 7));
});
