import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  buildSwAbUpdateRuntimeApiTranscriptFailure,
  computeSwAbUpdateRuntimeApiTranscriptBundleDigest,
  computeSwAbUpdateRuntimeApiTranscriptBundleId,
  computeSwAbUpdateRuntimeApiTranscriptRecordDigest,
  parseSwAbUpdateRuntimeApiTranscriptJsonBytes,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
  validateSwAbUpdateRuntimeApiTranscriptPolicy
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-loader.mjs";
import {
  apiTranscriptFixtureArtifactBindings,
  apiTranscriptFixtureAttemptId,
  apiTranscriptFixtureCapturedAt,
  apiTranscriptFixtureOrigin,
  apiTranscriptFixtureRunId,
  createApiTranscriptTupleRecords,
  finalizeApiTranscriptTuple
} from "./sw-ab-update-runtime-api-transcript.test-fixture.mjs";
import {
  writeSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-writer.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(import.meta.dirname, "..");
const testParent = path.join(workspaceRoot, "tmp");
const testRoots = new Set();

async function createTestRoot() {
  await mkdir(testParent, { recursive: true });
  const root = await mkdtemp(path.join(testParent, "sw-api-transcript-"));
  testRoots.add(root);
  return root;
}

test.after(async () => {
  for (const root of testRoots) await rm(root, { recursive: true, force: true });
});

async function writeFixtureBundle(transform = (records) => records) {
  const root = await createTestRoot();
  const bundleDirectory = path.join(root, "bundle");
  const tupleRecords = transform(createApiTranscriptTupleRecords());
  await writeSwAbUpdateRuntimeApiTranscriptBundle({
    cwd: workspaceRoot,
    outputDirectory: bundleDirectory,
    runId: apiTranscriptFixtureRunId,
    attemptId: apiTranscriptFixtureAttemptId,
    capturedAt: apiTranscriptFixtureCapturedAt,
    origin: apiTranscriptFixtureOrigin,
    artifactBindings: apiTranscriptFixtureArtifactBindings,
    tupleRecords
  });
  return { root, bundleDirectory };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function rewriteCanonical(filePath, value) {
  await writeFile(filePath, `${canonicalJson(value)}\n`, "utf8");
}

async function rebindManifestTuple(bundleDirectory, index, record) {
  const tuplePath = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index]);
  await rewriteCanonical(tuplePath, record);
  const tupleBytes = await readFile(tuplePath);
  const manifestPath = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE);
  const manifest = await readJson(manifestPath);
  manifest.tupleBindings[index].size = tupleBytes.length;
  manifest.tupleBindings[index].sha256 = sha256(tupleBytes);
  manifest.tupleBindings[index].recordDigest = record.recordDigest;
  manifest.bundleDigest = computeSwAbUpdateRuntimeApiTranscriptBundleDigest(manifest);
  manifest.bundleId = computeSwAbUpdateRuntimeApiTranscriptBundleId(manifest);
  await rewriteCanonical(manifestPath, manifest);
}

async function loadBundle(bundleDirectory) {
  return loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle({
    cwd: workspaceRoot,
    bindingRoot: workspaceRoot,
    bundleDirectory
  });
}

test("policy freezes decoded-API terminology and every authority boundary", async () => {
  const policyBytes = await readFile(path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json"
  ));
  const policy = parseSwAbUpdateRuntimeApiTranscriptJsonBytes(policyBytes, "policy");
  validateSwAbUpdateRuntimeApiTranscriptPolicy(policy);
  assert.equal(policy.recordClass, "untrusted_decoded_browser_api_transcript_candidate");
  assert.equal(policy.captureSurface.cdpWireBytesCaptured, false);
  assert.equal(policy.captureSurface.browserTransportAuthenticityVerified, false);
  assert.deepEqual(policy.capabilities, {
    mutationEpochCapability: "absent_schema13",
    epoch: null
  });
  assert.ok(Object.values(policy.authority).every((value) => value === false));
});

test("writer publishes eight complete decoded API tuples before one manifest", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  const names = (await import("node:fs/promises")).readdir(bundleDirectory);
  assert.deepEqual((await names).sort(), [
    ...SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
    SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE
  ].sort());
  const first = await readJson(path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[0]));
  assert.equal(first.cdpSession.preChallenge.response.targetInfo.title,
    "complete decoded msedge retained-old-a object");
  assert.equal(Object.hasOwn(first, "pseudonymousTargetId"), false);
  assert.equal(Object.hasOwn(first, "continuityVerified"), false);
  assert.equal(Object.hasOwn(first, "derivedEvidenceDigest"), false);
});

