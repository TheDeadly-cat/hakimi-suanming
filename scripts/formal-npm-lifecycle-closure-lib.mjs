import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function freezePlan(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freezePlan(child);
    Object.freeze(value);
  }
  return value;
}

export const DEFAULT_LIFECYCLE_STAGE_COMMANDS = freezePlan({
  typecheck: {
    receiptId: "typecheck", originalCommand: ["npm", "run", "typecheck"],
    coordinatorCommand: "node scripts/run-diagnostic-stage.mjs lifecycle typecheck"
  },
  vitest: {
    receiptId: "unit", originalCommand: ["npm", "test"],
    coordinatorCommand: "node scripts/run-diagnostic-stage.mjs lifecycle vitest"
  },
  build: {
    receiptId: "build", originalCommand: ["npm", "run", "build"],
    coordinatorCommand: "node scripts/run-diagnostic-stage.mjs lifecycle build"
  }
});

const DEFAULT_PROGRAMS = freezePlan({
  typecheck: { command: "tsc --noEmit -p tsconfig.json", spec: {
    package: "typescript", binary: "tsc", args: ["--noEmit", "-p", "tsconfig.json"], cwd: "."
  } },
  vitest: { command: "vitest run --config apps/web/vitest.config.ts", spec: {
    package: "vitest", binary: "vitest", args: ["run", "--config", "apps/web/vitest.config.ts"], cwd: "."
  } },
  build: { command: "vite build --configLoader runner", spec: {
    package: "vite", binary: "vite", args: ["build", "--configLoader", "runner"], cwd: "apps/web"
  } }
});
const WEB_PREBUILD_COMMAND = "npm --prefix ../.. run check:historical-natal-build-attestation";

// Only these three migrated root lifecycles are coordinated. Unknown hooks are
// rejected rather than omitted or executed twice by npm and the coordinator.
export function resolveDefaultLifecyclePlan(stage, { root, web }) {
  if (!Object.hasOwn(DEFAULT_LIFECYCLE_STAGE_COMMANDS, stage)
    || root?.path !== "package.json" || web?.path !== "apps/web/package.json"
    || !isRecord(root.packageJson?.scripts) || !isRecord(web.packageJson?.scripts)
    || web.packageJson.name !== "@hakimi/web") {
    throw new Error("Default lifecycle requires a fixed stage and root/web package contexts.");
  }
  const rootScripts = root.packageJson.scripts;
  for (const [key, scriptName] of [["typecheck", "typecheck"], ["vitest", "test"], ["build", "build"]]) {
    if (rootScripts[scriptName] !== DEFAULT_LIFECYCLE_STAGE_COMMANDS[key].coordinatorCommand
      || Object.hasOwn(rootScripts, `pre${scriptName}`)
      || Object.hasOwn(rootScripts, `post${scriptName}`)) {
      throw new Error(`Default lifecycle command or root pre/post hook changed: ${scriptName}.`);
    }
  }
  if (rootScripts["check:current-governance"] !== "npm run check:current-boundaries && npm run check:release-governance"
    || web.packageJson.scripts.prebuild !== WEB_PREBUILD_COMMAND
    || web.packageJson.scripts.build !== DEFAULT_PROGRAMS.build.command
    || Object.hasOwn(web.packageJson.scripts, "postbuild")) {
    throw new Error("Default lifecycle governance or workspace build hooks changed.");
  }
  const identity = DEFAULT_LIFECYCLE_STAGE_COMMANDS[stage];
  const program = DEFAULT_PROGRAMS[stage];
  return freezePlan({
    schemaVersion: 1, stage, ...identity,
    steps: [
      { id: "governance", required: true, kind: "npm", cwd: ".",
        command: "npm run check:current-governance", argv: ["run", "check:current-governance"] },
      stage === "build"
        ? { id: "workspace-prebuild", required: true, kind: "npm", cwd: "apps/web",
          command: WEB_PREBUILD_COMMAND, argv: ["--prefix", "../..", "run", "check:historical-natal-build-attestation"] }
        : { id: "workspace-prebuild", required: false, kind: "none", cwd: "apps/web",
          command: null, absentStatus: "not-applicable" },
      { id: "program", required: true, kind: "program", cwd: program.spec.cwd,
        command: program.command, spec: program.spec },
      { id: "workspace-postbuild", required: false, kind: "none", cwd: "apps/web",
        command: null, absentStatus: "not-configured" },
      { id: "root-post", required: false, kind: "none", cwd: ".",
        command: null, absentStatus: "not-configured" }
    ]
  });
}

export function computeDefaultLifecyclePlanDigest(plan) {
  function ordered(value) {
    if (Array.isArray(value)) return value.map(ordered);
    if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])]));
    return value;
  }
  return createHash("sha256").update(JSON.stringify(ordered(plan)), "utf8").digest("hex");
}

