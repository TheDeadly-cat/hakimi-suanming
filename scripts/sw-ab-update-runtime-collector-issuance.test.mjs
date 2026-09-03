import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  appendFile,
  cp,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { canonicalJson } from "./release-evidence-lib.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  buildSwAbRuntimeCollectorIssuanceFailure,
  computeSwAbRuntimeCollectorChainGenesisDigest,
  parseSwAbRuntimeCollectorIssuanceJsonBytes,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
  validateSwAbRuntimeCollectorIssuancePolicy
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-loader.mjs";
import {
  compileSwAbUpdateRuntimeCollectorIssuanceSchema
} from "./sw-ab-update-runtime-collector-issuance-schema.mjs";
import {
  createCollectorLivePageFixture,
  fixtureArtifactBindings,
  fixtureOrigin,
  writeCollectorIssuanceFixture
} from "./sw-ab-update-runtime-collector-issuance.test-fixture.mjs";
import {
  abortSwAbUpdateRuntimeCollectorIssuance,
  beginSwAbUpdateRuntimeCollectorIssuance,
  collectNextSwAbUpdateRuntimeCollectorTupleFromPage,
  finalizeSwAbUpdateRuntimeCollectorIssuance,
} from "./sw-ab-update-runtime-collector-issuance-writer.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(import.meta.dirname, "..");
const testParent = path.join(workspaceRoot, "tmp");
const testRoots = new Set();

async function createHolder(prefix = "collector-issuance-") {
  await mkdir(testParent, { recursive: true });
  const holder = await mkdtemp(path.join(testParent, prefix));
  testRoots.add(holder);
  return holder;
}

test.after(async () => {
  for (const root of testRoots) {
    const relative = path.relative(testParent, root);
    assert.notEqual(relative, "");
    assert.equal(path.isAbsolute(relative), false);
    assert.equal(relative === ".." || relative.startsWith(`..${path.sep}`), false);
    await rm(root, { recursive: true, force: true });
  }
});

async function writeRun() {
  const holder = await createHolder();
  const runRoot = path.join(holder, "run");
  const written = await writeCollectorIssuanceFixture({ workspaceRoot, runRoot });
  return { holder, runRoot, written };
}

async function collectFixtureTuple(session, tuple, options = {}) {
  const fixture = createCollectorLivePageFixture({ ...tuple, ...options });
  const result = await collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
    session,
    page: fixture.page
  });
  return Object.freeze({ fixture, result });
}

async function collectAllFixtureTuples(session) {
  const collected = [];
  for (const tuple of SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES) {
    collected.push(await collectFixtureTuple(session, tuple));
  }
  return Object.freeze(collected);
}

async function readJson(filePath, label = path.basename(filePath)) {
  return parseSwAbRuntimeCollectorIssuanceJsonBytes(await readFile(filePath), label);
}

async function rewriteCanonical(filePath, value) {
  await writeFile(filePath, `${canonicalJson(value)}\n`, "utf8");
}

function markerPath(runRoot) {
  return path.join(runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE);
}

function receiptPath(runRoot) {
  return path.join(runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE);
}

test("policy and Schema freeze v13, self-signature limits, and both false ledgers", async () => {
  const policyPath = path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json"
  );
  const schemaPath = path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json"
  );
  const policy = validateSwAbRuntimeCollectorIssuancePolicy(await readJson(policyPath, "policy"));
  compileSwAbUpdateRuntimeCollectorIssuanceSchema(await readJson(schemaPath, "schema"));
  assert.deepEqual(policy.releaseIdentity, {
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.deepEqual(policy.capabilities, {
    mutationEpochCapability: "absent_schema13",
    epoch: null
  });
  assert.deepEqual(policy.signatureBoundary, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY);
  assert.deepEqual(policy.mutationBoundary, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY);
  assert.deepEqual(policy.provenance, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE);
  assert.deepEqual(policy.authority, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY);
  assert.ok(Object.values(policy.authority).every((value) => value === false));
  assert.equal(policy.terminalState.cliExitCode, 1);
});

