import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFile,
  link,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";
import {
  BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH,
  baziDttNoticeReconciliationTestOnly,
  buildCurrentBaziDttNoticeReconciliation,
  canonicalStringifyBaziDttNoticeReconciliation,
  computeBaziDttNoticeReconciliationDigest,
  isVerifiedBaziDttNoticeReconciliation,
  loadBaziDttNoticeReconciliation,
  parseBaziDttNoticeReconciliationJsonBytes,
  readBaziDttNoticeReconciliation,
  verifyBaziDttNoticeReconciliation,
  verifyBaziDttNoticeReconciliationArtifact
} from "./bazi-dtt-notice-reconciliation-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(
  workspaceRoot,
  ...BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH.split("/")
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.reconciliationDigest = computeBaziDttNoticeReconciliationDigest(value);
  return value;
}

async function persisted() {
  return readBaziDttNoticeReconciliation(workspaceRoot);
}

function sameIndexedValues(left, right) {
  if (!left || left.length !== right.length) return false;
  for (let index = 0; index < right.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function indexedIterator(values) {
  let index = 0;
  return {
    next() {
      if (index >= values.length) return { done: true, value: undefined };
      const value = values[index];
      index += 1;
      return { done: false, value };
    },
    [Symbol.iterator]() {
      return this;
    }
  };
}

test("persisted C-L3 overlay exactly rebuilds and only the full loader result is branded", async () => {
  const overlay = await persisted();
  const expected = await buildCurrentBaziDttNoticeReconciliation(workspaceRoot, {
    createdAt: overlay.createdAt
  });
  assert.equal(
    canonicalStringifyBaziDttNoticeReconciliation(overlay),
    canonicalStringifyBaziDttNoticeReconciliation(expected)
  );
  assert.equal(isVerifiedBaziDttNoticeReconciliation(overlay), false);
  assert.equal(isVerifiedBaziDttNoticeReconciliation(verifyBaziDttNoticeReconciliationArtifact(overlay)), false);
  const loaded = await loadBaziDttNoticeReconciliation(workspaceRoot);
  assert.equal(isVerifiedBaziDttNoticeReconciliation(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  assert.equal(Object.isFrozen(loaded.overlay.currentParents.sourceBinding.supersession), true);
  assert.equal(isVerifiedBaziDttNoticeReconciliation(clone(loaded)), false);
});

test("historical C-L2 and old parents stay immutable while current parents are separately identified", async () => {
  const overlay = await persisted();
  assert.deepEqual(overlay.historicalEvidence, {
    findingState: "unresolved_parent_not_mutated_reconciliation_required",
    observationDigest: "01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993",
    observationId: "hakimi.bazi.dtt-month-command-public-evidence/2026-08-29T15:17:27.103Z",
    path: "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
    rawBytes: 31062,
    rawSha256: "85788506067b50453545ec786c7a47b0e51a4cf004419cbe8c547f9384c01ae6"
  });
  for (const key of ["sourceBinding", "sourceRights"]) {
    const historical = overlay.historicalParents[key];
    const { supersession, ...currentIdentity } = overlay.currentParents[key];
    assert.deepEqual(currentIdentity, historical);
    assert.deepEqual(supersession, {
      inPlaceHistoricalParentMutationAccepted: false,
      state: "not_started_current_parent_is_historical_parent",
      supersedes: null,
      supersedesHistoricalParent: false
    });
  }
  assert.equal(overlay.integrityBoundary.historicalEvidenceVerifiedByPureCL2ArtifactVerifier, true);
  assert.equal(overlay.integrityBoundary.currentParentsIndependentlyReadAndVerified, true);
  assert.equal(overlay.integrityBoundary.historicalParentsMutated, false);
  assert.equal(overlay.integrityBoundary.historicalParentBacklinksAdded, false);
  assert.equal(overlay.integrityBoundary.cL2Mutated, false);
});

test("C-L3 does not call the C-L2 full loader or re-read historical parents as current dependencies", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "scripts/bazi-dtt-notice-reconciliation-lib.mjs"),
    "utf8"
  );
  assert.equal(source.includes("loadBaziDttMonthCommandPublicEvidence"), false);
  assert.equal(source.includes("verifyBaziDttMonthCommandPublicEvidenceArtifact"), true);
  assert.equal(source.includes("readHistoricalEvidenceArtifact"), true);
  assert.doesNotMatch(source, /for\s*\([^)]*\bof\b/u);
  assert.equal(source.includes("Promise.all("), false);
  assert.equal(source.includes("...parts"), false);
  assert.equal(source.includes("parts.slice("), false);
  assert.doesNotMatch(source, /\b(?:const|let|var)\s*\[[^\]]*\]\s*=/u);
  assert.doesNotMatch(source, /^\s*\[[A-Za-z_$][^\]]*\]\s*=/mu);
});

