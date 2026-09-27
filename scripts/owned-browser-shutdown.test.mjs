import assert from "node:assert/strict";
import test from "node:test";
import { closeOwnedBrowser } from "../apps/web/e2e/owned-browser-shutdown.ts";

const never = () => new Promise(() => {});
function fixture(overrides = {}) {
  let terminated = false;
  let resolveExit;
  const events = [];
  const nativeExit = new Promise(resolve => { resolveExit = resolve; });
  const exit = () => { terminated = true; resolveExit(); };
  return { events, exit, options: {
    requestClose: async () => { events.push("request"); exit(); },
    nativeExit, isTerminated: () => terminated,
    killOwnedProcess: () => { events.push("kill-owned"); exit(); },
    disconnect: async () => { events.push("disconnect"); },
    verifyExit: () => { events.push("verify"); },
    graceMs: 25, totalMs: 100, ...overrides
  } };
}

test("normal close verifies native exit and disconnects without force termination", async () => {
  const f = fixture();
  await closeOwnedBrowser(f.options);
  assert.deepEqual(f.events, ["request", "verify", "disconnect"]);
});

test("CDP request never returning still reaches owned-process cleanup within the total deadline", { timeout: 3000 }, async () => {
  const f = fixture({ requestClose: never });
  await assert.rejects(closeOwnedBrowser(f.options), /close request and native exit/);
  assert.deepEqual(f.events, ["kill-owned", "disconnect"]);
});

test("process never exiting preserves protocol and bounded cleanup errors", { timeout: 3000 }, async () => {
  const protocolError = new Error("original CDP failure");
  const f = fixture({ requestClose: async () => { throw protocolError; }, killOwnedProcess: () => {} });
  await assert.rejects(closeOwnedBrowser(f.options), error => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.errors[0], protocolError);
    assert.ok(error.errors.some(e => /close request and native exit/.test(e.message)));
    assert.ok(error.errors.some(e => /owned-process cleanup/.test(e.message)));
    return true;
  });
});

test("disconnect itself is included in the total deadline", { timeout: 3000 }, async () => {
  const f = fixture({ disconnect: never });
  await assert.rejects(closeOwnedBrowser(f.options), /CDP disconnect/);
});

test("native exit failure and cleanup failure are both retained", async () => {
  const operation = new Error("unexpected native exit");
  const cleanup = new Error("disconnect failure");
  const f = fixture({ verifyExit: () => { throw operation; }, disconnect: async () => { throw cleanup; } });
  await assert.rejects(closeOwnedBrowser(f.options), error => {
    assert.deepEqual(error.errors, [operation, cleanup]); return true;
  });
});