test("writer publishes marker, exact nested transcript, and terminal receipt before outer verification", async () => {
  const { runRoot, written } = await writeRun();
  assert.deepEqual((await readdir(runRoot)).sort(), [
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE
  ].sort());
  assert.equal((await readdir(path.join(runRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY))).length, 9);
  assert.equal(written.result.tupleCount, 8);
  assert.equal(written.result.attemptMarkerHandleHeldAcrossIssuance, true);
  assert.equal(written.result.terminalOuterVerificationCompleted, true);
  assert.equal(written.result.usableForRuntimeEvidence, false);
  assert.equal(written.result.cliExitCode, 1);
});

test("outer loader verifies the ephemeral chain without promoting freshness, replay, or runtime provenance", async () => {
  const { runRoot } = await writeRun();
  const loaded = await loadVerifiedSwAbUpdateRuntimeCollectorIssuance({
    cwd: workspaceRoot,
    bindingRoot: workspaceRoot,
    runRoot
  });
  assert.equal(loaded.result.ephemeralSelfSignatureChainVerified, true);
  assert.equal(loaded.result.collectorIssuanceProjectionVerified, true);
  assert.equal(loaded.result.phaseMajorIssuanceChainVerified, true);
  assert.equal(loaded.result.transcriptBundleBindingVerified, true);
  assert.equal(loaded.result.overlappingHeldFileEpochEstablished, true);
  assert.equal(loaded.result.attemptMarkerHandleHeldAcrossIssuance, false);
  assert.equal(loaded.result.attemptFreshnessExternallyVerified, false);
  assert.equal(loaded.result.bundleReplayResistanceVerified, false);
  assert.equal(loaded.result.runtimeCollectorProvenanceVerified, false);
  assert.equal(loaded.result.realBrowserExecutionVerified, false);
  assert.equal(loaded.result.epoch, null);
  assert.deepEqual(loaded.result.releaseIdentity, {
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.deepEqual(loaded.result.capabilities, {
    mutationEpochCapability: "absent_schema13",
    epoch: null
  });
  assert.deepEqual(loaded.result.provenance, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE);
  assert.deepEqual(loaded.result.authority, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY);
  assert.deepEqual(
    Object.keys(loaded.result.provenance).sort(),
    Object.keys(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE).sort()
  );
  assert.deepEqual(
    Object.keys(loaded.result.authority).sort(),
    Object.keys(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY).sort()
  );
  assert.equal(Object.isFrozen(loaded.result), true);
  assert.equal(Object.isFrozen(loaded.result.provenance), true);
  assert.equal(Object.isFrozen(loaded.result.authority), true);
});

test("marker and receipt expose no private key or decoded observation payload", async () => {
  const { runRoot } = await writeRun();
  const markerSource = await readFile(markerPath(runRoot), "utf8");
  const receiptSource = await readFile(receiptPath(runRoot), "utf8");
  const combined = `${markerSource}\n${receiptSource}`;
  assert.equal(/privateKey|PRIVATE KEY|pkcs8|sourceClientId|targetInfo/iu.test(combined), false);
  assert.match(markerSource, /issuerPublicKeySpkiDerBase64/u);
});

test("tuple issuance nonces follow project, slot, and phase-major continuity", async () => {
  const { runRoot } = await writeRun();
  const marker = await readJson(markerPath(runRoot));
  const receipt = await readJson(receiptPath(runRoot));
  assert.equal(receipt.tupleIssuances.length, 8);
  assert.equal(
    receipt.tupleIssuances[0].previousIssuanceDigest,
    computeSwAbRuntimeCollectorChainGenesisDigest(marker)
  );
  assert.equal(new Set(receipt.tupleIssuances.map((item) => item.sessionNonce)).size, 8);
  assert.equal(new Set(receipt.tupleIssuances.map((item) => item.challengeNonce)).size, 8);
  assert.equal(new Set(receipt.tupleIssuances.map((item) => item.browserIssuanceNonce)).size, 2);
  assert.equal(new Set(receipt.tupleIssuances.map((item) => item.browserContextIssuanceNonce)).size, 2);
  assert.equal(new Set(receipt.tupleIssuances.map((item) => item.pageIssuanceNonce)).size, 4);
  assert.deepEqual(
    receipt.tupleIssuances.map(({ sequence, projectName, phase, slot }) => ({
      sequence,
      projectName,
      phase,
      slot
    })),
    [
      [1, "msedge", "initial-a", "retained-old-a"],
      [2, "msedge", "initial-a", "reload-to-b"],
      [3, "chrome", "initial-a", "retained-old-a"],
      [4, "chrome", "initial-a", "reload-to-b"],
      [5, "msedge", "post-claim", "retained-old-a"],
      [6, "msedge", "post-claim", "reload-to-b"],
      [7, "chrome", "post-claim", "retained-old-a"],
      [8, "chrome", "post-claim", "reload-to-b"]
    ].map(([sequence, projectName, phase, slot]) => ({ sequence, projectName, phase, slot }))
  );
});

test("begin rejects caller-supplied identity fields before creating a run root", async () => {
  const holder = await createHolder();
  const runRoot = path.join(holder, "run");
  await assert.rejects(
    beginSwAbUpdateRuntimeCollectorIssuance({
      cwd: workspaceRoot,
      runRoot,
      origin: fixtureOrigin,
      artifactBindings: fixtureArtifactBindings,
      runId: `run-${"1".repeat(64)}`
    }),
    (error) => error?.code === "INPUT_INVALID"
  );
  await assert.rejects(readFile(markerPath(runRoot)), /ENOENT/u);

  const invalidOriginRoot = path.join(holder, "invalid-origin");
  let originGetterCalls = 0;
  const invalidOrigin = {};
  Object.defineProperty(invalidOrigin, "host", {
    enumerable: true,
    get() {
      originGetterCalls += 1;
      return "example.invalid";
    }
  });
  await assert.rejects(
    beginSwAbUpdateRuntimeCollectorIssuance({
      cwd: workspaceRoot,
      runRoot: invalidOriginRoot,
      origin: invalidOrigin,
      artifactBindings: fixtureArtifactBindings
    }),
    (error) => error?.code === "INPUT_INVALID"
  );
  assert.equal(originGetterCalls, 0);
  await assert.rejects(readdir(invalidOriginRoot), /ENOENT/u);

  const invalidArtifactRoot = path.join(holder, "invalid-artifact");
  const invalidArtifactBindings = structuredClone(fixtureArtifactBindings);
  invalidArtifactBindings.A.label = "C";
  await assert.rejects(
    beginSwAbUpdateRuntimeCollectorIssuance({
      cwd: workspaceRoot,
      runRoot: invalidArtifactRoot,
      origin: fixtureOrigin,
      artifactBindings: invalidArtifactBindings
    })
  );
  await assert.rejects(readdir(invalidArtifactRoot), /ENOENT/u);
});

test("session capsules reject clones, abort reuse, and repeated finalize through the live entry", async () => {
  const holder = await createHolder();
  const begin = (name) => beginSwAbUpdateRuntimeCollectorIssuance({
    cwd: workspaceRoot,
    runRoot: path.join(holder, name),
    origin: fixtureOrigin,
    artifactBindings: fixtureArtifactBindings
  });

  const cloneSession = await begin("clone");
  const clonePage = createCollectorLivePageFixture(
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[0]
  );
  await assert.rejects(
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session: { ...cloneSession },
      page: clonePage.page
    }),
    (error) => error?.code === "CAPSULE_NOT_ISSUED"
  );
  assert.deepEqual(clonePage.events, []);
  await abortSwAbUpdateRuntimeCollectorIssuance(cloneSession);

  const abortedSession = await begin("aborted");
  await abortSwAbUpdateRuntimeCollectorIssuance(abortedSession);
  const abortedPage = createCollectorLivePageFixture(
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[0]
  );
  await assert.rejects(
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session: abortedSession,
      page: abortedPage.page
    }),
    (error) => error?.code === "CAPSULE_NOT_ISSUED"
  );
  assert.deepEqual(abortedPage.events, []);

  const finalizedSession = await begin("finalized");
  await collectAllFixtureTuples(finalizedSession);
  const finalized = await finalizeSwAbUpdateRuntimeCollectorIssuance(finalizedSession);
  assert.equal(finalized.attemptMarkerHandleHeldAcrossIssuance, true);
  assert.deepEqual(finalized.provenance, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE);
  assert.deepEqual(finalized.authority, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY);
  await assert.rejects(
    finalizeSwAbUpdateRuntimeCollectorIssuance(finalizedSession),
    (error) => error?.code === "CAPSULE_NOT_ISSUED"
  );
  const finalizedPage = createCollectorLivePageFixture(
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[0]
  );
  await assert.rejects(
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session: finalizedSession,
      page: finalizedPage.page
    }),
    (error) => error?.code === "CAPSULE_NOT_ISSUED"
  );
  assert.deepEqual(finalizedPage.events, []);
});

