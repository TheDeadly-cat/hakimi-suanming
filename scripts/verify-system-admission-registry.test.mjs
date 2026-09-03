import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCurrentSystemAdmissionRegistry,
  canonicalStringifySystemAdmissionRegistry,
  readSystemAdmissionRegistry,
  verifySystemAdmissionRegistry
} from "./system-admission-registry-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function expectRegistryMismatch(candidate) {
  await assert.rejects(
    verifySystemAdmissionRegistry(workspaceRoot, candidate),
    /准入登记与当前证据闭包、独立准入门或失败关闭边界不一致/u
  );
}

test("current registry binds four independent systems and their selected evidence closure", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const expected = await buildCurrentSystemAdmissionRegistry(workspaceRoot, {
    createdAt: registry.createdAt
  });
  assert.equal(
    canonicalStringifySystemAdmissionRegistry(registry),
    canonicalStringifySystemAdmissionRegistry(expected)
  );
  const verified = await verifySystemAdmissionRegistry(workspaceRoot, registry);
  assert.equal(verified.systemsRegistered, 4);
  assert.equal(verified.systemsFormallyAdmitted, 0);
  assert.deepEqual(
    registry.systemIdVocabulary.map((entry) => [entry.productSystemId, entry.contractSystemId]),
    [
      ["bazi", "bazi"],
      ["ziwei-doushu", "ziwei"],
      ["western-astrology", "western"],
      ["vedic-astrology", "vedic"]
    ]
  );
  const baziManifestArtifact = registry.systems[0].artifacts.find(
    (entry) => entry.role === "current_domain_release_manifest"
  );
  assert.equal(
    baziManifestArtifact?.semanticManifestDigest,
    "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932"
  );
});

test("legacy-v13 governance and mutation epoch cannot be widened by the registry", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const mutations = [
    (value) => { value.releaseGovernance.activeLine = "production-v14"; },
    (value) => { value.releaseGovernance.targetSchema = 14; },
    (value) => { value.releaseGovernance.migrationId = "v13-to-v14"; },
    (value) => { value.releaseGovernance.mutationEpochBoundaryRequired = false; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(registry);
    mutate(candidate);
    await expectRegistryMismatch(candidate);
  }
});

test("no system can inherit bazi authority or self-promote to formal admission", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const mutations = [
    (value) => { value.systems[1].authorityBoundary.formalAdmissionAuthorized = true; },
    (value) => { value.systems[2].authorityBoundary.domainAuthorityAuthorized = true; },
    (value) => { value.systems[3].evidenceLedger.contentTruth = "inherited_from_bazi"; },
    (value) => { value.systems[0].authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.gateSummary.systemsFormallyAdmitted = 1; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(registry);
    mutate(candidate);
    await expectRegistryMismatch(candidate);
  }
});

test("draft packages and research-only ADR cannot be renamed as production products", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  for (const index of [1, 2, 3]) {
    const candidate = clone(registry);
    candidate.systems[index].productStatus = "production";
    await expectRegistryMismatch(candidate);
  }
});

test("all eight admission gates remain exact and fail closed", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  assert.deepEqual(
    Object.keys(registry.systems[0].admissionGates),
    [
      "inputContract",
      "deterministicFacts",
      "ruleset",
      "sourceBundle",
      "rightsBundle",
      "expertReviewBundle",
      "highRiskPolicy",
      "releaseEvidence"
    ]
  );
  for (const system of registry.systems) {
    for (const gate of Object.values(system.admissionGates)) {
      assert.equal(gate.formalGateSatisfied, false);
    }
  }
  const candidate = clone(registry);
  candidate.systems[0].admissionGates.sourceBundle.formalGateSatisfied = true;
  await expectRegistryMismatch(candidate);
});

test("Ziwei and Western source gates bind exact requirement counts while all bindings remain absent", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const ziwei = registry.systems.find((entry) => entry.productSystemId === "ziwei-doushu");
  const western = registry.systems.find((entry) => entry.productSystemId === "western-astrology");
  assert.deepEqual(ziwei.admissionGates.sourceBundle, {
    engineeringState: "binding_requirements_inventory_27_present",
    closureState: "binding_frozen_0_of_27",
    formalGateSatisfied: false
  });
  assert.deepEqual(western.admissionGates.sourceBundle, {
    engineeringState: "binding_requirements_inventory_28_present",
    closureState: "binding_frozen_0_of_28",
    formalGateSatisfied: false
  });
  assert.equal(
    ziwei.artifacts.find((entry) => entry.role === "source_binding_requirements_inventory")?.path,
    "content/system-admission/ziwei-source-binding-requirements.v1.json"
  );
  assert.equal(
    western.artifacts.find((entry) => entry.role === "source_binding_requirements_inventory")?.path,
    "content/system-admission/western-source-binding-requirements.v1.json"
  );
});

test("cross-system scoring, weighting, voting, model arbitration and concept equivalence stay prohibited", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const mutations = [
    (value) => { value.crossSystemPolicy.scoringAllowed = true; },
    (value) => { value.crossSystemPolicy.weightingAllowed = true; },
    (value) => { value.crossSystemPolicy.majorityVoteAllowed = true; },
    (value) => { value.crossSystemPolicy.generatedModelWinnerSelectionAllowed = true; },
    (value) => { value.crossSystemPolicy.conceptEquivalenceInferenceAllowed = true; },
    (value) => { value.crossSystemPolicy.authorityInheritanceAllowed = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(registry);
    mutate(candidate);
    await expectRegistryMismatch(candidate);
  }
});

test("vedic astrology cannot enter the comparison draft before independent admission", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const candidate = clone(registry);
  candidate.crossSystemPolicy.currentDraftSystemIds.push("vedic-astrology");
  candidate.crossSystemPolicy.excludedUntilIndependentAdmission = [];
  await expectRegistryMismatch(candidate);
});

test("artifact digest drift and unknown authorization fields fail closed", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const digestDrift = clone(registry);
  digestDrift.systems[1].artifacts[0].sha256 = "0".repeat(64);
  await expectRegistryMismatch(digestDrift);

  const semanticDigestDrift = clone(registry);
  semanticDigestDrift.systems[0].artifacts[0].semanticManifestDigest = "0".repeat(64);
  await expectRegistryMismatch(semanticDigestDrift);

  const unknown = clone(registry);
  unknown.crossSystemAuthorityApproved = true;
  await expectRegistryMismatch(unknown);
});
