import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
  WesternTzdb2026cSourceRightsEvidenceError,
  buildExpectedWesternTzdb2026cSourceRightsEvidence,
  canonicalStringifyWesternTzdb2026cSourceRightsEvidence,
  computeWesternTzdb2026cSourceRightsEvidenceDigest,
  isVerifiedWesternTzdb2026cSourceRightsEvidence,
  loadWesternTzdb2026cSourceRightsEvidence,
  parseWesternTzdb2026cSourceRightsEvidenceJsonBytes,
  serializeWesternTzdb2026cSourceRightsEvidence,
  verifyWesternTzdb2026cSourceRightsEvidenceLedger,
  westernTzdb2026cSourceRightsEvidenceTestOnly
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(
  PROJECT_ROOT,
  ...WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH.split("/")
);
const VERIFY_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "verify-western-tzdb-2026c-source-rights-evidence.mjs"
);
const WRITE_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "write-western-tzdb-2026c-source-rights-evidence.mjs"
);

const persistedBytes = await readFile(LEDGER_PATH);
const persistedLedger = JSON.parse(persistedBytes.toString("utf8"));

function cloneLedger() {
  return JSON.parse(JSON.stringify(persistedLedger));
}

function reseal(ledger) {
  ledger.evidenceDigest = computeWesternTzdb2026cSourceRightsEvidenceDigest(ledger);
  return ledger;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function expectCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof WesternTzdb2026cSourceRightsEvidenceError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

async function expectRejectCode(fn, expectedCode) {
  await assert.rejects(fn, (error) => {
    assert.equal(error?.code, expectedCode);
    return true;
  });
}

function absoluteFixturePath(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

async function copyRelativeArtifact(root, relativePath) {
  const source = absoluteFixturePath(PROJECT_ROOT, relativePath);
  const target = absoluteFixturePath(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  return target;
}

async function makeFixture(t, relativePaths) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-western-tzdb-evidence-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  for (const relativePath of relativePaths) await copyRelativeArtifact(root, relativePath);
  return root;
}

function visit(value, visitor) {
  if (Array.isArray(value)) {
    for (const child of value) visit(child, visitor);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    visitor(key, child);
    visit(child, visitor);
  }
}

function spawnNode(scriptPath, extraArgs = [], options = {}) {
  const { env = {}, ...spawnOptions } = options;
  return spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "", ...env },
    ...spawnOptions
  });
}

function spawnNodeWithExecArgv(scriptPath, execArgv, options = {}) {
  const { env = {}, ...spawnOptions } = options;
  return spawnSync(process.execPath, [...execArgv, scriptPath], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "", ...env },
    ...spawnOptions
  });
}

function spawnLauncherWithVisibleExecArgv(scriptPath, visibleExecArgv) {
  const source = `
    process.argv = [process.execPath, ${JSON.stringify(scriptPath)}];
    process.execArgv.length = 0;
    process.execArgv.push(...${JSON.stringify(visibleExecArgv)});
    await import(${JSON.stringify(pathToFileURL(scriptPath).href)});
  `;
  return spawnSync(process.execPath, ["--input-type=module", "-e", source], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
}

test("persisted Western tzdb evidence passes its held-handle local closure with a private brand", async () => {
  const result = await loadWesternTzdb2026cSourceRightsEvidence(PROJECT_ROOT);
  assert.equal(result.ok, true);
  assert.equal(isVerifiedWesternTzdb2026cSourceRightsEvidence(result), true);
  assert.equal(isVerifiedWesternTzdb2026cSourceRightsEvidence({ ...result }), false);
  assert.equal(isVerifiedWesternTzdb2026cSourceRightsEvidence(result.ledger), false);
  assert.equal(result.partialCandidatesAttached, 2);
  assert.equal(result.sourceBindingsFrozenVerified, 0);
  assert.equal(result.sourceBindingsRequired, 28);
  assert.equal(result.remoteBodiesPersistedInThisRecord, 0);
  assert.equal(result.rightsLegalConclusionEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.localArtifacts.length, 10);
  assert.equal(result.formalParents.length, 4);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ledger));
  assert.ok(Object.isFrozen(result.ledger.subjectProjections));
});

