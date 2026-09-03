import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
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
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import {
  WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH,
  WesternExpertPublicEvidenceFollowupError,
  buildExpectedWesternExpertPublicEvidenceFollowup,
  canonicalStringifyWesternExpertPublicEvidenceFollowup,
  computeWesternExpertPublicEvidenceFollowupDigest,
  isVerifiedWesternExpertPublicEvidenceFollowup,
  loadWesternExpertPublicEvidenceFollowup,
  parseWesternExpertPublicEvidenceFollowupJsonBytes,
  preflightWesternExpertPublicEvidenceFollowup,
  readWesternExpertPublicEvidenceFollowup,
  serializeWesternExpertPublicEvidenceFollowup,
  verifyWesternExpertPublicEvidenceFollowup,
  verifyWesternExpertPublicEvidenceFollowupArtifact,
  westernExpertPublicEvidenceFollowupTestOnly
} from "./western-expert-public-evidence-followup-lib.mjs";
import {
  loadWesternExpertPublicCandidatePrescreen,
  isVerifiedWesternExpertPublicCandidatePrescreen
} from "./western-expert-public-candidate-prescreen-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FOLLOWUP_PATH = path.join(
  PROJECT_ROOT,
  ...WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH.split("/")
);
const VERIFY_SCRIPT = path.join(PROJECT_ROOT, "scripts", "verify-western-expert-public-evidence-followup.mjs");
const WRITE_SCRIPT = path.join(PROJECT_ROOT, "scripts", "write-western-expert-public-evidence-followup.mjs");
const LIB_SCRIPT = path.join(PROJECT_ROOT, "scripts", "western-expert-public-evidence-followup-lib.mjs");
const PARENT_LIB_SCRIPT = path.join(PROJECT_ROOT, "scripts", "western-expert-public-candidate-prescreen-lib.mjs");
const persistedBytes = await readFile(FOLLOWUP_PATH);
const persistedFollowup = JSON.parse(persistedBytes.toString("utf8"));
const CLEAN_CLI_ENV = { ...process.env, NODE_OPTIONS: "" };
delete CLEAN_CLI_ENV.NODE_PATH;

function clone(value = persistedFollowup) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.followupDigest = computeWesternExpertPublicEvidenceFollowupDigest(value);
  return value;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof WesternExpertPublicEvidenceFollowupError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectCodeAsync(fn, code) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof WesternExpertPublicEvidenceFollowupError);
    assert.equal(error.code, code);
    return true;
  });
}

function visit(value, callback) {
  if (Array.isArray(value)) {
    for (const entry of value) visit(entry, callback);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    callback(key, child);
    visit(child, callback);
  }
}

async function makeChildOnlyFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "western-expert-followup-child-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, ...WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, persistedBytes);
  return { root, target };
}

test("persisted child has exact raw identity, canonical bytes and domain-separated digest", () => {
  const expectedRaw = westernExpertPublicEvidenceFollowupTestOnly.EXPECTED_PERSISTED_RAW;
  assert.equal(persistedBytes.byteLength, expectedRaw.rawBytes);
  assert.equal(createHash("sha256").update(persistedBytes).digest("hex"), expectedRaw.rawSha256);
  assert.equal(persistedBytes.toString("utf8"), serializeWesternExpertPublicEvidenceFollowup(persistedFollowup));
  assert.equal(
    persistedFollowup.followupDigest,
    computeWesternExpertPublicEvidenceFollowupDigest(persistedFollowup)
  );
  assert.equal(
    canonicalStringifyWesternExpertPublicEvidenceFollowup(persistedFollowup),
    canonicalStringifyWesternExpertPublicEvidenceFollowup(
      buildExpectedWesternExpertPublicEvidenceFollowup()
    )
  );
});

test("full load consumes the real parent brand and returns a non-forgeable child brand", async () => {
  const result = await loadWesternExpertPublicEvidenceFollowup(PROJECT_ROOT);
  assert.equal(result.offlineFollowupArtifactMechanicallyVerified, true);
  assert.equal(result.parentPrivateBrandVerified, true);
  assert.equal(result.parentPrescreenBound, true);
  assert.equal(isVerifiedWesternExpertPublicEvidenceFollowup(result), true);
  assert.equal(isVerifiedWesternExpertPublicEvidenceFollowup({ ...result }), false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.followup), true);
  assert.equal(result.reviewerSlots, "0/2");
  assert.equal(result.sourceBindings, "0/28");
  assert.equal(result.expertGateCount, 0);
});

