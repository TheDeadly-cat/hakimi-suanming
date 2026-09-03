import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  BAZI_DOMAIN_COMPONENT_SPECS,
  BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH,
  buildCurrentBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";
import {
  BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH,
  BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH
} from "./bazi-expert-review-packet-lib.mjs";
import {
  BAZI_V17_MANIFEST_DRIFT_DECISION_LEDGER_RELATIVE_PATH,
  buildCurrentBaziV17ManifestDriftDecisionLedger,
  computeBaziV17ManifestDriftDecisionDigest,
  parseBaziV17ManifestDriftDecisionJsonBytes,
  readBaziV17ManifestDriftDecisionLedger,
  verifyBaziV17ManifestDriftDecisionLedger
} from "./bazi-v17-manifest-drift-decision-lib.mjs";

const workspaceRoot = process.cwd();

async function currentLedger(root = workspaceRoot) {
  return readBaziV17ManifestDriftDecisionLedger(root);
}

function resign(candidate) {
  return {
    ...candidate,
    ledgerDigest: computeBaziV17ManifestDriftDecisionDigest(candidate)
  };
}

async function expectMismatch(mutator) {
  const candidate = structuredClone(await currentLedger());
  mutator(candidate);
  await assert.rejects(
    () => verifyBaziV17ManifestDriftDecisionLedger(workspaceRoot, resign(candidate)),
    (error) => error?.code === "LEDGER_MISMATCH"
  );
}

async function copyRelativeFile(sourceRoot, targetRoot, relativePath) {
  const source = path.resolve(sourceRoot, ...relativePath.split("/"));
  const target = path.resolve(targetRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}

async function createMinimalWorkspaceFixture() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-v17-d0-"));
  const packet = JSON.parse(await readFile(
    path.resolve(workspaceRoot, ...BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH.split("/")),
    "utf8"
  ));
  const relativePaths = new Set([
    BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH,
    BAZI_EXPERT_REVIEW_INTAKE_GAP_RELATIVE_PATH,
    BAZI_EXPERT_REVIEW_PACKET_RELATIVE_PATH,
    BAZI_V17_MANIFEST_DRIFT_DECISION_LEDGER_RELATIVE_PATH,
    ...BAZI_DOMAIN_COMPONENT_SPECS.flatMap((component) => component.files),
    ...packet.artifactLocks.map((lock) => lock.path)
  ]);
  for (const relativePath of relativePaths) {
    await copyRelativeFile(workspaceRoot, temporaryRoot, relativePath);
  }
  return temporaryRoot;
}

test("current D0 ledger exactly reproduces saved/current manifest and expert packet drift", async () => {
  const ledger = await currentLedger();
  const result = await verifyBaziV17ManifestDriftDecisionLedger(workspaceRoot, ledger);
  assert.equal(result.ledgerDigest, "5b82b545a2c5b0cd5714342c1bdaca742f4de44e196cc32817e8310926850d0f");
  assert.equal(result.manifestFilesDrifted, 7);
  assert.equal(result.ownerDecisionsRecorded, 0);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.releaseCandidateFreezeAllowed, false);
});

test("raw D0 JSON rejects BOM invalid UTF-8 and duplicate keys", () => {
  assert.throws(
    () => parseBaziV17ManifestDriftDecisionJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error?.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseBaziV17ManifestDriftDecisionJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error?.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseBaziV17ManifestDriftDecisionJsonBytes(Buffer.from('{"schemaVersion":"1","schemaVersion":"2"}', "utf8")),
    (error) => error?.code === "JSON_DUPLICATE_KEY"
  );
});

