import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  parseSwAbUpdateRuntimeClientCaptureJsonBytes
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  compileSwAbUpdateRuntimeClientCaptureSchema
} from "./sw-ab-update-runtime-client-capture-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE,
  parseSwAbUpdateRuntimeApiTranscriptJsonBytes
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle
} from "./sw-ab-update-runtime-api-transcript-loader.mjs";
import {
  compileSwAbUpdateRuntimeApiTranscriptSchema
} from "./sw-ab-update-runtime-api-transcript-schema.mjs";
import {
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-loader.mjs";
import {
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ISSUANCE_LAYOUT,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TRANSCRIPT_FILES,
  assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles,
  assertExactSwAbRuntimeDerivedEvidenceProducerBridgeFileSet,
  assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable,
  assertRealSwAbRuntimeDerivedEvidenceProducerBridgeDirectoryChain,
  buildSwAbRuntimeDerivedEvidenceProducerBridgeResult,
  checkedSwAbRuntimeDerivedEvidenceProducerBridgeSourceBinding,
  comparableSwAbRuntimeDerivedEvidenceProducerBridgePath,
  derivedSwAbRuntimeEvidenceBinding,
  exactSwAbRuntimeDerivedEvidenceProducerBridgeJson,
  failSwAbRuntimeDerivedEvidenceProducerBridge,
  holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile,
  parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes,
  reconstructSwAbUpdateRuntimeDerivedEvidence,
  relativeWithinSwAbRuntimeDerivedEvidenceProducerBridge,
  requireCanonicalAbsoluteSwAbRuntimeDerivedEvidenceProducerBridgePath,
  requireSwAbRuntimeDerivedEvidenceProducerBridgeInput,
  swAbRuntimeDerivedEvidenceProducerBridgeTerminalCommitMarkerBytes,
  validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy,
  validateSwAbRuntimeDerivedEvidenceProducerBridgePublication
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs";

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_TRANSCRIPT_BYTES = 4 * 1024 * 1024;
const DEFAULT_DEPENDENCIES = Object.freeze({
  readFile,
  loadIssuance: loadVerifiedSwAbUpdateRuntimeCollectorIssuance,
  loadTranscript: loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle,
  beforeCheckpointVerification: async () => undefined,
  afterCheckpointVerification: async () => undefined
});

async function closeHeld(heldFiles) {
  for (const held of [...heldFiles].reverse()) {
    await held.handle.close().catch(() => undefined);
  }
}

function canonicalFileBytes(value) {
  return Buffer.from(`${canonicalJson(value)}\n`, "utf8");
}

async function requireRealRoot(root, label) {
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "DIRECTORY_INVALID", "filesystem", `${label} must be one real directory.`
    );
  }
  if (comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(await realpath(root))
    !== comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(root)) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "DIRECTORY_ALIAS", "filesystem", `${label} must not be a junction or physical alias.`
    );
  }
}