test("parent itself is full-loaded with its private brand and remains unchanged", async () => {
  const parent = await loadWesternExpertPublicCandidatePrescreen(PROJECT_ROOT);
  assert.equal(isVerifiedWesternExpertPublicCandidatePrescreen(parent), true);
  assert.equal(isVerifiedWesternExpertPublicCandidatePrescreen({ ...parent }), false);
  assert.deepEqual(parent.ledgerArtifact, {
    path: westernExpertPublicEvidenceFollowupTestOnly.PARENT_ARTIFACT.path,
    rawBytes: westernExpertPublicEvidenceFollowupTestOnly.PARENT_ARTIFACT.rawBytes,
    rawSha256: westernExpertPublicEvidenceFollowupTestOnly.PARENT_ARTIFACT.rawSha256
  });
  assert.equal(parent.ledgerDigest, westernExpertPublicEvidenceFollowupTestOnly.PARENT_ARTIFACT.ledgerDigest);
  const candidate = parent.ledger.candidates.find((entry) => entry.candidateLeadId === "western-public-lead-003");
  assert.equal(candidate.candidateState, "uncontacted_public_candidate_lead");
  assert.equal(candidate.reviewerSlot, null);
  assert.equal(candidate.countsTowardExpertGate, false);
});

test("two existing parent observations are followed without adding a candidate or upstream family", () => {
  const followup = verifyWesternExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  assert.equal(followup.gateSummary.publicCandidateLeadsFollowedUp, 1);
  assert.equal(followup.gateSummary.publicSourceObservationsFollowedUp, 2);
  assert.equal(followup.gateSummary.readAttemptsOperatorRecorded, 4);
  assert.equal(followup.gateSummary.deduplicatedSourceGroups, 1);
  assert.deepEqual(followup.parentPrescreenArtifact.candidateLeadIds, ["western-public-lead-003"]);
  assert.deepEqual(followup.parentPrescreenArtifact.sourceObservationIds, [
    "SCOFIELD-PAA-BOARD",
    "SCOFIELD-PAA-CERTIFIED"
  ]);
  assert.deepEqual(followup.parentPrescreenArtifact.sourceUpstreamGroupIds, ["PAA_NCGR"]);
  assert.equal(followup.sourceGroups.length, 1);
  assert.equal(followup.sourceGroups[0].sourceUpstreamGroupId, "PAA_NCGR");
});

test("review questions, response-identity scope closure and null formal references are exact", () => {
  const followup = verifyWesternExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  const reviewQuestionIds = [
    "technical-time-coordinate-astronomy",
    "zodiac-house-node-aspect",
    "dignity-retrograde-transit-progression",
    "interpretation-high-risk-boundary",
    "source-rights-role-boundary",
    "uncertainty-counterexamples-abstention"
  ];
  assert.deepEqual(followup.reviewQuestionIds, reviewQuestionIds);
  assert.deepEqual(
    followup.candidateFollowup.scopeSignalMatrix,
    reviewQuestionIds.map((questionId) => ({
      questionId,
      state: "not_assessed_in_this_response_identity_followup"
    }))
  );
  assert.equal(followup.candidateFollowup.projectQuestionAnswered, false);
  assert.equal(followup.candidateFollowup.formalExpertIntakeRef, null);
  assert.equal(followup.candidateFollowup.formalReviewPacketRef, null);
  assert.equal(followup.candidateFollowup.seatAssignmentRef, null);
  for (const observation of followup.sourceObservations) {
    assert.equal(observation.deliveredBodyHashBindsSemanticSummary, false);
    assert.equal(observation.candidateTokenBindsRealPersonIdentity, false);
  }
  assert.equal(followup.networkObservationBoundary.operatorRecordedSummariesMechanicallyVerified, false);
  assert.equal(followup.integrityBoundary.mutationEpochReceipt, null);
});

test("the four operator-recorded attempts preserve exact timestamps and stable metadata", () => {
  const followup = verifyWesternExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  const [board, certified] = followup.sourceObservations;
  assert.deepEqual(board.readAttempts.map((attempt) => [attempt.startedAt, attempt.endedAt]), [
    ["2026-08-31T07:54:04.9600402Z", "2026-08-31T07:54:08.4202608Z"],
    ["2026-08-31T07:54:08.4424360Z", "2026-08-31T07:54:08.6777534Z"]
  ]);
  assert.deepEqual(certified.readAttempts.map((attempt) => [attempt.startedAt, attempt.endedAt]), [
    ["2026-08-31T07:54:08.7134642Z", "2026-08-31T07:54:08.8812750Z"],
    ["2026-08-31T07:54:08.8829889Z", "2026-08-31T07:54:09.0436262Z"]
  ]);
  for (const attempt of board.readAttempts) {
    assert.equal(attempt.httpStatusOperatorRecorded, 200);
    assert.equal(attempt.finalUrlEqualsRequestedUrlOperatorRecorded, true);
    assert.equal(attempt.contentTypeOperatorRecorded, "text/html; charset=UTF-8");
    assert.equal(attempt.deliveredBodyBytesOperatorRecorded, 492253);
    assert.equal(
      attempt.deliveredBodySha256OperatorRecorded,
      "00030e65acb8dbe3ffa61d6194ec56cdc069296bfe95e95bd30a4b3ee311dadb"
    );
    assert.equal(attempt.candidateTokenObservedOperatorRecorded, true);
  }
  for (const attempt of certified.readAttempts) {
    assert.equal(attempt.httpStatusOperatorRecorded, 200);
    assert.equal(attempt.finalUrlEqualsRequestedUrlOperatorRecorded, true);
    assert.equal(attempt.contentTypeOperatorRecorded, "text/html; charset=UTF-8");
    assert.equal(attempt.deliveredBodyBytesOperatorRecorded, 596252);
    assert.equal(
      attempt.deliveredBodySha256OperatorRecorded,
      "a33a03958ab0b856f00725cea4691fbaed4dcfd1c90c727a5afc3936c6cc957a"
    );
    assert.equal(attempt.candidateTokenObservedOperatorRecorded, true);
  }
});

