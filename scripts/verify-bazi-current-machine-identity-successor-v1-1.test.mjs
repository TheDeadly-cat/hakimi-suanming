import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  BaziCurrentMachineIdentitySuccessorV11Error,
  baziCurrentMachineIdentitySuccessorV11TestOnly as testOnly,
  buildBaziCurrentMachineIdentitySuccessorV11,
  computeBaziCurrentMachineIdentitySuccessorV11Digest,
  getBaziCurrentMachineIdentitySuccessorV11Summary,
  isVerifiedBaziCurrentMachineIdentitySuccessorV11,
  loadBaziCurrentMachineIdentitySuccessorV11,
  serializeBaziCurrentMachineIdentitySuccessorV11
} from "./bazi-current-machine-identity-successor-v1-1-lib.mjs";
import {
  loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate
} from "./bazi-single-chart-report-component-identity-drift-receipt-candidate-lib.mjs";
import {
  loadBaziExpertCurrentLineZeroInstanceObservationChildV11
} from "./bazi-expert-current-line-zero-instance-observation-child-v1-1-lib.mjs";
import {
  computeBaziDomainReleaseManifestV22Digest
} from "./bazi-domain-release-manifest-v2-2-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const CLI = path.join(HERE, "verify-bazi-current-machine-identity-successor-v1-1.mjs");
const LIB = path.join(HERE, "bazi-current-machine-identity-successor-v1-1-lib.mjs");
const ARTIFACT = path.join(ROOT, "content", "system-admission", "bazi-current-machine-identity-successor.v1.1.0.json");
const HISTORICAL_ARTIFACT = path.join(
  ROOT,
  "content",
  "system-admission",
  "bazi-current-machine-identity-successor.v1.0.0.json"
);
const FORMAL_V22 = path.join(ROOT, "content", "domain-release", "bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function codeIs(expected) {
  return (error) => error instanceof BaziCurrentMachineIdentitySuccessorV11Error && error.code === expected;
}

function reseal(value) {
  value.receiptDigest = computeBaziCurrentMachineIdentitySuccessorV11Digest(value);
  return value;
}

function assertActuallyDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) assertActuallyDeepFrozen(descriptor.value, seen);
  }
}

test("exact persisted loader alone grants the successor private brand", async () => {
  const built = await buildBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  assert.deepEqual(built, loaded);
  assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(built), false);
  assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(loaded), true);
  assertActuallyDeepFrozen(loaded);
});

test("artifact raw bytes, SHA-256, self digest, machine digest and canonical bytes are frozen", async () => {
  const bytes = await readFile(ARTIFACT);
  const parsed = JSON.parse(bytes.toString("utf8"));
  assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(parsed.receiptDigest, testOnly.EXPECTED_PERSISTED.receiptDigest);
  assert.equal(parsed.receiptDigest, computeBaziCurrentMachineIdentitySuccessorV11Digest(parsed));
  assert.equal(parsed.currentMachineIdentity.currentMachineIdentityDigest, testOnly.EXPECTED_CURRENT_MACHINE_IDENTITY_DIGEST);
  assert.equal(bytes.toString("utf8"), serializeBaziCurrentMachineIdentitySuccessorV11(parsed));
});

test("createdAt is canonical UTC and does not exceed the fixed build upper bound", async () => {
  const { createdAt } = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  assert.match(createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
  const instant = Date.parse(createdAt);
  const upperBound = Date.parse(testOnly.CREATED_AT_UPPER_BOUND);
  assert.equal(Number.isFinite(instant), true);
  assert.equal(new Date(instant).toISOString(), createdAt);
  assert.equal(instant <= upperBound, true);
  assert.equal(createdAt, testOnly.CREATED_AT);
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  assert.equal(loaded.timeBoundary.trustedTimestampEstablished, false);
  assert.equal(loaded.timeBoundary.externalTimeAuthorityEstablished, false);
  assert.equal(loaded.timeBoundary.crossArtifactTemporalOrderEstablished, false);
});

test("future createdAt and an upper bound earlier than createdAt fail closed after resealing", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const cases = [
    (value) => { value.createdAt = "2026-09-01T13:52:11.000Z"; },
    (value) => { value.timeBoundary.createdAtUpperBoundObservedOnSameUntrustedLocalClock = "2026-09-01T13:51:59.999Z"; }
  ];
  for (const mutate of cases) {
    const forged = clone(loaded);
    mutate(forged);
    reseal(forged);
    assert.throws(() => testOnly.assertPersistedSemantic(forged, loaded), codeIs("SUCCESSOR_CURRENT_MISMATCH"));
  }
});

