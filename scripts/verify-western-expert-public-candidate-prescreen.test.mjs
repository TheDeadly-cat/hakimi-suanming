import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
  WESTERN_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS,
  WESTERN_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS,
  WesternExpertPublicCandidatePrescreenError,
  canonicalStringifyWesternExpertPublicCandidatePrescreen,
  computeWesternExpertPublicCandidatePrescreenDigest,
  isVerifiedWesternExpertPublicCandidatePrescreen,
  loadWesternExpertPublicCandidatePrescreen,
  parseWesternExpertPublicCandidatePrescreenJsonBytes,
  serializeWesternExpertPublicCandidatePrescreen,
  verifyWesternExpertPublicCandidatePrescreenLedger,
  westernExpertPublicCandidatePrescreenTestOnly
} from "./western-expert-public-candidate-prescreen-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(
  PROJECT_ROOT,
  ...WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH.split("/")
);
const BASIS_RELATIVE_PATH = "docs/阶段E-西洋现实专家公开候选预筛-2026-08-31.md";
const BASIS_PATH = path.join(PROJECT_ROOT, ...BASIS_RELATIVE_PATH.split("/"));
const VERIFY_SCRIPT = path.join(PROJECT_ROOT, "scripts", "verify-western-expert-public-candidate-prescreen.mjs");
const WRITE_SCRIPT = path.join(PROJECT_ROOT, "scripts", "write-western-expert-public-candidate-prescreen.mjs");
const LIB_SCRIPT = path.join(PROJECT_ROOT, "scripts", "western-expert-public-candidate-prescreen-lib.mjs");

const persistedBytes = await readFile(LEDGER_PATH);
const persistedLedger = JSON.parse(persistedBytes.toString("utf8"));

function cloneLedger() {
  return JSON.parse(JSON.stringify(persistedLedger));
}

function reseal(ledger) {
  ledger.ledgerDigest = computeWesternExpertPublicCandidatePrescreenDigest(ledger);
  return ledger;
}

function expectCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof WesternExpertPublicCandidatePrescreenError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

async function expectAnyReject(fn) {
  await assert.rejects(fn);
}

async function makeMinimalFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-western-expert-prescreen-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const ledgerTarget = path.join(
    root,
    ...WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH.split("/")
  );
  const basisTarget = path.join(root, ...BASIS_RELATIVE_PATH.split("/"));
  await mkdir(path.dirname(ledgerTarget), { recursive: true });
  await mkdir(path.dirname(basisTarget), { recursive: true });
  await copyFile(LEDGER_PATH, ledgerTarget);
  await copyFile(BASIS_PATH, basisTarget);
  return { root, ledgerTarget, basisTarget };
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

test("persisted Western expert public prescreen passes held-handle closure with private brand", async () => {
  const result = await loadWesternExpertPublicCandidatePrescreen(PROJECT_ROOT);
  assert.equal(result.ok, true);
  assert.equal(isVerifiedWesternExpertPublicCandidatePrescreen(result), true);
  assert.equal(isVerifiedWesternExpertPublicCandidatePrescreen({ ...result }), false);
  assert.equal(result.publicCandidateLeadsObserved, 4);
  assert.equal(result.sourceObservations, 11);
  assert.equal(result.deduplicatedSourceGroups, 6);
  assert.equal(result.reviewQuestions, 6);
  assert.equal(result.pairwiseAssessments, 6);
  assert.equal(result.reviewerSlotsOccupied, 0);
  assert.equal(result.reviewerSlotsRequired, 2);
  assert.equal(result.sourceBindingsFrozenVerified, 0);
  assert.equal(result.sourceBindingsRequired, 28);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ledger));
});