test("post-import Array constructor and Symbol.species poisoning cannot forge branded result projections", () => {
  const childSource = `
    const moduleUnderTest = await import(${JSON.stringify(
      pathToFileURL(path.join(PROJECT_ROOT, "scripts", "western-tzdb-2026c-source-rights-evidence-lib.mjs")).href
    )});
    let targetedConstructorReads = 0;
    function ForgedSpecies() {
      return { forgedProjection: true, length: 0 };
    }
    function SpeciesCarrier() {}
    Object.defineProperty(SpeciesCarrier, Symbol.species, {
      value: ForgedSpecies,
      configurable: true
    });
    Object.defineProperty(Array.prototype, "constructor", {
      configurable: true,
      get() {
        let snapshotProjection = this.length === 10 || this.length === 4;
        if (snapshotProjection) {
          for (let index = 0; index < this.length; index += 1) {
            const entry = this[index];
            if (!entry || typeof entry.path !== "string"
              || typeof entry.rawBytes !== "number"
              || typeof entry.rawSha256 !== "string"
              || entry.bytes === undefined) {
              snapshotProjection = false;
              break;
            }
          }
        }
        if (snapshotProjection) {
          targetedConstructorReads += 1;
          return SpeciesCarrier;
        }
        return Array;
      }
    });
    const result = await moduleUnderTest.loadWesternTzdb2026cSourceRightsEvidence(
      ${JSON.stringify(PROJECT_ROOT)}
    );
    if (!moduleUnderTest.isVerifiedWesternTzdb2026cSourceRightsEvidence(result)) {
      throw new Error("private brand missing");
    }
    if (!Array.isArray(result.localArtifacts) || result.localArtifacts.length !== 10) {
      throw new Error("localArtifacts projection forged");
    }
    if (!Array.isArray(result.formalParents) || result.formalParents.length !== 4) {
      throw new Error("formalParents projection forged");
    }
    if (result.localArtifacts.forgedProjection === true
      || result.formalParents.forgedProjection === true) {
      throw new Error("forged species escaped into branded result");
    }
    if (targetedConstructorReads !== 0) {
      throw new Error("snapshot projection consulted Array constructor/species");
    }
    process.stdout.write(result.evidenceDigest);
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", childSource], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, persistedLedger.evidenceDigest);
});

test("post-import inherited Object and Array toJSON cannot forge source-rights serialization or held-handle load", () => {
  const childSource = `
    const { readFile } = await import("node:fs/promises");
    const moduleUnderTest = await import(${JSON.stringify(
      pathToFileURL(path.join(PROJECT_ROOT, "scripts", "western-tzdb-2026c-source-rights-evidence-lib.mjs")).href
    )});
    const expectedRaw = await readFile(${JSON.stringify(LEDGER_PATH)});
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      value() { return { forgedObject: true }; }
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      configurable: true,
      value() { return ["forged-array"]; }
    });
    const expected = moduleUnderTest.buildExpectedWesternTzdb2026cSourceRightsEvidence();
    const serialized = moduleUnderTest.serializeWesternTzdb2026cSourceRightsEvidence(expected);
    if (!expectedRaw.equals(Buffer.from(serialized, "utf8"))) {
      throw new Error("source-rights pretty serializer consulted inherited toJSON");
    }
    const loaded = await moduleUnderTest.loadWesternTzdb2026cSourceRightsEvidence(
      ${JSON.stringify(PROJECT_ROOT)}
    );
    if (!moduleUnderTest.isVerifiedWesternTzdb2026cSourceRightsEvidence(loaded)) {
      throw new Error("source-rights private brand missing");
    }
    process.stdout.write(loaded.evidenceDigest);
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", childSource], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, persistedLedger.evidenceDigest);
});

