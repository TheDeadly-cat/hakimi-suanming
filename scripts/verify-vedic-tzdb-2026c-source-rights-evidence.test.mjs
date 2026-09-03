import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
  buildExpectedVedicTzdb2026cSourceRightsEvidence,
  canonicalStringifyVedicTzdb2026cSourceRightsEvidence,
  computeVedicTzdb2026cSourceRightsEvidenceDigest,
  isVerifiedVedicTzdb2026cSourceRightsEvidence,
  loadVedicTzdb2026cSourceRightsEvidence,
  parseVedicTzdb2026cSourceRightsEvidenceJsonBytes,
  serializeVedicTzdb2026cSourceRightsEvidence,
  vedicTzdb2026cSourceRightsEvidenceTestOnly,
  verifyVedicTzdb2026cSourceRightsEvidenceLedger
} from "./vedic-tzdb-2026c-source-rights-evidence-lib.mjs";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const LEDGER_PATH = path.join(PROJECT_ROOT, ...VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH.split("/"));
const VERIFY_SCRIPT = path.join(PROJECT_ROOT, "scripts", "verify-vedic-tzdb-2026c-source-rights-evidence.mjs");
const WRITE_SCRIPT = path.join(PROJECT_ROOT, "scripts", "write-vedic-tzdb-2026c-source-rights-evidence.mjs");
const persistedBytes = await readFile(LEDGER_PATH);
const persistedText = persistedBytes.toString("utf8");
const persistedLedger = JSON.parse(persistedText);

function clone(value = persistedLedger) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.evidenceDigest = computeVedicTzdb2026cSourceRightsEvidenceDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

function cleanCliEnv(overrides = {}) {
  const env = { ...process.env, NODE_OPTIONS: "", ...overrides };
  if (!("NODE_PATH" in overrides)) delete env.NODE_PATH;
  return env;
}

function spawnNode(script, args = [], options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd ?? PROJECT_ROOT,
    env: cleanCliEnv(options.env ?? {}),
    encoding: "utf8"
  });
}

test("current Vedic tzdb child loads with a loader-only private brand", async () => {
  const result = await loadVedicTzdb2026cSourceRightsEvidence(PROJECT_ROOT);
  assert.equal(isVerifiedVedicTzdb2026cSourceRightsEvidence(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.evidenceDigest, persistedLedger.evidenceDigest);
  assert.equal(result.partialCandidatesAttached, 2);
  assert.equal(result.sourceBindingsFrozenVerified, 0);
  assert.equal(result.sourceBindingsRequired, 38);
  assert.equal(result.subjectFullySatisfied, 0);
  assert.equal(result.exactQuotesBound, 0);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);

  const objectOnly = verifyVedicTzdb2026cSourceRightsEvidenceLedger(clone());
  assert.equal(isVerifiedVedicTzdb2026cSourceRightsEvidence(objectOnly), false);
  assert.equal(isVerifiedVedicTzdb2026cSourceRightsEvidence(clone(result)), false);
});

test("persisted raw pin, canonical LF materialization, and domain digest are exact", () => {
  const expectedRaw = vedicTzdb2026cSourceRightsEvidenceTestOnly.EXPECTED_PERSISTED_RAW;
  assert.equal(persistedBytes.length, expectedRaw.rawBytes);
  const hash = vedicTzdb2026cSourceRightsEvidenceTestOnly.sha256Text(persistedText);
  assert.equal(hash, expectedRaw.rawSha256);
  assert.equal(persistedText, serializeVedicTzdb2026cSourceRightsEvidence(persistedLedger));
  assert.equal(persistedText.endsWith("\n"), true);
  assert.equal(persistedText.includes("\r"), false);
  assert.deepEqual(persistedLedger, buildExpectedVedicTzdb2026cSourceRightsEvidence());

  const unsigned = clone();
  delete unsigned.evidenceDigest;
  assert.equal(
    persistedLedger.evidenceDigest,
    computeVedicTzdb2026cSourceRightsEvidenceDigest(unsigned)
  );
  assert.notEqual(
    persistedLedger.evidenceDigest,
    vedicTzdb2026cSourceRightsEvidenceTestOnly.sha256Text(
      canonicalStringifyVedicTzdb2026cSourceRightsEvidence(unsigned)
    )
  );
});

