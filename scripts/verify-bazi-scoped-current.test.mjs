import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
  BAZI_SCOPED_CURRENT_PURPOSES,
  BaziScopedCurrentError,
  baziScopedCurrentTestOnly,
  getBaziScopedCurrentAbsolutePath,
  getBaziScopedCurrentRelativePath,
  isVerifiedBaziScopedCurrentResolution,
  loadBaziCurrentDomainManifest,
  loadBaziCurrentExpertReviewPacket,
  loadBaziCurrentExpertReviewProgress,
  loadBaziCurrentSourceBinding,
  loadBaziCurrentSourceRights,
  serializeBaziScopedCurrentResolution
} from "./bazi-scoped-current-lib.mjs";
import {
  CURRENT_INDEX_FAMILY_POLICIES,
  CURRENT_INDEX_RELATIVE_PATH,
  enumerateFamilyVersions,
  getCurrentIndexSummary,
  isVerifiedCurrentIndex,
  loadCurrentIndex
} from "./current-index-lib.mjs";
import {
  HISTORY_CHECKPOINT_RELATIVE_PATH
} from "./history-checkpoint-lib.mjs";
import {
  BAZI_EXPERT_REVIEW_QUESTION_IDS,
  BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS,
  computeBaziExpertReviewIntakeRecordDigest,
  computeExpertReviewPacketDigest,
  preflightBaziExpertOriginalOpinion
} from "./bazi-expert-review-packet-lib.mjs";
import { getBaziExpertProgressCliOutcome } from "./bazi-scoped-current-cli-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SHA256 = /^[0-9a-f]{64}$/u;

async function syntheticOriginalOpinions() {
  const packet = JSON.parse(await readFile(path.join(ROOT, "content", "bazi-strength-expert-review-packet.v1.json"), "utf8"));
  const gap = JSON.parse(await readFile(path.join(ROOT, "content", "system-admission", "bazi-expert-review-intake-gap.v1.json"), "utf8"));
  return ["a", "b"].map((suffix, position) => {
    const record = {
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_original_opinion_v1",
      recordId: `test-only.synthetic-original-${suffix}`,
      recordVersion: "1.0.0",
      createdAt: "2026-08-29T03:30:00.000Z",
      reviewPurpose: "candidate_feedback_only",
      sessionBinding: {
        systemId: "bazi",
        surfaceId: "single-chart-report",
        surfaceVersion: "1.7.0",
        packetId: gap.approvedPacketBinding.packetId,
        packetDigest: gap.approvedPacketBinding.packetDigest,
        packetRawSha256: gap.approvedPacketBinding.rawSha256,
        readinessLedgerId: gap.readinessLedgerBinding.ledgerId,
        readinessLedgerDigest: gap.readinessLedgerBinding.ledgerDigest,
        reviewQuestionIds: [...BAZI_EXPERT_REVIEW_QUESTION_IDS],
        independenceFactorIds: [...BAZI_EXPERT_REVIEW_INDEPENDENCE_FACTOR_IDS]
      },
      payload: {
        opinionKind: "original",
        slotId: `domain-expert-${suffix}`,
        reviewerBindingRef: { recordId: `test-only.synthetic-identity-${suffix}`, recordDigest: String(position + 1).repeat(64) },
        independenceAssessmentRef: { recordId: "test-only.synthetic-independence", recordDigest: "3".repeat(64) },
        independenceCompletedAt: "2026-08-29T01:30:00.000Z",
        reviewStartedAt: "2026-08-29T02:00:00.000Z",
        submittedAt: "2026-08-29T03:00:00.000Z",
        priorExposureState: "none_declared",
        responses: BAZI_EXPERT_REVIEW_QUESTION_IDS.map((questionId, index) => ({
          responseId: `test-only.synthetic-response-${suffix}-${index}`,
          questionId,
          position: suffix === "a" ? "support" : "oppose",
          originalText: "SYNTHETIC CONTRACT FIXTURE, NOT A REAL EXPERT OPINION",
          rationale: "Synthetic structure only; no identity or qualification assertion.",
          evidenceRefs: [],
          uncertainties: ["synthetic-only"],
          affectedBindingIds: [],
          affectedStructures: [],
          highRiskBoundary: "defer"
        })),
        scopeStatement: "SYNTHETIC CONTRACT FIXTURE ONLY",
        excludedScopes: [...packet.reviewScope.excludedScopes],
        parentOriginalOpinionRef: null
      },
      integrity: {
        hashAlgorithm: "SHA-256",
        digestDomain: "hakimi.bazi.expert-review-intake-record.v1",
        recordDigest: "0".repeat(64),
        digestIsDigitalSignature: false,
        authenticityEstablished: false
      }
    };
    record.integrity.recordDigest = computeBaziExpertReviewIntakeRecordDigest(record);
    return record;
  });
}

function refreshSyntheticOriginal(record) {
  record.integrity.recordDigest = computeBaziExpertReviewIntakeRecordDigest(record);
  return record;
}

async function syntheticCurrentSessionOpinions() {
  const index = await loadCurrentIndex(ROOT);
  const selected = index.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent;
  assert.notEqual(selected, null);
  const readiness = index.entries.find((entry) =>
    entry.familyKey === "content/system-admission/bazi-binding-freeze-requirements").selectedCurrent;
  const bytes = await readFile(path.join(ROOT, selected.path));
  const snapshot = { path: selected.path, rawBytes: bytes.length,
    rawSha256: createHash("sha256").update(bytes).digest("hex"), bytes };
  const contract = baziScopedCurrentTestOnly.currentOriginalContractFromSnapshot(snapshot, selected, readiness);
  const taskTime = Date.parse(JSON.parse(bytes.toString("utf8")).createdAt);
  return (await syntheticOriginalOpinions()).map((template, index) => refreshSyntheticOriginal({
    ...template,
    recordId: `test-only.synthetic-selected-current-original-${index}`,
    createdAt: new Date(taskTime + 4 * 3_600_000).toISOString(),
    sessionBinding: structuredClone(contract.sessionBinding),
    payload: {
      ...template.payload,
      independenceCompletedAt: new Date(taskTime + 3_600_000).toISOString(),
      reviewStartedAt: new Date(taskTime + 2 * 3_600_000).toISOString(),
      submittedAt: new Date(taskTime + 3 * 3_600_000).toISOString()
    }
  }));
}