test("persisted raw identity, canonical pretty bytes, and domain-separated digest are exact", () => {
  const rawSha256 = createHash("sha256").update(persistedBytes).digest("hex");
  assert.equal(persistedBytes.byteLength, westernExpertPublicCandidatePrescreenTestOnly.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(rawSha256, westernExpertPublicCandidatePrescreenTestOnly.EXPECTED_PERSISTED_RAW.rawSha256);
  assert.equal(persistedBytes.toString("utf8"), serializeWesternExpertPublicCandidatePrescreen(persistedLedger));
  assert.equal(computeWesternExpertPublicCandidatePrescreenDigest(persistedLedger), persistedLedger.ledgerDigest);
});

test("four named entries remain uncontacted candidate leads and occupy no expert seat", () => {
  const ledger = verifyWesternExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(
    ledger.candidates.map((entry) => entry.publicDisplayName),
    ["Wendy Stacey", "Geoff Gronlund", "Bruce Scofield", "Rhys Chatham"]
  );
  for (const candidate of ledger.candidates) {
    assert.equal(candidate.candidateState, "uncontacted_public_candidate_lead");
    assert.equal(candidate.reviewerSlot, null);
    assert.equal(candidate.identityVerified, false);
    assert.equal(candidate.credentialVerified, false);
    assert.equal(candidate.scopeVerified, false);
    assert.equal(candidate.independenceVerified, false);
    assert.equal(candidate.participationConsentVerified, false);
    assert.equal(candidate.expertStatusVerified, false);
    assert.equal(candidate.expertOpinionCollected, false);
    assert.equal(candidate.sealedOriginalOpinion, false);
    assert.equal(candidate.countsTowardExpertGate, false);
  }
});

test("eleven public observations deduplicate to six upstream groups without credential inference", () => {
  const ledger = verifyWesternExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.equal(ledger.sourceObservations.length, 11);
  assert.equal(new Set(ledger.sourceObservations.map((entry) => entry.sourceObservationId)).size, 11);
  assert.equal(ledger.sourceGroups.length, 6);
  assert.equal(new Set(ledger.sourceGroups.map((entry) => entry.sourceUpstreamGroupId)).size, 6);
  assert.equal(ledger.sourceGroupPolicy.sourceGroupCountDoesNotEstablishIdentityCredentialOrIndependence, true);
  assert.equal(
    ledger.sourceGroups.find((entry) => entry.sourceUpstreamGroupId === "PAA_NCGR").observationIds.length,
    2
  );
  assert.deepEqual(
    ledger.candidates.map((entry) => entry.deduplicatedSourceGroupCount),
    [3, 2, 2, 3]
  );
});

test("six review questions remain scope leads rather than verified scope", () => {
  const ledger = verifyWesternExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(ledger.reviewQuestionIds, WESTERN_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS);
  for (const candidate of ledger.candidates) {
    assert.equal(candidate.scopeMatrix.length, 6);
    assert.equal(candidate.scopeMatrix.some((entry) => entry.state === "verified"), false);
    assert.equal(candidate.scopeVerified, false);
  }
});

test("domain, engineering, and source-rights reviewer roles cannot substitute for one another", () => {
  const ledger = verifyWesternExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(
    ledger.roleSeparation.map((entry) => entry.roleId),
    ["western_domain_expert", "astronomy_engineering_reproducibility_reviewer", "source_rights_reviewer"]
  );
  assert.ok(ledger.roleSeparation[0].doesNotEstablish.includes("engineering_implementation_correctness"));
  assert.ok(ledger.roleSeparation[1].doesNotEstablish.includes("astrology_domain_truth"));
  assert.ok(ledger.roleSeparation[2].doesNotEstablish.includes("legal_judgment"));
});

test("all six pairs retain ten unresolved independence factors and count zero", () => {
  const ledger = verifyWesternExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(ledger.independenceFactorIds, WESTERN_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS);
  assert.equal(ledger.pairwiseIndependenceAssessments.length, 6);
  for (const pair of ledger.pairwiseIndependenceAssessments) {
    assert.equal(pair.assessmentState, "not_started");
    assert.equal(pair.factorStates.length, 10);
    assert.equal(pair.unknownFactorsPresent, true);
    assert.equal(pair.pairwiseIndependenceEstablished, false);
    assert.equal(pair.countsTowardExpertGate, false);
  }
});

test("zero-instance receipt keeps 0/2 experts and 0/28 bindings separate", () => {
  const receipt = verifyWesternExpertPublicCandidatePrescreenLedger(persistedLedger).zeroInstanceReceipt;
  assert.deepEqual(receipt, {
    publicCandidateLeadsObserved: 4,
    reviewerSlotsRequired: 2,
    reviewerSlotsOccupied: 0,
    identitiesVerified: 0,
    credentialsVerified: 0,
    scopeFitsVerified: 0,
    participationConsentsVerified: 0,
    pairwiseIndependenceAssessmentsCompleted: 0,
    independentExpertReviewsVerified: 0,
    sealedOriginalOpinions: 0,
    sourceBindingsRequired: 28,
    sourceBindingsFrozenVerified: 0,
    expertReviewBundleStatus: "absent/0",
    formalExpertGateCount: 0
  });
});

test("ledger stores no page body, exact quote, private contact data, dossier, or formal backlink", () => {
  const ledger = verifyWesternExpertPublicCandidatePrescreenLedger(persistedLedger);
  visit(ledger, (key) => {
    assert.doesNotMatch(key, /^(?:email|phone|telephone|address|contactDetails|privateDossier|credentialDocument|certificateImage)$/iu);
    assert.doesNotMatch(key, /^(?:pageBody|body|html|rawText|fullText|excerpt|quote|exactQuote|documentContent|pageContent)$/iu);
    assert.doesNotMatch(key, /^(?:reviewPacket|formalManifestBacklink|formalRegistryBacklink|assignedExpertSeat)$/iu);
  });
  assert.equal(ledger.observationBoundary.publicPageBodiesStored, false);
  assert.equal(ledger.observationBoundary.privateContactDataStored, false);
  assert.equal(ledger.observationBoundary.paidMaterialsAccessed, false);
});

test("self-resealed authority, seat, opinion, and zero-instance promotions are rejected", () => {
  const mutations = [
    (ledger) => { ledger.authorityBoundary.expertClaimsAuthorized = true; },
    (ledger) => { ledger.candidates[0].reviewerSlot = "western-domain-reviewer-A"; },
    (ledger) => { ledger.candidates[0].expertOpinionCollected = true; },
    (ledger) => { ledger.zeroInstanceReceipt.independentExpertReviewsVerified = 1; }
  ];
  for (const mutate of mutations) {
    const ledger = cloneLedger();
    mutate(ledger);
    assert.throws(() => verifyWesternExpertPublicCandidatePrescreenLedger(reseal(ledger)));
  }
});

test("self-resealed scope and independence fabrication is rejected", () => {
  const scope = cloneLedger();
  scope.candidates[0].scopeMatrix[0].state = "verified";
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(reseal(scope)), "LEDGER_CONTRACT_MISMATCH");

  const independence = cloneLedger();
  independence.pairwiseIndependenceAssessments[0].factorStates[0].state = "no_relationship_established";
  independence.pairwiseIndependenceAssessments[0].pairwiseIndependenceEstablished = true;
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(reseal(independence)), "LEDGER_CONTRACT_MISMATCH");
});