test("same-session concurrent live collection has one winner and preserves that winner", async () => {
  const holder = await createHolder();
  const runRoot = path.join(holder, "run");
  const session = await beginSwAbUpdateRuntimeCollectorIssuance({
    cwd: workspaceRoot,
    runRoot,
    origin: fixtureOrigin,
    artifactBindings: fixtureArtifactBindings
  });
  const firstTuple = SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[0];
  const competingPages = [
    createCollectorLivePageFixture(firstTuple),
    createCollectorLivePageFixture(firstTuple)
  ];
  const outcomes = await Promise.allSettled([
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session,
      page: competingPages[0].page
    }),
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session,
      page: competingPages[1].page
    })
  ]);
  const fulfilled = outcomes.filter((entry) => entry.status === "fulfilled");
  const rejected = outcomes.filter((entry) => entry.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason?.code, "CAPSULE_REUSED");
  assert.equal(fulfilled[0].value.sequence, 1);
  assert.equal(competingPages.filter((fixture) => fixture.events.length > 0).length, 1);
  const second = await collectFixtureTuple(
    session,
    SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[1]
  );
  assert.equal(second.result.sequence, 2);
  const aborted = await abortSwAbUpdateRuntimeCollectorIssuance(session);
  assert.equal(aborted.runRootRetained, true);
});

