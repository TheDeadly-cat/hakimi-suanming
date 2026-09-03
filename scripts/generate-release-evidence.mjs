import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertStableDirectoryPathWithin,
  canonicalReleaseChannel,
  canonicalJson,
  collectArtifactEntries,
  computeEvidenceId,
  computeSourceTreeDigest,
  defaultV13ReleaseDescriptorMatches,
  parseCli,
  policyFileEntries,
  readBuiltReleaseMetadata,
  readStableRegularFileSnapshot,
  readGitState,
  releaseArtifactComponents,
  releaseReceiptSetMatchesPolicy,
  releaseToolchain,
  relativePathWithin,
  sha256,
  sha256File
} from "./release-evidence-lib.mjs";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../apps/web/release-protocol.ts";
import { isReleaseBrowserReceiptId } from "../apps/web/playwright.release-browser-result.ts";
import { verifyReleaseBrowserResultSummaryBinding } from "./release-browser-result-evidence.mjs";
import {
  assertReleaseArtifactReceiptBinding,
  buildReleaseArtifactMutationBoundary,
  verifyReleaseArtifactIdentityLock
} from "./release-artifact-identity-lib.mjs";
import { loadReleaseEvidenceSchemaValidator } from "./release-evidence-schema.mjs";

const flags = parseCli(process.argv.slice(2));
const cwd = process.cwd();
const releaseEvidenceSchemaValidator = await loadReleaseEvidenceSchemaValidator(cwd);
const channel = canonicalReleaseChannel(flags.get("channel") ?? "default-v13");
const dist = path.resolve(String(flags.get("dist") ?? "dist/web"));
const receiptsDirectory = path.resolve(String(flags.get("receipts") ?? "tmp/release-evidence-receipts"));
const artifactLockPath = path.resolve(String(flags.get("artifact-lock") ?? "tmp/release-artifact-identity.json"));
const output = path.resolve(String(flags.get("output") ?? path.join(dist, "release-evidence.json")));
const allowDirty = flags.get("allow-dirty") === true;
const allowUnbound = flags.get("allow-unbound") === true;
const releaseLabel = String(flags.get("release-label") ?? process.env.HAKIMI_RELEASE_LABEL ?? "unlabeled-local-candidate");
if (!releaseLabel.trim() || releaseLabel.length > 120 || /[\u0000-\u001f\u007f]/u.test(releaseLabel)) {
  throw new Error("Release label is empty, too long, or contains control characters.");
}
const requiredReceiptIdsOverride = flags.has("require-receipts")
  ? String(flags.get("require-receipts"))
    .split(",").map((value) => value.trim()).filter(Boolean).sort()
  : null;
if (
  requiredReceiptIdsOverride !== null
  && new Set(requiredReceiptIdsOverride).size !== requiredReceiptIdsOverride.length
) throw new Error("Required receipt ids are duplicated.");
if (requiredReceiptIdsOverride?.some((id) => !/^[a-z0-9][a-z0-9-]*$/u.test(id))) {
  throw new Error("A required receipt id is not canonical.");
}
relativePathWithin(cwd, dist, "Artifact root");
relativePathWithin(cwd, receiptsDirectory, "Receipt directory");
relativePathWithin(cwd, artifactLockPath, "Release artifact identity lock");
await assertStableDirectoryPathWithin(cwd, receiptsDirectory, "Receipt directory");
const outputRelativeToDist = relativePathWithin(dist, output, "Release Evidence output");
if (!outputRelativeToDist) throw new Error("Release Evidence output must be a file inside the artifact root.");

const git = readGitState(cwd);
if (git.dirty && !allowDirty) throw new Error("Formal Release Evidence requires a clean source tree.");
const sourceTreeDigest = await computeSourceTreeDigest(cwd);
const lockfileDigest = await sha256File(path.resolve(cwd, "package-lock.json"));
const expectedEvidenceId = computeEvidenceId({
  gitCommit: git.commit,
  sourceTreeDigest,
  lockfileDigest,
  channel
});
const built = await readBuiltReleaseMetadata(dist, { containmentRoot: cwd });
const evidenceIdBound = built.evidenceId === expectedEvidenceId;
if (!evidenceIdBound && !allowUnbound) {
  throw new Error(`Built evidence id ${built.evidenceId} does not match ${expectedEvidenceId}.`);
}
const decisions = JSON.parse(await readFile(path.resolve(cwd, "docs/release/web-v1-release-decisions.json"), "utf8"));
const defaultReleaseDescriptorMatched = defaultV13ReleaseDescriptorMatches({
  channel,
  descriptor: built.descriptor,
  decision: decisions.defaultRelease,
  canonicalDescriptor: BRIDGE_RELEASE_DATABASE_DESCRIPTOR
});
if (channel === "default-v13" && !defaultReleaseDescriptorMatched) {
  throw new Error("The default-v13 evidence channel is bound to a non-default database descriptor.");
}
const policyReceiptCommands = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
if (!policyReceiptCommands || typeof policyReceiptCommands !== "object" || Array.isArray(policyReceiptCommands)) {
  throw new Error("Default v13 release receipt policy is missing.");
}
const policyReceiptIds = Object.keys(policyReceiptCommands).sort();
if (
  requiredReceiptIdsOverride !== null
  && canonicalJson(requiredReceiptIdsOverride) !== canonicalJson(policyReceiptIds)
) {
  throw new Error("Required receipt ids must exactly match the default-v13 release policy.");
}
const requiredReceiptIds = requiredReceiptIdsOverride ?? policyReceiptIds;

