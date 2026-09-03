import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  WESTERN_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
  buildCurrentWesternHighRiskExpressionPolicyDraft,
  canonicalPrettyStringifyWesternHighRiskExpressionPolicyDraft,
  computeWesternHighRiskExpressionPolicyDraftDigest,
  isVerifiedWesternHighRiskExpressionPolicyDraftResult,
  loadWesternHighRiskExpressionPolicyDraft,
  westernHighRiskExpressionPolicyDraftTestOnly
} from "./western-high-risk-expression-policy-draft-lib.mjs";

const WORKSPACE_ROOT = process.cwd();
const CLI_PATH = "scripts/verify-western-high-risk-expression-policy-draft.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.candidateDigest = computeWesternHighRiskExpressionPolicyDraftDigest(value);
  return value;
}

test("loads the persisted Western policy candidate with a private verified brand", async () => {
  const result = await loadWesternHighRiskExpressionPolicyDraft(WORKSPACE_ROOT);
  assert.equal(isVerifiedWesternHighRiskExpressionPolicyDraftResult(result), true);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.admissionGatesSatisfied, 0);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.bindingRequired, 28);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.engineeringLexicalEgressGateImplemented, true);
  assert.equal(result.formalHighRiskPolicyBound, false);
  assert.equal(result.lexicalCoverageComplete, false);
  assert.equal(result.semanticSafetyEstablished, false);
  assert.equal(result.browserRuntimeEvidenceEstablished, false);
  assert.equal(result.surfaceCount, 5);
  assert.equal(result.artifactBindingCount, 8);
  assert.equal(result.upstreamPrivateBrandCount, 1);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.releaseReady, false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(isVerifiedWesternHighRiskExpressionPolicyDraftResult({ ...result }), false);
  assert.equal(isVerifiedWesternHighRiskExpressionPolicyDraftResult(structuredClone(result)), false);
});

test("persisted raw identity and canonical materialization stay exact", async () => {
  const bytes = await readFile(WESTERN_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH);
  assert.equal(bytes.byteLength, 9_526);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "caf4b85e9ce72d0aaaec1b57e5a634b4acf7d376ef39ff6f02b9cf84875d1485"
  );
  const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  assert.equal(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    canonicalPrettyStringifyWesternHighRiskExpressionPolicyDraft(parsed)
  );
  assert.equal(parsed.candidateDigest, computeWesternHighRiskExpressionPolicyDraftDigest(parsed));
});

test("persisted candidate equals the expectation rebuilt from current fixed source endpoints", async () => {
  const persisted = JSON.parse(await readFile(
    WESTERN_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
    "utf8"
  ));
  const current = await buildCurrentWesternHighRiskExpressionPolicyDraft(WORKSPACE_ROOT);
  assert.deepEqual(persisted, current);
  assert.equal(current.policyBoundary.textGuardCallCount, 52);
  assert.equal(current.policyBoundary.templateGuardCallCount, 2);
  assert.deepEqual(current.policyBoundary.actionIds, [
    "pass_through", "neutralized", "failed_closed"
  ]);
});

test("all seven evidence accounts remain separated", async () => {
  const candidate = await buildCurrentWesternHighRiskExpressionPolicyDraft(WORKSPACE_ROOT);
  assert.deepEqual(candidate.evidenceAccounts.map((entry) => entry.account), [
    "engineering_evidence",
    "browser_runtime_evidence",
    "content_truth",
    "expert_truth",
    "rights_legal_judgment",
    "release_readiness",
    "public_release_authorization"
  ]);
  assert.deepEqual(candidate.evidenceAccounts.map((entry) => entry.establishedByThisCandidate), [
    true, false, false, false, false, false, false
  ]);
});

