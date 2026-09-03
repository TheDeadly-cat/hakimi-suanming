import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_BASIS_RELATIVE_PATHS,
  BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH,
  buildCurrentBaziPolicyWeightsValueEvidenceCandidate,
  canonicalStringifyBaziPolicyWeightsValueEvidenceCandidate,
  computeBaziPolicyWeightsValueEvidenceCandidateDigest,
  parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes,
  readBaziPolicyWeightsValueEvidenceCandidate,
  verifyBaziPolicyWeightsValueEvidenceCandidate
} from "./bazi-policy-weights-value-evidence-candidate-lib.mjs";
import { computeBaziBindingFreezeRequirementsDigest } from "./bazi-binding-freeze-requirements-lib.mjs";
import { computeEngineeringBindingCandidateLedgerDigest } from "./bazi-engineering-binding-candidate-lib.mjs";
import { computeBaziEngineeringBindingValueSubjectGapDigest } from "./bazi-engineering-binding-value-subject-gap-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const POLICY_RELATIVE_PATH = "packages/bazi-interpretation/src/strength-policy.ts";
const CORE_RELATIVE_PATH = "packages/bazi-interpretation/src/strength-assessment-core.ts";
const FREEZE_RELATIVE_PATH = "content/system-admission/bazi-binding-freeze-requirements.v1.json";

function clone(value) {
  return structuredClone(value);
}

function withFreshDigest(candidate) {
  candidate.candidateDigest = computeBaziPolicyWeightsValueEvidenceCandidateDigest(candidate);
  return candidate;
}

function rejectsCode(expectedCode) {
  return (error) => {
    assert.equal(error?.code, expectedCode);
    assert.equal(error?.safeForCli, true);
    assert.doesNotMatch(String(error?.message), /[A-Za-z]:\\/u);
    return true;
  };
}

async function copyRelativeFile(sourceRoot, destinationRoot, relativePath) {
  const source = path.resolve(sourceRoot, ...relativePath.split("/"));
  const destination = path.resolve(destinationRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function makeFixture(t, { includeCandidate = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-policy-weights-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  for (const relativePath of BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_BASIS_RELATIVE_PATHS) {
    await copyRelativeFile(workspaceRoot, root, relativePath);
  }
  if (includeCandidate) {
    await copyRelativeFile(
      workspaceRoot,
      root,
      BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH
    );
  }
  return root;
}

test("stored candidate equals the deterministic held-handle builder and verifies fail closed", async () => {
  const stored = await readBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  const built = await buildCurrentBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  assert.deepEqual(stored, built);
  const verified = await verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, stored);
  assert.equal(verified.candidateDigest, "208ae39797d048b2fc869392528a3cf7d1858de232a8691bc0296366d6363088");
  assert.deepEqual(verified.valueEvidenceRecords[0].repositoryProjection, {
    monthCommand: 4,
    visibleStem: 2,
    firstHiddenStem: 2,
    otherHiddenStem: 1
  });
  assert.equal(verified.authorityBoundary.bindingFreezeEligible, false);
  assert.equal(verified.authorityBoundary.bindingFrozenVerified, false);
  assert.equal(verified.authorityBoundary.engineeringRationaleFrozen, false);
  assert.deepEqual(verified.externalEvidence, {
    sourceEvidenceRefs: [],
    sourceRightsRecordId: null,
    sourceCarrierRecordId: null,
    engineeringRationaleRecordId: null,
    engineeringReviewIds: [],
    expertReviewIds: [],
    independentDomainReviewIds: []
  });
});

test("unknown top-level and nested authority fields are rejected", async () => {
  const stored = await readBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  const topLevel = clone(stored);
  topLevel.unknown = false;
  await assert.rejects(
    verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, topLevel),
    rejectsCode("CANDIDATE_SCHEMA_INVALID")
  );

  const nested = clone(stored);
  nested.authorityBoundary.unknown = false;
  await assert.rejects(
    verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, nested),
    rejectsCode("CANDIDATE_SCHEMA_INVALID")
  );

  const deepNested = clone(stored);
  deepNested.valueEvidenceRecords[0].repositoryProjection.unknown = 99;
  withFreshDigest(deepNested);
  await assert.rejects(
    verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, deepNested),
    rejectsCode("CANDIDATE_SCHEMA_INVALID")
  );
});

