import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH,
  WesternSourceBindingRequirementsSuccessorV12Error,
  buildExpectedWesternSourceBindingRequirementsSuccessorV12,
  canonicalStringifyWesternSourceBindingRequirementsSuccessorV12,
  computeWesternSourceBindingRequirementsSuccessorV12Digest,
  isVerifiedWesternSourceBindingRequirementsSuccessorV12,
  loadWesternSourceBindingRequirementsSuccessorV12,
  parseWesternSourceBindingRequirementsSuccessorV12JsonBytes,
  serializeWesternSourceBindingRequirementsSuccessorV12,
  verifyWesternSourceBindingRequirementsSuccessorV12Ledger,
  westernSourceBindingRequirementsSuccessorV12TestOnly
} from "./western-source-binding-requirements-successor-v1.2-lib.mjs";
import {
  isVerifiedWesternSourceBindingRequirementsSuccessor,
  loadWesternSourceBindingRequirementsSuccessor
} from "./western-source-binding-requirements-successor-lib.mjs";
import {
  isVerifiedWesternTzdb2026cControlledReproductionObservation,
  loadWesternTzdb2026cControlledReproductionObservation
} from "./western-tzdb-2026c-controlled-reproduction-observation-lib.mjs";
import {
  isVerifiedWesternTzdb2026cSourceRightsEvidence,
  loadWesternTzdb2026cSourceRightsEvidence
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(
  PROJECT_ROOT,
  ...WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH.split("/")
);
const PREDECESSOR_PATH = path.join(
  PROJECT_ROOT,
  ...westernSourceBindingRequirementsSuccessorV12TestOnly.PREDECESSOR_CANDIDATE.path.split("/")
);
const LIB_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "western-source-binding-requirements-successor-v1.2-lib.mjs"
);
const VERIFY_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "verify-western-source-binding-requirements-successor-v1.2.mjs"
);
const WRITE_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "write-western-source-binding-requirements-successor-v1.2.mjs"
);

const persistedBytes = await readFile(LEDGER_PATH);
const persistedLedger = JSON.parse(persistedBytes.toString("utf8"));
const predecessorBytes = await readFile(PREDECESSOR_PATH);
const predecessorLedger = JSON.parse(predecessorBytes.toString("utf8"));
const verifiedPredecessor = await loadWesternSourceBindingRequirementsSuccessor(PROJECT_ROOT);
const verifiedObservation = await loadWesternTzdb2026cControlledReproductionObservation(PROJECT_ROOT);
const verifiedSourceRights = await loadWesternTzdb2026cSourceRightsEvidence(PROJECT_ROOT);

function clone(value = persistedLedger) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.ledgerDigest = computeWesternSourceBindingRequirementsSuccessorV12Digest(value);
  return value;
}

function verify(value) {
  return verifyWesternSourceBindingRequirementsSuccessorV12Ledger(
    value,
    verifiedPredecessor,
    verifiedObservation,
    verifiedSourceRights
  );
}

function expectCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof WesternSourceBindingRequirementsSuccessorV12Error);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

function cleanCliEnv(overrides = {}) {
  const env = { ...process.env, NODE_OPTIONS: "" };
  delete env.NODE_PATH;
  return { ...env, ...overrides };
}

function spawnNode(script, args = [], options = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: options.cwd ?? PROJECT_ROOT,
    encoding: "utf8",
    env: cleanCliEnv(options.env)
  });
}

test("persisted v1.2 closes with held-handle reads and its own private brand", async () => {
  const result = await loadWesternSourceBindingRequirementsSuccessorV12(PROJECT_ROOT);
  assert.equal(result.ok, true);
  assert.equal(isVerifiedWesternSourceBindingRequirementsSuccessorV12(result), true);
  assert.equal(isVerifiedWesternSourceBindingRequirementsSuccessorV12({ ...result }), false);
  assert.equal(result.formalCurrentIsV1, true);
  assert.equal(result.v11PredecessorCandidateIsFormalCurrent, false);
  assert.equal(result.v12SuccessorIsFormalCurrent, false);
  assert.equal(result.successorActiveEffect, "none");
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.bindingRequired, 28);
  assert.equal(result.observationSubjectsFullySatisfied, 0);
  assert.equal(result.observationSubjectsTotal, 2);
  assert.equal(result.transformationProvenanceEstablished, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ledger));
});

