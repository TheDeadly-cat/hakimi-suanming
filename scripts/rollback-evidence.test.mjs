import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign as signSignature,
  verify as verifySignature
} from "node:crypto";
import { link, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  RollbackEvidenceVerificationError,
  assertIsolatedRollbackEvidenceRoots,
  buildRollbackVerificationFailure,
  computeRollbackSignedStatementDigest,
  computeRollbackEvidenceDigest,
  computeRollbackEvidenceId,
  validateRollbackActorRegistryForContract,
  validateRollbackDeploymentReceiptProjectionForContract,
  validateRollbackFormalReceiptProjectionForContract,
  validateRollbackPhaseReceiptProjectionForContract,
  verifyRollbackEvidence
} from "./rollback-evidence-lib.mjs";
import { compileRollbackEvidenceSchema } from "./rollback-evidence-schema.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  buildReleaseArtifactMutationBoundary,
  RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS
} from "./release-artifact-identity-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/rollback-evidence.schema.json"),
  "utf8"
));
const validator = compileRollbackEvidenceSchema(schema);
const definitions = schema.$defs;

function sampleString(node) {
  if (node.format === "date-time") return "2026-08-26T00:00:00.000Z";
  const pattern = node.pattern ?? "";
  if (pattern.includes("hrr1-")) return `hrr1-${"1".repeat(32)}`;
  if (pattern.includes("hrb1-")) return `hrb1-${"2".repeat(32)}`;
  if (pattern.includes("hre1-")) return `hre1-${"3".repeat(32)}`;
  if (pattern.includes("{64}")) return "a".repeat(64);
  if (pattern.includes("{12}")) return "b".repeat(12);
  if (pattern.startsWith("^https://")) return "https://rollback.example.test";
  if (pattern.includes("[a-z0-9._-]")) return "sample";
  return "sample";
}

function sampleFromSchema(node, variant = 0) {
  if (node.$ref) {
    const name = node.$ref.slice("#/$defs/".length);
    return sampleFromSchema(definitions[name], variant);
  }
  if (node.anyOf) {
    const nullable = node.anyOf.find((option) => option.type === "null");
    return nullable ? null : sampleFromSchema(node.anyOf[0], variant);
  }
  if (Object.hasOwn(node, "const")) return structuredClone(node.const);
  if (node.enum) return structuredClone(node.enum[variant % node.enum.length]);
  if (Array.isArray(node.type)) {
    if (node.type.includes("null")) return null;
    return sampleFromSchema({ ...node, type: node.type[0] }, variant);
  }
  if (node.type === "object") {
    return Object.fromEntries(
      Object.entries(node.properties).map(([key, child]) => [key, sampleFromSchema(child, variant)])
    );
  }
  if (node.type === "array") {
    const length = node.minItems ?? 0;
    return Array.from({ length }, (_, index) => sampleFromSchema(node.items, index));
  }
  if (node.type === "string") return sampleString(node);
  if (node.type === "integer" || node.type === "number") return Math.max(node.minimum ?? 0, 1);
  if (node.type === "boolean") return false;
  if (node.type === "null") return null;
  throw new Error(`Unsupported test schema node: ${JSON.stringify(node)}`);
}

async function currentPolicyBindings(root = workspaceRoot) {
  const rollbackPolicy = JSON.parse(await readFile(
    path.join(root, "docs/release/rollback-evidence-policy.v1.json"),
    "utf8"
  ));
  return Promise.all(rollbackPolicy.requiredPolicyBindings.map(async ({ role, path: policyPath }) => {
    const bytes = await readFile(path.join(root, policyPath));
    return { policyId: role, path: policyPath, sha256: sha256(bytes) };
  }));
}

async function buildSchemaValidCurrentPolicyEvidence({
  root = workspaceRoot,
  origin = "https://rollback.example.test"
} = {}) {
  const document = sampleFromSchema(schema);
  document.runId = `hrr1-${"1".repeat(32)}`;
  document.scope.origin = origin;
  document.policyBindings = await currentPolicyBindings(root);
  document.receipts.browsers[0].projectName = "msedge";
  document.receipts.browsers[0].runtimeProduct = "Edg/140.0.0.0";
  document.receipts.browsers[0].receiptId = "browser-msedge";
  document.receipts.browsers[1].projectName = "chrome";
  document.receipts.browsers[1].runtimeProduct = "Chrome/140.0.0.0";
  document.receipts.browsers[1].receiptId = "browser-chrome";
  document.failure = null;
  document.rollbackEvidenceId = computeRollbackEvidenceId(document);
  document.evidenceDigest = computeRollbackEvidenceDigest(document);
  validator.assert(document);
  return document;
}

function normalizedDeploymentExpectedIdentity(identity) {
  return {
    descriptor: identity.descriptor,
    evidenceId: identity.releaseEvidence.evidenceId,
    buildVersion: identity.buildVersion,
    manifestDigest: identity.manifestDigest,
    artifactSetDigest: identity.artifactSetDigest,
    components: identity.components
  };
}

