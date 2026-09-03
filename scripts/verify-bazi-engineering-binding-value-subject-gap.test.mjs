import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCurrentBaziEngineeringBindingValueSubjectGap,
  canonicalStringifyBaziEngineeringBindingValueSubjectGap,
  extractCurrentBaziEngineeringValueObservations,
  parseBaziEngineeringBindingValueSubjectGapJsonBytes,
  readBaziEngineeringBindingValueSubjectGap,
  verifyBaziEngineeringBindingValueSubjectGap
} from "./bazi-engineering-binding-value-subject-gap-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const engineeringBindingIds = Object.freeze([
  "binding:core:derive-assessment",
  "binding:policy:factor-inclusion",
  "binding:policy:direction-map",
  "binding:policy:weights",
  "binding:policy:month-duplication",
  "binding:policy:thresholds",
  "binding:sensitivity:six-scenarios"
]);
const sourcePaths = Object.freeze({
  policy: "packages/bazi-interpretation/src/strength-policy.ts",
  core: "packages/bazi-interpretation/src/strength-assessment-core.ts",
  sensitivity: "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  baziCore: "packages/bazi-core/src/index.ts",
  panel: "apps/web/src/components/bazi-interpretation-panel.tsx",
  report: "packages/research-export/src/single-chart-report.ts",
  localAi: "apps/web/src/lib/local-ai-draft-validation.ts",
  envelope: "packages/bazi-interpretation/src/interpretation-evidence-envelope.ts",
  contracts: "packages/contracts/src/index.ts",
  knowledge: "packages/knowledge-core/src/index.ts",
  sourceRefs: "packages/bazi-interpretation/src/source-refs.ts"
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadSources() {
  return Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async ([key, relativePath]) => [
    key,
    await readFile(path.join(workspaceRoot, ...relativePath.split("/")), "utf8")
  ])));
}

async function expectMismatch(candidate) {
  await assert.rejects(
    verifyBaziEngineeringBindingValueSubjectGap(workspaceRoot, candidate),
    /与当前七条工程 binding、producer\/consumer 或失败关闭状态不一致/u
  );
}

function binding(ledger, bindingId) {
  const result = ledger.engineeringBindings.find((entry) => entry.bindingId === bindingId);
  assert.ok(result, `missing ${bindingId}`);
  return result;
}

function subject(ledger, valueSubjectId) {
  const result = ledger.engineeringBindings
    .flatMap((entry) => entry.valueSubjects)
    .find((entry) => entry.valueSubjectId === valueSubjectId);
  assert.ok(result, `missing ${valueSubjectId}`);
  return result;
}

test("current engineering binding value-subject gap ledger is exactly reproducible", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  const expected = await buildCurrentBaziEngineeringBindingValueSubjectGap(workspaceRoot, {
    createdAt: ledger.createdAt
  });
  assert.equal(
    canonicalStringifyBaziEngineeringBindingValueSubjectGap(ledger),
    canonicalStringifyBaziEngineeringBindingValueSubjectGap(expected)
  );
  const verified = await verifyBaziEngineeringBindingValueSubjectGap(workspaceRoot, ledger);
  assert.equal(verified.engineeringBindingsScoped, 7);
  assert.equal(verified.engineeringValueSubjectsObserved, 33);
  assert.equal(verified.valueSubjectsFreezeEligible, 0);
  assert.equal(verified.bindingsFrozen, 0);
});

test("raw gap JSON rejects BOM invalid UTF-8 and duplicate keys", () => {
  assert.throws(
    () => parseBaziEngineeringBindingValueSubjectGapJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    /LEDGER_BOM_FORBIDDEN|不得包含 UTF-8 BOM/u
  );
  assert.throws(
    () => parseBaziEngineeringBindingValueSubjectGapJsonBytes(Buffer.from([0xc3, 0x28])),
    /LEDGER_UTF8_INVALID|不是严格 UTF-8/u
  );
  assert.throws(
    () => parseBaziEngineeringBindingValueSubjectGapJsonBytes(
      Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"forged"}', "utf8")
    ),
    /LEDGER_DUPLICATE_KEY|含重复对象键/u
  );
});