test("T3 expert progress reports received 0/1/2 structural originals while every qualified count remains zero", async () => {
  const records = await syntheticCurrentSessionOpinions();
  const before = JSON.stringify(records);
  for (const count of [0, 1, 2]) {
    const result = await loadBaziCurrentExpertReviewProgress(ROOT, records.slice(0, count));
    assert.equal(result.currentAvailable, true);
    assert.equal(result.artifact.path, "content/bazi-strength-expert-review-packet.current.json");
    const progress = result.expertReviewProgress;
    assert.equal(progress.receivedOriginalOpinions, count);
    assert.equal(progress.qualifiedIndependentOpinions, 0);
    assert.equal(progress.qualificationReceiptLoaderAvailable, false);
    assert.equal(progress.independenceState, "not_established");
    assert.equal(progress.status, "blocked");
    assert.equal(progress.structuralScope, "verified_current_packet_and_readiness");
    assert.match(progress.receivedCountMeaning, /current_bound_original_records_not_qualified_reviews/u);
    assert.equal(progress.expertReviewBundleComplete, false);
    assert.ok(progress.seats.every((seat) => seat.qualified === false && seat.currentScopeMatched === seat.originalReceived));
    assert.ok(progress.seats.every((seat) => seat.missingEvidence.includes("TRUSTED_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE")));
    assert.deepEqual(result.authorityBoundary, {
      formalAdmissionAuthorized: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    });
    const serialized = serializeBaziScopedCurrentResolution(result);
    assert.doesNotMatch(serialized, /originalText|rationale|SYNTHETIC CONTRACT FIXTURE/u);
    assert.equal(getBaziScopedCurrentAbsolutePath(result), path.resolve(ROOT, result.artifact.path));
  }
  assert.equal(JSON.stringify(records), before);
});

test("T3 repeated originals are deduplicated and cannot fill another seat", async () => {
  const [original] = await syntheticCurrentSessionOpinions();
  const result = await loadBaziCurrentExpertReviewProgress(ROOT, [original, structuredClone(original)]);
  assert.equal(result.expertReviewProgress.receivedOriginalOpinions, 1);
  assert.equal(result.expertReviewProgress.duplicateOriginalRecords, 1);
  assert.equal(result.expertReviewProgress.qualifiedIndependentOpinions, 0);
});

test("T3 mechanically selected expert progress cannot turn a blocked expert CLI gate green", () => {
  const selectedButBlocked = {
    currentAvailable: true,
    expertReviewProgress: {
      status: "blocked",
      qualificationReceiptLoaderAvailable: false,
      receivedOriginalOpinions: 2,
      qualifiedIndependentOpinions: 0
    }
  };
  assert.deepEqual(getBaziExpertProgressCliOutcome(selectedButBlocked), {
    exitCode: 1,
    code: "EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE"
  });
  assert.deepEqual(getBaziExpertProgressCliOutcome({ ...selectedButBlocked, currentAvailable: false }), {
    exitCode: 1,
    code: "CURRENT_UNAVAILABLE"
  });
  // Plain flags, even if supplied to this outcome formatter, cannot mint a
  // successful qualification outcome. This is a synthetic contract only.
  assert.deepEqual(getBaziExpertProgressCliOutcome({
    currentAvailable: true,
    expertReviewProgress: { status: "qualified", qualificationReceiptLoaderAvailable: true, qualifiedIndependentOpinions: 2 }
  }), { exitCode: 1, code: "EXPERT_REVIEW_GATE_BLOCKED" });
});

test("T3 conflicting originals, shared reviewer and differing independence references fail closed", async () => {
  const records = await syntheticCurrentSessionOpinions();
  const cases = [
    ["EXPERT_ORIGINAL_ID_CONFLICT", (value) => { value.recordId = records[0].recordId; }],
    ["EXPERT_SEAT_ORIGINAL_CONFLICT", (value) => { value.payload.slotId = records[0].payload.slotId; }],
    ["EXPERT_REVIEWER_DUPLICATE", (value) => { value.payload.reviewerBindingRef = structuredClone(records[0].payload.reviewerBindingRef); }],
    ["EXPERT_INDEPENDENCE_BINDING_MISMATCH", (value) => { value.payload.independenceAssessmentRef.recordDigest = "4".repeat(64); }]
  ];
  for (const [code, mutate] of cases) {
    const changed = structuredClone(records[1]);
    mutate(changed);
    refreshSyntheticOriginal(changed);
    await assert.rejects(loadBaziCurrentExpertReviewProgress(ROOT, [records[0], changed]), expectCode(code));
  }
});

test("T3 wrong historical session, caller qualification flags and callbacks cannot create qualified progress", async () => {
  const [original] = await syntheticOriginalOpinions();
  const wrongSession = structuredClone(original);
  wrongSession.sessionBinding.packetDigest = "a".repeat(64);
  refreshSyntheticOriginal(wrongSession);
  await assert.rejects(loadBaziCurrentExpertReviewProgress(ROOT, [wrongSession]), expectCode("CURRENT_REVIEW_SCOPE_MISMATCH"));
  await assert.rejects(loadBaziCurrentExpertReviewProgress(ROOT, [{ ...original, verified: true }]), expectCode("EXPERT_ORIGINAL_STRUCTURE_INVALID"));
  await assert.rejects(loadBaziCurrentExpertReviewProgress(ROOT, { qualified: true }), expectCode("EXPERT_PROGRESS_INPUT_INVALID"));
  await assert.rejects(loadBaziCurrentExpertReviewProgress(ROOT, [original], () => ({ qualified: true })), expectCode("EXPERT_PROGRESS_INPUT_INVALID"));
});

