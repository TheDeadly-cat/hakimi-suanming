import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  BAZI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
  BAZI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS,
  BAZI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS,
  BaziExpertPublicCandidatePrescreenError,
  computeBaziExpertPublicCandidatePrescreenDigest,
  loadBaziExpertPublicCandidatePrescreen,
  parseBaziExpertPublicCandidatePrescreenJsonBytes,
  verifyBaziExpertPublicCandidatePrescreenLedger
} from "./bazi-expert-public-candidate-prescreen-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(PROJECT_ROOT, ...BAZI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH.split("/"));
const BASIS_RELATIVE_PATH = "docs/阶段D八字现实专家公开候选预筛-2026-08-29.md";
const BASIS_PATH = path.join(PROJECT_ROOT, ...BASIS_RELATIVE_PATH.split("/"));

const persistedLedger = JSON.parse(await readFile(LEDGER_PATH, "utf8"));

function cloneLedger() {
  return JSON.parse(JSON.stringify(persistedLedger));
}

function reseal(ledger) {
  ledger.ledgerDigest = computeBaziExpertPublicCandidatePrescreenDigest(ledger);
  return ledger;
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof BaziExpertPublicCandidatePrescreenError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectCodeAsync(fn, code) {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof BaziExpertPublicCandidatePrescreenError);
    assert.equal(error.code, code);
    return true;
  });
}

async function makeWorkspaceFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-public-prescreen-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  const ledgerTarget = path.join(root, ...BAZI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH.split("/"));
  const basisTarget = path.join(root, ...BASIS_RELATIVE_PATH.split("/"));
  await mkdir(path.dirname(ledgerTarget), { recursive: true });
  await mkdir(path.dirname(basisTarget), { recursive: true });
  await copyFile(LEDGER_PATH, ledgerTarget);
  await copyFile(BASIS_PATH, basisTarget);
  return { root, ledgerTarget, basisTarget };
}

function visitKeys(value, visitor) {
  if (Array.isArray(value)) {
    for (const child of value) visitKeys(child, visitor);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    visitor(key);
    visitKeys(child, visitor);
  }
}

test("persisted public-candidate prescreen passes held-handle and same-buffer verification", async () => {
  const result = await loadBaziExpertPublicCandidatePrescreen(PROJECT_ROOT);
  assert.equal(result.ok, true);
  assert.equal(result.candidateLeads, 4);
  assert.equal(result.sourceObservations, 11);
  assert.equal(result.deduplicatedSourceGroups, 6);
  assert.equal(result.scopeQuestions, 4);
  assert.equal(result.independenceFactors, 10);
  assert.equal(result.pairwiseAssessments, 6);
  assert.equal(result.expertGateCount, 0);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.ledger.observationBoundary.heldHandleRead, true);
  assert.equal(result.ledger.observationBoundary.sameBufferHashAndParse, true);
  assert.equal(result.ledger.observationBoundary.basisSameBufferHashAndInspection, true);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ledger));
});

test("ledger stores exactly four uncontacted public candidate leads with null slot assignments", () => {
  const ledger = verifyBaziExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.equal(ledger.candidates.length, 4);
  for (const candidate of ledger.candidates) {
    assert.equal(candidate.candidateState, "uncontacted_public_candidate_lead");
    assert.equal(candidate.slotAssignment, null);
    assert.equal(candidate.identityVerified, false);
    assert.equal(candidate.credentialVerified, false);
    assert.equal(candidate.scopeVerified, false);
    assert.equal(candidate.independenceVerified, false);
    assert.equal(candidate.expertStatusVerified, false);
    assert.equal(candidate.countsTowardExpertGate, false);
  }
});

test("eligible observations exclude login endpoints and deduplicate same-upstream pages", () => {
  const ledger = verifyBaziExpertPublicCandidatePrescreenLedger(persistedLedger);
  const forbiddenPath = ["/lo", "gin"].join("");
  assert.equal(ledger.sourceObservations.length, 11);
  assert.equal(ledger.sourceObservations.some((entry) => entry.sourceUrl.includes(forbiddenPath)), false);
  assert.equal(ledger.sourceGroups.length, 6);
  const nycu = ledger.sourceGroups.find((entry) => entry.sourceUpstreamGroupId === "NYCU");
  const firstCandidate = ledger.candidates.find((entry) => entry.candidateLeadId === "bazi-public-lead-001");
  assert.equal(nycu.observationIds.length, 3);
  assert.equal(firstCandidate.deduplicatedSourceGroupCount, 1);
  assert.deepEqual(firstCandidate.sourceUpstreamGroupIds, ["NYCU"]);
});

test("ledger has no private, outreach, review-material, page-body, or formal-backlink fields", () => {
  const ledger = verifyBaziExpertPublicCandidatePrescreenLedger(persistedLedger);
  visitKeys(ledger, (key) => {
    assert.doesNotMatch(key, /(?:private|contact|consent|dossier|opinion)/iu);
    assert.doesNotMatch(key, /^(?:pageBody|body|html|rawText|fullText|excerpt|quote|documentContent|pageContent)$/iu);
    assert.doesNotMatch(key, /(?:packet|manifest|registry|backlink)/iu);
  });
});

test("scope matrix remains four-question and never promotes public observations", () => {
  const ledger = verifyBaziExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(ledger.reviewQuestionIds, BAZI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS);
  for (const candidate of ledger.candidates) {
    assert.equal(candidate.scopeMatrix.length, 4);
    assert.equal(candidate.scopeMatrix.some((entry) => entry.state === "direct_public_evidence_observed"), false);
  }
});