test("current unresolved decision is deny-only and all authority and epoch projections remain red", async () => {
  const loaded = await loadBaziDttNoticeReconciliation(workspaceRoot);
  assert.equal(loaded.resolved, false);
  assert.equal(loaded.promotionBlocked, true);
  assert.equal(loaded.distributionPolicy, "link_only");
  assert.equal(loaded.formalSourceRightsRecordCount, 0);
  assert.equal(loaded.formalSourceCarrierRecordCount, 0);
  assert.equal(loaded.bindingFrozenVerified, 0);
  for (const key of [
    "contentTruthEstablished",
    "expertTruthEstablished",
    "rightsLegalConclusionEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "expertClaimsAuthorized",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailable",
    "intervalMutationExcluded",
    "abaExcluded"
  ]) assert.equal(loaded[key], false, key);
  assert.equal(loaded.mutationEpochReceipt, null);
});

test("future resolution requires new versioned paired parents and never a C-L2 or old-parent rewrite", async () => {
  const policy = (await persisted()).futureResolutionRequirements;
  assert.deepEqual(policy, {
    cL2RewriteAllowed: false,
    correctedCarrierNoticeProjectionMustBeStructuredPerAnchor: true,
    correctedCurrentParentsMustUseNewVersionedPaths: true,
    currentParentsMustExplicitlySupersedeHistoricalSemanticIdentities: true,
    formalSourceRightsAndCarrierRecordsRemainSeparatePrerequisites: true,
    historicalEvidenceMustRemainUnchanged: true,
    historicalParentInPlaceRewriteAllowed: false,
    historicalParentIdentitiesMustRemainRecorded: true,
    oldidLiteralAndRenderedDependencyMustRemainSeparate: true,
    publicDomainMarkCannotBecomeLicense: true,
    sourceAndRightsSupersessionMustBePaired: true
  });
});

test("notice facts remain per-carrier and oldid literal stays separate from rendered dependencies", async () => {
  const notice = (await persisted()).noticeProjection;
  assert.equal(notice.ssidFixedFilePageNotice, "pd_scan_top_level_observed");
  assert.equal(notice.cadalFixedFilePageNotice, "pd_old_top_level_observed_without_pd_scan_template");
  assert.equal(notice.currentSourceParentSsidNotice,
    "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated");
  assert.equal(notice.currentSourceParentCadalNotice,
    "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated");
  assert.equal(notice.parentNoticeProjectionReestablishedForAllCarriers, false);
  assert.equal(notice.oldidMainSlotPdOldLiteralObserved, false);
  assert.equal(notice.renderedPagePdOldDependencyObserved, true);
  assert.equal(notice.dependencyRevisionsPinnedAtCapture, true);
  assert.equal(notice.oldidAlonePinsRenderedNotice, false);
  assert.equal(notice.publicDomainMarkCountsAsLicense, false);
});

