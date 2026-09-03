import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
  BaziExpertPublicEvidenceFollowupError,
  baziExpertPublicEvidenceFollowupTestOnly,
  canonicalStringifyBaziExpertPublicEvidenceFollowup,
  computeBaziExpertPublicEvidenceFollowupDigest,
  isVerifiedBaziExpertPublicEvidenceFollowup,
  loadBaziExpertPublicEvidenceFollowup,
  parseBaziExpertPublicEvidenceFollowupJsonBytes,
  readBaziExpertPublicEvidenceFollowup,
  verifyBaziExpertPublicEvidenceFollowup,
  verifyBaziExpertPublicEvidenceFollowupArtifact
} from "./bazi-expert-public-evidence-followup-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOLLOWUP_PATH = path.join(
  PROJECT_ROOT,
  ...BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH.split("/")
);
const BASIS_RELATIVE_PATH = "docs/阶段D八字现实专家公开证据跟进-child-v1-2026-08-29.md";
const PARENT_RELATIVE_PATH = "content/system-admission/bazi-expert-public-candidate-prescreen.v1.json";
const PARENT_BASIS_RELATIVE_PATH = "docs/阶段D八字现实专家公开候选预筛-2026-08-29.md";
const CLI_PATH = path.join(PROJECT_ROOT, "scripts", "verify-bazi-expert-public-evidence-followup.mjs");

const persistedFollowup = JSON.parse(await readFile(FOLLOWUP_PATH, "utf8"));

function clone(value = persistedFollowup) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.followupDigest = computeBaziExpertPublicEvidenceFollowupDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof BaziExpertPublicEvidenceFollowupError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectCodeAsync(fn, code) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof BaziExpertPublicEvidenceFollowupError);
    assert.equal(error.code, code);
    return true;
  });
}

async function copyWorkspaceFile(root, relativePath) {
  const source = path.join(PROJECT_ROOT, ...relativePath.split("/"));
  const target = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  return target;
}

async function makeWorkspaceFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-expert-followup-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const followupTarget = await copyWorkspaceFile(root, BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH);
  const basisTarget = await copyWorkspaceFile(root, BASIS_RELATIVE_PATH);
  const parentTarget = await copyWorkspaceFile(root, PARENT_RELATIVE_PATH);
  await copyWorkspaceFile(root, PARENT_BASIS_RELATIVE_PATH);
  return { root, followupTarget, basisTarget, parentTarget };
}

test("persisted D followup child passes strict parent, basis and branded verification", async () => {
  const result = await loadBaziExpertPublicEvidenceFollowup(PROJECT_ROOT);
  assert.equal(result.offlineFollowupArtifactMechanicallyVerified, true);
  assert.equal(result.parentPrescreenBound, true);
  assert.equal(result.candidateFollowups, 2);
  assert.equal(result.sourceObservations, 3);
  assert.equal(result.deduplicatedSourceGroups, 2);
  assert.equal(result.expertGateCount, 0);
  assert.equal(isVerifiedBaziExpertPublicEvidenceFollowup(result), true);
  assert.equal(isVerifiedBaziExpertPublicEvidenceFollowup({ ...result }), false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.followup));
  assert.ok(Object.isFrozen(result.followup.candidateFollowups[0]));
});

test("raw identity, semantic digest and basis identity are pinned", async () => {
  const result = await loadBaziExpertPublicEvidenceFollowup(PROJECT_ROOT);
  assert.deepEqual(result.followupArtifact, {
    path: BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
    rawBytes: 11_989,
    rawSha256: "1961f1e9118f24eba8ea2a7c782afa6e3748ed56e3a4de2c4bca3bf5f481bce3"
  });
  assert.equal(result.followupDigest, "3cbe882b03294119b75a3ba8e13bfcf60202529029aff0ea3821bf232f7619f9");
  assert.deepEqual(result.basisArtifact, {
    path: BASIS_RELATIVE_PATH,
    rawBytes: 5_517,
    rawSha256: "8ac95f9ea52cdf3aef7db2cc96f12a7fd780b00ea06d3b139d5deb8b8a0a982e"
  });
});