test("persisted raw identity, LF pretty bytes, and domain-separated digest are exact", () => {
  const expected = westernSourceBindingRequirementsSuccessorV12TestOnly.EXPECTED_PERSISTED_RAW;
  assert.equal(persistedBytes.byteLength, expected.rawBytes);
  assert.equal(createHash("sha256").update(persistedBytes).digest("hex"), expected.rawSha256);
  assert.equal(
    persistedBytes.toString("utf8"),
    serializeWesternSourceBindingRequirementsSuccessorV12(persistedLedger)
  );
  assert.equal(
    computeWesternSourceBindingRequirementsSuccessorV12Digest(persistedLedger),
    persistedLedger.ledgerDigest
  );
  assert.equal(persistedBytes.at(-1), 0x0a);
  assert.equal(persistedBytes.toString("utf8").includes("\r\n"), false);
});

test("formal v1, nonformal v1.1, and nonformal observation remain separate accounts", () => {
  const formal = westernSourceBindingRequirementsSuccessorV12TestOnly.FORMAL_CURRENT;
  const predecessor = westernSourceBindingRequirementsSuccessorV12TestOnly.PREDECESSOR_CANDIDATE;
  const observation = westernSourceBindingRequirementsSuccessorV12TestOnly.OBSERVATION_CHILD;
  assert.equal(persistedLedger.formalCurrentBinding.ledgerId, formal.ledgerId);
  assert.equal(persistedLedger.formalCurrentBinding.ledgerDigest, formal.semanticDigest);
  assert.equal(persistedLedger.formalCurrentBinding.remainsFormalCurrent, true);
  assert.equal(persistedLedger.predecessorCandidateBinding.ledgerId, predecessor.ledgerId);
  assert.equal(persistedLedger.predecessorCandidateBinding.isFormalCurrent, false);
  assert.equal(persistedLedger.predecessorCandidateBinding.remainsFormalCurrent, false);
  assert.equal(persistedLedger.controlledReproductionObservationBinding.observationId,
    observation.observationId);
  assert.equal(persistedLedger.controlledReproductionObservationBinding.isFormalCurrent, false);
  assert.equal(persistedLedger.formalStateBoundary.v12SuccessorIsFormalCurrent, false);
});

test("exactly two target subjects append one observation field and the other 26 are exact", () => {
  const targets = new Set([
    westernSourceBindingRequirementsSuccessorV12TestOnly.CALENDAR_SUBJECT_ID,
    westernSourceBindingRequirementsSuccessorV12TestOnly.RIGHTS_SUBJECT_ID
  ]);
  let changed = 0;
  let unchanged = 0;
  for (let index = 0; index < predecessorLedger.subjects.length; index += 1) {
    const before = predecessorLedger.subjects[index];
    const after = persistedLedger.subjects[index];
    assert.equal(after.subjectId, before.subjectId);
    if (!targets.has(before.subjectId)) {
      assert.equal(
        canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(after),
        canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(before),
        before.subjectId
      );
      unchanged += 1;
      continue;
    }
    const stripped = clone(after);
    assert.ok(Object.hasOwn(stripped, "controlledReproductionObservation"));
    delete stripped.controlledReproductionObservation;
    assert.equal(
      canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(stripped),
      canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(before)
    );
    changed += 1;
  }
  assert.equal(changed, 2);
  assert.equal(unchanged, 26);
});

test("v1.1 source candidates, quotes, and rights fields remain canonical-exact", () => {
  assert.equal(
    canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(
      persistedLedger.candidateEvidenceBindings
    ),
    canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(
      predecessorLedger.candidateEvidenceBindings
    )
  );
  assert.deepEqual(
    persistedLedger.candidateEvidenceBindings.map((entry) => entry.minimalExactQuotes.length),
    [1, 2]
  );
  assert.deepEqual(
    persistedLedger.candidateEvidenceBindings.map((entry) => entry.sourceBodyDigest),
    [null, null]
  );
  assert.equal(persistedLedger.gateSummary.exactQuotesBound, 0);
});

