import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import {
  BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_RELATIVE_PATH,
  baziBindingCitationLocatorLinkRequirementsTestOnly as testOnly,
  buildBaziBindingCitationLocatorLinkRequirements,
  computeBaziBindingCitationLocatorLinkRequirementsDigest,
  isVerifiedBaziBindingCitationLocatorLinkRequirements,
  loadBaziBindingCitationLocatorLinkRequirements,
  serializeBaziBindingCitationLocatorLinkRequirements
} from "./bazi-binding-citation-locator-link-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.resolve(
  workspaceRoot,
  ...BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_RELATIVE_PATH.split("/")
);
const cliPath = path.resolve(
  workspaceRoot,
  "scripts/verify-bazi-binding-citation-locator-link-requirements.mjs"
);
const libPath = path.resolve(
  workspaceRoot,
  "scripts/bazi-binding-citation-locator-link-requirements-lib.mjs"
);

const fixturePromise = (async () => {
  const result = await loadBaziBindingCitationLocatorLinkRequirements(workspaceRoot);
  const expected = await testOnly.loadExpectedBundle(workspaceRoot);
  const persisted = JSON.parse(await readFile(artifactPath, "utf8"));
  return { result, expected, persisted };
})();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.ledgerDigest = computeBaziBindingCitationLocatorLinkRequirementsDigest(value);
  return value;
}

function rejectsResigned(value, expectedLedger, pattern = /MISMATCH|FORBIDDEN|FORGERY/) {
  assert.throws(
    () => testOnly.assertPersistedSemantic(resign(value), expectedLedger),
    pattern
  );
}

test("exact persisted loader grants the private brand and fixed raw/self identities", async () => {
  const { result } = await fixturePromise;
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.ledgerId,
    "hakimi.bazi.binding-citation-locator-link-requirements/1.0.0");
  assert.equal(result.ledgerDigest,
    "2fdc1fcafcb28795823b3cac92db707e88df6325c197f08cb6a59a96fa3f9dc4");
  assert.deepEqual(result.artifact, {
    path: BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_RELATIVE_PATH,
    bytes: 28463,
    sha256: "4316c708a6d5a2a65c8574208ec6e44d182c5886e4559e87ed2a3c0a6963368b"
  });
});

test("artifact bytes independently match the frozen raw identity and canonical serialization", async () => {
  const bytes = await readFile(artifactPath);
  const text = bytes.toString("utf8");
  const { persisted } = await fixturePromise;
  assert.equal(bytes.byteLength, 28463);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "4316c708a6d5a2a65c8574208ec6e44d182c5886e4559e87ed2a3c0a6963368b");
  assert.equal(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, false);
  assert.equal(text.includes("\r"), false);
  assert.equal(text, serializeBaziBindingCitationLocatorLinkRequirements(persisted));
});

test("builder consumes v1.9 full-loader brand but cannot mint the child brand", async () => {
  const built = await buildBaziBindingCitationLocatorLinkRequirements(workspaceRoot);
  const { expected, persisted } = await fixturePromise;
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(built), false);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(expected.ledger), false);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(clone(built)), false);
  assert.deepEqual(built, persisted);
  assert.equal(built.currentReadinessParent.fullLoaderPrivateBrandRequired, true);
  assert.equal(built.currentReadinessParent.fullLoaderPrivateBrandConsumedByBuilder, true);
  assert.equal(built.currentReadinessParent.parentPrivateBrandTransferredToBuilderOutput, false);
});

test("v1.9 parent raw/self and twelve-row identities are fixed exactly", async () => {
  const { persisted } = await fixturePromise;
  assert.deepEqual(persisted.currentReadinessParent, {
    artifact: {
      path: "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
      bytes: 45551,
      sha256: "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797"
    },
    ledgerId: "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
    ledgerDigest: "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1",
    bindingRowsCanonicalSha256:
      "2cd5d5c44b777cc71fa9c022e77b89598341a6aeab8f24c46eb8ccbb5d2b1794",
    fullLoaderPrivateBrandRequired: true,
    fullLoaderPrivateBrandConsumedByBuilder: true,
    parentPrivateBrandTransferredToBuilderOutput: false,
    bindingRequired: 12,
    bindingFrozenVerified: 0
  });
});