test("duplicate candidate JSON keys are rejected even when JSON.parse would keep the expected last value", async () => {
  const candidatePath = path.resolve(
    workspaceRoot,
    ...BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH.split("/")
  );
  const original = await readFile(candidatePath, "utf8");
  const expected = '  "status": "candidate_only_current_repository_values_observed_not_freeze_eligible",';
  const duplicated = original.replace(
    expected,
    `  "status": "forged_promoted_status",\n${expected}`
  );
  assert.notEqual(duplicated, original);
  assert.throws(
    () => parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(Buffer.from(duplicated, "utf8")),
    rejectsCode("JSON_DUPLICATE_KEY")
  );
});

test("public byte parser rejects oversized padding and non-exact byte subclasses before decoding", async () => {
  const candidatePath = path.resolve(
    workspaceRoot,
    ...BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH.split("/")
  );
  const original = await readFile(candidatePath);
  const oversized = Buffer.concat([original, Buffer.alloc(1_000_001, 0x20)]);
  assert.throws(
    () => parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(oversized),
    rejectsCode("JSON_TOO_LARGE")
  );

  const shadowedLength = new Uint8Array(oversized);
  Object.defineProperty(shadowedLength, "byteLength", { value: 1 });
  assert.throws(
    () => parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(shadowedLength),
    rejectsCode("JSON_TOO_LARGE")
  );

  const throwingLength = new Uint8Array(oversized);
  Object.defineProperty(throwingLength, "byteLength", {
    get() {
      throw new Error("instance byteLength getter must not run");
    }
  });
  assert.throws(
    () => parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(throwingLength),
    rejectsCode("JSON_TOO_LARGE")
  );

  class Uint8ArraySubclass extends Uint8Array {}
  assert.throws(
    () => parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(
      new Uint8ArraySubclass(original)
    ),
    rejectsCode("JSON_BYTES_INVALID")
  );

  const maximumResizableBytes = original.byteLength + 1_000_001;
  const resizableBuffer = new ArrayBuffer(original.byteLength, {
    maxByteLength: maximumResizableBytes
  });
  const resizableBytes = new Uint8Array(resizableBuffer);
  resizableBytes.set(original);
  let lengthGetterCalls = 0;
  Object.defineProperty(resizableBytes, "length", {
    get() {
      lengthGetterCalls += 1;
      resizableBuffer.resize(maximumResizableBytes);
      new Uint8Array(resizableBuffer, original.byteLength).fill(0x20);
      return 1;
    }
  });
  const parsedResizable = parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(resizableBytes);
  assert.equal(parsedResizable.candidateDigest, "208ae39797d048b2fc869392528a3cf7d1858de232a8691bc0296366d6363088");
  assert.equal(lengthGetterCalls, 0);
  assert.equal(resizableBuffer.byteLength, original.byteLength);
});

test("authority, source-rights, carrier, expert, and freeze promotion stay rejected even with a fresh digest", async () => {
  const stored = await readBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  const variants = [
    (value) => { value.authorityBoundary.bindingFreezeEligible = true; },
    (value) => { value.authorityBoundary.bindingFrozenVerified = true; },
    (value) => { value.authorityBoundary.engineeringRationaleFrozen = true; },
    (value) => { value.externalEvidence.sourceRightsRecordId = "rights:forged"; },
    (value) => { value.externalEvidence.sourceCarrierRecordId = "carrier:forged"; },
    (value) => { value.externalEvidence.expertReviewIds = ["expert:forged"]; },
    (value) => { value.gateSummary.bindingFreezeEligible = true; },
    (value) => { value.gateSummary.bindingFrozenVerified = true; }
  ];
  for (const mutate of variants) {
    const candidate = clone(stored);
    mutate(candidate);
    withFreshDigest(candidate);
    await assert.rejects(
      verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, candidate),
      rejectsCode("AUTHORITY_PROMOTION_FORBIDDEN")
    );
  }
});

