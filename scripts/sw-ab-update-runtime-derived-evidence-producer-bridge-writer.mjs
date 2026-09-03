import { randomBytes } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-loader.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-loader.mjs";
import {
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RECORD_TYPE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE,
  assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles,
  assertExactSwAbRuntimeDerivedEvidenceProducerBridgePendingFileSet,
  assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable,
  buildSwAbRuntimeDerivedEvidenceProducerBridgeResult,
  comparableSwAbRuntimeDerivedEvidenceProducerBridgePath,
  derivedSwAbRuntimeEvidenceBinding,
  failSwAbRuntimeDerivedEvidenceProducerBridge,
  finalizeSwAbRuntimeDerivedEvidenceProducerBridgePublication,
  holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile,
  requireSwAbRuntimeDerivedEvidenceProducerBridgeInput,
  swAbRuntimeDerivedEvidenceProducerBridgeTerminalCommitMarkerBytes,
  validateSwAbRuntimeDerivedEvidenceProducerBridgePublication
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  holdSwAbRuntimeDerivedEvidenceProducerBridgeOwnSources,
  resolveSwAbRuntimeDerivedEvidenceProducerBridgeInput,
  withVerifiedSwAbRuntimeDerivedEvidenceProducerBridgeCheckpoint
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs";

const DEFAULT_DEPENDENCIES = Object.freeze({
  readFile,
  rename,
  randomBytes,
  now: () => Date.now(),
  loadIssuance: loadVerifiedSwAbUpdateRuntimeCollectorIssuance,
  loadTranscript: loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle,
  beforeCheckpointVerification: async () => undefined,
  afterCheckpointVerification: async () => undefined,
  beforeStagingWrite: async () => undefined,
  beforeRename: async () => undefined,
  afterRename: async () => undefined,
  afterFinalVerification: async () => undefined,
  beforeTerminalCommit: async () => undefined
});

async function closeHeld(heldFiles) {
  for (let index = heldFiles.length - 1; index >= 0; index -= 1) {
    try {
      await heldFiles[index].handle.close();
    } catch {
      // Terminal cleanup must never turn a completed marker rename into a failed publication.
    }
  }
}

function canonicalFileBytes(value) {
  return Buffer.from(`${canonicalJson(value)}\n`, "utf8");
}

async function assertPathAbsent(target, label) {
  try {
    await lstat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  failSwAbRuntimeDerivedEvidenceProducerBridge(
    "FINAL_ALREADY_EXISTS",
    "filesystem",
    `${label} already exists; overwrite, continuation, and repair are forbidden.`
  );
}

async function writeAll(handle, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const { bytesWritten } = await handle.write(bytes, offset, bytes.length - offset, offset);
    if (bytesWritten <= 0) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "WRITE_INCOMPLETE", "publication", "Exclusive bridge output write made no progress."
      );
    }
    offset += bytesWritten;
  }
}

