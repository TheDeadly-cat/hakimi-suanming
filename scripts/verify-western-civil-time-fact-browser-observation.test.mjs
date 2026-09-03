import assert from "node:assert/strict";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  RESTRICTED_APPS_WEB_SOURCE,
  WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE,
  WesternCivilTimeFactBrowserObservationError,
  computeWesternCivilTimeFactBrowserObservationCandidateDigest,
  isVerifiedWesternCivilTimeFactBrowserObservationCandidate,
  isWesternCivilTimeFactBrowserObservation,
  loadWesternCivilTimeFactBrowserObservationCandidate,
  verifyWesternCivilTimeFactBrowserObservation
} from "./western-civil-time-fact-browser-observation-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const cliPath = path.join(scriptDirectory, "verify-western-civil-time-fact-browser-observation.mjs");
const draftRelative = "isolated-drafts/western-civil-time-fact-browser-draft";

test("positive observation is branded, deeply frozen, and explicitly incomplete", () => {
  const result = verifyWesternCivilTimeFactBrowserObservation(workspaceRoot);
  assert.equal(isWesternCivilTimeFactBrowserObservation(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.runtimeImportGraph), true);
  assert.equal(Object.isFrozen(result.productionReachability.explicitlySkippedRestrictedPaths), true);
  assert.equal(result.runtimeModuleCount, 12);
  assert.equal(result.runtimeImportEdgeCount, 21);
  assert.equal(result.incompleteProductionReachabilityAudit, true);
  assert.equal(result.wholeRepositoryProductionUnreachableEstablished, false);
  assert.equal(result.browserRuntimeEvidenceEstablished, false);
  assert.equal(result.contentTruthEstablished, false);
  assert.equal(result.expertTruthEstablished, false);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.releaseReadyEstablished, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.deepEqual(
    result.productionReachability.explicitlySkippedRestrictedPaths,
    [RESTRICTED_APPS_WEB_SOURCE]
  );
  assert.equal(result.productionReachability.appsWebReverseReferenceCount, 0);
  assert.equal(isWesternCivilTimeFactBrowserObservation({ ...result }), false);
});

