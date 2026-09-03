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
  BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH,
  BaziPrcCopyrightLawPublicEvidenceError,
  baziPrcCopyrightLawPublicEvidenceTestOnly,
  canonicalStringifyBaziPrcCopyrightLawPublicEvidence,
  computeBaziPrcCopyrightLawPublicEvidenceDigest,
  isVerifiedBaziPrcCopyrightLawPublicEvidence,
  loadBaziPrcCopyrightLawPublicEvidence,
  parseBaziPrcCopyrightLawPublicEvidenceJsonBytes,
  readBaziPrcCopyrightLawPublicEvidence,
  verifyBaziPrcCopyrightLawPublicEvidence,
  verifyBaziPrcCopyrightLawPublicEvidenceArtifact
} from "./bazi-prc-copyright-law-public-evidence-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OBSERVATION_PATH = path.join(
  PROJECT_ROOT,
  ...BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH.split("/")
);
const BASIS_RELATIVE_PATH = "docs/阶段C中国现行著作权法公开证据观察-child-v1-2026-08-29.md";
const SOURCE_PARENT_RELATIVE_PATH = "content/bazi-strength-source-binding-candidates.v1.json";
const RIGHTS_PARENT_RELATIVE_PATH = "content/bazi-strength-source-rights-candidates.v1.json";
const CLI_PATH = path.join(PROJECT_ROOT, "scripts", "verify-bazi-prc-copyright-law-public-evidence.mjs");

const persistedObservation = JSON.parse(await readFile(OBSERVATION_PATH, "utf8"));

function clone(value = persistedObservation) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.observationDigest = computeBaziPrcCopyrightLawPublicEvidenceDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof BaziPrcCopyrightLawPublicEvidenceError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectCodeAsync(fn, code) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof BaziPrcCopyrightLawPublicEvidenceError);
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
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-prc-law-observation-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  return {
    root,
    observationTarget: await copyWorkspaceFile(root, BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH),
    basisTarget: await copyWorkspaceFile(root, BASIS_RELATIVE_PATH),
    sourceParentTarget: await copyWorkspaceFile(root, SOURCE_PARENT_RELATIVE_PATH),
    rightsParentTarget: await copyWorkspaceFile(root, RIGHTS_PARENT_RELATIVE_PATH)
  };
}

test("persisted C law observation passes parents, basis and full-load brand", async () => {
  const result = await loadBaziPrcCopyrightLawPublicEvidence(PROJECT_ROOT);
  assert.equal(result.offlineOperatorRecordedLinkHashObservationMechanicallyVerified, true);
  assert.equal(result.operatorRecordedPublications, 2);
  assert.equal(result.deduplicatedPublisherPageGroups, 1);
  assert.equal(result.candidateRuleLinks, 4);
  assert.equal(isVerifiedBaziPrcCopyrightLawPublicEvidence(result), true);
  assert.equal(isVerifiedBaziPrcCopyrightLawPublicEvidence({ ...result }), false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.observation));
  assert.ok(Object.isFrozen(result.observation.candidateRuleLinks[0]));
});

test("raw, semantic, basis and parent identities are externally pinned", async () => {
  const result = await loadBaziPrcCopyrightLawPublicEvidence(PROJECT_ROOT);
  assert.deepEqual(result.observationArtifact, {
    path: BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH,
    rawBytes: 19_961,
    rawSha256: "c0e91874bd0b9e7c99d4db2b79df1e68c483fc1e68ed06700be44d5bf6bc10cf"
  });
  assert.equal(result.observationDigest, "f2cbbbf2d34b6f6ee69272805799def74f582f0058de8cfbab3321a84a44146c");
  assert.deepEqual(result.basisArtifact, {
    path: BASIS_RELATIVE_PATH,
    rawBytes: 7_867,
    rawSha256: "737b271ebf526b34e10ad3462657fe3baa1eec4ef2ccf417bdeb098fc2d296c4"
  });
  assert.equal(result.sourceParentArtifact.rawSha256, "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7");
  assert.equal(result.rightsParentArtifact.rawSha256, "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179");
});

test("release governance remains legacy-v13 schema 13 with no migration or authorization", () => {
  const observation = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation);
  assert.deepEqual(observation.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(observation.integrityBoundary.mutationEpochAvailable, false);
  assert.equal(observation.integrityBoundary.intervalMutationExcluded, false);
  assert.equal(observation.integrityBoundary.abaExcluded, false);
});