test("scope is exactly seven existing engineering bindings and 33 unique candidate subjects", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  assert.deepEqual(ledger.currentBindingInventory.engineeringBindingIds, engineeringBindingIds);
  assert.deepEqual(ledger.engineeringBindings.map((entry) => entry.bindingId), engineeringBindingIds);
  assert.deepEqual(ledger.engineeringBindings.map((entry) => entry.valueSubjectCount), [8, 4, 4, 3, 4, 4, 6]);
  const subjectIds = ledger.engineeringBindings.flatMap((entry) =>
    entry.valueSubjects.map((candidate) => candidate.valueSubjectId)
  );
  assert.equal(subjectIds.length, 33);
  assert.equal(new Set(subjectIds).size, 33);
  assert.equal(ledger.scopeBoundary.historicalTextBindingsExcludedFromThisGate, 4);
  assert.equal(ledger.scopeBoundary.reviewGateBindingsExcludedFromThisGate, 1);
  assert.equal(ledger.scopeBoundary.pr10bTableModelsRepresentedInThisGate, 0);
  assert.equal(ledger.scopeBoundary.currentInventoryParallelBindingRegistrations, 0);
  assert.equal(ledger.scopeBoundary.formalLifecycleIntegrationAssessed, false);
  assert.equal(ledger.scopeBoundary.centralManifestResigningAssessed, false);
  assert.equal(ledger.scopeBoundary.repositoryMutationSetMechanicallyEstablished, false);
});

test("declared weights thresholds comparators and six scenarios remain exact observations", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  assert.deepEqual(
    subject(ledger, "bazi.engineering.weights.values.v1").repositoryProjection,
    { monthCommand: 4, visibleStem: 2, firstHiddenStem: 2, otherHiddenStem: 1 }
  );
  assert.deepEqual(
    subject(ledger, "bazi.engineering.thresholds.values-and-operators.v1").repositoryProjection,
    [
      { thresholdId: "veryWeakUpperExclusive", value: 0.25, operator: "<", resultBand: "very_weak" },
      { thresholdId: "weakUpperExclusive", value: 0.43, operator: "<", resultBand: "weak" },
      { thresholdId: "balancedUpperInclusive", value: 0.57, operator: "<=", resultBand: "balanced" },
      { thresholdId: "strongUpperInclusive", value: 0.75, operator: "<=", resultBand: "strong" }
    ]
  );
  assert.deepEqual(
    subject(ledger, "bazi.engineering.sensitivity.scenario-definitions.v1")
      .repositoryProjection.map((entry) => entry.id),
    [
      "baseline_current_candidate",
      "deduplicate_month_main",
      "equal_presence_deduplicated",
      "without_month_command_bonus",
      "without_visible_stems",
      "without_hidden_stems"
    ]
  );
});

test("factor inclusion and month duplication declarations are not promoted to consumed behavior", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  assert.deepEqual(
    subject(ledger, "bazi.engineering.factor-inclusion.declaration.v1").repositoryProjection,
    {
      includeDayVisibleStem: false,
      retainMonthCommandAndFirstHiddenStem: true,
      excludeUnreliableHour: true
    }
  );
  assert.equal(
    ledger.crossBindingGaps.declaredPolicyConsumption.factorInclusionNamedReferenceInScopedFactorSource,
    false
  );
  assert.equal(
    ledger.crossBindingGaps.declaredPolicyConsumption
      .monthMainDuplicationNamedReferenceInScopedFactorAndSensitivitySources,
    false
  );
  assert.equal(
    ledger.crossBindingGaps.declaredPolicyConsumption.dynamicOrAliasedDeclarationDataFlowAbsenceEstablished,
    false
  );
  assert.equal(
    ledger.crossBindingGaps.declaredPolicyConsumption.declaredValueToBehaviorEquivalenceMechanicallyEstablished,
    false
  );
  assert.equal(binding(ledger, "binding:policy:factor-inclusion").bindingFreezeEligible, false);
  assert.equal(binding(ledger, "binding:policy:month-duplication").bindingFreezeEligible, false);
});