test("self-resealed source-group double counting and source catalog drift are rejected", () => {
  const doubled = cloneLedger();
  doubled.candidates[0].sourceUpstreamGroupIds.push("OPA");
  doubled.candidates[0].deduplicatedSourceGroupCount = 4;
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(reseal(doubled)), "LEDGER_CONTRACT_MISMATCH");

  const drift = cloneLedger();
  drift.sourceObservations[0].sourceUrl = "https://example.invalid/public-profile";
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(reseal(drift)), "LEDGER_CONTRACT_MISMATCH");
});

test("private-contact, page-body, exact-quote, and formal-seat field injection is rejected", () => {
  const cases = [
    ["contactDetails", "candidate@example.invalid", "PRIVATE_CONTACT_OR_DOSSIER_FIELD_FORBIDDEN"],
    ["pageBody", "copied page body", "PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN"],
    ["exactQuote", "copied exact quote", "PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN"],
    ["assignedExpertSeat", "A", "FORMAL_BACKLINK_OR_SEAT_FIELD_FORBIDDEN"]
  ];
  for (const [key, value, code] of cases) {
    const ledger = cloneLedger();
    ledger.candidates[0][key] = value;
    expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(reseal(ledger)), code);
  }
});

test("unknown fields and ordinary digest mismatch fail closed", () => {
  const unknown = cloneLedger();
  unknown.surprise = false;
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(reseal(unknown)), "LEDGER_CONTRACT_MISMATCH");

  const staleDigest = cloneLedger();
  staleDigest.status = "promoted";
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(staleDigest), "LEDGER_DIGEST_MISMATCH");
});