test("self-resealed promotion, parent mutation and authority fabrication are rejected", async () => {
  const overlay = await persisted();
  const mutations = [
    (value) => { value.reconciliationDecision.noticeDiscrepancyResolved = true; },
    (value) => { value.reconciliationDecision.promotionBlocked = false; },
    (value) => { value.reconciliationDecision.currentParentsVersionedSupersessionComplete = true; },
    (value) => { value.currentParents.sourceBinding.supersession.supersedesHistoricalParent = true; },
    (value) => { value.currentParents.sourceBinding.supersession.supersedes = { invented: true }; },
    (value) => { value.integrityBoundary.historicalParentsMutated = true; },
    (value) => { value.integrityBoundary.cL2Mutated = true; },
    (value) => { value.formalAdmissionBoundary.formalSourceRightsRecordCount = 1; },
    (value) => { value.formalAdmissionBoundary.bindingFrozenVerified = 1; },
    (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.integrityBoundary.crossFileAtomicSnapshot = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(overlay);
    mutate(candidate);
    assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(reseal(candidate)));
  }
});

test("historical and current identities cannot be rebound even after digest reseal", async () => {
  const overlay = await persisted();
  const mutations = [
    (value) => { value.historicalEvidence.rawSha256 = "0".repeat(64); },
    (value) => { value.historicalParents.sourceBinding.ledgerDigest = "1".repeat(64); },
    (value) => { value.historicalParents.sourceRights.candidateDigest = "2".repeat(64); },
    (value) => { value.currentParents.sourceBinding.rawBytes += 1; },
    (value) => { value.currentParents.sourceRights.path = "content/other-rights.v2.json"; },
    (value) => { value.subjectLock.affectedAnchorId = "anchor:invented"; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(overlay);
    mutate(candidate);
    assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(reseal(candidate)));
  }
});

test("strict byte parser rejects duplicate keys, BOM, invalid UTF-8, empty and oversized input", async () => {
  const bytes = await readFile(artifactPath);
  assert.equal(parseBaziDttNoticeReconciliationJsonBytes(bytes).reconciliationId,
    "hakimi.bazi.dtt-notice-reconciliation/1.0.0");
  const cases = [
    Buffer.from('{"a":1,"a":2}', "utf8"),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}")]),
    Buffer.from([0xc3, 0x28]),
    Buffer.from("   ", "utf8")
  ];
  for (const input of cases) assert.throws(() => parseBaziDttNoticeReconciliationJsonBytes(input));
  assert.throws(() => parseBaziDttNoticeReconciliationJsonBytes(Buffer.from("{\"a\":1}"), "tiny", 4));
});

test("C-L3 private strict parser fails closed when the shared C-L2 decoder or JSON.parse is poisoned", async () => {
  const bytes = await readFile(artifactPath);
  const nativeDecode = TextDecoder.prototype.decode;
  const nativeJsonParse = JSON.parse;
  try {
    TextDecoder.prototype.decode = () => "{}";
    assert.throws(
      () => parseBaziDttNoticeReconciliationJsonBytes(Buffer.from([0xc3, 0x28])),
      (error) => error?.code === "JSON_UTF8_INVALID"
    );
    assert.throws(
      () => parseBaziDttNoticeReconciliationJsonBytes(bytes),
      (error) => error?.code === "SHARED_PARSER_MISMATCH"
    );
  } finally {
    TextDecoder.prototype.decode = nativeDecode;
  }

  try {
    JSON.parse = () => ({});
    assert.throws(
      () => parseBaziDttNoticeReconciliationJsonBytes(bytes),
      (error) => error?.code === "SHARED_PARSER_MISMATCH"
    );
  } finally {
    JSON.parse = nativeJsonParse;
  }
});

