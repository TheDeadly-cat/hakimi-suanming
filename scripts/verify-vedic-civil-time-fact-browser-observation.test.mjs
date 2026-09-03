import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RESTRICTED_APPS_WEB_SOURCE,
  VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE,
  VedicCivilTimeFactBrowserObservationError,
  buildExpectedVedicCivilTimeFactBrowserObservationCandidate,
  computeVedicCivilTimeFactBrowserObservationCandidateDigest,
  isVedicCivilTimeFactBrowserObservation,
  isVerifiedVedicCivilTimeFactBrowserObservationCandidate,
  loadVedicCivilTimeFactBrowserObservationCandidate,
  serializeVedicCivilTimeFactBrowserObservationCandidate,
  summarizeVedicCivilTimeFactBrowserObservation,
  vedicCivilTimeFactBrowserObservationTestOnly,
  verifyVedicCivilTimeFactBrowserObservation,
  verifyVedicCivilTimeFactBrowserObservationCandidate
} from "./vedic-civil-time-fact-browser-observation-lib.mjs";

const testPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(testPath), "..");
const draftRelative = "isolated-drafts/vedic-civil-time-fact-browser-draft";
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-vedic-civil-time-fact-browser-observation.mjs"
);

test("current Vedic draft passes the exact static fact-only boundary", () => {
  const result = verifyVedicCivilTimeFactBrowserObservation(workspaceRoot);
  assert.equal(isVedicCivilTimeFactBrowserObservation(result), true);
  assert.equal(result.runtimeModuleCount, 13);
  assert.equal(result.runtimeImportEdgeCount, 31);
  assert.equal(result.draftRuntimeSourceFileCount, 10);
  assert.equal(result.runtimeSourceIdentityCount, 15);
  assert.equal(result.sameBufferByteLengthSha256AndStrictUtf8Verified, true);
  assert.equal(result.worker.workerOnlyTzdbReachabilityEstablished, true);
  assert.equal(result.mainThread.civilTimeRuntimeImportObservedOnMainOrClient, false);
  assert.equal(result.mainThread.tzdbRuntimeImportObservedOnMainOrClient, false);
  assert.equal(result.build.lockedBuildInputCount, 17);
  assert.equal(result.build.emittedNoticeCount, 3);
  assert.equal(result.build.manifestEnumeratedOutputFileCount, 11);
  assert.equal(result.build.finalBuildEnvelopeFileCount, 12);
  assert.equal(result.build.previewRevalidatesManifestAndExactEnvelope, true);
  assert.equal(result.build.emptyOutDir, false);
  assert.equal(result.build.explicitTemporaryOutDirRequired, true);
  assert.equal(
    result.build.outputDirectoryIdentityRevalidatedAtBuildStartAndCloseBundle,
    true
  );
  assert.equal(result.html.cspConnectSrcNone, true);
  assert.equal(result.html.cspFormActionNone, true);
  assert.equal(result.html.formAssociatedNameAttributeCount, 0);
  assert.equal(result.html.allButtonTypes, "button");
  assert.equal(result.productionReachability.appsWebReverseReferenceCount, 0);
  assert.deepEqual(
    result.productionReachability.explicitlySkippedRestrictedPaths,
    [RESTRICTED_APPS_WEB_SOURCE]
  );
  assert.equal(result.incompleteProductionReachabilityAudit, true);
  assert.equal(result.wholeRepositoryProductionUnreachableEstablished, false);
  assert.equal(result.browserRuntimeEvidenceEstablished, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(isVedicCivilTimeFactBrowserObservation({ ...result }), false);
});

test("candidate builder binds two identical builds, one browser observation, and 25 artifacts", () => {
  const evidence = vedicCivilTimeFactBrowserObservationTestOnly.makeTestEvidence();
  const candidate =
    buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
      workspaceRoot,
      evidence
    );
  assert.equal(
    isVerifiedVedicCivilTimeFactBrowserObservationCandidate(candidate),
    true
  );
  assert.equal(candidate.buildOutputIdentities.length, 2);
  assert.equal(
    candidate.buildOutputIdentities[0].outputIdentityDigest,
    candidate.buildOutputIdentities[1].outputIdentityDigest
  );
  assert.equal(candidate.artifactBindingCount, 25);
  assert.equal(candidate.formalContext.boundLedgerCount, 7);
  assert.equal(candidate.evidenceAccounts.length, 7);
  assert.equal(candidate.gateSummary.bindingRequired, 38);
  assert.equal(candidate.gateSummary.bindingFrozenVerified, 0);
  assert.equal(candidate.authorityBoundary.publicReleaseAuthorized, false);
  assert.equal(candidate.dataHandling.candidateDigestIsAnonymous, false);
  assert.equal(candidate.dataHandling.noLogNoPersistNoPublishBoundary, true);
  assert.equal(candidate.observationBoundary.mutationEpochClaimed, false);
  assert.equal(candidate.scopeBoundary.daylightSavingClassificationEstablished, false);
  assert.equal(candidate.browserObservation.networkProbePerformed, false);
  assert.equal(candidate.browserObservation.networkRequestCountObserved, null);
  assert.equal(candidate.browserObservation.storageInspectionProhibited, true);
  assert.equal(candidate.browserObservation.storageMutationObserved, null);
  assert.equal(candidate.browserObservation.cookieInspectionProhibited, true);
  assert.equal(candidate.browserObservation.cookieMutationObserved, null);
  assert.equal(
    candidate.browserObservation.requestDigestBindingBrowserObserved,
    false
  );
  assert.equal(
    candidate.observationDigest,
    computeVedicCivilTimeFactBrowserObservationCandidateDigest(candidate)
  );
  const verified = verifyVedicCivilTimeFactBrowserObservationCandidate(
    workspaceRoot,
    JSON.parse(JSON.stringify(candidate))
  );
  assert.equal(
    isVerifiedVedicCivilTimeFactBrowserObservationCandidate(verified),
    true
  );
  const serialized =
    serializeVedicCivilTimeFactBrowserObservationCandidate(candidate);
  assert.equal(serialized.endsWith("\n"), true);
  assert.equal(serialized, serializeVedicCivilTimeFactBrowserObservationCandidate(
    JSON.parse(serialized)
  ));
  const summary = summarizeVedicCivilTimeFactBrowserObservation(verified);
  assert.equal(summary.buildOutputIdentityCount, 2);
  assert.equal(summary.browserObservationCount, 1);
  assert.equal(summary.evidenceAccountCount, 7);
  assert.equal(summary.releaseReady, false);
});