export async function resolveSwAbRuntimeDerivedEvidenceProducerBridgeInput(input, mode) {
  const cwd = requireCanonicalAbsoluteSwAbRuntimeDerivedEvidenceProducerBridgePath(input.cwd, "cwd");
  const bindingRoot = requireCanonicalAbsoluteSwAbRuntimeDerivedEvidenceProducerBridgePath(
    input.bindingRoot,
    "bindingRoot"
  );
  const issuanceRunRoot = requireCanonicalAbsoluteSwAbRuntimeDerivedEvidenceProducerBridgePath(
    input.issuanceRunRoot,
    "issuanceRunRoot"
  );
  const bridgeRoot = requireCanonicalAbsoluteSwAbRuntimeDerivedEvidenceProducerBridgePath(
    input.bridgeRoot,
    "bridgeRoot"
  );
  if (comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(cwd)
    !== comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(bindingRoot)) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "BINDING_ROOT_MISMATCH", "input", "bindingRoot must exactly equal cwd."
    );
  }
  await requireRealRoot(bindingRoot, "bindingRoot");
  if (comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(await realpath(bindingRoot))
    !== comparableSwAbRuntimeDerivedEvidenceProducerBridgePath(cwd)) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "BINDING_ROOT_MISMATCH", "input", "cwd and bindingRoot must share one physical identity."
    );
  }
  const issuanceRelative = relativeWithinSwAbRuntimeDerivedEvidenceProducerBridge(
    bindingRoot,
    issuanceRunRoot,
    "issuanceRunRoot"
  );
  const bridgeRelative = relativeWithinSwAbRuntimeDerivedEvidenceProducerBridge(
    bindingRoot,
    bridgeRoot,
    "bridgeRoot"
  );
  if (issuanceRelative.split("/")[0] !== "tmp" || bridgeRelative.split("/")[0] !== "tmp") {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "PATH_OUTSIDE_TMP", "input", "Issuance and bridge roots must remain under workspace tmp."
    );
  }
  const relativePair = path.relative(issuanceRunRoot, bridgeRoot);
  const reversePair = path.relative(bridgeRoot, issuanceRunRoot);
  if (
    relativePair === ""
    || (!path.isAbsolute(relativePair) && relativePair !== ".." && !relativePair.startsWith(`..${path.sep}`))
    || (!path.isAbsolute(reversePair) && reversePair !== ".." && !reversePair.startsWith(`..${path.sep}`))
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "ROOT_OVERLAP", "input", "Issuance and bridge roots must be distinct non-nested siblings."
    );
  }
  await assertRealSwAbRuntimeDerivedEvidenceProducerBridgeDirectoryChain(
    bindingRoot,
    issuanceRunRoot,
    "issuanceRunRoot"
  );
  const bridgeParent = path.dirname(bridgeRoot);
  await assertRealSwAbRuntimeDerivedEvidenceProducerBridgeDirectoryChain(
    bindingRoot,
    bridgeParent,
    "bridge parent"
  );
  if (mode === "loader") {
    await assertRealSwAbRuntimeDerivedEvidenceProducerBridgeDirectoryChain(
      bindingRoot,
      bridgeRoot,
      "bridgeRoot"
    );
    await assertExactSwAbRuntimeDerivedEvidenceProducerBridgeFileSet(bridgeRoot);
  }
  return Object.freeze({ cwd, bindingRoot, issuanceRunRoot, bridgeRoot, bridgeParent });
}

export async function holdSwAbRuntimeDerivedEvidenceProducerBridgeOwnSources(resolved) {
  const held = [];
  try {
    for (const requirement of SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS.slice(0, 2)) {
      held.push(await holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
        bindingRoot: resolved.bindingRoot,
        filePath: path.join(resolved.bindingRoot, ...requirement.path.split("/")),
        relativePath: requirement.path,
        label: requirement.role,
        maximumSize: MAX_SOURCE_BYTES
      }));
    }
    assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles(held);
    const values = held.map((entry, index) =>
      parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(
        entry.bytes,
        SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS[index].role
      )
    );
    const policy = validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy(values[0]);
    let schemaValidator;
    try {
      schemaValidator = compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema(values[1]);
    } catch (cause) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "SCHEMA_INVALID", "source", "Checked bridge Schema is invalid.", cause
      );
    }
    return { held, values, policy, schemaValidator };
  } catch (error) {
    await closeHeld(held);
    throw error;
  }
}

async function readExistingContractSources(resolved, receipt, dependencies) {
  const valuesByRole = new Map();
  const bindingsByRole = new Map();
  for (const requirement of SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS.slice(2)) {
    const bytes = await dependencies.readFile(
      path.join(resolved.bindingRoot, ...requirement.path.split("/"))
    );
    const value = parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(bytes, requirement.role);
    const binding = checkedSwAbRuntimeDerivedEvidenceProducerBridgeSourceBinding(
      bytes,
      value,
      requirement
    );
    valuesByRole.set(requirement.role, value);
    bindingsByRole.set(requirement.role, binding);
  }
  const existingInReceiptOrder = receipt.sourceBindings.map((entry) => bindingsByRole.get(entry.role));
  if (
    existingInReceiptOrder.some((entry) => entry === undefined)
    || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
      existingInReceiptOrder,
      receipt.sourceBindings
    )
  ) {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "SOURCE_BINDING_MISMATCH",
      "source",
      "Issuance-held source bytes drifted from the terminal receipt."
    );
  }
  return { valuesByRole, bindingsByRole };
}