test("exactly two Vedic subjects are projected and DST policy is not projected", () => {
  assert.deepEqual(
    persistedLedger.subjectProjections.map((entry) => entry.subjectId),
    [
      "vedic.input.iana_time_zone_and_tzdb_identity",
      "vedic.rule.rights_license_and_redistribution_review"
    ]
  );
  assert.equal(
    persistedLedger.subjectProjections.some((entry) => entry.subjectId === "vedic.input.dst_gap_overlap_resolution"),
    false
  );
  for (const projection of persistedLedger.subjectProjections) {
    assert.equal(projection.bindingState, "candidate_only_unbound");
    assert.equal(projection.subjectFullySatisfied, false);
    assert.equal(projection.frozenBindingId, null);
    assert.equal(projection.countsTowardFrozenBindingGate, false);
  }
});

test("five official IANA endpoints retain independent two-read identities", () => {
  const expected = vedicTzdb2026cSourceRightsEvidenceTestOnly.OFFICIAL_IANA_OBSERVATIONS;
  assert.deepEqual(persistedLedger.officialIanaEvidence, expected);
  assert.deepEqual(
    Object.values(persistedLedger.officialIanaEvidence).map((entry) => [
      entry.httpStatus,
      entry.requestedUrl === entry.finalUrl,
      entry.readCount,
      entry.twoReadsRawIdentityEqual
    ]),
    Array(5).fill([200, true, 2, true])
  );
  assert.deepEqual(
    persistedLedger.officialIanaEvidence.versionRepresentation.exactQuote,
    {
      text: "2026c",
      utf8Bytes: 5,
      sha256: "19fd9387dff1a60f2a3947d61232c982b3a52feb645b130e708a879936152da5",
      locator: "line_1_without_trailing_lf"
    }
  );
  assert.equal(
    persistedLedger.officialIanaEvidence.licenseRepresentation.exactQuote.sha256,
    "72c3b37777104fdba9c140c56d93cd282266f283e848399f0d8e3cef9daaf0ff"
  );
  const signature = persistedLedger.officialIanaEvidence.detachedSignature;
  assert.equal(signature.cryptographicallyVerified, false);
  assert.equal(signature.signingKeyTrustEstablished, false);
  assert.equal(signature.publisherAuthenticityEstablished, false);
});

test("local Moment carrier is held-handle evidence without npm or transform provenance", () => {
  const carrier = persistedLedger.localMomentTimezoneCarrierEvidence;
  assert.equal(carrier.packageName, "moment-timezone");
  assert.equal(carrier.packageVersion, "0.6.3");
  assert.equal(carrier.packedIanaVersion, "2026c");
  assert.equal(carrier.packedZoneCount, 340);
  assert.equal(carrier.packedLinkCount, 257);
  assert.equal(carrier.metaZoneCount, 418);
  assert.equal(carrier.metaCountryCount, 247);
  assert.equal(carrier.mitMinimalExactQuote.text, "The MIT License (MIT)");
  assert.equal(carrier.remoteNpmTarballRetrievedInThisVedicObservation, false);
  assert.equal(carrier.publisherTarballByteEqualityEstablished, false);
  assert.equal(carrier.ianaArchiveToPackedTransformationProvenanceEstablished, false);
  assert.equal(carrier.installedCarrierAuthenticityEstablished, false);
});

test("rights, authority, storage, release, and mutation boundaries remain fail closed", () => {
  assert.deepEqual(persistedLedger.rightsLayerObservations.map((entry) => entry.layerId), ["work", "version", "carrier"]);
  for (const layer of persistedLedger.rightsLayerObservations) {
    assert.equal(layer.rightsEstablished, false);
    assert.equal(layer.independentRightsReviewVerified, false);
  }
  assert.ok(Object.values(persistedLedger.authorityBoundary).every((value) => value === false));
  assert.ok(Object.values(persistedLedger.crossSystemIsolationBoundary).every((value) => value === false));
  assert.equal(persistedLedger.storageBoundary.remoteResponseBodiesPersistedInThisRecord, 0);
  assert.equal(persistedLedger.storageBoundary.remoteArchivesPersistedInThisRecord, 0);
  assert.equal(persistedLedger.storageBoundary.detachedSignaturesPersistedInThisRecord, 0);
  assert.equal(persistedLedger.storageBoundary.persistentProbeReceiptPersistedInThisRecord, 0);
  assert.deepEqual(persistedLedger.projectReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    expertClaimsAuthorized: false,
    inheritedByVedicProductIdentity: false,
    migrationId: null,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    projectContextOnly: true,
    publicDeploymentAuthorized: false,
    targetSchema: 13
  });
  assert.equal(persistedLedger.observationBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(persistedLedger.observationBoundary.intervalMutationExcluded, false);
  assert.equal(persistedLedger.observationBoundary.abaExcluded, false);
});