test("Proxy, accessor, alias, cycle, foreign prototype, and negative zero are rejected", () => {
  expectCode(
    () => verifyWesternExpertPublicCandidatePrescreenLedger(new Proxy(cloneLedger(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );

  const accessor = cloneLedger();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return "unsafe"; } });
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(accessor), "INPUT_ACCESSOR_FORBIDDEN");

  const alias = cloneLedger();
  alias.candidates[1].scopeMatrix = alias.candidates[0].scopeMatrix;
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(alias), "INPUT_ALIAS_FORBIDDEN");

  const cycle = cloneLedger();
  cycle.cycle = cycle;
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(cycle), "INPUT_CYCLE_FORBIDDEN");

  const foreign = cloneLedger();
  Object.setPrototypeOf(foreign, null);
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(foreign), "INPUT_PROTOTYPE_INVALID");

  const negativeZero = cloneLedger();
  negativeZero.zeroInstanceReceipt.reviewerSlotsOccupied = -0;
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(negativeZero), "INPUT_VALUE_INVALID");
});

test("own __proto__ payload is captured passively and rejected as contract drift", () => {
  const ledger = cloneLedger();
  Object.defineProperty(ledger, "__proto__", {
    value: { promoted: true },
    enumerable: true,
    configurable: true,
    writable: true
  });
  const digest = computeWesternExpertPublicCandidatePrescreenDigest(ledger);
  ledger.ledgerDigest = digest;
  expectCode(() => verifyWesternExpertPublicCandidatePrescreenLedger(ledger), "LEDGER_CONTRACT_MISMATCH");
  assert.equal(Object.getPrototypeOf({}), Object.prototype);
});