export async function loadDefaultLifecycleInputs(rootDirectory = workspaceRoot) {
  const directory = path.resolve(rootDirectory);
  const contexts = [];
  const packageIdentities = [];
  for (const relativePath of ["package.json", "apps/web/package.json"]) {
    const handle = await open(path.resolve(directory, relativePath), "r");
    let bytes;
    try {
      const before = await handle.stat({ bigint: true });
      if (!before.isFile() || before.size <= 0n || before.size > 2_000_000n) {
        throw new Error(`Default lifecycle package input is not a bounded regular file: ${relativePath}.`);
      }
      bytes = await handle.readFile();
      const after = await handle.stat({ bigint: true });
      if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
        || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs
        || BigInt(bytes.length) !== after.size) {
        throw new Error(`Default lifecycle package input changed while reading: ${relativePath}.`);
      }
    } finally { await handle.close(); }
    const packageJson = JSON.parse(bytes.toString("utf8"));
    if (!isRecord(packageJson)) throw new Error(`Invalid package object: ${relativePath}.`);
    contexts.push({ path: relativePath, packageJson });
    packageIdentities.push({ path: relativePath, rawBytes: bytes.length,
      rawSha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return { root: contexts[0], web: contexts[1], packageIdentities };
}

function splitReachableShellSegments(commandText, label) {
  if (typeof commandText !== "string" || commandText.trim().length === 0) {
    throw new Error(`Formal npm closure command is missing: ${label}.`);
  }
  if (/[\r\n`]/u.test(commandText)) {
    throw new Error(`Formal npm closure command uses unsupported shell syntax: ${label}.`);
  }
  return commandText.split(/\s*(?:&&|\|\||;)\s*/u).filter(Boolean);
}

function parseReachableNpmInvocation(segment, label) {
  const trimmed = segment.trim();
  const npmStart = trimmed.match(/^npm(?:\.cmd)?(?:\s|$)/iu);
  if (!npmStart) {
    if (/\bnpm(?:\.cmd)?\b/iu.test(trimmed)) {
      throw new Error(`Formal npm closure cannot resolve an embedded npm invocation: ${label}.`);
    }
    return null;
  }
  const tokens = trimmed.split(/\s+/u).slice(1);
  let prefix = null;
  let workspace = null;
  let ifPresent = false;
  const positional = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--") {
      throw opaqueTerminalCommandError(`${label} forwards unmodeled npm arguments`);
    }
    if (token === "--prefix") {
      if (prefix !== null || !tokens[index + 1]) {
        throw new Error(`Formal npm closure has an invalid --prefix selector: ${label}.`);
      }
      prefix = tokens[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--prefix=")) {
      if (prefix !== null || token.length === "--prefix=".length) {
        throw new Error(`Formal npm closure has an invalid --prefix selector: ${label}.`);
      }
      prefix = token.slice("--prefix=".length);
      continue;
    }
    if (token === "--workspace" || token === "-w") {
      if (workspace !== null || !tokens[index + 1]) {
        throw new Error(`Formal npm closure has an invalid workspace selector: ${label}.`);
      }
      workspace = tokens[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--workspace=")) {
      if (workspace !== null || token.length === "--workspace=".length) {
        throw new Error(`Formal npm closure has an invalid workspace selector: ${label}.`);
      }
      workspace = token.slice("--workspace=".length);
      continue;
    }
    if (token === "--if-present") {
      ifPresent = true;
      continue;
    }
    if (token === "--silent") continue;
    if (token === "--workspaces" || token === "-ws" || token.startsWith("--workspaces=")) {
      throw new Error(`Formal npm closure refuses an ambiguous all-workspaces selector: ${label}.`);
    }
    positional.push(token);
  }
  let scriptName;
  if (positional[0] === "test" || positional[0] === "t") {
    if (positional.length !== 1) {
      throw new Error(`Formal npm test invocation is ambiguous: ${label}.`);
    }
    scriptName = "test";
  } else if (positional[0] === "run" || positional[0] === "run-script") {
    if (positional.length !== 2 || !/^[a-z0-9:_-]+$/iu.test(positional[1])) {
      throw new Error(`Formal npm run invocation is ambiguous: ${label}.`);
    }
    scriptName = positional[1];
  } else {
    throw new Error(`Formal npm closure encountered unsupported npm grammar: ${label}.`);
  }
  return Object.freeze({ scriptName, prefix, workspace, ifPresent });
}

const STATIC_TERMINAL_COMMAND_ALLOWLIST = new Set([
  "node --test scripts/release-evidence.test.mjs scripts/verify-deployed-security-headers.test.mjs scripts/rollback-evidence.test.mjs scripts/deployed-pwa-evidence.test.mjs scripts/deployed-pwa-evidence-v2.test.mjs scripts/deployed-pwa-evidence-v3.test.mjs",
  "node ../../scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json",
  "node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json",
  "node packages/bazi-core/scripts/verify-historical-natal-runtime-closure.mjs --check",
  "node packages/bazi-core/scripts/verify-historical-natal-source-lock.mjs",
  "node scripts/verify-history-checkpoint.mjs",
  "node scripts/verify-current-index.mjs",
  "node scripts/verify-current-index-status.mjs",
  "node scripts/verify-bazi-knowledge-core-identity-rebound-binding-readiness.mjs",
  "node scripts/verify-bazi-engineering-binding-candidates.mjs",
  "node scripts/resolve-bazi-current-domain-manifest.mjs",
  "node scripts/resolve-bazi-current-expert-review-packet.mjs",
  "node scripts/verify-bazi-source-binding-candidates.mjs",
  "node scripts/verify-bazi-source-rights-candidates.mjs",
  "node scripts/verify-built-release-storage-manifest.mjs dist/web",
  "node scripts/verify-current-independent-domain-inventory.mjs",
  "node scripts/verify-current-independent-source-inventory.mjs",
  "node scripts/verify-release-governance.mjs",
  "node scripts/verify-system-contract-draft-boundaries.mjs",
  "node scripts/verify-web-storage-import-boundary.mjs",
  "playwright test --config apps/web/e2e/playwright.orphaned-v13-recovery.config.ts",
  "playwright test --config apps/web/playwright.cross-schema-v13-v16.config.ts",
  "playwright test --config apps/web/playwright.release-backup-artifact.config.ts",
  "playwright test --config apps/web/playwright.release-boot-artifact.config.ts",
  "playwright test --config apps/web/playwright.release-pwa-artifact.config.ts",
  "playwright test --config apps/web/playwright.release-web-v1-artifact.config.ts",
  "tsc --noEmit -p tsconfig.json",
  "vite build --configLoader runner",
  "vite preview --config vite.release-artifact-preview.config.ts --configLoader runner",
  "vitest run --config apps/web/vitest.config.ts"
]);

export const FORMAL_NPM_STATIC_TERMINAL_COMMAND_COUNT =
  STATIC_TERMINAL_COMMAND_ALLOWLIST.size;

function opaqueTerminalCommandError(label) {
  const error = new Error(
    `Formal npm closure refuses an opaque or dynamic terminal command: ${label}.`
  );
  error.code = "FORMAL_NPM_OPAQUE_TERMINAL_COMMAND";
  return error;
}

function isReachableTerminalCommandModeled(segment) {
  return STATIC_TERMINAL_COMMAND_ALLOWLIST.has(segment.trim());
}

function compareTuple(left, right) {
  for (const key of ["manifestPath", "scriptName", "command"]) {
    if (left[key] < right[key]) return -1;
    if (left[key] > right[key]) return 1;
  }
  return 0;
}

export function resolveFormalNpmLifecycleClosure(
  requiredReceiptCommands,
  { root, web, embeddedCommands = [] }
) {
  if (!root?.packageJson
    || !web?.packageJson
    || typeof root.path !== "string"
    || typeof web.path !== "string"
    || !Array.isArray(embeddedCommands)
    || embeddedCommands.some((command) => typeof command !== "string")) {
    throw new Error("Formal npm closure package contexts are invalid.");
  }
  const contexts = [root, web].map((context) => Object.freeze({
    ...context,
    directory: path.resolve(workspaceRoot, path.dirname(context.path)),
    name: context.packageJson.name ?? null
  }));
  const rootContext = contexts.find((context) =>
    context.path.split(path.sep).join("/") === "package.json"
  ) ?? contexts[0];
  const references = [];
  const observe = (kind, label, value) => {
    references.push(Object.freeze({ kind, label, value }));
  };
  const contextForInvocation = (current, invocation, label) => {
    let selected = current;
    if (invocation.prefix !== null) {
      const targetDirectory = path.resolve(current.directory, invocation.prefix);
      const matches = contexts.filter((context) => context.directory === targetDirectory);
      if (matches.length !== 1) {
        throw new Error(`Formal npm closure cannot resolve --prefix for ${label}.`);
      }
      [selected] = matches;
    }
    if (invocation.workspace !== null) {
      const matches = contexts.filter((context) =>
        context.name === invocation.workspace
        || context.path === invocation.workspace
        || path.dirname(context.path).split(path.sep).join("/") === invocation.workspace
      );
      if (matches.length !== 1) {
        throw new Error(`Formal npm closure cannot resolve workspace for ${label}.`);
      }
      [selected] = matches;
    }
    return selected;
  };
  const visited = new Set();
  const missingOptional = new Set();
  const reachableScripts = [];
  const unmodeledTerminalCommands = [];
  const scanCommand = (commandText, context, label) => {
    observe("command", label, commandText);
    for (const [index, segment] of splitReachableShellSegments(commandText, label).entries()) {
      const coordinated = Object.entries(DEFAULT_LIFECYCLE_STAGE_COMMANDS).find(
        ([, identity]) => segment.trim() === identity.coordinatorCommand
      );
      if (coordinated) {
        if (context.path !== "package.json") throw new Error("Default lifecycle coordinator must run in the root package.");
        const plan = resolveDefaultLifecyclePlan(coordinated[0], { root, web });
        observe("coordinator-plan", label, computeDefaultLifecyclePlanDigest(plan));
        for (const step of plan.steps) {
          if (step.kind === "none") continue;
          const stepContext = contexts.find((entry) => entry.path === (step.cwd === "." ? "package.json" : "apps/web/package.json"));
          if (step.id === "workspace-prebuild") {
            // This is npm's prebuild script body, not a new invocation of the
            // prebuild script with invented preprebuild/postprebuild hooks.
            scanScript(stepContext, "prebuild", `${label} -> coordinator ${step.id}`, true);
          } else if (step.id === "program" && plan.stage === "build") {
            scanScript(stepContext, "build", `${label} -> coordinator ${step.id}`, true);
          } else {
            scanCommand(step.command, stepContext, `${label} -> coordinator ${step.id}`);
          }
        }
        continue;
      }
      const invocation = parseReachableNpmInvocation(segment, `${label} segment ${index + 1}`);
      if (!invocation) {
        if (!isReachableTerminalCommandModeled(segment)) {
          unmodeledTerminalCommands.push(Object.freeze({
            label: `${label} segment ${index + 1}`,
            command: segment.trim()
          }));
        }
        continue;
      }
      const targetContext = contextForInvocation(context, invocation, label);
      visitInvocation(targetContext, invocation.scriptName, label, invocation.ifPresent);
    }
  };
  const scanScript = (context, scriptName, label, required) => {
    const key = `${context.path}\0${scriptName}`;
    if (visited.has(key)) {
      if (required && missingOptional.has(key)) {
        throw new Error(
          `Formal npm closure required script is missing: ${context.path}#${scriptName}.`
        );
      }
      return;
    }
    visited.add(key);
    observe("script-name", `${label} -> ${context.path}`, scriptName);
    const command = context.packageJson.scripts?.[scriptName];
    if (command === undefined) {
      if (required) {
        throw new Error(`Formal npm closure required script is missing: ${context.path}#${scriptName}.`);
      }
      missingOptional.add(key);
      return;
    }
    if (typeof command !== "string" || command.trim().length === 0) {
      throw new Error(`Formal npm closure script is malformed: ${context.path}#${scriptName}.`);
    }
    reachableScripts.push(Object.freeze({
      manifestPath: context.path.split(path.sep).join("/"),
      scriptName,
      command
    }));
    scanCommand(command, context, `${label} -> ${context.path}#${scriptName}`);
  };
  function visitInvocation(context, scriptName, label, ifPresent = false) {
    scanScript(context, `pre${scriptName}`, label, false);
    scanScript(context, scriptName, label, !ifPresent);
    scanScript(context, `post${scriptName}`, label, false);
  }

  if (!isRecord(requiredReceiptCommands)) {
    throw new Error("Default v13 pre-deployment receipt policy is missing.");
  }
  for (const [receiptId, command] of Object.entries(requiredReceiptCommands)) {
    if (!Array.isArray(command) || command.some((part) => typeof part !== "string")) {
      throw new Error(`Default v13 pre-deployment receipt command is malformed: ${receiptId}.`);
    }
    const commandText = command.join(" ");
    observe("receipt", `receipt ${receiptId}`, `${receiptId} ${commandText}`);
    scanCommand(commandText, rootContext, `receipt ${receiptId}`);
  }
  for (let index = 0; index < embeddedCommands.length; index += 1) {
    scanCommand(embeddedCommands[index], rootContext, `embedded command ${index + 1}`);
  }

  return Object.freeze({
    visitedScripts: Object.freeze([...visited].sort()),
    reachableScriptTuples: Object.freeze([...reachableScripts].sort(compareTuple)),
    observedReferences: Object.freeze(references),
    unmodeledTerminalCommands: Object.freeze(unmodeledTerminalCommands),
    embeddedCommandCount: embeddedCommands.length
  });
}