test("decoded Page response accessors are rejected without invoking the getter", async () => {
  const holder = await createHolder();
  const runRoot = path.join(holder, "run");
  const session = await beginSwAbUpdateRuntimeCollectorIssuance({
    cwd: workspaceRoot,
    runRoot,
    origin: fixtureOrigin,
    artifactBindings: fixtureArtifactBindings
  });
  const tracker = { calls: 0 };
  const malformed = createCollectorLivePageFixture({
    ...SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES[0],
    challengeResponseAccessor: {
      key: "targetSchema",
      tracker,
      value: 13
    }
  });
  await assert.rejects(
    collectNextSwAbUpdateRuntimeCollectorTupleFromPage({
      session,
      page: malformed.page
    }),
    (error) => error?.code === "LIVE_CAPTURE_FAILED"
  );
  assert.equal(tracker.calls, 0);
  await assert.rejects(
    abortSwAbUpdateRuntimeCollectorIssuance(session),
    (error) => error?.code === "CAPSULE_NOT_ISSUED"
  );
});

test("premature finalize invalidates the capsule and leaves a discard-required marker-only root", async () => {
  const holder = await createHolder();
  const runRoot = path.join(holder, "run");
  const session = await beginSwAbUpdateRuntimeCollectorIssuance({
    cwd: workspaceRoot,
    runRoot,
    origin: fixtureOrigin,
    artifactBindings: fixtureArtifactBindings
  });
  await assert.rejects(
    finalizeSwAbUpdateRuntimeCollectorIssuance(session),
    (error) => error?.code === "TUPLE_ORDER_INVALID"
  );
  assert.deepEqual(await readdir(runRoot), [SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE]);
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({
      cwd: workspaceRoot,
      bindingRoot: workspaceRoot,
      runRoot
    }),
    (error) => error?.code === "CAPSULE_NOT_ISSUED"
  );
});