test("includeHour consumers disagree only for hour_range and no decision is fabricated", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  const matrix = ledger.crossBindingGaps.includeHourConsumerMatrix;
  assert.deepEqual(matrix.conflictPrecisionValues, ["hour_range"]);
  const hourRange = matrix.rows.find((entry) => entry.timePrecision === "hour_range");
  assert.deepEqual(hourRange, {
    timePrecision: "hour_range",
    interactivePanelIncludesHour: true,
    reportIncludesHour: false,
    localAiIncludesHour: false,
    evidenceEnvelopeAllowsIncludedHour: false
  });
  assert.equal(matrix.hourRangeMappingFrozen, false);
  assert.equal(matrix.domainAndProductDecisionRequired, true);
});

test("legacy source refs evidence locators and upstream table values remain unbound", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  const crosswalk = ledger.crossBindingGaps.legacySourceRefCrosswalk;
  assert.deepEqual(crosswalk.factorSourceRefs.map((entry) => entry.id), [
    "dtt-strength", "smt-ten-gods", "smt-position"
  ]);
  assert.equal(crosswalk.exactStringIdMatches, 0);
  assert.deepEqual(crosswalk.semanticCrosswalkRecordsEstablishedByThisGate, []);
  assert.equal(crosswalk.repositoryWideSemanticCrosswalkInventoryAssessed, false);
  assert.equal(crosswalk.semanticEquivalenceMechanicallyEstablished, false);
  assert.deepEqual(ledger.crossBindingGaps.evidenceSubjectLocatorCoverage, {
    bindingEvidenceSubjects: 12,
    subjectsWithAlgorithmIds: 0,
    subjectsWithFieldPaths: 0,
    subjectsWithRuleProfilePaths: 0,
    valueSubjectIdsObservedInAssessedBindingEvidenceSubjectRegistry: 0,
    repositoryWideFormalEvidenceSubjectRegistrationAssessed: false,
    currentValueSubjectCoverageComplete: false
  });
  const upstream = ledger.crossBindingGaps.upstreamDependencyValueProvenance;
  assert.equal(upstream.dependency.packageName, "lunar-typescript");
  assert.equal(upstream.dependency.version, "1.8.6");
  assert.match(upstream.dependency.tarballIntegrity, /^sha512-/u);
  assert.equal(upstream.dependency.identityClass, "lockfile_dependency_metadata_only");
  assert.equal(upstream.dependency.installedPackageBytesVerified, false);
  assert.equal(upstream.dependency.embeddedTableBytesVerified, false);
  assert.equal(upstream.runtimeProducerExecutionObserved, false);
  assert.equal(upstream.tableValueDigestsBound, 0);
  assert.equal(upstream.tableSourceProvenanceRecordsBound, 0);
  assert.equal(upstream.tableContentTruthEstablished, false);
  assert.equal(upstream.tableRightsLegalConclusionEstablished, false);
});

test("stale expert packet is observed without silently re-signing it", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  const packet = ledger.crossBindingGaps.expertPacketArtifactClosure;
  assert.notEqual(packet.packetSavedSha256, packet.currentSha256);
  assert.equal(packet.artifactLockMatchesCurrent, false);
  assert.equal(packet.packetVerifierExpectedToPassCurrent, false);
  assert.equal(packet.packetResignedByThisGate, false);
  assert.equal(packet.usableForEngineeringValueFreeze, false);
  assert.equal(packet.usableForDomainExpertTruth, false);
});