let receiptNames = [];
try {
  receiptNames = (await readdir(receiptsDirectory)).filter((name) => name.endsWith(".json")).sort();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const testReceipts = [];
const rawReceiptsById = new Map();
for (const name of receiptNames) {
  const receiptPath = path.join(receiptsDirectory, name);
  const receiptSnapshot = await readStableRegularFileSnapshot(receiptPath, {
    containmentRoot: receiptsDirectory,
    label: `Release test receipt ${name}`
  });
  const receipt = JSON.parse(receiptSnapshot.bytes.toString("utf8"));
  if (receipt.schemaVersion !== 1 || receipt.receiptType !== "release_test_command") {
    throw new Error(`Invalid release test receipt: ${name}`);
  }
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(receipt.id) || !Array.isArray(receipt.command)) {
    throw new Error(`Malformed release test receipt: ${name}`);
  }
  if (receipt.evidenceId !== expectedEvidenceId) {
    throw new Error(`Release test receipt ${receipt.id} is not bound to this source evidence id.`);
  }
  if (testReceipts.some((entry) => entry.id === receipt.id)) throw new Error(`Duplicate receipt id: ${receipt.id}`);
  rawReceiptsById.set(receipt.id, receipt);
  const browserResultSummary = await verifyReleaseBrowserResultSummaryBinding({
    cwd,
    receiptsDirectory,
    receipt
  });
  const receiptRelativePath = relativePathWithin(cwd, receiptPath, `Receipt ${receipt.id}`);
  testReceipts.push({
    id: receipt.id,
    evidenceId: receipt.evidenceId,
    status: receipt.status,
    exitCode: receipt.exitCode,
    command: receipt.command,
    startedAt: receipt.startedAt,
    completedAt: receipt.completedAt,
    durationMs: receipt.durationMs,
    browserResultSummary,
    path: receiptRelativePath,
    sha256: receiptSnapshot.sha256
  });
}
for (const id of requiredReceiptIds) {
  const receipt = testReceipts.find((entry) => entry.id === id);
  if (!receipt) throw new Error(`Required release receipt is missing: ${id}`);
  if (receipt.status !== "passed" || receipt.exitCode !== 0) throw new Error(`Required release receipt failed: ${id}`);
}

const excludedArtifacts = [outputRelativeToDist, `${outputRelativeToDist}.sha256`];
const artifactEntries = await collectArtifactEntries(
  dist,
  excludedArtifacts,
  { containmentRoot: cwd }
);
const artifactComponents = releaseArtifactComponents(artifactEntries);
if (artifactComponents.applicationShell.sha256 !== built.indexSha256
  || artifactComponents.applicationShell.size !== built.indexSize) {
  throw new Error("Built release metadata and artifact inventory did not use the same stable index bytes.");
}
const artifactIdentity = await verifyReleaseArtifactIdentityLock({
  cwd,
  dist,
  lockPath: artifactLockPath,
  evidenceId: expectedEvidenceId
});
const artifactLockStable = artifactIdentity.artifactSetDigest === sha256(canonicalJson(artifactEntries));
const browserReceiptIds = policyReceiptIds.filter(isReleaseBrowserReceiptId);
const artifactEndpointSnapshotsMatched = browserReceiptIds
  .every((id) => {
    const rawReceipt = rawReceiptsById.get(id);
    if (!rawReceipt || rawReceipt.artifactIdentityBindingError !== null) return false;
    try {
      return assertReleaseArtifactReceiptBinding(
        rawReceipt.artifactIdentityBinding,
        artifactIdentity
      );
    } catch {
      return false;
    }
  });
const artifactMutationBoundary = buildReleaseArtifactMutationBoundary({
  coveredReceiptIds: browserReceiptIds,
  endpointSnapshotsMatched: artifactEndpointSnapshotsMatched
});
const artifactIdentityStable = artifactLockStable
  && artifactMutationBoundary.endpointSnapshotsMatched;
const policies = await policyFileEntries(cwd);
const requiredArtifactComponentsPresent = true;
const requiredReceiptsPresent = requiredReceiptIds.length > 0
  && requiredReceiptIds.every((id) => testReceipts.some((receipt) => receipt.id === id && receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0));
const allRecordedReceiptsPassed = testReceipts.length > 0
  && testReceipts.every((receipt) => receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0);