test("persisted raw identity, canonical LF pretty bytes, and domain-separated digest are exact", () => {
  const expectedRaw = westernTzdb2026cSourceRightsEvidenceTestOnly.EXPECTED_PERSISTED_RAW;
  assert.equal(persistedBytes.byteLength, expectedRaw.rawBytes);
  assert.equal(sha256Bytes(persistedBytes), expectedRaw.rawSha256);
  assert.equal(
    persistedBytes.toString("utf8"),
    serializeWesternTzdb2026cSourceRightsEvidence(persistedLedger)
  );
  assert.equal(computeWesternTzdb2026cSourceRightsEvidenceDigest(persistedLedger), persistedLedger.evidenceDigest);

  const unsigned = cloneLedger();
  delete unsigned.evidenceDigest;
  const canonicalUnsigned = canonicalStringifyWesternTzdb2026cSourceRightsEvidence(unsigned);
  assert.equal(
    sha256Text(westernTzdb2026cSourceRightsEvidenceTestOnly.DIGEST_DOMAIN + canonicalUnsigned),
    persistedLedger.evidenceDigest
  );
  assert.notEqual(sha256Text(canonicalUnsigned), persistedLedger.evidenceDigest);
});

test("builder, parser, passive clone, and persisted ledger converge on one semantic contract", () => {
  const parsed = parseWesternTzdb2026cSourceRightsEvidenceJsonBytes(
    persistedBytes,
    WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH
  );
  const verified = verifyWesternTzdb2026cSourceRightsEvidenceLedger(parsed);
  const expected = buildExpectedWesternTzdb2026cSourceRightsEvidence();
  assert.equal(
    canonicalStringifyWesternTzdb2026cSourceRightsEvidence(verified),
    canonicalStringifyWesternTzdb2026cSourceRightsEvidence(expected)
  );

  const reverseTopLevel = {};
  for (const key of Object.keys(cloneLedger()).reverse()) reverseTopLevel[key] = cloneLedger()[key];
  assert.equal(
    canonicalStringifyWesternTzdb2026cSourceRightsEvidence(reverseTopLevel),
    canonicalStringifyWesternTzdb2026cSourceRightsEvidence(persistedLedger)
  );
});

test("two subject projections remain partial candidates and contribute zero frozen bindings", () => {
  const ledger = verifyWesternTzdb2026cSourceRightsEvidenceLedger(cloneLedger());
  assert.deepEqual(
    ledger.subjectProjections.map((entry) => entry.subjectId),
    [
      "western.input.calendar-time-zone-and-dst",
      "western.rights.ephemeris-time-data-redistribution"
    ]
  );
  for (const projection of ledger.subjectProjections) {
    assert.equal(projection.bindingState, "candidate_only_unbound");
    assert.equal(projection.subjectFullySatisfied, false);
    assert.equal(projection.frozenBindingId, null);
    assert.equal(projection.countsTowardFrozenBindingGate, false);
  }
  assert.equal(ledger.gateSummary.partialCandidatesAttached, 2);
  assert.equal(ledger.gateSummary.subjectFullySatisfied, 0);
  assert.equal(ledger.gateSummary.sourceBindingsFrozenVerified, 0);
  assert.equal(ledger.gateSummary.sourceBindingsRequired, 28);
});

