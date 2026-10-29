import assert from "node:assert/strict";
import path from "node:path";

export function requireSeparateOutput(source, output) {
  for (const [parent, child] of [[source, output], [output, source]]) {
    const relative = path.relative(path.resolve(parent), path.resolve(child));
    assert.ok(relative !== "" && (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)),
      "Validation output must be separate from its input and source checkout.");
  }
}
export function requireCompleteChecks(report, count, manifestSha256, kind) {
  assert.ok(report && Array.isArray(report.checks), `${kind}: missing checks`);
  assert.equal(report.checks.length, count, `${kind}: incomplete check count`);
  assert.equal(new Set(report.checks.map((check) => check.name)).size, count, `${kind}: duplicate checks`);
  assert.ok(report.checks.every((check) => check.status === "passed"), `${kind}: failed or missing check result`);
  assert.equal(report.passed, count, `${kind}: wrong passed total`);
  assert.equal(report.failed, 0, `${kind}: failures`);
  assert.equal(report.manifestSha256, manifestSha256, `${kind}: wrong package identity`);
  if (kind === "launcher") {
    assert.equal(report.complete, true, "launcher: incomplete");
    assert.equal(report.originalPackageUnchanged, true);
    assert.equal(report.production5188Or5189Started, false);
    assert.equal(report.browserDataTouched, false);
  }
}
export function requireCompleteProbeTap(tap) {
  for (const [key, expected] of Object.entries({ tests: 6, pass: 6, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    const matches = [...tap.matchAll(new RegExp(`^# ${key} (\\d+)\\r?$`, "gm"))];
    assert.equal(matches.length, 1, `probe: missing or duplicate ${key} footer`);
    assert.equal(Number(matches[0][1]), expected, `probe: unexpected ${key}`);
  }
}
// A failed or incomplete stage prevents every following stage from running.
export async function runRequiredStages(stages) {
  const results = [];
  for (const stage of stages) results.push(await stage());
  return results;
}
