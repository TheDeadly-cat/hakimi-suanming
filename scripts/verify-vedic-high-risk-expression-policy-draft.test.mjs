import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, symlink, link, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
  buildCurrentVedicHighRiskExpressionPolicyDraft,
  canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft,
  canonicalStringifyVedicHighRiskExpressionPolicyDraft,
  computeVedicHighRiskExpressionPolicyDraftDigest,
  parseVedicHighRiskExpressionPolicyDraftJsonBytes,
  readVedicHighRiskExpressionPolicyDraft,
  vedicHighRiskExpressionPolicyDraftTestOnly,
  verifyVedicHighRiskExpressionPolicyDraft
} from "./vedic-high-risk-expression-policy-draft-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-vedic-high-risk-expression-policy-draft.mjs");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.policyDigest = computeVedicHighRiskExpressionPolicyDraftDigest(value);
  return value;
}

function expectCode(code) {
  return (error) => error?.code === code;
}

async function makeTempRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-policy-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

async function materializePolicy(root, bytes) {
  const destination = path.join(root, ...VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return destination;
}

async function copyCurrentUpstreamClosure(root) {
  await mkdir(path.join(root, "content"), { recursive: true });
  await cp(
    path.join(workspaceRoot, "content", "system-admission"),
    path.join(root, "content", "system-admission"),
    { recursive: true }
  );
  await mkdir(path.join(root, "docs"), { recursive: true });
  await cp(
    path.join(workspaceRoot, "docs", "吠陀占星独立产品化ADR-0001-2026-08-26.md"),
    path.join(root, "docs", "吠陀占星独立产品化ADR-0001-2026-08-26.md")
  );
}

test("persisted policy draft is the current deterministic requirements-only child", async () => {
  const persisted = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  const built = await buildCurrentVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.equal(
    canonicalStringifyVedicHighRiskExpressionPolicyDraft(persisted),
    canonicalStringifyVedicHighRiskExpressionPolicyDraft(built)
  );
  const result = await verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, persisted);
  assert.equal(result.policyDigest, "bc1996b042e84214f86d35416c4589e3309a5654250e43c30688568a28ee9fb9");
  assert.equal(result.status, "requirements_only_engineering_candidate_not_admitted");
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.admissionGatesSatisfied, 0);
  assert.equal(result.highRiskPolicyGateSatisfied, false);
  assert.equal(result.publicReleaseAuthorized, false);
});