function deploymentReceiptContractFixture() {
  const phaseId = "candidate";
  const runId = `hrr1-${"4".repeat(32)}`;
  const origin = "https://staging.hakimi-bazi.cn";
  const provider = "fixture-host";
  const expectedIdentity = sampleFromSchema(definitions.artifactIdentity);
  expectedIdentity.identityLock.lockDigest = "d".repeat(64);
  const envelope = {
    schemaVersion: 1,
    receiptType: "deployment_action",
    receiptId: "candidate-deployment-receipt",
    runId,
    phaseId,
    status: "passed",
    provider,
    deploymentId: "active-deployment-candidate",
    startedAt: "2026-08-26T00:01:00.000Z",
    completedAt: "2026-08-26T00:01:30.000Z",
    origin,
    artifactLockDigest: expectedIdentity.identityLock.lockDigest,
    action: "deploy_candidate",
    expectedIdentity: normalizedDeploymentExpectedIdentity(expectedIdentity),
    errors: []
  };
  const binding = {
    schemaVersion: envelope.schemaVersion,
    receiptType: envelope.receiptType,
    receiptId: envelope.receiptId,
    runId: envelope.runId,
    phaseId: envelope.phaseId,
    status: envelope.status,
    provider: envelope.provider,
    deploymentId: envelope.deploymentId,
    startedAt: envelope.startedAt,
    completedAt: envelope.completedAt,
    origin: envelope.origin,
    artifactLockDigest: envelope.artifactLockDigest,
    path: "receipts/candidate-deployment.json",
    size: 512,
    sha256: "e".repeat(64)
  };
  return {
    envelope,
    binding,
    phaseId,
    expectedIdentity,
    document: { runId, scope: { origin } },
    hostingPolicy: { deploymentPlatform: provider }
  };
}

function formalReceiptContractFixture(receiptCount) {
  const identity = sampleFromSchema(definitions.artifactIdentity);
  identity.releaseEvidence.path = "test-results/rollback-fixture/release-evidence.json";
  const mutationBoundary = buildReleaseArtifactMutationBoundary({
    coveredReceiptIds: RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS,
    endpointSnapshotsMatched: true
  });
  const releaseEvidence = {
    generatedAt: "2026-08-26T00:00:00.000Z",
    release: { manifestVersion: 1 },
    artifacts: { count: 3, mutationBoundary },
    testReceipts: Array.from({ length: receiptCount }, (_, index) => ({
      receiptId: `fixture-receipt-${index}`
    }))
  };
  const lockResult = {
    lockPath: identity.identityLock.path,
    lockFileSha256: identity.identityLock.sha256,
    lock: { lockDigest: identity.identityLock.lockDigest },
    artifactSetDigest: identity.artifactSetDigest
  };
  const receipt = {
    schemaVersion: 1,
    receiptType: "formal_release_evidence_verification",
    receiptId: `formal-${identity.releaseEvidence.evidenceId}`,
    summaryType: "formal_release_evidence_verification_v1",
    verificationKind: "formal-current-source-and-artifact",
    releaseEvidenceId: identity.releaseEvidence.evidenceId,
    status: "passed",
    verifiedAt: "2026-08-26T00:01:00.000Z",
    evidenceId: identity.releaseEvidence.evidenceId,
    releaseEvidence: {
      path: identity.releaseEvidence.path,
      sha256: identity.releaseEvidence.sha256
    },
    release: {
      descriptor: identity.descriptor,
      manifestVersion: releaseEvidence.release.manifestVersion,
      manifestDigest: identity.manifestDigest,
      buildVersion: identity.buildVersion
    },
    artifacts: {
      root: identity.artifactRoot,
      count: releaseEvidence.artifacts.count,
      artifactSetDigest: identity.artifactSetDigest,
      identityLock: {
        path: lockResult.lockPath,
        sha256: lockResult.lockFileSha256,
        lockDigest: lockResult.lock.lockDigest,
        artifactSetDigest: lockResult.artifactSetDigest
      },
      mutationBoundary
    },
    receiptCount,
    gates: Object.fromEntries([
      "sourceTreeClean", "evidenceIdBound", "defaultReleaseDescriptorMatched",
      "requiredReceiptsPresent", "allRecordedReceiptsPassed",
      "policyReceiptSetMatched", "recordedReceiptSetMatched",
      "policyReceiptCommandsMatched", "browserResultSummariesMatched",
      "artifactIdentityStable", "requiredArtifactComponentsPresent",
      "engineeringGatePassed"
    ].map((key) => [key, true])),
    formalReleaseEvidenceVerified: true,
    claims: {
      engineeringEvidenceOnly: true,
      sourceAndArtifactCurrentVerified: true,
      codeSignature: false,
      browserRuntimeBeyondBoundReceiptsVerified: false,
      publicReleaseAuthorized: false
    }
  };
  const binding = Object.fromEntries([
    "schemaVersion", "receiptType", "receiptId", "releaseEvidenceId", "status", "verifiedAt"
  ].map((key) => [key, receipt[key]]));
  return { receipt, binding, identity, releaseEvidence, lockResult, cwd: workspaceRoot };
}