test("append-only browser observation candidate binds current source artifacts without authority", () => {
  const result = loadWesternCivilTimeFactBrowserObservationCandidate(workspaceRoot);
  assert.equal(isVerifiedWesternCivilTimeFactBrowserObservationCandidate(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.artifactBindingCount, 25);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.incompleteProductionReachabilityAudit, true);
  assert.equal(result.wholeRepositoryProductionUnreachableEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.equal(result.activeAdmissionEffect, "none");

  const candidate = JSON.parse(readFileSync(
    path.join(workspaceRoot, ...WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE.split("/")),
    "utf8"
  ));
  assert.equal(
    computeWesternCivilTimeFactBrowserObservationCandidateDigest(candidate),
    candidate.observationDigest
  );
  candidate.gateSummary.releaseReady = true;
  assert.notEqual(
    computeWesternCivilTimeFactBrowserObservationCandidateDigest(candidate),
    candidate.observationDigest
  );
  assert.equal(isVerifiedWesternCivilTimeFactBrowserObservationCandidate({ ...result }), false);
});

test("restricted apps/web file is skipped and keeps reachability audit incomplete", (context) => {
  const fixture = createFixture(context);
  writeFixture(
    fixture,
    RESTRICTED_APPS_WEB_SOURCE,
    'export const forbiddenReadSentinel = "western-civil-time-fact-browser-draft";\n'
  );
  const result = verifyWesternCivilTimeFactBrowserObservation(fixture);
  assert.equal(result.productionReachability.appsWebReverseReferenceCount, 0);
  assert.equal(result.productionReachability.appsWebReadableSourceFilesScanned, 1);
  assert.equal(result.incompleteProductionReachabilityAudit, true);
});

test("runtime import graph rejects apps/web and main-thread civil-time drift", async (context) => {
  const fixture = createFixture(context);
  const mainPath = `${draftRelative}/src/main.ts`;
  appendFixture(fixture, mainPath, '\nimport "../../../apps/web/src/main.ts";\n');
  assertObservationCode(fixture, "RUNTIME_IMPORT_GRAPH_MISMATCH");

  const secondFixture = createFixture(context);
  appendFixture(secondFixture, mainPath, '\nimport "./civil-time.ts";\n');
  assertObservationCode(secondFixture, "RUNTIME_IMPORT_GRAPH_MISMATCH");
});

test("runtime capabilities reject console, network, persistence, and dynamic evaluation", (context) => {
  for (const [label, source] of [
    ["console", "console.log('x');"],
    ["network", "fetch('/x');"],
    ["storage", "localStorage.setItem('x', 'y');"],
    ["cookie", "document.cookie = 'x=y';"],
    ["cache", "void caches;"],
    ["service-worker", "void navigator.serviceWorker;"],
    ["shared-worker", "new SharedWorker('./x.js');"],
    ["clipboard", "void navigator.clipboard;"],
    ["download", "anchor.download = 'x';"],
    ["eval", "eval('1');"]
  ]) {
    const fixture = createFixture(context);
    appendFixture(fixture, `${draftRelative}/src/protocol.ts`, `\n${source}\n`);
    assertObservationCode(fixture, "FORBIDDEN_RUNTIME_CAPABILITY", label);
  }
});

test("worker boundary rejects dynamic, duplicate, and non-module Worker construction", (context) => {
  const clientPath = `${draftRelative}/src/civil-client.ts`;
  const dynamicFixture = createFixture(context);
  replaceFixture(
    dynamicFixture,
    clientPath,
    'new URL("./civil-worker.ts", import.meta.url)',
    "new URL(workerPath, import.meta.url)"
  );
  assertObservationCode(dynamicFixture, "WORKER_BOUNDARY_INVALID");

  const duplicateFixture = createFixture(context);
  appendFixture(
    duplicateFixture,
    `${draftRelative}/src/protocol.ts`,
    '\nvoid new Worker(new URL("./civil-worker.ts", import.meta.url), { type: "module" });\n'
  );
  assertObservationCode(duplicateFixture, "WORKER_BOUNDARY_INVALID");

  const formatFixture = createFixture(context);
  replaceFixture(formatFixture, clientPath, 'type: "module"', 'type: "classic"');
  assertObservationCode(formatFixture, "WORKER_BOUNDARY_INVALID");
});

test("producer builder cannot acquire a non-worker production importer", (context) => {
  const fixture = createFixture(context);
  appendFixture(
    fixture,
    `${draftRelative}/src/main.ts`,
    '\nimport { createWesternCivilBrowserFactProjection } from "./worker-fact-projection.ts";\n'
  );
  assertObservationCode(fixture, "RUNTIME_IMPORT_GRAPH_MISMATCH");
});

test("Vite boundary rejects destructive output, non-ES workers, and weakened temp guard", (context) => {
  const configPath = `${draftRelative}/vite.config.mjs`;
  const destructiveFixture = createFixture(context);
  replaceFixture(destructiveFixture, configPath, "emptyOutDir: false", "emptyOutDir: true");
  assertObservationCode(destructiveFixture, "VITE_BUILD_BOUNDARY_INVALID");

  const workerFormatFixture = createFixture(context);
  replaceFixture(workerFormatFixture, configPath, 'format: "es"', 'format: "iife"');
  assertObservationCode(workerFormatFixture, "VITE_WORKER_FORMAT_INVALID");

  const outDirFixture = createFixture(context);
  replaceFixture(
    outDirFixture,
    configPath,
    "isStrictDescendant(temporaryRoot, outDir)",
    "outDir.startsWith(temporaryRoot)"
  );
  assertObservationCode(outDirFixture, "VITE_OUTDIR_GUARD_INVALID");
});

test("HTML boundary rejects missing form-action, name attributes, and submit buttons", (context) => {
  const htmlPath = `${draftRelative}/browser-app/index.html`;
  const cspFixture = createFixture(context);
  replaceFixture(cspFixture, htmlPath, "; form-action 'none'", "");
  assertObservationCode(cspFixture, "HTML_CSP_BOUNDARY_INVALID");

  const nameFixture = createFixture(context);
  replaceFixture(nameFixture, htmlPath, '<form id="fact-form"', '<form id="fact-form" name="facts"');
  assertObservationCode(nameFixture, "HTML_NAME_ATTRIBUTE_FORBIDDEN");

  const buttonFixture = createFixture(context);
  replaceFixture(
    buttonFixture,
    htmlPath,
    'id="run-chain" class="primary-button" type="button"',
    'id="run-chain" class="primary-button" type="submit"'
  );
  assertObservationCode(buttonFixture, "HTML_RUN_BUTTON_INVALID");
});

test("readable apps/web reverse reference fails closed", (context) => {
  const fixture = createFixture(context);
  writeFixture(
    fixture,
    "apps/web/src/reverse-reference.ts",
    'import "../../../isolated-drafts/western-civil-time-fact-browser-draft/src/main.ts";\n'
  );
  assertObservationCode(fixture, "PRODUCTION_REVERSE_REFERENCE_OBSERVED");
});

test("CLI accepts zero operands and rejects operands, NODE_OPTIONS, and NODE_PATH", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  const success = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: cleanEnv
  });
  assert.equal(success.status, 0, success.stderr);
  const summary = JSON.parse(success.stdout);
  assert.equal(summary.incompleteProductionReachabilityAudit, true);
  assert.equal(summary.wholeRepositoryProductionUnreachableEstablished, false);

  const operand = spawnSync(process.execPath, [cliPath, "extra"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: cleanEnv
  });
  assert.equal(operand.status, 2);
  assert.match(operand.stderr, /OPERANDS_FORBIDDEN/u);

  for (const variable of ["NODE_OPTIONS", "NODE_PATH"]) {
    const env = { ...cleanEnv, [variable]: "" };
    const rejected = spawnSync(process.execPath, [cliPath], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env
    });
    assert.equal(rejected.status, 2, variable);
    assert.match(rejected.stderr, /NODE_ENV_FORBIDDEN/u);
  }
});