test("post-import freeze and WeakSet poisoning cannot create a mutable or forged full-load brand", async () => {
  const nativeFreeze = Object.freeze;
  let loaded;
  try {
    Object.freeze = (value) => value;
    loaded = await loadBaziDttNoticeReconciliation(workspaceRoot);
  } finally {
    Object.freeze = nativeFreeze;
  }
  assert.equal(isVerifiedBaziDttNoticeReconciliation(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  assert.equal(Object.isFrozen(loaded.overlay.reconciliationDecision), true);
  assert.throws(
    () => { loaded.overlay.reconciliationDecision.promotionBlocked = false; },
    TypeError
  );
  assert.equal(loaded.promotionBlocked, true);
  assert.equal(loaded.overlay.reconciliationDecision.promotionBlocked, true);

  const nativeWeakSetHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziDttNoticeReconciliation({ promotionBlocked: false }), false);
    assert.equal(isVerifiedBaziDttNoticeReconciliation(loaded), true);
  } finally {
    WeakSet.prototype.has = nativeWeakSetHas;
  }
});

test("post-import Array iterator poisoning cannot rewrite schema, paths, bytes or the full-load brand", async (t) => {
  const overlay = await persisted();
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-dtt-c-l3-iterator-"));
  t.after(async () => { await rm(temporaryRoot, { recursive: true, force: true }); });
  await mkdir(path.join(temporaryRoot, "data"));
  const requestedBytes = Buffer.from("REQUESTED", "utf8");
  const alternateBytes = Buffer.from("ALTERNATE", "utf8");
  await writeFile(path.join(temporaryRoot, "data", "requested.bin"), requestedBytes);
  await writeFile(path.join(temporaryRoot, "data", "alternate.bin"), alternateBytes);

  const requestedParts = ["data", "requested.bin"];
  const alternateParts = ["data", "alternate.bin"];
  const rejectedPathParts = ["missing", "iterator-forgery.json"];
  const protectedPathParts = [
    BAZI_DTT_NOTICE_RECONCILIATION_RELATIVE_PATH.split("/"),
    overlay.historicalEvidence.path.split("/"),
    overlay.currentParents.sourceBinding.path.split("/"),
    overlay.currentParents.sourceRights.path.split("/")
  ];
  const topLevelKeys = [
    "schemaVersion",
    "recordType",
    "reconciliationId",
    "status",
    "createdAt",
    "releaseGovernance",
    "subjectLock",
    "historicalEvidence",
    "historicalParents",
    "currentParents",
    "noticeProjection",
    "reconciliationDecision",
    "formalAdmissionBoundary",
    "futureResolutionRequirements",
    "integrityBoundary",
    "authorityBoundary",
    "doesNotEstablish",
    "reconciliationDigest"
  ];
  const iteratorDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  assert.ok(iteratorDescriptor);
  let poisonCalls = 0;
  let artifact;
  let snapshot;
  let loaded;
  try {
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      ...iteratorDescriptor,
      value() {
        if (sameIndexedValues(this, requestedParts)) {
          poisonCalls += 1;
          return indexedIterator(alternateParts);
        }
        for (let pathIndex = 0; pathIndex < protectedPathParts.length; pathIndex += 1) {
          if (sameIndexedValues(this, protectedPathParts[pathIndex])) {
            poisonCalls += 1;
            return indexedIterator(rejectedPathParts);
          }
        }
        if (sameIndexedValues(this, topLevelKeys)) poisonCalls += 1;
        return Reflect.apply(iteratorDescriptor.value, this, []);
      }
    });
    artifact = verifyBaziDttNoticeReconciliationArtifact(overlay);
    snapshot = await baziDttNoticeReconciliationTestOnly.readStableWorkspaceFile(
      temporaryRoot,
      "data/requested.bin",
      1024
    );
    loaded = await loadBaziDttNoticeReconciliation(workspaceRoot);
  } finally {
    Object.defineProperty(Array.prototype, Symbol.iterator, iteratorDescriptor);
  }
  assert.equal(poisonCalls, 0);
  assert.equal(isVerifiedBaziDttNoticeReconciliation(artifact), false);
  assert.deepEqual(Buffer.from(snapshot.bytes), requestedBytes);
  assert.equal(
    snapshot.rawSha256,
    createHash("sha256").update(requestedBytes).digest("hex")
  );
  assert.equal(isVerifiedBaziDttNoticeReconciliation(loaded), true);
  assert.equal(loaded.promotionBlocked, true);
  assert.equal(loaded.resolved, false);
});

