import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH,
  buildExpectedVedicSourceBindingRequirementsSuccessor,
  computeVedicSourceBindingRequirementsSuccessorDigest,
  isVerifiedVedicSourceBindingRequirementsSuccessor,
  loadVedicSourceBindingRequirementsSuccessor,
  parseVedicSourceBindingRequirementsSuccessorJsonBytes,
  serializeVedicSourceBindingRequirementsSuccessor,
  vedicSourceBindingRequirementsSuccessorTestOnly,
  verifyVedicSourceBindingRequirementsSuccessorLedger
} from "./vedic-source-binding-and-three-layer-rights-requirements-successor-lib.mjs";
import {
  isVerifiedVedicTzdb2026cSourceRightsEvidence,
  loadVedicTzdb2026cSourceRightsEvidence
} from "./vedic-tzdb-2026c-source-rights-evidence-lib.mjs";
import {
  readVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const LEDGER_PATH = path.join(
  PROJECT_ROOT,
  ...VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH.split("/")
);
const VERIFY_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "verify-vedic-source-binding-and-three-layer-rights-requirements-successor.mjs"
);
const WRITE_SCRIPT = path.join(
  PROJECT_ROOT,
  "scripts",
  "write-vedic-source-binding-and-three-layer-rights-requirements-successor.mjs"
);
const persistedBytes = await readFile(LEDGER_PATH);
const persistedText = persistedBytes.toString("utf8");
const persistedLedger = JSON.parse(persistedText);
const predecessor = await readVedicSourceBindingAndThreeLayerRightsRequirements(PROJECT_ROOT);
const brandedChild = await loadVedicTzdb2026cSourceRightsEvidence(PROJECT_ROOT);

function clone(value = persistedLedger) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.ledgerDigest = computeVedicSourceBindingRequirementsSuccessorDigest(value);
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

test("current nonformal Vedic v1.1 successor loads with a private brand", async () => {
  const result = await loadVedicSourceBindingRequirementsSuccessor(PROJECT_ROOT);
  assert.equal(isVerifiedVedicSourceBindingRequirementsSuccessor(result), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.predecessorRemainsFormalCurrent, true);
  assert.equal(result.successorIsFormalCurrent, false);
  assert.equal(result.successorActiveEffect, "none");
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.bindingRequired, 38);
  assert.equal(result.partialCandidatesAttached, 2);
  assert.equal(result.subjectFullySatisfied, 0);
  assert.equal(result.candidateExactQuoteObservationsStored, 3);
  assert.equal(result.exactQuotesBound, 0);
  assert.equal(result.formalParentIntegrated, false);
  assert.equal(result.formalRegistryIntegrated, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);

  const objectOnly = verifyVedicSourceBindingRequirementsSuccessorLedger(
    clone(),
    predecessor,
    brandedChild
  );
  assert.equal(isVerifiedVedicSourceBindingRequirementsSuccessor(objectOnly), false);
  assert.equal(isVerifiedVedicSourceBindingRequirementsSuccessor(clone(result)), false);
});

test("persisted successor raw identity, canonical LF bytes, and domain digest are exact", () => {
  const pin = vedicSourceBindingRequirementsSuccessorTestOnly.EXPECTED_PERSISTED_RAW;
  assert.equal(persistedBytes.length, pin.rawBytes);
  assert.equal(vedicSourceBindingRequirementsSuccessorTestOnly.sha256Text(persistedText), pin.rawSha256);
  assert.equal(
    persistedText,
    serializeVedicSourceBindingRequirementsSuccessor(persistedLedger, predecessor, brandedChild)
  );
  assert.equal(persistedText.endsWith("\n"), true);
  assert.equal(persistedText.includes("\r"), false);
  assert.deepEqual(
    persistedLedger,
    buildExpectedVedicSourceBindingRequirementsSuccessor(predecessor, brandedChild)
  );
  const unsigned = clone();
  delete unsigned.ledgerDigest;
  assert.equal(
    persistedLedger.ledgerDigest,
    computeVedicSourceBindingRequirementsSuccessorDigest(unsigned)
  );
});