async function syntheticCurrentOriginalContract() {
  const packet = JSON.parse(await readFile(path.join(ROOT, "content", "bazi-strength-expert-review-packet.v1.json"), "utf8"));
  packet.packetId = "test-only.synthetic-current-expert-packet/2.0.0";
  packet.packetDigest = computeExpertReviewPacketDigest(packet);
  const bytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`, "utf8");
  const selected = {
    path: "content/bazi-strength-expert-review-packet.v2.0.0.json",
    rawBytes: bytes.length,
    rawSha256: createHash("sha256").update(bytes).digest("hex"),
    packetId: packet.packetId,
    packetDigest: packet.packetDigest
  };
  const snapshot = { ...selected, bytes };
  const readiness = {
    artifactId: "test-only.synthetic-current-readiness/9.0.0",
    semanticDigest: "9".repeat(64)
  };
  const contract = baziScopedCurrentTestOnly.currentOriginalContractFromSnapshot(snapshot, selected, readiness);
  const legacyTemplates = await syntheticOriginalOpinions();
  const records = legacyTemplates.map((template, index) => {
    // Construct a new synthetic current-session record. The adapter never
    // rewrites a real input to this tuple or back to the historical tuple.
    const record = {
      ...template,
      recordId: `test-only.synthetic-current-original-${index}`,
      sessionBinding: structuredClone(contract.sessionBinding),
      integrity: { ...template.integrity, recordDigest: "0".repeat(64) }
    };
    record.integrity.recordDigest = computeBaziExpertReviewIntakeRecordDigest(record);
    return record;
  });
  return { packet, snapshot, selected, readiness, contract, records };
}

test("T3 current original adapter accepts actual current tuples without relabeling original records", async () => {
  const { contract, records } = await syntheticCurrentOriginalContract();
  const before = JSON.stringify(records);
  for (const count of [0, 1, 2]) {
    const checked = records.slice(0, count).map((record) => baziScopedCurrentTestOnly.preflightCurrentOriginalOpinion(record, contract));
    assert.equal(checked.length, count);
    for (const [index, result] of checked.entries()) {
      assert.deepEqual(result.record, records[index]);
      assert.equal(result.recordDigest, records[index].integrity.recordDigest);
      assert.deepEqual(result.record.sessionBinding, contract.sessionBinding);
      assert.equal(isVerifiedCurrentIndex(result), false);
      assert.equal(isVerifiedBaziScopedCurrentResolution(result), false);
      assert.equal(Object.hasOwn(result, "qualified"), false);
      assert.throws(() => preflightBaziExpertOriginalOpinion(records[index]), /sessionBinding/u);
    }
  }
  assert.equal(JSON.stringify(records), before);
  assert.equal(records[0].payload.responses[0].position, "support");
  assert.equal(records[1].payload.responses[0].position, "oppose");
});

test("T3 current original adapter reports exact current scope mismatch for a different bound object", async () => {
  const { contract, records } = await syntheticCurrentOriginalContract();
  for (const [key, value] of [
    ["packetId", "test-only.other-packet"], ["packetDigest", "a".repeat(64)],
    ["packetRawSha256", "b".repeat(64)], ["readinessLedgerId", "test-only.other-readiness"],
    ["readinessLedgerDigest", "c".repeat(64)], ["systemId", "ziwei"],
    ["surfaceId", "other-surface"], ["surfaceVersion", "9.9.9"]
  ]) {
    const changed = structuredClone(records[0]);
    changed.sessionBinding[key] = value;
    refreshSyntheticOriginal(changed);
    assert.throws(() => baziScopedCurrentTestOnly.preflightCurrentOriginalOpinion(changed, contract), expectCode("CURRENT_REVIEW_SCOPE_MISMATCH"));
  }
});

test("T3 current original adapter preserves field chronology reference response and scope restrictions", async () => {
  const { contract, records } = await syntheticCurrentOriginalContract();
  for (const mutate of [
    (value) => { value.verified = true; },
    (value) => { value.payload.opinionKind = "supplement"; },
    (value) => { value.payload.priorExposureState = "exposure_disclosed"; },
    (value) => { value.createdAt = "+010000-01-01T00:00:00.000Z"; },
    (value) => { value.payload.independenceCompletedAt = "2026-08-29T04:00:00.000Z"; },
    (value) => { value.payload.submittedAt = "2026-08-29T04:00:00.000Z"; },
    (value) => { value.payload.reviewerBindingRef.recordDigest = "not-a-digest"; },
    (value) => { value.payload.responses.pop(); },
    (value) => { value.payload.responses[1].responseId = value.payload.responses[0].responseId; },
    (value) => { value.payload.responses[0].questionId = value.payload.responses[1].questionId; },
    (value) => { value.payload.responses[0].uncertainties = ["duplicate", "duplicate"]; },
    (value) => { value.payload.responses[0].affectedBindingIds = ["binding:outside-current-scope"]; },
    (value) => { value.payload.responses[0].affectedStructures = ["outside-current-structure"]; },
    (value) => { value.payload.responses[0].highRiskBoundary = "public_release"; },
    (value) => { value.payload.excludedScopes[0] = "changed-exclusion"; },
    (value) => { value.payload.parentOriginalOpinionRef = { recordId: "test-only.parent", recordDigest: "a".repeat(64) }; }
  ]) {
    const changed = structuredClone(records[0]);
    mutate(changed);
    refreshSyntheticOriginal(changed);
    assert.throws(() => baziScopedCurrentTestOnly.preflightCurrentOriginalOpinion(changed, contract), expectCode("EXPERT_ORIGINAL_STRUCTURE_INVALID"));
  }
});

test("T3 current original adapter verifies original digest and strict JSON bytes without changing inputs", async () => {
  const { contract, records } = await syntheticCurrentOriginalContract();
  const bytes = Buffer.from(JSON.stringify(records[0]), "utf8");
  const before = Buffer.from(bytes);
  assert.deepEqual(baziScopedCurrentTestOnly.preflightCurrentOriginalOpinion(bytes, contract).record, records[0]);
  assert.deepEqual(bytes, before);
  const wrongDigest = structuredClone(records[0]);
  wrongDigest.integrity.recordDigest = "a".repeat(64);
  assert.throws(() => baziScopedCurrentTestOnly.preflightCurrentOriginalOpinion(wrongDigest, contract), expectCode("EXPERT_ORIGINAL_STRUCTURE_INVALID"));
  const duplicateKey = Buffer.from(bytes.toString("utf8").replace('{"schemaVersion":', '{"schemaVersion":"1.0.0","schemaVersion":'));
  assert.throws(() => baziScopedCurrentTestOnly.preflightCurrentOriginalOpinion(duplicateKey, contract), expectCode("EXPERT_ORIGINAL_STRUCTURE_INVALID"));
});

test("T3 current packet contract rechecks selected raw and semantic identities and cannot mint authority", async () => {
  const { snapshot, selected, readiness, contract } = await syntheticCurrentOriginalContract();
  assert.equal(isVerifiedCurrentIndex(contract), false);
  assert.equal(isVerifiedBaziScopedCurrentResolution(contract), false);
  for (const override of [
    { rawSha256: "a".repeat(64) }, { rawBytes: selected.rawBytes + 1 },
    { packetId: "test-only.other-current-packet" }, { packetDigest: "b".repeat(64) }
  ]) {
    assert.throws(() => baziScopedCurrentTestOnly.currentOriginalContractFromSnapshot(snapshot, { ...selected, ...override }, readiness), expectCode("SELECTED_CURRENT_IDENTITY_DRIFT"));
  }
  assert.throws(() => baziScopedCurrentTestOnly.currentOriginalContractFromSnapshot(snapshot, selected, null), expectCode("CURRENT_READINESS_UNAVAILABLE"));
  assert.deepEqual(getBaziExpertProgressCliOutcome({ currentAvailable: true, expertReviewProgress: { status: "blocked", qualificationReceiptLoaderAvailable: false } }), {
    exitCode: 1, code: "EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE"
  });
});
const CLIS = Object.freeze({
  [BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding]: path.resolve(
    ROOT,
    "scripts",
    "resolve-bazi-current-source-binding.mjs"
  ),
  [BAZI_SCOPED_CURRENT_PURPOSES.sourceRights]: path.resolve(
    ROOT,
    "scripts",
    "resolve-bazi-current-source-rights.mjs"
  ),
  [BAZI_SCOPED_CURRENT_PURPOSES.domainManifest]: path.resolve(
    ROOT,
    "scripts",
    "resolve-bazi-current-domain-manifest.mjs"
  ),
  [BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket]: path.resolve(
    ROOT,
    "scripts",
    "resolve-bazi-current-expert-review-packet.mjs"
  )
});

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "NODE_DEBUG", "NODE_REPL_EXTERNAL_MODULE"]) {
    if (!(key in extra)) delete environment[key];
  }
  return environment;
}

function collectFixturePaths(value, output = new Set()) {
  if (value === null || typeof value !== "object") return output;
  if (typeof value.path === "string"
    && /^(?:content|packages)\//u.test(value.path)
    && !value.path.split("/").some((segment) =>
      segment === "" || segment === "." || segment === "..")) {
    output.add(value.path);
  }
  for (const key of Object.keys(value)) collectFixturePaths(value[key], output);
  return output;
}

async function copyRelative(sourceRoot, destinationRoot, relativePath) {
  const source = path.resolve(sourceRoot, ...relativePath.split("/"));
  const destination = path.resolve(destinationRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function makeWorkspace(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-scoped-current-test-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const indexPath = path.resolve(ROOT, ...CURRENT_INDEX_RELATIVE_PATH.split("/"));
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const paths = collectFixturePaths(index);
  paths.add(CURRENT_INDEX_RELATIVE_PATH);
  paths.add(HISTORY_CHECKPOINT_RELATIVE_PATH);
  for (const familyPolicy of Object.values(CURRENT_INDEX_FAMILY_POLICIES)) {
    const members = await enumerateFamilyVersions(ROOT, familyPolicy);
    for (const member of members) paths.add(member.path);
  }
  for (const relativePath of paths) await copyRelative(ROOT, workspace, relativePath);
  return { workspace, index };
}

async function replaceIndentationWithoutChangingLength(absolutePath) {
  const before = await readFile(absolutePath);
  const text = before.toString("utf8");
  const changed = text.replace("  \"", " \t\"");
  assert.notEqual(changed, text, absolutePath);
  assert.equal(Buffer.byteLength(changed, "utf8"), before.byteLength, absolutePath);
  assert.doesNotThrow(() => JSON.parse(changed), absolutePath);
  await writeFile(absolutePath, changed, "utf8");
}

function expectCode(code) {
  return (error) => error instanceof BaziScopedCurrentError && error.code === code;
}

function expectedVersionedSelection(index, familyKey) {
  const matches = index.entries.filter((entry) => entry.familyKey === familyKey);
  assert.equal(matches.length, 1, familyKey);
  assert.notEqual(matches[0].selectedCurrent, null, familyKey);
  return matches[0].selectedCurrent;
}

function assertRecursivelyFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Object.keys(value)) assertRecursivelyFrozen(value[key], seen);
}

function expectedResolution(index, definition, selected) {
  return {
    schemaVersion: "1.0.0",
    recordType: "bazi_scoped_current_resolution_v1",
    purpose: definition.purpose,
    currentAvailable: true,
    currentIndex: {
      path: "content/system-admission/current-index.v1.json",
      indexId: index.indexId,
      indexDigest: index.indexDigest,
      rawSha256: definition.indexRawSha256
    },
    selection: {
      kind: "versioned_family",
      familyKey: definition.familyKey,
      selectionState: definition.selectionState,
      version: selected.version
    },
    artifact: {
      path: selected.path,
      absolutePath: path.resolve(ROOT, ...selected.path.split("/")),
      rawBytes: selected.rawBytes,
      rawSha256: selected.rawSha256,
      artifactIdField: selected.artifactIdField,
      artifactId: selected.artifactId,
      semanticDigestField: selected.semanticDigestField,
      semanticDigest: selected.semanticDigest
    },
    authorityBoundary: structuredClone(index.authorityBoundary),
    snapshotBoundary: {
      crossFileAtomicSnapshot: index.snapshotBoundary.crossFileAtomicSnapshot,
      selectedArtifactStableRereadAfterIndexVerification: true,
      intervalMutationExcludedAcrossFiles:
        index.snapshotBoundary.intervalMutationExcludedAcrossFiles,
      abaExcluded: index.snapshotBoundary.abaExcluded
    }
  };
}

test("source binding and source rights resolve the dynamically selected verified identities", async () => {
  const index = await loadCurrentIndex(ROOT);
  const indexRawSha256 = getCurrentIndexSummary(index).artifact.rawSha256;
  const cases = [
    {
      load: loadBaziCurrentSourceBinding,
      purpose: BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding,
      familyKey: "content/bazi-strength-source-binding-candidates",
      indexRawSha256
    },
    {
      load: loadBaziCurrentSourceRights,
      purpose: BAZI_SCOPED_CURRENT_PURPOSES.sourceRights,
      familyKey: "content/bazi-strength-source-rights-candidates",
      indexRawSha256
    }
  ];
  for (const entry of cases) {
    const expected = expectedVersionedSelection(index, entry.familyKey);
    const indexedEntry = index.entries.find((candidate) => candidate.familyKey === entry.familyKey);
    const resolution = await entry.load(ROOT);
    assert.equal(isVerifiedBaziScopedCurrentResolution(resolution), true);
    assert.equal(Object.isFrozen(resolution), true);
    assert.equal(resolution.purpose, entry.purpose);
    assert.equal(resolution.currentAvailable, true);
    assert.equal(resolution.currentIndex.indexDigest, index.indexDigest);
    assert.equal(resolution.selection.familyKey, entry.familyKey);
    assert.equal(resolution.artifact.path, expected.path);
    assert.equal(resolution.artifact.artifactId, expected.artifactId);
    assert.equal(resolution.artifact.rawSha256, expected.rawSha256);
    assert.match(resolution.artifact.rawSha256, SHA256);
    assert.equal(
      resolution.artifact.absolutePath,
      path.resolve(ROOT, ...expected.path.split("/"))
    );
    assert.equal(getBaziScopedCurrentRelativePath(resolution), expected.path);
    assert.equal(getBaziScopedCurrentAbsolutePath(resolution), resolution.artifact.absolutePath);
    assert.equal(resolution.snapshotBoundary.selectedArtifactStableRereadAfterIndexVerification, true);
    assert.equal(resolution.snapshotBoundary.crossFileAtomicSnapshot, false);
    assert.equal(resolution.authorityBoundary.releaseReady, false);
    assert.deepEqual(
      structuredClone(resolution),
      expectedResolution(index, {
        ...entry,
        selectionState: indexedEntry.selectionState
      }, expected)
    );
    assertRecursivelyFrozen(resolution);
    assert.equal(
      serializeBaziScopedCurrentResolution(resolution),
      `${JSON.stringify(expectedResolution(index, {
        ...entry,
        selectionState: indexedEntry.selectionState
      }, expected))}\n`
    );
  }
});

test("scoped current resolution ignores valid same-length drift older than direct supersedes", async (t) => {
  const { workspace, index } = await makeWorkspace(t);
  const familyKey = "content/bazi-strength-source-binding-candidates";
  const familyPolicy = CURRENT_INDEX_FAMILY_POLICIES[familyKey];
  assert.ok(familyPolicy);
  const entry = index.entries.find((candidate) => candidate.familyKey === familyKey);
  assert.ok(entry);
  const currentPaths = new Set([
    entry.head?.path,
    entry.supersedes?.path,
    entry.selectedCurrent?.path
  ].filter((value) => typeof value === "string"));
  const members = await enumerateFamilyVersions(workspace, familyPolicy);
  const victim = members.find((member) => !currentPaths.has(member.path));
  assert.ok(victim, "source-binding fixture needs history older than direct supersedes");
  await replaceIndentationWithoutChangingLength(
    path.resolve(workspace, ...victim.path.split("/"))
  );

  const resolution = await loadBaziCurrentSourceBinding(workspace);
  assert.equal(isVerifiedBaziScopedCurrentResolution(resolution), true);
  assert.equal(resolution.artifact.path, entry.selectedCurrent.path);
  assert.equal(resolution.artifact.rawSha256, entry.selectedCurrent.rawSha256);
  assert.equal(resolution.currentIndex.indexDigest, index.indexDigest);
});

test("path and JSON APIs reject clones, spreads, and proxies without the private brand", async () => {
  const resolution = await loadBaziCurrentSourceBinding(ROOT);
  for (const unbranded of [
    structuredClone(resolution),
    { ...resolution },
    new Proxy(resolution, {})
  ]) {
    assert.equal(isVerifiedBaziScopedCurrentResolution(unbranded), false);
    for (const access of [
      getBaziScopedCurrentRelativePath,
      getBaziScopedCurrentAbsolutePath,
      serializeBaziScopedCurrentResolution
    ]) {
      assert.throws(
        () => access(unbranded),
        expectCode("RESOLUTION_PRIVATE_BRAND_REQUIRED")
      );
    }
  }
});

test("post-import WeakSet prototype pollution cannot mint a resolution brand", async () => {
  const resolution = await loadBaziCurrentSourceBinding(ROOT);
  const clone = structuredClone(resolution);
  const originalHas = WeakSet.prototype.has;
  try {
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedBaziScopedCurrentResolution(resolution), true);
    assert.equal(isVerifiedBaziScopedCurrentResolution(clone), false);
    assert.equal(getBaziScopedCurrentRelativePath(resolution), resolution.artifact.path);
    assert.throws(
      () => serializeBaziScopedCurrentResolution(clone),
      expectCode("RESOLUTION_PRIVATE_BRAND_REQUIRED")
    );
  } finally {
    WeakSet.prototype.has = originalHas;
  }
});

test("post-import Object.freeze pollution cannot produce a mutable branded resolution", async () => {
  const originalFreeze = Object.freeze;
  let resolution;
  try {
    Object.freeze = (value) => value;
    resolution = await loadBaziCurrentSourceBinding(ROOT);
  } finally {
    Object.freeze = originalFreeze;
  }
  assert.equal(isVerifiedBaziScopedCurrentResolution(resolution), true);
  assertRecursivelyFrozen(resolution);
  assert.throws(() => {
    resolution.authorityBoundary.releaseReady = true;
  }, TypeError);
  assert.equal(resolution.authorityBoundary.releaseReady, false);
});

test("post-import Array.filter pollution cannot redirect current to a historical member", async () => {
  const index = await loadCurrentIndex(ROOT);
  const entry = index.entries.find((candidate) =>
    candidate.familyKey === "content/bazi-strength-source-binding-candidates");
  const stale = entry.supersedes;
  assert.notEqual(stale, null);
  assert.notEqual(stale.path, entry.selectedCurrent.path);
  const forgedEntry = {
    ...entry,
    selectedCurrent: stale
  };
  const originalFilter = Array.prototype.filter;
  let resolution;
  try {
    Array.prototype.filter = function poisonedFilter(callback, thisArgument) {
      if (new Error().stack.includes("selectedVersionedBinding")) return [forgedEntry];
      return Reflect.apply(originalFilter, this, [callback, thisArgument]);
    };
    resolution = await loadBaziCurrentSourceBinding(ROOT);
  } finally {
    Array.prototype.filter = originalFilter;
  }
  assert.equal(resolution.artifact.path, entry.selectedCurrent.path);
  assert.equal(resolution.artifact.rawSha256, entry.selectedCurrent.rawSha256);
});

test("post-import path.resolve pollution cannot redirect the branded absolute path", async () => {
  const index = await loadCurrentIndex(ROOT);
  const selected = expectedVersionedSelection(
    index,
    "content/bazi-strength-source-binding-candidates"
  );
  const originalResolve = path.resolve;
  let resolution;
  try {
    path.resolve = function poisonedResolve(...arguments_) {
      const immediateCaller = new Error().stack.split("\n")[2] ?? "";
      if (immediateCaller.includes("bazi-scoped-current-lib.mjs")) {
        return process.platform === "win32"
          ? "C:\\forged\\artifact.json"
          : "/forged/artifact.json";
      }
      return Reflect.apply(originalResolve, path, arguments_);
    };
    resolution = await loadBaziCurrentSourceBinding(ROOT);
  } finally {
    path.resolve = originalResolve;
  }
  assert.equal(
    resolution.artifact.absolutePath,
    originalResolve(ROOT, ...selected.path.split("/"))
  );
});

test("serializer ignores inherited toJSON and a post-import JSON.stringify replacement", async () => {
  const resolution = await loadBaziCurrentSourceBinding(ROOT);
  const expected = serializeBaziScopedCurrentResolution(resolution);
  const originalStringify = JSON.stringify;
  const originalToJson = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  try {
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      value: () => "forged"
    });
    JSON.stringify = () => "\"forged\"";
    assert.equal(serializeBaziScopedCurrentResolution(resolution), expected);
  } finally {
    JSON.stringify = originalStringify;
    if (originalToJson === undefined) delete Object.prototype.toJSON;
    else Object.defineProperty(Object.prototype, "toJSON", originalToJson);
  }
});

test("serializer ignores post-import Array push/join and Object.hasOwn replacements", async () => {
  const resolution = await loadBaziCurrentSourceBinding(ROOT);
  const expected = serializeBaziScopedCurrentResolution(resolution);
  const originalPush = Array.prototype.push;
  const originalJoin = Array.prototype.join;
  const originalIterator = Array.prototype[Symbol.iterator];
  const originalHasOwn = Object.hasOwn;
  let actual;
  try {
    Array.prototype.push = function poisonedPush() { return this.length; };
    Array.prototype.join = () => "forged";
    Array.prototype[Symbol.iterator] = function* poisonedIterator() {};
    Object.hasOwn = () => false;
    actual = serializeBaziScopedCurrentResolution(resolution);
  } finally {
    Array.prototype.push = originalPush;
    Array.prototype.join = originalJoin;
    Array.prototype[Symbol.iterator] = originalIterator;
    Object.hasOwn = originalHasOwn;
  }
  assert.equal(actual, expected);
});

test("selected domain and expert tasks preserve historical anchors and reject absent selections", async () => {
  const index = await loadCurrentIndex(ROOT);
  const domainEntries = index.entries.filter((entry) =>
    entry.familyKey === "content/domain-release/bazi.single-chart-report.v1.7.0.manifest");
  assert.equal(domainEntries.length, 1);
  assert.notEqual(domainEntries[0].head, null);
  assert.equal(domainEntries[0].selectedCurrent.version, "2.3.0");
  const expert = index.nonVersionedSelections.baziExpertReviewPacket;
  assert.notEqual(expert.historicalAnchor, null);
  assert.equal(expert.currentAvailable, true);
  assert.equal(expert.selectedCurrent.path, "content/bazi-strength-expert-review-packet.current.json");
  assert.equal(expert.historicalAnchor.path, "content/bazi-strength-expert-review-packet.v1.json");
  const domain = await loadBaziCurrentDomainManifest(ROOT);
  const packet = await loadBaziCurrentExpertReviewPacket(ROOT);
  assert.equal(domain.artifact.path, domainEntries[0].selectedCurrent.path);
  assert.equal(packet.artifact.path, expert.selectedCurrent.path);
  assert.throws(
    () => baziScopedCurrentTestOnly.selectedVersionedBinding({ entries: [{
      familyKey: domainEntries[0].familyKey, selectedCurrent: null
    }] }, { familyKey: domainEntries[0].familyKey }, BAZI_SCOPED_CURRENT_PURPOSES.domainManifest),
    expectCode("CURRENT_UNAVAILABLE")
  );
  assert.throws(
    () => baziScopedCurrentTestOnly.selectedExpertPacket({ nonVersionedSelections: {
      baziExpertReviewPacket: { currentAvailable: false, selectedCurrent: null }
    } }, { selectionKey: "baziExpertReviewPacket" }, BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket),
    expectCode("CURRENT_UNAVAILABLE")
  );
});

test("successful CLIs emit the exact branded machine JSON with path, ID, and raw SHA", async () => {
  for (const [purpose, load] of [
    [BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding, loadBaziCurrentSourceBinding],
    [BAZI_SCOPED_CURRENT_PURPOSES.sourceRights, loadBaziCurrentSourceRights]
  ]) {
    const expected = await load(ROOT);
    const outcome = spawnSync(process.execPath, [CLIS[purpose]], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    assert.equal(outcome.status, 0, outcome.stderr);
    assert.equal(outcome.stderr, "");
    assert.equal(outcome.stdout, serializeBaziScopedCurrentResolution(expected));
    const parsed = JSON.parse(outcome.stdout);
    assert.equal(parsed.purpose, purpose);
    assert.equal(parsed.currentAvailable, true);
    assert.equal(typeof parsed.artifact.path, "string");
    assert.equal(typeof parsed.artifact.absolutePath, "string");
    assert.equal(typeof parsed.artifact.artifactId, "string");
    assert.match(parsed.artifact.rawSha256, SHA256);
  }
});

test("Windows PowerShell consumes the JSON path through ConvertFrom-Json and LiteralPath", {
  skip: process.platform !== "win32"
}, () => {
  for (const purpose of [
    BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding,
    BAZI_SCOPED_CURRENT_PURPOSES.sourceRights
  ]) {
    const outcome = spawnSync(process.execPath, [CLIS[purpose]], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    assert.equal(outcome.status, 0, outcome.stderr);
    const parsed = JSON.parse(outcome.stdout);
    const powershell = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$jsonText = [Environment]::GetEnvironmentVariable('HAKIMI_SCOPED_CURRENT_JSON'); "
          + "$value = $jsonText | ConvertFrom-Json; "
          + "if (-not (Test-Path -LiteralPath ([string]$value.artifact.absolutePath) -PathType Leaf)) { exit 19 }; "
          + "[Console]::Out.Write([string]$value.artifact.path)"
      ],
      {
        cwd: os.tmpdir(),
        encoding: "utf8",
        env: cleanEnvironment({ HAKIMI_SCOPED_CURRENT_JSON: outcome.stdout }),
        timeout: 120_000
      }
    );
    assert.equal(powershell.status, 0, powershell.stderr);
    assert.equal(powershell.stdout, parsed.artifact.path);
  }
});

test("live auditors consume scoped current selectors instead of historical ledger filenames", async () => {
  const [sourceAudit, rightsAudit] = await Promise.all([
    readFile(path.resolve(ROOT, "scripts", "audit-bazi-source-binding-candidates-live.ps1"), "utf8"),
    readFile(path.resolve(ROOT, "scripts", "audit-bazi-source-rights-candidates-live.ps1"), "utf8")
  ]);
  assert.match(sourceAudit, /resolve-bazi-current-source-binding\.mjs/u);
  assert.match(rightsAudit, /resolve-bazi-current-source-rights\.mjs/u);
  assert.match(rightsAudit, /resolve-bazi-current-source-binding\.mjs/u);
  for (const text of [sourceAudit, rightsAudit]) {
    assert.doesNotMatch(text, /bazi-strength-source-binding-candidates\.v1\.json/u);
    assert.doesNotMatch(text, /bazi-strength-source-rights-candidates\.v1\.json/u);
  }
});

test("current domain CLI verifies inputs while current expert CLI remains qualification blocked", () => {
  for (const purpose of [
    BAZI_SCOPED_CURRENT_PURPOSES.domainManifest,
    BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket
  ]) {
    const outcome = spawnSync(process.execPath, [CLIS[purpose]], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    if (purpose === BAZI_SCOPED_CURRENT_PURPOSES.expertReviewPacket) {
      assert.equal(outcome.status, 1);
      const progress = JSON.parse(outcome.stdout);
      assert.equal(progress.currentAvailable, true);
      assert.equal(progress.expertReviewProgress.receivedOriginalOpinions, 0);
      assert.equal(progress.expertReviewProgress.qualifiedIndependentOpinions, 0);
      assert.equal(progress.expertReviewProgress.status, "blocked");
      assert.equal(outcome.stderr, "EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE\n");
    } else {
      assert.equal(outcome.status, 0, outcome.stderr);
      assert.equal(outcome.stderr, "");
      const resolution = JSON.parse(outcome.stdout);
      assert.equal(resolution.currentAvailable, true);
      assert.equal(resolution.artifact.artifactId, "hakimi.bazi.single-chart-report.domain-release-manifest/2.3.0");
      assert.equal(resolution.authorityBoundary.releaseReady, false);
      assert.equal(resolution.authorityBoundary.expertClaimsAuthorized, false);
    }
  }
});

test("all four fixed-purpose CLIs reject caller operands", () => {
  for (const cli of Object.values(CLIS)) {
    const outcome = spawnSync(process.execPath, [cli, "caller-path.json"], {
      cwd: ROOT,
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    assert.equal(outcome.status, 1);
    assert.equal(outcome.stdout, "");
    assert.equal(outcome.stderr, "ARGUMENTS_FORBIDDEN\n");
  }
});

test("all four fixed-purpose CLIs reject visible preload injection", () => {
  const harmlessImport = pathToFileURL(
    path.resolve(ROOT, "scripts", "bazi-scoped-current-lib.mjs")
  ).href;
  for (const cli of Object.values(CLIS)) {
    const outcome = spawnSync(process.execPath, ["--import", harmlessImport, cli], {
      cwd: ROOT,
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    assert.equal(outcome.status, 1);
    assert.equal(outcome.stdout, "");
    assert.equal(outcome.stderr, "PRELOAD_ENVIRONMENT_FORBIDDEN\n");
  }
});

test("the fixed CLI bootstrap rejects representative still-visible Node preload spellings", () => {
  const cli = CLIS[BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding];
  const harmlessImport = pathToFileURL(
    path.resolve(ROOT, "scripts", "bazi-scoped-current-lib.mjs")
  ).href;
  const cases = [
    { argv: ["--import", harmlessImport, cli], env: cleanEnvironment() },
    { argv: [`--import=${harmlessImport}`, cli], env: cleanEnvironment() },
    { argv: ["--require", "node:path", cli], env: cleanEnvironment() },
    { argv: ["--require=node:path", cli], env: cleanEnvironment() },
    { argv: ["-r", "node:path", cli], env: cleanEnvironment() },
    { argv: [cli], env: cleanEnvironment({ NODE_OPTIONS: "--require=node:path" }) },
    { argv: [cli], env: cleanEnvironment({ NODE_PATH: path.resolve(ROOT, "scripts") }) }
  ];
  for (const entry of cases) {
    const outcome = spawnSync(process.execPath, entry.argv, {
      cwd: ROOT,
      encoding: "utf8",
      env: entry.env,
      timeout: 120_000
    });
    assert.equal(outcome.status, 1, `${entry.argv.join(" ")}\n${outcome.stderr}`);
    assert.equal(outcome.stdout, "");
    assert.equal(outcome.stderr, "PRELOAD_ENVIRONMENT_FORBIDDEN\n");
  }
});

test("malformed visible execArgv is rejected without a stack or path leak", () => {
  const cli = CLIS[BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding];
  for (const mutation of [
    "process.execArgv[0]=null",
    "process.execArgv.length=2;delete process.execArgv[0]"
  ]) {
    const outcome = spawnSync(
      process.execPath,
      [`--import=data:text/javascript,${mutation}`, cli],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: cleanEnvironment(),
        timeout: 120_000
      }
    );
    assert.equal(outcome.status, 1, outcome.stderr);
    assert.equal(outcome.stdout, "");
    assert.equal(outcome.stderr, "PRELOAD_ENVIRONMENT_FORBIDDEN\n");
  }
});

test("preloads that erase their own evidence remain outside the visible-state claim", () => {
  const cli = CLIS[BAZI_SCOPED_CURRENT_PURPOSES.sourceBinding];
  const erasedExecArgv = spawnSync(
    process.execPath,
    ["--import=data:text/javascript,process.execArgv.length=0", cli],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    }
  );
  assert.equal(erasedExecArgv.status, 0, erasedExecArgv.stderr);
  assert.equal(JSON.parse(erasedExecArgv.stdout).currentAvailable, true);

  const erasedEnvironment = spawnSync(process.execPath, [cli], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnvironment({
      NODE_OPTIONS: "--import=data:text/javascript,delete%20process.env.NODE_OPTIONS;process.execArgv.length=0"
    }),
    timeout: 120_000
  });
  assert.equal(erasedEnvironment.status, 0, erasedEnvironment.stderr);
  assert.equal(JSON.parse(erasedEnvironment.stdout).currentAvailable, true);
});

test("importing fixed CLI modules has no stdout, stderr, or current-resolution side effect", () => {
  const imports = Object.values(CLIS)
    .map((cli) => `await import(${JSON.stringify(pathToFileURL(cli).href)});`)
    .join("");
  const outcome = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `${imports}process.stdout.write("IMPORT_OK\\n");`],
    {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    }
  );
  assert.equal(outcome.status, 0, outcome.stderr);
  assert.equal(outcome.stderr, "");
  assert.equal(outcome.stdout, "IMPORT_OK\n");
});

test("real entrypoint symlinks execute instead of silently exiting", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-scoped-current-link-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [purpose, cli] of Object.entries(CLIS)) {
    const linkedCli = path.join(directory, `${purpose}.mjs`);
    try {
      await symlink(cli, linkedCli, "file");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
        t.skip(`symbolic links unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    const direct = spawnSync(process.execPath, [cli], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    const outcome = spawnSync(process.execPath, [linkedCli], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment(),
      timeout: 120_000
    });
    assert.deepEqual(
      { status: outcome.status, stdout: outcome.stdout, stderr: outcome.stderr },
      { status: direct.status, stdout: direct.stdout, stderr: direct.stderr },
      purpose
    );
  }
});