test("report receipt and expert child must be exact full-loader private brands", async () => {
  const report = await loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(ROOT);
  const expert = await loadBaziExpertCurrentLineZeroInstanceObservationChildV11(ROOT);
  assert.doesNotThrow(() => testOnly.assertReportReceipt(report));
  assert.doesNotThrow(() => testOnly.assertExpertChild(expert));
  assert.throws(() => testOnly.assertReportReceipt(clone(report)), codeIs("REPORT_RECEIPT_BRAND_REQUIRED"));
  assert.throws(() => testOnly.assertExpertChild(clone(expert)), codeIs("EXPERT_CHILD_BRAND_REQUIRED"));
});

test("formal v2.2 is held-handle raw+self historical baseline, never a current brand", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  assert.deepEqual(loaded.historicalFormalBaseline, {
    ...testOnly.FORMAL_V22,
    heldHandleRawIdentityVerified: true,
    selfDigestVerified: true,
    fullLoaderInvoked: false,
    privateBrandVerified: false,
    currentManifestClaimed: false,
    formalManifestStillHistorical: true,
    formalManifestCurrent: false,
    role: "historical_v2_2_raw_self_baseline_only"
  });
});

test("old successor v1 is exact raw+self historical context and its full loader is absent", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const historicalBytes = await readFile(HISTORICAL_ARTIFACT);
  assert.equal(historicalBytes.byteLength, testOnly.HISTORICAL_SUCCESSOR_V1.rawBytes);
  assert.equal(sha256(historicalBytes), testOnly.HISTORICAL_SUCCESSOR_V1.rawSha256);
  assert.deepEqual(loaded.historicalPredecessorV1, {
    path: testOnly.HISTORICAL_SUCCESSOR_V1.path,
    rawBytes: testOnly.HISTORICAL_SUCCESSOR_V1.rawBytes,
    rawSha256: testOnly.HISTORICAL_SUCCESSOR_V1.rawSha256,
    successorId: testOnly.HISTORICAL_SUCCESSOR_V1.successorId,
    receiptDigest: testOnly.HISTORICAL_SUCCESSOR_V1.receiptDigest,
    observedCreatedAtLabel: testOnly.HISTORICAL_SUCCESSOR_V1.observedCreatedAtLabel,
    rawAndSelfDigestVerified: true,
    fullLoaderImportedByThisSuccessor: false,
    fullLoaderInvokedByThisSuccessor: false,
    privateBrandConsumed: false,
    brandCurrent: false,
    currentEndpointClaimed: false,
    role: "historical_raw_self_predecessor_only"
  });
  const source = await readFile(LIB, "utf8");
  assert.equal(source.includes('from "./bazi-current-machine-identity-successor-lib.mjs"'), false);
  assert.equal(/\bloadBaziCurrentMachineIdentitySuccessor\s*\(/u.test(source), false);
});

test("old successor v1 raw drift fails in the historical-only reader", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "hakimi-bazi-machine-v11-old-v1-"));
  context.after(async () => rm(temporaryRoot, { recursive: true, force: true }));
  const target = path.join(temporaryRoot, ...testOnly.HISTORICAL_SUCCESSOR_V1.path.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(HISTORICAL_ARTIFACT, target);
  const candidate = JSON.parse(await readFile(target, "utf8"));
  candidate.authorityBoundary.releaseReady = true;
  await writeFile(target, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
  await assert.rejects(
    testOnly.readHistoricalSuccessorV1(temporaryRoot),
    codeIs("HISTORICAL_SUCCESSOR_V1_RAW_DRIFT")
  );
});