export async function withVerifiedSwAbRuntimeDerivedEvidenceProducerBridgeCheckpoint({
  resolved,
  checkpoint,
  ownSources,
  dependencies,
  onVerified
}) {
  if (checkpoint?.phase !== "after_initial_validation_before_terminal_reread") {
    failSwAbRuntimeDerivedEvidenceProducerBridge(
      "CHECKPOINT_INVALID", "checkpoint", "Issuance held checkpoint phase drifted."
    );
  }
  const transcriptRoot = path.join(
    resolved.issuanceRunRoot,
    SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY
  );
  const transcriptHeld = [];
  try {
    for (const fileName of SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TRANSCRIPT_FILES) {
      transcriptHeld.push(await holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
        bindingRoot: transcriptRoot,
        filePath: path.join(transcriptRoot, fileName),
        relativePath: fileName,
        label: `bridge transcript ${fileName}`,
        maximumSize: MAX_TRANSCRIPT_BYTES
      }));
    }
    assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles([
      ...ownSources.held,
      ...transcriptHeld
    ]);
    await dependencies.beforeCheckpointVerification({ resolved, checkpoint, transcriptHeld });
    const transcriptLoaded = await dependencies.loadTranscript({
      cwd: resolved.cwd,
      bindingRoot: resolved.bindingRoot,
      bundleDirectory: transcriptRoot
    });
    const tupleInputs = transcriptHeld.slice(0, 8).map((held, index) => ({
      record: parseSwAbUpdateRuntimeApiTranscriptJsonBytes(held.bytes, `bridge tuple ${index + 1}`),
      binding: held.binding
    }));
    const manifestHeld = transcriptHeld[8];
    const manifest = parseSwAbUpdateRuntimeApiTranscriptJsonBytes(
      manifestHeld.bytes,
      "bridge transcript manifest"
    );
    const receiptBytes = await dependencies.readFile(
      path.join(resolved.issuanceRunRoot, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE)
    );
    if (
      receiptBytes.length !== checkpoint.receiptBinding.size
      || sha256(receiptBytes) !== checkpoint.receiptBinding.sha256
    ) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "ISSUANCE_BINDING_MISMATCH", "issuance", "Held issuance receipt binding drifted."
      );
    }
    const receipt = parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(
      receiptBytes,
      "collector issuance receipt"
    );
    const existing = await readExistingContractSources(resolved, receipt, dependencies);
    const ownBindings = ownSources.held.map((entry, index) =>
      checkedSwAbRuntimeDerivedEvidenceProducerBridgeSourceBinding(
        entry.bytes,
        ownSources.values[index],
        SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS[index]
      )
    );
    const sourceBindings = [
      ...ownBindings,
      ...SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS.slice(2)
        .map((requirement) => existing.bindingsByRole.get(requirement.role))
    ];
    const transcriptSourceBindings = [
      existing.bindingsByRole.get("api-transcript-policy"),
      existing.bindingsByRole.get("api-transcript-schema"),
      existing.bindingsByRole.get("runtime-capture-policy"),
      existing.bindingsByRole.get("runtime-capture-schema")
    ];
    if (
      !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
        transcriptLoaded.sourceBindings,
        transcriptSourceBindings
      )
      || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
        transcriptLoaded.manifestBinding,
        manifestHeld.binding
      )
      || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
        transcriptLoaded.tupleBindings,
        transcriptHeld.slice(0, 8).map((entry) => entry.binding)
      )
    ) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "TRANSCRIPT_BINDING_MISMATCH",
        "transcript",
        "Bridge-held transcript files drifted from the independent transcript loader."
      );
    }
    let transcriptSchemaValidator;
    let runtimeSchemaValidator;
    try {
      transcriptSchemaValidator = compileSwAbUpdateRuntimeApiTranscriptSchema(
        existing.valuesByRole.get("api-transcript-schema")
      );
      runtimeSchemaValidator = compileSwAbUpdateRuntimeClientCaptureSchema(
        existing.valuesByRole.get("runtime-capture-schema")
      );
    } catch (cause) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "UPSTREAM_SCHEMA_INVALID", "source", "Checked upstream Schema compilation failed.", cause
      );
    }
    const reconstructed = reconstructSwAbUpdateRuntimeDerivedEvidence({
      manifest,
      tupleInputs,
      checkedTranscriptSourceBindings: transcriptSourceBindings,
      transcriptPolicy: existing.valuesByRole.get("api-transcript-policy"),
      transcriptSchemaValidator,
      runtimePolicy: existing.valuesByRole.get("runtime-capture-policy"),
      runtimeSchemaValidator,
      transcriptLoadedResult: transcriptLoaded.result
    });
    if (
      checkpoint.transcriptBundleDigest !== transcriptLoaded.result.bundleDigest
      || receipt.runId !== manifest.runId
      || receipt.attemptId !== manifest.attemptId
      || receipt.transcriptBundleBinding.bundleId !== transcriptLoaded.result.bundleId
      || receipt.transcriptBundleBinding.bundleDigest !== transcriptLoaded.result.bundleDigest
      || receipt.transcriptBundleBinding.derivedEvidenceDigest !== reconstructed.evidence.evidenceDigest
    ) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "FOUR_WAY_BINDING_MISMATCH",
        "issuance",
        "Issuance, checkpoint, transcript, and reconstructed evidence identities drifted."
      );
    }
    const issuanceBinding = Object.freeze({
      runId: receipt.runId,
      attemptId: receipt.attemptId,
      issuanceId: receipt.issuanceId,
      receiptDigest: receipt.receiptDigest,
      marker: Object.freeze({
        path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ISSUANCE_LAYOUT.marker,
        size: checkpoint.markerBinding.size,
        sha256: checkpoint.markerBinding.sha256
      }),
      receipt: Object.freeze({
        path: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ISSUANCE_LAYOUT.receipt,
        size: checkpoint.receiptBinding.size,
        sha256: checkpoint.receiptBinding.sha256
      })
    });
    const transcriptBinding = Object.freeze({
      relativeDirectory: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ISSUANCE_LAYOUT.transcriptDirectory,
      manifest: Object.freeze({
        path: `${SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ISSUANCE_LAYOUT.transcriptDirectory}/${SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE}`,
        size: manifestHeld.binding.size,
        sha256: manifestHeld.binding.sha256
      }),
      bundleId: transcriptLoaded.result.bundleId,
      bundleDigest: transcriptLoaded.result.bundleDigest,
      derivedEvidenceDigest: transcriptLoaded.result.derivedEvidenceDigest,
      tupleBindings: structuredClone(manifest.tupleBindings)
    });
    const context = Object.freeze({
      receipt,
      manifest,
      reconstructed,
      transcriptLoaded,
      sourceBindings: Object.freeze(sourceBindings),
      issuanceBinding,
      transcriptBinding,
      transcriptHeld
    });
    const result = await onVerified(context);
    for (const held of transcriptHeld) {
      await assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(held);
    }
    for (const held of ownSources.held) {
      await assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(held);
    }
    await dependencies.afterCheckpointVerification({ resolved, checkpoint, context });
    return result;
  } finally {
    await closeHeld(transcriptHeld);
  }
}