test("exactly three minimal quote observations are recorded while this record persists no remote body and claims no workspace-wide absence", () => {
  const ledger = verifyWesternTzdb2026cSourceRightsEvidenceLedger(cloneLedger());
  const quotes = [
    ledger.officialIanaEvidence.versionRepresentation.exactQuote,
    ledger.officialIanaEvidence.licenseRepresentation.exactQuote,
    ledger.npmCarrierEvidence.mitMinimalExactQuote
  ];
  assert.equal(ledger.gateSummary.subjectsWithMinimalExactQuote, 2);
  assert.equal(ledger.gateSummary.minimalExactQuotesStored, 3);
  assert.equal(quotes.length, 3);
  for (const quote of quotes) {
    assert.equal(Buffer.byteLength(quote.text, "utf8"), quote.utf8Bytes);
    assert.equal(sha256Text(quote.text), quote.sha256);
    assert.ok(quote.locator.length > 0);
  }
  assert.deepEqual(ledger.storageBoundary, {
    scope: "this_evidence_record_and_its_materialization_operation_only",
    remoteResponseBodiesPersistedInThisRecord: 0,
    remoteArchivesPersistedInThisRecord: 0,
    detachedSignaturesPersistedInThisRecord: 0,
    completeRemoteLicenseBodiesPersistedInThisRecord: 0,
    urlsBytesDigestsAndMinimalQuotesPersisted: true,
    operatorRecordedPaidOrPrivateMaterialsAccessed: false,
    operatorRecordedThirdPartyBackendsOrAccountsAccessed: false,
    workspaceWideAbsenceMechanicallyVerified: false
  });
  assert.equal(ledger.gateSummary.remoteBodiesPersistedInThisRecord, 0);

  visit(ledger, (key) => {
    assert.doesNotMatch(
      key,
      /^(?:rawBody|pageBody|html|fullText|documentContent|archiveBody|signatureBody|tarballBody|privateContactData)$/iu
    );
  });
});

test("work, version, carrier, signature, expert, legal, and release authority all remain zero", () => {
  const ledger = verifyWesternTzdb2026cSourceRightsEvidenceLedger(cloneLedger());
  assert.deepEqual(ledger.rightsLayerObservations.map((entry) => entry.layerId), ["work", "version", "carrier"]);
  for (const layer of ledger.rightsLayerObservations) {
    assert.equal(layer.evidenceObserved, true);
    assert.equal(layer.rightsEstablished, false);
    assert.equal(layer.independentRightsReviewVerified, false);
  }
  assert.equal(ledger.officialIanaEvidence.detachedSignature.cryptographicallyVerified, false);
  assert.equal(ledger.officialIanaEvidence.detachedSignature.signingKeyTrustEstablished, false);
  assert.equal(ledger.officialIanaEvidence.detachedSignature.publisherAuthenticityEstablished, false);
  assert.equal(ledger.npmCarrierEvidence.publisherAuthenticityEstablished, false);
  assert.equal(ledger.npmCarrierEvidence.ianaArchiveToPackedTransformationProvenanceEstablished, false);
  assert.equal(ledger.gateSummary.workRightsEstablished, 0);
  assert.equal(ledger.gateSummary.versionRightsEstablished, 0);
  assert.equal(ledger.gateSummary.carrierRightsEstablished, 0);
  assert.equal(ledger.gateSummary.independentRightsReviewsVerified, 0);
  assert.equal(ledger.gateSummary.independentEngineeringReviewsVerified, 0);
  assert.equal(ledger.gateSummary.independentDomainExpertReviewsVerified, 0);
  assert.equal(ledger.gateSummary.rightsLegalConclusionEstablished, false);
  assert.equal(ledger.gateSummary.redistributionAuthorized, false);
  assert.equal(ledger.gateSummary.releaseReady, false);
  assert.equal(ledger.gateSummary.publicReleaseAuthorized, false);
});

test("legacy-v13 and snapshot boundaries do not claim mutation epoch, atomicity, interval integrity, or ABA", () => {
  const ledger = verifyWesternTzdb2026cSourceRightsEvidenceLedger(cloneLedger());
  assert.deepEqual(ledger.projectReleaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    expertClaimsAuthorized: false,
    publicDeploymentAuthorized: false
  });
  assert.equal(ledger.snapshotBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(ledger.snapshotBoundary.mutationEpochReceipt, null);
  assert.equal(ledger.snapshotBoundary.intervalMutationExcluded, false);
  assert.equal(ledger.snapshotBoundary.abaExcluded, false);
});

