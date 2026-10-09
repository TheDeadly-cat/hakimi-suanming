import assert from "node:assert/strict";
import { test } from "node:test";
import { runJournalArtifactCheck } from "../apps/web/e2e/journal-artifact-errors.ts";

const noFailure = async () => {};
test("journal first error is returned unchanged when evidence and cleanup succeed", async () => {
  const original = new Error("restored payload differs");
  await assert.rejects(runJournalArtifactCheck({ operation: async () => { throw original; },
    diagnostics: () => [], cleanup: noFailure, attachLifecycle: noFailure }), error => error === original);
});
test("screenshot, attachment, cleanup and final evidence failures cannot replace the first error", async () => {
  const original = new Error("restored payload differs");
  const screenshot = new Error("page closed"), attachment = new Error("evidence disk unavailable");
  const cleanup = new Error("native exit rejected"), lifecycle = new Error("lifecycle attachment rejected");
  const called = [];
  await assert.rejects(runJournalArtifactCheck({
    operation: async () => { throw original; },
    diagnostics: () => [
      { label: "screenshot failed", run: async () => { called.push("screenshot"); throw screenshot; } },
      { label: "page attachment failed", run: async () => { called.push("attachment"); throw attachment; } }
    ],
    cleanup: async () => { called.push("cleanup"); throw cleanup; },
    attachLifecycle: async () => { called.push("lifecycle"); throw lifecycle; }
  }), error => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.cause, original);
    assert.equal(error.errors[0], original);
    assert.deepEqual(error.errors.slice(1).map(item => item.cause), [screenshot, attachment, cleanup, lifecycle]);
    return true;
  });
  assert.deepEqual(called, ["screenshot", "attachment", "cleanup", "lifecycle"]);
});
test("diagnostic enumeration failure retains the original and still runs cleanup and lifecycle", async () => {
  const original = new Error("backup mismatch"), diagnostic = new Error("context disposed");
  const called = [];
  await assert.rejects(runJournalArtifactCheck({ operation: async () => { throw original; },
    diagnostics: () => { throw diagnostic; }, cleanup: async () => { called.push("cleanup"); },
    attachLifecycle: async () => { called.push("lifecycle"); } }), error => {
    assert.equal(error.errors[0], original); assert.equal(error.errors[1].cause, diagnostic); return true;
  });
  assert.deepEqual(called, ["cleanup", "lifecycle"]);
});
test("successful operation still fails on cleanup and final evidence failures", async () => {
  const cleanup = new Error("native process exit"), lifecycle = new Error("final attachment");
  await assert.rejects(runJournalArtifactCheck({ operation: noFailure,
    diagnostics: () => { throw new Error("must not diagnose a successful operation"); },
    cleanup: async () => { throw cleanup; }, attachLifecycle: async () => { throw lifecycle; } }), error => {
    assert.deepEqual(error.errors.map(item => item.cause), [cleanup, lifecycle]); return true;
  });
});
test("falsy thrown values also retain first-error ordering", async () => {
  const additional = new Error("closed page");
  await assert.rejects(runJournalArtifactCheck({ operation: async () => { throw undefined; },
    diagnostics: () => [{ label: "screenshot", run: async () => { throw additional; } }],
    cleanup: noFailure, attachLifecycle: noFailure }), error => {
    assert.equal(error.errors.length, 2); assert.equal(error.errors[0], undefined);
    assert.equal(error.errors[1].cause, additional); return true;
  });
});
test("successful check runs cleanup and lifecycle once without failure diagnostics", async () => {
  const called = [];
  await runJournalArtifactCheck({ operation: async () => { called.push("operation"); },
    diagnostics: () => { throw new Error("must not be called"); },
    cleanup: async () => { called.push("cleanup"); }, attachLifecycle: async () => { called.push("lifecycle"); } });
  assert.deepEqual(called, ["operation", "cleanup", "lifecycle"]);
});