test("exactly 36 subjects are canonical-exact and exactly two are partial candidates", () => {
  const targetIds = new Set([
    vedicSourceBindingRequirementsSuccessorTestOnly.TIME_ZONE_SUBJECT_ID,
    vedicSourceBindingRequirementsSuccessorTestOnly.RIGHTS_SUBJECT_ID
  ]);
  let exact = 0;
  let changed = 0;
  assert.equal(persistedLedger.subjects.length, 38);
  for (let index = 0; index < predecessor.subjects.length; index += 1) {
    const before = predecessor.subjects[index];
    const after = persistedLedger.subjects[index];
    assert.equal(after.subjectId, before.subjectId);
    const equal = vedicSourceBindingRequirementsSuccessorTestOnly.exactJson(before, after);
    if (targetIds.has(before.subjectId)) {
      assert.equal(equal, false);
      changed += 1;
    } else {
      assert.equal(equal, true, `${before.subjectId} drifted`);
      exact += 1;
    }
  }
  assert.equal(exact, 36);
  assert.equal(changed, 2);
  const dstIndex = predecessor.subjects.findIndex((entry) =>
    entry.subjectId === "vedic.input.dst_gap_overlap_resolution");
  assert.ok(dstIndex >= 0);
  assert.equal(
    vedicSourceBindingRequirementsSuccessorTestOnly.exactJson(
      predecessor.subjects[dstIndex],
      persistedLedger.subjects[dstIndex]
    ),
    true
  );
});

test("two targets retain every formal closure field as unbound and false", () => {
  const targets = [
    [vedicSourceBindingRequirementsSuccessorTestOnly.TIME_ZONE_SUBJECT_ID,
      vedicSourceBindingRequirementsSuccessorTestOnly.TIME_ZONE_CANDIDATE_ID],
    [vedicSourceBindingRequirementsSuccessorTestOnly.RIGHTS_SUBJECT_ID,
      vedicSourceBindingRequirementsSuccessorTestOnly.RIGHTS_CANDIDATE_ID]
  ];
  for (const [subjectId, candidateId] of targets) {
    const subject = persistedLedger.subjects.find((entry) => entry.subjectId === subjectId);
    assert.ok(subject);
    assert.equal(subject.bindingState, "candidate_only_unbound");
    assert.deepEqual(subject.sourceCandidateIds, [candidateId]);
    assert.equal(subject.selectedSourceCandidateId, null);
    assert.equal(subject.sourceOrProvenanceMode, null);
    assert.equal(subject.sourceBodyDigest, null);
    assert.deepEqual(subject.sourceBodyRefs, []);
    assert.equal(subject.sourceBindingEstablished, false);
    assert.equal(subject.exactQuoteStored, false);
    assert.equal(subject.exactQuoteDigest, null);
    assert.deepEqual(subject.exactQuoteRefs, []);
    assert.equal(subject.exactLocatorEstablished, false);
    assert.deepEqual(subject.exactLocatorRefs, []);
    assert.equal(subject.workRightsEstablished, false);
    assert.equal(subject.versionRightsEstablished, false);
    assert.equal(subject.carrierRightsEstablished, false);
    assert.equal(subject.licenseEstablished, false);
    assert.equal(subject.redistributionAuthorized, false);
    assert.equal(subject.rightsLegalConclusionEstablished, false);
    assert.equal(subject.contentTruthEstablished, false);
    assert.equal(subject.expertTruthEstablished, false);
    assert.deepEqual(subject.expertReviewIds, []);
    assert.equal(subject.subjectFullySatisfied, false);
    assert.equal(subject.countsTowardFrozenBindingGate, false);
    assert.equal(subject.candidateExactQuoteObserved, true);
    assert.equal(subject.candidateExactLocatorObserved, true);
  }
});

test("candidate quote observations stay top-level and never become formal subject bindings", () => {
  const bindings = persistedLedger.candidateEvidenceBindings;
  assert.equal(bindings.length, 2);
  assert.deepEqual(bindings.map((entry) => entry.subjectId), [
    "vedic.input.iana_time_zone_and_tzdb_identity",
    "vedic.rule.rights_license_and_redistribution_review"
  ]);
  assert.deepEqual(bindings.map((entry) => entry.minimalExactQuoteObservations.length), [1, 2]);
  for (const binding of bindings) {
    assert.equal(binding.bindingState, "candidate_only_unbound");
    assert.equal(binding.sourceBodyDigest, null);
    assert.equal(binding.remoteBodiesPersistedInThisSuccessorRecord, 0);
    assert.equal(binding.candidateExactQuoteObserved, true);
    assert.equal(binding.candidateExactLocatorObserved, true);
    assert.equal(binding.formalExactQuoteBound, false);
    assert.equal(binding.formalExactLocatorEstablished, false);
    assert.equal(binding.subjectFullySatisfied, false);
    assert.equal(binding.frozenBindingId, null);
    assert.equal(binding.countsTowardFrozenBindingGate, false);
  }
  assert.equal(persistedLedger.gateSummary.candidateExactQuoteObservationsStored, 3);
  assert.equal(persistedLedger.gateSummary.subjectsWithCandidateExactQuoteObservation, 2);
  assert.equal(persistedLedger.gateSummary.exactQuotesBound, 0);
  assert.equal(persistedLedger.gateSummary.exactLocatorsEstablished, 0);
});

