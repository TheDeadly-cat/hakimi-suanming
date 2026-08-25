import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalReleaseChannel,
  canonicalJson,
  collectArtifactEntries,
  computeEvidenceId,
  computeSourceTreeDigest,
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

function equal(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} mismatch: ${String(actual)} !== ${String(expected)}`);
}

const flags = parseCli(process.argv.slice(2));
const cwd = process.cwd();
const input = path.resolve(String(flags.get("input") ?? "dist/web/release-evidence.json"));
const receiptsDirectory = path.resolve(String(flags.get("receipts") ?? "tmp/release-evidence-receipts"));
const allowDirty = flags.get("allow-dirty") === true;
const allowUnbound = flags.get("allow-unbound") === true;
const evidenceBytes = await readFile(input, "utf8");
const evidence = JSON.parse(evidenceBytes);
if (evidence.schemaVersion !== 1 || evidence.evidenceType !== "engineering_release_evidence") {
  throw new Error("Unsupported Release Evidence format.");
}
const sidecar = (await readFile(`${input}.sha256`, "utf8")).trim().split(/\s+/u)[0];
equal(sidecar, sha256(evidenceBytes), "Evidence sidecar digest");
canonicalReleaseChannel(evidence.release?.channel);
relativePathWithin(cwd, receiptsDirectory, "Receipt directory");

const git = readGitState(cwd);
if (git.dirty && !allowDirty) throw new Error("Formal Release Evidence verification requires a clean source tree.");
const sourceTreeDigest = await computeSourceTreeDigest(cwd);
const lockfileDigest = await sha256File(path.resolve(cwd, "package-lock.json"));
const expectedEvidenceId = computeEvidenceId({
  gitCommit: git.commit,
  sourceTreeDigest,
  lockfileDigest,
  channel: evidence.release.channel
});
equal(evidence.evidenceId, expectedEvidenceId, "Evidence id");
equal(evidence.source.commit, git.commit, "Git commit");
equal(evidence.source.dirty, git.dirty, "Git dirty state");
equal(evidence.source.untrackedSourceFileCount, git.untrackedSourceFileCount, "Untracked source file count");
equal(evidence.source.sourceTreeDigest, sourceTreeDigest, "Source tree digest");
equal(evidence.source.packageLockSha256, lockfileDigest, "Lockfile digest");

if (typeof evidence.artifacts?.root !== "string") throw new Error("Artifact root is missing.");
const dist = path.resolve(cwd, evidence.artifacts.root);
const canonicalArtifactRoot = relativePathWithin(cwd, dist, "Artifact root");
equal(evidence.artifacts.root, canonicalArtifactRoot, "Artifact root");
const inputRelativeToDist = relativePathWithin(dist, input, "Release Evidence input");
const built = await readBuiltReleaseMetadata(dist);
equal(canonicalJson(evidence.release.descriptor), canonicalJson(built.descriptor), "Release descriptor");
equal(evidence.release.manifestVersion, built.manifest.manifestVersion, "Manifest version");
equal(evidence.release.manifestDigest, built.manifestDigest, "Manifest digest");
equal(evidence.release.buildVersion, built.buildVersion, "Build version");
equal(evidence.release.builtEvidenceId, built.evidenceId, "Built evidence id");
const evidenceIdBound = built.evidenceId === expectedEvidenceId;
equal(evidence.release.evidenceIdBound, evidenceIdBound, "Evidence binding gate");
if (!evidenceIdBound && !allowUnbound) throw new Error("Built artifact is not bound to this evidence id.");

const artifacts = await collectArtifactEntries(dist, [inputRelativeToDist, `${inputRelativeToDist}.sha256`]);
equal(evidence.artifacts.artifactSetDigest, sha256(canonicalJson(artifacts)), "Artifact set digest");
equal(canonicalJson(evidence.artifacts.files), canonicalJson(artifacts), "Artifact file inventory");

const policies = await policyFileEntries(cwd);
equal(canonicalJson(evidence.policyFiles), canonicalJson(policies), "Policy file inventory");
const decisions = JSON.parse(await readFile(path.resolve(cwd, "docs/release/web-v1-release-decisions.json"), "utf8"));
const defaultReleaseDescriptorMatched = evidence.release.channel === "default-v13"
  && built.descriptor.dbGeneration === decisions.defaultRelease.dbGeneration
  && built.descriptor.targetSchema === decisions.defaultRelease.targetSchema
  && built.descriptor.migrationId === decisions.defaultRelease.migrationId;
const policyReceiptCommands = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
if (!policyReceiptCommands || typeof policyReceiptCommands !== "object" || Array.isArray(policyReceiptCommands)) {
  throw new Error("Default v13 release receipt policy is missing.");
}
if (!Array.isArray(evidence.release.requiredReceiptIds)) throw new Error("Required receipt id list is missing.");
const requiredReceiptIds = [...evidence.release.requiredReceiptIds].sort();
if (new Set(requiredReceiptIds).size !== requiredReceiptIds.length || requiredReceiptIds.some((id) => !/^[a-z0-9][a-z0-9-]*$/u.test(id))) {
  throw new Error("Required receipt id list is malformed.");
}
equal(canonicalJson(evidence.release.requiredReceiptIds), canonicalJson(requiredReceiptIds), "Required receipt id ordering");
const policyReceiptIds = Object.keys(policyReceiptCommands).sort();
const policyReceiptSetMatched = canonicalJson(requiredReceiptIds) === canonicalJson(policyReceiptIds);
for (const receipt of evidence.testReceipts) {
  const receiptPath = path.resolve(cwd, receipt.path);
  relativePathWithin(receiptsDirectory, receiptPath, `Receipt ${receipt.id}`);
  equal(receipt.path, relativePathWithin(cwd, receiptPath, `Receipt ${receipt.id}`), `Receipt ${receipt.id} path`);
  equal(receipt.sha256, await sha256File(receiptPath), `Receipt ${receipt.id} digest`);
  const raw = JSON.parse(await readFile(receiptPath, "utf8"));
  equal(raw.id, receipt.id, `Receipt ${receipt.id} identity`);
  equal(raw.evidenceId, receipt.evidenceId, `Receipt ${receipt.id} evidence identity`);
  equal(receipt.evidenceId, expectedEvidenceId, `Receipt ${receipt.id} source binding`);
  equal(raw.status, receipt.status, `Receipt ${receipt.id} status`);
  equal(raw.exitCode, receipt.exitCode, `Receipt ${receipt.id} exit code`);
  equal(canonicalJson(raw.command), canonicalJson(receipt.command), `Receipt ${receipt.id} command`);
  const browserResultSummary = await verifyReleaseBrowserResultSummaryBinding({
    cwd,
    receiptsDirectory,
    receipt: raw
  });
  equal(
    canonicalJson(receipt.browserResultSummary),
    canonicalJson(browserResultSummary),
    `Receipt ${receipt.id} browser result summary`
  );
  if (receipt.status !== "passed" || receipt.exitCode !== 0) throw new Error(`Receipt did not pass: ${receipt.id}`);
}
const requiredReceiptsPresent = requiredReceiptIds.length > 0
  && requiredReceiptIds.every((id) => evidence.testReceipts.some((receipt) => receipt.id === id && receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0));
const allRecordedReceiptsPassed = evidence.testReceipts.length > 0
  && evidence.testReceipts.every((receipt) => receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0);
const policyReceiptCommandsMatched = policyReceiptIds.every((id) => {
  const receipt = evidence.testReceipts.find((entry) => entry.id === id);
  return receipt && canonicalJson(receipt.command) === canonicalJson(policyReceiptCommands[id]);
});
const browserResultSummariesMatched = policyReceiptIds
  .filter(isReleaseBrowserReceiptId)
  .every((id) => evidence.testReceipts.some((receipt) =>
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
equal(evidence.gates.sourceTreeClean, !git.dirty, "Clean source gate");
equal(evidence.gates.evidenceIdBound, evidenceIdBound, "Bound evidence gate");
equal(evidence.gates.defaultReleaseDescriptorMatched, defaultReleaseDescriptorMatched, "Default release descriptor gate");
equal(evidence.gates.requiredReceiptsPresent, requiredReceiptsPresent, "Required receipts gate");
equal(evidence.gates.allRecordedReceiptsPassed, allRecordedReceiptsPassed, "All receipts gate");
equal(evidence.gates.policyReceiptSetMatched, policyReceiptSetMatched, "Receipt policy set gate");
equal(evidence.gates.policyReceiptCommandsMatched, policyReceiptCommandsMatched, "Receipt command policy gate");
equal(evidence.gates.browserResultSummariesMatched, browserResultSummariesMatched, "Browser result summary gate");
equal(evidence.gates.engineeringGatePassed, engineeringGatePassed, "Engineering gate");
equal(evidence.gates.releaseHistoryOwnerConfirmed, decisions.releaseHistory.status === "owner_confirmed", "Release history gate");
equal(evidence.gates.hostingSecurityVerified, decisions.hosting.securityHeadersVerified === true, "Hosting security gate");
equal(evidence.gates.publicDeploymentAuthorized, decisions.hosting.publicDeploymentAuthorized === true, "Public deployment gate");
equal(evidence.gates.licenseOwnerSelectionRecorded, decisions.licensing.ownerFinalSelectionRecorded === true, "License selection gate");
equal(evidence.gates.expertClaimsAuthorized, decisions.domainClaims.expertValidatedClaimAuthorized === true, "Expert claims gate");
if (evidence.claims.engineeringEvidenceOnly !== true) throw new Error("Evidence must remain engineering-only.");
if (
  evidence.claims.codeSignature !== false ||
  evidence.claims.expertSignature !== false ||
  evidence.claims.contentRightsGrant !== false ||
  evidence.claims.publicReleaseAuthorized !== false
) {
  throw new Error("Engineering evidence cannot claim expert signature or content rights.");
}
if (!allowDirty && !allowUnbound && !engineeringGatePassed) {
  throw new Error("Formal Release Evidence did not satisfy the complete default-v13 engineering receipt policy.");
}

process.stdout.write(`${JSON.stringify({
  evidenceId: evidence.evidenceId,
  sourceTreeDigest,
  artifactCount: artifacts.length,
  receiptCount: evidence.testReceipts.length,
  sourceTreeClean: !git.dirty,
  defaultReleaseDescriptorMatched,
  policyReceiptSetMatched,
  policyReceiptCommandsMatched,
  engineeringGatePassed,
  publicReleaseAuthorized: evidence.claims.publicReleaseAuthorized
}, null, 2)}\n`);
