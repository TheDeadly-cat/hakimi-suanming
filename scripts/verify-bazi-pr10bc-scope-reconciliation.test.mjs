import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS,
  buildCurrentBaziPr10bcScopeReconciliation,
  canonicalStringifyBaziPr10bcScopeReconciliation,
  extractExactCurrentBaziStrengthBindingIds,
  parseBaziPr10bcScopeReconciliationJsonBytes,
  readBaziPr10bcScopeReconciliation,
  verifyBaziPr10bcScopeReconciliation
} from "./bazi-pr10bc-scope-reconciliation-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function expectMismatch(candidate) {
  await assert.rejects(
    verifyBaziPr10bcScopeReconciliation(workspaceRoot, candidate),
    /与当前 7\/4\/1 binding、scoped producer\/consumer 或失败关闭状态不一致/u
  );
}

test("current PR10B/PR10C reconciliation ledger is exactly reproducible", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const expected = await buildCurrentBaziPr10bcScopeReconciliation(workspaceRoot, {
    createdAt: ledger.createdAt
  });
  assert.equal(
    canonicalStringifyBaziPr10bcScopeReconciliation(ledger),
    canonicalStringifyBaziPr10bcScopeReconciliation(expected)
  );
  const verified = await verifyBaziPr10bcScopeReconciliation(workspaceRoot, ledger);
  assert.equal(verified.scopeProjectionsReproduced, 9);
  assert.equal(verified.parallelBindingsCreated, 0);
  assert.equal(verified.bindingsFrozen, 0);
});

test("raw reconciliation JSON rejects BOM invalid UTF-8 and duplicate keys", () => {
  assert.throws(
    () => parseBaziPr10bcScopeReconciliationJsonBytes(
      Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    /LEDGER_BOM_FORBIDDEN|不得包含 UTF-8 BOM/u
  );
  assert.throws(
    () => parseBaziPr10bcScopeReconciliationJsonBytes(Buffer.from([0xc3, 0x28])),
    /LEDGER_UTF8_INVALID|不是严格 UTF-8/u
  );
  assert.throws(
    () => parseBaziPr10bcScopeReconciliationJsonBytes(
      Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"forged"}', "utf8")
    ),
    /LEDGER_DUPLICATE_KEY|含重复对象键/u
  );
});

test("conflicting original and recommended deep-review orders remain explicit without creating binding identities", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  assert.equal(BAZI_PR10BC_SCOPE_RECONCILIATION_DEFINITIONS.length, 9);
  assert.deepEqual(
    ledger.concepts.map((entry) => entry.recommendedBatchOrder),
    [4, 5, 6, 7, 8, 9, 10, 11, 12]
  );
  assert.deepEqual(
    ledger.concepts.map((entry) => entry.originalTopicOrder),
    [6, 7, 8, 9, 10, 4, 5, 11, 12]
  );
  assert.equal(
    ledger.scopeInput.orderingBoundary,
    "deep_review_contains_conflicting_original_and_recommended_orders_reconciliation_uses_recommended_batch_order"
  );
  assert.equal(ledger.gateSummary.exactCurrentBindingIdMatches, 0);
  assert.deepEqual(ledger.mappingAuthorityBoundary, {
    mappingProjectionClass: "repository_authored_scope_judgment_not_domain_truth",
    mappingProjectionMechanicallyReproduced: true,
    semanticEquivalenceMechanicallyEstablished: false,
    userSuppliedReviewAttachmentBytesBound: false,
    domainExpertMappingApproved: false
  });
  assert.equal(ledger.gateSummary.semanticMappingsMechanicallyEstablished, 0);
  assert.equal(ledger.gateSummary.domainExpertMappingsApproved, 0);
  assert.equal(ledger.concepts.every((entry) => entry.dedicatedCurrentBindingExists === false), true);
  assert.equal(ledger.concepts.every((entry) => entry.parallelBindingCreated === false), true);
  const currentBindings = new Set(ledger.currentBindingInventory.bindingIds);
  assert.equal(ledger.concepts.some((entry) => currentBindings.has(entry.topicId)), false);
});

