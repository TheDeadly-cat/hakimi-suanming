import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import os from "node:os";
import path from "node:path";
import { lstat, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { DIAGNOSTIC_STAGES, resolveDiagnosticProgram, runDefaultLifecycleStage, runDiagnosticStage } from "./run-diagnostic-stage.mjs";
import {
  DEFAULT_LIFECYCLE_STAGE_COMMANDS,
  computeDefaultLifecyclePlanDigest,
  loadDefaultLifecycleInputs,
  resolveDefaultLifecyclePlan
} from "./formal-npm-lifecycle-closure-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_PHASE_IDS = ["governance", "workspace-prebuild", "program", "workspace-postbuild", "root-post"];

async function ordinaryLifecycleFixture(t, exits = {}) {
  const temporaryParent = await realpath(os.tmpdir());
  const temporaryRoot = await mkdtemp(path.join(temporaryParent, "hdlc-"));
  const ownedReal = await realpath(temporaryRoot);
  const owned = await lstat(temporaryRoot, { bigint: true });
  assert.equal(ownedReal, temporaryRoot);
  assert.equal(path.dirname(ownedReal), temporaryParent);
  assert.equal(owned.isDirectory(), true);
  assert.equal(owned.isSymbolicLink(), false);
  assert.notEqual(owned.ino, 0n);
  t.after(async () => {
    const current = await lstat(temporaryRoot, { bigint: true });
    assert.equal(current.isDirectory(), true);
    assert.equal(current.isSymbolicLink(), false);
    assert.equal(current.dev, owned.dev);
    assert.equal(current.ino, owned.ino);
    assert.equal(await realpath(temporaryRoot), ownedReal);
    assert.equal(path.dirname(ownedReal), temporaryParent);
    await rm(ownedReal, { recursive: true, force: false });
  });
  const childPath = path.join(temporaryRoot, "ordinary-child.mjs");
  const logPath = path.join(temporaryRoot, "calls.jsonl");
  await writeFile(childPath, [
    'import { appendFileSync } from "node:fs";',
    'appendFileSync(process.argv[2], JSON.stringify({ phase: process.argv[3], pid: process.pid }) + String.fromCharCode(10));',
    'process.exitCode = Number(process.argv[4]);'
  ].join("\n"), { flag: "wx" });
  const inputs = await loadDefaultLifecycleInputs(ROOT);
  const registry = JSON.parse(await readFile(path.join(ROOT, "docs/release/known-restricted-blockers.v1.json"), "utf8"));
  const environment = {};
  for (const key of ["SystemRoot", "WINDIR", "SystemDrive", "TEMP", "TMP"]) {
    if (typeof process.env[key] === "string") environment[key] = process.env[key];
  }
  const execute = async (step) => {
    assert.ok(DEFAULT_PHASE_IDS.includes(step.id));
    assert.ok(["npm", "program"].includes(step.kind));
    return new Promise((resolve) => {
      let started = false;
      const child = spawn(process.execPath, [childPath, logPath, step.id, String(exits[step.id] ?? 0)], {
        cwd: temporaryRoot, env: environment, stdio: "ignore", shell: false, windowsHide: true
      });
      child.once("spawn", () => { started = true; });
      child.once("error", (error) => resolve({ started, exitCode: null, error: error.code }));
      child.once("close", (exitCode, signal) => resolve({ started, exitCode, signal }));
    });
  };
  const calls = async () => {
    let text;
    try { text = await readFile(logPath, "utf8"); }
    catch (error) { if (error?.code === "ENOENT") return []; throw error; }
    return text.trim().split("\n").map((line) => JSON.parse(line));
  };
  return { inputs, registry, execute, calls };
}

function phase(result, id) {
  const matches = result.phases.filter((entry) => entry.id === id);
  assert.equal(matches.length, 1, id);
  return matches[0];
}

function assertTerminalLifecycle(result, fixture, stage) {
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.recordType, "default_npm_lifecycle_phase_report");
  assert.equal(result.stage, stage);
  assert.equal(result.terminal, true);
  assert.deepEqual(result.phases.map((entry) => entry.id), DEFAULT_PHASE_IDS);
  assert.deepEqual(result.packageIdentities, fixture.inputs.packageIdentities);
  assert.equal(result.planDigest, computeDefaultLifecyclePlanDigest(resolveDefaultLifecyclePlan(stage, fixture.inputs)));
  assert.ok(Number.isFinite(Date.parse(result.startedAt)));
  assert.ok(Date.parse(result.completedAt) >= Date.parse(result.startedAt));
  assert.equal(phase(result, "governance").required, true);
  assert.equal(phase(result, "program").required, true);
  assert.equal(phase(result, "workspace-prebuild").required, stage === "build");
  for (const entry of result.phases) {
    if (["blocked", "not-applicable", "not-configured"].includes(entry.status)) {
      assert.equal(entry.startedAt, null);
      assert.equal(entry.completedAt, null);
    } else {
      assert.ok(Number.isFinite(Date.parse(entry.startedAt)));
      assert.ok(Date.parse(entry.completedAt) >= Date.parse(entry.startedAt));
    }
  }
}