test("formal state, source-rights, product, authority, and release accounts remain fail closed", () => {
  assert.deepEqual(persistedLedger.formalStateBoundary, {
    formalManifestIntegrated: false,
    formalParentConsumptionEstablished: false,
    formalRegistryIntegrated: false,
    formalVersionChildModified: false,
    ownerAdmissionAccepted: false,
    predecessorBacklinkAdded: false,
    predecessorMutated: false,
    predecessorRemainsFormalCurrent: true,
    successorActiveEffect: "none",
    successorIsFormalCurrent: false,
    westernAuthorityInherited: false
  });
  assert.ok(Object.values(persistedLedger.authorityBoundary).every((value) => value === false));
  assert.equal(persistedLedger.sourceRightsBoundary.sourceCandidatesAttached, 2);
  assert.equal(persistedLedger.sourceRightsBoundary.bindingFrozenVerified, 0);
  assert.equal(persistedLedger.sourceRightsBoundary.sourceBodiesBound, 0);
  assert.equal(persistedLedger.sourceRightsBoundary.exactQuotesBound, 0);
  assert.equal(persistedLedger.sourceRightsBoundary.rightsEstablished, false);
  assert.equal(persistedLedger.productBoundary.targetSchema, null);
  assert.equal(persistedLedger.productBoundary.migrationId, null);
  assert.equal(persistedLedger.productBoundary.releaseIdentity, null);
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
});

test("successor requires the real child loader WeakSet brand", () => {
  assert.equal(isVerifiedVedicTzdb2026cSourceRightsEvidence(brandedChild), true);
  const forged = clone(brandedChild);
  expectCode(
    () => buildExpectedVedicSourceBindingRequirementsSuccessor(predecessor, forged),
    "CHILD_PRIVATE_BRAND_REQUIRED"
  );
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(clone(), predecessor, forged),
    "CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("formal v1, parent, version children, and registries retain exact pins and no backlinks", async () => {
  const needles = [
    vedicSourceBindingRequirementsSuccessorTestOnly.CHILD_EVIDENCE.evidenceId,
    vedicSourceBindingRequirementsSuccessorTestOnly.CHILD_EVIDENCE.path,
    vedicSourceBindingRequirementsSuccessorTestOnly.LEDGER_ID,
    VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_SUCCESSOR_RELATIVE_PATH
  ];
  for (const context of vedicSourceBindingRequirementsSuccessorTestOnly.FORMAL_CONTEXTS) {
    const bytes = await readFile(path.join(PROJECT_ROOT, ...context.path.split("/")));
    assert.equal(bytes.length, context.rawBytes);
    assert.equal(
      vedicSourceBindingRequirementsSuccessorTestOnly.sha256Text(bytes.toString("utf8")),
      context.rawSha256
    );
    const text = bytes.toString("utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, `${context.path} backlink`);
  }
  assert.equal(persistedLedger.predecessorBinding.remainsFormalCurrent, true);
  assert.equal(persistedLedger.childEvidenceBinding.privateBrandRequiredAtVerification, true);
});

test("self-resealed formal, gate, integrity, release, target, and non-target promotions fail closed", () => {
  const cases = [
    ["FORMAL_STATE_PROMOTION_FORBIDDEN", (x) => { x.formalStateBoundary.successorIsFormalCurrent = true; }],
    ["GATE_PROMOTION_FORBIDDEN", (x) => { x.gateSummary.bindingFrozenVerified = 1; }],
    ["INTEGRITY_OVERCLAIM_FORBIDDEN", (x) => { x.integrityBoundary.abaExcluded = true; }],
    ["PROJECT_CONTEXT_PROMOTION_FORBIDDEN", (x) => { x.projectReleaseGovernanceContext.inheritedByVedicProductIdentity = true; }],
    ["TARGET_SUBJECT_BOUNDARY_DRIFT", (x) => {
      x.subjects.find((entry) => entry.subjectId === "vedic.input.iana_time_zone_and_tzdb_identity").exactQuoteStored = true;
    }],
    ["NON_TARGET_SUBJECT_DRIFT", (x) => {
      x.subjects.find((entry) => entry.subjectId === "vedic.input.dst_gap_overlap_resolution").contentTruthEstablished = true;
    }]
  ];
  for (const [code, mutate] of cases) {
    const candidate = clone();
    mutate(candidate);
    reseal(candidate);
    expectCode(
      () => verifyVedicSourceBindingRequirementsSuccessorLedger(candidate, predecessor, brandedChild),
      code
    );
  }
  const rights = clone();
  rights.candidateEvidenceBindings[1].workRightsEstablished = true;
  reseal(rights);
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(rights, predecessor, brandedChild),
    "SUCCESSOR_CONTRACT_MISMATCH"
  );
});