test("claim registry sourceBindings is an exact ordered 12-binding inventory and rejects an added alias", async () => {
  const registryPath = path.join(
    workspaceRoot,
    "packages",
    "bazi-interpretation",
    "src",
    "strength-claim-registry.ts"
  );
  const source = await readFile(registryPath, "utf8");
  const bindingIds = extractExactCurrentBaziStrengthBindingIds(source);
  assert.equal(bindingIds.length, 12);
  assert.deepEqual(bindingIds, (await readBaziPr10bcScopeReconciliation(workspaceRoot)).currentBindingInventory.bindingIds);
  const injected = source.replace(
    /\r?\n\]\);\r?\n\r?\nfunction claim\(/u,
    ',\n  Object.freeze({ bindingId: "binding:invented:parallel-alias" })\n]);\n\nfunction claim('
  );
  assert.notEqual(injected, source);
  assert.throws(
    () => extractExactCurrentBaziStrengthBindingIds(injected),
    /精确 12 项|不是当前精确 12 条有序枚举/u
  );
  const nonLiteralAlias = source.replace(
    'bindingId: "binding:core:derive-assessment"',
    'bindingId: SOME_DYNAMIC_BINDING_ID'
  );
  assert.notEqual(nonLiteralAlias, source);
  assert.throws(
    () => extractExactCurrentBaziStrengthBindingIds(nonLiteralAlias),
    /唯一 literal bindingId/u
  );
  const spreadOverride = source.replace(
    'bindingId: "binding:core:derive-assessment",',
    'bindingId: "binding:core:derive-assessment", ...{ bindingId: "binding:invented:spread-alias" },'
  );
  assert.notEqual(spreadOverride, source);
  assert.throws(
    () => extractExactCurrentBaziStrengthBindingIds(spreadOverride),
    /禁止 spread/u
  );
});

test("PR10B records generic facts and adjacent historical context without inventing rule tables", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const pr10b = ledger.concepts.filter((entry) => entry.recommendedBatch.startsWith("PR10B_"));
  assert.equal(pr10b.length, 5);
  assert.equal(pr10b.every((entry) => entry.currentBindingIds.length === 0), true);
  assert.equal(
    pr10b.every((entry) => entry.dedicatedRuleTableOrScoreMeaningFieldObservedInScopedArtifacts === false),
    true
  );
  assert.equal(ledger.gateSummary.dedicatedRuleTablesObservedInScopedArtifacts, 0);
  assert.equal(ledger.gateSummary.repositoryWideRuleTableAbsenceEstablished, false);
  assert.equal(ledger.gateSummary.tableValueSourceBundlesComplete, 0);
  assert.equal(ledger.gateSummary.conceptsWithAdjacentHistoricalCandidates, 4);
  assert.equal(
    pr10b.find((entry) => entry.topicId === "support.season_storage")?.mappingState,
    "not_registered_no_scoped_producer_observed"
  );
  for (const topicId of ["support.season_production", "support.season_control"]) {
    const entry = pr10b.find((candidate) => candidate.topicId === topicId);
    assert.equal(
      entry.mappingState,
      "underdefined_generic_relation_and_month_command_pipeline_observed_not_season_table"
    );
    assert.equal(entry.nearestNonEquivalentBindingIds.length, 5);
    assert.equal(entry.adjacentHistoricalCandidates.length, 3);
    assert.equal(entry.adjacentHistoricalCandidates.every((candidate) => candidate.quoteCandidateIds.length === 1), true);
  }
});

test("hidden-stem facts and visible-stem presence are not promoted to rooting or tougan tables", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const rooting = ledger.concepts.find((entry) => entry.topicId === "support.rooting_tables");
  const tougan = ledger.concepts.find((entry) => entry.topicId === "support.tougan_tables");
  assert.equal(rooting.mappingState, "runtime_hidden_stem_fact_and_adjacent_text_only_not_rooting_table");
  assert.deepEqual(rooting.nearestNonEquivalentBindingIds, ["binding:policy:weights"]);
  assert.equal(rooting.adjacentHistoricalCandidates.length, 2);
  assert.equal(tougan.mappingState, "visible_stem_presence_and_adjacent_text_only_not_tougan_table");
  assert.deepEqual(tougan.nearestNonEquivalentBindingIds, ["binding:policy:factor-inclusion"]);
  assert.equal(tougan.adjacentHistoricalCandidates.length, 1);
});