test("atomic, mutation-epoch, interval-mutation, and ABA promotions are rejected", async () => {
  const stored = await readBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  const variants = [
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.mutationEpochAvailableForSchema13 = true; },
    (value) => { value.observationBoundary.mutationEpochReceipt = { epoch: 1 }; },
    (value) => { value.observationBoundary.intervalMutationExcluded = true; },
    (value) => { value.observationBoundary.abaExcluded = true; }
  ];
  for (const mutate of variants) {
    const candidate = clone(stored);
    mutate(candidate);
    withFreshDigest(candidate);
    await assert.rejects(
      verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, candidate),
      rejectsCode("OBSERVATION_PROMOTION_FORBIDDEN")
    );
  }
});

test("value tampering with a recomputed digest is rejected by the stricter candidate boundary", async () => {
  const stored = await readBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  const candidate = clone(stored);
  candidate.valueEvidenceRecords[0].repositoryProjection.monthCommand = 40;
  candidate.valueEvidenceRecords[0].projectionDigest = "0".repeat(64);
  withFreshDigest(candidate);
  await assert.rejects(
    verifyBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot, candidate),
    rejectsCode("CANDIDATE_SCHEMA_INVALID")
  );
});

test("a symlinked basis endpoint is rejected before parsing", async (t) => {
  const fixture = await makeFixture(t);
  const policyPath = path.resolve(fixture, ...POLICY_RELATIVE_PATH.split("/"));
  const detachedPath = path.join(fixture, "detached-strength-policy.ts");
  await copyFile(policyPath, detachedPath);
  await rm(policyPath);
  try {
    await symlink(detachedPath, policyPath, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.skip(`platform denied symlink fixture: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("FILE_ENDPOINT_INVALID")
  );
});

test("a hard-linked basis endpoint is rejected", async (t) => {
  const fixture = await makeFixture(t);
  const policyPath = path.resolve(fixture, ...POLICY_RELATIVE_PATH.split("/"));
  const detachedPath = path.join(fixture, "detached-strength-policy.ts");
  await rename(policyPath, detachedPath);
  try {
    await link(detachedPath, policyPath);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "EXDEV"].includes(error?.code)) {
      t.skip(`platform denied hardlink fixture: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("HARD_LINK_FORBIDDEN")
  );
});

test("a path endpoint replacement after held-handle read is rejected", async (t) => {
  const fixture = await makeFixture(t);
  const policyPath = path.resolve(fixture, ...POLICY_RELATIVE_PATH.split("/"));
  const heldPath = `${policyPath}.held`;
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture, {
      testHooksByPath: {
        [POLICY_RELATIVE_PATH]: {
          afterHeldHandleRead: async () => {
            await rename(policyPath, heldPath);
            await copyFile(heldPath, policyPath);
          }
        }
      }
    }),
    rejectsCode("FILE_CHANGED_DURING_READ")
  );
});

test("builder rejects fixed-v1 basis byte drift even when scoped AST projections stay unchanged", async (t) => {
  const fixture = await makeFixture(t);
  const corePath = path.resolve(fixture, ...CORE_RELATIVE_PATH.split("/"));
  const source = await readFile(corePath, "utf8");
  await writeFile(corePath, `${source}\n// unrelated fixed-v1 basis drift\n`, "utf8");
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("CANDIDATE_SCHEMA_INVALID")
  );
});

test("a promoted source-rights record in the parent freeze ledger is rejected", async (t) => {
  const fixture = await makeFixture(t);
  const freezePath = path.resolve(fixture, ...FREEZE_RELATIVE_PATH.split("/"));
  const ledger = JSON.parse(await readFile(freezePath, "utf8"));
  const weights = ledger.bindings.find((entry) => entry.bindingId === "binding:policy:weights");
  weights.sourceRightsRecordId = "rights:forged";
  ledger.ledgerDigest = computeBaziBindingFreezeRequirementsDigest(ledger);
  await writeFile(freezePath, `${JSON.stringify(ledger)}\n`, "utf8");
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("PARENT_AUTHORITY_DRIFT")
  );
});

test("a re-signed omitted identity promotion in the parent freeze ledger is rejected", async (t) => {
  const fixture = await makeFixture(t);
  const freezePath = path.resolve(fixture, ...FREEZE_RELATIVE_PATH.split("/"));
  const ledger = JSON.parse(await readFile(freezePath, "utf8"));
  const weights = ledger.bindings.find((entry) => entry.bindingId === "binding:policy:weights");
  weights.workIdentityFrozen = true;
  ledger.ledgerDigest = computeBaziBindingFreezeRequirementsDigest(ledger);
  await writeFile(freezePath, `${JSON.stringify(ledger)}\n`, "utf8");
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("PARENT_AUTHORITY_DRIFT")
  );
});

