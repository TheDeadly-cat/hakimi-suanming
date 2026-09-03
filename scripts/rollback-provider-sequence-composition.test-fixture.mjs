import { spawnSync } from "node:child_process";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import path from "node:path";

import {
  createValidPair,
  jsonBytes,
  sequenceOutputRoot,
  verifierArgs,
  workspaceRoot,
  writerArgs
} from "./provider-deployment-candidate-sequence.test-fixture.mjs";
import {
  writeProviderDeploymentCandidateSequenceCandidate
} from "./provider-deployment-candidate-sequence-writer.mjs";
import {
  verifyPersistedProviderDeploymentCandidateSequence
} from "./provider-deployment-candidate-sequence-verifier.mjs";
import {
  computeRollbackEvidenceDigest,
  computeRollbackEvidenceId
} from "./rollback-evidence-lib.mjs";
import { compileRollbackEvidenceSchema } from "./rollback-evidence-schema.mjs";
import { sha256 } from "./release-evidence-lib.mjs";

const rollbackSchema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs", "release", "rollback-evidence.schema.json"),
  "utf8"
));
const rollbackValidator = compileRollbackEvidenceSchema(rollbackSchema);
const definitions = rollbackSchema.$defs;
const compositionModuleUrl = new URL(
  "./rollback-provider-sequence-composition-lib.mjs",
  import.meta.url
).href;

const compositionCliFlags = Object.freeze([
  ["--binding-root", "bindingRoot"],
  ["--rollback-evidence-root", "rollbackEvidenceRoot"],
  ["--rollback-evidence", "rollbackEvidencePath"],
  ["--rollback-receipts-root", "rollbackReceiptsRoot"],
  ["--provider-deploy-output-root", "deployOutputRoot"],
  ["--provider-deploy-receipt", "deployReceiptPath"],
  ["--provider-restore-output-root", "restoreOutputRoot"],
  ["--provider-restore-receipt", "restoreReceiptPath"],
  ["--provider-sequence-output-root", "sequenceOutputRoot"],
  ["--provider-sequence", "sequencePath"]
]);

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

function workspaceRelative(absolutePath) {
  return path.relative(workspaceRoot, absolutePath).replaceAll("\\", "/");
}

function normalizedDeploymentExpectedIdentity(identity) {
  return {
    descriptor: structuredClone(identity.descriptor),
    evidenceId: identity.releaseEvidence.evidenceId,
    buildVersion: identity.buildVersion,
    manifestDigest: identity.manifestDigest,
    artifactSetDigest: identity.artifactSetDigest,
    components: structuredClone(identity.components)
  };
}

async function currentPolicyBindings() {
  const rollbackPolicy = JSON.parse(await readFile(
    path.join(workspaceRoot, "docs", "release", "rollback-evidence-policy.v1.json"),
    "utf8"
  ));
  return Promise.all(rollbackPolicy.requiredPolicyBindings.map(async ({ role, path: policyPath }) => {
    const bytes = await readFile(path.join(workspaceRoot, policyPath));
    return { policyId: role, path: policyPath, sha256: sha256(bytes) };
  }));
}

async function rollbackIdentityFor(candidatePackage, label) {
  const snapshot = JSON.parse(await readFile(path.resolve(
    workspaceRoot,
    candidatePackage.receipt.attachments["artifact-final"].path
  ), "utf8"));
  const expectation = snapshot.releaseEvidenceExpectation;
  const artifacts = new Map(expectation.artifacts.map((entry) => [entry.path, entry]));
  const component = (artifactPath) => structuredClone(artifacts.get(artifactPath));
  const providerIdentity = candidatePackage.receipt.artifactIdentity;
  const evidenceId = providerIdentity.releaseEvidenceId;
  return {
    artifactRoot: workspaceRelative(path.join(candidatePackage.root, "dist", "web")),
    channel: "default-v13",
    descriptor: structuredClone(providerIdentity.descriptor),
    buildVersion: providerIdentity.buildVersion,
    manifestDigest: expectation.releaseIdentity.manifestDigest,
    artifactSetDigest: providerIdentity.artifactSetDigest,
    releaseEvidence: {
      schemaVersion: 1,
      schemaId: "https://hakimi.invalid/schemas/release-evidence-v1.json",
      evidenceType: "engineering_release_evidence",
      evidenceId,
      path: providerIdentity.releaseEvidence.path,
      size: providerIdentity.releaseEvidence.size,
      sha256: providerIdentity.releaseEvidence.sha256,
      sidecarPath: `${providerIdentity.releaseEvidence.path}.sha256`,
      sidecarSha256: sha256(`${label}:release-evidence-sidecar`)
    },
    formalReceipt: {
      schemaVersion: 1,
      receiptType: "formal_release_evidence_verification",
      receiptId: `formal-${evidenceId}`,
      releaseEvidenceId: evidenceId,
      status: "passed",
      verifiedAt: "2019-12-31T23:59:00.000Z",
      path: `private/formal-${label}.json`,
      size: 1,
      sha256: sha256(`${label}:formal-receipt`)
    },
    identityLock: {
      path: providerIdentity.identityLock.path,
      size: 1,
      sha256: providerIdentity.identityLock.sha256,
      lockDigest: providerIdentity.identityLock.lockDigest,
      artifactSetDigest: providerIdentity.artifactSetDigest,
      evidenceId,
      verified: true
    },
    components: {
      applicationShell: component("index.html"),
      pwaManifest: component("manifest.webmanifest"),
      serviceWorker: component("sw.js"),
      hostingHeaders: component("_headers")
    }
  };
}