test("pure verification resists post-import primordial and iterator poisoning", () => {
  const childSource = `
    import { readFile } from "node:fs/promises";
    const moduleUnderTest = await import(${JSON.stringify(pathToFileURL(LIB_SCRIPT).href)});
    const ledger = JSON.parse(await readFile(${JSON.stringify(LEDGER_PATH)}, "utf8"));
    const poison = () => { throw new Error("poisoned primordial invoked"); };
    Array.isArray = poison;
    Array.prototype.find = poison;
    Array.prototype.map = poison;
    Array.prototype.push = poison;
    Array.prototype.some = poison;
    Array.prototype.sort = poison;
    Array.prototype[Symbol.iterator] = poison;
    Array.prototype.toJSON = poison;
    Object.create = poison;
    Object.defineProperty = poison;
    Object.entries = poison;
    Object.freeze = poison;
    Object.getOwnPropertyDescriptors = poison;
    Object.getPrototypeOf = poison;
    Object.is = poison;
    Object.isFrozen = poison;
    Object.keys = poison;
    Object.values = poison;
    Object.prototype.toJSON = poison;
    Reflect.apply = poison;
    Reflect.ownKeys = poison;
    Set.prototype.add = poison;
    Set.prototype.has = poison;
    String.prototype.includes = poison;
    String.prototype.split = poison;
    WeakSet.prototype.add = poison;
    WeakSet.prototype.delete = poison;
    WeakSet.prototype.has = poison;
    JSON.stringify = poison;
    Number.isFinite = poison;
    Number.isSafeInteger = poison;
    const verified = moduleUnderTest.verifyWesternExpertPublicCandidatePrescreenLedger(ledger);
    process.stdout.write(verified.ledgerDigest);
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", childSource], {
    cwd: PROJECT_ROOT,
    encoding: "utf8"
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, persistedLedger.ledgerDigest);
});

test("strict byte parser rejects duplicate JSON keys", () => {
  const bytes = Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"2.0.0"}', "utf8");
  expectCode(
    () => parseWesternExpertPublicCandidatePrescreenJsonBytes(bytes, "duplicate-test.json"),
    "JSON_DUPLICATE_KEY"
  );
});

test("bound Western parents and registry contain no backlink to this one-way child", async () => {
  const needles = [
    persistedLedger.ledgerId,
    WESTERN_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH
  ];
  const paths = [
    ...persistedLedger.upstreamArtifacts.map((entry) => entry.path),
    "content/system-admission/four-system-current-observation-registry.v2.json"
  ];
  for (const relativePath of paths) {
    const text = await readFile(path.join(PROJECT_ROOT, ...relativePath.split("/")), "utf8");
    for (const needle of needles) assert.equal(text.includes(needle), false, `${relativePath} contains backlink`);
  }
});

test("verifier rejects extra arguments and NODE_OPTIONS", () => {
  const withArgument = spawnSync(process.execPath, [VERIFY_SCRIPT, "unexpected"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8"
  });
  assert.notEqual(withArgument.status, 0);
  assert.deepEqual(JSON.parse(withArgument.stderr), {
    ok: false,
    code: "VERIFY_FAILED",
    message: "西洋专家公开候选账验证失败。"
  });

  const withNodeOptions = spawnSync(process.execPath, [VERIFY_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "--trace-warnings" }
  });
  assert.notEqual(withNodeOptions.status, 0);
  assert.deepEqual(JSON.parse(withNodeOptions.stderr), {
    ok: false,
    code: "VERIFY_FAILED",
    message: "西洋专家公开候选账验证失败。"
  });
});

test("exclusive writer refuses to overwrite the frozen artifact", () => {
  const result = spawnSync(process.execPath, [WRITE_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EEXIST/u);
});

test("held-handle loader rejects a symlinked ledger endpoint before reading parents", async (t) => {
  const { root, ledgerTarget } = await makeMinimalFixture(t);
  const realTarget = path.join(path.dirname(ledgerTarget), "target.json");
  await copyFile(ledgerTarget, realTarget);
  await rm(ledgerTarget);
  try {
    await symlink(realTarget, ledgerTarget, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symlink creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await expectAnyReject(() => loadWesternExpertPublicCandidatePrescreen(root));
});

test("held-handle loader rejects narrative basis drift before parent verification", async (t) => {
  const { root, basisTarget } = await makeMinimalFixture(t);
  const original = await readFile(basisTarget);
  await writeFile(basisTarget, Buffer.concat([original, Buffer.from("\nlocal drift\n", "utf8")]));
  await expectAnyReject(() => loadWesternExpertPublicCandidatePrescreen(root));
});

test("canonical comparison remains exact after a passive clone", () => {
  const verified = verifyWesternExpertPublicCandidatePrescreenLedger(cloneLedger());
  assert.equal(
    canonicalStringifyWesternExpertPublicCandidatePrescreen(verified),
    canonicalStringifyWesternExpertPublicCandidatePrescreen(persistedLedger)
  );
});