test("two real observation candidate IDs remain partial and cannot count toward 0/28", () => {
  const targets = persistedLedger.subjects.filter(
    (entry) => entry.controlledReproductionObservation !== undefined
  );
  assert.equal(targets.length, 2);
  assert.deepEqual(
    targets.map((entry) => entry.controlledReproductionObservation.observationCandidateId),
    [
      westernSourceBindingRequirementsSuccessorV12TestOnly.CALENDAR_OBSERVATION_CANDIDATE_ID,
      westernSourceBindingRequirementsSuccessorV12TestOnly.RIGHTS_OBSERVATION_CANDIDATE_ID
    ]
  );
  for (const subject of targets) {
    const observation = subject.controlledReproductionObservation;
    assert.equal(subject.bindingState, "candidate_only_unbound");
    assert.equal(subject.frozenBindingId, null);
    assert.equal(subject.sourceBodyDigest, null);
    assert.equal(subject.workRightsEstablished, false);
    assert.equal(subject.editionRightsEstablished, false);
    assert.equal(subject.carrierRightsEstablished, false);
    assert.equal(subject.rightsLegalConclusion, "not_established");
    assert.deepEqual(subject.expertReviewIds, []);
    assert.equal(observation.operatorRecordedTwoRunByteExactObservation, true);
    assert.equal(observation.transformationProvenanceEstablished, false);
    assert.equal(observation.subjectFullySatisfied, false);
    assert.equal(observation.frozenBindingId, null);
    assert.equal(observation.countsTowardFrozenBindingGate, false);
  }
});

test("all provenance read-set network environment toolchain auth and replay flags remain false", () => {
  const boundaries = persistedLedger.controlledReproductionBoundaryConsumption.executionBoundaries;
  for (const field of westernSourceBindingRequirementsSuccessorV12TestOnly.EXECUTION_FALSE_FIELDS) {
    assert.equal(boundaries[field], false, field);
  }
  const receipt = persistedLedger.controlledReproductionBoundaryConsumption
    .receiptRunnerReplayBoundary;
  assert.equal(receipt.rawProbeReceiptPersisted, false);
  assert.equal(receipt.probeRunnerPersisted, false);
  assert.equal(receipt.probeReceiptCryptographicallyAttested, false);
  assert.equal(receipt.replayableFromThisRecordAlone, false);
  assert.equal(receipt.probeFullWindow, "unavailable_not_sampled");
});

test("operator two-run observation is true without becoming transformation provenance", () => {
  const consumption = persistedLedger.controlledReproductionBoundaryConsumption;
  assert.equal(consumption.operatorRecordedPointInTimeOnly, true);
  assert.equal(consumption.operatorRecordedTwoRunByteExactObservation, true);
  assert.equal(consumption.successfulRunsObserved, 2);
  assert.equal(consumption.executionBoundaries.transformationProvenanceEstablished, false);
  assert.equal(persistedLedger.gateSummary.transformationProvenanceEstablished, false);
  assert.equal(persistedLedger.gateSummary.controlledReproductionObservationSubjectsFullySatisfied, 0);
});

test("v1.1 and observation consume the same private-branded source-rights identity chain", () => {
  assert.equal(isVerifiedWesternSourceBindingRequirementsSuccessor(verifiedPredecessor), true);
  assert.equal(isVerifiedWesternTzdb2026cControlledReproductionObservation(verifiedObservation), true);
  assert.equal(isVerifiedWesternTzdb2026cSourceRightsEvidence(verifiedSourceRights), true);
  const chain = persistedLedger.sourceRightsIdentityChain;
  assert.equal(chain.path, verifiedSourceRights.ledgerArtifact.path);
  assert.equal(chain.rawBytes, verifiedSourceRights.ledgerArtifact.rawBytes);
  assert.equal(chain.rawSha256, verifiedSourceRights.ledgerArtifact.rawSha256);
  assert.equal(chain.evidenceId, verifiedSourceRights.evidenceId);
  assert.equal(chain.evidenceDigest, verifiedSourceRights.evidenceDigest);
  assert.equal(chain.v11AndObservationReferenceSameChild, true);
  assert.equal(chain.rightsLegalConclusionEstablished, false);
  assert.equal(chain.redistributionAuthorized, false);
});

test("self-reseal cannot promote either nonformal candidate or active effect", () => {
  const mutations = [
    (value) => { value.formalStateBoundary.v11PredecessorCandidateIsFormalCurrent = true; },
    (value) => { value.formalStateBoundary.v12SuccessorIsFormalCurrent = true; },
    (value) => { value.formalStateBoundary.v12SuccessorActiveEffect = "active"; },
    (value) => { value.predecessorCandidateBinding.remainsFormalCurrent = true; },
    (value) => { value.controlledReproductionObservationBinding.isFormalCurrent = true; }
  ];
  for (const mutate of mutations) {
    const value = clone();
    mutate(value);
    reseal(value);
    assert.throws(() => verify(value), WesternSourceBindingRequirementsSuccessorV12Error);
  }
});

