import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import {
  buildCurrentBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";
import { computeIndependentDomainManifestDigest, computeIndependentDomainComponentDigest } from "./independent-domain-release-manifest-lib.mjs";
import { computeIndependentSourceRequirementsDigest } from "./independent-source-binding-requirements-lib.mjs";
import { computeBaziV17ManifestDriftDecisionDigest } from "./bazi-v17-manifest-drift-decision-lib.mjs";

export const FACT_RECEIPT_V1_INPUT_ARCHIVE_URL =
  new URL("./fixtures/cross-system-fact-receipts-v1-original-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "a0c8f0f14cbb3094ef42d002f3b3e24ec7ccd5e769c53bfcfa17d00d015af42b";
const MANIFEST_SHA256 = "60b301f38804eaa9c27a17dfb5fa2057eae854db93f25a7b82d732fbd7000f8d";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function requireIdentity(condition, label) {
  if (!condition) {
    const error = new Error(`Historical fact receipt v1 input identity differs: ${label}`);
    error.code = "HISTORICAL_V1_INPUT_MISMATCH";
    throw error;
  }
}

// These bytes are data, never imported or executed. The fixed inventory is the
// original v1 consumer's complete input contract, not a selectable current head.
export function parseFactReceiptV1InputArchive(bytes) {
  requireIdentity(sha256(bytes) === ARCHIVE_SHA256, "archive");
  const entries = unzipSync(bytes);
  requireIdentity(sha256(entries["fixture-inputs.json"]) === MANIFEST_SHA256, "inventory");
  const manifest = JSON.parse(Buffer.from(entries["fixture-inputs.json"]).toString("utf8"));
  requireIdentity(manifest.fixtureId === "cross-system-fact-receipts-historical-v1/1"
    && manifest.files.length === 98, "scope");
  requireIdentity(JSON.stringify(Object.keys(entries).sort()) === JSON.stringify([
    "fixture-inputs.json", ...manifest.files.map(file => file.path)
  ].sort()), "entry set");
  for (const file of manifest.files) {
    requireIdentity(!file.path.includes("\\") && !file.path.includes(":")
      && !file.path.split("/").some(part => ["", ".", ".."].includes(part)), "relative path");
    requireIdentity(entries[file.path]?.byteLength === file.bytes
      && sha256(entries[file.path]) === file.sha256, file.path);
  }
  return { manifest, entries };
}

export async function verifyFactReceiptV1Inputs(workspaceRoot, readSnapshot, parseJson) {
  const { manifest } = parseFactReceiptV1InputArchive(await readFile(FACT_RECEIPT_V1_INPUT_ARCHIVE_URL));
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
