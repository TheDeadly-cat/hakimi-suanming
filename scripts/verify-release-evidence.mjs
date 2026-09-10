import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  sha256File,
  verifyReleaseLifecyclePhaseReportBinding
} from "./release-evidence-lib.mjs";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../apps/web/release-protocol.ts";
import {
  isReleaseBrowserCompletionReceiptId,
  isReleaseBrowserReceiptId
} from "../apps/web/playwright.release-browser-result.ts";
import { verifyReleaseBrowserResultSummaryBinding } from "./release-browser-result-evidence.mjs";
import {
  assertReleaseArtifactReceiptBinding,
  buildReleaseArtifactMutationBoundary,
  verifyReleaseArtifactIdentityLock
} from "./release-artifact-identity-lib.mjs";
import { loadReleaseEvidenceSchemaValidator } from "./release-evidence-schema.mjs";

function equal(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} mismatch: ${String(actual)} !== ${String(expected)}`);
}

// The source checkout and an archived copy of its bound files can live separately.
// Only the current supported receipt contract is replayed; this does not infer
// which verifier or toolchain applied to an unidentified historical release.
export async function verifyReleaseEvidenceFiles({
  sourceRoot = process.cwd(),
  boundFilesRoot = sourceRoot,
  inputRelativePath = "dist/web/release-evidence.json",
  receiptsRelativePath = "tmp/release-evidence-receipts",
  allowDirty = false,
  allowUnbound = false
} = {}) {
  const cwd = path.resolve(sourceRoot);
  const filesRoot = path.resolve(boundFilesRoot);
  if (typeof allowDirty !== "boolean" || typeof allowUnbound !== "boolean") {
    throw new Error("Release Evidence diagnostic allowances must be explicit booleans.");
  }
  await assertStableDirectoryPathWithin(cwd, cwd, "Source root");
  await assertStableDirectoryPathWithin(filesRoot, filesRoot, "Bound files root");
  const releaseEvidenceSchemaValidator = await loadReleaseEvidenceSchemaValidator(cwd);
  const input = path.resolve(filesRoot, inputRelativePath);
  const receiptsDirectory = path.resolve(filesRoot, receiptsRelativePath);
  equal(inputRelativePath, relativePathWithin(filesRoot, input, "Release Evidence input"), "Release Evidence input path");
  equal(receiptsRelativePath, relativePathWithin(filesRoot, receiptsDirectory, "Receipt directory"), "Receipt directory path");
  const evidenceSnapshot = await readStableRegularFileSnapshot(input, {
    containmentRoot: filesRoot,
    label: "Release Evidence input"
  });
  const evidenceBytes = evidenceSnapshot.bytes.toString("utf8");
  const evidence = JSON.parse(evidenceBytes);
  releaseEvidenceSchemaValidator.assert(evidence);
  if (evidence.schemaVersion !== 1 || evidence.evidenceType !== "engineering_release_evidence") {
    throw new Error("Unsupported Release Evidence format.");
  }
  const sidecarSnapshot = await readStableRegularFileSnapshot(`${input}.sha256`, {
    containmentRoot: filesRoot,
    label: "Release Evidence sidecar"
  });
  const sidecar = sidecarSnapshot.bytes.toString("utf8").trim().split(/\s+/u)[0];
  equal(sidecar, sha256(evidenceBytes), "Evidence sidecar digest");
  canonicalReleaseChannel(evidence.release?.channel);
  relativePathWithin(filesRoot, receiptsDirectory, "Receipt directory");
  await assertStableDirectoryPathWithin(filesRoot, receiptsDirectory, "Receipt directory");

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
  equal(evidence.source.repository, git.repository, "Git repository");
  equal(evidence.source.branch, git.branch, "Git branch");
  equal(evidence.source.dirty, git.dirty, "Git dirty state");
  equal(evidence.source.untrackedSourceFileCount, git.untrackedSourceFileCount, "Untracked source file count");
  equal(evidence.source.sourceTreeDigest, sourceTreeDigest, "Source tree digest");
  equal(evidence.source.packageLockSha256, lockfileDigest, "Lockfile digest");
  equal(canonicalJson(evidence.toolchain), canonicalJson(releaseToolchain(cwd)), "Release toolchain");

  if (typeof evidence.artifacts?.root !== "string") throw new Error("Artifact root is missing.");
  const dist = path.resolve(filesRoot, evidence.artifacts.root);
  const canonicalArtifactRoot = relativePathWithin(filesRoot, dist, "Artifact root");
  equal(evidence.artifacts.root, canonicalArtifactRoot, "Artifact root");
  const inputRelativeToDist = relativePathWithin(dist, input, "Release Evidence input");
  const built = await readBuiltReleaseMetadata(dist, { containmentRoot: filesRoot });
  equal(canonicalJson(evidence.release.descriptor), canonicalJson(built.descriptor), "Release descriptor");
  equal(evidence.release.manifestVersion, built.manifest.manifestVersion, "Manifest version");
  equal(evidence.release.manifestDigest, built.manifestDigest, "Manifest digest");
  equal(evidence.release.buildVersion, built.buildVersion, "Build version");
  equal(evidence.release.builtEvidenceId, built.evidenceId, "Built evidence id");
  const evidenceIdBound = built.evidenceId === expectedEvidenceId;
  equal(evidence.release.evidenceIdBound, evidenceIdBound, "Evidence binding gate");
  if (!evidenceIdBound && !allowUnbound) throw new Error("Built artifact is not bound to this evidence id.");

  const artifacts = await collectArtifactEntries(
    dist,
    [inputRelativeToDist, `${inputRelativeToDist}.sha256`],
    { containmentRoot: filesRoot }
  );
  equal(evidence.artifacts.count, artifacts.length, "Artifact count");
  equal(evidence.artifacts.artifactSetDigest, sha256(canonicalJson(artifacts)), "Artifact set digest");
  equal(canonicalJson(evidence.artifacts.files), canonicalJson(artifacts), "Artifact file inventory");
  const artifactComponents = releaseArtifactComponents(artifacts);
  if (artifactComponents.applicationShell.sha256 !== built.indexSha256
    || artifactComponents.applicationShell.size !== built.indexSize) {
    throw new Error("Built release metadata and artifact inventory did not use the same stable index bytes.");
  }
  equal(
    canonicalJson(evidence.artifacts.components),
    canonicalJson(artifactComponents),
    "Required release artifact components"
  );
  const requiredArtifactComponentsPresent = true;
  if (typeof evidence.artifacts?.identityLock?.path !== "string") {
    throw new Error("Release artifact identity lock binding is missing.");
  }
  const artifactIdentity = await verifyReleaseArtifactIdentityLock({
    cwd: filesRoot,
    dist,
    lockPath: path.resolve(filesRoot, evidence.artifacts.identityLock.path),
    evidenceId: expectedEvidenceId
  });
  const artifactLockStable = artifactIdentity.artifactSetDigest === sha256(canonicalJson(artifacts));
  equal(evidence.artifacts.identityLock.path, artifactIdentity.lockPath, "Artifact identity lock path");
  equal(evidence.artifacts.identityLock.sha256, artifactIdentity.lockFileSha256, "Artifact identity lock file digest");
  equal(evidence.artifacts.identityLock.lockDigest, artifactIdentity.lock.lockDigest, "Artifact identity lock digest");
  equal(evidence.artifacts.identityLock.artifactSetDigest, artifactIdentity.artifactSetDigest, "Locked artifact set digest");
  equal(evidence.artifacts.identityLock.verified, artifactLockStable, "Artifact identity stability flag");

  const policies = await policyFileEntries(cwd);
  equal(canonicalJson(evidence.policyFiles), canonicalJson(policies), "Policy file inventory");
  const decisions = JSON.parse(await readFile(path.resolve(cwd, "docs/release/web-v1-release-decisions.json"), "utf8"));
  const defaultReleaseDescriptorMatched = defaultV13ReleaseDescriptorMatches({
    channel: evidence.release.channel,
    descriptor: built.descriptor,
    decision: decisions.defaultRelease,
    canonicalDescriptor: BRIDGE_RELEASE_DATABASE_DESCRIPTOR
  });
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
  const recordedReceiptSetMatched = releaseReceiptSetMatchesPolicy(
    evidence.testReceipts,
    policyReceiptIds
  );
  const rawReceiptsById = new Map();
  for (const receipt of evidence.testReceipts) {
    const receiptPath = path.resolve(filesRoot, receipt.path);
    relativePathWithin(receiptsDirectory, receiptPath, `Receipt ${receipt.id}`);
    equal(receipt.path, relativePathWithin(filesRoot, receiptPath, `Receipt ${receipt.id}`), `Receipt ${receipt.id} path`);
    const rawSnapshot = await readStableRegularFileSnapshot(receiptPath, {
      containmentRoot: receiptsDirectory,
      label: `Receipt ${receipt.id}`
    });
    equal(receipt.sha256, rawSnapshot.sha256, `Receipt ${receipt.id} digest`);
    const raw = JSON.parse(rawSnapshot.bytes.toString("utf8"));
    equal(raw.schemaVersion, 1, `Receipt ${receipt.id} schema version`);
    equal(raw.receiptType, "release_test_command", `Receipt ${receipt.id} type`);
    rawReceiptsById.set(receipt.id, raw);
    equal(raw.id, receipt.id, `Receipt ${receipt.id} identity`);
    equal(raw.evidenceId, receipt.evidenceId, `Receipt ${receipt.id} evidence identity`);
    equal(receipt.evidenceId, expectedEvidenceId, `Receipt ${receipt.id} source binding`);
    equal(raw.status, receipt.status, `Receipt ${receipt.id} status`);
    equal(raw.exitCode, receipt.exitCode, `Receipt ${receipt.id} exit code`);
    equal(canonicalJson(raw.command), canonicalJson(receipt.command), `Receipt ${receipt.id} command`);
    equal(raw.startedAt, receipt.startedAt, `Receipt ${receipt.id} start time`);
    equal(raw.completedAt, receipt.completedAt, `Receipt ${receipt.id} completion time`);
    equal(raw.durationMs, receipt.durationMs, `Receipt ${receipt.id} duration`);
    await verifyReleaseLifecyclePhaseReportBinding({ cwd: filesRoot, sourceRoot: cwd, receiptsDirectory, receipt: raw });
    const browserResultSummary = await verifyReleaseBrowserResultSummaryBinding({
      cwd: filesRoot,
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
  equal(
    canonicalJson(evidence.artifacts.mutationBoundary),
    canonicalJson(artifactMutationBoundary),
    "Artifact mutation boundary"
  );
  const artifactIdentityStable = artifactLockStable
    && artifactMutationBoundary.endpointSnapshotsMatched;
  const requiredReceiptsPresent = requiredReceiptIds.length > 0
    && requiredReceiptIds.every((id) => evidence.testReceipts.some((receipt) => receipt.id === id && receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0));
  const allRecordedReceiptsPassed = evidence.testReceipts.length > 0
    && evidence.testReceipts.every((receipt) => receipt.evidenceId === expectedEvidenceId && receipt.status === "passed" && receipt.exitCode === 0);
  const policyReceiptCommandsMatched = policyReceiptIds.every((id) => {
    const receipt = evidence.testReceipts.find((entry) => entry.id === id);
    return receipt && canonicalJson(receipt.command) === canonicalJson(policyReceiptCommands[id]);
  });
  const browserResultSummariesMatched = policyReceiptIds
    .filter(isReleaseBrowserCompletionReceiptId)
    .every((id) => evidence.testReceipts.some((receipt) =>
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
  equal(evidence.gates.sourceTreeClean, !git.dirty, "Clean source gate");
  equal(evidence.gates.evidenceIdBound, evidenceIdBound, "Bound evidence gate");
  equal(evidence.gates.defaultReleaseDescriptorMatched, defaultReleaseDescriptorMatched, "Default release descriptor gate");
  equal(evidence.gates.requiredReceiptsPresent, requiredReceiptsPresent, "Required receipts gate");
  equal(evidence.gates.allRecordedReceiptsPassed, allRecordedReceiptsPassed, "All receipts gate");
  equal(evidence.gates.policyReceiptSetMatched, policyReceiptSetMatched, "Receipt policy set gate");
  equal(evidence.gates.recordedReceiptSetMatched, recordedReceiptSetMatched, "Recorded receipt set gate");
  equal(evidence.gates.policyReceiptCommandsMatched, policyReceiptCommandsMatched, "Receipt command policy gate");
  equal(evidence.gates.browserResultSummariesMatched, browserResultSummariesMatched, "Browser result summary gate");
  equal(evidence.gates.artifactIdentityStable, artifactIdentityStable, "Artifact identity stability gate");
  equal(
    evidence.gates.requiredArtifactComponentsPresent,
    requiredArtifactComponentsPresent,
    "Required artifact components gate"
  );
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
  if (!allowanceScopedEngineeringGatePassed) {
    throw new Error("Formal Release Evidence did not satisfy the complete default-v13 engineering receipt policy.");
  }

  const verificationReceipt = {
    schemaVersion: 1,
    receiptType: "formal_release_evidence_verification",
    receiptId: `formal-${evidence.evidenceId}`,
    summaryType: "formal_release_evidence_verification_v1",
    verificationKind: "formal-current-source-and-artifact",
    releaseEvidenceId: evidence.evidenceId,
    status: engineeringGatePassed ? "passed" : "diagnostic_only",
    verifiedAt: new Date().toISOString(),
    evidenceId: evidence.evidenceId,
    releaseEvidence: {
      path: relativePathWithin(filesRoot, input, "Release Evidence input"),
      sha256: sha256(evidenceBytes)
    },
    release: {
      descriptor: evidence.release.descriptor,
      manifestVersion: evidence.release.manifestVersion,
      manifestDigest: evidence.release.manifestDigest,
      buildVersion: evidence.release.buildVersion
    },
    artifacts: {
      root: canonicalArtifactRoot,
      count: artifacts.length,
      artifactSetDigest: evidence.artifacts.artifactSetDigest,
      identityLock: {
        path: artifactIdentity.lockPath,
        sha256: artifactIdentity.lockFileSha256,
        lockDigest: artifactIdentity.lock.lockDigest,
        artifactSetDigest: artifactIdentity.artifactSetDigest
      },
      mutationBoundary: artifactMutationBoundary
    },
    receiptCount: evidence.testReceipts.length,
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
      engineeringGatePassed
    },
    formalReleaseEvidenceVerified: engineeringGatePassed,
    claims: {
      engineeringEvidenceOnly: true,
      sourceAndArtifactCurrentVerified: engineeringGatePassed,
      codeSignature: false,
      browserRuntimeBeyondBoundReceiptsVerified: false,
      publicReleaseAuthorized: false
    }
  };
  return Object.freeze({
    scope: Object.freeze({
      sourceRoot: cwd,
      boundFilesRoot: filesRoot,
      contract: "current-supported-release-evidence",
      historicalApplicabilityAssessed: false
    }),
    evidence,
    evidenceSha256: evidenceSnapshot.sha256,
    artifactIdentity,
    gates: verificationReceipt.gates,
    // Archive replay never issues a replacement for a historical formal receipt.
    verificationReceipt: filesRoot === cwd ? verificationReceipt : null
  });
}

async function main() {
  const flags = parseCli(process.argv.slice(2));
  const cwd = process.cwd();
  const input = path.resolve(String(flags.get("input") ?? "dist/web/release-evidence.json"));
  const receiptsDirectory = path.resolve(String(flags.get("receipts") ?? "tmp/release-evidence-receipts"));
  const outputFlag = flags.get("output");
  if (outputFlag === true) throw new Error("--output requires a path.");
  const verificationReceiptOutput = typeof outputFlag === "string"
    ? path.resolve(cwd, outputFlag)
    : null;
  const result = await verifyReleaseEvidenceFiles({
    sourceRoot: cwd,
    inputRelativePath: relativePathWithin(cwd, input, "Release Evidence input"),
    receiptsRelativePath: relativePathWithin(cwd, receiptsDirectory, "Receipt directory"),
    allowDirty: flags.get("allow-dirty") === true,
    allowUnbound: flags.get("allow-unbound") === true
  });
  const verificationReceipt = result.verificationReceipt;
  const dist = path.resolve(cwd, result.evidence.artifacts.root);
  if (verificationReceiptOutput !== null) {
    relativePathWithin(cwd, verificationReceiptOutput, "Formal verification receipt output");
    const outputRelativeToArtifact = path.relative(dist, verificationReceiptOutput);
    if (
      outputRelativeToArtifact === ""
      || (!outputRelativeToArtifact.startsWith(`..${path.sep}`)
        && outputRelativeToArtifact !== ".."
        && !path.isAbsolute(outputRelativeToArtifact))
    ) {
      throw new Error("Formal verification receipt must be stored outside the artifact root.");
    }
    await mkdir(path.dirname(verificationReceiptOutput), { recursive: true });
    await writeFile(
      verificationReceiptOutput,
      `${JSON.stringify(verificationReceipt, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" }
    );
  }
  process.stdout.write(`${JSON.stringify(verificationReceipt, null, 2)}\n`);
}

if (typeof import.meta.main !== "boolean") {
  throw new Error("Release Evidence verifier requires the repository-pinned Node runtime.");
}
if (import.meta.main) {
  await main();
}