test("manifest preview remains non-authoritative with exactly seven component-file drift entries", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(
    ledger.driftDecisions.map((entry) => [entry.componentId, entry.path]),
    [
      ["fact_contract", "packages/bazi-core/src/index.ts"],
      ["source_bundle", "scripts/audit-bazi-source-binding-candidates-live.ps1"],
      ["source_bundle", "scripts/bazi-binding-freeze-requirements-lib.mjs"],
      ["rights_bundle", "apps/web/bundled-knowledge-audit.ts"],
      ["rights_bundle", "package.json"],
      ["rights_bundle", "scripts/bazi-binding-freeze-requirements-lib.mjs"],
      ["high_risk_policy", "scripts/bazi-expert-review-packet-lib.mjs"]
    ]
  );
  assert.equal(ledger.savedManifest.semanticManifestDigest, "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932");
  assert.equal(ledger.currentExpectedManifestPreview.semanticManifestDigest, "be637b1e37ae92a9fd047af28d0117334405a39408dc470c766b7ddb8ab96954");
  assert.equal(ledger.currentExpectedManifestPreview.changedComponentsObserved, 4);
  assert.equal(ledger.currentExpectedManifestPreview.unchangedComponentsObserved, 5);
  assert.equal(ledger.currentExpectedManifestPreview.changedFilesObserved, 7);
  assert.equal(ledger.gateSummary.manifestComponentsDrifted, 4);
  assert.equal(ledger.gateSummary.manifestFilesDrifted, 7);
  assert.equal(ledger.currentExpectedManifestPreview.authoritative, false);
  assert.equal(ledger.currentExpectedManifestPreview.persistedAsDomainManifest, false);
  assert.equal(ledger.currentExpectedManifestPreview.frozenGoldenMatchesCurrentBytes, true);
  const highRiskDrift = ledger.driftDecisions.find((entry) => entry.componentId === "high_risk_policy");
  assert.equal(highRiskDrift.currentComponentDigest, "666bffc377e59e220b4a7ca1930a7a519b046a89af7dbaaf186d2bec68b83c3c");
  assert.equal(highRiskDrift.currentSha256, "76046086e4d4b49cd7166b548f4b6999fb208db020ed9b06e1cdefa90c2cd669");
  assert.equal(
    highRiskDrift.priorEvidenceState,
    "targeted_phase_d_private_identity_dossier_workspace_root_fix_implemented_manifest_rebind_not_authorized"
  );
});

test("all attribution acceptance and owner decisions remain absent", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(ledger.decisionPolicy.allowedOwnerDecisions, [
    "accept_current_bytes_for_new_engineering_candidate_binding",
    "replace_or_restore_under_explicit_scope",
    "defer"
  ]);
  for (const entry of ledger.driftDecisions) {
    assert.equal(entry.changeAuthorshipVerified, false);
    assert.equal(entry.ownerAttributionVerified, false);
    assert.equal(entry.semanticAcceptanceForManifestRebind, false);
    assert.equal(entry.ownerDecision, null);
    assert.equal(entry.currentBytesAcceptedForCandidateRebind, false);
  }
  assert.equal(ledger.gateSummary.manifestRebindAuthorized, false);
  assert.equal(ledger.gateSummary.expertPacketRebindAuthorized, false);
});

test("expert packet impact stays one artifact drift with two vacant seats", async () => {
  const ledger = await currentLedger();
  assert.equal(ledger.expertPacketImpact.currentVerifierFailureCode, "ARTIFACT_DRIFT");
  assert.deepEqual(
    ledger.expertPacketImpact.artifactDrifts.map((entry) => entry.path),
    ["packages/bazi-core/src/index.ts"]
  );
  assert.equal(ledger.expertPacketImpact.domainExpertsRequired, 2);
  assert.equal(ledger.expertPacketImpact.reviewerSlotsOccupied, 0);
  assert.equal(ledger.expertPacketImpact.independentExpertReviewsVerified, 0);
  assert.equal(ledger.expertPacketImpact.sealedOriginalOpinions, 0);
  assert.equal(ledger.expertPacketImpact.packetResignAuthorized, false);
});

test("authority decisions manifest rewrites and RC promotion cannot be fabricated", async () => {
  const mutations = [
    (value) => { value.status = "owner_decisions_complete"; },
    (value) => { value.driftDecisions[0].ownerDecision = "accept_current_bytes_for_new_engineering_candidate_binding"; },
    (value) => { value.driftDecisions[0].ownerAttributionVerified = true; },
    (value) => { value.driftDecisions[0].currentBytesAcceptedForCandidateRebind = true; },
    (value) => { value.currentExpectedManifestPreview.authoritative = true; },
    (value) => { value.currentExpectedManifestPreview.persistedAsDomainManifest = true; },
    (value) => { value.decisionPolicy.manifestRewriteAllowedByThisLedger = true; },
    (value) => { value.expertPacketImpact.packetResignAuthorized = true; },
    (value) => { value.gateSummary.releaseCandidateFreezeAllowed = true; },
    (value) => { value.gateSummary.expertClaimsAuthorized = true; },
    (value) => { value.publicDeploymentAuthorized = true; }
  ];
  for (const mutation of mutations) await expectMismatch(mutation);
});