test("artifact materialization is canonical LF with no BOM", async () => {
  const bytes = await readFile(path.join(workspaceRoot, ...VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH.split("/")));
  assert.equal(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
  assert.equal(bytes.includes(Buffer.from("\r\n")), false);
  const parsed = parseVedicHighRiskExpressionPolicyDraftJsonBytes(bytes);
  assert.equal(bytes.toString("utf8"), canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft(parsed));
});

test("three upstream raw and semantic identities are exact", async () => {
  const policy = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.deepEqual(policy.upstreamClosure.productBoundaryAdr, {
    bytes: 4531,
    path: "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
    rawHashAndSemanticInspectionUseSameBuffer: true,
    semanticIdentity: {
      authorityStatus: "not-authoritative",
      boundaryId: "hakimi.vedic.independent-product-boundary/1.0.0",
      decisionStatus: "accepted-research-boundary",
      integrationStatus: "not-integrated",
      productStatus: "research-only",
      publicReleaseAuthorized: false,
      rereviewRequirementIds: [
        "own_input_fact_and_rule_drafts",
        "runtime_and_bundle_size_proposal",
        "three_layer_source_rights_ledger",
        "two_independent_real_expert_review_plan",
        "independent_storage_backup_recovery_and_rollback_design",
        "independent_browser_gate_and_release_evidence_design",
        "owner_scope_license_and_deployment_decision"
      ],
      semanticDigest: "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89"
    },
    sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
  });
  assert.deepEqual(policy.upstreamClosure.ruleContractRequirements, {
    bytes: 30734,
    ledgerDigest: "fbaad8625fc10d112ccf47f7c5aae358a49305fe2d560a08d02f506194c4156f",
    path: "content/system-admission/vedic-rule-contract-requirements.v1.json",
    rawHashAndSemanticInspectionUseSameBuffer: true,
    sha256: "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94",
    status: "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
  });
  assert.deepEqual(policy.upstreamClosure.realIndependentExpertReviewPlan, {
    bytes: 37131,
    path: "content/system-admission/vedic-real-independent-expert-review-plan.v1.json",
    planDigest: "2eb4dc9c037403e47f332cc105755bfb86aa8ad6dc0b95dbaf29e80d7bdfd1af",
    rawHashAndSemanticInspectionUseSameBuffer: true,
    sha256: "9bcbff519dd38d40f26dfba1ccabe1c2987700200cf3a7f6eb7bf68254d7cf89",
    status: "complete_verifiable_material_contract_for_two_vacant_real_independent_expert_seats_zero_expert_instances_review_not_started"
  });
});

test("seven upstream prohibited classes and conservative extensions are fixed", async () => {
  const policy = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.deepEqual(
    policy.policyMaterial.anchoredRequiredProhibitedClasses,
    [...vedicHighRiskExpressionPolicyDraftTestOnly.upstreamProhibitedClasses]
  );
  assert.equal(policy.policyMaterial.additionalConservativeClasses.length, 9);
  assert.equal(new Set(policy.policyMaterial.additionalConservativeClasses.map((entry) => entry.classId)).size, 9);
  assert.equal(policy.policyMaterial.requiredBlockers.length, 15);
  assert.equal(policy.policyMaterial.scenarios.length, 14);
  assert.equal(policy.policyMaterial.policyMaterialCoverageComplete, true);
  assert.equal(policy.policyMaterial.riskUniverseClosed, false);
  assert.equal(policy.policyMaterial.containsRuleBodies, false);
  assert.equal(policy.policyMaterial.containsInterpretationTemplates, false);
});

test("all authority, product, source-rights, expert and enforcement gates stay red", async () => {
  const policy = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  for (const [key, value] of Object.entries(policy.authorityBoundary)) {
    assert.equal(value, false, `authorityBoundary.${key}`);
  }
  assert.deepEqual(
    [policy.productBoundary.releaseIdentity, policy.productBoundary.targetSchema, policy.productBoundary.migrationId],
    [null, null, null]
  );
  assert.equal(policy.productBoundary.legacyV13Inherited, false);
  assert.equal(policy.productBoundary.schema13Inherited, false);
  assert.equal(policy.productBoundary.centralRegistryIntegration, "absent");
  assert.equal(policy.admissionProjection.highRiskPolicyEstablished, false);
  assert.equal(policy.sourceRightsBoundary.bindingFrozenVerified, 0);
  assert.equal(policy.sourceRightsBoundary.bindingRequiredCurrentScoped, 38);
  assert.equal(policy.sourceRightsBoundary.requirementsUniverseClosed, false);
  assert.equal(policy.expertBoundary.independentExpertReviewsVerified, 0);
  assert.equal(policy.expertBoundary.independentExpertsRequired, 2);
  for (const countKey of [
    "classifierInstances", "enforcementReceipts", "outputGeneratorInstances", "policyEvaluatorInstances",
    "productReportsObserved", "runtimeExecutionsObserved", "successReceipts"
  ]) assert.equal(policy.enforcementBoundary[countKey], 0, countKey);
  assert.equal(policy.enforcementBoundary.browserValidated, false);
  assert.equal(policy.enforcementBoundary.runtimeIntegrated, false);
  assert.equal(policy.enforcementBoundary.receiptIssued, false);
});

test("observation boundary does not claim epoch atomicity interval or ABA exclusion", async () => {
  const policy = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.equal(policy.observationBoundary.heldFileHandleReads, true);
  assert.equal(policy.observationBoundary.pathEndpointRevalidated, true);
  assert.equal(policy.observationBoundary.boundArtifactHashAndInspectionUseSameReadBuffer, true);
  assert.equal(policy.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(policy.observationBoundary.policyUpstreamsAtomicSnapshot, false);
  assert.equal(policy.observationBoundary.mutationEpochAvailable, false);
  assert.equal(policy.observationBoundary.mutationEpochReceipt, null);
  assert.equal(policy.observationBoundary.intervalMutationExcluded, false);
  assert.equal(policy.observationBoundary.abaExcluded, false);
});

test("digest catches unsigned semantic mutation", async () => {
  const policy = clone(await readVedicHighRiskExpressionPolicyDraft(workspaceRoot));
  policy.authorityBoundary.publicReleaseAuthorized = true;
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, policy),
    expectCode("POLICY_DIGEST_MISMATCH")
  );
});