test("formal predecessor and five contexts are pinned and have no backlink", async () => {
  const contexts = [
    vedicTzdb2026cSourceRightsEvidenceTestOnly.FORMAL_PREDECESSOR,
    ...vedicTzdb2026cSourceRightsEvidenceTestOnly.NON_CONSUMING_CONTEXTS
  ];
  const needles = [
    vedicTzdb2026cSourceRightsEvidenceTestOnly.EVIDENCE_ID,
    VEDIC_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    vedicTzdb2026cSourceRightsEvidenceTestOnly.SUCCESSOR_ID,
    vedicTzdb2026cSourceRightsEvidenceTestOnly.SUCCESSOR_PATH
  ];
  for (const context of contexts) {
    const bytes = await readFile(path.join(PROJECT_ROOT, ...context.path.split("/")));
    assert.equal(bytes.length, context.rawBytes);
    assert.equal(
      vedicTzdb2026cSourceRightsEvidenceTestOnly.sha256Text(bytes.toString("utf8")),
      context.rawSha256
    );
    const text = bytes.toString("utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, `${context.path} backlink`);
  }
  assert.equal(persistedLedger.formalPredecessorBinding.remainsFormalCurrent, true);
  assert.equal(persistedLedger.formalPredecessorBinding.childBindsPredecessor, false);
  assert.equal(persistedLedger.formalPredecessorBinding.predecessorBacklinkObserved, false);
  assert.ok(persistedLedger.nonConsumingContextArtifacts.every((entry) =>
    entry.consumedAsSourceAuthority === false && entry.backlinkObserved === false));
});

test("self-resealed promotions and remote-body injection fail closed", () => {
  const mutations = [
    ["GATE_PROMOTION_FORBIDDEN", (x) => { x.gateSummary.sourceBindingsFrozenVerified = 1; }],
    ["SUBJECT_PROJECTION_PROMOTION_FORBIDDEN", (x) => { x.subjectProjections[0].subjectFullySatisfied = true; }],
    ["CROSS_SYSTEM_INHERITANCE_FORBIDDEN", (x) => { x.crossSystemIsolationBoundary.westernEvidenceConsumed = true; }],
    ["OBSERVATION_BOUNDARY_PROMOTION_FORBIDDEN", (x) => { x.observationBoundary.abaExcluded = true; }],
    ["PROJECT_CONTEXT_PROMOTION_FORBIDDEN", (x) => { x.projectReleaseGovernanceContext.inheritedByVedicProductIdentity = true; }],
    ["REMOTE_OR_PRIVATE_BODY_FIELD_FORBIDDEN", (x) => { x.officialIanaEvidence.versionRepresentation.rawBody = "forbidden"; }]
  ];
  for (const [code, mutate] of mutations) {
    const candidate = clone();
    mutate(candidate);
    reseal(candidate);
    expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(candidate), code);
  }
  const rights = clone();
  rights.rightsLayerObservations[0].rightsEstablished = true;
  reseal(rights);
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(rights), "EVIDENCE_CONTRACT_MISMATCH");
  const signature = clone();
  signature.officialIanaEvidence.detachedSignature.cryptographicallyVerified = true;
  reseal(signature);
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(signature), "EVIDENCE_CONTRACT_MISMATCH");
});

