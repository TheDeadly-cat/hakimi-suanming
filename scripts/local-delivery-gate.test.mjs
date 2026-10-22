import assert from "node:assert/strict";
import test from "node:test";
import { requireCompleteChecks, requireCompleteProbeTap, requireSeparateOutput, runRequiredStages } from "./local-delivery-gate-lib.mjs";
const identity = "a".repeat(64);
const complete = (count = 18) => ({
  checks: Array.from({ length: count }, (_, index) => ({ name: `check ${index}`, status: "passed" })),
  passed: count, failed: 0, manifestSha256: identity
});
test("installation gate requires all 18 checks bound to the selected package", () => {
  requireCompleteChecks(complete(), 18, identity, "installation");
  assert.throws(() => requireCompleteChecks(complete(), 18, "b".repeat(64), "installation"), /identity/u);
  for (const report of [null, {}, { ...complete(), checks: [] }, { ...complete(), failed: 1 }]) {
    assert.throws(() => requireCompleteChecks(report, 18, identity, "installation"));
  }
  const duplicate = complete(); duplicate.checks[1].name = duplicate.checks[0].name;
  assert.throws(() => requireCompleteChecks(duplicate, 18, identity, "installation"), /duplicate/u);
  const skipped = complete(); skipped.checks[2].status = "skipped";
  assert.throws(() => requireCompleteChecks(skipped, 18, identity, "installation"), /missing/u);
});
test("launcher gate rejects incomplete runs and unsafe scope claims", () => {
  const report = { ...complete(6), complete: true, originalPackageUnchanged: true, production5188Or5189Started: false, browserDataTouched: false };
  requireCompleteChecks(report, 6, identity, "launcher");
  for (const field of ["complete", "originalPackageUnchanged", "production5188Or5189Started", "browserDataTouched"]) {
    assert.throws(() => requireCompleteChecks({ ...report, [field]: !report[field] }, 6, identity, "launcher"));
  }
});
test("probe gate requires the complete six-test footer with no skipped tests", () => {
  const tap = "# tests 6\n# pass 6\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n";
  requireCompleteProbeTap(tap);
  for (const invalid of ["OK", tap.replace("# pass 6\n", ""), tap.replace("# skipped 0", "# skipped 1"), tap + "# tests 6\n"]) {
    assert.throws(() => requireCompleteProbeTap(invalid));
  }
});
test("mandatory stages stop at a failed process or incomplete receipt", async () => {
  for (const fail of [() => { throw Error("process exit 1"); }, () => requireCompleteChecks({}, 18, identity, "installation")]) {
    let laterCalls = 0;
    await assert.rejects(runRequiredStages([async () => fail(), async () => { laterCalls++; }]));
    assert.equal(laterCalls, 0);
  }
  assert.deepEqual(await runRequiredStages([async () => 1, async () => 2]), [1, 2]);
});
test("validation refuses output under input or source and their ancestors", () => {
  assert.throws(() => requireSeparateOutput("input", "input/qa"));
  assert.throws(() => requireSeparateOutput("input/qa", "input"));
  assert.throws(() => requireSeparateOutput("input", "input"));
  requireSeparateOutput("input", "qa");
});
