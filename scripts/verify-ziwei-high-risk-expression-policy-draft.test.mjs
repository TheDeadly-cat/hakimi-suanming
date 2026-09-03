import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, link, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH,
  ZIWEI_HIGH_RISK_EXPRESSION_POLICY_SOURCE_RELATIVE_PATH,
  buildCurrentZiweiHighRiskExpressionPolicyDraft,
  canonicalPrettyStringifyZiweiHighRiskExpressionPolicyDraft,
  canonicalStringifyZiweiHighRiskExpressionPolicyDraft,
  computeZiweiHighRiskExpressionPolicyDraftDigest,
  parseZiweiHighRiskExpressionPolicyDraftJsonBytes,
  readZiweiHighRiskExpressionPolicyDraft,
  verifyZiweiHighRiskExpressionPolicyDraft,
  ziweiHighRiskExpressionPolicyDraftTestOnly
} from "./ziwei-high-risk-expression-policy-draft-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-ziwei-high-risk-expression-policy-draft.mjs"
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resign(value) {
  value.childDigest = computeZiweiHighRiskExpressionPolicyDraftDigest(value);
  return value;
}

function expectCode(code) {
  return (error) => error?.code === code;
}

function collectFalsePaths(value, prefix = [], result = []) {
  if (value === false) {
    result.push(prefix);
    return result;
  }
  if (!value || typeof value !== "object") return result;
  for (const [key, child] of Object.entries(value)) {
    collectFalsePaths(child, [...prefix, key], result);
  }
  return result;
}

function setAtPath(value, segments, replacement) {
  let cursor = value;
  for (let index = 0; index < segments.length - 1; index += 1) {
    cursor = cursor[segments[index]];
  }
  cursor[segments.at(-1)] = replacement;
}

async function makeTempRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-ziwei-policy-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

async function copyCurrentSource(root) {
  const destination = path.join(
    root,
    ...ZIWEI_HIGH_RISK_EXPRESSION_POLICY_SOURCE_RELATIVE_PATH.split("/")
  );
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(
    path.join(workspaceRoot, ...ZIWEI_HIGH_RISK_EXPRESSION_POLICY_SOURCE_RELATIVE_PATH.split("/")),
    destination
  );
  return destination;
}

async function materializeArtifact(root, bytes) {
  const destination = path.join(
    root,
    ...ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH.split("/")
  );
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return destination;
}

test("persisted child deterministically matches the current source-bound closure", async () => {
  const persisted = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  const built = await buildCurrentZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.equal(
    canonicalStringifyZiweiHighRiskExpressionPolicyDraft(persisted),
    canonicalStringifyZiweiHighRiskExpressionPolicyDraft(built)
  );
  const result = await verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, persisted);
  assert.equal(result.childDigest, "aff40f1d87c6575c9254877545e787b645a444090c18bcc976ae9c61deb8b0ac");
  assert.equal(result.engineeringSourceBindingVerified, true);
  assert.equal(result.riskCategoryCount, 8);
  assert.equal(result.surfaceCount, 16);
  assert.equal(result.activeAdmissionEffect, "none");
  assert.equal(result.admissionGatesSatisfied, 0);
  assert.equal(result.publicReleaseAuthorized, false);
});