test("loader derives the current v1 projection but leaves runtime admission closed", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  const loaded = await loadBundle(bundleDirectory);
  assert.equal(loaded.result.decodedApiObjectProjectionDerivationVerified, true);
  assert.equal(loaded.result.terminalEndpointSnapshotsMatched, true);
  assert.equal(loaded.result.cdpWireBytesCaptured, false);
  assert.equal(loaded.result.realBrowserExecutionVerified, false);
  assert.equal(loaded.result.intervalMutationExcluded, false);
  assert.equal(loaded.result.abaExcluded, false);
  assert.equal(loaded.result.usableForRuntimeEvidence, false);
  assert.equal(loaded.result.cliExitCode, 1);
  assert.equal(loaded.result.derivedProjection.observations.length, 8);
  assert.deepEqual(
    Object.keys(loaded.result.derivedProjection.observations[0]).sort(),
    [
      "challengeNonce",
      "observedAt",
      "phase",
      "projectName",
      "pseudonymousClientId",
      "pseudonymousTargetId",
      "runtimeObservationDigest",
      "runtimeRequestDigest",
      "runtimeResponseDigest",
      "sequence",
      "slot"
    ].sort()
  );
});

test("derived output is recursively frozen and detached from tuple input", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  const loaded = await loadBundle(bundleDirectory);
  assert.equal(Object.isFrozen(loaded.result), true);
  assert.equal(Object.isFrozen(loaded.result.derivedProjection), true);
  assert.equal(Object.isFrozen(loaded.result.derivedProjection.observations), true);
  const before = loaded.result.derivedProjection.observations[0].runtimeResponseDigest;
  const tuple = await readJson(path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[0]));
  tuple.serviceWorkerChallenge.response.sourceClientId = "mutated-after-load";
  assert.equal(loaded.result.derivedProjection.observations[0].runtimeResponseDigest, before);
});

test("writer rejects caller-authored derived fields", async () => {
  const root = await createTestRoot();
  const records = createApiTranscriptTupleRecords();
  records[0].pseudonymousTargetId = `target-${"a".repeat(64)}`;
  await assert.rejects(
    writeSwAbUpdateRuntimeApiTranscriptBundle({
      cwd: workspaceRoot,
      outputDirectory: path.join(root, "bundle"),
      runId: apiTranscriptFixtureRunId,
      attemptId: apiTranscriptFixtureAttemptId,
      capturedAt: apiTranscriptFixtureCapturedAt,
      origin: apiTranscriptFixtureOrigin,
      artifactBindings: apiTranscriptFixtureArtifactBindings,
      tupleRecords: records
    }),
    /SCHEMA_INVALID|TUPLE_RECORD_INVALID/u
  );
});

test("loader rejects tuple bytes changed without manifest rebinding", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  const tuplePath = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[0]);
  const tuple = await readJson(tuplePath);
  tuple.cdpSession.preChallenge.response.targetInfo.title = "tampered full object";
  tuple.cdpSession.preChallenge.canonicalResponseSha256 = sha256(
    canonicalJson(tuple.cdpSession.preChallenge.response)
  );
  tuple.recordDigest = computeSwAbUpdateRuntimeApiTranscriptRecordDigest(tuple);
  await rewriteCanonical(tuplePath, tuple);
  await assert.rejects(loadBundle(bundleDirectory), /TUPLE_BINDING_MISMATCH/u);
});

test("loader rejects self-consistent rebinding that breaks client continuity", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  const index = 5;
  const tuplePath = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[index]);
  const tuple = await readJson(tuplePath);
  tuple.serviceWorkerChallenge.response.sourceClientId = "msedge-retained-client";
  tuple.serviceWorkerChallenge.canonicalResponseSha256 = sha256(
    canonicalJson(tuple.serviceWorkerChallenge.response)
  );
  tuple.recordDigest = computeSwAbUpdateRuntimeApiTranscriptRecordDigest(tuple);
  await rebindManifestTuple(bundleDirectory, index, tuple);
  await assert.rejects(loadBundle(bundleDirectory), /CLIENT_CONTINUITY_INVALID/u);
});

test("loader rejects extra files even when the nine required files remain", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  await writeFile(path.join(bundleDirectory, "capture.tmp"), "partial", "utf8");
  await assert.rejects(loadBundle(bundleDirectory), /FILE_SET_INVALID/u);
});

