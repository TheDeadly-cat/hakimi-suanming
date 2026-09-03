import test from "node:test";
import assert from "node:assert/strict";
import fsPromises, {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH,
  DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH,
  computeBaziBindingFreezeRequirementsV17Digest,
  computeBaziDttNoticeReconciliationV2Digest,
  isVerifiedBaziBindingFreezeRequirementsV17,
  isVerifiedBaziDttNoticeReconciliationV2,
  loadBaziBindingFreezeRequirementsV17,
  loadBaziDttNoticeReconciliationV2,
  baziDttVersionAwareReadinessTestOnly
} from "./bazi-dtt-version-aware-readiness-lib.mjs";
import {
  isVerifiedBaziDttNoticeReconciliation,
  verifyBaziDttNoticeReconciliationArtifact
} from "./bazi-dtt-notice-reconciliation-lib.mjs";
import {
  verifyBaziBindingCandidateRightsTrustChain,
  verifyBaziBindingFreezeRequirements,
  verifyBaziDttNoticeReconciliationGate
} from "./bazi-binding-freeze-requirements-lib.mjs";
import {
  verifyBaziSourceBindingCandidateLedger
} from "./bazi-source-binding-candidate-lib.mjs";
import {
  verifyBaziSourceRightsCandidateLedger
} from "./bazi-source-rights-candidate-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH,
  BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH,
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts"
]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-dtt-readiness-v17-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of FIXTURE_PATHS) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(workspaceRoot, relativePath), target);
  }
  return root;
}

async function mutateJson(root, relativePath, mutate) {
  const target = path.join(root, relativePath);
  const value = JSON.parse(await readFile(target, "utf8"));
  mutate(value);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function expectCode(code) {
  return (error) => error?.code === code;
}

test("live C-L3 v2 verifies only candidate notice projection reconciliation", async () => {
  const result = await loadBaziDttNoticeReconciliationV2(workspaceRoot);
  assert.equal(isVerifiedBaziDttNoticeReconciliationV2(result), true);
  assert.equal(result.candidateNoticeProjectionMechanicallyReconciled, true);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.formalAdmissionPromotionBlocked, true);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.crossFileAtomicSnapshot, false);
  assert.equal(result.mutationEpochAvailable, false);
  assert.equal(result.mutationEpochReceipt, null);
  assert.equal(result.abaExcluded, false);
});

test("live readiness 1.7 consumes the branded projection and stays 0/12 fail-closed", async () => {
  const result = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(result), true);
  assert.equal(result.versionAwareCandidateReadinessMechanicallyVerified, true);
  assert.equal(result.candidateNoticeProjectionReconciliationsResolved, 1);
  assert.equal(result.activeNoticeDiscrepancyPromotionBlocks, 1);
  assert.equal(result.candidateNoticeProjectionDiscrepancyPromotionBlocks, 0);
  assert.equal(result.formalAdmissionPromotionBlocked, true);
  assert.equal(result.bindingRequired, 12);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.formalSourceRightsRecordCount, 0);
  assert.equal(result.formalSourceCarrierRecordCount, 0);
  assert.equal(result.distributionPolicy, "link_only");
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.equal(result.crossFileAtomicSnapshot, false);
  assert.equal(result.mutationEpochAvailable, false);
  assert.equal(result.mutationEpochReceipt, null);
  assert.equal(result.intervalMutationExcludedAcrossFiles, false);
  assert.equal(result.abaExcluded, false);
});

test("deterministic builder reproduces both persisted artifacts", async () => {
  const first = await baziDttVersionAwareReadinessTestOnly.buildExpectedBundle(workspaceRoot);
  const second = await baziDttVersionAwareReadinessTestOnly.buildExpectedBundle(workspaceRoot);
  assert.deepEqual(first.reconciliation, second.reconciliation);
  assert.deepEqual(first.readiness, second.readiness);
  assert.equal(first.reconciliationSnapshot.rawSha256,
    baziDttVersionAwareReadinessTestOnly.EXPECTED_RECONCILIATION_V2.rawSha256);
  assert.equal(first.readinessSnapshot.rawSha256,
    baziDttVersionAwareReadinessTestOnly.EXPECTED_READINESS_V17.rawSha256);
});