test("truth rights runtime release authorization and schema-13 mutation boundaries remain separate and red", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  assert.deepEqual(ledger.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.deepEqual(ledger.observationBoundary, {
    directBasisHashAndParseUseSameReadBuffer: true,
    directSourceHashAndAstInspectionUseSameReadBuffer: true,
    downstreamVerifierReadsReuseDirectBuffers: false,
    nestedVerifierSameBufferTransitivityClaimed: false,
    stableExecutableSyntaxFragmentsObserved: true,
    generalControlFlowEquivalenceMechanicallyEstablished: false,
    generalDataFlowEquivalenceMechanicallyEstablished: false,
    runtimeExecutionObserved: false,
    endpointSnapshotOnly: true,
    crossFileAtomicSnapshot: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    intervalMutationExcluded: false,
    abaExcluded: false
  });
  for (const entry of ledger.engineeringBindings) {
    assert.equal(entry.valueSubjectCoverageComplete, false);
    assert.equal(entry.bindingFreezeEligible, false);
    assert.equal(entry.freezeEffect, "none");
    assert.equal(entry.valueSubjects.every((candidate) => candidate.valueProvenanceFrozen === false), true);
    assert.equal(
      entry.valueSubjects.every((candidate) =>
        candidate.syntaxProjectionMechanicallyObserved === true
        && candidate.generalControlFlowEquivalenceMechanicallyEstablished === false
        && candidate.generalDataFlowEquivalenceMechanicallyEstablished === false
        && candidate.runtimeExecutionObserved === false
      ),
      true
    );
  }
  assert.equal(ledger.gateSummary.formalSourceRightsRecords, 0);
  assert.equal(ledger.gateSummary.formalSourceCarrierRecords, 0);
  assert.equal(ledger.gateSummary.contentTruthEstablished, false);
  assert.equal(ledger.gateSummary.expertTruthEstablished, false);
  assert.equal(ledger.gateSummary.rightsLegalConclusionEstablished, false);
  assert.equal(ledger.gateSummary.browserRuntimeEvidenceEstablished, false);
  assert.equal(ledger.gateSummary.formalActivationAllowed, false);
  assert.equal(ledger.gateSummary.releaseReady, false);
});

test("freeze authority lifecycle or public authorization cannot be fabricated", async () => {
  const ledger = await readBaziEngineeringBindingValueSubjectGap(workspaceRoot);
  const mutations = [
    (value) => { value.engineeringBindings[0].valueSubjects[0].valueProvenanceFrozen = true; },
    (value) => { value.engineeringBindings[0].valueSubjectCoverageComplete = true; },
    (value) => { value.engineeringBindings[0].bindingFreezeEligible = true; },
    (value) => { value.engineeringBindings.push(clone(value.engineeringBindings[0])); },
    (value) => { value.scopeBoundary.formalLifecycleIntegrationAssessed = true; },
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.mutationEpochReceipt = 0; },
    (value) => { value.gateSummary.formalSourceRightsRecords = 1; },
    (value) => { value.gateSummary.releaseReady = true; },
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(ledger);
    mutate(candidate);
    await expectMismatch(candidate);
  }
});