test("all twelve rows preserve exact order, binding, subject, source and locator projection", async () => {
  const { persisted } = await fixturePromise;
  assert.equal(persisted.bindingInventory.length, 12);
  assert.deepEqual(
    persisted.bindingInventory.map(({ order, bindingId, evidenceSubjectId, source, registryLocator }) => ({
      order, bindingId, evidenceSubjectId, source, registryLocator
    })),
    testOnly.REGISTRY_BINDING_INVENTORY
  );
  assert.deepEqual(persisted.bindingInventory.map((row) => row.order),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.equal(new Set(persisted.bindingInventory.map((row) => row.bindingId)).size, 12);
  assert.equal(new Set(persisted.bindingInventory.map((row) => row.evidenceSubjectId)).size, 12);
  assert.equal(persisted.registryProjection.inventoryCanonicalSha256,
    testOnly.sha256Canonical(persisted.bindingInventory));
});

test("Knowledge Core subject membership is explicit but cannot imply report admission", async () => {
  const { persisted, result } = await fixturePromise;
  assert.deepEqual(persisted.singleChartReportBoundary, testOnly.SINGLE_CHART_REPORT_BOUNDARY);
  assert.deepEqual(persisted.singleChartReportBoundary, {
    browserEvidenceEstablishedByThisChild: false,
    frozenGoldenReverifiedByThisChild: false,
    knowledgeCoreMapping: {
      artifactPath: "packages/knowledge-core/src/index.ts",
      currentBindingEvidenceSubjectCount: 12,
      currentBindingEvidenceSubjectsIncluded: true,
      exportName: "SINGLE_CHART_REPORT_EVIDENCE_SUBJECTS"
    },
    mappingAloneEstablishesReportAdmission: false,
    mappingObservationScope: "current_binding_evidence_subject_registry_membership_only",
    reportCitationAdmissionReplayedByThisChild: false,
    reportConsumerClosureAssessedByThisChild: false,
    singleChartReportAdmissionEffect: "none"
  });
  assert.deepEqual([
    result.singleChartReportEvidenceSubjectMappingObserved,
    result.singleChartReportBindingEvidenceSubjectsIncluded,
    result.reportConsumerClosureAssessedByThisChild,
    result.reportCitationAdmissionReplayedByThisChild,
    result.singleChartReportAdmissionEffect,
    result.singleChartReportFrozenGoldenReverifiedByThisChild,
    result.singleChartReportBrowserEvidenceEstablishedByThisChild
  ], [true, 12, false, false, "none", false, false]);
  assert.equal(persisted.doesNotEstablish.includes(
    "single_chart_report_consumer_closure_citation_admission_frozen_golden_or_browser_evidence"
  ), true);
});

test("future receipt requires one conjunction across registry through materialization", async () => {
  const { persisted } = await fixturePromise;
  assert.deepEqual(persisted.futureReceiptContract.requiredConjunction, {
    registryBinding: ["order", "bindingId", "evidenceSubjectId"],
    registrySource: ["sourceId", "sourceType", "url", "stableRevision", "verificationStatus"],
    registryLocator: ["kind", "value", "verificationStatus", "contentSha256"],
    knowledgeDocument: ["documentId", "documentContentHash", "editVersion", "canonicalRecordDigest"],
    citation: [
      "citationId", "editVersion", "documentId", "documentContentHash", "sectionId",
      "startLine", "endLine", "quoteSha256", "targetKeysDigest", "status"
    ],
    sourceRights: ["documentId", "documentContentHash", "editVersion", "canonicalRecordDigest"],
    sourceCarrier: [
      "carrierId", "documentId", "documentContentHash", "contentDigest",
      "editVersion", "canonicalRecordDigest"
    ],
    projectCopyMaterialization: [
      "materializationReceiptId", "sourceCarrierRecordId", "projectRawSha256",
      "normalizedUtf8Sha256", "knowledgeDocumentContentHash", "verifiedAt"
    ]
  });
  assert.deepEqual(persisted.futureReceiptContract.issuerBoundary, {
    thisLedgerMayIssueReceipt: false,
    separateOwnerAuthorizedCapabilityIssuerRequired: true,
    callerAuthoredReceiptAccepted: false,
    digestOnlyReceiptAccepted: false,
    partialReceiptMergeAllowed: false,
    oneReceiptMustConjoinAllIdentityLayers: true
  });
});

test("current receipt, linked, materialization, freeze and quote sufficiency accounts remain zero", async () => {
  const { persisted, result } = await fixturePromise;
  assert.deepEqual(persisted.currentReceipts, []);
  assert.deepEqual([
    result.currentReceipts,
    result.bindingsLocatorLinked,
    result.formalKnowledgeDocuments,
    result.formalSourceRightsRecords,
    result.formalSourceCarrierRecords,
    result.projectCopyMaterializationRecords,
    result.materializationsVerified,
    result.bindingsFrozen
  ], [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(result.minimalQuoteSufficiency, "not_established");
  assert.equal(persisted.futureReceiptContract.quoteBoundary.minimalQuoteSufficiency,
    "not_established");
  assert.equal(persisted.futureReceiptContract.quoteBoundary.automaticMinimalSufficiencyInferenceAllowed,
    false);
});

test("content, expert, legal, release, public, epoch, atomic and ABA authority remain unavailable", async () => {
  const { result, persisted } = await fixturePromise;
  assert.deepEqual([
    result.contentTruthEstablished,
    result.expertTruthEstablished,
    result.rightsLegalConclusionEstablished,
    result.releaseReady,
    result.publicDeploymentAuthorized,
    result.expertClaimsAuthorized,
    result.crossFileAtomicSnapshot,
    result.mutationEpochAvailableForSchema13,
    result.intervalMutationExcludedAcrossFiles,
    result.abaExcluded
  ], [false, false, false, false, false, false, false, false, false, false]);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.releaseIdentity, "legacy-v13");
  assert.equal(result.targetSchema, 13);
  assert.equal(result.migrationId, null);
  assert.equal(result.mutationEpochReceipt, null);
  assert.equal(persisted.authorityBoundary.publicReleaseAuthorized, false);
});

test("clone and correct re-digest cannot mint a private brand", async () => {
  const { result, persisted } = await fixturePromise;
  const copied = resign(clone(persisted));
  assert.equal(copied.ledgerDigest, persisted.ledgerDigest);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(clone(result)), false);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(copied), false);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(testOnly), false);
});