test("child is one-way and does not mutate parents, readiness, manifests or central receipts", () => {
  const boundary = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation).bindingBoundary;
  assert.equal(boundary.childToParentsOnly, true);
  for (const key of [
    "parentRightsLedgerMutated", "parentSourceLedgerMutated", "parentBacklinkAdded",
    "bindingReadinessMutated", "formalManifestMutated", "registryMutated",
    "crossSystemReceiptsMutated"
  ]) {
    assert.equal(boundary[key], false, key);
  }
});

test("two operator-recorded publications form one deduplicated authority group", () => {
  const observation = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation);
  assert.deepEqual(observation.operatorRecordedPublisherPageGroupPolicy, {
    deduplicationKey: "sourceUpstreamGroupId",
    samePublisherPageGroupCountsOnce: true,
    operatorRecordedPublicationCount: 2,
    deduplicatedPublisherPageGroupCount: 1
  });
  assert.deepEqual(observation.operatorRecordedPublisherPageGroups.map((entry) => entry.sourceUpstreamGroupId), [
    "PRC_NCAC_COPYRIGHT_LAW_2020_PUBLICATION_FAMILY"
  ]);
});

test("each publication records an exact immediate pair and a later semantic capture", () => {
  const publications = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation).operatorRecordedPublications;
  for (const publication of publications) {
    assert.equal(publication.immediateTransportReads.length, 2);
    assert.equal(publication.immediatePairStableOperatorRecorded, true);
    assert.deepEqual(publication.immediateTransportReads.map((entry) => entry.ordinal), [1, 2]);
    assert.equal(publication.immediateTransportReads[0].deliveredDecodedBodySha256,
      publication.immediateTransportReads[1].deliveredDecodedBodySha256);
    assert.equal(publication.semanticCapture.deliveredDecodedBodySha256,
      publication.immediateTransportReads[0].deliveredDecodedBodySha256);
    assert.equal(publication.publisherAuthenticityEstablished, false);
  }
});

test("fragment catalog is hash-only and contains six provisions plus one effective-date fragment", () => {
  const semantic = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation).semanticEvidence;
  assert.deepEqual(semantic.lawProvisionFragments.map((entry) => entry.provisionEvidenceId), [
    "PRC-CRL-2020-ARTICLE-5", "PRC-CRL-2020-ARTICLE-15", "PRC-CRL-2020-ARTICLE-16",
    "PRC-CRL-2020-ARTICLE-22", "PRC-CRL-2020-ARTICLE-23", "PRC-CRL-2020-ARTICLE-59"
  ]);
  for (const fragment of semantic.lawProvisionFragments) {
    assert.equal(fragment.exactTextStored, false);
    assert.equal(fragment.humanLegalInterpretationVerified, false);
    assert.match(fragment.normalizedTextSha256, /^[0-9a-f]{64}$/u);
    assert.equal(Object.hasOwn(fragment, "exactText"), false);
  }
  assert.equal(semantic.amendmentEffectiveDateEvidence.exactTextStored, false);
  assert.equal(semantic.fragmentDigestExecutionReceiptStored, false);
  assert.equal(semantic.semanticSummaryMechanicallyVerified, false);
});

test("four candidate links cite rules without applying them or clearing any layer", async () => {
  const result = await loadBaziPrcCopyrightLawPublicEvidence(PROJECT_ROOT);
  const expectedRuleIds = [
    "PRC-CRL-2020-ARTICLE-15", "PRC-CRL-2020-ARTICLE-16", "PRC-CRL-2020-ARTICLE-22",
    "PRC-CRL-2020-ARTICLE-23", "PRC-CRL-2020-ARTICLE-59"
  ];
  for (const linkEntry of result.observation.candidateRuleLinks) {
    assert.deepEqual(linkEntry.ruleEvidenceIds, expectedRuleIds);
    assert.equal(linkEntry.ruleObservationOnlyNotApplied, true);
    for (const key of [
      "candidateAuthorIdentityAndDeathFactsVerified", "candidateWorkJurisdictionAssessmentCompleted",
      "modernEditionContributionRightsResolved", "workLayerCleared", "editionLayerCleared",
      "carrierLayerCleared"
    ]) assert.equal(linkEntry[key], false, key);
  }
});