const policyReceiptSetMatched = canonicalJson(requiredReceiptIds) === canonicalJson(policyReceiptIds);
const recordedReceiptSetMatched = releaseReceiptSetMatchesPolicy(testReceipts, policyReceiptIds);
const policyReceiptCommandsMatched = policyReceiptIds.every((id) => {
  const receipt = testReceipts.find((entry) => entry.id === id);
  return receipt && canonicalJson(receipt.command) === canonicalJson(policyReceiptCommands[id]);
});
const browserResultSummariesMatched = policyReceiptIds
  .filter(isReleaseBrowserReceiptId)
  .every((id) => testReceipts.some((receipt) =>
    receipt.id === id && receipt.browserResultSummary !== null
  ));
const engineeringGatePassed = !git.dirty
  && evidenceIdBound
  && defaultReleaseDescriptorMatched
  && requiredReceiptsPresent
  && allRecordedReceiptsPassed
  && policyReceiptSetMatched
  && recordedReceiptSetMatched
  && policyReceiptCommandsMatched
  && browserResultSummariesMatched
  && artifactIdentityStable
  && requiredArtifactComponentsPresent;
const allowanceScopedEngineeringGatePassed = (!git.dirty || allowDirty)
  && (evidenceIdBound || allowUnbound)
  && defaultReleaseDescriptorMatched
  && requiredReceiptsPresent
  && allRecordedReceiptsPassed
  && policyReceiptSetMatched
  && recordedReceiptSetMatched
  && policyReceiptCommandsMatched
  && browserResultSummariesMatched
  && artifactIdentityStable
  && requiredArtifactComponentsPresent;
if (!allowanceScopedEngineeringGatePassed) {
  throw new Error("Formal Release Evidence did not satisfy the complete default-v13 engineering receipt policy.");
}

const evidence = {
  schemaVersion: 1,
  evidenceType: "engineering_release_evidence",
  evidenceId: expectedEvidenceId,
  generatedAt: new Date().toISOString(),
  source: {
    repository: git.repository,
    commit: git.commit,
    branch: git.branch,
    dirty: git.dirty,
    untrackedSourceFileCount: git.untrackedSourceFileCount,
    sourceTreeDigest,
    packageLockSha256: lockfileDigest
  },
  release: {
    channel,
    candidateLabel: releaseLabel,
    descriptor: built.descriptor,
    manifestVersion: built.manifest.manifestVersion,
    manifestDigest: built.manifestDigest,
    buildVersion: built.buildVersion,
    builtEvidenceId: built.evidenceId,
    evidenceIdBound,
    requiredReceiptIds
  },
  toolchain: releaseToolchain(cwd),
  policyFiles: policies,
  testReceipts,
  artifacts: {
    root: path.relative(cwd, dist).replaceAll("\\", "/"),
    count: artifactEntries.length,
    artifactSetDigest: sha256(canonicalJson(artifactEntries)),
    identityLock: {
      path: artifactIdentity.lockPath,
      sha256: artifactIdentity.lockFileSha256,
      lockDigest: artifactIdentity.lock.lockDigest,
      artifactSetDigest: artifactIdentity.artifactSetDigest,
      verified: artifactLockStable
    },
    mutationBoundary: artifactMutationBoundary,
    components: artifactComponents,
    files: artifactEntries
  },
  gates: {
    sourceTreeClean: !git.dirty,
    evidenceIdBound,
    defaultReleaseDescriptorMatched,
    requiredReceiptsPresent,
    allRecordedReceiptsPassed,
    policyReceiptSetMatched,
    recordedReceiptSetMatched,
    policyReceiptCommandsMatched,
    browserResultSummariesMatched,
    artifactIdentityStable,
    requiredArtifactComponentsPresent,
    engineeringGatePassed,
    releaseHistoryOwnerConfirmed: decisions.releaseHistory.status === "owner_confirmed",
    hostingSecurityVerified: decisions.hosting.securityHeadersVerified === true,
    publicDeploymentAuthorized: decisions.hosting.publicDeploymentAuthorized === true,
    licenseOwnerSelectionRecorded: decisions.licensing.ownerFinalSelectionRecorded === true,
    expertClaimsAuthorized: decisions.domainClaims.expertValidatedClaimAuthorized === true
  },
  claims: {
    engineeringEvidenceOnly: true,
    codeSignature: false,
    expertSignature: false,
    contentRightsGrant: false,
    publicReleaseAuthorized: false
  }
};

releaseEvidenceSchemaValidator.assert(evidence);
await mkdir(path.dirname(output), { recursive: true });
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
await writeFile(output, serialized, "utf8");
const evidenceDigest = sha256(serialized);
await writeFile(`${output}.sha256`, `${evidenceDigest}  ${path.basename(output)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  evidenceId: evidence.evidenceId,
  evidenceDigest,
  sourceTreeClean: evidence.gates.sourceTreeClean,
  defaultReleaseDescriptorMatched: evidence.gates.defaultReleaseDescriptorMatched,
  policyReceiptSetMatched: evidence.gates.policyReceiptSetMatched,
  recordedReceiptSetMatched: evidence.gates.recordedReceiptSetMatched,
  policyReceiptCommandsMatched: evidence.gates.policyReceiptCommandsMatched,
  engineeringGatePassed,
  publicReleaseAuthorized: false,
  artifactCount: artifactEntries.length,
  receiptCount: testReceipts.length
}, null, 2)}\n`);