test("re-signed binding, subject, source and locator swaps cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  for (const mutate of [
    (value) => { value.bindingInventory[0].bindingId = value.bindingInventory[1].bindingId; },
    (value) => { value.bindingInventory[0].evidenceSubjectId = value.bindingInventory[1].evidenceSubjectId; },
    (value) => { value.bindingInventory[0].source = clone(value.bindingInventory[1].source); },
    (value) => { value.bindingInventory[0].registryLocator = clone(value.bindingInventory[1].registryLocator); }
  ]) {
    const forged = clone(persisted);
    mutate(forged);
    forged.registryProjection.inventoryCanonicalSha256 = testOnly.sha256Canonical(forged.bindingInventory);
    rejectsResigned(forged, expected.ledger);
  }
});

test("a re-signed document/hash/citation/rights/carrier/materialization receipt forgery cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  const forged = clone(persisted);
  forged.currentReceipts.push({
    registryBinding: { order: 1, bindingId: forged.bindingInventory[0].bindingId,
      evidenceSubjectId: forged.bindingInventory[0].evidenceSubjectId },
    registrySource: clone(forged.bindingInventory[0].source),
    registryLocator: clone(forged.bindingInventory[0].registryLocator),
    knowledgeDocument: { documentId: "forged", documentContentHash: "0".repeat(64),
      editVersion: "forged", canonicalRecordDigest: "0".repeat(64) },
    citation: { citationId: "forged", editVersion: "forged", documentId: "forged",
      documentContentHash: "0".repeat(64), sectionId: "forged", startLine: 1, endLine: 1,
      quoteSha256: "0".repeat(64), targetKeysDigest: "0".repeat(64), status: "verified" },
    sourceRights: { documentId: "forged", documentContentHash: "0".repeat(64),
      editVersion: "forged", canonicalRecordDigest: "0".repeat(64) },
    sourceCarrier: { carrierId: "forged", documentId: "forged",
      documentContentHash: "0".repeat(64), contentDigest: "0".repeat(64),
      editVersion: "forged", canonicalRecordDigest: "0".repeat(64) },
    projectCopyMaterialization: { materializationReceiptId: "forged",
      sourceCarrierRecordId: "forged", projectRawSha256: "0".repeat(64),
      normalizedUtf8Sha256: "0".repeat(64), knowledgeDocumentContentHash: "0".repeat(64),
      verifiedAt: "2026-09-01T00:00:00.000Z" }
  });
  assert.throws(
    () => testOnly.assertPersistedSemantic(resign(forged), expected.ledger),
    /RECEIPT_FORGERY/
  );
});