test("self-resealed frozen-binding, rights, release, subject, and snapshot promotions are rejected", () => {
  const cases = [
    [
      (ledger) => { ledger.gateSummary.sourceBindingsFrozenVerified = 1; },
      "GATE_PROMOTION_FORBIDDEN"
    ],
    [
      (ledger) => { ledger.gateSummary.rightsLegalConclusionEstablished = true; },
      "GATE_PROMOTION_FORBIDDEN"
    ],
    [
      (ledger) => { ledger.gateSummary.publicReleaseAuthorized = true; },
      "GATE_PROMOTION_FORBIDDEN"
    ],
    [
      (ledger) => {
        ledger.subjectProjections[0].bindingState = "frozen_verified";
        ledger.subjectProjections[0].subjectFullySatisfied = true;
        ledger.subjectProjections[0].frozenBindingId = "fabricated";
        ledger.subjectProjections[0].countsTowardFrozenBindingGate = true;
      },
      "SUBJECT_PROJECTION_PROMOTION_FORBIDDEN"
    ],
    [
      (ledger) => { ledger.snapshotBoundary.mutationEpochReceipt = "fabricated"; },
      "SNAPSHOT_BOUNDARY_PROMOTION_FORBIDDEN"
    ]
  ];
  for (const [mutate, code] of cases) {
    const ledger = cloneLedger();
    mutate(ledger);
    expectCode(() => verifyWesternTzdb2026cSourceRightsEvidenceLedger(reseal(ledger)), code);
  }
});

test("self-resealed signature, rights-layer, local, basis, and formal-parent fabrications are rejected", () => {
  const mutations = [
    (ledger) => { ledger.officialIanaEvidence.detachedSignature.cryptographicallyVerified = true; },
    (ledger) => { ledger.rightsLayerObservations[0].rightsEstablished = true; },
    (ledger) => { ledger.localArtifactEvidence[0].rawSha256 = "0".repeat(64); },
    (ledger) => { ledger.basisArtifacts[0].rawBytes += 1; },
    (ledger) => { ledger.formalParents[0].semanticDigest = "0".repeat(64); }
  ];
  for (const mutate of mutations) {
    const ledger = cloneLedger();
    mutate(ledger);
    expectCode(
      () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(reseal(ledger)),
      "EVIDENCE_CONTRACT_MISMATCH"
    );
  }
});

test("remote bodies and private material cannot be smuggled into a self-resealed record", () => {
  for (const [key, value] of [
    ["rawBody", "copied remote response"],
    ["archiveBody", "copied archive"],
    ["signatureBody", "copied detached signature"],
    ["privateContactData", "private material"]
  ]) {
    const ledger = cloneLedger();
    ledger.officialIanaEvidence.releasePage[key] = value;
    expectCode(
      () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(reseal(ledger)),
      "REMOTE_OR_PRIVATE_BODY_FIELD_FORBIDDEN"
    );
  }
});

test("unknown fields and ordinary stale digests fail closed", () => {
  const unknown = cloneLedger();
  unknown.surprise = false;
  expectCode(
    () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(reseal(unknown)),
    "EVIDENCE_CONTRACT_MISMATCH"
  );

  const stale = cloneLedger();
  stale.status = "promoted";
  expectCode(
    () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(stale),
    "EVIDENCE_DIGEST_MISMATCH"
  );
});