test("re-signed parent freeze strings and candidate identity cannot silently promote the scoped entry", async (t) => {
  const variants = [
    (weights) => { weights.authorityBoundary = "classical_parameter_authority_verified"; },
    (weights) => { weights.candidateState = "binding_frozen_verified"; },
    (weights) => { weights.currentDistributionBoundary = "public_redistribution_cleared"; },
    (weights) => { weights.candidateIds = ["candidate:forged-authoritative"]; },
    (weights) => { weights.freezeEvidenceMode = "source_quote_and_expert_consensus"; }
  ];
  for (const mutate of variants) {
    const fixture = await makeFixture(t);
    const freezePath = path.resolve(fixture, ...FREEZE_RELATIVE_PATH.split("/"));
    const ledger = JSON.parse(await readFile(freezePath, "utf8"));
    const weights = ledger.bindings.find((entry) => entry.bindingId === "binding:policy:weights");
    mutate(weights);
    ledger.ledgerDigest = computeBaziBindingFreezeRequirementsDigest(ledger);
    await writeFile(freezePath, `${JSON.stringify(ledger)}\n`, "utf8");
    await assert.rejects(
      buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
      rejectsCode("PARENT_AUTHORITY_DRIFT")
    );
  }
});

test("value-subject metadata and coverage cannot be promoted through a re-signed parent or candidate", async (t) => {
  const parentVariants = [
    {
      mutate: (weights) => { weights.valueSubjectCoverageComplete = true; },
      code: "PARENT_AUTHORITY_DRIFT"
    },
    {
      mutate: (weights) => { weights.valueSubjects[0].kind = "frozen_source_value"; },
      code: "PARENT_VALUE_SUBJECT_DRIFT"
    },
    {
      mutate: (weights) => { weights.valueSubjects[0].observationState = "binding_frozen_verified"; },
      code: "PARENT_VALUE_SUBJECT_DRIFT"
    },
    {
      mutate: (weights) => { weights.valueSubjects[1].producerRefs = ["source:forged-authority"]; },
      code: "PARENT_VALUE_SUBJECT_DRIFT"
    },
    {
      mutate: (weights) => { weights.valueSubjects[2].consumerRefs = ["consumer:forged-coverage"]; },
      code: "PARENT_VALUE_SUBJECT_DRIFT"
    }
  ];
  for (const variant of parentVariants) {
    const fixture = await makeFixture(t);
    const gapPath = path.resolve(
      fixture,
      "content",
      "system-admission",
      "bazi-engineering-binding-value-subject-gaps.v1.json"
    );
    const ledger = JSON.parse(await readFile(gapPath, "utf8"));
    const weights = ledger.engineeringBindings.find((entry) => entry.bindingId === "binding:policy:weights");
    variant.mutate(weights);
    ledger.ledgerDigest = computeBaziEngineeringBindingValueSubjectGapDigest(ledger);
    await writeFile(gapPath, `${JSON.stringify(ledger)}\n`, "utf8");
    await assert.rejects(
      buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
      rejectsCode(variant.code)
    );
  }

  const stored = await readBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  const candidateVariants = [
    (value) => { value.valueEvidenceRecords[0].observationState = "binding_frozen_verified"; },
    (value) => { value.valueEvidenceRecords[1].producerRefs = ["source:forged-authority"]; },
    (value) => { value.valueEvidenceRecords[2].consumerRefs = ["consumer:forged-coverage"]; },
    (value) => { value.valueEvidenceRecords[0].sourceOrRationaleRefs = ["rationale:forged"]; },
    (value) => { value.valueEvidenceRecords[0].syntaxProjectionMechanicallyObserved = false; },
    (value) => { value.valueEvidenceRecords[0].generalControlFlowEquivalenceMechanicallyEstablished = true; },
    (value) => { value.valueEvidenceRecords[0].generalDataFlowEquivalenceMechanicallyEstablished = true; },
    (value) => { value.valueEvidenceRecords[0].runtimeExecutionObserved = true; },
    (value) => { value.valueEvidenceRecords[0].valueProvenanceFrozen = true; },
    (value) => { value.valueEvidenceRecords[0].independentDomainReviewed = true; },
    (value) => { value.valueEvidenceRecords[0].freezeEffect = "binding_frozen_verified"; },
    (value) => { value.valueEvidenceRecords[0].projectionDigest = "0".repeat(64); },
    (value) => {
      const record = value.valueEvidenceRecords[0];
      record.repositoryProjection.monthCommand = 40;
      record.projectionDigest = createHash("sha256")
        .update(canonicalStringifyBaziPolicyWeightsValueEvidenceCandidate(record.repositoryProjection), "utf8")
        .digest("hex");
    }
  ];
  for (const mutate of candidateVariants) {
    const candidate = clone(stored);
    mutate(candidate);
    withFreshDigest(candidate);
    assert.throws(
      () => parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(
        Buffer.from(`${JSON.stringify(candidate)}\n`, "utf8")
      ),
      rejectsCode("CANDIDATE_SCHEMA_INVALID")
    );
  }
});

