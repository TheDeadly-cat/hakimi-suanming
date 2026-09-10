import { appendFile, readFile, open } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  computeDefaultLifecyclePlanDigest,
  DEFAULT_LIFECYCLE_STAGE_COMMANDS,
  loadDefaultLifecycleInputs,
  resolveDefaultLifecyclePlan
} from "./formal-npm-lifecycle-closure-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DIAGNOSTIC_STAGES = Object.freeze({
  typecheck: { package: "typescript", binary: "tsc", args: ["--noEmit", "-p", "tsconfig.json"], cwd: "." },
  vitest: { package: "vitest", binary: "vitest", args: ["run", "--config", "apps/web/vitest.config.ts"], cwd: "." },
  build: { package: "vite", binary: "vite", args: ["build", "--configLoader", "runner"], cwd: "apps/web" }
});

// These three stages use the complete default application graph. This is an
// execution permission check, never a source exclusion or a reduced test graph.
export async function runDiagnosticStage(stage, { registry, execute }) {
  if (!Object.hasOwn(DIAGNOSTIC_STAGES, stage)) throw new Error("Unknown diagnostic stage.");
  if (registry?.recordType !== "known_restricted_blocker_registry"
    || !Array.isArray(registry.blockers)
    || registry.blockers.some((item) => !Array.isArray(item.restrictedPaths)
      || !Array.isArray(item.forbiddenActions))) {
    throw new Error("Diagnostic authorization registry is missing or invalid.");
  }
  const restrictions = registry.blockers.filter((item) =>
    item.restrictedPaths.length > 0 && item.forbiddenActions.includes("read_source"));
  if (restrictions.length > 0) return {
    stage, phase: "authorization", status: "blocked", programStarted: false, exitCode: 2,
    blockers: restrictions.map((item) => ({ blockerId: item.blockerId, paths: item.restrictedPaths })),
    reason: "Complete application graph requires restricted source; program body was not executed."
  };
  let result;
  try { result = await execute(DIAGNOSTIC_STAGES[stage]); }
  catch (error) { result = { started: false, error: error.message }; }
  if (!result || typeof result.started !== "boolean"
    || (result.started && !Number.isInteger(result.exitCode))) {
    return { stage, phase: "program-result", status: "failed", programStarted: null,
      exitCode: 1, error: "Diagnostic process returned no reliable execution result." };
  }
  return {
    stage, phase: result.started ? "program" : "program-start",
    status: result.started && result.exitCode === 0 ? "passed" : "failed",
    programStarted: result.started, exitCode: result.started ? result.exitCode : 1,
    ...(result.error ? { error: result.error } : {})
  };
}

export async function resolveDiagnosticProgram(spec, workspaceRoot = root) {
  const manifestPath = path.resolve(workspaceRoot, spec.cwd, "package.json");
  const require = createRequire(manifestPath);
  let metadataPath;
  switch (spec.package) {
    case "typescript": metadataPath = require.resolve("typescript/package.json"); break;
    case "vitest": metadataPath = require.resolve("vitest/package.json"); break;
    case "vite": metadataPath = require.resolve("vite/package.json"); break;
    default: throw new Error("Unknown diagnostic package.");
  }
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const expectedVersion = manifest.devDependencies?.[spec.package] ?? manifest.dependencies?.[spec.package];
  if (metadata.version !== expectedVersion) throw new Error(`Pinned ${spec.package} version mismatch: expected ${expectedVersion}, found ${metadata.version}`);
  const bin = typeof metadata.bin === "string" ? metadata.bin : metadata.bin?.[spec.binary];
  if (typeof bin !== "string") throw new Error(`Pinned ${spec.package} has no ${spec.binary} binary.`);
  return path.resolve(path.dirname(metadataPath), bin);
}