function phaseReceiptContractFixture(
  phaseId = "baseline",
  previousEvidenceDigest = phaseId === "baseline" ? null : "9".repeat(64)
) {
  const runId = `hrr1-${"4".repeat(32)}`;
  const origin = "https://staging.hakimi-bazi.cn";
  const expectedIdentity = sampleFromSchema(definitions.artifactIdentity);
  const phaseIndex = ["baseline", "candidate", "rollbackObserved"].indexOf(phaseId);
  assert.notEqual(phaseIndex, -1);
  const minute = String(phaseIndex * 2).padStart(2, "0");
  const startedAt = `2026-08-26T00:${minute}:00.000Z`;
  const completedAt = `2026-08-26T00:${minute}:30.000Z`;
  const runtimeObservation = {
    observedAt: completedAt,
    origin,
    online: true,
    coldStart: true,
    applicationShellSha256: expectedIdentity.components.applicationShell.sha256,
    documentBuildVersion: expectedIdentity.buildVersion,
    documentEvidenceId: expectedIdentity.releaseEvidence.evidenceId,
    manifestDigest: expectedIdentity.manifestDigest,
    controllerPresent: true,
    controllerScriptUrl: `${origin}/sw.js`,
    controllerScriptSha256: expectedIdentity.components.serviceWorker.sha256,
    controllerBuildVersion: expectedIdentity.buildVersion,
    activeBuildVersion: expectedIdentity.buildVersion,
    waitingBuildVersion: null,
    installingBuildVersion: null,
    registrationScope: `${origin}/`,
    cacheGeneration: `hakimi-shell-${expectedIdentity.buildVersion}`
  };
  const receiptDigests = {
    host: "1".repeat(64),
    browsers: {
      msedge: "2".repeat(64),
      chrome: "3".repeat(64)
    },
    deployment: phaseId === "baseline" ? null : "4".repeat(64)
  };
  const phase = {
    phaseId,
    status: "passed",
    startedAt,
    completedAt,
    durationMs: 30_000,
    runtimeObservation: structuredClone(runtimeObservation),
    receiptBinding: {
      path: `receipts/${phaseId}-phase.json`,
      size: 768,
      sha256: "5".repeat(64)
    },
    failureCode: null,
    evidenceDigest: "0".repeat(64)
  };
  const envelope = {
    schemaVersion: 1,
    receiptType: "rollback_phase_execution_v1",
    runId,
    phaseId,
    status: "passed",
    startedAt,
    completedAt,
    durationMs: phase.durationMs,
    runtimeObservation: structuredClone(runtimeObservation),
    hostReceiptSha256: receiptDigests.host,
    browserReceiptSha256: structuredClone(receiptDigests.browsers),
    deploymentReceiptSha256: receiptDigests.deployment,
    previousPhaseEvidenceDigest: previousEvidenceDigest,
    failureCode: null,
    evidenceDigest: "0".repeat(64)
  };
  const unsigned = structuredClone(envelope);
  delete unsigned.evidenceDigest;
  const evidenceDigest = sha256(canonicalJson(unsigned));
  envelope.evidenceDigest = evidenceDigest;
  phase.evidenceDigest = evidenceDigest;
  return {
    phase,
    envelope,
    phaseId,
    expectedIdentity,
    runId,
    origin,
    receiptDigests,
    previousEvidenceDigest
  };
}

function assertRecursivelyFrozen(value) {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertRecursivelyFrozen(child);
}

function rollbackError(code) {
  return (error) => error instanceof RollbackEvidenceVerificationError
    && error.code === code;
}

async function copyWorkspaceFile(targetRoot, relativePath) {
  const target = path.join(targetRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await readFile(path.join(workspaceRoot, relativePath)), { flag: "wx" });
}