test("loader rejects duplicate JSON keys before semantic validation", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  const tuplePath = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[0]);
  const source = await readFile(tuplePath, "utf8");
  await writeFile(tuplePath, source.replace('{"cdpSession"', '{"schemaVersion":1,"cdpSession"'), "utf8");
  await assert.rejects(loadBundle(bundleDirectory), /JSON_DUPLICATE_KEY/u);
});

test("loader rejects authority promotion even after bundle digest is recomputed", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  const manifestPath = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE);
  const manifest = await readJson(manifestPath);
  manifest.authority.publicDeploymentAuthorized = true;
  manifest.bundleDigest = computeSwAbUpdateRuntimeApiTranscriptBundleDigest(manifest);
  manifest.bundleId = computeSwAbUpdateRuntimeApiTranscriptBundleId(manifest);
  await rewriteCanonical(manifestPath, manifest);
  await assert.rejects(loadBundle(bundleDirectory), /SCHEMA_INVALID|MANIFEST_INVALID/u);
});

test("schema 13 rejects a fabricated mutation epoch", async () => {
  const root = await createTestRoot();
  const records = createApiTranscriptTupleRecords();
  const artifactBindings = structuredClone(apiTranscriptFixtureArtifactBindings);
  artifactBindings.epoch = 0;
  await assert.rejects(
    writeSwAbUpdateRuntimeApiTranscriptBundle({
      cwd: workspaceRoot,
      outputDirectory: path.join(root, "bundle"),
      runId: apiTranscriptFixtureRunId,
      attemptId: apiTranscriptFixtureAttemptId,
      capturedAt: apiTranscriptFixtureCapturedAt,
      origin: apiTranscriptFixtureOrigin,
      artifactBindings,
      tupleRecords: records
    }),
    /ARTIFACT_BINDING_INVALID|SCHEMA_INVALID/u
  );
});

test("hard-linked tuple aliases are rejected when the filesystem supports links", async (t) => {
  const { bundleDirectory } = await writeFixtureBundle();
  const first = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[0]);
  const second = path.join(bundleDirectory, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES[1]);
  const secondBytes = await readFile(second);
  await unlink(second);
  try {
    await link(first, second);
  } catch (error) {
    await writeFile(second, secondBytes);
    t.skip(`hard links unavailable: ${error?.code ?? error}`);
    return;
  }
  await assert.rejects(loadBundle(bundleDirectory), /FILE_INVALID|PHYSICAL_ALIAS/u);
});

test("writer refuses to overwrite an existing bundle directory", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  await assert.rejects(
    writeSwAbUpdateRuntimeApiTranscriptBundle({
      cwd: workspaceRoot,
      outputDirectory: bundleDirectory,
      runId: apiTranscriptFixtureRunId,
      attemptId: apiTranscriptFixtureAttemptId,
      capturedAt: apiTranscriptFixtureCapturedAt,
      origin: apiTranscriptFixtureOrigin,
      artifactBindings: apiTranscriptFixtureArtifactBindings,
      tupleRecords: createApiTranscriptTupleRecords()
    }),
    /OVERWRITE_REFUSED/u
  );
});

test("CLI returns a closed result and exit code one for a mechanically valid bundle", async () => {
  const { bundleDirectory } = await writeFixtureBundle();
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        path.join(workspaceRoot, "scripts/verify-sw-ab-update-runtime-api-transcript.mjs"),
        "--bundle",
        bundleDirectory
      ],
      { cwd: workspaceRoot, encoding: "utf8" }
    ),
    (error) => {
      assert.equal(error.code, 1);
      const output = JSON.parse(error.stdout);
      assert.equal(output.decodedApiObjectProjectionDerivationVerified, true);
      assert.equal(output.terminalEndpointSnapshotsMatched, true);
      assert.equal(output.formalReleaseEvidenceReceipt, false);
      return true;
    }
  );
});

test("failure output never promotes trust and does not expose raw payload content", () => {
  const failure = buildSwAbUpdateRuntimeApiTranscriptFailure(
    new Error("synthetic rejection without raw identifiers")
  );
  assert.equal(failure.decodedApiObjectProjectionDerivationVerified, false);
  assert.equal(failure.publicDeploymentAuthorized, false);
  assert.equal(failure.expertClaimsAuthorized, false);
  assert.equal(failure.cliExitCode, 1);
  assert.equal(JSON.stringify(failure).includes("sourceClientId"), false);
});