test("passive object verification rejects accessors without invocation, Proxy, Symbol, sparse arrays and -0", async () => {
  const overlay = await persisted();
  let getterCalls = 0;
  const accessor = clone(overlay);
  Object.defineProperty(accessor, "status", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return overlay.status;
    }
  });
  assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(accessor));
  assert.equal(getterCalls, 0);
  assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(new Proxy(clone(overlay), {})));
  const symbol = clone(overlay);
  symbol[Symbol("hidden")] = true;
  assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(symbol));
  const sparse = clone(overlay);
  sparse.doesNotEstablish = new Array(13);
  assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(sparse));
  const negativeZero = clone(overlay);
  negativeZero.formalAdmissionBoundary.bindingFrozenVerified = -0;
  assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(negativeZero));
});

test("unsafe parent paths fail before any dependency read", async () => {
  const overlay = await persisted();
  for (const unsafe of [
    "../outside.json",
    "/absolute.json",
    "C:/absolute.json",
    "content\\parent.json",
    "content//parent.json",
    "content/./parent.json",
    "content/../parent.json",
    "content/parent.json\0suffix"
  ]) {
    const candidate = clone(overlay);
    candidate.currentParents.sourceBinding.path = unsafe;
    assert.throws(
      () => verifyBaziDttNoticeReconciliationArtifact(reseal(candidate)),
      /路径/u
    );
  }
});

test("stable reader rejects symlinks, hardlinks and post-open growth", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-dtt-c-l3-"));
  t.after(async () => { await rm(temporaryRoot, { recursive: true, force: true }); });
  await mkdir(path.join(temporaryRoot, "data"));
  await writeFile(path.join(temporaryRoot, "data", "source.json"), "{\"ok\":true}", "utf8");

  await link(
    path.join(temporaryRoot, "data", "source.json"),
    path.join(temporaryRoot, "data", "hard.json")
  );
  await assert.rejects(
    baziDttNoticeReconciliationTestOnly.readStableWorkspaceFile(
      temporaryRoot,
      "data/hard.json",
      1024
    ),
    (error) => error?.code === "HARDLINK_REJECTED"
  );

  try {
    await symlink(
      path.join(temporaryRoot, "data", "source.json"),
      path.join(temporaryRoot, "data", "alias.json"),
      "file"
    );
    await assert.rejects(
      baziDttNoticeReconciliationTestOnly.readStableWorkspaceFile(
        temporaryRoot,
        "data/alias.json",
        1024
      ),
      (error) => error?.code === "SYMLINK_REJECTED"
    );
  } catch (cause) {
    if (!["EPERM", "EACCES", "UNKNOWN"].includes(cause?.code)) throw cause;
  }

  await writeFile(path.join(temporaryRoot, "data", "mutable.json"), "{\"ok\":true}", "utf8");
  await assert.rejects(
    baziDttNoticeReconciliationTestOnly.readStableWorkspaceFile(
      temporaryRoot,
      "data/mutable.json",
      1024,
      {
        afterOpenBeforeRead: async ({ absolutePath }) => {
          await appendFile(absolutePath, " ", "utf8");
        }
      }
    ),
    (error) => error?.code === "ENDPOINT_CHANGED"
  );
});