test("historical v2.2 mutation remains rejected after attacker recomputes its self digest", async () => {
  const formal = JSON.parse((await readFile(FORMAL_V22)).toString("utf8"));
  formal.authorityBoundary.releaseReady = true;
  formal.manifestDigest = computeBaziDomainReleaseManifestV22Digest(formal);
  assert.notEqual(formal.manifestDigest, testOnly.FORMAL_V22.manifestDigest);
  assert.throws(
    () => testOnly.assertFormalV22({ ...testOnly.FORMAL_V22 }, formal),
    codeIs("FORMAL_V22_SELF_OR_RED_SEMANTIC_DRIFT")
  );
});

test("ordered inventory is exactly 28 unique identities in first-seen component order", async () => {
  const current = (await loadBaziCurrentMachineIdentitySuccessorV11(ROOT)).currentMachineIdentity;
  assert.equal(current.formalComponentCount, 10);
  assert.equal(current.orderedUniqueFileIdentityCount, 28);
  assert.equal(current.orderedUniqueFileIdentities.length, 28);
  assert.equal(new Set(current.orderedUniqueFileIdentities.map((item) => item.path)).size, 28);
  for (let index = 0; index < 28; index += 1) assert.equal(current.orderedUniqueFileIdentities[index].order, index + 1);
});

test("exactly one file path and one component drift while frozen golden is unchanged", async () => {
  const current = (await loadBaziCurrentMachineIdentitySuccessorV11(ROOT)).currentMachineIdentity;
  const drifted = current.orderedUniqueFileIdentities.filter((item) => item.drifted);
  assert.equal(drifted.length, 1);
  assert.equal(drifted[0].path, testOnly.REPORT_SOURCE.path);
  assert.deepEqual(drifted[0].componentIds, [testOnly.REPORT_COMPONENT.componentId]);
  assert.equal(current.componentDriftCount, 1);
  assert.deepEqual(current.componentDrift, {
    componentId: "report_contract",
    persistedDigest: testOnly.REPORT_COMPONENT.persistedDigest,
    currentDigest: testOnly.REPORT_COMPONENT.currentDigest
  });
  assert.deepEqual(current.frozenGolden, { ...testOnly.FROZEN_GOLDEN, unchanged: true });
});

test("expert child is an overlay and never enters formal Manifest components or machine digest", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const historical = JSON.parse(await readFile(HISTORICAL_ARTIFACT, "utf8"));
  assert.equal(loaded.expertOverlay.outsideFormalManifestComponents, true);
  assert.equal(loaded.expertOverlay.includedInCurrentMachineIdentityDigest, false);
  assert.equal(loaded.lineage.formalManifestComponentsExtendedWithExpertOverlay, false);
  assert.equal(loaded.currentMachineIdentity.currentComponents.some((component) => component.componentId.includes("expert-current-line")), false);
  assert.equal(loaded.expertOverlay.independentExpertReviewsVerified, 0);
  assert.equal(loaded.expertOverlay.independentExpertsRequired, 2);
  assert.equal(loaded.expertOverlay.childId, testOnly.EXPERT_CHILD.childId);
  assert.notEqual(loaded.expertOverlay.childId, historical.expertOverlay.childId);
  assert.deepEqual(loaded.currentMachineIdentity, historical.currentMachineIdentity);
  assert.equal(
    loaded.currentMachineIdentity.currentMachineIdentityDigest,
    "58c82e1bbe601638130c0fefe6341d680e7d018f0a72ea44ca5704d83792ee78"
  );
});

test("wrong drift cardinality, path or component cannot survive self resealing", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const cases = [
    (value) => { value.currentMachineIdentity.uniqueFileDriftCount = 2; },
    (value) => { value.currentMachineIdentity.uniqueFileDriftPath = "packages/contracts/src/index.ts"; },
    (value) => { value.currentMachineIdentity.componentDrift.componentId = "execution_rules"; }
  ];
  for (let index = 0; index < cases.length; index += 1) {
    const forged = clone(loaded);
    cases[index](forged);
    reseal(forged);
    assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(forged), false);
    assert.throws(() => testOnly.assertPersistedSemantic(forged, loaded), codeIs("SUCCESSOR_CURRENT_MISMATCH"));
  }
});