test("re-signed count, quote, issuer, authority and epoch promotions cannot pass", async () => {
  const { expected, persisted } = await fixturePromise;
  for (const mutate of [
    (value) => { value.counts.bindingsLocatorLinked = 1; },
    (value) => { value.futureReceiptContract.quoteBoundary.minimalQuoteSufficiency = "established"; },
    (value) => { value.futureReceiptContract.issuerBoundary.thisLedgerMayIssueReceipt = true; },
    (value) => { value.singleChartReportBoundary.reportConsumerClosureAssessedByThisChild = true; },
    (value) => { value.singleChartReportBoundary.reportCitationAdmissionReplayedByThisChild = true; },
    (value) => { value.singleChartReportBoundary.singleChartReportAdmissionEffect = "active"; },
    (value) => { value.singleChartReportBoundary.frozenGoldenReverifiedByThisChild = true; },
    (value) => { value.singleChartReportBoundary.browserEvidenceEstablishedByThisChild = true; },
    (value) => { value.authorityBoundary.contentTruthEstablished = true; },
    (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => { value.integrityBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.integrityBoundary.mutationEpochAvailableForSchema13 = true; },
    (value) => { value.integrityBoundary.abaExcluded = true; }
  ]) {
    const forged = clone(persisted);
    mutate(forged);
    rejectsResigned(forged, expected.ledger);
  }
});

test("canonical identity rejects proxy, accessor, custom prototype and aliased input", () => {
  assert.throws(() => testOnly.canonicalStringify(new Proxy({}, {})), /NON_PASSIVE_JSON/);
  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get() { return 1; } });
  assert.throws(() => testOnly.canonicalStringify(accessor), /NON_PASSIVE_JSON/);
  assert.throws(() => testOnly.canonicalStringify(Object.create({ inherited: true })),
    /NON_CANONICAL_PROTOTYPE/);
  const shared = {};
  assert.throws(() => testOnly.canonicalStringify({ left: shared, right: shared }),
    /ALIASED_OR_CYCLIC_JSON/);
});