test("child is one-way bound to unchanged parent leads 002 and 003", async () => {
  const result = await loadBaziExpertPublicEvidenceFollowup(PROJECT_ROOT);
  assert.equal(result.followup.bindingBoundary.childToParentOnly, true);
  for (const key of [
    "parentMutated", "parentBacklinkAdded", "formalPacketMutated", "manifestMutated",
    "registryMutated", "crossSystemReceiptMutated", "countsTowardFormalExpertIntake"
  ]) {
    assert.equal(result.followup.bindingBoundary[key], false);
  }
  assert.deepEqual(result.followup.parentPrescreenArtifact.candidateLeadIds, [
    "bazi-public-lead-002", "bazi-public-lead-003"
  ]);
});

test("all three observations remain link-only operator records without semantic hash binding", () => {
  const followup = verifyBaziExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  assert.equal(followup.sourceObservations.length, 3);
  for (const observation of followup.sourceObservations) {
    assert.equal(observation.requestedUrl.startsWith("https://"), true);
    assert.equal(observation.deliveredBodyHashBindsSemanticSummary, false);
    assert.equal(observation.supportsFollowupDiscoveryOnly, true);
    assert.equal(observation.authoritative, false);
  }
  assert.equal(followup.storageBoundary.remoteResponseBodiesStored, 0);
  assert.equal(followup.storageBoundary.exactQuotesStored, 0);
  assert.equal(followup.storageBoundary.carrierFilesStored, 0);
  assert.equal(followup.rightsBoundary.distributionPolicy, "link_only");
  assert.equal(followup.rightsBoundary.rightsLegalConclusion, "not_established");
});

test("lead 002 records topic signals while every project answer and scope gate stays false", () => {
  const followup = verifyBaziExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  const lead = followup.candidateFollowups[0];
  assert.equal(lead.candidateLeadId, "bazi-public-lead-002");
  assert.deepEqual(lead.scopeSignalMatrix.map((entry) => entry.state), [
    "adjacent_public_topic_signal_observed_exact_project_question_unassessed",
    "adjacent_public_topic_signal_observed_exact_project_question_unassessed",
    "no_direct_public_evidence_observed",
    "adjacent_public_topic_signal_observed_exact_project_question_unassessed"
  ]);
  assert.equal(lead.publicTopicRelevanceObserved, true);
  assert.equal(lead.projectQuestionAnswered, false);
  assert.equal(lead.scopeVerified, false);
});

test("lead 003 records a role label and DOI literal without person merge, current-role or credential claims", () => {
  const followup = verifyBaziExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  const lead = followup.candidateFollowups[1];
  assert.equal(lead.candidateLeadId, "bazi-public-lead-003");
  assert.equal(lead.institutionRoleLabelObserved, true);
  assert.equal(lead.doiLiteralObserved, true);
  assert.equal(lead.crossRecordPersonIdentityBindingVerified, false);
  assert.equal(lead.currentRoleVerified, false);
  assert.equal(lead.identityVerified, false);
  assert.equal(lead.credentialVerified, false);
  assert.equal(lead.scopeSignalMatrix.every((entry) => entry.state === "not_assessed_in_this_followup"), true);
});

test("network provenance, redirect binding and publisher authenticity remain unverified", () => {
  const boundary = verifyBaziExpertPublicEvidenceFollowupArtifact(persistedFollowup).networkObservationBoundary;
  assert.equal(boundary.operatorRecordedNetworkFacts, true);
  assert.equal(boundary.doiResolverCountsAsIndependentFactUpstream, false);
  for (const key of [
    "operatorRecordedSummariesMechanicallyVerified", "automaticDecompressionMechanicallyVerified",
    "captureExecutionReceiptStored", "remoteCaptureMechanicallyVerified",
    "requestedToFinalUrlBindingEstablished", "redirectChainCaptured", "wireBytesCaptured",
    "tlsPeerCertificateCaptured", "futureFreshnessRevalidated",
    "publisherAuthenticityEstablished", "remoteNetworkProvenanceEstablished"
  ]) {
    assert.equal(boundary[key], false);
  }
});