test("Proxy, accessor, alias, cycle, foreign prototype, and negative zero are rejected", () => {
  expectCode(
    () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(new Proxy(cloneLedger(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );

  const accessor = cloneLedger();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return "unsafe"; } });
  expectCode(
    () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(accessor),
    "INPUT_ACCESSOR_FORBIDDEN"
  );

  const alias = cloneLedger();
  alias.subjectProjections[1] = alias.subjectProjections[0];
  expectCode(() => verifyWesternTzdb2026cSourceRightsEvidenceLedger(alias), "INPUT_ALIAS_FORBIDDEN");

  const cycle = cloneLedger();
  cycle.cycle = cycle;
  expectCode(() => verifyWesternTzdb2026cSourceRightsEvidenceLedger(cycle), "INPUT_CYCLE_FORBIDDEN");

  const foreign = cloneLedger();
  Object.setPrototypeOf(foreign, null);
  expectCode(
    () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(foreign),
    "INPUT_PROTOTYPE_INVALID"
  );

  const negativeZero = cloneLedger();
  negativeZero.gateSummary.remoteBodiesPersistedInThisRecord = -0;
  expectCode(
    () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(negativeZero),
    "INPUT_VALUE_INVALID"
  );
});

test("own __proto__ data is passively captured and rejected without prototype pollution", () => {
  const ledger = cloneLedger();
  Object.defineProperty(ledger, "__proto__", {
    value: { publicReleaseAuthorized: true },
    enumerable: true,
    configurable: true,
    writable: true
  });
  reseal(ledger);
  expectCode(
    () => verifyWesternTzdb2026cSourceRightsEvidenceLedger(ledger),
    "EVIDENCE_CONTRACT_MISMATCH"
  );
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
});

test("strict byte parser rejects literal and escaped duplicate JSON keys", () => {
  const cases = [
    '{"schemaVersion":"1.0.0","schemaVersion":"2.0.0"}',
    '{"sch\\u0065maVersion":"1.0.0","schemaVersion":"2.0.0"}'
  ];
  for (const source of cases) {
    expectCode(
      () => parseWesternTzdb2026cSourceRightsEvidenceJsonBytes(Buffer.from(source, "utf8"), "duplicate.json"),
      "JSON_DUPLICATE_KEY"
    );
  }
});

test("existing formal parents contain no backlink to the one-way child or successor candidate", async () => {
  const needles = [
    persistedLedger.evidenceId,
    WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    westernTzdb2026cSourceRightsEvidenceTestOnly.SUCCESSOR_ID,
    westernTzdb2026cSourceRightsEvidenceTestOnly.SUCCESSOR_PATH
  ];
  for (const parent of persistedLedger.formalParents) {
    const text = await readFile(absoluteFixturePath(PROJECT_ROOT, parent.path), "utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, `${parent.path} contains backlink`);
  }
});

test("verifier success output preserves the separate zero-state accounts", () => {
  const result = spawnNode(VERIFY_SCRIPT);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    ok: true,
    evidenceId: persistedLedger.evidenceId,
    evidenceDigest: persistedLedger.evidenceDigest,
    partialCandidatesAttached: 2,
    sourceBindings: "0/28",
    remoteBodiesPersistedInThisRecord: 0,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicReleaseAuthorized: false
  });
});

test("launcher guards run before every child business-module dynamic import", async () => {
  for (const scriptPath of [VERIFY_SCRIPT, WRITE_SCRIPT]) {
    const source = await readFile(scriptPath, "utf8");
    const guardIndex = source.indexOf("rejectUnsafeInvocation();");
    const dynamicImportIndex = source.indexOf(
      'await import("./western-tzdb-2026c-source-rights-evidence-lib.mjs")'
    );
    assert.ok(guardIndex >= 0, `${scriptPath} is missing its invocation guard`);
    assert.ok(dynamicImportIndex > guardIndex, `${scriptPath} imports business code before its guard`);
    const staticSpecifiers = [...source.matchAll(/\bfrom\s+"([^"]+)"/gu)].map((match) => match[1]);
    assert.ok(staticSpecifiers.length > 0);
    for (const specifier of staticSpecifiers) assert.match(specifier, /^node:/u);
  }
});