test("marker signature tampering is rejected", async () => {
  const { runRoot } = await writeRun();
  const filePath = markerPath(runRoot);
  const marker = await readJson(filePath);
  marker.markerSignatureBase64 = `${marker.markerSignatureBase64[0] === "A" ? "B" : "A"}${marker.markerSignatureBase64.slice(1)}`;
  await rewriteCanonical(filePath, marker);
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
    (error) => ["SIGNATURE_INVALID", "MARKER_CHANGED"].includes(error?.code)
  );
});

test("receipt signature tampering is rejected", async () => {
  const { runRoot } = await writeRun();
  const filePath = receiptPath(runRoot);
  const receipt = await readJson(filePath);
  receipt.receiptSignatureBase64 = `${receipt.receiptSignatureBase64[0] === "A" ? "B" : "A"}${receipt.receiptSignatureBase64.slice(1)}`;
  await rewriteCanonical(filePath, receipt);
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
    (error) => error?.code === "SIGNATURE_INVALID"
  );
});

test("tuple predecessor drift is rejected before it can masquerade as a fresh chain", async () => {
  const { runRoot } = await writeRun();
  const filePath = receiptPath(runRoot);
  const receipt = await readJson(filePath);
  receipt.tupleIssuances[0].previousIssuanceDigest = "0".repeat(64);
  await rewriteCanonical(filePath, receipt);
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
    (error) => error?.code === "CHAIN_INVALID"
  );
});

test("nested transcript byte drift is rejected by the independent transcript verifier", async () => {
  const { runRoot } = await writeRun();
  const tuplePath = path.join(
    runRoot,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
    "01-msedge-initial-a-retained-old-a.json"
  );
  const tuple = await readJson(tuplePath);
  tuple.cdpSession.preChallenge.response.targetInfo.title = "tampered decoded object";
  await rewriteCanonical(tuplePath, tuple);
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
    (error) => error?.code === "TRANSCRIPT_INVALID"
  );
});

test("extra root files are rejected", async () => {
  const { runRoot } = await writeRun();
  await writeFile(path.join(runRoot, "capture.tmp"), "partial", "utf8");
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
    (error) => error?.code === "FILE_SET_INVALID"
  );
});

test("hard-linked outer files are rejected when the filesystem supports links", async (t) => {
  const { runRoot } = await writeRun();
  const marker = markerPath(runRoot);
  const receipt = receiptPath(runRoot);
  const receiptBytes = await readFile(receipt);
  await unlink(receipt);
  try {
    await link(marker, receipt);
  } catch (error) {
    await writeFile(receipt, receiptBytes);
    t.skip(`hard links unavailable: ${error?.code ?? error}`);
    return;
  }
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
    (error) => ["FILE_INVALID", "PHYSICAL_ALIAS"].includes(error?.code)
  );
});

test("authority and Schema 13 epoch promotion are independently rejected", async (t) => {
  await t.test("authority promotion", async () => {
    const { runRoot } = await writeRun();
    const filePath = receiptPath(runRoot);
    const receipt = await readJson(filePath);
    receipt.authority.publicDeploymentAuthorized = true;
    await rewriteCanonical(filePath, receipt);
    await assert.rejects(
      loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
      (error) => error?.code === "SCHEMA_INVALID"
    );
  });
  await t.test("fabricated epoch", async () => {
    const { runRoot } = await writeRun();
    const filePath = markerPath(runRoot);
    const marker = await readJson(filePath);
    marker.capabilities.epoch = 0;
    await rewriteCanonical(filePath, marker);
    await assert.rejects(
      loadVerifiedSwAbUpdateRuntimeCollectorIssuance({ cwd: workspaceRoot, bindingRoot: workspaceRoot, runRoot }),
      (error) => error?.code === "SCHEMA_INVALID"
    );
  });
});