test("self-resigned authority and enforcement promotions remain forbidden", async () => {
  const baseline = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  const attacks = [
    (value) => { value.authorityBoundary.policyAdmitted = true; },
    (value) => { value.authorityBoundary.highRiskClaimsAuthorized = true; },
    (value) => { value.authorityBoundary.domainAuthorityAuthorized = true; },
    (value) => { value.authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => { value.admissionProjection.highRiskPolicyEstablished = true; },
    (value) => { value.admissionProjection.highRiskPolicyGateSatisfied = true; },
    (value) => { value.admissionProjection.admissionGatesSatisfied = 1; },
    (value) => { value.enforcementBoundary.enforcementImplemented = true; },
    (value) => { value.enforcementBoundary.enforcementReceipts = 1; },
    (value) => { value.enforcementBoundary.browserValidated = true; },
    (value) => { value.enforcementBoundary.runtimeIntegrated = true; },
    (value) => { value.enforcementBoundary.receiptIssued = true; },
    (value) => { value.expertBoundary.independentExpertReviewsVerified = 1; },
    (value) => { value.sourceRightsBoundary.bindingFrozenVerified = 1; },
    (value) => { value.policyMaterial.riskUniverseClosed = true; },
    (value) => { value.policyMaterial.containsRuleBodies = true; },
    (value) => { value.policyMaterial.containsInterpretationTemplates = true; }
  ];
  for (const attack of attacks) {
    const candidate = clone(baseline);
    attack(candidate);
    resign(candidate);
    await assert.rejects(
      verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, candidate),
      expectCode("AUTHORITY_PROMOTION_FORBIDDEN")
    );
  }
});

test("self-resigned cross-system identity or unknown fields cannot join current closure", async () => {
  const baseline = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  const attacks = [
    (value) => { value.productBoundary.legacyV13Inherited = true; },
    (value) => { value.productBoundary.schema13Inherited = true; },
    (value) => { value.productBoundary.targetSchema = 13; },
    (value) => { value.productBoundary.releaseIdentity = "legacy-v13"; },
    (value) => { value.productBoundary.migrationId = "borrowed"; },
    (value) => { value.extraAuthority = { approved: true }; }
  ];
  for (const attack of attacks) {
    const candidate = clone(baseline);
    attack(candidate);
    resign(candidate);
    await assert.rejects(
      verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, candidate),
      (error) => ["AUTHORITY_PROMOTION_FORBIDDEN", "POLICY_CURRENT_EXPECTATION_MISMATCH"].includes(error?.code)
    );
  }
});

test("every anchored prohibited class is mandatory even after self-resigning", async () => {
  const baseline = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  for (let index = 0; index < baseline.policyMaterial.anchoredRequiredProhibitedClasses.length; index += 1) {
    const candidate = clone(baseline);
    candidate.policyMaterial.anchoredRequiredProhibitedClasses.splice(index, 1);
    resign(candidate);
    await assert.rejects(
      verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, candidate),
      expectCode("PROHIBITED_CLASS_SET_MISMATCH")
    );
  }
});

test("blocker deletion duplication or default allow fails closed", async () => {
  const baseline = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  const attacks = [
    (value) => { value.policyMaterial.requiredBlockers.pop(); },
    (value) => { value.policyMaterial.requiredBlockers[1] = value.policyMaterial.requiredBlockers[0]; },
    (value) => { value.decisionContract.defaultDisposition = "allow"; },
    (value) => { value.decisionContract.forbiddenResolutionMethods = []; },
    (value) => { value.decisionContract.allowedDispositions.push("approve"); }
  ];
  for (const attack of attacks) {
    const candidate = clone(baseline);
    attack(candidate);
    resign(candidate);
    await assert.rejects(verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, candidate));
  }
});

test("expert disagreement cannot be majority-voted averaged or model-decided", async () => {
  const policy = await readVedicHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.deepEqual(policy.decisionContract.forbiddenResolutionMethods, [
    "majority_vote",
    "opinion_average",
    "weighted_cross_system_score",
    "generative_model_winner_selection",
    "silent_default_or_fallback",
    "merge_disagreements_into_middle_claim"
  ]);
  assert.equal(policy.expertBoundary.modelMaySelectWinner, false);
  assert.equal(
    policy.decisionContract.disagreementTypes.find((entry) => entry.type === "high_risk_expression")?.disposition,
    "more_conservative_expression_or_no_release"
  );
  assert.equal(
    policy.decisionContract.disagreementTypes.find((entry) => entry.type === "engineering_error")?.disposition,
    "repair_and_require_two_new_independent_reviews"
  );
});