async function currentExpertClosureFixture() {
  const index = JSON.parse(await readFile(path.join(ROOT, CURRENT_INDEX_RELATIVE_PATH), "utf8"));
  const selected = (familyKey) => {
    const binding = index.entries.find((entry) => entry.familyKey === familyKey)?.selectedCurrent;
    assert.notEqual(binding, null);
    assert.notEqual(binding, undefined);
    return binding;
  };
  const snapshot = async (relativePath) => {
    const bytes = await readFile(path.join(ROOT, relativePath));
    return { path: relativePath, bytes, rawBytes: bytes.length,
      rawSha256: createHash("sha256").update(bytes).digest("hex") };
  };
  const packetSnapshot = await snapshot("content/bazi-strength-expert-review-packet.current.json");
  const packet = JSON.parse(packetSnapshot.bytes.toString("utf8"));
  const sourceBinding = selected("content/bazi-strength-source-binding-candidates");
  const sourceRights = selected("content/bazi-strength-source-rights-candidates");
  const readinessBinding = selected("content/system-admission/bazi-binding-freeze-requirements");
  const readinessSnapshot = await snapshot(readinessBinding.path);
  const readiness = JSON.parse(readinessSnapshot.bytes.toString("utf8"));
  return {
    packetSnapshot,
    selectedPacket: { path: packetSnapshot.path, rawBytes: packetSnapshot.rawBytes,
      rawSha256: packetSnapshot.rawSha256, packetId: packet.packetId, packetDigest: packet.packetDigest },
    sourceBinding, sourceRights, readinessBinding,
    artifactSnapshots: await Promise.all(packet.artifactLocks.map((lock) => snapshot(lock.path))),
    readinessSnapshot,
    readinessBasisSnapshots: await Promise.all(readiness.basisArtifacts.map((basis) => snapshot(basis.path)))
  };
}