test("artifact materialization is canonical LF with no BOM", async () => {
  const bytes = await readFile(path.join(
    workspaceRoot,
    ...ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH.split("/")
  ));
  assert.equal(bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
  assert.equal(bytes.includes(Buffer.from("\r\n")), false);
  const parsed = parseZiweiHighRiskExpressionPolicyDraftJsonBytes(bytes);
  assert.equal(
    bytes.toString("utf8"),
    canonicalPrettyStringifyZiweiHighRiskExpressionPolicyDraft(parsed)
  );
});

test("source bytes and policy canonical digest are fixed without executing the TS module", async () => {
  const artifact = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.deepEqual(artifact.sourceBinding, {
    bytes: 34053,
    path: "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-policy.ts",
    policySourceExecuted: false,
    rawHashAndSemanticInspectionUseSameReadBuffer: true,
    sha256: "7b10bb23fe0194b0dc564eec895d9dc1bb99658ad5fcc710f8edd14d1fdd8616",
    staticAstInspectionOnly: true,
    surfaceSourceBodiesIndependentlyRehashed: false
  });
  assert.equal(
    artifact.policyBinding.policyCanonicalDigest,
    "f2be6ba54f97522ceadc776a4db1f599c33d48dcfe7ba77a2a740aec1123b715"
  );
  assert.equal(artifact.policyBinding.policyCanonicalDigestAlgorithm, "SHA-256");
  assert.equal(artifact.policyBinding.policyCanonicalDigestRecomputedFromStaticAst, true);
});

test("the eight categories and sixteen surfaces are exact, ordered and digest-bound", async () => {
  const artifact = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.equal(artifact.policyBinding.riskCategoryCount, 8);
  assert.deepEqual(
    artifact.policyBinding.riskCategoryIds,
    [...ziweiHighRiskExpressionPolicyDraftTestOnly.expectedCategoryIds]
  );
  assert.equal(
    artifact.policyBinding.riskCategoryRegistryDigest,
    "79335d82a915816939d80c2632d6781cb197f01a8ae8266198766a8cfcd9e5c0"
  );
  assert.equal(artifact.policyBinding.surfaceCount, 16);
  assert.deepEqual(
    artifact.policyBinding.surfaceIds,
    [...ziweiHighRiskExpressionPolicyDraftTestOnly.expectedSurfaceIds]
  );
  assert.equal(
    artifact.policyBinding.surfaceRegistryDigest,
    "70982e4fc483878c167230bd8353eac3672819c4ff1ced9a0c98003a40b0859e"
  );
});

test("call-site semantic callgraph and pre-import integrity boundaries remain false", async () => {
  const artifact = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.equal(artifact.policyFailClosedBoundary.candidateCallSitesWiredToGate, false);
  assert.equal(artifact.policyFailClosedBoundary.semanticCoverageComplete, false);
  assert.equal(
    artifact.policyFailClosedBoundary.registeredSurfaceCallGraphClosureEstablished,
    false
  );
  assert.equal(artifact.policyFailClosedBoundary.surfaceCallerAuthenticityEstablished, false);
  assert.equal(artifact.policyFailClosedBoundary.preImportIntrinsicIntegrityEstablished, false);
  assert.equal(artifact.policyFailClosedBoundary.postImportIntrinsicHardeningOnly, true);
  assert.equal(artifact.admissionProjection.callgraphIntegrityEstablished, false);
  assert.equal(artifact.admissionProjection.highRiskPolicyEstablished, false);
  assert.equal(artifact.admissionProjection.highRiskPolicyGateSatisfied, false);
});

test("engineering evidence stays separately accounted from truth rights experts and release", async () => {
  const artifact = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  assert.equal(artifact.evidenceAccounts.engineeringSourceBindingEstablished, true);
  for (const key of [
    "browserRuntimeEvidenceVerified",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "publicReleaseAuthorized",
    "releaseReadinessEstablished",
    "rightsLegalConclusionEstablished"
  ]) {
    assert.equal(artifact.evidenceAccounts[key], false, key);
  }
  assert.equal(artifact.observationBoundary.artifactAndSourceAtomicSnapshot, false);
  assert.equal(artifact.observationBoundary.intervalMutationExcluded, false);
  assert.equal(artifact.observationBoundary.abaExcluded, false);
  assert.equal(artifact.observationBoundary.mutationEpochAvailable, false);
  assert.equal(artifact.systemIdentity.baziAuthorityInherited, false);
  assert.equal(artifact.systemIdentity.releaseIdentity, null);
  assert.equal(artifact.systemIdentity.targetSchema, null);
  assert.equal(artifact.systemIdentity.migrationId, null);
});

test("unsigned semantic mutation is rejected by the child digest", async () => {
  const artifact = clone(await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot));
  artifact.admissionProjection.candidateCallSitesWiredToGate = true;
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, artifact),
    expectCode("CHILD_DIGEST_MISMATCH")
  );
});

test("every self-resigned false-to-true promotion is rejected", async () => {
  const baseline = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  const falsePaths = collectFalsePaths(baseline);
  assert.ok(falsePaths.length >= 45, `expected broad false boundary, got ${falsePaths.length}`);
  for (const falsePath of falsePaths) {
    const candidate = clone(baseline);
    setAtPath(candidate, falsePath, true);
    resign(candidate);
    await assert.rejects(
      verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, candidate),
      (error) => [
        "AUTHORITY_PROMOTION_FORBIDDEN",
        "BOUNDARY_MISMATCH",
        "CHILD_CURRENT_EXPECTATION_MISMATCH",
        "SOURCE_IDENTITY_MISMATCH"
      ].includes(error?.code),
      `promotion unexpectedly accepted: ${falsePath.join(".")}`
    );
  }
});