test("link-only storage persists and prints zero body, quote, contact, dossier or opinion material", () => {
  const followup = verifyWesternExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  assert.equal(followup.storageBoundary.distributionPolicy, "link_only");
  assert.equal(followup.storageBoundary.remoteResponseBodiesPersisted, 0);
  assert.equal(followup.storageBoundary.remoteResponseBodiesPrinted, 0);
  assert.equal(followup.storageBoundary.pageBodiesStored, 0);
  assert.equal(followup.storageBoundary.exactQuotesStored, 0);
  assert.equal(followup.storageBoundary.personalContactDetailsStored, 0);
  assert.equal(followup.storageBoundary.privateDossiersStored, 0);
  assert.equal(followup.storageBoundary.originalExpertOpinionsStored, 0);
  visit(followup, (key) => {
    assert.doesNotMatch(key, /^(?:pageBody|rawBody|responseBody|bodyBase64|bodyText|html|rawText|fullText|excerpt|quote|exactQuote)$/iu);
    assert.doesNotMatch(key, /^(?:email|phone|address|contactDetails|privateDossier|rawOpinion|assignedExpertSeat)$/iu);
  });
});

test("stable two-read facts remain operator records rather than network attestation", () => {
  const boundary = verifyWesternExpertPublicEvidenceFollowupArtifact(persistedFollowup)
    .networkObservationBoundary;
  assert.equal(boundary.operatorRecordedNetworkFacts, true);
  assert.equal(boundary.sameProcessSequentialReadsOperatorRecorded, true);
  assert.equal(boundary.repeatedReadStabilityOperatorRecorded, true);
  assert.equal(boundary.captureExecutionReceiptStored, false);
  assert.equal(boundary.operatorRecordedFactsMechanicallyReplayed, false);
  assert.equal(boundary.operatorRecordedSummariesMechanicallyVerified, false);
  assert.equal(boundary.stableTwoReadEstablishesNetworkAttestation, false);
  assert.equal(boundary.remoteCaptureMechanicallyVerified, false);
  assert.equal(boundary.networkAttestationEstablished, false);
  assert.equal(boundary.publisherAuthenticityEstablished, false);
});

test("0/2, 0/28, authority and release boundaries all remain fail-closed", () => {
  const followup = verifyWesternExpertPublicEvidenceFollowupArtifact(persistedFollowup);
  assert.equal(followup.gateSummary.reviewerSlotsOccupied, 0);
  assert.equal(followup.gateSummary.reviewerSlotsRequired, 2);
  assert.equal(followup.gateSummary.sourceBindingsFrozenVerified, 0);
  assert.equal(followup.gateSummary.sourceBindingsRequired, 28);
  assert.equal(followup.gateSummary.expertReviewBundleStatus, "absent/0");
  assert.equal(followup.authorityBoundary.candidateDiscoveryOnly, true);
  for (const [key, value] of Object.entries(followup.authorityBoundary)) {
    if (key !== "candidateDiscoveryOnly") assert.equal(value, false, key);
  }
});

test("mutation, atomic snapshot, interval mutation and ABA claims remain false", () => {
  const boundary = verifyWesternExpertPublicEvidenceFollowupArtifact(persistedFollowup)
    .integrityBoundary;
  assert.equal(boundary.crossFileAtomicSnapshot, false);
  assert.equal(boundary.mutationEpochAvailable, false);
  assert.equal(boundary.mutationEpochReceipt, null);
  assert.equal(boundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(boundary.abaExcluded, false);
});

test("parent and every formal context contain no backlink to the child", async () => {
  const needles = [
    persistedFollowup.followupId,
    WESTERN_EXPERT_PUBLIC_EVIDENCE_FOLLOWUP_RELATIVE_PATH
  ];
  for (const relativePath of westernExpertPublicEvidenceFollowupTestOnly.FORMAL_CONTEXT_PATHS) {
    const text = await readFile(path.join(PROJECT_ROOT, ...relativePath.split("/")), "utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, `${relativePath} contains backlink`);
  }
  const preflight = await preflightWesternExpertPublicEvidenceFollowup(PROJECT_ROOT);
  assert.equal(preflight.parentPrivateBrandVerified, true);
  assert.equal(
    preflight.noBacklinkContextsVerified,
    westernExpertPublicEvidenceFollowupTestOnly.FORMAL_CONTEXT_PATHS.length
  );
});

test("self-reseal cannot promote candidate identity, credential, scope, independence, consent, status or seat", () => {
  const cases = [
    ["crossRecordPersonIdentityBindingVerified", true],
    ["currentRoleVerified", true],
    ["identityVerified", true],
    ["credentialVerified", true],
    ["scopeVerified", true],
    ["independenceVerified", true],
    ["participationConsentVerified", true],
    ["expertStatusVerified", true],
    ["expertOpinionCollected", true],
    ["sealedOriginalOpinion", true],
    ["countsTowardExpertGate", true],
    ["reviewerSlot", "western-domain-expert-a"],
    ["projectQuestionAnswered", true],
    ["formalExpertIntakeRef", "formal-intake-forged"],
    ["formalReviewPacketRef", "formal-packet-forged"],
    ["seatAssignmentRef", "western-domain-expert-a"]
  ];
  for (const [key, value] of cases) {
    const followup = clone();
    followup.candidateFollowup[key] = value;
    expectCode(
      () => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(followup)),
      "CANDIDATE_PROMOTION_FORBIDDEN"
    );
  }
});

test("self-reseal cannot rewrite review questions, scope signals or observation binding closures", () => {
  const reviewQuestion = clone();
  reviewQuestion.reviewQuestionIds[0] = "forged-question";
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(reviewQuestion)),
    "REVIEW_QUESTION_IDS_INVALID"
  );

  const scope = clone();
  scope.candidateFollowup.scopeSignalMatrix[0].state = "project_question_answered";
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(scope)),
    "SCOPE_PROMOTION_FORBIDDEN"
  );

  for (const key of [
    "deliveredBodyHashBindsSemanticSummary",
    "candidateTokenBindsRealPersonIdentity"
  ]) {
    const observation = clone();
    observation.sourceObservations[0][key] = true;
    expectCode(
      () => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(observation)),
      "OBSERVATION_BINDING_PROMOTION_FORBIDDEN"
    );
  }
});