async function writeExclusiveSynced(filePath, bytes) {
  const handle = await open(filePath, "wx+", 0o600);
  try {
    await writeAll(handle, bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function captureDirectoryIdentity(directoryPath) {
  const [stat, physical] = await Promise.all([
    lstat(directoryPath, { bigint: true }),
    realpath(directoryPath)
  ]);
  if (
    !stat.isDirectory()
    || stat.isSymbolicLink()
    || comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(physical)
      !== comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(directoryPath)
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "DIRECTORY_INVALID", "filesystem", "Bridge staging/final root must be one real directory."
    );
  }
  return Object.freeze({
    dev: String(stat.dev),
    ino: String(stat.ino),
    birthtimeNs: String(stat.birthtimeNs)
  });
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.birthtimeNs === right.birthtimeNs;
}

async function publishWithDependencies(rawArgs, dependencies) {
  const input = requireSwAbRuntimeDerivedEvidenceProducerBridgeInput(
    rawArgs,
    "publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge"
  );
  const resolved = await resolveSwAbRuntimeDerivedEvidenceProducerBridgeInput(input, "writer");
  await assertPathAbsent(resolved.bridgeRoot, "bridgeRoot");
  const ownSources = await holdSwAbRuntimeDerivedEvidenceProducerBridgeOwnSources(resolved);
  const finalHeld = [];
  const pendingCommitHeld = [];
  let checkpointCount = 0;
  let published;
  let stagingRoot;
  let stagingIdentity;
  try {
    const issuanceLoaded = await dependencies.loadIssuance({
      cwd: resolved.cwd,
      bindingRoot: resolved.bindingRoot,
      runRoot: resolved.issuanceRunRoot,
      onHeldEpochCheckpoint: async (checkpoint) => {
        checkpointCount += 1;
        if (checkpointCount !== 1) {
          failSwAbRuntimeDerivedEvidenceProducerBridge(
            "CHECKPOINT_COUNT_INVALID", "checkpoint", "Issuance checkpoint ran more than once."
          );
        }
        published = await withVerifiedSwAbRuntimeDerivedEvidenceProducerBridgeCheckpoint({
          resolved,
          checkpoint,
          ownSources,
          dependencies,
          onVerified: async (context) => {
            const evidenceBytes = canonicalFileBytes(context.reconstructed.evidence);
            const evidenceBinding = derivedSwAbRuntimeEvidenceBinding(
              evidenceBytes,
              context.reconstructed.evidence
            );
            const publishedAtValue = dependencies.now();
            if (!Number.isFinite(publishedAtValue)) {
              failSwAbRuntimeDerivedEvidenceProducerBridge(
                "TIME_INVALID", "publication", "publishedAt clock returned a non-finite value."
              );
            }
            const publication = finalizeSwAbRuntimeDerivedEvidenceProducerBridgePublication({
              schemaVersion: 1,
              recordType: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RECORD_TYPE,
              producerBridgeStatus: ownSources.policy.producerBridgeStatus,
              evidenceClass: ownSources.policy.evidenceClass,
              trustClass: ownSources.policy.terminalState.trustClass,
              status: ownSources.policy.status,
              executionAdmission: ownSources.policy.executionAdmission,
              usableForRuntimeEvidence: false,
              usableForCandidateAssembly: false,
              formalReleaseEvidenceReceipt: false,
              strictGatePassed: false,
              runtimeAdmissionPassed: false,
              admissionPassed: false,
              usableForAdmission: false,
              publishedAt: new Date(publishedAtValue).toISOString(),
              releaseIdentity: structuredClone(ownSources.policy.releaseIdentity),
              capabilities: structuredClone(ownSources.policy.capabilities),
              issuanceBinding: structuredClone(context.issuanceBinding),
              transcriptBinding: structuredClone(context.transcriptBinding),
              derivedEvidenceBinding: structuredClone(evidenceBinding),
              sourceBindings: structuredClone(context.sourceBindings),
              sourceSetDigest: sha256(canonicalJson(context.sourceBindings)),
              publicationBoundary: structuredClone(ownSources.policy.publicationBoundary),
              mutationBoundary: structuredClone(ownSources.policy.mutationBoundary),
              provenance: structuredClone(ownSources.policy.provenance),
              authority: structuredClone(ownSources.policy.authority),
              attempts: structuredClone(ownSources.policy.attempts),
              bridgeId: "",
              publicationDigest: "",
              cliExitCode: 1
            });
            validateSwAbRuntimeDerivedEvidenceProducerBridgePublication({
              publication,
              policy: ownSources.policy,
              schemaValidator: ownSources.schemaValidator,
              expectedIssuanceBinding: context.issuanceBinding,
              expectedTranscriptBinding: context.transcriptBinding,
              expectedDerivedEvidenceBinding: evidenceBinding,
              expectedSourceBindings: context.sourceBindings
            });
            const publicationBytes = canonicalFileBytes(publication);
            const terminalCommitMarkerBytes =
              swAbRuntimeDerivedEvidenceProducerBridgeTerminalCommitMarkerBytes(
                publication.publicationDigest
              );
            await dependencies.beforeStagingWrite({ resolved, context, publication });
            await assertPathAbsent(resolved.bridgeRoot, "bridgeRoot");
            const suffix = dependencies.randomBytes(16).toString("hex");
            stagingRoot = path.join(
              resolved.bridgeParent,
              `.${path.basename(resolved.bridgeRoot)}.staging-${suffix}`
            );
            await mkdir(stagingRoot, { recursive: false, mode: 0o700 });
            stagingIdentity = await captureDirectoryIdentity(stagingRoot);
            const evidenceStagingPath = path.join(
              stagingRoot,
              SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE
            );
            const publicationStagingPath = path.join(
              stagingRoot,
              SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE
            );
            const pendingCommitStagingPath = path.join(
              stagingRoot,
              SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE
            );
            await writeExclusiveSynced(evidenceStagingPath, evidenceBytes);
            await writeExclusiveSynced(publicationStagingPath, publicationBytes);
            await writeExclusiveSynced(pendingCommitStagingPath, terminalCommitMarkerBytes);
            await assertExactSwAbRuntimeDerivedEvidenceProducerBridgePendingFileSet(stagingRoot);
            const stagingHeld = [];
            try {
              for (const fileName of [
                SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
                SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
                SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE
              ]) {
                stagingHeld.push(await holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
                  bindingRoot: stagingRoot,
                  filePath: path.join(stagingRoot, fileName),
                  relativePath: fileName,
                  label: `staging bridge output ${fileName}`
                }));
              }
              if (
                !stagingHeld[0].bytes.equals(evidenceBytes)
                || !stagingHeld[1].bytes.equals(publicationBytes)
                || !stagingHeld[2].bytes.equals(terminalCommitMarkerBytes)
              ) {
                failSwAbRuntimeDerivedEvidenceProducerBridge(
                  "STAGING_BYTES_CHANGED", "publication", "Staging bytes drifted before commit."
                );
              }
              assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles([
                ...ownSources.held,
                ...context.transcriptHeld,
                ...stagingHeld
              ]);
              for (const held of stagingHeld) {
                await assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(held);
              }
            } finally {
              await closeHeld(stagingHeld);
            }
            await dependencies.beforeRename({
              resolved,
              stagingRoot,
              evidenceStagingPath,
              publicationStagingPath,
              pendingCommitStagingPath,
              publication
            });
            await assertPathAbsent(resolved.bridgeRoot, "bridgeRoot");
            await dependencies.rename(stagingRoot, resolved.bridgeRoot);
            await dependencies.afterRename({
              resolved,
              stagingRoot,
              evidencePath: path.join(
                resolved.bridgeRoot,
                SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE
              ),
              publicationPath: path.join(
                resolved.bridgeRoot,
                SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE
              ),
              pendingCommitPath: path.join(
                resolved.bridgeRoot,
                SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE
              ),
              publication
            });
            const finalIdentity = await captureDirectoryIdentity(resolved.bridgeRoot);
            if (!sameDirectoryIdentity(stagingIdentity, finalIdentity)) {
              failSwAbRuntimeDerivedEvidenceProducerBridge(
                "RENAME_IDENTITY_CHANGED", "publication", "Final root is not the renamed staging directory."
              );
            }
            await assertExactSwAbRuntimeDerivedEvidenceProducerBridgePendingFileSet(
              resolved.bridgeRoot
            );
            for (const fileName of [
              SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
              SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE
            ]) {
              finalHeld.push(await holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
                bindingRoot: resolved.bridgeRoot,
                filePath: path.join(resolved.bridgeRoot, fileName),
                relativePath: fileName,
                label: `final bridge output ${fileName}`
              }));
            }
            pendingCommitHeld.push(
              await holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
                bindingRoot: resolved.bridgeRoot,
                filePath: path.join(
                  resolved.bridgeRoot,
                  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE
                ),
                relativePath:
                  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE,
                label: "pending bridge terminal commit marker"
              })
            );
            if (
              !finalHeld[0].bytes.equals(evidenceBytes)
              || !finalHeld[1].bytes.equals(publicationBytes)
              || !pendingCommitHeld[0].bytes.equals(terminalCommitMarkerBytes)
            ) {
              failSwAbRuntimeDerivedEvidenceProducerBridge(
                "FINAL_BYTES_CHANGED", "publication", "Final bridge bytes drifted after rename."
              );
            }
            assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles([
              ...ownSources.held,
              ...context.transcriptHeld,
              ...finalHeld,
              ...pendingCommitHeld
            ]);
            for (const held of finalHeld) {
              await assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(held);
            }
            await assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(
              pendingCommitHeld[0]
            );
            await dependencies.afterFinalVerification({
              resolved,
              context,
              publication,
              finalHeld
            });
            return Object.freeze({
              publication,
              evidenceBinding,
              projection: context.reconstructed.projection,
              terminalCommitMarkerBytes
            });
          }
        });
      }
    });
    if (checkpointCount !== 1 || !published) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "CHECKPOINT_COUNT_INVALID", "checkpoint", "Issuance checkpoint did not run exactly once."
      );
    }
    const publication = published.publication;
    if (
      issuanceLoaded.result.runId !== publication.issuanceBinding.runId
      || issuanceLoaded.result.attemptId !== publication.issuanceBinding.attemptId
      || issuanceLoaded.result.issuanceId !== publication.issuanceBinding.issuanceId
      || issuanceLoaded.result.receiptDigest !== publication.issuanceBinding.receiptDigest
      || issuanceLoaded.result.bundleId !== publication.transcriptBinding.bundleId
      || issuanceLoaded.result.bundleDigest !== publication.transcriptBinding.bundleDigest
      || issuanceLoaded.result.derivedEvidenceDigest !== publication.derivedEvidenceBinding.semanticDigest
    ) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "TERMINAL_ISSUANCE_DRIFT", "issuance", "Terminal issuance result drifted after publication."
      );
    }
    await assertExactSwAbRuntimeDerivedEvidenceProducerBridgePendingFileSet(
      resolved.bridgeRoot
    );
    for (const held of [...ownSources.held, ...finalHeld, ...pendingCommitHeld]) {
      await assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(held);
    }
    const terminalCommitPath = path.join(
      resolved.bridgeRoot,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE
    );
    const committedResult = Object.freeze({
      result: buildSwAbRuntimeDerivedEvidenceProducerBridgeResult(
        publication,
        published.projection
      ),
      publication,
      derivedEvidenceBinding: published.evidenceBinding,
      sourceBindings: publication.sourceBindings,
      endpointFingerprint: Object.freeze({
        outputs: Object.freeze(finalHeld.map((entry) => entry.identity)),
        bridgeSources: Object.freeze(ownSources.held.map((entry) => entry.identity)),
        issuance: issuanceLoaded.endpointFingerprint
      })
    });
    await closeHeld(pendingCommitHeld);
    const pendingCommitPath = path.join(
      resolved.bridgeRoot,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE
    );
    await dependencies.beforeTerminalCommit({
      resolved,
      publication,
      pendingCommitPath,
      terminalCommitPath
    });
    await rename(pendingCommitPath, terminalCommitPath);
    return committedResult;
  } finally {
    await closeHeld(pendingCommitHeld);
    await closeHeld(finalHeld);
    await closeHeld(ownSources.held);
  }
}

export async function publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(...args) {
  return publishWithDependencies(args, DEFAULT_DEPENDENCIES);
}

export const swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly = Object.freeze({
  async publishWithDependencies(args, overrides = {}) {
    return publishWithDependencies([args], Object.freeze({
      ...DEFAULT_DEPENDENCIES,
      ...overrides
    }));
  }
});