test("stable reader ignores poisoned Buffer and FileHandle methods and keeps actual equal-length bytes", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-dtt-c-l3-buffer-"));
  t.after(async () => { await rm(temporaryRoot, { recursive: true, force: true }); });
  await mkdir(path.join(temporaryRoot, "data"));
  const currentBytes = Buffer.from("BBBBBBBB", "utf8");
  const staleBytes = Buffer.from("AAAAAAAA", "utf8");
  await writeFile(path.join(temporaryRoot, "data", "identity.bin"), currentBytes);
  const nativeSubarray = Buffer.prototype.subarray;
  let poisonedSubarrayCalls = 0;
  let snapshot;
  try {
    Buffer.prototype.subarray = function poisonedSubarray() {
      poisonedSubarrayCalls += 1;
      return staleBytes;
    };
    snapshot = await baziDttNoticeReconciliationTestOnly.readStableWorkspaceFile(
      temporaryRoot,
      "data/identity.bin",
      1024
    );
  } finally {
    Buffer.prototype.subarray = nativeSubarray;
  }
  assert.equal(poisonedSubarrayCalls, 0);
  assert.deepEqual(Buffer.from(snapshot.bytes), currentBytes);
  assert.equal(
    snapshot.rawSha256,
    createHash("sha256").update(currentBytes).digest("hex")
  );

  const probe = await open(path.join(temporaryRoot, "data", "identity.bin"), "r");
  const fileHandlePrototype = Object.getPrototypeOf(probe);
  const nativeRead = fileHandlePrototype.read;
  await probe.close();
  let poisonedReadCalls = 0;
  try {
    fileHandlePrototype.read = async function poisonedRead(buffer, offset, _length, position) {
      poisonedReadCalls += 1;
      if (position !== 0) return { bytesRead: 0, buffer };
      staleBytes.copy(buffer, offset);
      return { bytesRead: staleBytes.byteLength, buffer };
    };
    snapshot = await baziDttNoticeReconciliationTestOnly.readStableWorkspaceFile(
      temporaryRoot,
      "data/identity.bin",
      1024
    );
  } finally {
    fileHandlePrototype.read = nativeRead;
  }
  assert.equal(poisonedReadCalls, 0);
  assert.deepEqual(Buffer.from(snapshot.bytes), currentBytes);
  assert.equal(
    snapshot.rawSha256,
    createHash("sha256").update(currentBytes).digest("hex")
  );
});

test("caller input must match the immutable persisted overlay before a branded result is returned", async () => {
  const overlay = await persisted();
  const verified = await verifyBaziDttNoticeReconciliation(workspaceRoot, overlay);
  assert.equal(isVerifiedBaziDttNoticeReconciliation(verified), true);
  const changed = clone(overlay);
  changed.createdAt = "2026-08-30T00:00:01.000Z";
  reseal(changed);
  await assert.rejects(
    verifyBaziDttNoticeReconciliation(workspaceRoot, changed),
    (error) => error?.code === "RECONCILIATION_SELF_RESEAL_FORBIDDEN"
  );
});

test("CLI success is calibrated to offline mechanical verification and prints all red gates", async () => {
  const child = spawnSync(
    process.execPath,
    [path.join(workspaceRoot, "scripts/verify-bazi-dtt-notice-reconciliation.mjs")],
    { cwd: workspaceRoot, encoding: "utf8" }
  );
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  const output = JSON.parse(child.stdout);
  const bytes = await readFile(artifactPath);
  assert.equal(output.offlineDttNoticeReconciliationOverlayMechanicallyVerified, true);
  assert.equal(output.rawBytes, bytes.byteLength);
  assert.equal(output.rawSha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(output.resolved, false);
  assert.equal(output.promotionBlocked, true);
  assert.equal(output.bindingFrozenVerified, 0);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicDeploymentAuthorized, false);
  assert.equal(output.expertClaimsAuthorized, false);
  assert.equal(output.crossFileAtomicSnapshot, false);
  assert.equal(output.mutationEpochAvailable, false);
  assert.equal(output.intervalMutationExcluded, false);
  assert.equal(output.abaExcluded, false);
});