async function loadWithDependencies(rawArgs, dependencies) {
  const input = requireSwAbRuntimeDerivedEvidenceProducerBridgeInput(
    rawArgs,
    "loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge"
  );
  const resolved = await resolveSwAbRuntimeDerivedEvidenceProducerBridgeInput(input, "loader");
  const ownSources = await holdSwAbRuntimeDerivedEvidenceProducerBridgeOwnSources(resolved);
  const outputHeld = [];
  const terminalCommitHeld = [];
  let verified;
  let checkpointCount = 0;
  try {
    for (const fileName of [
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE
    ]) {
      outputHeld.push(await holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
        bindingRoot: resolved.bridgeRoot,
        filePath: path.join(resolved.bridgeRoot, fileName),
        relativePath: fileName,
        label: `bridge output ${fileName}`
      }));
    }
    terminalCommitHeld.push(
      await holdStableSwAbRuntimeDerivedEvidenceProducerBridgeFile({
        bindingRoot: resolved.bridgeRoot,
        filePath: path.join(
          resolved.bridgeRoot,
          SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE
        ),
        relativePath: SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE,
        label: "bridge terminal commit marker",
        maximumSize: 65
      })
    );
    assertDistinctSwAbRuntimeDerivedEvidenceProducerBridgeFiles([
      ...ownSources.held,
      ...outputHeld,
      ...terminalCommitHeld
    ]);
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
        verified = await withVerifiedSwAbRuntimeDerivedEvidenceProducerBridgeCheckpoint({
          resolved,
          checkpoint,
          ownSources,
          dependencies,
          onVerified: async (context) => {
            const evidence = parseSwAbUpdateRuntimeClientCaptureJsonBytes(
              outputHeld[0].bytes,
              "derived runtime evidence"
            );
            const expectedEvidenceBytes = canonicalFileBytes(context.reconstructed.evidence);
            if (
              !outputHeld[0].bytes.equals(expectedEvidenceBytes)
              || !exactSwAbRuntimeDerivedEvidenceProducerBridgeJson(
                evidence,
                context.reconstructed.evidence
              )
            ) {
              failSwAbRuntimeDerivedEvidenceProducerBridge(
                "DERIVED_EVIDENCE_DRIFT", "output", "Published derived evidence is not the exact reconstruction."
              );
            }
            const evidenceBinding = derivedSwAbRuntimeEvidenceBinding(outputHeld[0].bytes, evidence);
            const publication = parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(
              outputHeld[1].bytes,
              "producer bridge publication"
            );
            if (!outputHeld[1].bytes.equals(canonicalFileBytes(publication))) {
              failSwAbRuntimeDerivedEvidenceProducerBridge(
                "PUBLICATION_ENCODING_INVALID", "output", "Publication must use exact canonical JSON plus LF."
              );
            }
            const checkedPublication = validateSwAbRuntimeDerivedEvidenceProducerBridgePublication({
              publication,
              policy: ownSources.policy,
              schemaValidator: ownSources.schemaValidator,
              expectedIssuanceBinding: context.issuanceBinding,
              expectedTranscriptBinding: context.transcriptBinding,
              expectedDerivedEvidenceBinding: evidenceBinding,
              expectedSourceBindings: context.sourceBindings
            });
            const expectedTerminalCommitMarker =
              swAbRuntimeDerivedEvidenceProducerBridgeTerminalCommitMarkerBytes(
                checkedPublication.publicationDigest
              );
            if (!terminalCommitHeld[0].bytes.equals(expectedTerminalCommitMarker)) {
              failSwAbRuntimeDerivedEvidenceProducerBridge(
                "TERMINAL_COMMIT_MARKER_INVALID",
                "publication",
                "Terminal commit marker does not exactly bind the checked publication digest."
              );
            }
            return Object.freeze({
              publication: checkedPublication,
              evidenceBinding,
              projection: context.reconstructed.projection
            });
          }
        });
      }
    });
    if (checkpointCount !== 1 || !verified) {
      failSwAbRuntimeDerivedEvidenceProducerBridge(
        "CHECKPOINT_COUNT_INVALID", "checkpoint", "Issuance checkpoint did not run exactly once."
      );
    }
    const publication = verified.publication;
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
        "TERMINAL_ISSUANCE_DRIFT", "issuance", "Terminal outer issuance result drifted from publication."
      );
    }
    await assertExactSwAbRuntimeDerivedEvidenceProducerBridgeFileSet(resolved.bridgeRoot);
    for (const held of [...ownSources.held, ...outputHeld, ...terminalCommitHeld]) {
      await assertHeldSwAbRuntimeDerivedEvidenceProducerBridgeFileStable(held);
    }
    return Object.freeze({
      result: buildSwAbRuntimeDerivedEvidenceProducerBridgeResult(
        publication,
        verified.projection
      ),
      publication,
      derivedEvidenceBinding: verified.evidenceBinding,
      sourceBindings: publication.sourceBindings,
      endpointFingerprint: Object.freeze({
        outputs: Object.freeze(outputHeld.map((entry) => entry.identity)),
        terminalGate: terminalCommitHeld[0].identity,
        bridgeSources: Object.freeze(ownSources.held.map((entry) => entry.identity)),
        issuance: issuanceLoaded.endpointFingerprint
      })
    });
  } finally {
    await closeHeld(terminalCommitHeld);
    await closeHeld(outputHeld);
    await closeHeld(ownSources.held);
  }
}

export async function loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(...args) {
  return loadWithDependencies(args, DEFAULT_DEPENDENCIES);
}

export const swAbRuntimeDerivedEvidenceProducerBridgeLoaderTestOnly = Object.freeze({
  async loadWithDependencies(args, overrides = {}) {
    return loadWithDependencies([args], Object.freeze({
      ...DEFAULT_DEPENDENCIES,
      ...overrides
    }));
  },
  canonicalFileBytes
});