test("strict parser rejects duplicate and escaped duplicate keys", () => {
  for (const bytes of [
    Buffer.from('{"policyId":"a","policyId":"b"}', "utf8"),
    Buffer.from('{"policyId":"a","\\u0070olicyId":"b"}', "utf8"),
    Buffer.from('{"outer":{"x":1,"x":2}}', "utf8")
  ]) {
    assert.throws(() => parseVedicHighRiskExpressionPolicyDraftJsonBytes(bytes), expectCode("JSON_DUPLICATE_KEY"));
  }
});

test("strict parser rejects BOM invalid UTF-8 non-object roots and oversize", () => {
  assert.throws(
    () => parseVedicHighRiskExpressionPolicyDraftJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    expectCode("JSON_BOM_FORBIDDEN")
  );
  assert.throws(
    () => parseVedicHighRiskExpressionPolicyDraftJsonBytes(Buffer.from([0xc3, 0x28])),
    expectCode("JSON_UTF8_INVALID")
  );
  assert.throws(
    () => parseVedicHighRiskExpressionPolicyDraftJsonBytes(Buffer.from("[]", "utf8")),
    expectCode("JSON_INVALID")
  );
  assert.throws(
    () => parseVedicHighRiskExpressionPolicyDraftJsonBytes(Buffer.alloc(1_000_001, 0x20)),
    expectCode("JSON_TOO_LARGE")
  );
});

test("strict parser rejects Proxy and SharedArrayBuffer bytes where available", () => {
  const proxied = new Proxy(new Uint8Array(Buffer.from("{}", "utf8")), {});
  assert.throws(() => parseVedicHighRiskExpressionPolicyDraftJsonBytes(proxied), expectCode("JSON_INVALID"));
  if (typeof SharedArrayBuffer === "function") {
    const shared = new Uint8Array(new SharedArrayBuffer(2));
    shared.set(Buffer.from("{}", "utf8"));
    assert.throws(
      () => parseVedicHighRiskExpressionPolicyDraftJsonBytes(shared),
      expectCode("JSON_SHARED_BUFFER_FORBIDDEN")
    );
  }
});

test("strict parser uses typed-array intrinsic slots instead of subclass hooks", () => {
  class HostileBytes extends Uint8Array {
    get buffer() { throw new Error("subclass buffer getter invoked"); }
    [Symbol.iterator]() { throw new Error("subclass iterator invoked"); }
  }
  const bytes = new HostileBytes(Buffer.from("{}", "utf8"));
  assert.deepEqual(parseVedicHighRiskExpressionPolicyDraftJsonBytes(bytes), {});
  assert.throws(
    () => parseVedicHighRiskExpressionPolicyDraftJsonBytes(new Int8Array(Buffer.from("{}", "utf8"))),
    expectCode("JSON_INVALID")
  );
  const fake = Object.create(Uint8Array.prototype);
  assert.throws(() => parseVedicHighRiskExpressionPolicyDraftJsonBytes(fake), expectCode("JSON_INVALID"));
});

test("object API rejects Proxy accessor custom prototype sparse array and cycle", async () => {
  const baseline = clone(await readVedicHighRiskExpressionPolicyDraft(workspaceRoot));
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, new Proxy(baseline, {})),
    expectCode("NON_JSON_VALUE")
  );
  const accessor = clone(baseline);
  Object.defineProperty(accessor, "hidden", { enumerable: true, get() { throw new Error("getter invoked"); } });
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, accessor),
    expectCode("NON_JSON_VALUE")
  );
  const custom = Object.assign(Object.create({ inherited: true }), baseline);
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, custom),
    expectCode("NON_JSON_VALUE")
  );
  const symbolKeyed = clone(baseline);
  symbolKeyed[Symbol("hidden")] = true;
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, symbolKeyed),
    expectCode("NON_JSON_VALUE")
  );
  const sparse = clone(baseline);
  sparse.policyMaterial.scenarios = new Array(12);
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, sparse),
    expectCode("NON_JSON_VALUE")
  );
  const cyclic = clone(baseline);
  cyclic.loop = cyclic;
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, cyclic),
    expectCode("NON_JSON_VALUE")
  );
  const aliased = clone(baseline);
  aliased.policyMaterial.scenarios[1] = aliased.policyMaterial.scenarios[0];
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, aliased),
    expectCode("NON_JSON_VALUE")
  );
  const negativeZero = clone(baseline);
  negativeZero.admissionProjection.admissionGatesSatisfied = -0;
  await assert.rejects(
    verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, negativeZero),
    expectCode("NON_JSON_VALUE")
  );
  assert.throws(
    () => parseVedicHighRiskExpressionPolicyDraftJsonBytes(Buffer.from('{"value":-0}', "utf8")),
    expectCode("NON_JSON_VALUE")
  );
});