test("mutation epoch cross-file atomicity and ABA cannot be fabricated", async () => {
  const mutations = [
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.mutationEpochAvailableForSchema13 = true; },
    (value) => { value.observationBoundary.mutationEpochReceipt = 0; },
    (value) => { value.observationBoundary.intervalMutationExcluded = true; },
    (value) => { value.observationBoundary.abaExcluded = true; }
  ];
  for (const mutation of mutations) await expectMismatch(mutation);
});

test("unknown fields and omitted non-claims fail even after digest recomputation", async () => {
  await expectMismatch((value) => { value.ownerApproval = true; });
  await expectMismatch((value) => { value.doesNotEstablish.pop(); });
  await expectMismatch((value) => { value.driftDecisions[1].unreviewedReason = "invented"; });
});

test("object API rejects a time-varying accessor without invoking it", async () => {
  const candidate = await currentLedger();
  let reads = 0;
  Object.defineProperty(candidate.gateSummary, "releaseCandidateFreezeAllowed", {
    configurable: true,
    enumerable: true,
    get() {
      reads += 1;
      return reads >= 3;
    }
  });
  await assert.rejects(
    () => verifyBaziV17ManifestDriftDecisionLedger(workspaceRoot, candidate),
    (error) => error?.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);
});

test("successful object API verification returns a detached deeply frozen ledger", async () => {
  const candidate = await currentLedger();
  const result = await verifyBaziV17ManifestDriftDecisionLedger(workspaceRoot, candidate);
  assert.notEqual(result.ledger, candidate);
  assert.equal(Object.isFrozen(result.ledger), true);
  assert.equal(Object.isFrozen(result.ledger.gateSummary), true);
  assert.equal(Object.isFrozen(result.ledger.driftDecisions), true);
  assert.equal(Object.isFrozen(result.ledger.driftDecisions[0]), true);
  candidate.gateSummary.releaseCandidateFreezeAllowed = true;
  assert.equal(result.ledger.gateSummary.releaseCandidateFreezeAllowed, false);
  assert.equal(Reflect.set(result.ledger.gateSummary, "releaseCandidateFreezeAllowed", true), false);
  assert.equal(result.releaseCandidateFreezeAllowed, false);
});

test("a later component-byte change invalidates the frozen D0 observation", async () => {
  const fixtureRoot = await createMinimalWorkspaceFixture();
  try {
    const ledger = await currentLedger(fixtureRoot);
    const target = path.resolve(fixtureRoot, "packages", "bazi-core", "src", "index.ts");
    const original = await readFile(target, "utf8");
    await writeFile(target, `${original}\n// test-only later drift\n`, "utf8");
    await assert.rejects(
      () => verifyBaziV17ManifestDriftDecisionLedger(fixtureRoot, ledger),
      (error) => error?.code === "CURRENT_EXPECTED_MANIFEST_CHANGED"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("replacing the saved manifest with the current preview retires rather than silently passes D0", async () => {
  const fixtureRoot = await createMinimalWorkspaceFixture();
  try {
    const ledger = await currentLedger(fixtureRoot);
    const saved = JSON.parse(await readFile(
      path.resolve(fixtureRoot, ...BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH.split("/")),
      "utf8"
    ));
    const current = await buildCurrentBaziDomainReleaseManifest(fixtureRoot, { createdAt: saved.createdAt });
    await writeFile(
      path.resolve(fixtureRoot, ...BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH.split("/")),
      `${JSON.stringify(current, null, 2)}\n`,
      "utf8"
    );
    await assert.rejects(
      () => verifyBaziV17ManifestDriftDecisionLedger(fixtureRoot, ledger),
      (error) => error?.code === "SAVED_MANIFEST_FILE_DRIFT"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