test("both position-decay concepts remain undefined and non-equivalent to hidden-stem index weighting", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const decay = ledger.concepts.filter((entry) => entry.topicId.endsWith("position_decay"));
  assert.equal(decay.length, 2);
  assert.equal(
    decay.every((entry) => entry.mappingState === "ambiguous_hidden_stem_index_weight_is_not_pillar_position_decay"),
    true
  );
  assert.equal(decay.every((entry) => entry.currentBindingIds.length === 0), true);
  assert.equal(decay.every((entry) => entry.nearestNonEquivalentBindingIds[0] === "binding:policy:weights"), true);
  assert.equal(ledger.gateSummary.ambiguousPositionDecayConcepts, 2);
});

test("score topics map to the seven existing engineering candidates with observational-only semantics", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const scoreTopics = ledger.concepts.filter((entry) => entry.topicId.includes("score"));
  assert.equal(scoreTopics.length, 2);
  for (const entry of scoreTopics) {
    assert.equal(entry.currentBindingIds.length, 7);
    assert.equal(new Set(entry.currentBindingIds).size, 7);
    assert.equal(entry.scoreMeaning, "observational_engineering_candidate_only");
    assert.equal(entry.formalScoringAllowed, false);
    assert.equal(entry.bindingFreezeEffect, "none");
  }
  assert.equal(ledger.gateSummary.firstClassScoreMeaningFieldsObservedInScopedArtifacts, 0);
  assert.equal(ledger.gateSummary.repositoryWideScoreMeaningAbsenceEstablished, false);
  assert.equal(ledger.gateSummary.conceptsMappedToExistingEngineeringBindings, 2);
});

test("all truth authority rights runtime release and public authorization ledgers remain separate and red", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  assert.deepEqual(ledger.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  for (const entry of ledger.concepts) {
    assert.equal(entry.contentTruthEstablished, false);
    assert.equal(entry.expertTruthEstablished, false);
    assert.equal(entry.rightsLegalConclusionEstablished, false);
    assert.equal(entry.bindingFreezeEffect, "none");
  }
  assert.equal(ledger.gateSummary.browserRuntimeEvidenceEstablished, false);
  assert.equal(ledger.gateSummary.releaseReady, false);
  assert.equal(ledger.gateSummary.publicDeploymentAuthorized, false);
  assert.equal(ledger.gateSummary.expertClaimsAuthorized, false);
  assert.deepEqual(ledger.observationBoundary, {
    scopedSourceHashAndInspectionUseSameReadBuffer: true,
    basisArtifactHashAndParsedValidationUseSameReadBuffer: true,
    endpointSnapshotOnly: true,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    intervalMutationExcluded: false,
    abaExcluded: false
  });
});

test("authority completion or a parallel binding cannot be fabricated", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const mutations = [
    (value) => { value.concepts[0].dedicatedCurrentBindingExists = true; },
    (value) => { value.concepts[0].currentBindingIds = ["support.season_production"]; },
    (value) => { value.concepts[3].dedicatedRuleTableOrScoreMeaningFieldObservedInScopedArtifacts = true; },
    (value) => { value.concepts[5].parallelBindingCreated = true; },
    (value) => { value.concepts[6].formalScoringAllowed = true; },
    (value) => { value.concepts[6].contentTruthEstablished = true; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.gateSummary.releaseReady = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(ledger);
    mutate(candidate);
    await expectMismatch(candidate);
  }
});

test("governance and current artifact identity locks fail closed", async () => {
  const ledger = await readBaziPr10bcScopeReconciliation(workspaceRoot);
  const mutations = [
    (value) => { value.releaseGovernance.targetSchema = 14; },
    (value) => { value.releaseGovernance.migrationId = "invented"; },
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; },
    (value) => { value.basisArtifacts[0].sha256 = "0".repeat(64); },
    (value) => { value.artifactObservations[0].sha256 = "0".repeat(64); },
    (value) => { value.currentBindingInventory.bindingIds.pop(); }
  ];
  for (const mutate of mutations) {
    const candidate = clone(ledger);
    mutate(candidate);
    await expectMismatch(candidate);
  }
});