test("recorded user authorization permits the complete programs but does not invent a successful result", async () => {
  const registry = JSON.parse(await readFile(new URL("../docs/release/known-restricted-blockers.v1.json", import.meta.url), "utf8"));
  assert.equal(registry.blockers[0].authorization.source, "explicit_user_instruction");
  const expected = {
    typecheck: { args: ["--noEmit", "-p", "tsconfig.json"], cwd: "." },
    vitest: { args: ["run", "--config", "apps/web/vitest.config.ts"], cwd: "." },
    build: { args: ["build", "--configLoader", "runner"], cwd: "apps/web" }
  };
  for (const [stage, spec] of Object.entries(expected)) {
    let called = false;
    const result = await runDiagnosticStage(stage, { registry, execute: async (actual) => {
      called = true;
      assert.deepEqual(actual.args, spec.args);
      assert.equal(actual.cwd, spec.cwd);
      return { started: true, exitCode: 7 };
    } });
    assert.equal(called, true);
    assert.equal(result.phase, "program");
    assert.equal(result.status, "failed");
    assert.equal(result.exitCode, 7);
  }
});

const allowedRegistry = { recordType: "known_restricted_blocker_registry", blockers: [] };
for (const stage of ["typecheck", "vitest", "build"]) {
  test(`${stage}: restricted graph never starts the program`, async () => {
    let launched = false;
    const result = await runDiagnosticStage(stage, {
      registry: { ...allowedRegistry, blockers: [{ blockerId: "fixture", restrictedPaths: ["fixture.ts"], forbiddenActions: ["read_source"] }] },
      execute: async () => { launched = true; throw new Error("Must not execute"); }
    });
    assert.equal(launched, false);
    assert.equal(result.status, "blocked");
    assert.equal(result.programStarted, false);
    assert.equal(result.exitCode, 2);
  });
}
test("governance status cannot masquerade as a successful program", async () => {
  const result = await runDiagnosticStage("vitest", { registry: allowedRegistry,
    execute: async () => ({ started: true, exitCode: 7 }) });
  assert.equal(result.status, "failed");
  assert.equal(result.phase, "program");
  assert.equal(result.programStarted, true);
  assert.equal(result.exitCode, 7);
});
test("missing executable is distinct from a tool-reported failure", async () => {
  const result = await runDiagnosticStage("build", { registry: allowedRegistry,
    execute: async () => ({ started: false, error: "missing dependency" }) });
  assert.equal(result.phase, "program-start");
  assert.equal(result.programStarted, false);
  assert.equal(result.status, "failed");
});
test("the complete typecheck command is preserved for an authorized graph", async () => {
  const result = await runDiagnosticStage("typecheck", { registry: allowedRegistry,
    execute: async (spec) => {
      assert.deepEqual(spec.args, ["--noEmit", "-p", "tsconfig.json"]);
      return { started: true, exitCode: 0 };
    } });
  assert.equal(result.status, "passed");
});
test("missing or malformed authorization fails closed before execution", async () => {
  for (const registry of [null, {}, { ...allowedRegistry, blockers: [{}] }]) {
    await assert.rejects(runDiagnosticStage("build", { registry,
      execute: async () => { assert.fail("must not execute"); } }), /registry/);
  }
});
test("unknown stages and absent execution evidence are rejected", async () => {
  await assert.rejects(runDiagnosticStage("publish", { registry: allowedRegistry }), /Unknown/);
  const result = await runDiagnosticStage("build", { registry: allowedRegistry,
    execute: async () => undefined });
  assert.equal(result.status, "failed");
  assert.equal(result.phase, "program-result");
  assert.equal(result.programStarted, null);
});