test("source extraction rejects spread dynamic consumption and includeHour predicate drift", async () => {
  const sources = await loadSources();
  const observed = extractCurrentBaziEngineeringValueObservations(sources);
  assert.deepEqual(observed.factorWeights, {
    monthCommand: 4, visibleStem: 2, firstHiddenStem: 2, otherHiddenStem: 1
  });

  const spreadWeights = {
    ...sources,
    policy: sources.policy.replace("  monthCommand: 4,", "  ...{ monthCommand: 4 },")
  };
  assert.notEqual(spreadWeights.policy, sources.policy);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(spreadWeights),
    /禁止 spread|必须是普通属性/u
  );

  for (const injectedRead of [
    'void BAZI_STRENGTH_POLICY["factorInclusion"];',
    "const { factorInclusion } = BAZI_STRENGTH_POLICY;"
  ]) {
    const declarationConsumer = {
      ...sources,
      core: sources.core.replace(
        "export function collectBaziStrengthFactors",
        `${injectedRead}\nexport function collectBaziStrengthFactors`
      )
    };
    assert.notEqual(declarationConsumer.core, sources.core);
    assert.throws(
      () => extractCurrentBaziEngineeringValueObservations(declarationConsumer),
      /源码级消费/u
    );
  }

  const duplicationConsumer = {
    ...sources,
    sensitivity: sources.sensitivity.replace(
      "function findDuplicateMonthMain",
      'void BAZI_STRENGTH_POLICY["monthMainDuplication"];\nfunction findDuplicateMonthMain'
    )
  };
  assert.notEqual(duplicationConsumer.sensitivity, sources.sensitivity);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(duplicationConsumer),
    /源码级消费/u
  );

  const panelPredicateDrift = {
    ...sources,
    panel: sources.panel.replace(
      'const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";',
      'const includeHour = revision.input.timePrecision === "exact_minute" || revision.input.timePrecision === "exact_second";'
    )
  };
  assert.notEqual(panelPredicateDrift.panel, sources.panel);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(panelPredicateDrift),
    /timePrecision 谓词|比较对象|已分歧/u
  );

  const panelConsumerDetached = {
    ...sources,
    panel: sources.panel.replace(
      "() => interpretBaziChart(revision.facts, { includeHour }),",
      "() => interpretBaziChart(revision.facts, { includeHour: false }),"
    )
  };
  assert.notEqual(panelConsumerDetached.panel, sources.panel);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(panelConsumerDetached),
    /唯一 shorthand 参数/u
  );

  const panelConsumerDecoy = {
    ...sources,
    panel: sources.panel.replace(
      "return useMemo(\n    () => interpretBaziChart(revision.facts, { includeHour }),",
      "interpretBaziChart(revision.facts, { includeHour });\n  return useMemo(\n    () => interpretBaziChart(revision.facts, { includeHour: false }),"
    )
  };
  assert.notEqual(panelConsumerDecoy.panel, sources.panel);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(panelConsumerDecoy),
    /唯一 shorthand 参数/u
  );

  const commentedPredicateSpoof = {
    ...sources,
    panel: sources.panel
      .replace(
        'const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";',
        '// const includeHour = revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";\n  const includeHour = false;'
      )
      .replace(
        'return revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only";',
        '/* return revision.input.timePrecision !== "unknown_hour" && revision.input.timePrecision !== "date_only"; */\n  return false;'
      )
  };
  assert.notEqual(commentedPredicateSpoof.panel, sources.panel);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(commentedPredicateSpoof),
    /timePrecision 谓词/u
  );

  const formalLocatorAdded = {
    ...sources,
    knowledge: sources.knowledge.replace(
      "algorithmIds: Object.freeze([]),",
      'algorithmIds: Object.freeze(["bazi-strength-engine"]),'
    )
  };
  assert.notEqual(formalLocatorAdded.knowledge, sources.knowledge);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(formalLocatorAdded),
    /已出现正式 locator/u
  );

  const authorityBuilderPromoted = {
    ...sources,
    sensitivity: sources.sensitivity.replace(
      "    officialRuleCandidate: false,",
      "    officialRuleCandidate: true,"
    )
  };
  assert.notEqual(authorityBuilderPromoted.sensitivity, sources.sensitivity);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(authorityBuilderPromoted),
    /officialRuleCandidate 必须由 builder 直接写为 false/u
  );

  const authorityGuardMadeUnreachable = {
    ...sources,
    sensitivity: sources.sensitivity.replace(
      '    if (scenario.officialRuleCandidate !== false) throw new Error("敏感性场景不得自动成为正式规则");',
      '    if (false) { if (scenario.officialRuleCandidate !== false) throw new Error("敏感性场景不得自动成为正式规则"); }'
    )
  };
  assert.notEqual(authorityGuardMadeUnreachable.sensitivity, sources.sensitivity);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(authorityGuardMadeUnreachable),
    /scenario loop 直接失败关闭/u
  );


  const envelopeGuardMadeUnreachable = {
    ...sources,
    envelope: sources.envelope.replace(
      '  if (includeHour && !exactTime) {\n    throw new Error("只有精确到分或秒的 Revision 才能把时柱纳入解读证据 Envelope");\n  }',
      '  if (false) {\n    if (includeHour && !exactTime) {\n      throw new Error("只有精确到分或秒的 Revision 才能把时柱纳入解读证据 Envelope");\n    }\n  }'
    )
  };
  assert.notEqual(envelopeGuardMadeUnreachable.envelope, sources.envelope);
  assert.throws(
    () => extractCurrentBaziEngineeringValueObservations(envelopeGuardMadeUnreachable),
    /唯一 throw guard/u
  );
});