test("all authority and formal expert counts remain zero or false", () => {
  const boundary = verifyBaziExpertPublicEvidenceFollowupArtifact(persistedFollowup).authorityBoundary;
  assert.equal(boundary.candidateLeadsObserved, 2);
  assert.equal(boundary.formalExpertSeatsOccupied, 0);
  assert.equal(boundary.expertGateCount, 0);
  for (const [key, value] of Object.entries(boundary)) {
    if (["candidateLeadsObserved", "formalExpertSeatsOccupied", "expertGateCount"].includes(key)) continue;
    assert.equal(value, false, key);
  }
});

test("source groups are exact and do not split one observation across upstream groups", () => {
  const followup = verifyBaziExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  assert.equal(followup.sourceGroupPolicy.sameGroupObservationsCountOnce, true);
  assert.equal(followup.sourceGroupPolicy.sourceObservationCount, 3);
  assert.equal(followup.sourceGroupPolicy.deduplicatedSourceGroupCount, 2);
  assert.deepEqual(followup.sourceGroups.map((entry) => entry.sourceUpstreamGroupId), [
    "JAPAN_DIVINATION_ASSOCIATION", "HUNG_KUANG_PUBLIC_RECORD_FAMILY"
  ]);
});

test("recomputed digest cannot rebind an observation to another candidate or rewrite its summary", () => {
  for (const mutate of [
    (value) => { value.sourceObservations[0].candidateLeadId = "bazi-public-lead-001"; },
    (value) => { value.sourceObservations[0].operatorRecordedSummary = "rewritten"; },
    (value) => { value.sourceObservations[0].deliveredBodySha256OperatorRecorded = "a".repeat(64); }
  ]) {
    const followup = clone();
    mutate(followup);
    expectCode(
      () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(followup)),
      "SOURCE_OBSERVATION_CATALOG_MISMATCH"
    );
  }
});

test("recomputed digest cannot promote a topic signal into a project answer", () => {
  const followup = clone();
  followup.candidateFollowups[0].scopeSignalMatrix[0].state = "project_answer_observed";
  expectCode(
    () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(followup)),
    "SCOPE_PROMOTION_FORBIDDEN"
  );
});

test("recomputed digest cannot promote candidate identity, role, credential, scope, independence, status or seat", () => {
  const mutations = [
    ["projectQuestionAnswered", true],
    ["crossRecordPersonIdentityBindingVerified", true],
    ["currentRoleVerified", true],
    ["identityVerified", true],
    ["credentialVerified", true],
    ["scopeVerified", true],
    ["independenceVerified", true],
    ["expertStatusVerified", true],
    ["countsTowardExpertGate", true],
    ["slotAssignment", "reviewer-A"]
  ];
  for (const [key, value] of mutations) {
    const followup = clone();
    followup.candidateFollowups[1][key] = value;
    expectCode(
      () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(followup)),
      "CANDIDATE_PROMOTION_FORBIDDEN"
    );
  }
});

test("recomputed digest cannot fabricate an extra source group or observation", () => {
  const duplicatedGroup = clone();
  duplicatedGroup.sourceGroups[1].sourceUpstreamGroupId = duplicatedGroup.sourceGroups[0].sourceUpstreamGroupId;
  expectCode(
    () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(duplicatedGroup)),
    "SOURCE_GROUP_DOUBLE_COUNT"
  );
  const duplicatedObservation = clone();
  duplicatedObservation.sourceObservations[1].sourceObservationId = duplicatedObservation.sourceObservations[0].sourceObservationId;
  expectCode(
    () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(duplicatedObservation)),
    "SOURCE_OBSERVATION_DUPLICATE"
  );
});