test("readiness changes only the DTT binding candidate identity", async () => {
  const oldLedger = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/system-admission/bazi-binding-freeze-requirements.v1.json"), "utf8"));
  const next = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH), "utf8"));
  assert.equal(next.bindings.length, oldLedger.bindings.length);
  for (let index = 0; index < oldLedger.bindings.length; index += 1) {
    const before = structuredClone(oldLedger.bindings[index]);
    const after = structuredClone(next.bindings[index]);
    if (before.bindingId === "binding:dtt:month-command") {
      assert.deepEqual(before.candidateIds, ["dtt-chanwei-wikisource-r2600158-candidate-v1"]);
      assert.deepEqual(after.candidateIds, ["dtt-chanwei-wikisource-r2600158-candidate-v2"]);
      before.candidateIds = after.candidateIds;
    }
    assert.deepEqual(after, before);
  }
});

test("C-L3 v2 pins the distinct source and rights notice enums", async () => {
  const value = JSON.parse(await readFile(path.join(workspaceRoot,
    DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH), "utf8"));
  assert.equal(value.noticeProjection.sourceSsidNotice,
    "commons_pd_scan_top_level_notice_observed_not_adjudicated");
  assert.equal(value.noticeProjection.sourceCadalNotice,
    "commons_pd_old_top_level_notice_observed_without_pd_scan_template_not_adjudicated");
  assert.equal(value.noticeProjection.rightsWorkNotice,
    "rendered_pd_old_dependency_observed_not_oldid_main_slot_literal");
  assert.equal(value.noticeProjection.rightsSsidNotice,
    "pd_scan_top_level_observed_not_adjudicated");
  assert.equal(value.noticeProjection.rightsCadalNotice,
    "pd_old_top_level_observed_without_pd_scan_template_not_adjudicated");
  assert.equal(value.noticeProjection.noticeApplicabilityEstablished, false);
  assert.equal(value.noticeProjection.legalConclusion, "not_established");
});

test("legacy generic source and rights verifiers still reject versioned envelopes", async () => {
  const source = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-binding-candidates.v1.6.0.json"), "utf8"));
  const rights = JSON.parse(await readFile(path.join(workspaceRoot,
    "content/bazi-strength-source-rights-candidates.v1.2.0.json"), "utf8"));
  assert.throws(() => verifyBaziSourceBindingCandidateLedger(source), /ledger keys expected/u);
  assert.throws(() => verifyBaziSourceRightsCandidateLedger(rights, source), /ledger keys expected/u);
});

test("legacy C-L3 verifier and brand reject C-L3 v2", async () => {
  const value = JSON.parse(await readFile(path.join(workspaceRoot,
    DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH), "utf8"));
  assert.throws(() => verifyBaziDttNoticeReconciliationArtifact(value));
  const result = await loadBaziDttNoticeReconciliationV2(workspaceRoot);
  assert.equal(isVerifiedBaziDttNoticeReconciliation(result), false);
  assert.throws(
    () => verifyBaziDttNoticeReconciliationGate(result, {}),
    expectCode("DTT_NOTICE_RECONCILIATION_UNVERIFIED")
  );
  assert.throws(
    () => verifyBaziBindingCandidateRightsTrustChain({}, {}, result),
    expectCode("DTT_NOTICE_RECONCILIATION_UNVERIFIED")
  );
});

test("legacy readiness verifier rejects readiness 1.7", async () => {
  const value = JSON.parse(await readFile(path.join(workspaceRoot,
    BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH), "utf8"));
  await assert.rejects(
    verifyBaziBindingFreezeRequirements(workspaceRoot, value),
    expectCode("LEDGER_MISMATCH")
  );
});

test("clones and self-resealed plain objects never acquire either private brand", async () => {
  const reconciliation = await loadBaziDttNoticeReconciliationV2(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.equal(isVerifiedBaziDttNoticeReconciliationV2(structuredClone(reconciliation)), false);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(structuredClone(readiness)), false);
  const fakeC = { ...reconciliation, reconciliationDigest: reconciliation.reconciliationDigest };
  const fakeR = { ...readiness, ledgerDigest: readiness.ledgerDigest };
  assert.equal(isVerifiedBaziDttNoticeReconciliationV2(fakeC), false);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(fakeR), false);
  assert.equal(isVerifiedBaziDttNoticeReconciliationV2(readiness), false);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(reconciliation), false);
});

test("test-only projections and cloned reconciliation inputs cannot cross the readiness brand gate", async () => {
  const bundle = await baziDttVersionAwareReadinessTestOnly.buildExpectedBundle(workspaceRoot);
  assert.equal(isVerifiedBaziDttNoticeReconciliationV2(bundle.reconciliation), false);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(bundle.readiness), false);
  const branded = await loadBaziDttNoticeReconciliationV2(workspaceRoot);
  await assert.rejects(
    baziDttVersionAwareReadinessTestOnly.buildExpectedReadinessFromVerifiedReconciliation(
      workspaceRoot,
      structuredClone(branded)
    ),
    expectCode("RECONCILIATION_V2_BRAND_REQUIRED")
  );
});