test("self-reseal cannot split PAA_NCGR, add a candidate or rewrite an operator fact", () => {
  const split = clone();
  split.sourceGroups.push({
    sourceUpstreamGroupId: "PAA_NCGR_ALIAS",
    publicOwnerLabel: "forged",
    parentSourceObservationIds: ["SCOFIELD-PAA-CERTIFIED"],
    readAttemptCount: 2
  });
  split.sourceGroupPolicy.deduplicatedSourceGroupCount = 2;
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(split)),
    "FOLLOWUP_CONTRACT_MISMATCH"
  );

  const candidate = clone();
  candidate.parentPrescreenArtifact.candidateLeadIds.push("western-public-lead-004");
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(candidate)),
    "FOLLOWUP_CONTRACT_MISMATCH"
  );

  const fact = clone();
  fact.sourceObservations[0].readAttempts[0].deliveredBodySha256OperatorRecorded = "a".repeat(64);
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(fact)),
    "FOLLOWUP_CONTRACT_MISMATCH"
  );
});

test("self-reseal cannot promote storage, rights, network, integrity or authority", () => {
  const cases = [
    ["storageBoundary", "remoteResponseBodiesPersisted", 1, "STORAGE_PROMOTION_FORBIDDEN"],
    ["rightsBoundary", "redistributionRightsEstablished", true, "RIGHTS_PROMOTION_FORBIDDEN"],
    ["networkObservationBoundary", "networkAttestationEstablished", true, "NETWORK_PROMOTION_FORBIDDEN"],
    ["networkObservationBoundary", "operatorRecordedSummariesMechanicallyVerified", true, "NETWORK_PROMOTION_FORBIDDEN"],
    ["integrityBoundary", "mutationEpochAvailable", true, "INTEGRITY_PROMOTION_FORBIDDEN"],
    ["integrityBoundary", "mutationEpochReceipt", { epoch: 1 }, "INTEGRITY_PROMOTION_FORBIDDEN"],
    ["authorityBoundary", "expertClaimsAuthorized", true, "AUTHORITY_PROMOTION_FORBIDDEN"]
  ];
  for (const [boundary, key, value, code] of cases) {
    const followup = clone();
    followup[boundary][key] = value;
    expectCode(() => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(followup)), code);
  }
});

test("unknown, private, body, opinion and formal-seat fields fail closed after reseal", () => {
  const injections = [
    [[], "surprise", false],
    [["sourceObservations", 0], "pageBody", "forbidden"],
    [["candidateFollowup"], "email", "candidate@example.invalid"],
    [["candidateFollowup"], "rawOpinion", "agree"],
    [["candidateFollowup"], "assignedExpertSeat", "A"]
  ];
  for (const [segments, key, value] of injections) {
    const followup = clone();
    let target = followup;
    for (const segment of segments) target = target[segment];
    target[key] = value;
    const expectedCode = key === "surprise"
      ? "FOLLOWUP_CONTRACT_MISMATCH"
      : key === "pageBody"
        ? "PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN"
        : "PRIVATE_OR_FORMAL_FIELD_FORBIDDEN";
    expectCode(() => verifyWesternExpertPublicEvidenceFollowupArtifact(reseal(followup)), expectedCode);
  }
});