async function createSelectedPolicyWorkspace() {
  const targetRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-rollback-admission-"));
  for (const relativePath of [
    "docs/release/release-evidence.schema.json",
    "docs/release/rollback-evidence.schema.json",
    "docs/release/rollback-evidence-policy.v1.json",
    "docs/release/rollback-actor-trust-registry.v1.json",
    "docs/release/web-v1-release-decisions.json",
    "docs/release/web-v1-release-and-rollback-runbook.md"
  ]) await copyWorkspaceFile(targetRoot, relativePath);
  const origin = "https://staging.hakimi-bazi.cn";
  const hostingPolicy = JSON.parse(await readFile(
    path.join(workspaceRoot, "docs/security/hosting-security-policy.json"),
    "utf8"
  ));
  hostingPolicy.deploymentPlatform = "fixture-host";
  hostingPolicy.canonicalOrigin = origin;
  hostingPolicy.redirectRules = ["/", "/sw.js", "/release-evidence.json", "/settings/data"]
    .map((pathname) => ({
      from: `http://staging.hakimi-bazi.cn${pathname}`,
      status: 308,
      to: `${origin}${pathname}`
    }));
  const hostingPath = path.join(targetRoot, "docs/security/hosting-security-policy.json");
  await mkdir(path.dirname(hostingPath), { recursive: true });
  await writeFile(hostingPath, `${JSON.stringify(hostingPolicy, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  return { targetRoot, origin };
}

function trustedActorRegistry(publicKeys) {
  const roles = ["operator", "acceptor", "data_owner_approver"];
  return {
    schemaVersion: 1,
    registryType: "rollback_actor_trust_registry",
    registryId: "hakimi.web-v1.rollback-actors/v1",
    status: "configured_trusted_actors",
    actors: roles.map((role, index) => ({
      actorId: `actor.${role}`,
      roles: [role],
      identityAuthority: "private.identity.authority.v1",
      status: "trusted",
      realIdentityVerified: true,
      keys: [{
        keyId: `key.${role}`,
        algorithm: "ed25519",
        status: "active",
        publicKeySpkiBase64: publicKeys[index]
          .export({ format: "der", type: "spki" })
          .toString("base64"),
        validFrom: "2026-08-26T00:00:00.000Z",
        validUntil: null
      }]
    })),
    gateSummary: {
      trustedOperators: 1,
      trustedAcceptors: 1,
      realIdentityRecordsBound: 3,
      rollbackAcceptanceAuthorized: true
    },
    claims: {
      engineeringRegistryOnly: true,
      realIdentityVerified: true,
      realIndependenceVerified: true,
      publicDeploymentAuthorized: false,
      releaseReady: false
    }
  };
}

async function createIsolatedRootFixture() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-rollback-roots-"));
  const baselineArtifactRoot = path.join(workspace, "baseline");
  const candidateArtifactRoot = path.join(workspace, "candidate");
  const receiptDirectory = path.join(workspace, "receipts");
  const privateDirectory = path.join(workspace, "private");
  await Promise.all([
    mkdir(baselineArtifactRoot),
    mkdir(candidateArtifactRoot),
    mkdir(receiptDirectory),
    mkdir(privateDirectory)
  ]);
  const input = path.join(privateDirectory, "rollback-evidence.json");
  await writeFile(input, "{}\n", { encoding: "utf8", flag: "wx" });
  await writeFile(`${input}.sha256`, `${"0".repeat(64)}  rollback-evidence.json\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  return {
    workspace,
    input,
    baselineArtifactRoot,
    candidateArtifactRoot,
    receiptDirectory,
    privateDirectory
  };
}

test("checked rollback schema compiles and closes claims and unknown fields", async () => {
  const document = await buildSchemaValidCurrentPolicyEvidence();
  assert.doesNotThrow(() => validator.assert(document));

  const escalated = structuredClone(document);
  escalated.claims.publicReleaseAuthorized = true;
  assert.throws(() => validator.assert(escalated), /validation failed/u);

  const unknown = structuredClone(document);
  unknown.unreviewed = true;
  assert.throws(() => validator.assert(unknown), /validation failed/u);
});

test("rollback id and digest are canonical, deterministic, and tamper-sensitive", async () => {
  const document = await buildSchemaValidCurrentPolicyEvidence();
  assert.equal(document.rollbackEvidenceId, computeRollbackEvidenceId(document));
  assert.equal(document.evidenceDigest, computeRollbackEvidenceDigest(document));

  const formattingOnly = JSON.parse(JSON.stringify(document, null, 4));
  assert.equal(computeRollbackEvidenceId(formattingOnly), document.rollbackEvidenceId);
  assert.equal(computeRollbackEvidenceDigest(formattingOnly), document.evidenceDigest);

  const tampered = structuredClone(document);
  tampered.scope.scopeId = "tampered-scope";
  assert.notEqual(computeRollbackEvidenceId(tampered), document.rollbackEvidenceId);
  assert.notEqual(computeRollbackEvidenceDigest(tampered), document.evidenceDigest);
});

test("rollback attestation signature covers actor identity, signedAt, and every semantic envelope field", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const actorId = "actor.operator";
  const envelope = {
    schemaVersion: 1,
    recordType: "rollback_signature_attestation_v1",
    attestationId: "attestation.operator",
    attestationType: "detached_signature",
    subjectId: actorId,
    keyId: "key.operator",
    signatureAlgorithm: "ed25519",
    signedAt: "2026-08-26T01:00:00.000Z",
    payloadDigest: "a".repeat(64)
  };
  const statementDigest = computeRollbackSignedStatementDigest(envelope, actorId);
  const signature = signSignature(null, Buffer.from(statementDigest, "hex"), privateKey);
  assert.equal(
    verifySignature(null, Buffer.from(statementDigest, "hex"), publicKey, signature),
    true
  );

  const mutations = [
    ["schemaVersion", 2],
    ["recordType", "rollback_signature_attestation_v2"],
    ["attestationId", "attestation.operator.changed"],
    ["attestationType", "signed_external_attestation"],
    ["subjectId", "actor.operator.changed"],
    ["keyId", "key.operator.changed"],
    ["signatureAlgorithm", "ed25519-changed"],
    ["signedAt", "2026-08-26T01:00:01.000Z"],
    ["payloadDigest", "b".repeat(64)]
  ];
  for (const [field, value] of mutations) {
    const tampered = { ...envelope, [field]: value };
    const tamperedDigest = computeRollbackSignedStatementDigest(tampered, actorId);
    assert.notEqual(tamperedDigest, statementDigest, String(field));
    assert.equal(
      verifySignature(null, Buffer.from(tamperedDigest, "hex"), publicKey, signature),
      false,
      String(field)
    );
  }
  const changedActorDigest = computeRollbackSignedStatementDigest(envelope, "actor.operator.changed");
  assert.notEqual(changedActorDigest, statementDigest);
  assert.equal(
    verifySignature(null, Buffer.from(changedActorDigest, "hex"), publicKey, signature),
    false
  );
  const legacyPayloadOnlySignature = signSignature(
    null,
    Buffer.from(envelope.payloadDigest, "hex"),
    privateKey
  );
  assert.equal(
    verifySignature(null, Buffer.from(statementDigest, "hex"), publicKey, legacyPayloadOnlySignature),
    false
  );
});

test("rollback actor registry fingerprints canonical Ed25519 SPKI across actor aliases", () => {
  const keyPairs = Array.from({ length: 3 }, () => generateKeyPairSync("ed25519"));
  const registry = trustedActorRegistry(keyPairs.map(({ publicKey }) => publicKey));
  assert.equal(validateRollbackActorRegistryForContract(registry).actors.size, 3);

  const reused = trustedActorRegistry([
    keyPairs[0].publicKey,
    keyPairs[0].publicKey,
    keyPairs[2].publicKey
  ]);
  assert.throws(
    () => validateRollbackActorRegistryForContract(reused),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "ACTOR_PUBLIC_KEY_REUSED"
  );
});