test("storage and rights remain link-only with zero formal records and no legal conclusion", () => {
  const observation = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation);
  assert.equal(observation.storageBoundary.distributionPolicy, "link_only");
  for (const key of [
    "remoteResponseBodiesStored", "lawTextStored", "exactQuotesStored", "domSnapshotsStored",
    "screenshotsStored", "carrierFilesStored"
  ]) assert.equal(observation.storageBoundary[key], 0, key);
  assert.equal(observation.rightsBoundary.formalSourceRightsRecordsCreated, 0);
  assert.equal(observation.rightsBoundary.formalSourceCarrierRecordsCreated, 0);
  assert.equal(observation.rightsBoundary.redistributableSources, 0);
  assert.equal(observation.rightsBoundary.legalConclusion, "not_established");
  assert.equal(observation.rightsBoundary.publicRepositoryInclusionAuthorized, false);
  assert.equal(observation.rightsBoundary.buildInclusionAuthorized, false);
});

test("remote provenance, publisher authenticity and candidate applicability stay unverified", () => {
  const observation = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation);
  for (const key of [
    "remoteCaptureMechanicallyVerified", "captureExecutionReceiptStored",
    "operatorRecordedFragmentDigestsMechanicallyVerified", "automaticDecompressionMechanicallyVerified",
    "requestedToFinalUrlBindingEstablished", "redirectChainCaptured", "wireBytesCaptured",
    "tlsPeerCertificateCaptured", "futureFreshnessRevalidated",
      "ncacHostnameObservationCountsAsPublisherAuthentication", "publisherAuthenticityEstablished",
    "remoteNetworkProvenanceEstablished"
  ]) assert.equal(observation.networkObservationBoundary[key], false, key);
  assert.equal(observation.rightsBoundary.statuteApplicabilityToCandidateWorksEstablished, false);
  assert.equal(observation.rightsBoundary.humanLegalReviewVerified, false);
});

test("binding, expert, truth and release authority remain zero or false", () => {
  const boundary = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(persistedObservation).authorityBoundary;
  assert.equal(boundary.bindingFrozenVerified, 0);
  assert.equal(boundary.bindingRequired, 12);
  assert.equal(boundary.realIndependentExpertsVerified, 0);
  assert.equal(boundary.expertSeatsRequired, 2);
  for (const key of [
    "contentTruthEstablished", "expertTruthEstablished", "rightsLegalConclusionEstablished",
    "releaseReady", "expertClaimsAuthorized", "publicDeploymentAuthorized"
  ]) assert.equal(boundary[key], false, key);
});

test("rewriting a summary and resealing still fails the externally pinned digest", () => {
  const observation = clone();
  observation.operatorRecordedPublications[0].operatorRecordedSummary = "rewritten operator summary";
  expectCode(
    () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(observation)),
    "OBSERVATION_SELF_RESEAL_FORBIDDEN"
  );
});

test("transport, fragment and candidate catalogs reject rebinding or duplication", () => {
  const cases = [
    [
      (value) => { value.operatorRecordedPublications[0].immediateTransportReads[1].deliveredDecodedBodySha256 = "a".repeat(64); },
      "TRANSPORT_OBSERVATION_INVALID"
    ],
    [
      (value) => { value.semanticEvidence.lawProvisionFragments[1].provisionEvidenceId = "PRC-CRL-2020-ARTICLE-5"; },
      "FRAGMENT_DUPLICATE"
    ],
    [
      (value) => { value.candidateRuleLinks[0].rightsCandidateId = value.candidateRuleLinks[1].rightsCandidateId; },
      "CANDIDATE_RULE_APPLICATION_FORBIDDEN"
    ]
  ];
  for (const [mutate, code] of cases) {
    const observation = clone();
    mutate(observation);
    expectCode(() => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(observation)), code);
  }
});