test("clone, exact clone reseal and report identity mutation never gain the private brand", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const exactClone = clone(loaded);
  const forged = clone(loaded);
  forged.currentMachineIdentity.orderedUniqueFileIdentities[27].currentSha256 = "0".repeat(64);
  reseal(forged);
  assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(exactClone), false);
  assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(forged), false);
  assert.throws(() => getBaziCurrentMachineIdentitySuccessorV11Summary(exactClone), codeIs("SUCCESSOR_BRAND_REQUIRED"));
});

test("authority and owner decision promotion remain rejected after self resealing", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const mutations = Object.keys(loaded.authorityBoundary).map(
    (field) => (value) => { value.authorityBoundary[field] = true; }
  );
  mutations.push(
    (value) => { value.ownerDecisionBoundary.manifestRebindAuthorized = true; },
    (value) => { value.ownerDecisionBoundary.manifestResignAuthorized = true; },
    (value) => { value.lineage.formalManifestModified = true; },
    (value) => { value.lineage.centralRegistryModified = true; },
    (value) => { value.lineage.globalCurrentEndpointRegistrationModified = true; },
    (value) => { value.lineage.thisSuccessorReplacesCurrentEndpoint = true; }
  );
  for (const mutate of mutations) {
    const forged = clone(loaded);
    mutate(forged);
    reseal(forged);
    assert.throws(() => testOnly.assertPersistedSemantic(forged, loaded), codeIs("SUCCESSOR_CURRENT_MISMATCH"));
  }
});

test("atomic, epoch, interval, ABA and replay promotions remain rejected", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  assert.deepEqual(loaded.observationBoundary, {
    engineeringMachineIdentityObservationEstablished: true,
    currentFullComponentFileSetObserved: true,
    currentFullDomainManifestEstablished: false,
    persistedAsDomainManifest: false,
    endpointSnapshotOnly: true,
    eachFileReadThroughStableHeldHandle: true,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcludedAcrossFiles: false,
    abaExcluded: false,
    replayExcluded: false
  });
  for (const field of ["crossFileAtomicSnapshot", "mutationEpochAvailableForSchema13", "intervalMutationExcludedAcrossFiles", "abaExcluded", "replayExcluded"]) {
    const forged = clone(loaded);
    forged.observationBoundary[field] = true;
    reseal(forged);
    assert.throws(() => testOnly.assertPersistedSemantic(forged, loaded), codeIs("SUCCESSOR_CURRENT_MISMATCH"));
  }
  for (const field of [
    "trustedTimestampEstablished",
    "externalTimeAuthorityEstablished",
    "crossArtifactTemporalOrderEstablished",
    "monotonicClockEstablished",
    "notaryReceiptEstablished",
    "filesystemTimestampsUsedAsAuthority",
    "predecessorV1ChronologyAuthorityEstablished"
  ]) {
    const forged = clone(loaded);
    forged.timeBoundary[field] = true;
    reseal(forged);
    assert.throws(() => testOnly.assertPersistedSemantic(forged, loaded), codeIs("SUCCESSOR_CURRENT_MISMATCH"));
  }
});

test("all binding, expert, truth, legal, release and public gates remain zero or false", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  assert.equal(loaded.gateSummary.bindingFrozenVerified, 0);
  assert.equal(loaded.gateSummary.bindingRequired, 12);
  assert.equal(loaded.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(loaded.gateSummary.independentExpertsRequired, 2);
  for (const value of Object.values(loaded.authorityBoundary)) assert.equal(value, false);
  assert.equal(loaded.releaseGovernance.releaseIdentity, "legacy-v13");
  assert.equal(loaded.releaseGovernance.targetSchema, 13);
  assert.equal(loaded.releaseGovernance.migrationId, null);
});