test("rollback evidence roots require four real sibling domains with private input containment", async () => {
  const fixture = await createIsolatedRootFixture();
  await assert.doesNotReject(() => assertIsolatedRollbackEvidenceRoots(fixture));

  await assert.rejects(
    () => assertIsolatedRollbackEvidenceRoots({
      ...fixture,
      candidateArtifactRoot: fixture.baselineArtifactRoot
    }),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "EVIDENCE_ROOTS_OVERLAP"
  );

  const nestedCandidate = path.join(fixture.baselineArtifactRoot, "nested-candidate");
  await mkdir(nestedCandidate);
  await assert.rejects(
    () => assertIsolatedRollbackEvidenceRoots({
      ...fixture,
      candidateArtifactRoot: nestedCandidate
    }),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "EVIDENCE_ROOTS_OVERLAP"
  );

  const outsideInput = path.join(fixture.receiptDirectory, "rollback-evidence.json");
  await writeFile(outsideInput, "{}\n", { encoding: "utf8", flag: "wx" });
  await writeFile(`${outsideInput}.sha256`, `${"0".repeat(64)}  rollback-evidence.json\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  await assert.rejects(
    () => assertIsolatedRollbackEvidenceRoots({ ...fixture, input: outsideInput }),
    /escapes its required root/u
  );
});

test("rollback evidence roots reject a lexical workspace child that traverses a junction", async (t) => {
  const fixture = await createIsolatedRootFixture();
  const outside = await mkdtemp(path.join(os.tmpdir(), "hakimi-rollback-roots-outside-"));
  const outsideBaseline = path.join(outside, "baseline");
  await mkdir(outsideBaseline);
  const alias = path.join(fixture.workspace, "aliased-parent");
  try {
    await symlink(outside, alias, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error
      && ["EPERM", "EACCES", "ENOTSUP"].includes(String(error.code))) {
      t.skip(`junction/symlink creation is unavailable: ${String(error.code)}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => assertIsolatedRollbackEvidenceRoots({
      ...fixture,
      baselineArtifactRoot: path.join(alias, "baseline")
    }),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "EVIDENCE_ROOT_ANCESTOR_ALIAS"
  );
});

test("rollback evidence roots reject hard-linked regular files anywhere in the four trees", async (t) => {
  const fixture = await createIsolatedRootFixture();
  const receiptParent = path.join(fixture.receiptDirectory, "nested", "deep");
  const aliasParent = path.join(fixture.privateDirectory, "nested", "deep");
  await Promise.all([
    mkdir(receiptParent, { recursive: true }),
    mkdir(aliasParent, { recursive: true })
  ]);
  const receipt = path.join(receiptParent, "receipt.json");
  const alias = path.join(aliasParent, "receipt-alias.json");
  await writeFile(receipt, "{}\n", { encoding: "utf8", flag: "wx" });
  try {
    await link(receipt, alias);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error
      && ["EPERM", "EACCES", "ENOTSUP", "EXDEV"].includes(String(error.code))) {
      t.skip(`hardlink creation is unavailable: ${String(error.code)}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => assertIsolatedRollbackEvidenceRoots(fixture),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "EVIDENCE_TREE_HARDLINK"
  );
});

test("rollback evidence roots reject an internal junction or symlink", async (t) => {
  const fixture = await createIsolatedRootFixture();
  const aliasParent = path.join(fixture.baselineArtifactRoot, "nested", "deep");
  await mkdir(aliasParent, { recursive: true });
  const alias = path.join(aliasParent, "candidate-alias");
  try {
    await symlink(
      fixture.candidateArtifactRoot,
      alias,
      process.platform === "win32" ? "junction" : "dir"
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error
      && ["EPERM", "EACCES", "ENOTSUP"].includes(String(error.code))) {
      t.skip(`junction/symlink creation is unavailable: ${String(error.code)}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => assertIsolatedRollbackEvidenceRoots(fixture),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "EVIDENCE_TREE_ALIAS"
  );
});

test("current unselected host fails before artifact, Git, network, or actor claims", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-rollback-policy-"));
  const inputPath = path.join(temporaryRoot, "rollback-evidence.json");
  const document = await buildSchemaValidCurrentPolicyEvidence();
  const bytes = `${JSON.stringify(document, null, 2)}\n`;
  await writeFile(inputPath, bytes, { encoding: "utf8", flag: "wx" });
  await writeFile(
    `${inputPath}.sha256`,
    `${sha256(bytes)}  ${path.basename(inputPath)}\n`,
    { encoding: "utf8", flag: "wx" }
  );

  await assert.rejects(
    () => verifyRollbackEvidence({
      cwd: workspaceRoot,
      inputPath,
      baselineRoot: path.join(temporaryRoot, "baseline"),
      candidateRoot: path.join(temporaryRoot, "candidate"),
      receiptsRoot: path.join(temporaryRoot, "receipts"),
      privateRoot: path.join(temporaryRoot, "private")
    }),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.stage === "policy"
      && error.code === "REAL_HOST_POLICY_PREFLIGHT_FAILED"
  );
});

test("a syntactically selected host still cannot bypass the closed raw-evidence admission", async () => {
  const { targetRoot, origin } = await createSelectedPolicyWorkspace();
  const privateRoot = path.join(targetRoot, "private");
  await mkdir(privateRoot, { recursive: true });
  const inputPath = path.join(privateRoot, "rollback-evidence.json");
  const document = await buildSchemaValidCurrentPolicyEvidence({ root: targetRoot, origin });
  const bytes = `${JSON.stringify(document, null, 2)}\n`;
  await writeFile(inputPath, bytes, { encoding: "utf8", flag: "wx" });
  await writeFile(
    `${inputPath}.sha256`,
    `${sha256(bytes)}  ${path.basename(inputPath)}\n`,
    { encoding: "utf8", flag: "wx" }
  );

  await assert.rejects(
    () => verifyRollbackEvidence({
      cwd: targetRoot,
      inputPath,
      baselineRoot: path.join(targetRoot, "baseline"),
      candidateRoot: path.join(targetRoot, "candidate"),
      receiptsRoot: path.join(targetRoot, "receipts"),
      privateRoot
    }),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.stage === "execution_admission"
      && error.code === "ROLLBACK_EXECUTION_ADMISSION_CLOSED"
  );
});