test("self-reseal cannot promote any mechanical execution boundary", () => {
  for (const field of westernSourceBindingRequirementsSuccessorV12TestOnly.EXECUTION_FALSE_FIELDS) {
    const value = clone();
    value.controlledReproductionBoundaryConsumption.executionBoundaries[field] = true;
    reseal(value);
    expectCode(() => verify(value), "OBSERVATION_EXECUTION_PROMOTION");
  }
});

test("self-reseal cannot invent receipt runner replay or workspace-wide cleanup proof", () => {
  const cases = [
    ["receiptRunnerReplayBoundary", "rawProbeReceiptPersisted"],
    ["receiptRunnerReplayBoundary", "probeRunnerPersisted"],
    ["receiptRunnerReplayBoundary", "probeReceiptCryptographicallyAttested"],
    ["receiptRunnerReplayBoundary", "replayableFromThisRecordAlone"],
    ["cleanupStorageBoundary", "workspaceWideAbsenceMechanicallyVerified"]
  ];
  for (const [section, field] of cases) {
    const value = clone();
    value.controlledReproductionBoundaryConsumption[section][field] = true;
    reseal(value);
    assert.throws(() => verify(value), WesternSourceBindingRequirementsSuccessorV12Error);
  }
});

test("self-reseal cannot promote rights content expert release or public authorization", () => {
  const falseFields = [
    "rightsLegalConclusionEstablished",
    "redistributionAuthorized",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "releaseReady",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized"
  ];
  for (const field of falseFields) {
    const value = clone();
    value.gateSummary[field] = true;
    reseal(value);
    expectCode(() => verify(value), "GATE_PROMOTION_FORBIDDEN");
  }
  for (const field of [
    "independentEngineeringReviewsVerified",
    "independentDomainExpertReviewsVerified"
  ]) {
    const value = clone();
    value.gateSummary[field] = 1;
    reseal(value);
    expectCode(() => verify(value), "GATE_PROMOTION_FORBIDDEN");
  }
});

test("self-reseal cannot promote cross-file atomic mutation epoch interval or ABA claims", () => {
  for (const field of [
    "crossFileAtomicSnapshotEstablished",
    "mutationEpochAvailable",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) {
    const value = clone();
    value.integrityBoundary[field] = true;
    reseal(value);
    expectCode(() => verify(value), "INTEGRITY_OVERCLAIM_FORBIDDEN");
  }
  const receipt = clone();
  receipt.integrityBoundary.mutationEpochReceipt = "forged";
  reseal(receipt);
  expectCode(() => verify(receipt), "INTEGRITY_OVERCLAIM_FORBIDDEN");
});

test("fake predecessor observation and source-rights objects cannot replace private brands", () => {
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorV12Ledger(
      persistedLedger,
      { ...verifiedPredecessor },
      verifiedObservation,
      verifiedSourceRights
    ),
    "PREDECESSOR_PRIVATE_BRAND_REQUIRED"
  );
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorV12Ledger(
      persistedLedger,
      verifiedPredecessor,
      { ...verifiedObservation },
      verifiedSourceRights
    ),
    "OBSERVATION_PRIVATE_BRAND_REQUIRED"
  );
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorV12Ledger(
      persistedLedger,
      verifiedPredecessor,
      verifiedObservation,
      { ...verifiedSourceRights }
    ),
    "SOURCE_RIGHTS_PRIVATE_BRAND_REQUIRED"
  );
});

test("strict parser rejects duplicate keys", () => {
  expectCode(
    () => parseWesternSourceBindingRequirementsSuccessorV12JsonBytes(
      Buffer.from('{"status":"a","status":"b"}', "utf8"),
      "duplicate.json"
    ),
    "JSON_DUPLICATE_KEY"
  );
});

