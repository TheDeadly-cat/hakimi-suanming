import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import Reporter, { DELIVERY_PROJECTS, DELIVERY_TESTS, DELIVERY_TEST_DIRECTORY } from "../apps/web/playwright.persistent-file-delivery-reporter.ts";

function fixture() {
  const projects = DELIVERY_PROJECTS.map(name => ({ name, retries: 0, repeatEach: 1,
    use: { channel: name.split("-")[0], headless: name.endsWith("-headless") } }));
  return {
    config: { workers: 1, fullyParallel: false, forbidOnly: true, failOnFlakyTests: true,
      shard: null, maxFailures: 0, projects },
    tests: projects.flatMap(project => DELIVERY_TESTS.map(([file, title]) => ({
      parent: { project: () => project }, location: { file: path.join(DELIVERY_TEST_DIRECTORY, file) }, title, expectedStatus: "passed",
      outcome: () => "expected", retries: 0, repeatEachIndex: 0,
      results: [{ status: "passed", retry: 0, errors: [] }]
    })))
  };
}
async function run(f, error) {
  const reporter = new Reporter();
  reporter.onBegin(f.config, { allTests: () => f.tests });
  if (error) reporter.onError({ message: error });
  return (await reporter.onEnd({ status: "passed" })).status;
}
test("accepts precisely three tests across all four browser modes", async () => {
  assert.equal(await run(fixture()), "passed");
});
for (const [name, change] of [
  ["missing test", f => f.tests.pop()],
  ["duplicate test", f => { f.tests[0] = f.tests[1]; }],
  ["changed title", f => { f.tests[0].title += " changed"; }],
  ["same filename from another directory", f => { f.tests[0].location.file = path.join(DELIVERY_TEST_DIRECTORY, "other", DELIVERY_TESTS[0][0]); }],
  ["skip", f => { f.tests[0].expectedStatus = "skipped"; f.tests[0].results[0].status = "skipped"; }],
  ["expected failure", f => { f.tests[0].expectedStatus = "failed"; f.tests[0].results[0].status = "failed"; }],
  ["retry", f => { f.tests[0].results.push({ status: "passed", retry: 1, errors: [] }); }],
  ["unexecuted", f => { f.tests[0].results = []; }],
  ["repeat", f => { f.tests[0].repeatEachIndex = 1; }],
  ["result error", f => { f.tests[0].results[0].errors = [{ message: "error" }]; }],
  ["filtered project", f => { f.config.projects.pop(); f.tests.splice(9); }],
  ["changed mode", f => { f.config.projects[0].use.headless = false; }],
  ["project retries", f => { f.config.projects[0].retries = 1; }]
]) test("rejects " + name, async () => {
  const f = fixture(); change(f); assert.equal(await run(f), "failed");
});
test("rejects runner errors", async () => assert.equal(await run(fixture(), "outside test failure"), "failed"));
test("rejects pipe diagnostics even when all test outcomes pass", async t => {
  const previous = process.env.HAKIMI_DOWNLOAD_REPRO_PIPE;
  t.after(() => {
    if (previous === undefined) delete process.env.HAKIMI_DOWNLOAD_REPRO_PIPE;
    else process.env.HAKIMI_DOWNLOAD_REPRO_PIPE = previous;
  });
  process.env.HAKIMI_DOWNLOAD_REPRO_PIPE = "1";
  assert.equal(await run(fixture()), "failed");
});