test("binding, storage, rights, network, integrity and authority boundaries reject promotion after reseal", () => {
  const cases = [
    ["bindingBoundary", "parentBacklinkAdded", true, "BINDING_PROMOTION_FORBIDDEN"],
    ["storageBoundary", "exactQuotesStored", 1, "STORAGE_PROMOTION_FORBIDDEN"],
    ["rightsBoundary", "redistributionRightsEstablished", true, "RIGHTS_PROMOTION_FORBIDDEN"],
    ["networkObservationBoundary", "remoteCaptureMechanicallyVerified", true, "NETWORK_PROMOTION_FORBIDDEN"],
    ["integrityBoundary", "crossFileAtomicSnapshot", true, "INTEGRITY_CLAIM_INVALID"],
    ["authorityBoundary", "expertClaimsAuthorized", true, "AUTHORITY_PROMOTION_FORBIDDEN"]
  ];
  for (const [boundary, key, value, code] of cases) {
    const followup = clone();
    followup[boundary][key] = value;
    expectCode(() => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(followup)), code);
  }
});

test("negative boundary catalog cannot be shortened after reseal", () => {
  const followup = clone();
  followup.doesNotEstablish.pop();
  expectCode(
    () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(followup)),
    "DOES_NOT_ESTABLISH_MISMATCH"
  );
});

test("unknown, private, body, opinion, expert-name and formal backlink fields are rejected", () => {
  const injections = [
    [[], "surprise", false],
    [["sourceObservations", 0], "pageBody", "copied body"],
    [["candidateFollowups", 0], "contactEmail", "candidate@example.invalid"],
    [["candidateFollowups", 0], "opinion", "agree"],
    [["candidateFollowups", 0], "expertName", "forbidden"],
    [[], "registryBacklink", { path: "forbidden" }]
  ];
  for (const [segments, key, value] of injections) {
    const followup = clone();
    let target = followup;
    for (const segment of segments) target = target[segment];
    target[key] = value;
    expectCode(
      () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(followup)),
      "UNKNOWN_FIELD_FORBIDDEN"
    );
  }
});

test("HTTP, credentials, fragment, login path and sensitive query URLs fail closed", () => {
  const urls = [
    "http://uranai-japan.or.jp/rp_archive/",
    "https://user:pass@uranai-japan.or.jp/rp_archive/",
    "https://uranai-japan.or.jp/rp_archive/#part",
    "https://uranai-japan.or.jp/login/",
    "https://uranai-japan.or.jp/rp_archive/?api_key=secret"
  ];
  for (const requestedUrl of urls) {
    const followup = clone();
    followup.sourceObservations[0].requestedUrl = requestedUrl;
    expectCode(
      () => verifyBaziExpertPublicEvidenceFollowupArtifact(reseal(followup)),
      requestedUrl.includes("login") || requestedUrl.includes("api_key")
        ? "SOURCE_URL_FORBIDDEN"
        : "SOURCE_URL_INVALID"
    );
  }
});