test("returned capability snapshots are deeply frozen", async () => {
  const reconciliation = await loadBaziDttNoticeReconciliationV2(workspaceRoot);
  const readiness = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
  assert.equal(Object.isFrozen(reconciliation), true);
  assert.equal(Object.isFrozen(reconciliation.reconciliation.noticeProjection), true);
  assert.equal(Object.isFrozen(readiness), true);
  assert.equal(Object.isFrozen(readiness.readiness.bindings), true);
  assert.throws(() => {
    readiness.readiness.bindings[7].candidateIds[0] = "forged";
  }, TypeError);
});

test("same-semantic whitespace drift in C-L3 v2 fails raw identity", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('\n  "schemaVersion"', '\n\t "schemaVersion"'), "utf8");
  await assert.rejects(loadBaziDttNoticeReconciliationV2(root), expectCode("PERSISTED_RAW_DRIFT"));
});

test("same-semantic whitespace drift in readiness 1.7 fails raw identity", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('\n  "schemaVersion"', '\n\t "schemaVersion"'), "utf8");
  await assert.rejects(loadBaziBindingFreezeRequirementsV17(root), expectCode("PERSISTED_RAW_DRIFT"));
});

test("self-resealed C-L3 authority promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH, (value) => {
    value.authorityBoundary.releaseReady = true;
    value.reconciliationDigest = computeBaziDttNoticeReconciliationV2Digest(value);
  });
  await assert.rejects(loadBaziDttNoticeReconciliationV2(root), expectCode("RECONCILIATION_V2_MISMATCH"));
});

test("self-resealed readiness binding promotion is rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH, (value) => {
    value.gateSummary.bindingFrozenVerified = 1;
    value.ledgerDigest = computeBaziBindingFreezeRequirementsV17Digest(value);
  });
  await assert.rejects(loadBaziBindingFreezeRequirementsV17(root), expectCode("READINESS_V17_MISMATCH"));
});

test("source/right old-new mix-and-match cannot reach C-L3 v2", async (t) => {
  const root = await fixture(t);
  await copyFile(
    path.join(root, "content/bazi-strength-source-binding-candidates.v1.json"),
    path.join(root, "content/bazi-strength-source-binding-candidates.v1.6.0.json")
  );
  await assert.rejects(loadBaziDttNoticeReconciliationV2(root),
    (error) => error?.code === "SOURCE_SUPERSESSION_MISMATCH"
      || error?.code === "SOURCE_SUPERSESSION_RAW_DRIFT");
});

test("rights old-new mix-and-match cannot reach C-L3 v2", async (t) => {
  const root = await fixture(t);
  await copyFile(
    path.join(root, "content/bazi-strength-source-rights-candidates.v1.json"),
    path.join(root, "content/bazi-strength-source-rights-candidates.v1.2.0.json")
  );
  await assert.rejects(loadBaziDttNoticeReconciliationV2(root),
    (error) => error?.code === "RIGHTS_SUPERSESSION_MISMATCH"
      || error?.code === "RIGHTS_SUPERSESSION_RAW_DRIFT");
});

test("self-resealed epoch and atomicity promotion remains rejected", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH, (value) => {
    value.integrityBoundary.crossFileAtomicSnapshot = true;
    value.integrityBoundary.mutationEpochAvailable = true;
    value.integrityBoundary.mutationEpochReceipt = "forged";
    value.integrityBoundary.intervalMutationExcludedAcrossFiles = true;
    value.integrityBoundary.abaExcluded = true;
    value.reconciliationDigest = computeBaziDttNoticeReconciliationV2Digest(value);
  });
  await assert.rejects(loadBaziDttNoticeReconciliationV2(root),
    expectCode("RECONCILIATION_V2_MISMATCH"));
});

test("supersession receipt drift cannot reach readiness 1.7", async (t) => {
  const root = await fixture(t);
  await mutateJson(root, "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json", (value) => {
    value.noticeResolutionBoundary.boundReadinessConsumesSupersedingParents = true;
  });
  await assert.rejects(loadBaziBindingFreezeRequirementsV17(root),
    (error) => error?.code === "SUPERSESSION_DIGEST_MISMATCH"
      || error?.code === "SUPERSESSION_RECEIPT_MISMATCH");
});

