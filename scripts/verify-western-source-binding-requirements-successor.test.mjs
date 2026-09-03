import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH,
  WesternSourceBindingRequirementsSuccessorError,
  buildExpectedWesternSourceBindingRequirementsSuccessor,
  canonicalStringifyWesternSourceBindingRequirementsSuccessor,
  computeWesternSourceBindingRequirementsSuccessorDigest,
  isVerifiedWesternSourceBindingRequirementsSuccessor,
  loadWesternSourceBindingRequirementsSuccessor,
  parseWesternSourceBindingRequirementsSuccessorJsonBytes,
  serializeWesternSourceBindingRequirementsSuccessor,
  verifyWesternSourceBindingRequirementsSuccessorLedger,
  westernSourceBindingRequirementsSuccessorTestOnly
} from "./western-source-binding-requirements-successor-lib.mjs";
import {
  isVerifiedWesternTzdb2026cSourceRightsEvidence,
  loadWesternTzdb2026cSourceRightsEvidence
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(
  PROJECT_ROOT,
  ...WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH.split("/")
);
const PREDECESSOR_PATH = path.join(
  PROJECT_ROOT,
  ...westernSourceBindingRequirementsSuccessorTestOnly.PREDECESSOR.path.split("/")
);
const VERIFY_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "verify-western-source-binding-requirements-successor.mjs"
);
const WRITE_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "write-western-source-binding-requirements-successor.mjs"
);

const persistedBytes = await readFile(LEDGER_PATH);
const persistedLedger = JSON.parse(persistedBytes.toString("utf8"));
const predecessorLedger = JSON.parse(await readFile(PREDECESSOR_PATH, "utf8"));
const verifiedChild = await loadWesternTzdb2026cSourceRightsEvidence(PROJECT_ROOT);

function clone(value = persistedLedger) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(ledger) {
  ledger.ledgerDigest = computeWesternSourceBindingRequirementsSuccessorDigest(ledger);
  return ledger;
}

function expectCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof WesternSourceBindingRequirementsSuccessorError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

function cleanCliEnv(overrides = {}) {
  const env = { ...process.env, NODE_OPTIONS: "" };
  delete env.NODE_PATH;
  return { ...env, ...overrides };
}

test("persisted Western source requirements successor passes held-handle closure with private brand", async () => {
  const result = await loadWesternSourceBindingRequirementsSuccessor(PROJECT_ROOT);
  assert.equal(result.ok, true);
  assert.equal(isVerifiedWesternSourceBindingRequirementsSuccessor(result), true);
  assert.equal(isVerifiedWesternSourceBindingRequirementsSuccessor({ ...result }), false);
  assert.equal(result.predecessorRemainsFormalCurrent, true);
  assert.equal(result.successorIsFormalCurrent, false);
  assert.equal(result.successorActiveEffect, "none");
  assert.equal(result.partialCandidatesAttached, 2);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.bindingRequired, 28);
  assert.equal(result.subjectFullySatisfied, 0);
  assert.equal(result.minimalExactQuotesStored, 3);
  assert.equal(result.minimalExactQuoteObservationsAttached, 3);
  assert.equal(result.exactQuotesBound, 0);
  assert.equal(result.formalManifestIntegrated, false);
  assert.equal(result.formalRegistryIntegrated, false);
  assert.equal(result.ownerAdmissionAccepted, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ledger));
});

test("persisted raw identity, canonical LF bytes, and domain-separated digest are exact", () => {
  const expectedRaw = westernSourceBindingRequirementsSuccessorTestOnly.EXPECTED_PERSISTED_RAW;
  assert.equal(persistedBytes.byteLength, expectedRaw.rawBytes);
  assert.equal(createHash("sha256").update(persistedBytes).digest("hex"), expectedRaw.rawSha256);
  assert.equal(persistedBytes.toString("utf8"), serializeWesternSourceBindingRequirementsSuccessor(persistedLedger));
  assert.equal(
    computeWesternSourceBindingRequirementsSuccessorDigest(persistedLedger),
    persistedLedger.ledgerDigest
  );
  assert.equal(persistedBytes.at(-1), 0x0a);
  assert.equal(persistedBytes.toString("utf8").includes("\r\n"), false);
});