function deploymentReceiptEnvelope({
  phaseId,
  runId,
  provider,
  origin,
  deploymentId,
  startedAt,
  completedAt,
  identity
}) {
  return {
    schemaVersion: 1,
    receiptType: "deployment_action",
    receiptId: phaseId === "candidate"
      ? "rollback-candidate-deployment"
      : "rollback-observed-deployment",
    runId,
    phaseId,
    status: "passed",
    provider,
    deploymentId,
    startedAt,
    completedAt,
    origin,
    artifactLockDigest: identity.identityLock.lockDigest,
    action: phaseId === "candidate" ? "deploy_candidate" : "restore_baseline",
    expectedIdentity: normalizedDeploymentExpectedIdentity(identity),
    errors: []
  };
}

function deploymentBinding(envelope, receiptPath, bytes) {
  const {
    action: _action,
    expectedIdentity: _expectedIdentity,
    errors: _errors,
    ...core
  } = envelope;
  return {
    ...core,
    path: workspaceRelative(receiptPath),
    size: bytes.byteLength,
    sha256: sha256(bytes)
  };
}

function phaseRecord(document, phaseId, startedAt, completedAt) {
  const phase = document.execution[phaseId];
  phase.phaseId = phaseId;
  phase.status = "passed";
  phase.startedAt = startedAt;
  phase.completedAt = completedAt;
  phase.durationMs = Date.parse(completedAt) - Date.parse(startedAt);
}

export async function writeRollbackEvidenceFixture(fixture, source, { validate = true } = {}) {
  const document = structuredClone(source);
  document.rollbackEvidenceId = computeRollbackEvidenceId(document);
  document.evidenceDigest = computeRollbackEvidenceDigest(document);
  if (validate) rollbackValidator.assert(document);
  const bytes = jsonBytes(document);
  await writeFile(fixture.rollbackEvidencePath, bytes);
  await writeFile(
    `${fixture.rollbackEvidencePath}.sha256`,
    `${sha256(bytes)}  ${path.basename(fixture.rollbackEvidencePath)}\n`,
    "utf8"
  );
  fixture.evidence = document;
  return document;
}

export async function rewriteDeploymentReceiptFixture(
  fixture,
  phaseId,
  mutate,
  { document = fixture.evidence, refreshEvidenceBinding = true, validateEvidence = true } = {}
) {
  const key = phaseId === "candidate" ? "candidate" : "rollbackObserved";
  const receiptPath = fixture.deploymentReceiptPaths[key];
  const envelope = JSON.parse(await readFile(receiptPath, "utf8"));
  await mutate(envelope);
  const bytes = jsonBytes(envelope);
  await writeFile(receiptPath, bytes);
  fixture.deploymentReceipts[key] = envelope;
  if (refreshEvidenceBinding) {
    const nextDocument = structuredClone(document);
    nextDocument.receipts.deployments[key] = deploymentBinding(envelope, receiptPath, bytes);
    await writeRollbackEvidenceFixture(fixture, nextDocument, { validate: validateEvidence });
  }
  return envelope;
}

export async function appendUnboundBytes(filePath, bytes = " ") {
  await appendFile(filePath, bytes, "utf8");
}