function createFixture(context) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "hakimi-western-observation-test-"));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  cpSync(
    path.join(workspaceRoot, ...draftRelative.split("/")),
    path.join(fixture, ...draftRelative.split("/")),
    { recursive: true }
  );
  for (const relativePath of [
    "packages/tzdb-core/src/index.ts",
    "packages/tzdb-core/src/packed-resolver.ts",
    "packages/tzdb-core/src/artifacts/iana-2025b.ts",
    "packages/western-astrology-contracts-draft/src/civil-input.ts"
  ]) {
    const destination = path.join(fixture, ...relativePath.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(workspaceRoot, ...relativePath.split("/")), destination);
  }
  writeFixture(fixture, "apps/web/src/main.ts", "export const appBoundary = true;\n");
  writeFixture(fixture, RESTRICTED_APPS_WEB_SOURCE, "throw new Error('must never be read');\n");
  return fixture;
}

function writeFixture(fixture, relativePath, source) {
  const destination = path.join(fixture, ...relativePath.split("/"));
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, source, "utf8");
}

function appendFixture(fixture, relativePath, source) {
  const target = path.join(fixture, ...relativePath.split("/"));
  writeFileSync(target, `${readFileSync(target, "utf8")}${source}`, "utf8");
}

function replaceFixture(fixture, relativePath, search, replacement) {
  const target = path.join(fixture, ...relativePath.split("/"));
  const source = readFileSync(target, "utf8");
  assert.ok(source.includes(search), `${relativePath} did not contain mutation target`);
  writeFileSync(target, source.replace(search, replacement), "utf8");
}

function assertObservationCode(fixture, expectedCode, label = expectedCode) {
  assert.throws(
    () => verifyWesternCivilTimeFactBrowserObservation(fixture),
    (error) => error instanceof WesternCivilTimeFactBrowserObservationError
      && error.code === expectedCode,
    label
  );
}