test("verifier rejects extra arguments, NODE_OPTIONS, NODE_PATH, and a wrong cwd", () => {
  const cases = [
    spawnNode(VERIFY_SCRIPT, ["unexpected"]),
    spawnNode(VERIFY_SCRIPT, [], {
      env: { NODE_OPTIONS: "--trace-warnings" }
    }),
    spawnNode(VERIFY_SCRIPT, [], { env: { NODE_PATH: "caller-controlled" } }),
    spawnNode(VERIFY_SCRIPT, [], { cwd: os.tmpdir() })
  ];
  for (const result of cases) {
    assert.notEqual(result.status, 0);
    assert.deepEqual(JSON.parse(result.stderr), {
      ok: false,
      code: "VERIFY_FAILED",
      message: "西洋 tzdb evidence 验证失败。"
    });
  }
});

test("writer rejects extra arguments, NODE_OPTIONS, NODE_PATH, and a wrong cwd before writing", () => {
  const cases = [
    spawnNode(WRITE_SCRIPT, ["unexpected"]),
    spawnNode(WRITE_SCRIPT, [], {
      env: { NODE_OPTIONS: "--trace-warnings" }
    }),
    spawnNode(WRITE_SCRIPT, [], { env: { NODE_PATH: "caller-controlled" } }),
    spawnNode(WRITE_SCRIPT, [], { cwd: os.tmpdir() })
  ];
  for (const result of cases) {
    assert.notEqual(result.status, 0);
    assert.equal(JSON.parse(result.stderr).ok, false);
    assert.equal(JSON.parse(result.stderr).code, "WRITE_FAILED");
  }
});

test("verifier and writer reject actual Node --import preload invocations", () => {
  const preload = "data:text/javascript,globalThis.__hakimiChildLauncherPreloaded=true";
  const verifier = spawnNodeWithExecArgv(VERIFY_SCRIPT, ["--import", preload]);
  assert.notEqual(verifier.status, 0);
  assert.deepEqual(JSON.parse(verifier.stderr), {
    ok: false,
    code: "VERIFY_FAILED",
    message: "西洋 tzdb evidence 验证失败。"
  });

  const writer = spawnNodeWithExecArgv(WRITE_SCRIPT, [`--import=${preload}`]);
  assert.notEqual(writer.status, 0);
  const writerError = JSON.parse(writer.stderr);
  assert.equal(writerError.ok, false);
  assert.equal(writerError.code, "WRITE_FAILED");
  assert.match(writerError.message, /preload|loader/iu);
  assert.doesNotMatch(writerError.message, /EEXIST/iu);
});

test("both launchers reject separate and equal forms of every visible preload or loader execArgv", () => {
  const visibleExecArgvCases = [
    ["--require", "preload.cjs"],
    ["--require=preload.cjs"],
    ["-r", "preload.cjs"],
    ["-r=preload.cjs"],
    ["--import", "data:text/javascript,export{}"],
    ["--import=data:text/javascript,export{}"],
    ["--loader", "loader.mjs"],
    ["--loader=loader.mjs"],
    ["--experimental-loader", "loader.mjs"],
    ["--experimental-loader=loader.mjs"]
  ];
  for (const scriptPath of [VERIFY_SCRIPT, WRITE_SCRIPT]) {
    for (const visibleExecArgv of visibleExecArgvCases) {
      const result = spawnLauncherWithVisibleExecArgv(scriptPath, visibleExecArgv);
      assert.notEqual(result.status, 0, `${scriptPath} accepted ${visibleExecArgv.join(" ")}`);
      const error = JSON.parse(result.stderr);
      assert.equal(error.ok, false);
      assert.equal(error.code, scriptPath === VERIFY_SCRIPT ? "VERIFY_FAILED" : "WRITE_FAILED");
    }
  }
});