test("a complete copied bundle remains mechanically valid but explicitly replay-untrusted", async () => {
  const { runRoot } = await writeRun();
  const holder = await createHolder("collector-copy-");
  const copiedRoot = path.join(holder, "copied-run");
  await cp(runRoot, copiedRoot, { recursive: true, preserveTimestamps: true });
  const loaded = await loadVerifiedSwAbUpdateRuntimeCollectorIssuance({
    cwd: workspaceRoot,
    bindingRoot: workspaceRoot,
    runRoot: copiedRoot
  });
  assert.equal(loaded.result.ephemeralSelfSignatureChainVerified, true);
  assert.equal(loaded.result.attemptFreshnessExternallyVerified, false);
  assert.equal(loaded.result.bundleReplayResistanceVerified, false);
  assert.equal(loaded.result.runtimeCollectorProvenanceVerified, false);
});

test("overlapping held-file verification rejects mutation at its deterministic checkpoint", async () => {
  const { runRoot } = await writeRun();
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeCollectorIssuance({
      cwd: workspaceRoot,
      bindingRoot: workspaceRoot,
      runRoot,
      async onHeldEpochCheckpoint() {
        await appendFile(receiptPath(runRoot), " ", "utf8");
      }
    }),
    (error) => error?.code === "TERMINAL_SET_CHANGED"
  );
});

test("valid CLI output remains closed and exits one", async () => {
  const { runRoot } = await writeRun();
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        path.join(workspaceRoot, "scripts/verify-sw-ab-update-runtime-collector-issuance.mjs"),
        "--run-root",
        runRoot
      ],
      { cwd: workspaceRoot, encoding: "utf8" }
    ),
    (error) => {
      assert.equal(error.code, 1);
      const output = JSON.parse(error.stdout);
      assert.equal(output.status, "issuance_incomplete");
      assert.equal(output.ephemeralSelfSignatureChainVerified, true);
      assert.equal(output.usableForRuntimeEvidence, false);
      assert.equal(output.publicDeploymentAuthorized, false);
      return true;
    }
  );
});

test("failure output keeps every adjacent authority closed", () => {
  const failure = buildSwAbRuntimeCollectorIssuanceFailure(new Error("synthetic failure"));
  assert.equal(failure.ephemeralSelfSignatureChainVerified, false);
  assert.equal(failure.runtimeCollectorProvenanceVerified, false);
  assert.equal(failure.publicDeploymentAuthorized, false);
  assert.equal(failure.expertClaimsAuthorized, false);
  assert.equal(failure.rightsLegalConclusionAuthorized, false);
  assert.deepEqual(failure.provenance, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE);
  assert.deepEqual(failure.authority, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY);
  assert.equal(Object.isFrozen(failure.provenance), true);
  assert.equal(Object.isFrozen(failure.authority), true);
  assert.equal(failure.cliExitCode, 1);
  assert.equal(JSON.stringify(failure).includes("sourceClientId"), false);
});

test("source requirement inventory remains exact and isolated from formal receipts", () => {
  assert.equal(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS.length, 6);
  assert.deepEqual(
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS.map((entry) => entry.role),
    [
      "collector-issuance-policy",
      "collector-issuance-schema",
      "api-transcript-policy",
      "api-transcript-schema",
      "runtime-capture-policy",
      "runtime-capture-schema"
    ]
  );
  assert.equal(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY.formalReleaseEvidenceReceipt, false);
  assert.equal(SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY.defaultV13ReceiptAllowlistMember, false);
});
