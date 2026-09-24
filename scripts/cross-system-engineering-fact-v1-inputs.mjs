import {
  buildCurrentBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";
import { computeIndependentDomainManifestDigest, computeIndependentDomainComponentDigest } from "./independent-domain-release-manifest-lib.mjs";
import { computeIndependentSourceRequirementsDigest } from "./independent-source-binding-requirements-lib.mjs";
import { computeBaziV17ManifestDriftDecisionDigest } from "./bazi-v17-manifest-drift-decision-lib.mjs";

const MANIFEST_SHA256 = "60b301f38804eaa9c27a17dfb5fa2057eae854db93f25a7b82d732fbd7000f8d";

function requireIdentity(condition, label) {
  if (!condition) {
    const error = new Error(`Historical fact receipt v1 input identity differs: ${label}`);
    error.code = "HISTORICAL_V1_INPUT_MISMATCH";
    throw error;
  }
}

export async function verifyFactReceiptV1Inputs(workspaceRoot, readSnapshot, parseJson) {
  const inventory = await readSnapshot(workspaceRoot, "fixture-inputs.json");
  requireIdentity(inventory.sha256 === MANIFEST_SHA256, "inventory");
  const manifest = parseJson(inventory.bytes, "historical v1 input inventory");
  requireIdentity(manifest.fixtureId === "cross-system-fact-receipts-historical-v1/1" && manifest.files.length === 98, "scope");
  const snapshots = new Map();
  for (const file of manifest.files) {
    const snapshot = await readSnapshot(workspaceRoot, file.path);
    requireIdentity(snapshot.size === file.bytes && snapshot.sha256 === file.sha256, file.path);
    snapshots.set(file.path, snapshot);
  }
  const json = relative => parseJson(snapshots.get(relative).bytes, relative);
  const definitions = [
    { productSystemId: "ziwei-doushu", manifestPath: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json", ledgerPath: "content/system-admission/ziwei-source-binding-requirements.v1.json" },
    { productSystemId: "western-astrology", manifestPath: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json", ledgerPath: "content/system-admission/western-source-binding-requirements.v1.json" }
  ];
  const verifiedManifests = definitions.map(definition => {
    const value = json(definition.manifestPath);
    requireIdentity(computeIndependentDomainManifestDigest(value) === value.manifestDigest, definition.manifestPath);
    for (const component of value.components) {
      const rebuilt = { ...component, files: component.files.map(file => ({ ...file, sha256: snapshots.get(file.path)?.sha256 })) };
      requireIdentity(computeIndependentDomainComponentDigest(rebuilt) === component.digest, component.componentId);
    }
    return { productSystemId: definition.productSystemId, manifest: value, manifestDigest: value.manifestDigest };
  });
  const verifiedSourceRequirements = definitions.map(definition => {
    const ledger = json(definition.ledgerPath);
    requireIdentity(computeIndependentSourceRequirementsDigest(ledger) === ledger.ledgerDigest, definition.ledgerPath);
    return { productSystemId: definition.productSystemId, ledger, ledgerDigest: ledger.ledgerDigest,
      bindingRequired: ledger.gateSummary.bindingRequired, bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified };
  });
  const ledger = json("content/system-admission/bazi-v17-manifest-drift-decisions.v1.json");
  requireIdentity(computeBaziV17ManifestDriftDecisionDigest(ledger) === ledger.ledgerDigest, "D0 semantic identity");
  // Recompute the complete preview with maintained code. A digest pin on the
  // saved D0 record alone must not stand in for its observed manifest closure.
  const preview = await buildCurrentBaziDomainReleaseManifest(workspaceRoot, { createdAt: ledger.savedManifest.createdAt });
  requireIdentity(preview.manifestDigest === ledger.currentExpectedManifestPreview.semanticManifestDigest, "D0 expected preview");
  return { definitions, verifiedManifests, verifiedSourceRequirements, verifiedD0: { ledger } };
}