async function executeProgram(spec) {
  let entry;
  try { entry = await resolveDiagnosticProgram(spec); }
  catch (error) { return { started: false, error: error.message }; }
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [entry, ...spec.args], {
      cwd: path.resolve(root, spec.cwd), stdio: "inherit", windowsHide: true, shell: false
    });
    child.once("error", (error) => resolve({ started: false, error: error.message }));
    child.once("exit", (code, signal) => resolve({ started: true, exitCode: code ?? 1,
      ...(signal ? { error: `Process terminated by ${signal}` } : {}) }));
  });
}

const LIFECYCLE_ENVIRONMENT_KEYS = Object.freeze([
  "HAKIMI_RELEASE_LIFECYCLE_RUN_ID",
  "HAKIMI_RELEASE_LIFECYCLE_RECEIPT_ID",
  "HAKIMI_RELEASE_LIFECYCLE_REPORT_OUTPUT"
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

function executionAuthorization(registry) {
  if (registry?.recordType !== "known_restricted_blocker_registry"
    || !Array.isArray(registry.blockers)
    || registry.blockers.some((item) => !Array.isArray(item.restrictedPaths)
      || !Array.isArray(item.forbiddenActions))) {
    throw new Error("Diagnostic authorization registry is missing or invalid.");
  }
  const blockers = registry.blockers.filter((item) =>
    item.restrictedPaths.length > 0 && item.forbiddenActions.includes("read_source")
  ).map((item) => ({ blockerId: item.blockerId, paths: [...item.restrictedPaths] }));
  return { status: blockers.length === 0 ? "allowed" : "blocked", blockers };
}

function inactivePhase(step, status, error = null) {
  return {
    id: step.id, required: step.required, status, started: false,
    exitCode: null, signal: null, error, startedAt: null, completedAt: null
  };
}

async function executeLifecyclePhase(step, execute) {
  const startedAt = new Date().toISOString();
  let result;
  try { result = await execute(step); }
  catch (error) {
    result = { started: null, error: error instanceof Error ? error.message : "Execution result was not observed." };
  }
  const completedAt = new Date().toISOString();
  const phase = {
    id: step.id, required: step.required, status: "unknown", started: null,
    exitCode: null, signal: null,
    error: "Process returned no reliable execution result.", startedAt, completedAt
  };
  if (!result || typeof result.started !== "boolean") {
    if (typeof result?.error === "string" && result.error.length > 0) phase.error = result.error;
    return phase;
  }
  phase.started = result.started;
  const signal = typeof result.signal === "string" && result.signal.length > 0 ? result.signal : null;
  const knownExit = Number.isSafeInteger(result.exitCode) && result.exitCode >= 0;
  const noExit = result.exitCode === null || result.exitCode === undefined;
  const error = typeof result.error === "string" && result.error.length > 0 ? result.error : null;
  if (!result.started) {
    if (!noExit || signal !== null) return phase;
    return { ...phase, status: "failed", error: error || "Program did not start." };
  }
  if (knownExit && signal === null) {
    if (result.exitCode === 0 && error !== null) return { ...phase, error };
    return { ...phase, status: result.exitCode === 0 ? "passed" : "failed", exitCode: result.exitCode, error };
  }
  if (noExit && signal !== null) return { ...phase, status: "failed", signal, error };
  return { ...phase, error: error ?? phase.error };
}

// Dependency injection belongs to this in-process execution function, as in
// runDiagnosticStage. The production CLI supplies its own fixed executor and
// reads its own registry and package bytes; it accepts no command callbacks.
export async function runDefaultLifecycleStage(stage, {
  root: rootContext, web, packageIdentities, registry, execute, runId = null, receiptId = null
}) {
  const plan = resolveDefaultLifecyclePlan(stage, { root: rootContext, web });
  if (typeof execute !== "function") throw new Error("Default lifecycle executor is missing.");
  if ((runId === null) !== (receiptId === null)
    || (runId !== null && (!UUID_PATTERN.test(runId) || receiptId !== plan.receiptId))) {
    throw new Error("Default lifecycle invocation binding is invalid.");
  }
  if (!Array.isArray(packageIdentities) || packageIdentities.length !== 2
    || packageIdentities.some((identity, index) => identity?.path !== ["package.json", "apps/web/package.json"][index]
      || !Number.isSafeInteger(identity.rawBytes) || identity.rawBytes <= 0
      || typeof identity.rawSha256 !== "string" || !/^[0-9a-f]{64}$/u.test(identity.rawSha256))) {
    throw new Error("Default lifecycle package identities are missing or invalid.");
  }
  const startedAt = new Date().toISOString();
  const authorization = executionAuthorization(registry);
  const phases = [];
  for (const step of plan.steps) {
    if (!step.required) {
      phases.push(inactivePhase(step, step.absentStatus));
    } else if (authorization.status === "blocked") {
      phases.push(inactivePhase(step, "blocked", "Complete application graph requires restricted source; execution was not authorized."));
    } else if (step.id === "program" && stage === "build"
      && phases.find((phase) => phase.id === "workspace-prebuild")?.status !== "passed") {
      phases.push(inactivePhase(step, "blocked", "Workspace prebuild did not pass; Vite was not started."));
    } else {
      // Governance is an independent evidence phase. Its nonzero/unknown result
      // remains a failed aggregate requirement but does not impersonate a
      // failed tool invocation or suppress an otherwise authorized tool.
      phases.push(await executeLifecyclePhase(step, execute));
    }
  }
  const passed = phases.every((phase) => !phase.required || phase.status === "passed");
  const status = passed ? "passed" : authorization.status === "blocked" ? "blocked" : "failed";
  return {
    schemaVersion: 1, recordType: "default_npm_lifecycle_phase_report", stage,
    originalCommand: [...plan.originalCommand], runId, receiptId,
    packageIdentities: packageIdentities.map(({ path, rawBytes, rawSha256 }) => ({ path, rawBytes, rawSha256 })),
    planDigest: computeDefaultLifecyclePlanDigest(plan),
    startedAt, completedAt: new Date().toISOString(), terminal: true,
    authorization, phases,
    programStarted: phases.find((phase) => phase.id === "program").started,
    aggregateExitCode: passed ? 0 : status === "blocked" ? 2 : 1,
    status
  };
}

function lifecycleChildEnvironment() {
  const environment = { ...process.env };
  for (const key of LIFECYCLE_ENVIRONMENT_KEYS) delete environment[key];
  return environment;
}

async function resolveLifecycleNpmCli(packageJson) {
  // Resolve the installed npm beside the running Node binary, not a caller
  // supplied executable or shell command. Its declared version must agree.
  const require = createRequire(process.execPath);
  const metadataPath = require.resolve("npm/package.json");
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  if (metadata.name !== "npm" || packageJson.packageManager !== `npm@${metadata.version}`
    || metadata.bin?.npm !== "bin/npm-cli.js") {
    throw new Error("Pinned npm identity or binary metadata does not match the root package.");
  }
  return path.resolve(path.dirname(metadataPath), metadata.bin.npm);
}

async function executeDefaultLifecycleStep(step, rootPackage) {
  let entry;
  let args;
  try {
    if (step.kind === "npm") {
      entry = await resolveLifecycleNpmCli(rootPackage);
      args = step.argv;
    } else if (step.kind === "program") {
      entry = await resolveDiagnosticProgram(step.spec);
      args = step.spec.args;
    } else throw new Error("Default lifecycle attempted an unconfigured phase.");
  } catch (error) {
    return { started: false, exitCode: null, signal: null, error: error.message };
  }
  return new Promise((resolve) => {
    let spawned = false;
    let finished = false;
    const finish = (value) => {
      if (finished) return;
      finished = true;
      resolve(value);
    };
    let child;
    try {
      child = spawn(process.execPath, [entry, ...args], {
        cwd: path.resolve(root, step.cwd), env: lifecycleChildEnvironment(),
        stdio: "inherit", shell: false, windowsHide: true
      });
    } catch (error) {
      finish({ started: false, exitCode: null, signal: null, error: error.message });
      return;
    }
    child.once("spawn", () => { spawned = true; });
    child.once("error", (error) => finish({ started: spawned, exitCode: null, signal: null, error: error.message }));
    child.once("close", (exitCode, signal) => finish({ started: spawned, exitCode, signal, error: null }));
  });
}

function lifecycleInvocationContext(stage) {
  const values = LIFECYCLE_ENVIRONMENT_KEYS.map((key) => process.env[key] ?? "");
  if (values.every((value) => value === "")) return { runId: null, receiptId: null, output: null };
  const [runId, receiptId, output] = values;
  if (values.some((value) => value === "") || !UUID_PATTERN.test(runId)
    || receiptId !== DEFAULT_LIFECYCLE_STAGE_COMMANDS[stage]?.receiptId || !path.isAbsolute(output)) {
    throw new Error("Default lifecycle report context is incomplete or invalid.");
  }
  return { runId, receiptId, output };
}

async function lifecycleMain() {
  const stage = process.argv[3];
  let report;
  try {
    if (process.argv.length !== 4) throw new Error("Usage: node scripts/run-diagnostic-stage.mjs lifecycle typecheck|vitest|build");
    const context = lifecycleInvocationContext(stage);
    const inputs = await loadDefaultLifecycleInputs(root);
    const registry = JSON.parse(await readFile(path.join(root, "docs/release/known-restricted-blockers.v1.json"), "utf8"));
    report = await runDefaultLifecycleStage(stage, {
      ...inputs, registry, runId: context.runId, receiptId: context.receiptId,
      execute: (step) => executeDefaultLifecycleStep(step, inputs.root.packageJson)
    });
    const after = await loadDefaultLifecycleInputs(root);
    if (JSON.stringify(after.packageIdentities) !== JSON.stringify(inputs.packageIdentities)
      || computeDefaultLifecyclePlanDigest(resolveDefaultLifecyclePlan(stage, after)) !== report.planDigest) {
      throw new Error("Default lifecycle package inputs or fixed plan changed during execution.");
    }
    if (context.output !== null) {
      // The parent supplies a unique, previously unused location. Never read or
      // replace an earlier invocation's report. Partial writes cannot pass the
      // parent's complete-report validation after this child exits.
      const handle = await open(context.output, "wx");
      try { await handle.writeFile(`${JSON.stringify(report, null, 2)}\n`, "utf8"); await handle.sync(); }
      finally { await handle.close(); }
    }
  } catch (error) {
    report = {
      schemaVersion: 1, recordType: "default_npm_lifecycle_phase_report", stage,
      terminal: false, programStarted: null, aggregateExitCode: 1, status: "failed",
      error: error instanceof Error ? error.message : "Default lifecycle could not produce a complete report."
    };
  }
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const phases = report.phases?.map((phase) => `${phase.id}: ${phase.status}; started=${phase.started}; exit=${phase.exitCode}`).join("\n") ?? report.error;
    await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `\n### ${stage} default lifecycle\n\nAggregate: **${report.status}**; program started: **${report.programStarted}**.\n\n${phases}\n`);
  }
  process.exitCode = report.aggregateExitCode;
}

async function main() {
  const stage = process.argv[2];
  let report;
  try {
    if (process.argv.length !== 3) throw new Error("Usage: node scripts/run-diagnostic-stage.mjs typecheck|vitest|build");
    const registry = JSON.parse(await readFile(path.join(root, "docs/release/known-restricted-blockers.v1.json"), "utf8"));
    report = await runDiagnosticStage(stage, { registry, execute: executeProgram });
  } catch (error) {
    report = { stage, phase: "authorization", status: "failed", programStarted: false,
      exitCode: 1, error: error.message };
  }
  console.log(JSON.stringify(report, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `\n### ${stage} diagnostic\n\nStatus: **${report.status}**; phase: ${report.phase}; program started: **${report.programStarted}**.\n\n${report.reason ?? report.error ?? "Full program exit recorded; this does not establish release authorization."}\n`);
  }
  process.exitCode = report.exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "lifecycle") await lifecycleMain();
  else await main();
}