test("captured WeakSet intrinsics resist post-import brand poisoning", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const originalAdd = WeakSet.prototype.add;
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.add = () => { throw new Error("poisoned add"); };
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(loaded), true);
    assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(clone(loaded)), false);
  } finally {
    WeakSet.prototype.add = originalAdd;
    WeakSet.prototype.has = originalHas;
  }
});

test("post-import Object.isFrozen poison cannot produce a mutable branded result", async () => {
  const nativeIsFrozen = Object.isFrozen;
  let loaded;
  try {
    Object.isFrozen = () => true;
    loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  } finally {
    Object.isFrozen = nativeIsFrozen;
  }
  assert.equal(isVerifiedBaziCurrentMachineIdentitySuccessorV11(loaded), true);
  assertActuallyDeepFrozen(loaded);
  assert.throws(() => { loaded.authorityBoundary.releaseReady = true; }, TypeError);
  assert.throws(() => { loaded.observationBoundary.crossFileAtomicSnapshot = true; }, TypeError);
});

test("captured canonical and summary paths do not consult poisoned array map or iterator", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const originalMap = Array.prototype.map;
  const originalIterator = Array.prototype[Symbol.iterator];
  let summary;
  let serialized;
  try {
    Array.prototype.map = () => { throw new Error("poisoned map"); };
    Array.prototype[Symbol.iterator] = function* poisonedIterator() { throw new Error("poisoned iterator"); };
    summary = getBaziCurrentMachineIdentitySuccessorV11Summary(loaded);
    serialized = serializeBaziCurrentMachineIdentitySuccessorV11(loaded);
  } finally {
    Array.prototype.map = originalMap;
    Array.prototype[Symbol.iterator] = originalIterator;
  }
  assert.equal(summary.orderedUniqueFilesObserved, 28);
  assert.match(serialized, /currentMachineIdentityDigest/u);
});

test("unknown fields cannot survive exact semantic comparison after resealing", async () => {
  const loaded = await loadBaziCurrentMachineIdentitySuccessorV11(ROOT);
  const forged = clone(loaded);
  forged.unrecognizedAuthorityShortcut = false;
  reseal(forged);
  assert.throws(() => testOnly.assertPersistedSemantic(forged, loaded), codeIs("SUCCESSOR_CURRENT_MISMATCH"));
});

test("duplicate JSON keys are rejected by the strict parser", () => {
  assert.throws(
    () => testOnly.parseBaziDttStrictJsonArtifact({
      path: "duplicate.json",
      bytes: Buffer.from('{"schemaVersion":"1.1.0","schemaVersion":"1.1.0"}', "utf8")
    }),
    (reason) => typeof reason?.code === "string"
  );
});

test("CLI emits one narrow calibrated summary", () => {
  const run = spawnSync(process.execPath, [CLI], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.match(run.stdout, /^BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_V1_1_OK \{/u);
  const summary = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")).trim());
  assert.equal(summary.orderedUniqueFilesObserved, 28);
  assert.equal(summary.uniqueFileDrifts, 1);
  assert.equal(summary.componentDrifts, 1);
  assert.equal(summary.bindingFrozenVerified, 0);
  assert.equal(summary.independentExpertReviewsVerified, 0);
  assert.equal(summary.persistedAsDomainManifest, false);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
});

test("CLI rejects operands and visible preload options without leaking failure detail", () => {
  const operand = spawnSync(process.execPath, [CLI, "unexpected"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" } });
  assert.equal(operand.status, 1);
  assert.equal(operand.stdout, "");
  assert.equal(operand.stderr, "BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_V1_1_FAILED VERIFICATION_FAILED\n");
  const preload = spawnSync(process.execPath, [CLI], { cwd: ROOT, encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "--trace-warnings" } });
  assert.equal(preload.status, 1);
  assert.equal(preload.stderr, "BAZI_CURRENT_MACHINE_IDENTITY_SUCCESSOR_V1_1_FAILED VERIFICATION_FAILED\n");
});

test("importing the CLI is side-effect free", () => {
  const code = `await import(${JSON.stringify(pathToFileURL(CLI).href)}); process.stdout.write("IMPORTED\\n");`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "IMPORTED\n");
});