test("Proxy accessor alias cycle foreign prototype symbol sparse non-enum and negative zero fail", () => {
  const hostile = [];
  hostile.push(new Proxy(clone(), {}));
  const accessor = clone();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return "forged"; } });
  hostile.push(accessor);
  const alias = clone();
  alias.shared = alias.subjects;
  hostile.push(alias);
  const cycle = clone();
  cycle.self = cycle;
  hostile.push(cycle);
  const foreign = clone();
  Object.setPrototypeOf(foreign, null);
  hostile.push(foreign);
  const symbol = clone();
  symbol[Symbol("forged")] = true;
  hostile.push(symbol);
  const sparse = clone();
  sparse.subjects = new Array(28);
  hostile.push(sparse);
  const nonEnumerable = clone();
  Object.defineProperty(nonEnumerable, "forged", { value: true, enumerable: false });
  hostile.push(nonEnumerable);
  const negativeZero = clone();
  negativeZero.forged = -0;
  hostile.push(negativeZero);
  for (const value of hostile) {
    assert.throws(
      () => canonicalStringifyWesternSourceBindingRequirementsSuccessorV12(value),
      WesternSourceBindingRequirementsSuccessorV12Error
    );
  }
});

test("post-import primordial and inherited toJSON poisoning cannot forge build verify or serialize", () => {
  const childSource = `
    const { readFile } = await import("node:fs/promises");
    const v12 = await import(${JSON.stringify(pathToFileURL(LIB_SCRIPT).href)});
    const v11 = await import(${JSON.stringify(pathToFileURL(path.join(PROJECT_ROOT, "scripts", "western-source-binding-requirements-successor-lib.mjs")).href)});
    const observationLib = await import(${JSON.stringify(pathToFileURL(path.join(PROJECT_ROOT, "scripts", "western-tzdb-2026c-controlled-reproduction-observation-lib.mjs")).href)});
    const sourceLib = await import(${JSON.stringify(pathToFileURL(path.join(PROJECT_ROOT, "scripts", "western-tzdb-2026c-source-rights-evidence-lib.mjs")).href)});
    const predecessor = await v11.loadWesternSourceBindingRequirementsSuccessor(${JSON.stringify(PROJECT_ROOT)});
    const observation = await observationLib.loadWesternTzdb2026cControlledReproductionObservation(${JSON.stringify(PROJECT_ROOT)});
    const sourceRights = await sourceLib.loadWesternTzdb2026cSourceRightsEvidence(${JSON.stringify(PROJECT_ROOT)});
    const expectedRaw = await readFile(${JSON.stringify(LEDGER_PATH)});
    const originals = {
      arrayPush: Array.prototype.push,
      objectKeys: Object.keys,
      objectValues: Object.values,
      hasOwn: Object.prototype.hasOwnProperty,
      jsonStringify: JSON.stringify,
      weakSetAdd: WeakSet.prototype.add,
      reflectApply: Reflect.apply
    };
    Array.prototype.push = function () { throw new Error("poisoned push"); };
    Object.keys = function () { throw new Error("poisoned keys"); };
    Object.values = function () { throw new Error("poisoned values"); };
    Object.prototype.hasOwnProperty = function () { throw new Error("poisoned hasOwn"); };
    Object.defineProperty(Array.prototype, "toJSON", { configurable: true, value() { return ["forged"]; } });
    Object.defineProperty(Object.prototype, "toJSON", { configurable: true, value() { return { forged: true }; } });
    JSON.stringify = function () { throw new Error("poisoned stringify"); };
    WeakSet.prototype.add = function () { throw new Error("poisoned weakset add"); };
    Reflect.apply = function () { throw new Error("poisoned reflect apply"); };
    const built = v12.buildExpectedWesternSourceBindingRequirementsSuccessorV12(
      predecessor, observation, sourceRights
    );
    const verified = v12.verifyWesternSourceBindingRequirementsSuccessorV12Ledger(
      built, predecessor, observation, sourceRights
    );
    const serialized = v12.serializeWesternSourceBindingRequirementsSuccessorV12(verified);
    if (!expectedRaw.equals(Buffer.from(serialized, "utf8"))) {
      throw new Error("primordial or inherited toJSON forged bytes");
    }
    Reflect.apply = originals.reflectApply;
    Array.prototype.push = originals.arrayPush;
    Object.keys = originals.objectKeys;
    Object.values = originals.objectValues;
    Object.prototype.hasOwnProperty = originals.hasOwn;
    JSON.stringify = originals.jsonStringify;
    WeakSet.prototype.add = originals.weakSetAdd;
    delete Array.prototype.toJSON;
    delete Object.prototype.toJSON;
    const loaded = await v12.loadWesternSourceBindingRequirementsSuccessorV12(${JSON.stringify(PROJECT_ROOT)});
    if (!v12.isVerifiedWesternSourceBindingRequirementsSuccessorV12(loaded)) {
      throw new Error("v1.2 private brand missing after held-handle load");
    }
    process.stdout.write(verified.ledgerDigest);
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", childSource], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanCliEnv()
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, persistedLedger.ledgerDigest);
});

test("formal contexts and fixed v1.1 contain no v1.2 or observation backlink", async () => {
  const needles = [
    westernSourceBindingRequirementsSuccessorV12TestOnly.LEDGER_ID,
    WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_V1_2_RELATIVE_PATH,
    westernSourceBindingRequirementsSuccessorV12TestOnly.OBSERVATION_CHILD.observationId,
    westernSourceBindingRequirementsSuccessorV12TestOnly.OBSERVATION_CHILD.path
  ];
  for (const context of westernSourceBindingRequirementsSuccessorV12TestOnly.FORMAL_CONTEXTS) {
    const text = await readFile(path.join(PROJECT_ROOT, ...context.path.split("/")), "utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, context.role);
  }
  const predecessorText = predecessorBytes.toString("utf8");
  for (const needle of needles) assert.equal(predecessorText.includes(needle), false);
});

test("release governance remains legacy-v13 targetSchema 13 migrationId null", () => {
  assert.equal(persistedLedger.releaseGovernance.activeLine, "legacy-v13");
  assert.equal(persistedLedger.releaseGovernance.targetSchema, 13);
  assert.equal(persistedLedger.releaseGovernance.migrationId, null);
  assert.equal(persistedLedger.releaseGovernance.expertClaimsAuthorized, false);
  assert.equal(persistedLedger.releaseGovernance.publicDeploymentAuthorized, false);
});

test("CLI verifier passes and exclusive writer refuses overwrite", () => {
  const verified = spawnNode(VERIFY_SCRIPT);
  assert.equal(verified.status, 0, verified.stderr);
  const summary = JSON.parse(verified.stdout);
  assert.equal(summary.ok, true);
  assert.equal(summary.formalCurrentIsV1, true);
  assert.equal(summary.v11PredecessorCandidateIsFormalCurrent, false);
  assert.equal(summary.v12SuccessorIsFormalCurrent, false);
  assert.equal(summary.bindings, "0/28");
  assert.equal(summary.observations, "0/2");
  assert.equal(summary.publicReleaseAuthorized, false);
  const writer = spawnNode(WRITE_SCRIPT);
  assert.notEqual(writer.status, 0);
  assert.equal(JSON.parse(writer.stderr).code, "EEXIST");
});

test("CLI launchers reject arguments NODE_OPTIONS NODE_PATH visible import and wrong cwd", () => {
  for (const script of [VERIFY_SCRIPT, WRITE_SCRIPT]) {
    assert.notEqual(spawnNode(script, ["unexpected"]).status, 0);
    assert.notEqual(spawnNode(script, [], { env: { NODE_OPTIONS: "--trace-warnings" } }).status, 0);
    assert.notEqual(spawnNode(script, [], { env: { NODE_PATH: "C:\\decoy" } }).status, 0);
    const visibleImport = spawnSync(
      process.execPath,
      ["--import=data:text/javascript,globalThis.__v12Preloaded%3Dtrue", script],
      { cwd: PROJECT_ROOT, encoding: "utf8", env: cleanCliEnv() }
    );
    assert.notEqual(visibleImport.status, 0);
    assert.notEqual(spawnNode(script, [], { cwd: path.dirname(PROJECT_ROOT) }).status, 0);
  }
});

test("a preload can erase visible execArgv so launcher integrity correctly remains false", () => {
  const erased = spawnSync(
    process.execPath,
    ["--import=data:text/javascript,process.execArgv.length%3D0", VERIFY_SCRIPT],
    { cwd: PROJECT_ROOT, encoding: "utf8", env: cleanCliEnv() }
  );
  assert.equal(erased.status, 0, erased.stderr);
  assert.equal(JSON.parse(erased.stdout).ok, true);
  assert.equal(
    persistedLedger.controlledReproductionBoundaryConsumption.executionBoundaries
      .launcherIntegrityEstablished,
    false
  );
});