test("whole-candidate authority fields and complete parent-ledger backlinks remain exact under re-signing", async (t) => {
  const stored = await readBaziPolicyWeightsValueEvidenceCandidate(workspaceRoot);
  const candidateVariants = [
    {
      mutate: (value) => { value.scopeBoundary.phase = "D_formally_admitted"; },
      code: "CANDIDATE_SCHEMA_INVALID"
    },
    {
      mutate: (value) => { value.observationBoundary.runtimeExecutionObserved = true; },
      code: "OBSERVATION_PROMOTION_FORBIDDEN"
    },
    {
      mutate: (value) => { value.observationBoundary.generalControlFlowEquivalenceMechanicallyEstablished = true; },
      code: "OBSERVATION_PROMOTION_FORBIDDEN"
    },
    {
      mutate: (value) => { value.policyBinding.authorityBoundary = "classical_authority_established"; },
      code: "CANDIDATE_SCHEMA_INVALID"
    },
    {
      mutate: (value) => { value.parentLedgerRefs.parentLedgersResigned = true; },
      code: "AUTHORITY_PROMOTION_FORBIDDEN"
    },
    {
      mutate: (value) => { value.gateSummary.contentTruthEstablished = true; },
      code: "AUTHORITY_PROMOTION_FORBIDDEN"
    },
    {
      mutate: (value) => { value.gateSummary.expertTruthEstablished = true; },
      code: "AUTHORITY_PROMOTION_FORBIDDEN"
    },
    {
      mutate: (value) => { value.gateSummary.rightsLegalConclusionEstablished = true; },
      code: "AUTHORITY_PROMOTION_FORBIDDEN"
    },
    {
      mutate: (value) => { value.basisArtifacts[0].sha256 = "0".repeat(64); },
      code: "CANDIDATE_SCHEMA_INVALID"
    }
  ];
  for (const variant of candidateVariants) {
    const candidate = clone(stored);
    variant.mutate(candidate);
    withFreshDigest(candidate);
    assert.throws(
      () => parseBaziPolicyWeightsValueEvidenceCandidateJsonBytes(
        Buffer.from(`${JSON.stringify(candidate)}\n`, "utf8")
      ),
      rejectsCode(variant.code)
    );
  }

  const parentVariants = [
    {
      relativePath: "content/bazi-strength-engineering-binding-candidates.v1.json",
      mutate: (ledger) => { ledger.status = "binding_frozen_verified"; },
      digest: computeEngineeringBindingCandidateLedgerDigest
    },
    {
      relativePath: "content/bazi-strength-engineering-binding-candidates.v1.json",
      mutate: (ledger) => {
        ledger.candidates.find((entry) => entry.bindingId === "binding:policy:weights").evidenceRole =
          "defines_classical_parameter_authority";
      },
      digest: computeEngineeringBindingCandidateLedgerDigest
    },
    {
      relativePath: "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.json",
      mutate: (ledger) => { ledger.gateSummary.releaseReady = true; },
      digest: computeBaziEngineeringBindingValueSubjectGapDigest
    },
    {
      relativePath: FREEZE_RELATIVE_PATH,
      mutate: (ledger) => { ledger.status = "binding_frozen_verified"; },
      digest: computeBaziBindingFreezeRequirementsDigest
    }
  ];
  for (const variant of parentVariants) {
    const fixture = await makeFixture(t);
    const parentPath = path.resolve(fixture, ...variant.relativePath.split("/"));
    const ledger = JSON.parse(await readFile(parentPath, "utf8"));
    variant.mutate(ledger);
    ledger.ledgerDigest = variant.digest(ledger);
    await writeFile(parentPath, `${JSON.stringify(ledger)}\n`, "utf8");
    await assert.rejects(
      buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
      rejectsCode("PARENT_DIGEST_DRIFT")
    );
  }
});

