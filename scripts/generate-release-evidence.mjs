import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  canonicalReleaseChannel,
  canonicalJson,
  collectArtifactEntries,
  computeEvidenceId,
  computeSourceTreeDigest,
  detectBrowserVersions,
  npmVersion,
  parseCli,
  policyFileEntries,
  readBuiltReleaseMetadata,
  readGitState,
  relativePathWithin,
  sha256,
  sha256File
} from "./release-evidence-lib.mjs";
import { isReleaseBrowserReceiptId } from "../apps/web/playwright.release-browser-result.ts";
import { verifyReleaseBrowserResultSummaryBinding } from "./release-browser-result-evidence.mjs";

const flags = parseCli(process.argv.slice(2));
const cwd = process.cwd();
const channel = canonicalReleaseChannel(flags.get("channel") ?? "default-v13");
const dist = path.resolve(String(flags.get("dist") ?? "dist/web"));
const receiptsDirectory = path.resolve(String(flags.get("receipts") ?? "tmp/release-evidence-receipts"));
const output = path.resolve(String(flags.get("output") ?? path.join(dist, "release-evidence.json")));
const allowDirty = flags.get("allow-dirty") === true;
const allowUnbound = flags.get("allow-unbound") === true;
const releaseLabel = String(flags.get("release-label") ?? process.env.HAKIMI_RELEASE_LABEL ?? "unlabeled-local-candidate");
if (!releaseLabel.trim() || releaseLabel.length > 120 || /[\u0000-\u001f\u007f]/u.test(releaseLabel)) {
  throw new Error("Release label is empty, too long, or contains control characters.");
}
const requiredReceiptIds = String(flags.get("require-receipts") ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean).sort();
if (new Set(requiredReceiptIds).size !== requiredReceiptIds.length) throw new Error("Required receipt ids are duplicated.");
if (requiredReceiptIds.some((id) => !/^[a-z0-9][a-z0-9-]*$/u.test(id))) {
  throw new Error("A required receipt id is not canonical.");
}
relativePathWithin(cwd, dist, "Artifact root");
relativePathWithin(cwd, receiptsDirectory, "Receipt directory");
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
const built = await readBuiltReleaseMetadata(dist);
const evidenceIdBound = built.evidenceId === expectedEvidenceId;
if (!evidenceIdBound && !allowUnbound) {
  throw new Error(`Built evidence id ${built.evidenceId} does not match ${expectedEvidenceId}.`);
}
const decisions = JSON.parse(await readFile(path.resolve(cwd, "docs/release/web-v1-release-decisions.json"), "utf8"));
const defaultReleaseDescriptorMatched = channel === "default-v13"
  && built.descriptor.dbGeneration === decisions.defaultRelease.dbGeneration
  && built.descriptor.targetSchema === decisions.defaultRelease.targetSchema
  && built.descriptor.migrationId === decisions.defaultRelease.migrationId;
if (channel === "default-v13" && !defaultReleaseDescriptorMatched) {
  throw new Error("The default-v13 evidence channel is bound to a non-default database descriptor.");
}
const policyReceiptCommands = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
if (!policyReceiptCommands || typeof policyReceiptCommands !== "object" || Array.isArray(policyReceiptCommands)) {
  throw new Error("Default v13 release receipt policy is missing.");
}
const policyReceiptIds = Object.keys(policyReceiptCommands).sort();

let receiptNames = [];
try {
  receiptNames = (await readdir(receiptsDirectory)).filter((name) => name.endsWith(".json")).sort();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const testReceipts = [];
for (const name of receiptNames) {
  const receiptPath = path.join(receiptsDirectory, name);
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
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
    sha256: await sha256File(receiptPath)
  });
}
for (const id of requiredReceiptIds) {
  const receipt = testReceipts.find((entry) => entry.id === id);
  if (!receipt) throw new Error(`Required release receipt is missing: ${id}`);
  if (receipt.status !== "passed" || receipt.exitCode !== 0) throw new Error(`Required release receipt failed: ${id}`);
}

const excludedArtifacts = [outputRelativeToDist, `${outputRelativeToDist}.sha256`];
const artifactEntries = await collectArtifactEntries(dist, excludedArtifacts);
const policies = await policyFileEntries(cwd);
const requiredReceiptsPresent = requiredReceiptIds.length > 0
  && requiredReceiptIds.every((id) => testReceipts.some((receipt) => receipt.id === id && receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0));
const allRecordedReceiptsPassed = testReceipts.length > 0
  && testReceipts.every((receipt) => receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0);
const policyReceiptSetMatched = canonicalJson(requiredReceiptIds) === canonicalJson(policyReceiptIds);
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
  && policyReceiptCommandsMatched
  && browserResultSummariesMatched;
if (!allowDirty && !allowUnbound && !engineeringGatePassed) {
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
  toolchain: {
    node: process.version,
    npm: npmVersion(cwd),
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    browsers: detectBrowserVersions()
  },
  policyFiles: policies,
  testReceipts,
  artifacts: {
    root: path.relative(cwd, dist).replaceAll("\\", "/"),
    count: artifactEntries.length,
    artifactSetDigest: sha256(canonicalJson(artifactEntries)),
    files: artifactEntries
  },
  gates: {
    sourceTreeClean: !git.dirty,
    evidenceIdBound,
    defaultReleaseDescriptorMatched,
    requiredReceiptsPresent,
    allRecordedReceiptsPassed,
    policyReceiptSetMatched,
    policyReceiptCommandsMatched,
    browserResultSummariesMatched,
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
  policyReceiptCommandsMatched: evidence.gates.policyReceiptCommandsMatched,
  engineeringGatePassed,
  publicReleaseAuthorized: false,
  artifactCount: artifactEntries.length,
  receiptCount: testReceipts.length
}, null, 2)}\n`);