test("verified result is detached and deeply frozen", async () => {
  const input = clone(await readVedicHighRiskExpressionPolicyDraft(workspaceRoot));
  const result = await verifyVedicHighRiskExpressionPolicyDraft(workspaceRoot, input);
  input.status = "tampered_after_verify";
  assert.equal(result.policy.status, "requirements_only_engineering_candidate_not_admitted");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.policy), true);
  assert.equal(Object.isFrozen(result.policy.policyMaterial.scenarios), true);
});

test("fixed-path reader rejects non-canonical CRLF and trailing bytes", async (t) => {
  const bytes = await readFile(path.join(workspaceRoot, ...VEDIC_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH.split("/")));
  for (const variant of [
    Buffer.from(bytes.toString("utf8").replaceAll("\n", "\r\n"), "utf8"),
    Buffer.concat([bytes, Buffer.from("\n", "utf8")])
  ]) {
    const root = await makeTempRoot(t);
    await materializePolicy(root, variant);
    await assert.rejects(
      readVedicHighRiskExpressionPolicyDraft(root),
      expectCode("POLICY_MATERIALIZATION_MISMATCH")
    );
  }
});

test("fixed-path reader rejects a canonical self-resigned policy that is not current", async (t) => {
  const root = await makeTempRoot(t);
  await copyCurrentUpstreamClosure(root);
  const baseline = await readVedicHighRiskExpressionPolicyDraft(root);
  const attack = clone(baseline);
  attack.decisionContract.defaultDisposition = "allow";
  resign(attack);
  await materializePolicy(
    root,
    Buffer.from(canonicalPrettyStringifyVedicHighRiskExpressionPolicyDraft(attack), "utf8")
  );
  await assert.rejects(
    readVedicHighRiskExpressionPolicyDraft(root),
    expectCode("POLICY_CURRENT_EXPECTATION_MISMATCH")
  );
});

test("stable reader rejects unsafe paths and hardlinked endpoints", async (t) => {
  const root = await makeTempRoot(t);
  await assert.rejects(
    vedicHighRiskExpressionPolicyDraftTestOnly.readStableWorkspaceFile(root, "../outside", 100, {
      invalidCode: "INVALID", label: "test", missingCode: "MISSING"
    }),
    expectCode("UNSAFE_ARTIFACT_PATH")
  );
  const first = path.join(root, "first.json");
  const second = path.join(root, "second.json");
  await writeFile(first, "{}\n", "utf8");
  await link(first, second);
  await assert.rejects(
    vedicHighRiskExpressionPolicyDraftTestOnly.readStableWorkspaceFile(root, "first.json", 100, {
      invalidCode: "INVALID", label: "test", missingCode: "MISSING"
    }),
    expectCode("INVALID")
  );
});

test("stable reader rejects symbolic-link endpoints where supported", async (t) => {
  const root = await makeTempRoot(t);
  const target = path.join(root, "target.json");
  const alias = path.join(root, "alias.json");
  await writeFile(target, "{}\n", "utf8");
  try {
    await symlink(target, alias, "file");
  } catch (error) {
    t.skip(`symlink unavailable: ${error.code ?? error.message}`);
    return;
  }
  await assert.rejects(
    vedicHighRiskExpressionPolicyDraftTestOnly.readStableWorkspaceFile(root, "alias.json", 100, {
      invalidCode: "INVALID", label: "test", missingCode: "MISSING"
    }),
    expectCode("INVALID")
  );
});

test("CLI reports material verification without enforcement receipt or authority", () => {
  const output = execFileSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  const result = JSON.parse(output);
  assert.equal(result.requirementsMaterialVerified, true);
  assert.equal(result.policyEnforced, false);
  assert.equal(result.receiptIssued, false);
  assert.equal(result.highRiskPolicyGateSatisfied, false);
  assert.equal(result.admissionGatesSatisfied, 0);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.activeAdmissionEffect, "none");
});

test("CLI rejects caller-supplied paths", () => {
  const result = spawnSync(process.execPath, [cliPath, "decoy.json"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(result.status, 2);
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
  assert.equal(failure.requirementsMaterialVerified, false);
});