test("strict byte parser rejects duplicate keys, BOM, invalid UTF-8, empty and oversized input", () => {
  expectCode(
    () => parseBaziExpertPublicEvidenceFollowupJsonBytes(
      Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8")
    ),
    "JSON_DUPLICATE_KEY"
  );
  expectCode(
    () => parseBaziExpertPublicEvidenceFollowupJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    "JSON_BOM_FORBIDDEN"
  );
  expectCode(
    () => parseBaziExpertPublicEvidenceFollowupJsonBytes(Buffer.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
  expectCode(() => parseBaziExpertPublicEvidenceFollowupJsonBytes(Buffer.alloc(0)), "JSON_INVALID");
  expectCode(
    () => parseBaziExpertPublicEvidenceFollowupJsonBytes(Buffer.alloc(1_000_001, 0x61)),
    "JSON_TOO_LARGE"
  );
});

test("byte parser rejects Proxy, SharedArrayBuffer and resizable ArrayBuffer views", () => {
  expectCode(
    () => parseBaziExpertPublicEvidenceFollowupJsonBytes(new Proxy(new Uint8Array([0x7b, 0x7d]), {})),
    "JSON_PROXY_FORBIDDEN"
  );
  if (typeof SharedArrayBuffer === "function") {
    expectCode(
      () => parseBaziExpertPublicEvidenceFollowupJsonBytes(new Uint8Array(new SharedArrayBuffer(8))),
      "JSON_SHARED_BUFFER_FORBIDDEN"
    );
  }
  try {
    const resizable = new ArrayBuffer(8, { maxByteLength: 16 });
    if (resizable.resizable === true) {
      expectCode(
        () => parseBaziExpertPublicEvidenceFollowupJsonBytes(new Uint8Array(resizable)),
        "JSON_RESIZABLE_BUFFER_FORBIDDEN"
      );
    }
  } catch {
    // Runtime without resizable ArrayBuffer support.
  }
});

test("object input rejects accessors without invocation plus Proxy, Symbol, sparse arrays and -0", () => {
  const getterFollowup = clone();
  let invoked = false;
  Object.defineProperty(getterFollowup.authorityBoundary, "identityVerified", {
    enumerable: true,
    get() {
      invoked = true;
      return false;
    }
  });
  expectCode(() => verifyBaziExpertPublicEvidenceFollowupArtifact(getterFollowup), "INPUT_ACCESSOR_FORBIDDEN");
  assert.equal(invoked, false);

  expectCode(
    () => verifyBaziExpertPublicEvidenceFollowupArtifact(new Proxy(clone(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );
  const symbolFollowup = clone();
  symbolFollowup[Symbol("hidden")] = true;
  expectCode(() => verifyBaziExpertPublicEvidenceFollowupArtifact(symbolFollowup), "INPUT_SYMBOL_FORBIDDEN");
  const sparseFollowup = clone();
  sparseFollowup.sourceGroups = new Array(2);
  expectCode(() => verifyBaziExpertPublicEvidenceFollowupArtifact(sparseFollowup), "INPUT_ARRAY_INVALID");
  const negativeZeroFollowup = clone();
  negativeZeroFollowup.sourceGroupPolicy.sourceObservationCount = -0;
  expectCode(() => verifyBaziExpertPublicEvidenceFollowupArtifact(negativeZeroFollowup), "INPUT_VALUE_INVALID");
});

test("exported canonical stringifier rejects accessors and Proxy without invoking user code", () => {
  let invoked = false;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      invoked = true;
      return "forbidden";
    }
  });
  expectCode(() => canonicalStringifyBaziExpertPublicEvidenceFollowup(accessor), "INPUT_ACCESSOR_FORBIDDEN");
  assert.equal(invoked, false);
  expectCode(
    () => canonicalStringifyBaziExpertPublicEvidenceFollowup(new Proxy({ value: "x" }, {})),
    "INPUT_PROXY_FORBIDDEN"
  );
});

test("caller clone can be verified against persisted child and receives a non-forgeable brand", async () => {
  const readOnly = await readBaziExpertPublicEvidenceFollowup(PROJECT_ROOT);
  assert.equal(isVerifiedBaziExpertPublicEvidenceFollowup(readOnly), false);
  const verified = await verifyBaziExpertPublicEvidenceFollowup(PROJECT_ROOT, clone());
  assert.equal(isVerifiedBaziExpertPublicEvidenceFollowup(verified), true);
});

test("artifact reader rejects a symlinked file endpoint", async (t) => {
  const { root, followupTarget } = await makeWorkspaceFixture(t);
  const realTarget = `${followupTarget}.real`;
  await copyFile(followupTarget, realTarget);
  await rm(followupTarget);
  try {
    await symlink(realTarget, followupTarget, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(() => loadBaziExpertPublicEvidenceFollowup(root), "SYMLINK_REJECTED");
});

test("artifact reader rejects a hardlinked file endpoint", async (t) => {
  const { root, followupTarget } = await makeWorkspaceFixture(t);
  const realTarget = `${followupTarget}.real`;
  await copyFile(followupTarget, realTarget);
  await rm(followupTarget);
  try {
    await link(realTarget, followupTarget);
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN", "ENOTSUP"].includes(error?.code)) {
      t.skip(`hardlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(() => loadBaziExpertPublicEvidenceFollowup(root), "HARDLINK_REJECTED");
});

test("artifact reader rejects a directory junction", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-followup-junction-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const realContent = path.join(root, "real-content");
  const realArtifact = path.join(realContent, "system-admission", path.basename(FOLLOWUP_PATH));
  await mkdir(path.dirname(realArtifact), { recursive: true });
  await copyFile(FOLLOWUP_PATH, realArtifact);
  try {
    await symlink(realContent, path.join(root, "content"), "junction");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`junction creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(
    () => baziExpertPublicEvidenceFollowupTestOnly.readFollowupArtifact(root),
    "DIRECTORY_CHAIN_INVALID"
  );
});

test("artifact reader detects post-open growth and post-read path replacement", async (t) => {
  const growthRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-followup-growth-"));
  t.after(async () => {
    await rm(growthRoot, { recursive: true, force: true });
  });
  const growthTarget = await copyWorkspaceFile(growthRoot, BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH);
  await expectCodeAsync(
    () => baziExpertPublicEvidenceFollowupTestOnly.readFollowupArtifact(growthRoot, {
      async afterOpenBeforeRead() {
        await writeFile(growthTarget, Buffer.alloc(1_000_001, 0x61));
      }
    }),
    "FILE_SIZE_INVALID"
  );

  const replacementRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-followup-replace-"));
  t.after(async () => {
    await rm(replacementRoot, { recursive: true, force: true });
  });
  const target = await copyWorkspaceFile(replacementRoot, BAZI_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH);
  const replacement = `${target}.replacement`;
  const displaced = `${target}.displaced`;
  await copyFile(FOLLOWUP_PATH, replacement);
  await expectCodeAsync(
    () => baziExpertPublicEvidenceFollowupTestOnly.readFollowupArtifact(replacementRoot, {
      async afterBytesRead() {
        await rename(target, displaced);
        await rename(replacement, target);
      }
    }),
    "ENDPOINT_CHANGED"
  );
});

test("local child, basis and strict parent drift each fail closed", async (t) => {
  const childFixture = await makeWorkspaceFixture(t);
  await writeFile(childFixture.followupTarget, Buffer.concat([
    await readFile(childFixture.followupTarget), Buffer.from("\n", "utf8")
  ]));
  await expectCodeAsync(() => loadBaziExpertPublicEvidenceFollowup(childFixture.root), "ARTIFACT_DRIFT");

  const basisFixture = await makeWorkspaceFixture(t);
  await writeFile(basisFixture.basisTarget, Buffer.concat([
    await readFile(basisFixture.basisTarget), Buffer.from("\nlocal drift\n", "utf8")
  ]));
  await expectCodeAsync(() => loadBaziExpertPublicEvidenceFollowup(basisFixture.root), "BASIS_DRIFT");

  const parentFixture = await makeWorkspaceFixture(t);
  await writeFile(parentFixture.parentTarget, Buffer.concat([
    await readFile(parentFixture.parentTarget), Buffer.from("\n", "utf8")
  ]));
  await expectCodeAsync(() => loadBaziExpertPublicEvidenceFollowup(parentFixture.root), "PARENT_BINDING_MISMATCH");
});

test("CLI success uses a calibrated offline-verification label and no generic ok field", () => {
  const run = spawnSync(process.execPath, [CLI_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.equal(output.offlineFollowupArtifactMechanicallyVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.remoteCaptureMechanicallyVerified, false);
  assert.equal(output.expertGateCount, 0);
});

test("CLI failure emits only a fixed code without paths or exception messages", async (t) => {
  const { root, basisTarget } = await makeWorkspaceFixture(t);
  await writeFile(basisTarget, Buffer.concat([
    await readFile(basisTarget), Buffer.from("\ndrift\n", "utf8")
  ]));
  const run = spawnSync(process.execPath, [CLI_PATH], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  const output = JSON.parse(run.stderr);
  assert.deepEqual(output, {
    offlineFollowupArtifactMechanicallyVerified: false,
    code: "BASIS_DRIFT"
  });
});