test("exactly two subjects change and the other 26 remain canonical-exact to v1", () => {
  const targetIds = new Set([
    westernSourceBindingRequirementsSuccessorTestOnly.CALENDAR_SUBJECT_ID,
    westernSourceBindingRequirementsSuccessorTestOnly.RIGHTS_SUBJECT_ID
  ]);
  let changed = 0;
  let unchanged = 0;
  assert.equal(predecessorLedger.subjects.length, 28);
  assert.equal(persistedLedger.subjects.length, 28);
  for (let index = 0; index < predecessorLedger.subjects.length; index += 1) {
    const before = predecessorLedger.subjects[index];
    const after = persistedLedger.subjects[index];
    assert.equal(after.subjectId, before.subjectId);
    const equal = canonicalStringifyWesternSourceBindingRequirementsSuccessor(before)
      === canonicalStringifyWesternSourceBindingRequirementsSuccessor(after);
    if (targetIds.has(before.subjectId)) {
      assert.equal(equal, false);
      changed += 1;
    } else {
      assert.equal(equal, true, `${before.subjectId} drifted`);
      unchanged += 1;
    }
  }
  assert.equal(changed, 2);
  assert.equal(unchanged, 26);
});

test("both target subjects remain candidate-only, unbound, unsatisfied, rights-false, and expert-empty", () => {
  const targetIds = [
    westernSourceBindingRequirementsSuccessorTestOnly.CALENDAR_SUBJECT_ID,
    westernSourceBindingRequirementsSuccessorTestOnly.RIGHTS_SUBJECT_ID
  ];
  for (const subjectId of targetIds) {
    const subject = persistedLedger.subjects.find((entry) => entry.subjectId === subjectId);
    assert.ok(subject);
    assert.equal(subject.bindingState, "candidate_only_unbound");
    assert.equal(subject.sourceCandidateIds.length, 1);
    assert.equal(subject.frozenBindingId, null);
    assert.equal(subject.sourceBodyDigest, null);
    assert.equal(subject.exactQuoteStored, true);
    assert.equal(subject.exactLocatorEstablished, true);
    assert.equal(subject.workRightsEstablished, false);
    assert.equal(subject.editionRightsEstablished, false);
    assert.equal(subject.carrierRightsEstablished, false);
    assert.equal(subject.rightsLegalConclusion, "not_established");
    assert.deepEqual(subject.expertReviewIds, []);
    assert.equal(subject.subjectFullySatisfied, false);
    assert.equal(subject.countsTowardFrozenBindingGate, false);
  }
});

test("candidate bindings consume the final private-branded child and retain three minimal quotes", () => {
  assert.equal(isVerifiedWesternTzdb2026cSourceRightsEvidence(verifiedChild), true);
  const child = westernSourceBindingRequirementsSuccessorTestOnly.CHILD_EVIDENCE;
  assert.equal(persistedLedger.childEvidenceBinding.path, child.path);
  assert.equal(persistedLedger.childEvidenceBinding.rawBytes, 16_931);
  assert.equal(
    persistedLedger.childEvidenceBinding.rawSha256,
    "ee61453078f7e4df39c71ee59dcfc94f75ab37a7cd0d967849e1049d748d1ee1"
  );
  assert.equal(
    persistedLedger.childEvidenceBinding.evidenceDigest,
    "14361c93e29d257080b25c0f3e580345243930acb07da450f938fbf6f02b8465"
  );
  assert.equal(persistedLedger.candidateEvidenceBindings.length, 2);
  assert.deepEqual(
    persistedLedger.candidateEvidenceBindings.map((entry) => entry.minimalExactQuotes.length),
    [1, 2]
  );
  assert.equal(
    persistedLedger.candidateEvidenceBindings[1].minimalExactQuotes[0].locator,
    "LICENSE_lines_1_2_exact_lf"
  );
  assert.equal(
    persistedLedger.candidateEvidenceBindings[1].minimalExactQuotes[0].text.includes("\n"),
    true
  );
  for (const binding of persistedLedger.candidateEvidenceBindings) {
    assert.equal(binding.bindingState, "candidate_only_unbound");
    assert.equal(binding.remoteBodiesPersistedInThisSuccessorRecord, 0);
    assert.equal(binding.subjectFullySatisfied, false);
    assert.equal(binding.frozenBindingId, null);
    assert.equal(binding.workRightsEstablished, false);
    assert.equal(binding.versionRightsEstablished, false);
    assert.equal(binding.carrierRightsEstablished, false);
    assert.equal(binding.countsTowardFrozenBindingGate, false);
  }
});