test("self-resigned numeric admission and expert promotions remain forbidden", async () => {
  const baseline = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  const attacks = [
    (value) => { value.admissionProjection.admissionGatesSatisfied = 1; },
    (value) => { value.authorityBoundary.independentExpertReviewsVerified = 1; }
  ];
  for (const attack of attacks) {
    const candidate = clone(baseline);
    attack(candidate);
    resign(candidate);
    await assert.rejects(
      verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, candidate),
      expectCode("AUTHORITY_PROMOTION_FORBIDDEN")
    );
  }
});

test("self-resigned source policy category surface and system identity tampering is rejected", async () => {
  const baseline = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  const attacks = [
    (value) => { value.sourceBinding.path = "packages/decoy.ts"; },
    (value) => { value.sourceBinding.bytes += 1; },
    (value) => { value.sourceBinding.sha256 = "0".repeat(64); },
    (value) => { value.policyBinding.policyId = "hakimi.ziwei.decoy/0.1.0"; },
    (value) => { value.policyBinding.policyVersion = "0.1.1"; },
    (value) => { value.policyBinding.policyCanonicalDigest = "0".repeat(64); },
    (value) => { value.policyBinding.riskCategoryIds[0] = "decoy"; },
    (value) => { value.policyBinding.riskCategoryRegistryDigest = "0".repeat(64); },
    (value) => { value.policyBinding.surfaceIds[0] = "ziwei.decoy"; },
    (value) => { value.policyBinding.surfaceRegistryDigest = "0".repeat(64); },
    (value) => { value.systemIdentity.contractSystemId = "bazi"; },
    (value) => { value.systemIdentity.releaseIdentity = "legacy-v13"; },
    (value) => { value.systemIdentity.releaseIdentity = "isolated-ziwei-draft-no-main-schema"; },
    (value) => { value.systemIdentity.targetSchema = 13; },
    (value) => { value.extraAuthority = { approved: true }; }
  ];
  for (const attack of attacks) {
    const candidate = clone(baseline);
    attack(candidate);
    resign(candidate);
    await assert.rejects(
      verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, candidate),
      (error) => [
        "AUTHORITY_PROMOTION_FORBIDDEN",
        "SOURCE_IDENTITY_MISMATCH",
        "RISK_CATEGORY_SET_MISMATCH",
        "EGRESS_SURFACE_SET_MISMATCH",
        "CHILD_CURRENT_EXPECTATION_MISMATCH"
      ].includes(error?.code)
    );
  }
});

test("a candidate detached from missing or byte-mutated source fails closed", async (t) => {
  const baseline = await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot);
  const missingRoot = await makeTempRoot(t);
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(missingRoot, baseline),
    expectCode("SOURCE_MISSING")
  );

  const mutatedRoot = await makeTempRoot(t);
  const sourcePath = await copyCurrentSource(mutatedRoot);
  const bytes = await readFile(sourcePath);
  bytes[bytes.length - 2] ^= 1;
  await writeFile(sourcePath, bytes);
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(mutatedRoot, baseline),
    expectCode("SOURCE_IDENTITY_MISMATCH")
  );
});

test("strict parser rejects duplicate and escaped duplicate keys", () => {
  for (const bytes of [
    Buffer.from('{"childId":"a","childId":"b"}', "utf8"),
    Buffer.from('{"childId":"a","\\u0063hildId":"b"}', "utf8"),
    Buffer.from('{"outer":{"x":1,"x":2}}', "utf8")
  ]) {
    assert.throws(
      () => parseZiweiHighRiskExpressionPolicyDraftJsonBytes(bytes),
      expectCode("JSON_DUPLICATE_KEY")
    );
  }
});