test("failure ledger zeroes every gate and cannot authorize adjacent ledgers", () => {
  const failure = buildRollbackVerificationFailure({
    inputPath: "private/rollback-evidence.json",
    error: new RollbackEvidenceVerificationError(
      "policy",
      "REAL_HOST_POLICY_PREFLIGHT_FAILED",
      "private diagnostic"
    )
  });
  assert.equal(failure.status, "failed");
  assert.equal(failure.rollbackEvidenceVerified, false);
  assert.equal(Object.values(failure.gates).length, 20);
  assert.equal(Object.values(failure.gates).every((value) => value === false), true);
  assert.deepEqual(failure.claims, {
    engineeringEvidenceOnly: true,
    realRollbackExecutionEvidenceVerified: false,
    realWorldActorIndependenceEstablishedByVerifier: false,
    dataOwnerConsentTruthEstablishedByVerifier: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false,
    contentRightsGrant: false
  });
  assert.equal(Object.hasOwn(failure, "message"), false);
  assert.match(failure.messageDigest, /^[a-f0-9]{64}$/u);
});

test("formal receipt projection accepts the exact bound receipt count without a fixed policy count", () => {
  for (const count of [2, 13]) {
    const fixture = formalReceiptContractFixture(count);
    assert.doesNotThrow(() => validateRollbackFormalReceiptProjectionForContract(fixture));
  }
});

test("formal receipt projection rejects an understated bound receipt count", () => {
  const fixture = formalReceiptContractFixture(2);
  fixture.receipt.receiptCount = 1;
  assert.throws(
    () => validateRollbackFormalReceiptProjectionForContract(fixture),
    rollbackError("FORMAL_GATE_NOT_PASSED")
  );
});

test("formal receipt projection rejects an overstated bound receipt count", () => {
  const fixture = formalReceiptContractFixture(2);
  fixture.receipt.receiptCount = 3;
  assert.throws(
    () => validateRollbackFormalReceiptProjectionForContract(fixture),
    rollbackError("FORMAL_GATE_NOT_PASSED")
  );
});

test("deployment receipt contract returns a detached recursively immutable minimal projection", () => {
  const fixture = deploymentReceiptContractFixture();
  const projection = validateRollbackDeploymentReceiptProjectionForContract(fixture);
  assert.deepEqual(projection, {
    schemaVersion: 1,
    receiptType: "deployment_action",
    receiptId: "candidate-deployment-receipt",
    runId: fixture.document.runId,
    phaseId: "candidate",
    status: "passed",
    provider: "fixture-host",
    deploymentId: "active-deployment-candidate",
    startedAt: "2026-08-26T00:01:00.000Z",
    completedAt: "2026-08-26T00:01:30.000Z",
    origin: fixture.document.scope.origin,
    artifactLockDigest: fixture.expectedIdentity.identityLock.lockDigest,
    action: "deploy_candidate",
    expectedIdentity: normalizedDeploymentExpectedIdentity(fixture.expectedIdentity),
    binding: {
      path: "receipts/candidate-deployment.json",
      size: 512,
      sha256: "e".repeat(64)
    }
  });
  assert.notEqual(projection.expectedIdentity, fixture.envelope.expectedIdentity);
  assert.notEqual(projection.binding, fixture.binding);
  assertRecursivelyFrozen(projection);
  assert.throws(() => {
    projection.expectedIdentity.descriptor.targetSchema = 15;
  }, TypeError);
  assert.throws(() => {
    projection.binding.path = "receipts/rebound.json";
  }, TypeError);
});

test("deployment receipt contract rejects a non-canonical active deployment id", () => {
  const fixture = deploymentReceiptContractFixture();
  fixture.envelope.deploymentId = "active deployment candidate";
  fixture.binding.deploymentId = fixture.envelope.deploymentId;
  assert.throws(
    () => validateRollbackDeploymentReceiptProjectionForContract(fixture),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "DEPLOYMENT_RECEIPT_INVALID"
  );
});

test("deployment receipt contract independently rejects unsupported phases and non-default identities", () => {
  const unsupportedPhase = deploymentReceiptContractFixture();
  unsupportedPhase.phaseId = "baseline";
  assert.throws(
    () => validateRollbackDeploymentReceiptProjectionForContract(unsupportedPhase),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "DEPLOYMENT_PHASE_INVALID"
  );

  const promotedIdentity = deploymentReceiptContractFixture();
  promotedIdentity.expectedIdentity.descriptor.targetSchema = 15;
  assert.throws(
    () => validateRollbackDeploymentReceiptProjectionForContract(promotedIdentity),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "INVALID_RELEASE_IDENTITY"
  );
});

test("deployment receipt contract rejects an operation id misbound between binding and envelope", () => {
  const fixture = deploymentReceiptContractFixture();
  fixture.binding.deploymentId = "different-provider-operation";
  assert.throws(
    () => validateRollbackDeploymentReceiptProjectionForContract(fixture),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "RECEIPT_BINDING_MISMATCH"
  );
});