export async function verifyPersistedProviderSequenceFixture(fixture) {
  return verifyPersistedProviderDeploymentCandidateSequence({
    bindingRoot: fixture.input.bindingRoot,
    deployOutputRoot: fixture.input.deployOutputRoot,
    deployReceiptPath: fixture.input.deployReceiptPath,
    restoreOutputRoot: fixture.input.restoreOutputRoot,
    restoreReceiptPath: fixture.input.restoreReceiptPath,
    sequenceOutputRoot: fixture.input.sequenceOutputRoot,
    sequencePath: fixture.input.sequencePath,
    cwd: fixture.input.bindingRoot
  });
}

export async function createRollbackProviderSequenceCompositionFixture(t) {
  const hostingPolicy = JSON.parse(await readFile(
    path.join(workspaceRoot, "docs", "security", "hosting-security-policy.json"),
    "utf8"
  ));
  if (hostingPolicy.deploymentPlatform !== "unselected") {
    throw new Error("Composition fixture requires the current unselected hosting policy.");
  }
  const pair = await createValidPair(t, {
    deploy: { candidateProvider: hostingPolicy.deploymentPlatform },
    restore: { candidateProvider: hostingPolicy.deploymentPlatform }
  });
  const providerSequenceOutputRoot = sequenceOutputRoot(pair);
  await writeProviderDeploymentCandidateSequenceCandidate(writerArgs(pair, providerSequenceOutputRoot));
  const persisted = verifierArgs(pair, providerSequenceOutputRoot);
  const providerSequenceDocument = JSON.parse(await readFile(persisted.sequencePath, "utf8"));

  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, "rollback-provider-composition-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const rollbackEvidenceRoot = path.join(root, "rollback-evidence");
  const rollbackReceiptsRoot = path.join(root, "rollback-receipts");
  await Promise.all([mkdir(rollbackEvidenceRoot), mkdir(rollbackReceiptsRoot)]);

  const rollbackEvidencePath = path.join(rollbackEvidenceRoot, "rollback-evidence.json");
  const deploymentReceiptPaths = {
    candidate: path.join(rollbackReceiptsRoot, "candidate-deployment.json"),
    rollbackObserved: path.join(rollbackReceiptsRoot, "rollback-observed-deployment.json")
  };
  const runId = `hrr1-${"4".repeat(32)}`;
  const origin = pair.deploy.receipt.candidateScope.origin;
  const provider = hostingPolicy.deploymentPlatform;
  const candidateIdentity = await rollbackIdentityFor(pair.deploy, "candidate-b");
  const baselineIdentity = await rollbackIdentityFor(pair.restore, "baseline-a");
  const deploymentReceipts = {
    candidate: deploymentReceiptEnvelope({
      phaseId: "candidate",
      runId,
      provider,
      origin,
      deploymentId: pair.deploy.receipt.operation.resultActiveDeploymentId,
      startedAt: pair.deploy.receipt.operation.startedAt,
      completedAt: pair.deploy.receipt.operation.completedAt,
      identity: candidateIdentity
    }),
    rollbackObserved: deploymentReceiptEnvelope({
      phaseId: "rollbackObserved",
      runId,
      provider,
      origin,
      deploymentId: pair.restore.receipt.operation.resultActiveDeploymentId,
      startedAt: pair.restore.receipt.operation.startedAt,
      completedAt: pair.restore.receipt.operation.completedAt,
      identity: baselineIdentity
    })
  };
  const receiptBytes = {
    candidate: jsonBytes(deploymentReceipts.candidate),
    rollbackObserved: jsonBytes(deploymentReceipts.rollbackObserved)
  };
  await Promise.all(Object.entries(deploymentReceiptPaths).map(([key, receiptPath]) =>
    writeFile(receiptPath, receiptBytes[key])));

  const evidence = sampleFromSchema(rollbackSchema);
  evidence.runId = runId;
  evidence.generatedAt = "2020-01-01T00:10:04.000Z";
  evidence.status = "failed";
  evidence.scope.origin = origin;
  evidence.policyBindings = await currentPolicyBindings();
  evidence.identities = {
    baseline: baselineIdentity,
    candidate: candidateIdentity,
    rollbackObserved: structuredClone(baselineIdentity)
  };
  phaseRecord(evidence, "baseline", "2019-12-31T23:58:00.000Z", "2019-12-31T23:59:30.000Z");
  phaseRecord(evidence, "candidate", "2020-01-01T00:00:00.000Z", "2020-01-01T00:00:04.000Z");
  phaseRecord(evidence, "rollbackObserved", "2020-01-01T00:10:00.000Z", "2020-01-01T00:10:03.000Z");
  evidence.receipts.browsers[0].projectName = "msedge";
  evidence.receipts.browsers[0].runtimeProduct = "Edg/140.0.0.0";
  evidence.receipts.browsers[0].receiptId = "browser-msedge";
  evidence.receipts.browsers[1].projectName = "chrome";
  evidence.receipts.browsers[1].runtimeProduct = "Chrome/140.0.0.0";
  evidence.receipts.browsers[1].receiptId = "browser-chrome";
  evidence.receipts.deployments = {
    candidate: deploymentBinding(
      deploymentReceipts.candidate,
      deploymentReceiptPaths.candidate,
      receiptBytes.candidate
    ),
    rollbackObserved: deploymentBinding(
      deploymentReceipts.rollbackObserved,
      deploymentReceiptPaths.rollbackObserved,
      receiptBytes.rollbackObserved
    )
  };
  for (const gate of Object.keys(evidence.gates)) evidence.gates[gate] = false;
  evidence.failure = {
    code: "FORMAL_ROLLBACK_NOT_ADMITTED",
    category: "policy",
    phaseId: "rollbackObserved",
    observedAt: "2020-01-01T00:10:04.000Z",
    retryable: false,
    messageDigest: sha256("projection-only fixture remains outside formal rollback admission"),
    detailBinding: null
  };

  const fixture = {
    root,
    pair,
    rollbackEvidenceRoot,
    rollbackEvidencePath,
    rollbackReceiptsRoot,
    deploymentReceiptPaths,
    deploymentReceipts,
    providerSequenceDocument,
    evidence: null,
    input: {
      bindingRoot: workspaceRoot,
      rollbackEvidenceRoot,
      rollbackEvidencePath,
      rollbackReceiptsRoot,
      deployOutputRoot: pair.deploy.outputRoot,
      deployReceiptPath: pair.deploy.receiptPath,
      restoreOutputRoot: pair.restore.outputRoot,
      restoreReceiptPath: pair.restore.receiptPath,
      sequenceOutputRoot: providerSequenceOutputRoot,
      sequencePath: persisted.sequencePath
    }
  };
  await writeRollbackEvidenceFixture(fixture, evidence);
  return fixture;
}