function mutateCurrentTaskFixture(fixture, mutate) {
  const packet = JSON.parse(fixture.packetSnapshot.bytes.toString("utf8"));
  mutate(packet);
  packet.packetDigest = computeExpertReviewPacketDigest(packet);
  const bytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`, "utf8");
  const rawSha256 = createHash("sha256").update(bytes).digest("hex");
  fixture.packetSnapshot = { ...fixture.packetSnapshot, bytes, rawBytes: bytes.length, rawSha256 };
  fixture.selectedPacket = { ...fixture.selectedPacket, rawBytes: bytes.length, rawSha256,
    packetId: packet.packetId, packetDigest: packet.packetDigest };
}

function mutateCurrentReadinessFixture(fixture, mutate) {
  const readiness = JSON.parse(fixture.readinessSnapshot.bytes.toString("utf8"));
  mutate(readiness);
  const bytes = Buffer.from(`${JSON.stringify(readiness, null, 2)}\n`, "utf8");
  const rawSha256 = createHash("sha256").update(bytes).digest("hex");
  fixture.readinessSnapshot = { ...fixture.readinessSnapshot, bytes, rawBytes: bytes.length, rawSha256 };
  fixture.readinessBinding = { ...fixture.readinessBinding, rawBytes: bytes.length, rawSha256 };
}

test("T2 current expert task closure verifies twelve inputs and eleven readiness basis identities without qualification", async () => {
  const fixture = await currentExpertClosureFixture();
  const contract = baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(fixture);
  assert.equal(fixture.artifactSnapshots.length, 12);
  assert.equal(fixture.readinessBasisSnapshots.length, 11);
  assert.equal(contract.sessionBinding.packetId, "hakimi.bazi.strength.expert-review-packet/1.6.0");
  assert.equal(contract.sessionBinding.readinessLedgerId, fixture.readinessBinding.artifactId);
  assert.equal(contract.bindingIds.length, 12);
  assert.equal(isVerifiedBaziScopedCurrentResolution(contract), false);
  assert.equal(Object.hasOwn(contract, "qualified"), false);
  const packet = JSON.parse(fixture.packetSnapshot.bytes.toString("utf8"));
  assert.equal(packet.gateSummary.reviewerSlotsOccupied, 0);
  assert.equal(packet.gateSummary.independentExpertReviewsVerified, 0);
  assert.equal(packet.gateSummary.expertClaimsAuthorized, false);
  assert.equal(packet.gateSummary.releaseReady, false);
});

test("T2 current expert task closure rejects every artifact lock drift and omitted inputs", async () => {
  for (let index = 0; index < 12; index += 1) {
    const fixture = await currentExpertClosureFixture();
    mutateCurrentTaskFixture(fixture, (packet) => { packet.artifactLocks[index].sha256 = "a".repeat(64); });
    assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(fixture),
      expectCode("CURRENT_EXPERT_ARTIFACT_DRIFT"));
  }
  const missing = await currentExpertClosureFixture();
  missing.artifactSnapshots.pop();
  assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(missing),
    expectCode("CURRENT_EXPERT_INPUT_CLOSURE_MISMATCH"));
});

test("T2 current expert task closure rejects source rights and readiness selection drift", async () => {
  for (const key of ["sourceBinding", "sourceRights", "readinessBinding"]) {
    const fixture = await currentExpertClosureFixture();
    fixture[key] = { ...fixture[key], rawSha256: "a".repeat(64) };
    assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(fixture),
      expectCode("CURRENT_EXPERT_SELECTED_INPUT_DRIFT"));
  }
  const wrongLedger = await currentExpertClosureFixture();
  mutateCurrentTaskFixture(wrongLedger, (packet) => {
    packet.sourceLedgerBindings.sourceBindingLedgerId = "test-only.other-selected-source";
  });
  assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(wrongLedger),
    expectCode("CURRENT_EXPERT_INPUT_CLOSURE_MISMATCH"));
});

test("T2 current expert task closure rejects readiness basis drift and current task backreferences", async () => {
  const drifted = await currentExpertClosureFixture();
  drifted.readinessBasisSnapshots[0] = { ...drifted.readinessBasisSnapshots[0], rawSha256: "a".repeat(64) };
  assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(drifted),
    expectCode("CURRENT_EXPERT_READINESS_BASIS_DRIFT"));
  const circular = await currentExpertClosureFixture();
  mutateCurrentReadinessFixture(circular, (readiness) => {
    readiness.basisArtifacts[1].path = circular.selectedPacket.path;
  });
  assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(circular),
    expectCode("CURRENT_EXPERT_INPUT_CLOSURE_MISMATCH"));
  const missingBinding = await currentExpertClosureFixture();
  mutateCurrentTaskFixture(missingBinding, (packet) => { packet.reviewScope.bindingIds.pop(); });
  assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(missingBinding),
    expectCode("CURRENT_EXPERT_INPUT_CLOSURE_MISMATCH"));
});

test("T2 current expert task closure rejects occupied seats authority promotion and altered review contracts", async () => {
  for (const mutate of [
    (packet) => { packet.reviewerSlots[0].status = "occupied"; },
    (packet) => { packet.gateSummary.independentExpertReviewsVerified = 1; },
    (packet) => { packet.releaseGovernance.expertClaimsAuthorized = true; }
  ]) {
    const fixture = await currentExpertClosureFixture();
    mutateCurrentTaskFixture(fixture, mutate);
    assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(fixture),
      expectCode("CURRENT_EXPERT_INPUT_CLOSURE_MISMATCH"));
  }
  for (const mutate of [
    (packet) => { packet.reviewQuestions[0].questionId = "test-only.other-question"; },
    (packet) => { packet.independenceChecklist.pop(); },
    (packet) => { packet.reviewScope.excludedScopes.pop(); }
  ]) {
    const fixture = await currentExpertClosureFixture();
    mutateCurrentTaskFixture(fixture, mutate);
    assert.throws(() => baziScopedCurrentTestOnly.assertCurrentExpertPacketInputClosure(fixture),
      expectCode("CURRENT_REVIEW_CONTRACT_INVALID"));
  }
});

test("T2 current domain mechanical summary must match the selected artifact and semantic identity", () => {
  const resolution = { artifact: {
    path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.3.0.json",
    rawBytes: 1234, rawSha256: "a".repeat(64),
    artifactId: "test-only.domain/2.3.0", semanticDigest: "b".repeat(64)
  } };
  const summary = {
    artifact: { path: resolution.artifact.path, bytes: 1234, sha256: "a".repeat(64) },
    manifestId: resolution.artifact.artifactId, manifestDigest: resolution.artifact.semanticDigest
  };
  assert.doesNotThrow(() => baziScopedCurrentTestOnly.assertCurrentDomainManifestMechanicalBinding(resolution, summary));
  for (const changed of [
    { ...summary, artifact: { ...summary.artifact, path: "test-only/other.json" } },
    { ...summary, artifact: { ...summary.artifact, bytes: 1235 } },
    { ...summary, artifact: { ...summary.artifact, sha256: "c".repeat(64) } },
    { ...summary, manifestId: "test-only.other-domain/2.3.0" },
    { ...summary, manifestDigest: "d".repeat(64) }
  ]) assert.throws(() => baziScopedCurrentTestOnly.assertCurrentDomainManifestMechanicalBinding(resolution, changed),
    expectCode("CURRENT_DOMAIN_MECHANICAL_BINDING_MISMATCH"));
});