test("Proxy, accessor, alias, cycle, foreign prototype, negative zero, and own __proto__ fail passively", () => {
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(new Proxy(clone(), {}), predecessor, brandedChild),
    "INPUT_PROXY_FORBIDDEN"
  );
  const accessor = clone();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return "unsafe"; } });
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(accessor, predecessor, brandedChild),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  const alias = clone();
  alias.evidenceLedger = alias.authorityBoundary;
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(alias, predecessor, brandedChild),
    "INPUT_ALIAS_FORBIDDEN"
  );
  const cycle = clone();
  cycle.self = cycle;
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(cycle, predecessor, brandedChild),
    "INPUT_CYCLE_FORBIDDEN"
  );
  const foreign = clone();
  Object.setPrototypeOf(foreign, null);
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(foreign, predecessor, brandedChild),
    "INPUT_PROTOTYPE_INVALID"
  );
  const negativeZero = clone();
  negativeZero.gateSummary.bindingFrozenVerified = -0;
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(negativeZero, predecessor, brandedChild),
    "INPUT_VALUE_INVALID"
  );
  const protoKey = clone();
  Object.defineProperty(protoKey, "__proto__", { value: { polluted: true }, enumerable: true });
  reseal(protoKey);
  expectCode(
    () => verifyVedicSourceBindingRequirementsSuccessorLedger(protoKey, predecessor, brandedChild),
    "SUCCESSOR_CONTRACT_MISMATCH"
  );
  assert.equal({}.polluted, undefined);
});

test("strict successor parser rejects duplicate keys", () => {
  assert.throws(() => parseVedicSourceBindingRequirementsSuccessorJsonBytes(
    Buffer.from('{"schemaVersion":"1","schemaVersion":"2"}\n', "utf8")
  ));
});

test("captured Map, Array, and toJSON primordials cannot forge target selection or serialization", () => {
  const script = `
    import {
      buildExpectedVedicSourceBindingRequirementsSuccessor,
      verifyVedicSourceBindingRequirementsSuccessorLedger
    } from ${JSON.stringify(new URL("./vedic-source-binding-and-three-layer-rights-requirements-successor-lib.mjs", import.meta.url).href)};
    import { readVedicSourceBindingAndThreeLayerRightsRequirements } from ${JSON.stringify(new URL("./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs", import.meta.url).href)};
    import { loadVedicTzdb2026cSourceRightsEvidence } from ${JSON.stringify(new URL("./vedic-tzdb-2026c-source-rights-evidence-lib.mjs", import.meta.url).href)};
    const predecessor = await readVedicSourceBindingAndThreeLayerRightsRequirements(process.cwd());
    const child = await loadVedicTzdb2026cSourceRightsEvidence(process.cwd());
    Object.defineProperty(Object.prototype, "toJSON", { value() { return { forged: true }; }, configurable: true });
    Object.defineProperty(Array.prototype, "toJSON", { value() { return ["forged"]; }, configurable: true });
    Array.prototype.map = function () { return [{ forged: true }]; };
    Map.prototype.get = function () { return { candidateId: "forged" }; };
    Map.prototype.set = function () { return this; };
    const ledger = buildExpectedVedicSourceBindingRequirementsSuccessor(predecessor, child);
    const verified = verifyVedicSourceBindingRequirementsSuccessorLedger(ledger, predecessor, child);
    const targets = verified.subjects.filter((entry) => entry.bindingState === "candidate_only_unbound");
    if (targets.length !== 2 || targets.some((entry) => entry.sourceCandidateIds[0] === "forged")) {
      throw new Error("primordial target forgery visible");
    }
  `;
  const output = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    cwd: PROJECT_ROOT,
    env: cleanCliEnv(),
    encoding: "utf8"
  });
  assert.equal(output.status, 0, output.stderr);
});

test("successor verifier CLI succeeds and rejects args, env injection, wrong cwd, and visible import hook", () => {
  const success = spawnNode(VERIFY_SCRIPT);
  assert.equal(success.status, 0, success.stderr);
  const output = JSON.parse(success.stdout);
  assert.equal(output.predecessorRemainsFormalCurrent, true);
  assert.equal(output.successorIsFormalCurrent, false);
  assert.equal(output.successorActiveEffect, "none");
  assert.equal(output.bindings, "0/38");
  assert.equal(output.partialCandidatesAttached, 2);
  assert.equal(output.subjectFullySatisfied, 0);
  assert.equal(output.candidateExactQuoteObservationsStored, 3);
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

test("exclusive successor writer refuses to overwrite the frozen candidate", () => {
  const output = spawnNode(WRITE_SCRIPT);
  assert.notEqual(output.status, 0);
  assert.equal(output.stdout, "");
});