test("Proxy, accessor, alias, cycle, foreign prototype, negative zero, and own __proto__ are rejected", () => {
  expectCode(
    () => verifyVedicTzdb2026cSourceRightsEvidenceLedger(new Proxy(clone(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );
  const accessor = clone();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return "unsafe"; } });
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(accessor), "INPUT_ACCESSOR_FORBIDDEN");
  const alias = clone();
  alias.evidenceLedger = alias.authorityBoundary;
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(alias), "INPUT_ALIAS_FORBIDDEN");
  const cycle = clone();
  cycle.self = cycle;
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(cycle), "INPUT_CYCLE_FORBIDDEN");
  const foreign = clone();
  Object.setPrototypeOf(foreign, null);
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(foreign), "INPUT_PROTOTYPE_INVALID");
  const negativeZero = clone();
  negativeZero.gateSummary.sourceBindingsFrozenVerified = -0;
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(negativeZero), "INPUT_VALUE_INVALID");
  const protoKey = clone();
  Object.defineProperty(protoKey, "__proto__", { value: { polluted: true }, enumerable: true });
  reseal(protoKey);
  expectCode(() => verifyVedicTzdb2026cSourceRightsEvidenceLedger(protoKey), "EVIDENCE_CONTRACT_MISMATCH");
  assert.equal({}.polluted, undefined);
});

test("strict JSON parser rejects duplicates and non-canonical bytes are not accepted by loader materialization", () => {
  assert.throws(() => parseVedicTzdb2026cSourceRightsEvidenceJsonBytes(
    Buffer.from('{"schemaVersion":"1","schemaVersion":"2"}\n', "utf8")
  ));
  assert.equal(
    canonicalStringifyVedicTzdb2026cSourceRightsEvidence({ b: 1, a: 2 }),
    canonicalStringifyVedicTzdb2026cSourceRightsEvidence({ a: 2, b: 1 })
  );
});

test("captured primordials prevent post-import toJSON and collection-method forgery", () => {
  const script = `
    import {
      buildExpectedVedicTzdb2026cSourceRightsEvidence,
      canonicalStringifyVedicTzdb2026cSourceRightsEvidence,
      verifyVedicTzdb2026cSourceRightsEvidenceLedger
    } from ${JSON.stringify(new URL("./vedic-tzdb-2026c-source-rights-evidence-lib.mjs", import.meta.url).href)};
    Object.defineProperty(Object.prototype, "toJSON", { value() { return { forged: true }; }, configurable: true });
    Object.defineProperty(Array.prototype, "toJSON", { value() { return ["forged"]; }, configurable: true });
    Array.prototype.map = function () { return [{ forged: true }]; };
    const expected = buildExpectedVedicTzdb2026cSourceRightsEvidence();
    const verified = verifyVedicTzdb2026cSourceRightsEvidenceLedger(expected);
    const text = canonicalStringifyVedicTzdb2026cSourceRightsEvidence(verified);
    if (text.includes("forged")) throw new Error("primordial forgery visible");
  `;
  const output = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: PROJECT_ROOT,
    env: cleanCliEnv(),
    encoding: "utf8"
  });
  assert.equal(output.status, 0, output.stderr);
});

test("verifier CLI succeeds and rejects args, env injection, wrong cwd, and visible import hook", () => {
  const success = spawnNode(VERIFY_SCRIPT);
  assert.equal(success.status, 0, success.stderr);
  const output = JSON.parse(success.stdout);
  assert.equal(output.bindings, "0/38");
  assert.equal(output.partialCandidatesAttached, 2);
  assert.equal(output.subjectFullySatisfied, 0);
  assert.equal(output.exactQuotesBound, 0);

  assert.notEqual(spawnNode(VERIFY_SCRIPT, ["extra"]).status, 0);
  assert.notEqual(spawnNode(VERIFY_SCRIPT, [], { env: { NODE_OPTIONS: "--trace-warnings" } }).status, 0);
  assert.notEqual(spawnNode(VERIFY_SCRIPT, [], { env: { NODE_PATH: PROJECT_ROOT } }).status, 0);
  assert.notEqual(spawnNode(VERIFY_SCRIPT, [], { cwd: os.tmpdir() }).status, 0);
  const visibleImport = spawnSync(process.execPath, ["--import=data:text/javascript,", VERIFY_SCRIPT], {
    cwd: PROJECT_ROOT,
    env: cleanCliEnv(),
    encoding: "utf8"
  });
  assert.notEqual(visibleImport.status, 0);
});

test("exclusive writer refuses to overwrite the frozen child", () => {
  const output = spawnNode(WRITE_SCRIPT);
  assert.notEqual(output.status, 0);
  assert.equal(output.stdout, "");
});