test("candidate applicability, clearance and rule-set promotion fail after reseal", () => {
  const mutations = [
    ["candidateAuthorIdentityAndDeathFactsVerified", true],
    ["candidateWorkJurisdictionAssessmentCompleted", true],
    ["modernEditionContributionRightsResolved", true],
    ["workLayerCleared", true],
    ["editionLayerCleared", true],
    ["carrierLayerCleared", true]
  ];
  for (const [key, value] of mutations) {
    const observation = clone();
    observation.candidateRuleLinks[0][key] = value;
    expectCode(
      () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(observation)),
      "CANDIDATE_RULE_APPLICATION_FORBIDDEN"
    );
  }
  const articleFive = clone();
  articleFive.candidateRuleLinks[0].ruleEvidenceIds.unshift("PRC-CRL-2020-ARTICLE-5");
  expectCode(
    () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(articleFive)),
    "CANDIDATE_RULE_APPLICATION_FORBIDDEN"
  );
});

test("release, rights, network, integrity and storage promotions fail after reseal", () => {
  const cases = [
    ["releaseGovernance", "activeLine", "v16", "RELEASE_GOVERNANCE_DRIFT"],
    ["bindingBoundary", "parentBacklinkAdded", true, "BINDING_PROMOTION_FORBIDDEN"],
    ["storageBoundary", "lawTextStored", 1, "STORAGE_PROMOTION_FORBIDDEN"],
    ["networkObservationBoundary", "publisherAuthenticityEstablished", true, "NETWORK_PROMOTION_FORBIDDEN"],
    ["rightsBoundary", "legalConclusion", "cleared", "RIGHTS_PROMOTION_FORBIDDEN"],
    ["integrityBoundary", "crossFileAtomicSnapshot", true, "INTEGRITY_CLAIM_INVALID"],
    ["authorityBoundary", "publicDeploymentAuthorized", true, "AUTHORITY_PROMOTION_FORBIDDEN"]
  ];
  for (const [boundary, key, value, code] of cases) {
    const observation = clone();
    observation[boundary][key] = value;
    expectCode(() => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(observation)), code);
  }
});

test("negative boundary catalog cannot be shortened after reseal", () => {
  const observation = clone();
  observation.doesNotEstablish.pop();
  expectCode(
    () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(observation)),
    "DOES_NOT_ESTABLISH_MISMATCH"
  );
});

test("body, exact quote, formal record, legal opinion and backlink fields are unknown and forbidden", () => {
  const injections = [
    [[], "surprise", false],
    [["operatorRecordedPublications", 0], "responseBody", "copied body"],
    [["semanticEvidence", "lawProvisionFragments", 0], "exactText", "forbidden quote"],
    [["candidateRuleLinks", 0], "sourceRightsRecordId", "forbidden"],
    [["rightsBoundary"], "legalOpinion", "cleared"],
    [[], "registryBacklink", { path: "forbidden" }]
  ];
  for (const [segments, key, value] of injections) {
    const observation = clone();
    let target = observation;
    for (const segment of segments) target = target[segment];
    target[key] = value;
    expectCode(
      () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(observation)),
      "UNKNOWN_FIELD_FORBIDDEN"
    );
  }
});

test("HTTP, userinfo, port, query, fragment and suffix-domain URLs fail closed", () => {
  const urls = [
    "http://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
    "https://user:pass@www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
    "https://www.ncac.gov.cn:444/xxfb/flfg/flfg_532/202103/t20210309_50530.html",
    "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html?token=x",
    "https://www.ncac.gov.cn/xxfb/flfg/flfg_532/202103/t20210309_50530.html#part",
    "https://www.ncac.gov.cn.example.invalid/xxfb/flfg/flfg_532/202103/t20210309_50530.html"
  ];
  for (const requestedUrl of urls) {
    const observation = clone();
    observation.operatorRecordedPublications[0].requestedUrl = requestedUrl;
    expectCode(
      () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(reseal(observation)),
      "SOURCE_URL_INVALID"
    );
  }
});