test("gate, authority, and integrity accounts remain separately fail-closed", () => {
  const gate = persistedLedger.gateSummary;
  assert.deepEqual(
    {
      bindingRequired: gate.bindingRequired,
      bindingFrozenVerified: gate.bindingFrozenVerified,
      partialCandidatesAttached: gate.partialCandidatesAttached,
      subjectFullySatisfied: gate.subjectFullySatisfied,
      minimalExactQuotesStored: gate.minimalExactQuotesStored,
      minimalExactQuoteObservationsAttached: gate.minimalExactQuoteObservationsAttached,
      exactQuotesBound: gate.exactQuotesBound,
      remoteBodiesPersistedInThisSuccessorRecord:
        gate.remoteBodiesPersistedInThisSuccessorRecord,
      workRightsEstablished: gate.workRightsEstablished,
      versionRightsEstablished: gate.versionRightsEstablished,
      carrierRightsEstablished: gate.carrierRightsEstablished,
      expertReviewedSubjects: gate.expertReviewedSubjects,
      releaseReady: gate.releaseReady,
      publicReleaseAuthorized: gate.publicReleaseAuthorized
    },
    {
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      partialCandidatesAttached: 2,
      subjectFullySatisfied: 0,
      minimalExactQuotesStored: 3,
      minimalExactQuoteObservationsAttached: 3,
      exactQuotesBound: 0,
      remoteBodiesPersistedInThisSuccessorRecord: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      expertReviewedSubjects: 0,
      releaseReady: false,
      publicReleaseAuthorized: false
    }
  );
  assert.equal(persistedLedger.evidenceLedger.contentTruth, "not_established");
  assert.equal(persistedLedger.evidenceLedger.expertTruth, "not_established");
  assert.equal(persistedLedger.evidenceLedger.rightsLegalConclusion, "not_established");
  assert.equal(persistedLedger.evidenceLedger.releaseReadiness, "not_ready");
  assert.equal(persistedLedger.evidenceLedger.publicReleaseAuthorization, "not_authorized");
  assert.equal(persistedLedger.integrityBoundary.crossFileAtomicSnapshotEstablished, false);
  assert.equal(persistedLedger.integrityBoundary.mutationEpochAvailable, false);
  assert.equal(persistedLedger.integrityBoundary.mutationEpochReceipt, null);
  assert.equal(persistedLedger.integrityBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(persistedLedger.integrityBoundary.abaExcluded, false);
});

test("pure builder and verifier require the real child WeakSet brand", () => {
  assert.equal(isVerifiedWesternTzdb2026cSourceRightsEvidence({ ...verifiedChild }), false);
  expectCode(
    () => buildExpectedWesternSourceBindingRequirementsSuccessor(
      predecessorLedger,
      { ...verifiedChild }
    ),
    "CHILD_PRIVATE_BRAND_REQUIRED"
  );
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      persistedLedger,
      predecessorLedger,
      { ...verifiedChild }
    ),
    "CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("post-import Map get/set and Array map poisoning cannot forge target mappings or result projections", () => {
  const childSource = `
    const moduleUnderTest = await import(${JSON.stringify(
      pathToFileURL(path.join(PROJECT_ROOT, "scripts", "western-source-binding-requirements-successor-lib.mjs")).href
    )});
    const nativeMapGet = Map.prototype.get;
    const nativeMapSet = Map.prototype.set;
    const nativeArrayMap = Array.prototype.map;
    const calendarId = ${JSON.stringify(westernSourceBindingRequirementsSuccessorTestOnly.CALENDAR_SUBJECT_ID)};
    const rightsId = ${JSON.stringify(westernSourceBindingRequirementsSuccessorTestOnly.RIGHTS_SUBJECT_ID)};
    const forged = {
      candidateId: "forged-candidate",
      coverageScope: "forged-coverage"
    };
    Map.prototype.set = function (key, value) {
      if (key === calendarId || key === rightsId) {
        return Reflect.apply(nativeMapSet, this, [key, forged]);
      }
      return Reflect.apply(nativeMapSet, this, [key, value]);
    };
    Map.prototype.get = function (key) {
      if ((key === calendarId || key === rightsId) && this.size === 2) return forged;
      return Reflect.apply(nativeMapGet, this, [key]);
    };
    Array.prototype.map = function (callback, thisArg) {
      if (callback?.name === "artifactIdentity") {
        return [{ path: "forged-result-projection", rawBytes: 1, rawSha256: "0".repeat(64) }];
      }
      return Reflect.apply(nativeArrayMap, this, [callback, thisArg]);
    };
    const result = await moduleUnderTest.loadWesternSourceBindingRequirementsSuccessor(
      ${JSON.stringify(PROJECT_ROOT)}
    );
    let calendar = null;
    let rights = null;
    for (let index = 0; index < result.ledger.subjects.length; index += 1) {
      const subject = result.ledger.subjects[index];
      if (subject.subjectId === calendarId) calendar = subject;
      if (subject.subjectId === rightsId) rights = subject;
    }
    if (calendar?.sourceCandidateIds?.[0] !== "western-iana-tzdb-2026c-input-source-candidate-v1") {
      throw new Error("calendar target mapping forged");
    }
    if (rights?.sourceCandidateIds?.[0] !== "western-iana-tzdb-2026c-moment-timezone-rights-candidate-v1") {
      throw new Error("rights target mapping forged");
    }
    if (result.formalContextArtifacts.length !== 5) throw new Error("result projection length forged");
    for (let index = 0; index < result.formalContextArtifacts.length; index += 1) {
      if (result.formalContextArtifacts[index].path === "forged-result-projection") {
        throw new Error("result projection forged");
      }
    }
    process.stdout.write(result.ledgerDigest);
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", childSource], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanCliEnv()
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, persistedLedger.ledgerDigest);
});

test("self-resealed formal promotion, frozen binding, rights, expert, and release claims fail closed", () => {
  const cases = [
    (ledger) => { ledger.formalStateBoundary.successorIsFormalCurrent = true; },
    (ledger) => { ledger.gateSummary.bindingFrozenVerified = 1; },
    (ledger) => { ledger.gateSummary.exactQuotesBound = 1; },
    (ledger) => { ledger.gateSummary.workRightsEstablished = 1; },
    (ledger) => { ledger.gateSummary.expertReviewedSubjects = 1; },
    (ledger) => { ledger.gateSummary.releaseReady = true; },
    (ledger) => { ledger.gateSummary.publicReleaseAuthorized = true; }
  ];
  for (const mutate of cases) {
    const ledger = clone();
    mutate(ledger);
    assert.throws(() => verifyWesternSourceBindingRequirementsSuccessorLedger(
      reseal(ledger),
      predecessorLedger,
      verifiedChild
    ));
  }
});

test("self-resealed non-target drift and target full-satisfaction fabrication fail closed", () => {
  const nonTarget = clone();
  nonTarget.subjects[0].title = "drift";
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      reseal(nonTarget), predecessorLedger, verifiedChild
    ),
    "NON_TARGET_SUBJECT_DRIFT"
  );

  const promoted = clone();
  const calendar = promoted.subjects.find((entry) => (
    entry.subjectId === westernSourceBindingRequirementsSuccessorTestOnly.CALENDAR_SUBJECT_ID
  ));
  calendar.subjectFullySatisfied = true;
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      reseal(promoted), predecessorLedger, verifiedChild
    ),
    "TARGET_SUBJECT_BOUNDARY_DRIFT"
  );
});

test("unknown fields and ordinary stale digest fail closed", () => {
  const unknown = clone();
  unknown.surprise = false;
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      reseal(unknown), predecessorLedger, verifiedChild
    ),
    "SUCCESSOR_CONTRACT_MISMATCH"
  );

  const stale = clone();
  stale.status = "formal_current";
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      stale, predecessorLedger, verifiedChild
    ),
    "LEDGER_DIGEST_MISMATCH"
  );
});

test("Proxy, accessor, alias, cycle, foreign prototype, and negative zero are rejected", () => {
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      new Proxy(clone(), {}), predecessorLedger, verifiedChild
    ),
    "INPUT_PROXY_FORBIDDEN"
  );

  const accessor = clone();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return "unsafe"; } });
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      accessor, predecessorLedger, verifiedChild
    ),
    "INPUT_ACCESSOR_FORBIDDEN"
  );

  const alias = clone();
  alias.subjects[1].basisAnchors = alias.subjects[0].basisAnchors;
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      alias, predecessorLedger, verifiedChild
    ),
    "INPUT_ALIAS_FORBIDDEN"
  );

  const cycle = clone();
  cycle.cycle = cycle;
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      cycle, predecessorLedger, verifiedChild
    ),
    "INPUT_CYCLE_FORBIDDEN"
  );

  const foreign = clone();
  Object.setPrototypeOf(foreign, null);
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      foreign, predecessorLedger, verifiedChild
    ),
    "INPUT_PROTOTYPE_INVALID"
  );

  const negativeZero = clone();
  negativeZero.gateSummary.bindingFrozenVerified = -0;
  expectCode(
    () => verifyWesternSourceBindingRequirementsSuccessorLedger(
      negativeZero, predecessorLedger, verifiedChild
    ),
    "INPUT_VALUE_INVALID"
  );
});

test("strict byte parser rejects duplicate JSON keys", () => {
  expectCode(
    () => parseWesternSourceBindingRequirementsSuccessorJsonBytes(
      Buffer.from('{"schemaVersion":"1.1.0","schemaVersion":"2.0.0"}', "utf8"),
      "duplicate-successor.json"
    ),
    "JSON_DUPLICATE_KEY"
  );
});

test("v1, manifest, version observation, registry v2, and legacy registry contain no backlink", async () => {
  const needles = [
    persistedLedger.ledgerId,
    WESTERN_SOURCE_BINDING_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH,
    persistedLedger.childEvidenceBinding.evidenceId,
    persistedLedger.childEvidenceBinding.path
  ];
  assert.equal(westernSourceBindingRequirementsSuccessorTestOnly.FORMAL_CONTEXTS.length, 5);
  for (const artifact of westernSourceBindingRequirementsSuccessorTestOnly.FORMAL_CONTEXTS) {
    const bytes = await readFile(path.join(PROJECT_ROOT, ...artifact.path.split("/")));
    assert.equal(bytes.byteLength, artifact.rawBytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.rawSha256);
    const text = bytes.toString("utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, `${artifact.path} backlink`);
  }
});

test("CLI verifier reports candidate-only zero-effect status", () => {
  const result = spawnSync(process.execPath, [VERIFY_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanCliEnv()
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.ok, true);
  assert.equal(output.successorIsFormalCurrent, false);
  assert.equal(output.successorActiveEffect, "none");
  assert.equal(output.partialCandidatesAttached, 2);
  assert.equal(output.bindings, "0/28");
  assert.equal(output.minimalExactQuotesStored, 3);
  assert.equal(output.minimalExactQuoteObservationsAttached, 3);
  assert.equal(output.exactQuotesBound, 0);
  assert.equal(output.formalManifestIntegrated, false);
  assert.equal(output.formalRegistryIntegrated, false);
  assert.equal(output.ownerAdmissionAccepted, false);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicReleaseAuthorized, false);
});

test("CLI launchers reject extra arguments, NODE_OPTIONS, and NODE_PATH", () => {
  const withArgument = spawnSync(process.execPath, [VERIFY_SCRIPT, "unexpected"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanCliEnv()
  });
  assert.notEqual(withArgument.status, 0);
  assert.equal(JSON.parse(withArgument.stderr).ok, false);

  const withNodeOptions = spawnSync(process.execPath, [VERIFY_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanCliEnv({ NODE_OPTIONS: "--trace-warnings" })
  });
  assert.notEqual(withNodeOptions.status, 0);
  assert.equal(JSON.parse(withNodeOptions.stderr).ok, false);

  for (const [launcher, expectedCode] of [
    [VERIFY_SCRIPT, "VERIFY_FAILED"],
    [WRITE_SCRIPT, "WRITE_FAILED"]
  ]) {
    const withNodePath = spawnSync(process.execPath, [launcher], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: cleanCliEnv({ NODE_PATH: PROJECT_ROOT })
    });
    assert.notEqual(withNodePath.status, 0);
    const output = JSON.parse(withNodePath.stderr);
    assert.equal(output.ok, false);
    assert.equal(output.code, expectedCode);
  }
});

test("CLI launchers reject an actual visible --import preload before business-module import", () => {
  const preload = "data:text/javascript,globalThis.__hakimiVisiblePreloadRan=true";
  for (const [launcher, expectedCode] of [
    [VERIFY_SCRIPT, "VERIFY_FAILED"],
    [WRITE_SCRIPT, "WRITE_FAILED"]
  ]) {
    const result = spawnSync(process.execPath, [`--import=${preload}`, launcher], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: cleanCliEnv()
    });
    assert.notEqual(result.status, 0);
    const output = JSON.parse(result.stderr);
    assert.equal(output.ok, false);
    assert.equal(output.code, expectedCode);
  }
});

test("exclusive writer refuses to overwrite the frozen successor", () => {
  const result = spawnSync(process.execPath, [WRITE_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanCliEnv()
  });
  assert.notEqual(result.status, 0);
  const output = JSON.parse(result.stderr);
  assert.equal(output.ok, false);
  assert.equal(output.code, "EEXIST");
});