test("package exports resolve pinned binaries without loading the application", async () => {
  for (const spec of Object.values(DIAGNOSTIC_STAGES)) {
    const executable = await resolveDiagnosticProgram(spec);
    assert.equal((await stat(executable)).isFile(), true);
    if (spec.package === "vite") assert.ok(executable.includes(path.join("apps", "web", "node_modules", "vite")));
  }
});

test("default lifecycle plans preserve the real main commands and explicitly account for absent hooks", async () => {
  const inputs = await loadDefaultLifecycleInputs(ROOT);
  assert.deepEqual(Object.keys(DEFAULT_LIFECYCLE_STAGE_COMMANDS).sort(), ["build", "typecheck", "vitest"]);
  const commands = { typecheck: ["npm", "run", "typecheck"], vitest: ["npm", "test"], build: ["npm", "run", "build"] };
  for (const stage of Object.keys(commands)) {
    const plan = resolveDefaultLifecyclePlan(stage, inputs);
    assert.deepEqual(plan.originalCommand, commands[stage]);
    assert.deepEqual(plan.steps.map((step) => step.id), DEFAULT_PHASE_IDS);
    assert.deepEqual(plan.steps.find((step) => step.id === "program").spec, DIAGNOSTIC_STAGES[stage]);
    assert.match(computeDefaultLifecyclePlanDigest(plan), /^[0-9a-f]{64}$/u);
    const prebuild = plan.steps.find((step) => step.id === "workspace-prebuild");
    assert.equal(prebuild.required, stage === "build");
    if (stage === "build") {
      assert.equal(prebuild.command, inputs.web.packageJson.scripts.prebuild);
      assert.equal(prebuild.cwd, "apps/web");
    } else {
      assert.equal(prebuild.absentStatus, "not-applicable");
    }
    for (const id of ["workspace-postbuild", "root-post"]) {
      const post = plan.steps.find((step) => step.id === id);
      assert.equal(post.required, false);
      assert.equal(post.absentStatus, "not-configured");
    }
  }
});

test("default lifecycle governance failure still runs each authorized ordinary child and fails aggregate", async (t) => {
  for (const stage of ["typecheck", "vitest", "build"]) {
    const fixture = await ordinaryLifecycleFixture(t, { governance: 9 });
    const result = await runDefaultLifecycleStage(stage, { ...fixture.inputs, registry: fixture.registry, execute: fixture.execute });
    assertTerminalLifecycle(result, fixture, stage);
    assert.equal(result.authorization.status, "allowed");
    assert.equal(phase(result, "governance").status, "failed");
    assert.equal(phase(result, "governance").exitCode, 9);
    assert.equal(phase(result, "program").status, "passed");
    assert.equal(phase(result, "program").exitCode, 0);
    assert.equal(phase(result, "program").started, true);
    assert.equal(result.programStarted, true);
    assert.equal(result.status, "failed");
    assert.equal(result.aggregateExitCode, 1);
    const calls = await fixture.calls();
    assert.deepEqual(calls.map((entry) => entry.phase), stage === "build"
      ? ["governance", "workspace-prebuild", "program"] : ["governance", "program"]);
    assert.ok(calls.every((entry) => Number.isInteger(entry.pid) && entry.pid > 0));
  }
});