test("exclusive writer refuses to overwrite the persisted evidence artifact", () => {
  const result = spawnNode(WRITE_SCRIPT);
  assert.notEqual(result.status, 0);
  const error = JSON.parse(result.stderr);
  assert.equal(error.ok, false);
  assert.equal(error.code, "EEXIST");
  assert.match(error.message, /already exists|file already exists/iu);
});

test("held-handle loader rejects a symlinked ledger endpoint", async (t) => {
  const root = await makeFixture(t, []);
  const ledgerTarget = absoluteFixturePath(root, WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH);
  const realTarget = path.join(path.dirname(ledgerTarget), "real-ledger.json");
  await mkdir(path.dirname(ledgerTarget), { recursive: true });
  await copyFile(LEDGER_PATH, realTarget);
  try {
    await symlink(realTarget, ledgerTarget, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectRejectCode(() => loadWesternTzdb2026cSourceRightsEvidence(root), "SYMLINK_REJECTED");
});

test("held-handle loader rejects a ledger with a second hardlink name", async (t) => {
  const root = await makeFixture(t, []);
  const ledgerTarget = absoluteFixturePath(root, WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH);
  const secondName = path.join(path.dirname(ledgerTarget), "second-ledger-name.json");
  await mkdir(path.dirname(ledgerTarget), { recursive: true });
  await copyFile(LEDGER_PATH, ledgerTarget);
  try {
    await link(ledgerTarget, secondName);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
      t.skip(`hardlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectRejectCode(() => loadWesternTzdb2026cSourceRightsEvidence(root), "HARDLINK_REJECTED");
});

test("held-handle loader rejects narrative basis raw drift", async (t) => {
  const basisPath = westernTzdb2026cSourceRightsEvidenceTestOnly.BASIS_ARTIFACT.path;
  const root = await makeFixture(t, [
    WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    basisPath
  ]);
  const target = absoluteFixturePath(root, basisPath);
  await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\nlocal drift\n", "utf8")]));
  await expectRejectCode(
    () => loadWesternTzdb2026cSourceRightsEvidence(root),
    "LOCAL_RAW_IDENTITY_DRIFT"
  );
});

test("held-handle loader rejects local-artifact raw drift", async (t) => {
  const basisPath = westernTzdb2026cSourceRightsEvidenceTestOnly.BASIS_ARTIFACT.path;
  const firstLocal = westernTzdb2026cSourceRightsEvidenceTestOnly.LOCAL_ARTIFACTS[0].path;
  const root = await makeFixture(t, [
    WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    basisPath,
    firstLocal
  ]);
  const target = absoluteFixturePath(root, firstLocal);
  await writeFile(target, Buffer.concat([await readFile(target), Buffer.from(" ", "utf8")]));
  await expectRejectCode(
    () => loadWesternTzdb2026cSourceRightsEvidence(root),
    "LOCAL_RAW_IDENTITY_DRIFT"
  );
});

test("held-handle loader rejects formal-parent raw drift after local closure", async (t) => {
  const basisPath = westernTzdb2026cSourceRightsEvidenceTestOnly.BASIS_ARTIFACT.path;
  const localPaths = westernTzdb2026cSourceRightsEvidenceTestOnly.LOCAL_ARTIFACTS.map((entry) => entry.path);
  const firstParent = westernTzdb2026cSourceRightsEvidenceTestOnly.FORMAL_PARENTS[0].path;
  const root = await makeFixture(t, [
    WESTERN_TZDB_2026C_SOURCE_RIGHTS_EVIDENCE_RELATIVE_PATH,
    basisPath,
    ...localPaths,
    firstParent
  ]);
  const target = absoluteFixturePath(root, firstParent);
  await writeFile(target, Buffer.concat([await readFile(target), Buffer.from("\n", "utf8")]));
  await expectRejectCode(
    () => loadWesternTzdb2026cSourceRightsEvidence(root),
    "LOCAL_RAW_IDENTITY_DRIFT"
  );
});