test("duplicate and escaped duplicate keys fail closed", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH);
  const source = await readFile(target, "utf8");
  await writeFile(target, source.replace('  "schemaVersion":',
    '  "schema\\u0056ersion": "9.9.9",\n  "schemaVersion":'), "utf8");
  await assert.rejects(loadBaziDttNoticeReconciliationV2(root),
    (error) => error?.code === "JSON_DUPLICATE_KEY");
});

test("hard-linked persisted readiness is rejected", async (t) => {
  const root = await fixture(t);
  const target = path.join(root, BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH);
  const other = path.join(root, "readiness-hardlink.json");
  await link(target, other);
  await assert.rejects(loadBaziBindingFreezeRequirementsV17(root),
    expectCode("HARDLINK_REJECTED"));
});

test("captured builtins survive post-import same-realm poisoning", async () => {
  const originals = {
    objectFreeze: Object.freeze,
    objectGetOwnPropertyDescriptor: Object.getOwnPropertyDescriptor,
    reflectOwnKeys: Reflect.ownKeys,
    weakSetAdd: WeakSet.prototype.add,
    weakSetHas: WeakSet.prototype.has,
    fsOpen: fsPromises.open,
    fsLstat: fsPromises.lstat,
    fsRealpath: fsPromises.realpath
  };
  const poison = () => { throw new Error("poisoned builtin invoked"); };
  try {
    Object.freeze = poison;
    Object.getOwnPropertyDescriptor = poison;
    Reflect.ownKeys = poison;
    WeakSet.prototype.add = poison;
    WeakSet.prototype.has = poison;
    fsPromises.open = poison;
    fsPromises.lstat = poison;
    fsPromises.realpath = poison;
    syncBuiltinESMExports();
    const result = await loadBaziBindingFreezeRequirementsV17(workspaceRoot);
    assert.equal(result.bindingFrozenVerified, 0);
    assert.equal(result.formalAdmissionPromotionBlocked, true);
  } finally {
    Object.freeze = originals.objectFreeze;
    Object.getOwnPropertyDescriptor = originals.objectGetOwnPropertyDescriptor;
    Reflect.ownKeys = originals.reflectOwnKeys;
    WeakSet.prototype.add = originals.weakSetAdd;
    WeakSet.prototype.has = originals.weakSetHas;
    fsPromises.open = originals.fsOpen;
    fsPromises.lstat = originals.fsLstat;
    fsPromises.realpath = originals.fsRealpath;
    syncBuiltinESMExports();
  }
});

test("old active/default consumers do not import the version-aware candidate capability", async () => {
  const paths = [
    "scripts/bazi-dtt-notice-reconciliation-lib.mjs",
    "scripts/bazi-binding-freeze-requirements-lib.mjs",
    "scripts/bazi-pr10bc-scope-reconciliation-lib.mjs",
    "scripts/bazi-engineering-binding-value-subject-gap-lib.mjs",
    "scripts/bazi-policy-weights-value-evidence-candidate-lib.mjs",
    "scripts/bazi-project-copy-materialization-lib.mjs",
    "scripts/bazi-expert-review-packet-lib.mjs",
    "scripts/bazi-expert-authority-material-precheck-lib.mjs",
    "scripts/bazi-private-exact-quote-material-verifier-lib.mjs",
    "scripts/bazi-domain-release-manifest-lib.mjs",
    "scripts/system-admission-registry-lib.mjs",
    "scripts/cross-system-engineering-fact-receipt-lib.mjs"
  ];
  for (const relativePath of paths) {
    const source = await readFile(path.join(workspaceRoot, relativePath), "utf8");
    assert.equal(source.includes("bazi-dtt-version-aware-readiness"), false, relativePath);
    assert.equal(source.includes(DTT_NOTICE_RECONCILIATION_V2_RELATIVE_PATH), false, relativePath);
    assert.equal(source.includes(BAZI_BINDING_FREEZE_REQUIREMENTS_V17_RELATIVE_PATH), false, relativePath);
  }
  const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
  for (const scriptName of ["build", "test", "typecheck", "prebuild", "pretest", "pretypecheck"]) {
    const script = packageJson.scripts?.[scriptName] ?? "";
    assert.equal(script.includes("verify-bazi-dtt-version-aware-readiness"), false, scriptName);
    assert.equal(script.includes("bazi-dtt-version-aware-readiness"), false, scriptName);
  }
});