test("default lifecycle records an ordinary child body failure separately from passed governance", async (t) => {
  const fixture = await ordinaryLifecycleFixture(t, { program: 7 });
  const result = await runDefaultLifecycleStage("vitest", { ...fixture.inputs, registry: fixture.registry, execute: fixture.execute });
  assertTerminalLifecycle(result, fixture, "vitest");
  assert.equal(phase(result, "governance").status, "passed");
  assert.equal(phase(result, "program").status, "failed");
  assert.equal(phase(result, "program").exitCode, 7);
  assert.equal(result.programStarted, true);
  assert.equal(result.status, "failed");
  assert.equal(result.aggregateExitCode, 1);
  assert.deepEqual((await fixture.calls()).map((entry) => entry.phase), ["governance", "program"]);
});

test("default lifecycle authorization blocked never starts any child", async (t) => {
  const fixture = await ordinaryLifecycleFixture(t);
  const registry = { recordType: "known_restricted_blocker_registry", blockers: [{
    blockerId: "synthetic-restricted-graph", restrictedPaths: ["synthetic-restricted.ts"], forbiddenActions: ["read_source"]
  }] };
  const result = await runDefaultLifecycleStage("build", { ...fixture.inputs, registry, execute: fixture.execute });
  assertTerminalLifecycle(result, fixture, "build");
  assert.equal(result.authorization.status, "blocked");
  assert.equal(result.status, "blocked");
  assert.equal(result.programStarted, false);
  assert.equal(result.aggregateExitCode, 2);
  assert.deepEqual(await fixture.calls(), []);
  assert.ok(result.phases.every((entry) => entry.started === false));
});

test("default build stops before its Vite stage when the workspace prerequisite fixture child fails", async (t) => {
  const fixture = await ordinaryLifecycleFixture(t, { "workspace-prebuild": 5 });
  const result = await runDefaultLifecycleStage("build", { ...fixture.inputs, registry: fixture.registry, execute: fixture.execute });
  assertTerminalLifecycle(result, fixture, "build");
  assert.equal(phase(result, "governance").status, "passed");
  assert.equal(phase(result, "workspace-prebuild").status, "failed");
  assert.equal(phase(result, "workspace-prebuild").exitCode, 5);
  assert.equal(phase(result, "program").status, "blocked");
  assert.equal(phase(result, "program").exitCode, null);
  assert.equal(result.programStarted, false);
  assert.equal(result.aggregateExitCode, 1);
  assert.deepEqual((await fixture.calls()).map((entry) => entry.phase), ["governance", "workspace-prebuild"]);
});

test("default lifecycle preserves unknown program results instead of inventing a tool failure", async (t) => {
  const missing = await ordinaryLifecycleFixture(t);
  const missingResult = await runDefaultLifecycleStage("typecheck", { ...missing.inputs, registry: missing.registry,
    execute: async (step) => step.id === "program" ? undefined : missing.execute(step) });
  assert.equal(phase(missingResult, "program").status, "unknown");
  assert.equal(phase(missingResult, "program").exitCode, null);
  assert.equal(missingResult.programStarted, null);
  assert.equal(missingResult.aggregateExitCode, 1);
  assert.deepEqual((await missing.calls()).map((entry) => entry.phase), ["governance"]);
  const incomplete = await ordinaryLifecycleFixture(t);
  const incompleteResult = await runDefaultLifecycleStage("typecheck", { ...incomplete.inputs, registry: incomplete.registry,
    execute: async (step) => {
      const result = await incomplete.execute(step);
      return step.id === "program" ? { ...result, exitCode: null, signal: null } : result;
    } });
  assert.equal(phase(incompleteResult, "program").status, "unknown");
  assert.equal(phase(incompleteResult, "program").exitCode, null);
  assert.equal(incompleteResult.programStarted, true);
  assert.equal(incompleteResult.aggregateExitCode, 1);
  assert.deepEqual((await incomplete.calls()).map((entry) => entry.phase), ["governance", "program"]);
});