test("a re-signed unknown field in the scoped parent entry is rejected", async (t) => {
  const fixture = await makeFixture(t);
  const freezePath = path.resolve(fixture, ...FREEZE_RELATIVE_PATH.split("/"));
  const ledger = JSON.parse(await readFile(freezePath, "utf8"));
  const weights = ledger.bindings.find((entry) => entry.bindingId === "binding:policy:weights");
  weights.surprise = false;
  ledger.ledgerDigest = computeBaziBindingFreezeRequirementsDigest(ledger);
  await writeFile(freezePath, `${JSON.stringify(ledger)}\n`, "utf8");
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("PARENT_LEDGER_DRIFT")
  );
});

test("an incorrect hidden-index boolean guard is rejected before parent projection reuse", async (t) => {
  const fixture = await makeFixture(t);
  const policyPath = path.resolve(fixture, ...POLICY_RELATIVE_PATH.split("/"));
  const source = await readFile(policyPath, "utf8");
  const changed = source.replace(
    "if (!Number.isInteger(hiddenStemIndex) || (hiddenStemIndex as number) < 0)",
    "if (!Number.isInteger(hiddenStemIndex) && (hiddenStemIndex as number) < 0)"
  );
  assert.notEqual(changed, source);
  await writeFile(policyPath, changed, "utf8");
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("DISPATCH_PROJECTION_DRIFT")
  );
});

test("dead strengthFactorWeight calls cannot replace direct addFactor.weight consumers", async (t) => {
  const fixture = await makeFixture(t);
  const corePath = path.resolve(fixture, ...CORE_RELATIVE_PATH.split("/"));
  const source = await readFile(corePath, "utf8");
  const changed = source
    .replace(
      "  const factors: StrengthFactor[] = [];",
      "  const factors: StrengthFactor[] = [];\n  strengthFactorWeight(\"month_command\");"
    )
    .replace('weight: strengthFactorWeight("month_command")', "weight: 4");
  assert.notEqual(changed, source);
  await writeFile(corePath, changed, "utf8");
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("CONSUMER_PROJECTION_DRIFT")
  );
});

test("CLI-facing reader rejects Windows alternate-data-stream relative paths", async () => {
  await assert.rejects(
    readBaziPolicyWeightsValueEvidenceCandidate(
      workspaceRoot,
      `${BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH}:stream`
    ),
    rejectsCode("UNSAFE_RELATIVE_PATH")
  );
});

test("duplicate keys in a basis ledger are rejected before the parsed last value can be trusted", async (t) => {
  const fixture = await makeFixture(t);
  const freezePath = path.resolve(fixture, ...FREEZE_RELATIVE_PATH.split("/"));
  const original = await readFile(freezePath, "utf8");
  const expected = '  "schemaVersion": "1.5.0",';
  const duplicated = original.replace(
    expected,
    `  "schemaVersion": "forged",\n${expected}`
  );
  assert.notEqual(duplicated, original);
  await writeFile(freezePath, duplicated, "utf8");
  await assert.rejects(
    buildCurrentBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("JSON_DUPLICATE_KEY")
  );
});

test("a symlinked candidate endpoint is rejected by the CLI-facing reader", async (t) => {
  const fixture = await makeFixture(t, { includeCandidate: true });
  const candidatePath = path.resolve(
    fixture,
    ...BAZI_POLICY_WEIGHTS_VALUE_EVIDENCE_CANDIDATE_RELATIVE_PATH.split("/")
  );
  const detachedPath = path.join(fixture, "detached-candidate.json");
  await copyFile(candidatePath, detachedPath);
  await rm(candidatePath);
  try {
    await symlink(detachedPath, candidatePath, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.skip(`platform denied symlink fixture: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    readBaziPolicyWeightsValueEvidenceCandidate(fixture),
    rejectsCode("FILE_ENDPOINT_INVALID")
  );
});