test("ten independence factors remain unresolved across all six candidate pairs", () => {
  const ledger = verifyBaziExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(ledger.independenceFactorIds, BAZI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS);
  assert.equal(ledger.pairwiseIndependenceAssessments.length, 6);
  for (const pair of ledger.pairwiseIndependenceAssessments) {
    assert.equal(pair.factorStates.length, 10);
    assert.equal(pair.pairwiseIndependenceEstablished, false);
    assert.equal(pair.countsTowardExpertGate, false);
  }
});

test("rejects same-upstream double counting even after digest recomputation", () => {
  const ledger = cloneLedger();
  ledger.candidates[0].sourceUpstreamGroupIds.push("NYCU");
  ledger.candidates[0].deduplicatedSourceGroupCount = 2;
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "SOURCE_GROUP_DOUBLE_COUNT");
});

test("rejects private or outreach field injection", () => {
  const ledger = cloneLedger();
  ledger.candidates[0].contactEmail = "candidate@example.invalid";
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "PRIVATE_OR_CONTACT_FIELD_FORBIDDEN");
});

test("rejects page-body injection", () => {
  const ledger = cloneLedger();
  ledger.sourceObservations[0].pageBody = "copied page material";
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "PAGE_BODY_FIELD_FORBIDDEN");
});

test("rejects forbidden material hidden in an allowed observationSummary after digest recomputation", () => {
  const injectedSummaries = [
    "Contact candidate@example.invalid or +1-555-0100 for private intake.",
    "Copied page body excerpt presented here as if it were only a summary.",
    "See https://example.invalid/login and the formal packet registry backlink.",
    "Identity, credentials, scope, and independence are verified; count this expert toward the gate."
  ];
  for (const observationSummary of injectedSummaries) {
    const ledger = cloneLedger();
    ledger.sourceObservations[0].observationSummary = observationSummary;
    expectCode(
      () => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)),
      "SOURCE_OBSERVATION_CATALOG_MISMATCH"
    );
  }
});

test("rejects login URL injection", () => {
  const ledger = cloneLedger();
  const injected = new URL("https://example.invalid/");
  injected.pathname = ["/lo", "gin"].join("");
  ledger.sourceObservations[0].sourceUrl = injected.href;
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "LOGIN_URL_FORBIDDEN");
});

test("rejects scope promotion", () => {
  const ledger = cloneLedger();
  ledger.candidates[0].scopeMatrix[0].state = "direct_public_evidence_observed";
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "SCOPE_PROMOTION_FORBIDDEN");
});

test("rejects expert-name injection", () => {
  const ledger = cloneLedger();
  ledger.candidates[0].expertName = ledger.candidates[0].publicDisplayName;
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "EXPERT_OR_SEAT_FIELD_FORBIDDEN");
});

test("rejects reviewer-seat assignment", () => {
  const ledger = cloneLedger();
  ledger.candidates[0].slotAssignment = "reviewer-A";
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "SEAT_PROMOTION_FORBIDDEN");
});

test("rejects independence fabrication", () => {
  const ledger = cloneLedger();
  ledger.pairwiseIndependenceAssessments[0].factorStates[0].state = "no_relationship_established";
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "INDEPENDENCE_FABRICATION_FORBIDDEN");
});

test("rejects pairwise independence promotion", () => {
  const ledger = cloneLedger();
  ledger.pairwiseIndependenceAssessments[0].pairwiseIndependenceEstablished = true;
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "INDEPENDENCE_FABRICATION_FORBIDDEN");
});

test("rejects authority promotion", () => {
  const ledger = cloneLedger();
  ledger.authorityBoundary.expertClaimsAuthorized = true;
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "AUTHORITY_PROMOTION_FORBIDDEN");
});

test("rejects formal packet, manifest, or registry backlinks", () => {
  const ledger = cloneLedger();
  ledger.packetBinding = { path: "forbidden" };
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "FORMAL_BACKLINK_FIELD_FORBIDDEN");
});

test("rejects otherwise unknown fields", () => {
  const ledger = cloneLedger();
  ledger.surprise = false;
  expectCode(() => verifyBaziExpertPublicCandidatePrescreenLedger(reseal(ledger)), "UNKNOWN_FIELD_FORBIDDEN");
});

test("strict byte parser rejects duplicate JSON keys", () => {
  const bytes = Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8");
  expectCode(() => parseBaziExpertPublicCandidatePrescreenJsonBytes(bytes), "JSON_DUPLICATE_KEY");
});

test("held-handle loader rejects a symlinked ledger endpoint", async (t) => {
  const { root, ledgerTarget } = await makeWorkspaceFixture(t);
  const realTarget = path.join(path.dirname(ledgerTarget), "prescreen-target.json");
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
  await expectCodeAsync(() => loadBaziExpertPublicCandidatePrescreen(root), "SYMLINK_FORBIDDEN");
});

test("held-handle loader rejects local basis drift", async (t) => {
  const { root, basisTarget } = await makeWorkspaceFixture(t);
  const original = await readFile(basisTarget);
  await writeFile(basisTarget, Buffer.concat([original, Buffer.from("\nlocal drift\n", "utf8")]));
  await expectCodeAsync(() => loadBaziExpertPublicCandidatePrescreen(root), "BASIS_DRIFT");
});