test("content expert rights admission release and public authority cannot be self-resigned true", async () => {
  const baseline = await buildCurrentWesternHighRiskExpressionPolicyDraft(WORKSPACE_ROOT);
  const mutations = [
    (value) => { value.authorityBoundary.contentTruthEstablished = true; },
    (value) => { value.authorityBoundary.expertTruthEstablished = true; },
    (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.authorityBoundary.formalAdmissionAuthorized = true; },
    (value) => { value.authorityBoundary.highRiskClaimsAuthorized = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => { value.gateSummary.admissionGatesSatisfied = 1; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.gateSummary.independentExpertReviewsVerified = 1; },
    (value) => { value.gateSummary.formalHighRiskPolicyBound = true; },
    (value) => { value.gateSummary.sourceBundleComplete = true; },
    (value) => { value.gateSummary.rightsBundleComplete = true; },
    (value) => { value.policyBoundary.lexicalCoverageComplete = true; },
    (value) => { value.policyBoundary.semanticSafetyEstablished = true; },
    (value) => { value.policyBoundary.formalHighRiskPolicyBound = true; },
    (value) => { value.policyBoundary.expertApproved = true; },
    (value) => { value.policyBoundary.currentKnownExternalReviewFeedbackRoutedThroughGate = false; },
    (value) => { value.evidenceAccounts[4].establishedByThisCandidate = true; },
    (value) => { value.policyBoundary.completeTextLeafInventoryClosed = true; },
    (value) => { value.policyBoundary.registeredCallGraphClosureEstablished = true; },
    (value) => { value.integrityBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.integrityBoundary.intervalMutationExcluded = true; },
    (value) => { value.integrityBoundary.signerIdentityEstablished = true; },
    (value) => { value.mutationBoundary.abaExcluded = true; },
    (value) => { value.mutationBoundary.mutationEpochReceipt = { epoch: 1 }; },
    (value) => { value.policyBoundary.textGuardCallCount = 999_999; },
    (value) => { value.productBoundary.centralRegistryIntegration = true; },
    (value) => { value.productBoundary.mainApplicationReachable = true; },
    (value) => { value.upstreamBoundary.releaseReady = true; },
    (value) => { value.upstreamBoundary.publicReleaseAuthorized = true; },
    (value) => { value.doesNotEstablish = []; },
    (value) => { value.unexpectedAuthority = { publicReleaseAuthorized: true }; },
    (value) => { value.productBoundary.targetSchema = 13; },
    (value) => { value.productBoundary.migrationId = "western-v1"; },
    (value) => { value.productBoundary.releaseIdentity = "legacy-v13"; }
  ];
  for (const mutate of mutations) {
    const forged = clone(baseline);
    mutate(forged);
    resign(forged);
    assert.throws(
      () => westernHighRiskExpressionPolicyDraftTestOnly.verifyCandidateObject(forged),
      { code: "AUTHORITY_PROMOTION_FORBIDDEN" }
    );
  }
});

test("policy and call-site inspection rejects missing categories, missing surfaces and direct bypasses", async () => {
  const snapshots = [];
  for (const binding of westernHighRiskExpressionPolicyDraftTestOnly.SOURCE_BINDINGS) {
    snapshots.push(await westernHighRiskExpressionPolicyDraftTestOnly.readStableWorkspaceFile(
      WORKSPACE_ROOT,
      binding.path
    ));
  }
  const categoryDrift = snapshots.map((snapshot) => ({ ...snapshot }));
  categoryDrift[1].text = categoryDrift[1].text.replaceAll(
    "financial_investment_gambling",
    "financial_investment_gambling_drift"
  );
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.inspectPolicyAndCallSites(categoryDrift),
    { code: "SOURCE_MARKER_MISSING" }
  );
  const surfaceDrift = snapshots.map((snapshot) => ({ ...snapshot }));
  surfaceDrift[2].text = surfaceDrift[2].text.replaceAll(
    "western.preview.dynamic-review-template-download",
    "western.preview.dynamic-review-template-download-drift"
  );
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.inspectPolicyAndCallSites(surfaceDrift),
    { code: "SOURCE_MARKER_MISSING" }
  );
  const bypass = snapshots.map((snapshot) => ({ ...snapshot }));
  bypass[2].text += "\nfunction forbidden(candidate) { node.textContent = candidate.directStatement; }\n";
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.inspectPolicyAndCallSites(bypass),
    { code: "KNOWN_EGRESS_BYPASS_PRESENT" }
  );
  const projectionBypass = snapshots.map((snapshot) => ({ ...snapshot }));
  projectionBypass[2].text = projectionBypass[2].text.replace(
    /setWesternHighRiskEgressText\(\s*contentBoundary,[\s\S]*?projection\.boundary\.note\s*\);/u,
    "contentBoundary.textContent = projection.boundary.note;"
  );
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.inspectPolicyAndCallSites(projectionBypass),
    { code: "KNOWN_EGRESS_BYPASS_PRESENT" }
  );
  const summaryBypass = snapshots.map((snapshot) => ({ ...snapshot }));
  summaryBypass[2].text = summaryBypass[2].text.replace(
    /setWesternHighRiskEgressText\(\s*description,[\s\S]*?value\s*\);/u,
    "description.append(value);"
  );
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.inspectPolicyAndCallSites(summaryBypass),
    { code: "KNOWN_EGRESS_BYPASS_PRESENT" }
  );
  const reorderedTemplateGate = snapshots.map((snapshot) => ({ ...snapshot }));
  reorderedTemplateGate[2].text = reorderedTemplateGate[2].text.replace(
    /(assertWesternHighRiskTemplateEgress\([\s\S]*?serializedTemplate\s*\);)(\s*)(startTextDownload\(\s*serializedTemplate,[\s\S]*?\);)/u,
    "$3$2$1"
  );
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.inspectPolicyAndCallSites(reorderedTemplateGate),
    { code: "TEMPLATE_GUARD_DOMINANCE_MISSING" }
  );
  const sideEffect = snapshots.map((snapshot) => ({ ...snapshot }));
  sideEffect[1].text += "\nvoid fetch;\n";
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.inspectPolicyAndCallSites(sideEffect),
    { code: "POLICY_SIDE_EFFECT_API_PRESENT" }
  );
});