test("strict parser rejects BOM invalid UTF-8 non-object roots and oversize", () => {
  assert.throws(
    () => parseZiweiHighRiskExpressionPolicyDraftJsonBytes(
      Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    expectCode("JSON_BOM_FORBIDDEN")
  );
  assert.throws(
    () => parseZiweiHighRiskExpressionPolicyDraftJsonBytes(Buffer.from([0xc3, 0x28])),
    expectCode("JSON_UTF8_INVALID")
  );
  assert.throws(
    () => parseZiweiHighRiskExpressionPolicyDraftJsonBytes(Buffer.from("[]", "utf8")),
    expectCode("JSON_INVALID")
  );
  assert.throws(
    () => parseZiweiHighRiskExpressionPolicyDraftJsonBytes(Buffer.alloc(500_001, 0x20)),
    expectCode("JSON_TOO_LARGE")
  );
});

test("object API rejects Proxy accessor custom prototype sparse arrays aliases and cycles", async () => {
  const baseline = clone(await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot));
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, new Proxy(baseline, {})),
    expectCode("NON_JSON_VALUE")
  );
  let getterCalls = 0;
  const accessor = clone(baseline);
  Object.defineProperty(accessor, "hidden", {
    enumerable: true,
    get() { getterCalls += 1; return true; }
  });
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, accessor),
    expectCode("NON_JSON_VALUE")
  );
  assert.equal(getterCalls, 0);
  const custom = Object.assign(Object.create({ inherited: true }), baseline);
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, custom),
    expectCode("NON_JSON_VALUE")
  );
  const sparse = clone(baseline);
  sparse.policyBinding.surfaceIds = new Array(16);
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, sparse),
    expectCode("NON_JSON_VALUE")
  );
  const aliased = clone(baseline);
  aliased.policyBinding.surfaceIds[1] = aliased.doesNotEstablish;
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, aliased),
    expectCode("NON_JSON_VALUE")
  );
  const cyclic = clone(baseline);
  cyclic.loop = cyclic;
  await assert.rejects(
    verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, cyclic),
    expectCode("NON_JSON_VALUE")
  );
});

test("verified result is detached and deeply frozen", async () => {
  const input = clone(await readZiweiHighRiskExpressionPolicyDraft(workspaceRoot));
  const result = await verifyZiweiHighRiskExpressionPolicyDraft(workspaceRoot, input);
  input.status = "tampered_after_verify";
  assert.equal(result.artifact.status, "source_bound_non_authoritative_engineering_child_not_admitted");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.artifact), true);
  assert.equal(Object.isFrozen(result.artifact.policyBinding.surfaceIds), true);
});

test("fixed reader rejects non-canonical CRLF and trailing bytes", async (t) => {
  const bytes = await readFile(path.join(
    workspaceRoot,
    ...ZIWEI_HIGH_RISK_EXPRESSION_POLICY_DRAFT_RELATIVE_PATH.split("/")
  ));
  for (const variant of [
    Buffer.from(bytes.toString("utf8").replaceAll("\n", "\r\n"), "utf8"),
    Buffer.concat([bytes, Buffer.from("\n", "utf8")])
  ]) {
    const root = await makeTempRoot(t);
    await copyCurrentSource(root);
    await materializeArtifact(root, variant);
    await assert.rejects(
      readZiweiHighRiskExpressionPolicyDraft(root),
      expectCode("CHILD_MATERIALIZATION_MISMATCH")
    );
  }
});

test("stable reader rejects unsafe paths and hardlinked endpoints", async (t) => {
  const root = await makeTempRoot(t);
  await assert.rejects(
    ziweiHighRiskExpressionPolicyDraftTestOnly.readStableWorkspaceFile(
      root,
      "../outside",
      100,
      { invalidCode: "INVALID", label: "test", missingCode: "MISSING" }
    ),
    expectCode("UNSAFE_ARTIFACT_PATH")
  );
  const first = path.join(root, "first.json");
  const second = path.join(root, "second.json");
  await writeFile(first, "{}\n", "utf8");
  await link(first, second);
  await assert.rejects(
    ziweiHighRiskExpressionPolicyDraftTestOnly.readStableWorkspaceFile(
      root,
      "first.json",
      100,
      { invalidCode: "INVALID", label: "test", missingCode: "MISSING" }
    ),
    expectCode("INVALID")
  );
});

test("CLI reports only the bounded engineering source-binding result", () => {
  const output = execFileSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  const result = JSON.parse(output);
  assert.equal(result.engineeringSourceBindingVerified, true);
  assert.equal(result.riskCategoryCount, 8);
  assert.equal(result.surfaceCount, 16);
  assert.equal(result.candidateCallSitesWiredToGate, false);
  assert.equal(result.semanticCoverageComplete, false);
  assert.equal(result.preImportIntrinsicIntegrityEstablished, false);
  assert.equal(result.highRiskPolicyEstablished, false);
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
  assert.equal(failure.engineeringSourceBindingVerified, false);
  assert.equal(failure.publicReleaseAuthorized, false);
});