test("strict byte parser rejects duplicate keys, BOM, invalid UTF-8, empty and oversized input", () => {
  expectCode(
    () => parseWesternExpertPublicEvidenceFollowupJsonBytes(
      Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"2.0.0"}', "utf8")
    ),
    "JSON_DUPLICATE_KEY"
  );
  expectCode(
    () => parseWesternExpertPublicEvidenceFollowupJsonBytes(
      Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    "JSON_BOM_FORBIDDEN"
  );
  expectCode(
    () => parseWesternExpertPublicEvidenceFollowupJsonBytes(Buffer.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
  expectCode(
    () => parseWesternExpertPublicEvidenceFollowupJsonBytes(Buffer.alloc(0)),
    "JSON_INVALID"
  );
  expectCode(
    () => parseWesternExpertPublicEvidenceFollowupJsonBytes(Buffer.alloc(1_000_001, 0x61)),
    "JSON_TOO_LARGE"
  );
});

test("byte parser rejects Proxy, SharedArrayBuffer and resizable ArrayBuffer views", () => {
  expectCode(
    () => parseWesternExpertPublicEvidenceFollowupJsonBytes(
      new Proxy(new Uint8Array([0x7b, 0x7d]), {})
    ),
    "JSON_PROXY_FORBIDDEN"
  );
  if (typeof SharedArrayBuffer === "function") {
    expectCode(
      () => parseWesternExpertPublicEvidenceFollowupJsonBytes(
        new Uint8Array(new SharedArrayBuffer(8))
      ),
      "JSON_SHARED_BUFFER_FORBIDDEN"
    );
  }
  try {
    const resizable = new ArrayBuffer(8, { maxByteLength: 16 });
    if (resizable.resizable === true) {
      expectCode(
        () => parseWesternExpertPublicEvidenceFollowupJsonBytes(new Uint8Array(resizable)),
        "JSON_RESIZABLE_BUFFER_FORBIDDEN"
      );
    }
  } catch {
    // Runtime without resizable ArrayBuffer support.
  }
});

test("object API rejects Proxy, accessor, alias, cycle, sparse arrays and negative zero", () => {
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(new Proxy(clone(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );

  const accessor = clone();
  let invoked = false;
  Object.defineProperty(accessor.authorityBoundary, "identityVerified", {
    enumerable: true,
    get() {
      invoked = true;
      return false;
    }
  });
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(accessor),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(invoked, false);

  const alias = clone();
  alias.candidateFollowup.parentSourceObservationIds = alias.parentPrescreenArtifact.sourceObservationIds;
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(alias),
    "INPUT_ALIAS_FORBIDDEN"
  );

  const cycle = clone();
  cycle.cycle = cycle;
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(cycle),
    "INPUT_CYCLE_FORBIDDEN"
  );

  const sparse = clone();
  sparse.sourceObservations = new Array(2);
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(sparse),
    "INPUT_ARRAY_INVALID"
  );

  const negativeZero = clone();
  negativeZero.gateSummary.reviewerSlotsOccupied = -0;
  expectCode(
    () => verifyWesternExpertPublicEvidenceFollowupArtifact(negativeZero),
    "INPUT_VALUE_INVALID"
  );
});

test("canonical stringifier is passive and never invokes an accessor", () => {
  let invoked = false;
  const accessor = {};
  Object.defineProperty(accessor, "value", {
    enumerable: true,
    get() {
      invoked = true;
      return "forbidden";
    }
  });
  expectCode(
    () => canonicalStringifyWesternExpertPublicEvidenceFollowup(accessor),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(invoked, false);
});

test("full load remains deeply frozen and truthfully branded after post-import primordial poisoning", {
  concurrency: false
}, () => {
  const childSource = `
    import { createHash } from "node:crypto";
    const childModule = await import(${JSON.stringify(pathToFileURL(LIB_SCRIPT).href)});
    const parentModule = await import(${JSON.stringify(pathToFileURL(PARENT_LIB_SCRIPT).href)});
    const workspaceRoot = ${JSON.stringify(PROJECT_ROOT)};
    const objectIsFrozen = Object.isFrozen;
    const getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
    const reflectApply = Reflect.apply;
    const reflectOwnKeys = Reflect.ownKeys;
    const hashPrototype = Object.getPrototypeOf(createHash("sha256"));
    const originalHasOwn = Object.hasOwn;
    const originalFind = Array.prototype.find;
    const originalMap = Array.prototype.map;
    const originalSome = Array.prototype.some;
    const originalEntries = Object.entries;
    const originalIncludes = String.prototype.includes;
    const originalRegExpExec = RegExp.prototype.exec;
    const originalHashUpdate = hashPrototype.update;
    const originalHashDigest = hashPrototype.digest;
    const testOnly = childModule.westernExpertPublicEvidenceFollowupTestOnly;
    const childDigestDomain = "hakimi-western-expert-public-evidence-followup-v1\\0";
    const digestTargetHashes = new WeakSet();
    let hashPoisonMode = "update";
    const poison = (label) => { throw new Error("targeted poison: " + label); };

    const speciesDescriptor = Object.getOwnPropertyDescriptor(Array, Symbol.species);
    Object.defineProperty(Array, Symbol.species, {
      configurable: true,
      get() { poison("Array.species"); }
    });
    let speciesExpected;
    try {
      speciesExpected = childModule.buildExpectedWesternExpertPublicEvidenceFollowup();
    } finally {
      Object.defineProperty(Array, Symbol.species, speciesDescriptor);
    }
    const childSemanticDigest = speciesExpected.followupDigest;

    Object.hasOwn = function targetedHasOwn(target, key) {
      if (key === "value" && target && typeof target === "object"
        && target.value === "hakimi.western.expert-public-evidence-followup/1.0.0") {
        poison("Object.hasOwn");
      }
      return reflectApply(originalHasOwn, Object, [target, key]);
    };
    Array.prototype.find = function targetedFind(callback, thisArg) {
      for (let index = 0; index < this.length; index += 1) {
        const entry = this[index];
        if (entry?.candidateLeadId === "western-public-lead-003"
          || entry?.sourceObservationId === "SCOFIELD-PAA-BOARD") poison("Array.find");
      }
      return reflectApply(originalFind, this, [callback, thisArg]);
    };
    Array.prototype.map = function targetedMap(callback, thisArg) {
      if (this === testOnly.SOURCE_OBSERVATIONS
        || this === testOnly.PARENT_ARTIFACT.sourceObservationIds
        || this === testOnly.REVIEW_QUESTION_IDS
        || this === testOnly.SOURCE_OBSERVATIONS[0].readAttempts
        || this === testOnly.SOURCE_OBSERVATIONS[1].readAttempts) poison("Array.map");
      return reflectApply(originalMap, this, [callback, thisArg]);
    };
    Array.prototype.some = function targetedSome(callback, thisArg) {
      for (let index = 0; index < this.length; index += 1) {
        const entry = this[index];
        if (entry === "# 阶段 D-E：西洋现实专家公开证据跟进 child"
          || entry?.sourceObservationId === "SCOFIELD-PAA-BOARD") poison("Array.some");
      }
      return reflectApply(originalSome, this, [callback, thisArg]);
    };
    Object.entries = function targetedEntries(value) {
      if (value?.candidateDiscoveryOnly === true
        && reflectApply(originalHasOwn, Object, [value, "publicReleaseAuthorized"])) poison("Object.entries");
      return reflectApply(originalEntries, Object, [value]);
    };
    String.prototype.includes = function targetedIncludes(search, position) {
      if (search === "# 阶段 D-E：西洋现实专家公开证据跟进 child"
        || search === "hakimi.western.expert-public-evidence-followup/1.0.0"
        || search === "content/system-admission/western-expert-public-evidence-followup.v1.json") poison("String.includes");
      return reflectApply(originalIncludes, this, [search, position]);
    };
    RegExp.prototype.exec = function targetedRegExpExec(value) {
      if (value === childSemanticDigest
        || value === testOnly.EXPECTED_PERSISTED_RAW.rawSha256) poison("RegExp.exec");
      return reflectApply(originalRegExpExec, this, [value]);
    };
    hashPrototype.update = function targetedHashUpdate(value, encoding) {
      if (value === childDigestDomain) {
        if (hashPoisonMode === "update") poison("Hash.update");
        digestTargetHashes.add(this);
      }
      return reflectApply(originalHashUpdate, this, [value, encoding]);
    };
    hashPrototype.digest = function targetedHashDigest(encoding) {
      if (hashPoisonMode === "digest" && digestTargetHashes.has(this)) poison("Hash.digest");
      return reflectApply(originalHashDigest, this, [encoding]);
    };

    function expectPoison(action, label) {
      try {
        action();
      } catch (error) {
        if (error?.message === "targeted poison: " + label) return;
        throw error;
      }
      throw new Error(label + " poison was not armed");
    }
    expectPoison(() => Object.hasOwn({
      value: "hakimi.western.expert-public-evidence-followup/1.0.0"
    }, "value"), "Object.hasOwn");
    expectPoison(() => [{ candidateLeadId: "western-public-lead-003" }].find(() => true), "Array.find");
    expectPoison(() => testOnly.SOURCE_OBSERVATIONS.map(() => null), "Array.map");
    expectPoison(() => ["# 阶段 D-E：西洋现实专家公开证据跟进 child"].some(() => false), "Array.some");
    expectPoison(() => Object.entries({ candidateDiscoveryOnly: true, publicReleaseAuthorized: false }), "Object.entries");
    expectPoison(() => "probe".includes("hakimi.western.expert-public-evidence-followup/1.0.0"), "String.includes");
    expectPoison(() => /^[0-9a-f]{64}$/u.test(childSemanticDigest), "RegExp.exec");
    hashPoisonMode = "update";
    expectPoison(() => createHash("sha256").update(childDigestDomain), "Hash.update");
    hashPoisonMode = "digest";
    const digestProbe = createHash("sha256");
    digestProbe.update(childDigestDomain);
    expectPoison(() => digestProbe.digest("hex"), "Hash.digest");
    hashPoisonMode = "update";

    const parent = await parentModule.loadWesternExpertPublicCandidatePrescreen(workspaceRoot);
    if (!parentModule.isVerifiedWesternExpertPublicCandidatePrescreen(parent)) {
      throw new Error("parent full load brand unavailable under poison");
    }
    const updatePoisonResult = await childModule.loadWesternExpertPublicEvidenceFollowup(workspaceRoot);
    if (!childModule.isVerifiedWesternExpertPublicEvidenceFollowup(updatePoisonResult)) {
      throw new Error("child update-poison brand missing");
    }
    hashPoisonMode = "digest";
    const result = await childModule.loadWesternExpertPublicEvidenceFollowup(workspaceRoot);
    if (!childModule.isVerifiedWesternExpertPublicEvidenceFollowup(result)) {
      throw new Error("child brand missing before mutation attempt");
    }

    const seen = new WeakSet();
    function assertDeepFrozen(value) {
      if (value === null || typeof value !== "object" || seen.has(value)) return;
      seen.add(value);
      if (!objectIsFrozen(value)) throw new Error("branded result contains mutable nested object");
      const descriptors = getOwnPropertyDescriptors(value);
      const keys = reflectOwnKeys(descriptors);
      for (let index = 0; index < keys.length; index += 1) {
        const descriptor = descriptors[keys[index]];
        if ("value" in descriptor) assertDeepFrozen(descriptor.value);
      }
    }
    assertDeepFrozen(result);

    let authorityMutationRejected = false;
    try {
      result.followup.authorityBoundary.identityVerified = true;
    } catch {
      authorityMutationRejected = true;
    }
    if (!authorityMutationRejected || result.followup.authorityBoundary.identityVerified !== false) {
      throw new Error("nested authority mutation escaped freeze");
    }
    let questionMutationRejected = false;
    try {
      result.followup.reviewQuestionIds[0] = "forged-question";
    } catch {
      questionMutationRejected = true;
    }
    if (!questionMutationRejected
      || result.followup.reviewQuestionIds[0] !== "technical-time-coordinate-astronomy") {
      throw new Error("nested array mutation escaped freeze");
    }
    if (!childModule.isVerifiedWesternExpertPublicEvidenceFollowup(result)) {
      throw new Error("brand became untruthful after rejected mutations");
    }
    if (childModule.isVerifiedWesternExpertPublicEvidenceFollowup({ ...result })) {
      throw new Error("forged result acquired private brand");
    }
    process.stdout.write("primordial-closure-ok");
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", childSource], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: CLEAN_CLI_ENV
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "primordial-closure-ok");
});

test("plain reader is unbranded while caller verification returns a branded detached result", async () => {
  const readOnly = await readWesternExpertPublicEvidenceFollowup(PROJECT_ROOT);
  assert.equal(isVerifiedWesternExpertPublicEvidenceFollowup(readOnly), false);
  const result = await verifyWesternExpertPublicEvidenceFollowup(PROJECT_ROOT, clone());
  assert.equal(isVerifiedWesternExpertPublicEvidenceFollowup(result), true);
  assert.equal(isVerifiedWesternExpertPublicEvidenceFollowup(clone(result)), false);
});

test("held-handle reader rejects a symlinked file endpoint", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "western-followup-symlink-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const real = path.join(root, "real.json");
  const alias = path.join(root, "alias.json");
  await writeFile(real, "{}\n", "utf8");
  try {
    await symlink(real, alias, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symlink unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    westernExpertPublicEvidenceFollowupTestOnly.readStableArtifact(root, "alias.json")
  );
});

test("held-handle reader rejects a hardlinked file endpoint", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "western-followup-hardlink-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const real = path.join(root, "real.json");
  const alias = path.join(root, "alias.json");
  await writeFile(real, "{}\n", "utf8");
  try {
    await link(real, alias);
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN", "ENOTSUP"].includes(error?.code)) {
      t.skip(`hardlink unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    westernExpertPublicEvidenceFollowupTestOnly.readStableArtifact(root, "alias.json")
  );
});

test("held-handle reader rejects a directory junction or symlink", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "western-followup-junction-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const real = path.join(root, "real");
  await mkdir(real);
  await writeFile(path.join(real, "artifact.json"), "{}\n", "utf8");
  try {
    await symlink(real, path.join(root, "alias"), process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`directory link unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    westernExpertPublicEvidenceFollowupTestOnly.readStableArtifact(root, "alias/artifact.json")
  );
});

test("persisted child raw drift fails before parent or formal contexts are consulted", async (t) => {
  const { root, target } = await makeChildOnlyFixture(t);
  await writeFile(target, Buffer.concat([persistedBytes, Buffer.from("\n", "utf8")]));
  await expectCodeAsync(
    () => westernExpertPublicEvidenceFollowupTestOnly.readPersistedFollowupArtifact(root),
    "FOLLOWUP_RAW_IDENTITY_DRIFT"
  );
});

test("CLI success is calibrated, body-free and carries no generic ok field", () => {
  const run = spawnSync(process.execPath, [VERIFY_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: CLEAN_CLI_ENV
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const output = JSON.parse(run.stdout);
  assert.equal(output.offlineFollowupArtifactMechanicallyVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(Object.hasOwn(output, "followup"), false);
  assert.equal(output.parentPrivateBrandVerified, true);
  assert.equal(output.reviewerSlots, "0/2");
  assert.equal(output.sourceBindings, "0/28");
  assert.equal(output.remoteResponseBodiesPersisted, 0);
  assert.equal(output.remoteResponseBodiesPrinted, 0);
  assert.equal(output.remoteCaptureMechanicallyVerified, false);
  assert.equal(output.networkAttestationEstablished, false);
  assert.equal(output.expertClaimsAuthorized, false);
  assert.equal(output.publicReleaseAuthorized, false);
});

test("CLI rejects operands, NODE_OPTIONS, NODE_PATH and a caller-controlled cwd", () => {
  const cases = [
    spawnSync(process.execPath, [VERIFY_SCRIPT, "unexpected"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: CLEAN_CLI_ENV
    }),
    spawnSync(process.execPath, [VERIFY_SCRIPT], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: { ...CLEAN_CLI_ENV, NODE_OPTIONS: "--trace-warnings" }
    }),
    spawnSync(process.execPath, [VERIFY_SCRIPT], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: { ...CLEAN_CLI_ENV, NODE_PATH: "visible-node-path" }
    }),
    spawnSync(process.execPath, [VERIFY_SCRIPT], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: CLEAN_CLI_ENV
    })
  ];
  for (const run of cases) {
    assert.notEqual(run.status, 0);
    assert.equal(run.stdout, "");
    assert.deepEqual(JSON.parse(run.stderr), {
      offlineFollowupArtifactMechanicallyVerified: false,
      code: "VERIFY_FAILED",
      message: "西洋公开证据 follow-up child 验证失败。"
    });
  }
});

test("import.meta.main rejects wrappers that forge argv[1] to each CLI path before business import without writes", async () => {
  const before = await readFile(FOLLOWUP_PATH);
  const cases = [
    [VERIFY_SCRIPT, "verifier 只允许作为 import.meta.main 直接启动。", "verifier"],
    [WRITE_SCRIPT, "writer 只允许作为 import.meta.main 直接启动。", "writer"]
  ];
  for (const [targetPath, expectedMessage, label] of cases) {
    const targetUrl = pathToFileURL(targetPath).href;
    const wrapperSource = `
      const targetPath = ${JSON.stringify(targetPath)};
      const targetUrl = ${JSON.stringify(targetUrl)};
      process.argv[1] = targetPath;
      const expectedMessage = ${JSON.stringify(expectedMessage)};
      const findDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "find");
      Object.defineProperty(Array.prototype, "find", {
        configurable: true,
        get() { throw new Error("business import reached before direct-entry rejection"); }
      });
      let rejection = null;
      try {
        await import(targetUrl);
      } catch (error) {
        rejection = error;
      } finally {
        Object.defineProperty(Array.prototype, "find", findDescriptor);
      }
      if (!rejection || rejection.message !== expectedMessage) {
        throw rejection ?? new Error("indirect import unexpectedly resolved");
      }
      process.stdout.write(JSON.stringify({ indirectImportRejected: true }));
    `;
    const run = spawnSync(process.execPath, ["--input-type=module", "-e", wrapperSource], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: CLEAN_CLI_ENV
    });
    assert.equal(run.status, 0, `${label}: ${run.stderr}`);
    assert.equal(run.stderr, "");
    assert.deepEqual(JSON.parse(run.stdout), { indirectImportRejected: true });
  }
  const after = await readFile(FOLLOWUP_PATH);
  assert.deepEqual(after, before);
});

test("writer and verifier reject visible import or loader execArgv before business import", () => {
  const businessImportTrap = "data:text/javascript," + encodeURIComponent(
    'Object.defineProperty(Array.prototype,"find",{configurable:true,get(){throw new Error("business import reached")}})'
  );
  const visibleLoader = "data:text/javascript," + encodeURIComponent(
    'process.execArgv.length=0;process.execArgv.push("--loader=visible-test")'
  );
  for (const script of [VERIFY_SCRIPT, WRITE_SCRIPT]) {
    for (const execArg of [`--import=${businessImportTrap}`, `--import=${visibleLoader}`]) {
      const run = spawnSync(process.execPath, [execArg, script], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        env: CLEAN_CLI_ENV
      });
      assert.notEqual(run.status, 0);
      assert.equal(run.stdout, "");
      assert.doesNotMatch(run.stderr, /business import reached/iu);
      const failure = JSON.parse(run.stderr);
      assert.equal(
        failure.code,
        script === VERIFY_SCRIPT ? "VERIFY_FAILED" : "WRITE_FAILED"
      );
    }
  }
});

test("exclusive writer refuses to overwrite the frozen child", () => {
  const run = spawnSync(process.execPath, [WRITE_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: CLEAN_CLI_ENV
  });
  assert.notEqual(run.status, 0);
  assert.equal(run.stdout, "");
  const output = JSON.parse(run.stderr);
  assert.equal(output.followupArtifactCreatedExclusively, false);
  assert.equal(output.code, "EEXIST");
  assert.equal(output.message, "西洋 follow-up child 独占写入失败。");
});