test("captured core operations tolerate post-import Promise.all and Array.map poisoning", async () => {
  const originalPromiseAll = Promise.all;
  const originalArrayMap = Array.prototype.map;
  try {
    Promise.all = () => { throw new Error("poisoned Promise.all"); };
    Array.prototype.map = () => { throw new Error("poisoned Array.map"); };
    const built = await buildBaziBindingCitationLocatorLinkRequirements(workspaceRoot);
    assert.equal(built.bindingInventory.length, 12);
    assert.equal(built.currentReceipts.length, 0);
  } finally {
    Promise.all = originalPromiseAll;
    Array.prototype.map = originalArrayMap;
  }
});

test("indexed basis traversal tolerates targeted post-import Array iterator poisoning", async () => {
  const { expected, persisted } = await fixturePromise;
  const originalIterator = Array.prototype[Symbol.iterator];
  try {
    Array.prototype[Symbol.iterator] = function poisonedIterator() {
      if (this === testOnly.BASIS_ARTIFACTS) {
        throw new Error("poisoned BASIS_ARTIFACTS iterator");
      }
      return Reflect.apply(originalIterator, this, []);
    };
    const result = await loadBaziBindingCitationLocatorLinkRequirements(workspaceRoot);
    assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(result), true);
    assert.deepEqual([
      result.currentReceipts,
      result.bindingsLocatorLinked,
      result.bindingsFrozen,
      result.singleChartReportAdmissionEffect,
      result.releaseReady,
      result.mutationEpochReceipt
    ], [0, 0, 0, "none", false, null]);
    const forged = clone(persisted);
    forged.singleChartReportBoundary.singleChartReportAdmissionEffect = "active";
    assert.throws(
      () => testOnly.assertPersistedSemantic(resign(forged), expected.ledger),
      /REPORT_ADMISSION_PROMOTION_FORBIDDEN/
    );
  } finally {
    Array.prototype[Symbol.iterator] = originalIterator;
  }
});

test("library and CLI imports are side-effect free", () => {
  for (const target of [libPath, cliPath]) {
    const child = spawnSync(process.execPath, [
      "--input-type=module",
      "--eval",
      `await import(${JSON.stringify(pathToFileURL(target).href)})`
    ], { cwd: workspaceRoot, encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, "");
    assert.equal(child.stderr, "");
  }
});

test("CLI success is narrow and preserves all red gates", () => {
  const child = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  assert.match(child.stdout,
    /^BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_OK \{[^\r\n]+\}\n$/u);
  const summary = JSON.parse(child.stdout.slice(child.stdout.indexOf("{")).trim());
  assert.deepEqual([
    summary.mechanicalRequirementsVerified,
    summary.bindingRequired,
    summary.inventoryRows,
    summary.singleChartReportEvidenceSubjectMappingObserved,
    summary.singleChartReportBindingEvidenceSubjectsIncluded,
    summary.reportConsumerClosureAssessedByThisChild,
    summary.reportCitationAdmissionReplayedByThisChild,
    summary.singleChartReportAdmissionEffect,
    summary.singleChartReportFrozenGoldenReverifiedByThisChild,
    summary.singleChartReportBrowserEvidenceEstablishedByThisChild,
    summary.currentReceipts,
    summary.bindingsLocatorLinked,
    summary.minimalQuoteSufficiency,
    summary.releaseReady,
    summary.publicDeploymentAuthorized,
    summary.crossFileAtomicSnapshot,
    summary.mutationEpochReceipt,
    summary.abaExcluded
  ], [
    true, 12, 12, true, 12, false, false, "none", false, false,
    0, 0, "not_established", false, false, false, null, false
  ]);
  assert.equal(summary.runtimeTrustCalibration.cliOutputTrustedAttestation, false);
});

test("CLI failure is a fixed non-leaking code", () => {
  const child = spawnSync(process.execPath, [cliPath, "forbidden"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(child.status, 1);
  assert.equal(child.stdout, "");
  assert.equal(child.stderr,
    "BAZI_BINDING_CITATION_LOCATOR_LINK_REQUIREMENTS_FAILED CLI_ARGUMENTS_FORBIDDEN\n");
  assert.equal(child.stderr.includes(workspaceRoot), false);
});