test("candidate parser rejects noncanonical, duplicate-key and malformed materializations", async () => {
  const bytes = await readFile(WESTERN_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH);
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.parseCandidateBytes(
      Buffer.concat([bytes, Buffer.from("\n")]),
      "extra-newline"
    ),
    { code: "CANDIDATE_MATERIALIZATION_MISMATCH" }
  );
  const text = new TextDecoder().decode(bytes);
  const duplicate = text.replace(
    "{\n  \"activeAdmissionEffect\"",
    "{\n  \"activeAdmissionEffect\": \"none\",\n  \"activeAdmissionEffect\""
  );
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.parseCandidateBytes(
      Buffer.from(duplicate),
      "duplicate-key"
    ),
    { code: "CANDIDATE_MATERIALIZATION_MISMATCH" }
  );
  assert.throws(
    () => westernHighRiskExpressionPolicyDraftTestOnly.parseCandidateBytes(
      Buffer.from([0xff, 0xfe]),
      "bad-utf8"
    ),
    { code: "CANDIDATE_UTF8_FAILURE" }
  );
});

test("plain objects and cloned candidates never acquire the verified result brand", async () => {
  const candidate = await buildCurrentWesternHighRiskExpressionPolicyDraft(WORKSPACE_ROOT);
  assert.equal(isVerifiedWesternHighRiskExpressionPolicyDraftResult(candidate), false);
  assert.equal(isVerifiedWesternHighRiskExpressionPolicyDraftResult(clone(candidate)), false);
  assert.equal(isVerifiedWesternHighRiskExpressionPolicyDraftResult(Object.freeze({})), false);
});

test("CLI prints only the bounded mechanical result and rejects operands", () => {
  const cleanEnvironment = { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
  const pass = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    env: cleanEnvironment,
    encoding: "utf8"
  });
  assert.equal(pass.status, 0, pass.stderr);
  const result = JSON.parse(pass.stdout);
  assert.equal(result.engineeringLexicalEgressGateImplemented, true);
  assert.equal(result.formalHighRiskPolicyBound, false);
  assert.equal(result.semanticSafetyEstablished, false);
  assert.equal(result.browserRuntimeEvidenceEstablished, false);
  assert.equal(result.publicReleaseAuthorized, false);

  const operand = spawnSync(process.execPath, [CLI_PATH, "--write"], {
    cwd: WORKSPACE_ROOT,
    env: cleanEnvironment,
    encoding: "utf8"
  });
  assert.equal(operand.status, 2);
  assert.match(operand.stderr, /accepts no operands/u);
});

test("CLI rejects preload and module-path overrides", () => {
  for (const environmentName of ["NODE_OPTIONS", "NODE_PATH"]) {
    const environment = { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
    environment[environmentName] = environmentName === "NODE_OPTIONS"
      ? "--no-warnings"
      : "decoy";
    const result = spawnSync(process.execPath, [CLI_PATH], {
      cwd: WORKSPACE_ROOT,
      env: environment,
      encoding: "utf8"
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /overrides are forbidden/u);
  }
});

test("new verification sources do not read the restricted Web file or invoke Git", async () => {
  for (const relativePath of [
    "scripts/western-high-risk-expression-policy-draft-lib.mjs",
    "scripts/verify-western-high-risk-expression-policy-draft.mjs",
    "packages/western-astrology-rules-preview-draft/src/browser-app/high-risk-expression-egress-policy.ts",
    "packages/western-astrology-rules-preview-draft/src/high-risk-expression-egress-policy.test.ts"
  ]) {
    const source = await readFile(relativePath, "utf8");
    assert.doesNotMatch(source, /local-user-data-cleanup\.ts/u);
    assert.doesNotMatch(source, /\bgit(?:\.exe)?\b/iu);
  }
});