test("unknown governance still permits the authorized body but cannot satisfy aggregate", async (t) => {
  const fixture = await ordinaryLifecycleFixture(t);
  const result = await runDefaultLifecycleStage("vitest", { ...fixture.inputs, registry: fixture.registry,
    execute: async (step) => {
      const outcome = await fixture.execute(step);
      return step.id === "governance" ? { ...outcome, exitCode: null, signal: null } : outcome;
    } });
  assert.equal(phase(result, "governance").status, "unknown");
  assert.equal(phase(result, "program").status, "passed");
  assert.equal(result.programStarted, true);
  assert.equal(result.status, "failed");
  assert.equal(result.aggregateExitCode, 1);
});

test("default lifecycle distinguishes an explicit start failure from a thrown unknown execution result", async (t) => {
  const notStarted = await ordinaryLifecycleFixture(t);
  const startFailure = await runDefaultLifecycleStage("typecheck", { ...notStarted.inputs, registry: notStarted.registry,
    execute: async (step) => step.id === "program"
      ? { started: false, exitCode: null, error: "synthetic executable unavailable" } : notStarted.execute(step) });
  assert.equal(phase(startFailure, "program").status, "failed");
  assert.equal(phase(startFailure, "program").exitCode, null);
  assert.equal(startFailure.programStarted, false);
  assert.equal(startFailure.aggregateExitCode, 1);
  assert.deepEqual((await notStarted.calls()).map((entry) => entry.phase), ["governance"]);
  const uncertain = await ordinaryLifecycleFixture(t);
  const unknown = await runDefaultLifecycleStage("typecheck", { ...uncertain.inputs, registry: uncertain.registry,
    execute: async (step) => {
      const result = await uncertain.execute(step);
      if (step.id === "program") throw new Error("synthetic execution result unavailable");
      return result;
    } });
  assert.equal(phase(unknown, "program").status, "unknown");
  assert.equal(phase(unknown, "program").exitCode, null);
  assert.equal(unknown.programStarted, null);
  assert.equal(unknown.aggregateExitCode, 1);
  assert.deepEqual((await uncertain.calls()).map((entry) => entry.phase), ["governance", "program"]);
});

test("default lifecycle reports all required ordinary child results before a successful aggregate", async (t) => {
  const fixture = await ordinaryLifecycleFixture(t);
  const result = await runDefaultLifecycleStage("build", { ...fixture.inputs, registry: fixture.registry, execute: fixture.execute });
  assertTerminalLifecycle(result, fixture, "build");
  assert.equal(result.status, "passed");
  assert.equal(result.aggregateExitCode, 0);
  assert.equal(result.programStarted, true);
  assert.ok(result.phases.filter((entry) => entry.required).every((entry) => entry.status === "passed"));
  for (const id of ["workspace-postbuild", "root-post"]) {
    const post = phase(result, id);
    assert.equal(post.status, "not-configured");
    assert.equal(post.required, false);
    assert.equal(post.started, false);
    assert.equal(post.exitCode, null);
  }
  assert.deepEqual((await fixture.calls()).map((entry) => entry.phase), ["governance", "workspace-prebuild", "program"]);
});

test("new root or web lifecycle hooks cannot silently disappear from the fixed plan", async () => {
  const inputs = await loadDefaultLifecycleInputs(ROOT);
  for (const [stage, target, hook] of [
    ["typecheck", "root", "posttypecheck"], ["vitest", "root", "posttest"],
    ["build", "root", "postbuild"], ["build", "web", "postbuild"],
    ["typecheck", "root", "pretypecheck"], ["build", "web", "prebuild"]
  ]) {
    const changed = structuredClone(inputs);
    changed[target].packageJson.scripts[hook] = "node synthetic-added-post.mjs";
    assert.throws(() => resolveDefaultLifecyclePlan(stage, changed), /post|hook|lifecycle/iu);
  }
});