test("build evidence rejects aliasing, non-independent runs, and output drift", () => {
  const aliased = vedicCivilTimeFactBrowserObservationTestOnly.makeTestEvidence();
  aliased.buildOutputIdentities[1].artifacts =
    aliased.buildOutputIdentities[0].artifacts;
  assertCode(
    () => buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
      workspaceRoot,
      aliased
    ),
    "JSON_ALIAS_OR_CYCLE_FORBIDDEN"
  );

  const sameDirectory =
    vedicCivilTimeFactBrowserObservationTestOnly.makeTestEvidence();
  sameDirectory.buildOutputIdentities[1].outDirLeaf =
    sameDirectory.buildOutputIdentities[0].outDirLeaf;
  assertCode(
    () => buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
      workspaceRoot,
      sameDirectory
    ),
    "BUILD_OUTPUT_RUN_INDEPENDENCE_INVALID"
  );

  const drifted = vedicCivilTimeFactBrowserObservationTestOnly.makeTestEvidence();
  drifted.buildOutputIdentities[1].artifacts[0].bytes += 1;
  assertCode(
    () => buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
      workspaceRoot,
      drifted
    ),
    "BUILD_OUTPUT_DIGEST_MISMATCH"
  );
});

test("browser observation fails closed on privacy, production, scenario, and build-binding drift", () => {
  for (const mutate of [
    (evidence) => {
      evidence.browserObservation.actualPersonDataEntered = true;
    },
    (evidence) => {
      evidence.browserObservation.networkRequestCountObserved = 1;
    },
    (evidence) => {
      evidence.browserObservation.productionBrowserRuntimeEvidenceEstablished =
        true;
    },
    (evidence) => {
      evidence.browserObservation.scenarios[1].partialFactsReturned = true;
    },
    (evidence) => {
      evidence.browserObservation.sourceBuildRunId = "unknown-build";
    }
  ]) {
    const evidence =
      vedicCivilTimeFactBrowserObservationTestOnly.makeTestEvidence();
    mutate(evidence);
    assert.throws(
      () => buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
        workspaceRoot,
        evidence
      ),
      VedicCivilTimeFactBrowserObservationError
    );
  }
});

test("candidate cannot self-authorize after recomputing its digest", () => {
  const candidate = JSON.parse(JSON.stringify(
    buildExpectedVedicCivilTimeFactBrowserObservationCandidate(
      workspaceRoot,
      vedicCivilTimeFactBrowserObservationTestOnly.makeTestEvidence()
    )
  ));
  candidate.authorityBoundary.publicReleaseAuthorized = true;
  candidate.observationDigest =
    computeVedicCivilTimeFactBrowserObservationCandidateDigest(candidate);
  assertCode(
    () => verifyVedicCivilTimeFactBrowserObservationCandidate(
      workspaceRoot,
      candidate
    ),
    "OBSERVATION_CANDIDATE_AUTHORITY_ESCALATION"
  );
});