export function runRollbackProviderSequenceCompositionCli(input) {
  const args = compositionCliFlags.flatMap(([flag, key]) => [flag, input[key]]);
  return spawnSync(
    process.execPath,
    [path.join(workspaceRoot, "scripts", "verify-rollback-provider-sequence-composition.mjs"), ...args],
    {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 30_000
    }
  );
}

const overlappingMutationProbeSource = String.raw`
import fsp from "node:fs/promises";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";

const payload = JSON.parse(Buffer.from(
  process.env.HAKIMI_ROLLBACK_COMPOSITION_MUTATION_PROBE,
  "base64"
).toString("utf8"));
const originalOpen = fsp.open.bind(fsp);
const comparable = (value) => {
  const resolved = path.resolve(String(value));
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};
let mutated = false;
fsp.open = async (filePath, ...args) => {
  if (!mutated && comparable(filePath) === comparable(payload.input.sequencePath)) {
    mutated = true;
    await fsp.appendFile(payload.mutatePath, " ", "utf8");
  }
  return originalOpen(filePath, ...args);
};
syncBuiltinESMExports();

const { composeRollbackProviderSequenceCandidate } = await import(payload.compositionModuleUrl);
try {
  const document = await composeRollbackProviderSequenceCandidate(payload.input, {
    cwd: payload.input.bindingRoot
  });
  process.stdout.write(JSON.stringify({ ok: true, mutated, document }));
} catch (error) {
  const chain = [];
  for (let current = error; current instanceof Error; current = current.cause) {
    chain.push({
      name: current.name,
      code: typeof current.code === "string" ? current.code : null,
      message: current.message
    });
  }
  process.stdout.write(JSON.stringify({ ok: false, mutated, chain }));
}
`;

export function runOverlappingCheckpointMutationProbe(fixture) {
  const encoded = Buffer.from(JSON.stringify({
    input: fixture.input,
    mutatePath: fixture.deploymentReceiptPaths.candidate,
    compositionModuleUrl
  }), "utf8").toString("base64");
  return spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", overlappingMutationProbeSource],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        HAKIMI_ROLLBACK_COMPOSITION_MUTATION_PROBE: encoded
      },
      encoding: "utf8",
      timeout: 30_000
    }
  );
}