test("deployment receipt contract rejects expected identity drift", () => {
  const fixture = deploymentReceiptContractFixture();
  fixture.envelope.expectedIdentity.manifestDigest = "f".repeat(64);
  assert.throws(
    () => validateRollbackDeploymentReceiptProjectionForContract(fixture),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "DEPLOYMENT_RECEIPT_INVALID"
  );
});

test("deployment receipt contract rejects a provider outside the hosting policy", () => {
  const fixture = deploymentReceiptContractFixture();
  fixture.envelope.provider = "other-host";
  fixture.binding.provider = fixture.envelope.provider;
  assert.throws(
    () => validateRollbackDeploymentReceiptProjectionForContract(fixture),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "DEPLOYMENT_RECEIPT_INVALID"
  );
});

test("deployment receipt contract rejects unrelated authority fields", () => {
  const fixture = deploymentReceiptContractFixture();
  fixture.envelope.publicDeploymentAuthorized = true;
  assert.throws(
    () => validateRollbackDeploymentReceiptProjectionForContract(fixture),
    (error) => error instanceof RollbackEvidenceVerificationError
      && error.code === "DEPLOYMENT_RECEIPT_SHAPE_INVALID"
  );
});

test("phase receipt contract validates the complete A to B to A chain as detached frozen projections", () => {
  const baseline = phaseReceiptContractFixture("baseline");
  const candidate = phaseReceiptContractFixture("candidate", baseline.envelope.evidenceDigest);
  const rollbackObserved = phaseReceiptContractFixture(
    "rollbackObserved",
    candidate.envelope.evidenceDigest
  );
  for (const fixture of [baseline, candidate, rollbackObserved]) {
    const projection = validateRollbackPhaseReceiptProjectionForContract(fixture);
    assert.deepEqual(projection, {
      ...fixture.envelope,
      binding: fixture.phase.receiptBinding
    });
    assert.notEqual(projection.runtimeObservation, fixture.envelope.runtimeObservation);
    assert.notEqual(projection.browserReceiptSha256, fixture.envelope.browserReceiptSha256);
    assert.notEqual(projection.binding, fixture.phase.receiptBinding);
    assertRecursivelyFrozen(projection);
    assert.equal(Object.hasOwn(projection, "gates"), false);
    assert.equal(Object.hasOwn(projection, "claims"), false);
    assert.equal(Object.hasOwn(projection, "authority"), false);
    assert.equal(Object.hasOwn(projection, "usableForAdmission"), false);
    assert.equal(Object.hasOwn(projection, "rollbackEvidenceVerified"), false);
    const originalOrigin = projection.runtimeObservation.origin;
    fixture.envelope.runtimeObservation.origin = "https://mutated.example.test";
    fixture.phase.receiptBinding.path = "receipts/mutated.json";
    assert.equal(projection.runtimeObservation.origin, originalOrigin);
    assert.notEqual(projection.binding.path, fixture.phase.receiptBinding.path);
    assert.throws(() => {
      projection.runtimeObservation.online = false;
    }, TypeError);
  }
});

test("phase receipt contract independently rejects unknown phases and non-default identities", () => {
  const unknownPhase = phaseReceiptContractFixture("baseline");
  unknownPhase.phaseId = "preview";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(unknownPhase),
    rollbackError("PHASE_ID_INVALID")
  );

  const promotedIdentity = phaseReceiptContractFixture("baseline");
  promotedIdentity.expectedIdentity.descriptor.targetSchema = 15;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(promotedIdentity),
    rollbackError("INVALID_RELEASE_IDENTITY")
  );

  const migratedIdentity = phaseReceiptContractFixture("baseline");
  migratedIdentity.expectedIdentity.descriptor.migrationId = "migration-v15";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(migratedIdentity),
    rollbackError("INVALID_RELEASE_IDENTITY")
  );
});

test("phase receipt contract rejects non-canonical run and origin context", () => {
  const badRun = phaseReceiptContractFixture("baseline");
  badRun.runId = "run-4";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(badRun),
    rollbackError("PHASE_CONTEXT_INVALID")
  );

  const badOrigin = phaseReceiptContractFixture("baseline");
  badOrigin.origin = `${badOrigin.origin}/`;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(badOrigin),
    rollbackError("PHASE_CONTEXT_INVALID")
  );
});

test("phase receipt contract closes phase, binding, envelope, and digest-context keys", () => {
  const phaseAuthority = phaseReceiptContractFixture("baseline");
  phaseAuthority.phase.publicDeploymentAuthorized = true;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(phaseAuthority),
    rollbackError("PHASE_RECORD_SHAPE_INVALID")
  );

  const bindingEpoch = phaseReceiptContractFixture("baseline");
  bindingEpoch.phase.receiptBinding.epoch = 0;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(bindingEpoch),
    rollbackError("PHASE_RECEIPT_BINDING_SHAPE_INVALID")
  );

  const envelopeAuthority = phaseReceiptContractFixture("baseline");
  envelopeAuthority.envelope.publicDeploymentAuthorized = true;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(envelopeAuthority),
    rollbackError("PHASE_RECEIPT_SHAPE_INVALID")
  );

  const digestEpoch = phaseReceiptContractFixture("baseline");
  digestEpoch.receiptDigests.epoch = 0;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(digestEpoch),
    rollbackError("PHASE_DIGEST_CONTEXT_INVALID")
  );
});