test("strict JSON and passive capture reject duplicate keys, invalid UTF-8, accessors, and custom prototypes", () => {
  assertCode(
    () => vedicCivilTimeFactBrowserObservationTestOnly.parseStrictJsonText(
      '{"a":1,"a":2}',
      "duplicate"
    ),
    "JSON_DUPLICATE_KEY"
  );
  assertCode(
    () => vedicCivilTimeFactBrowserObservationTestOnly.decodeStrictUtf8(
      Buffer.from([0xc3, 0x28]),
      "invalid"
    ),
    "UTF8_INVALID"
  );
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      throw new Error("must not execute");
    }
  });
  assertCode(
    () => vedicCivilTimeFactBrowserObservationTestOnly.captureJsonData(
      accessor,
      "accessor"
    ),
    "JSON_OBJECT_DESCRIPTOR_INVALID"
  );
  assertCode(
    () => vedicCivilTimeFactBrowserObservationTestOnly.captureJsonData(
      Object.create({ inherited: true }),
      "prototype"
    ),
    "JSON_OBJECT_PROTOTYPE_INVALID"
  );
});

test("main/client cannot import civil-time or tzdb and runtime cannot import node modules", (context) => {
  const directFixture = createFixture(context);
  appendFixture(
    directFixture,
    draftRelative + "/src/main.ts",
    '\nimport "./civil-time.ts";\n'
  );
  assertStaticCode(directFixture, "RUNTIME_IMPORT_GRAPH_MISMATCH");

  const nodeFixture = createFixture(context);
  appendFixture(
    nodeFixture,
    draftRelative + "/src/protocol.ts",
    '\nimport { createHash } from "node:crypto";\n'
  );
  assertStaticCode(nodeFixture, "RUNTIME_IMPORT_GRAPH_MISMATCH");
});

test("runtime capability scan rejects storage, network, service worker, download, and console", (context) => {
  for (const [label, source] of [
    ["storage", "void localStorage;"],
    ["member-storage", "void navigator.storage;"],
    ["member-cache", "void globalThis.caches;"],
    ["network", "void fetch('/x');"],
    ["member-network", "void globalThis.fetch;"],
    ["service-worker", "void navigator.serviceWorker;"],
    ["download", "anchor.download = 'x';"],
    ["console", "console.log('x');"]
  ]) {
    const fixture = createFixture(context);
    appendFixture(
      fixture,
      draftRelative + "/src/protocol.ts",
      "\n" + source + "\n"
    );
    assertStaticCode(fixture, "FORBIDDEN_RUNTIME_CAPABILITY", label);
  }
});

test("HTML gate rejects names, submit buttons, and weakened connect/form CSP", (context) => {
  const htmlPath = draftRelative + "/browser-app/index.html";
  const nameFixture = createFixture(context);
  replaceFixture(
    nameFixture,
    htmlPath,
    '<form id="fact-form"',
    '<form id="fact-form" name="facts"'
  );
  assertStaticCode(nameFixture, "HTML_NAME_ATTRIBUTE_FORBIDDEN");

  const buttonFixture = createFixture(context);
  replaceFixture(
    buttonFixture,
    htmlPath,
    'id="run-chain" class="primary-button" type="button"',
    'id="run-chain" class="primary-button" type="submit"'
  );
  assertStaticCode(buttonFixture, "HTML_BUTTON_BOUNDARY_INVALID");

  const cspFixture = createFixture(context);
  replaceFixture(cspFixture, htmlPath, "; connect-src 'none'", "");
  assertStaticCode(cspFixture, "HTML_CSP_BOUNDARY_INVALID");
});

test("Vite gate rejects destructive output, non-ES workers, and weakened output identity recheck", (context) => {
  const configPath = draftRelative + "/vite.config.mjs";
  const destructiveFixture = createFixture(context);
  replaceFixture(
    destructiveFixture,
    configPath,
    "emptyOutDir: false",
    "emptyOutDir: true"
  );
  assertStaticCode(destructiveFixture, "VITE_BUILD_BOUNDARY_INVALID");

  const formatFixture = createFixture(context);
  replaceFixture(formatFixture, configPath, 'format: "es"', 'format: "iife"');
  assertStaticCode(formatFixture, "VITE_WORKER_FORMAT_INVALID");

  const recheckFixture = createFixture(context);
  replaceFixture(
    recheckFixture,
    configPath,
    "assertSameOutputDirectory({ requireEmpty: false });",
    "void 0;"
  );
  assertStaticCode(recheckFixture, "VITE_BUILD_BOUNDARY_INVALID");
});