test("strict byte parser rejects duplicate keys, BOM, invalid UTF-8, empty and oversized input", () => {
  expectCode(
    () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(
      Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8")
    ),
    "JSON_DUPLICATE_KEY"
  );
  expectCode(
    () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    "JSON_BOM_FORBIDDEN"
  );
  expectCode(
    () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(Buffer.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
  expectCode(() => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(Buffer.alloc(0)), "JSON_INVALID");
  expectCode(
    () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(Buffer.alloc(1_000_001, 0x61)),
    "JSON_TOO_LARGE"
  );
});

test("byte parser rejects Proxy, SharedArrayBuffer and resizable ArrayBuffer views", () => {
  expectCode(
    () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(new Proxy(new Uint8Array([0x7b, 0x7d]), {})),
    "JSON_PROXY_FORBIDDEN"
  );
  class DerivedBytes extends Uint8Array {}
  expectCode(
    () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(new DerivedBytes([0x7b, 0x7d])),
    "JSON_BYTES_INVALID"
  );
  if (typeof SharedArrayBuffer === "function") {
    expectCode(
      () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(new Uint8Array(new SharedArrayBuffer(8))),
      "JSON_SHARED_BUFFER_FORBIDDEN"
    );
  }
  try {
    const resizable = new ArrayBuffer(8, { maxByteLength: 16 });
    if (resizable.resizable === true) {
      expectCode(
        () => parseBaziPrcCopyrightLawPublicEvidenceJsonBytes(new Uint8Array(resizable)),
        "JSON_RESIZABLE_BUFFER_FORBIDDEN"
      );
    }
  } catch {
    // Runtime without resizable ArrayBuffer support.
  }
});

test("object input rejects accessors without invocation plus Proxy, Symbol, sparse arrays and -0", () => {
  const getterObservation = clone();
  let invoked = false;
  Object.defineProperty(getterObservation.authorityBoundary, "contentTruthEstablished", {
    enumerable: true,
    get() {
      invoked = true;
      return false;
    }
  });
  expectCode(
    () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(getterObservation),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(invoked, false);
  expectCode(
    () => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(new Proxy(clone(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );
  const symbolObservation = clone();
  symbolObservation[Symbol("hidden")] = true;
  expectCode(() => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(symbolObservation), "INPUT_SYMBOL_FORBIDDEN");
  const sparseObservation = clone();
  sparseObservation.operatorRecordedPublications = new Array(2);
  expectCode(() => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(sparseObservation), "INPUT_ARRAY_INVALID");
  const negativeZeroObservation = clone();
  negativeZeroObservation.operatorRecordedPublisherPageGroupPolicy.operatorRecordedPublicationCount = -0;
  expectCode(() => verifyBaziPrcCopyrightLawPublicEvidenceArtifact(negativeZeroObservation), "INPUT_VALUE_INVALID");
});

test("pure verifier ignores any hostile legacy second argument without invoking traps", () => {
  let invoked = false;
  const hostileParent = new Proxy({}, {
    get() {
      invoked = true;
      throw new Error("must not execute");
    }
  });
  const observation = verifyBaziPrcCopyrightLawPublicEvidenceArtifact(
    persistedObservation,
    hostileParent
  );
  assert.equal(observation.observationId, persistedObservation.observationId);
  assert.equal(invoked, false);
});

test("canonical stringifier rejects accessors and Proxy without invoking user code", () => {
  let invoked = false;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      invoked = true;
      return "forbidden";
    }
  });
  expectCode(() => canonicalStringifyBaziPrcCopyrightLawPublicEvidence(accessor), "INPUT_ACCESSOR_FORBIDDEN");
  assert.equal(invoked, false);
  expectCode(
    () => canonicalStringifyBaziPrcCopyrightLawPublicEvidence(new Proxy({ value: "x" }, {})),
    "INPUT_PROXY_FORBIDDEN"
  );
});

test("read-only artifact and caller object cannot forge the full-load brand", async () => {
  const readOnly = await readBaziPrcCopyrightLawPublicEvidence(PROJECT_ROOT);
  assert.equal(isVerifiedBaziPrcCopyrightLawPublicEvidence(readOnly), false);
  assert.equal(isVerifiedBaziPrcCopyrightLawPublicEvidence(clone()), false);
  const verified = await verifyBaziPrcCopyrightLawPublicEvidence(PROJECT_ROOT, clone());
  assert.equal(isVerifiedBaziPrcCopyrightLawPublicEvidence(verified), true);
});

test("artifact reader rejects a symlinked child endpoint", async (t) => {
  const { root, observationTarget } = await makeWorkspaceFixture(t);
  const realTarget = `${observationTarget}.real`;
  await copyFile(observationTarget, realTarget);
  await rm(observationTarget);
  try {
    await symlink(realTarget, observationTarget, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(() => loadBaziPrcCopyrightLawPublicEvidence(root), "SYMLINK_REJECTED");
});

test("artifact reader rejects a hardlinked child endpoint", async (t) => {
  const { root, observationTarget } = await makeWorkspaceFixture(t);
  const realTarget = `${observationTarget}.real`;
  await copyFile(observationTarget, realTarget);
  await rm(observationTarget);
  try {
    await link(realTarget, observationTarget);
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN", "ENOTSUP"].includes(error?.code)) {
      t.skip(`hardlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectCodeAsync(() => loadBaziPrcCopyrightLawPublicEvidence(root), "HARDLINK_REJECTED");
});

test("artifact reader rejects a directory junction", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-prc-law-junction-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const realContent = path.join(root, "real-content");
  const realArtifact = path.join(realContent, "system-admission", path.basename(OBSERVATION_PATH));
  await mkdir(path.dirname(realArtifact), { recursive: true });
  await copyFile(OBSERVATION_PATH, realArtifact);
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
    () => baziPrcCopyrightLawPublicEvidenceTestOnly.readObservationArtifact(root),
    "DIRECTORY_CHAIN_INVALID"
  );
});

test("artifact reader detects post-open growth and post-read path replacement", async (t) => {
  const growthRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-prc-law-growth-"));
  t.after(async () => {
    await rm(growthRoot, { recursive: true, force: true });
  });
  const growthTarget = await copyWorkspaceFile(growthRoot, BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH);
  await expectCodeAsync(
    () => baziPrcCopyrightLawPublicEvidenceTestOnly.readObservationArtifact(growthRoot, {
      async afterOpenBeforeRead() {
        await writeFile(growthTarget, Buffer.alloc(1_000_001, 0x61));
      }
    }),
    "FILE_SIZE_INVALID"
  );

  const replacementRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-prc-law-replace-"));
  t.after(async () => {
    await rm(replacementRoot, { recursive: true, force: true });
  });
  const target = await copyWorkspaceFile(replacementRoot, BAZI_PRC_COPYRIGHT_LAW_PUBLIC_EVIDENCE_RELATIVE_PATH);
  const replacement = `${target}.replacement`;
  const displaced = `${target}.displaced`;
  await copyFile(OBSERVATION_PATH, replacement);
  await expectCodeAsync(
    () => baziPrcCopyrightLawPublicEvidenceTestOnly.readObservationArtifact(replacementRoot, {
      async afterBytesRead() {
        await rename(target, displaced);
        await rename(replacement, target);
      }
    }),
    "ENDPOINT_CHANGED"
  );
});

test("child, basis, source parent and rights parent drift each fail closed", async (t) => {
  const cases = [
    ["observationTarget", "ARTIFACT_DRIFT"],
    ["basisTarget", "BASIS_DRIFT"],
    ["sourceParentTarget", "SOURCE_PARENT_DRIFT"],
    ["rightsParentTarget", "RIGHTS_PARENT_DRIFT"]
  ];
  for (const [targetKey, code] of cases) {
    const fixture = await makeWorkspaceFixture(t);
    await writeFile(fixture[targetKey], Buffer.concat([
      await readFile(fixture[targetKey]), Buffer.from("\n", "utf8")
    ]));
    await expectCodeAsync(() => loadBaziPrcCopyrightLawPublicEvidence(fixture.root), code);
  }
});

test("CLI success is calibrated as operator-recorded link/hash-only and exposes all red authority gates", () => {
  const run = spawnSync(process.execPath, [CLI_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf8"
  });
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.equal(output.offlineOperatorRecordedLinkHashObservationMechanicallyVerified, true);
  assert.equal(output.observationClass, "operator_recorded_link_hash_only_non_adjudicative_not_formal_rights_record");
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.remoteCaptureMechanicallyVerified, false);
  assert.equal(output.publisherAuthenticityEstablished, false);
  assert.equal(output.statuteApplicabilityToCandidateWorksEstablished, false);
  assert.equal(output.formalSourceRightsRecordsCreated, 0);
  assert.equal(output.formalSourceCarrierRecordsCreated, 0);
  assert.equal(output.bindingFrozenVerified, 0);
  assert.equal(output.bindingRequired, 12);
  assert.equal(output.realIndependentExpertsVerified, 0);
  assert.equal(output.expertSeatsRequired, 2);
  assert.equal(output.legalConclusion, "not_established");
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicDeploymentAuthorized, false);
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
    offlineOperatorRecordedLinkHashObservationMechanicallyVerified: false,
    code: "BASIS_DRIFT"
  });
});