test("phase receipt contract rejects phase-id, pass-state, and failure mismatches", () => {
  const phaseMismatch = phaseReceiptContractFixture("baseline");
  phaseMismatch.phase.phaseId = "candidate";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(phaseMismatch),
    rollbackError("PHASE_NOT_PASSED")
  );

  const failed = phaseReceiptContractFixture("baseline");
  failed.phase.status = "failed";
  failed.phase.failureCode = "FIXTURE_FAILURE";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(failed),
    rollbackError("PHASE_NOT_PASSED")
  );
});

test("phase receipt contract rejects non-canonical, reversed, and inexact durations", () => {
  const nonCanonical = phaseReceiptContractFixture("baseline");
  nonCanonical.phase.startedAt = "2026-08-26T00:00:00Z";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(nonCanonical),
    rollbackError("NON_CANONICAL_TIMESTAMP")
  );

  const reversed = phaseReceiptContractFixture("baseline");
  reversed.phase.completedAt = "2026-08-25T23:59:59.000Z";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(reversed),
    rollbackError("PHASE_DURATION_MISMATCH")
  );

  const wrongDuration = phaseReceiptContractFixture("baseline");
  wrongDuration.phase.durationMs += 1;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(wrongDuration),
    rollbackError("PHASE_DURATION_MISMATCH")
  );
});

test("phase receipt contract rejects runtime identity drift and fabricated epoch fields", () => {
  const controllerDrift = phaseReceiptContractFixture("candidate");
  controllerDrift.phase.runtimeObservation.controllerScriptSha256 = "f".repeat(64);
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(controllerDrift),
    rollbackError("RUNTIME_IDENTITY_MISMATCH")
  );

  const epochFabrication = phaseReceiptContractFixture("baseline");
  epochFabrication.phase.runtimeObservation.epoch = 0;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(epochFabrication),
    rollbackError("RUNTIME_OBSERVATION_SHAPE_INVALID")
  );
});

test("phase receipt contract rejects host and browser digest drift", () => {
  const hostDrift = phaseReceiptContractFixture("baseline");
  hostDrift.envelope.hostReceiptSha256 = "6".repeat(64);
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(hostDrift),
    rollbackError("PHASE_RECEIPT_INVALID")
  );

  const missingBrowser = phaseReceiptContractFixture("baseline");
  delete missingBrowser.receiptDigests.browsers.chrome;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(missingBrowser),
    rollbackError("PHASE_DIGEST_CONTEXT_INVALID")
  );

  const swappedBrowsers = phaseReceiptContractFixture("baseline");
  [
    swappedBrowsers.envelope.browserReceiptSha256.msedge,
    swappedBrowsers.envelope.browserReceiptSha256.chrome
  ] = [
    swappedBrowsers.envelope.browserReceiptSha256.chrome,
    swappedBrowsers.envelope.browserReceiptSha256.msedge
  ];
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(swappedBrowsers),
    rollbackError("PHASE_RECEIPT_INVALID")
  );
});

test("phase receipt contract enforces the three-phase deployment and previous-digest null/SHA relation", () => {
  const baselineDeployment = phaseReceiptContractFixture("baseline");
  baselineDeployment.receiptDigests.deployment = "4".repeat(64);
  baselineDeployment.envelope.deploymentReceiptSha256 = "4".repeat(64);
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(baselineDeployment),
    rollbackError("PHASE_DIGEST_CONTEXT_INVALID")
  );

  const candidateDeployment = phaseReceiptContractFixture("candidate");
  candidateDeployment.receiptDigests.deployment = null;
  candidateDeployment.envelope.deploymentReceiptSha256 = null;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(candidateDeployment),
    rollbackError("PHASE_DIGEST_CONTEXT_INVALID")
  );

  const candidatePrevious = phaseReceiptContractFixture("candidate");
  candidatePrevious.previousEvidenceDigest = null;
  candidatePrevious.envelope.previousPhaseEvidenceDigest = null;
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(candidatePrevious),
    rollbackError("PHASE_DIGEST_CONTEXT_INVALID")
  );
});

test("phase receipt contract rejects a previous-phase hash-chain mismatch", () => {
  const fixture = phaseReceiptContractFixture("candidate");
  fixture.previousEvidenceDigest = "8".repeat(64);
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(fixture),
    rollbackError("PHASE_RECEIPT_INVALID")
  );
});

test("phase receipt contract rejects envelope-to-phase time and runtime divergence", () => {
  const timeDrift = phaseReceiptContractFixture("baseline");
  timeDrift.envelope.startedAt = "2026-08-26T00:00:01.000Z";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(timeDrift),
    rollbackError("PHASE_RECEIPT_INVALID")
  );

  const runtimeDrift = phaseReceiptContractFixture("baseline");
  runtimeDrift.envelope.runtimeObservation.observedAt = "2026-08-26T00:00:29.000Z";
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(runtimeDrift),
    rollbackError("PHASE_RECEIPT_INVALID")
  );
});

test("phase receipt contract rejects recomputed and phase-bound evidence digest drift", () => {
  const envelopeDrift = phaseReceiptContractFixture("baseline");
  envelopeDrift.envelope.evidenceDigest = "0".repeat(64);
  envelopeDrift.phase.evidenceDigest = "0".repeat(64);
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(envelopeDrift),
    rollbackError("PHASE_EVIDENCE_DIGEST_MISMATCH")
  );

  const phaseDrift = phaseReceiptContractFixture("baseline");
  phaseDrift.phase.evidenceDigest = "0".repeat(64);
  assert.throws(
    () => validateRollbackPhaseReceiptProjectionForContract(phaseDrift),
    rollbackError("PHASE_EVIDENCE_DIGEST_MISMATCH")
  );
});