test("readable apps/web reverse reference fails closed while the restricted path stays skipped", (context) => {
  const fixture = createFixture(context);
  writeFixture(
    fixture,
    "apps/web/src/reverse-reference.ts",
    'import "../../../isolated-drafts/vedic-civil-time-fact-browser-draft/src/main.ts";\n'
  );
  assertStaticCode(fixture, "PRODUCTION_REVERSE_REFERENCE_OBSERVED");
});

test("CLI accepts the fixed candidate while missing candidate, operands, and Node injection fail closed", (context) => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;

  const missingCandidateRoot = mkdtempSync(
    path.join(os.tmpdir(), "hakimi-vedic-missing-candidate-test-")
  );
  context.after(() => rmSync(
    missingCandidateRoot,
    { recursive: true, force: true }
  ));
  assertCode(
    () => loadVedicCivilTimeFactBrowserObservationCandidate(
      missingCandidateRoot
    ),
    "SOURCE_FILE_INVALID"
  );

  assert.equal(
    existsSync(path.join(
      workspaceRoot,
      ...VEDIC_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE.split("/")
    )),
    true
  );
  const fixedCandidate = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: cleanEnv
  });
  assert.equal(
    fixedCandidate.status,
    0,
    fixedCandidate.stdout + fixedCandidate.stderr
  );
  const summary = JSON.parse(fixedCandidate.stdout);
  assert.equal(summary.candidate.activeAdmissionEffect, "none");
  assert.equal(summary.candidate.publicReleaseAuthorized, false);

  const operand = spawnSync(process.execPath, [cliPath, "extra"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: cleanEnv
  });
  assert.equal(operand.status, 2);
  assert.match(operand.stderr, /OPERANDS_FORBIDDEN/u);

  for (const variable of ["NODE_OPTIONS", "NODE_PATH"]) {
    const rejected = spawnSync(process.execPath, [cliPath], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...cleanEnv, [variable]: "" }
    });
    assert.equal(rejected.status, 2, variable);
    assert.match(rejected.stderr, /NODE_ENV_FORBIDDEN/u);
  }
});

function createFixture(context) {
  const fixture = mkdtempSync(
    path.join(os.tmpdir(), "hakimi-vedic-observation-test-")
  );
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  cpSync(
    path.join(workspaceRoot, ...draftRelative.split("/")),
    path.join(fixture, ...draftRelative.split("/")),
    {
      recursive: true,
      filter(source) {
        const name = path.basename(source);
        return name !== "node_modules" && name !== "dist";
      }
    }
  );
  for (const relativePath of [
    "packages/tzdb-core/src/index.ts",
    "packages/tzdb-core/src/packed-resolver.ts",
    "packages/tzdb-core/src/artifacts/iana-2025b.ts"
  ]) {
    const destination = path.join(fixture, ...relativePath.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(
      path.join(workspaceRoot, ...relativePath.split("/")),
      destination
    );
  }
  writeFixture(
    fixture,
    "apps/web/src/main.ts",
    "export const appBoundary = true;\n"
  );
  writeFixture(
    fixture,
    RESTRICTED_APPS_WEB_SOURCE,
    "throw new Error('must never be read');\n"
  );
  return fixture;
}

function writeFixture(fixture, relativePath, source) {
  const target = path.join(fixture, ...relativePath.split("/"));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, source, "utf8");
}

function appendFixture(fixture, relativePath, source) {
  const target = path.join(fixture, ...relativePath.split("/"));
  writeFileSync(
    target,
    readFileSync(target, "utf8") + source,
    "utf8"
  );
}

function replaceFixture(fixture, relativePath, search, replacement) {
  const target = path.join(fixture, ...relativePath.split("/"));
  const source = readFileSync(target, "utf8");
  assert.ok(source.includes(search), relativePath + " mutation target missing");
  writeFileSync(target, source.replace(search, replacement), "utf8");
}

function assertCode(callback, expectedCode, label = expectedCode) {
  assert.throws(
    callback,
    (error) => error instanceof VedicCivilTimeFactBrowserObservationError
      && error.code === expectedCode,
    label
  );
}

function assertStaticCode(fixture, expectedCode, label = expectedCode) {
  assertCode(
    () => verifyVedicCivilTimeFactBrowserObservation(fixture),
    expectedCode,
    label
  );
}
