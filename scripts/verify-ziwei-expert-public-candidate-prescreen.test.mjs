import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
  ZIWEI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS,
  ZIWEI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS,
  ZiweiExpertPublicCandidatePrescreenError,
  canonicalStringifyZiweiExpertPublicCandidatePrescreen,
  computeZiweiExpertPublicCandidatePrescreenDigest,
  isVerifiedZiweiExpertPublicCandidatePrescreen,
  loadZiweiExpertPublicCandidatePrescreen,
  parseZiweiExpertPublicCandidatePrescreenJsonBytes,
  serializeZiweiExpertPublicCandidatePrescreen,
  verifyZiweiExpertPublicCandidatePrescreenLedger,
  ziweiExpertPublicCandidatePrescreenTestOnly
} from "./ziwei-expert-public-candidate-prescreen-lib.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(
  PROJECT_ROOT,
  ...ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH.split("/")
);
const LIB_SCRIPT = path.join(PROJECT_ROOT, "scripts", "ziwei-expert-public-candidate-prescreen-lib.mjs");
const VERIFY_SCRIPT = path.join(PROJECT_ROOT, "scripts", "verify-ziwei-expert-public-candidate-prescreen.mjs");
const OK_PREFIX = "ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_OK ";
const PRELOAD_FAILURE = "ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_FAILED VISIBLE_PRELOAD_OPTIONS_REJECTED\n";

const persistedBytes = await readFile(LEDGER_PATH);
const persistedLedger = JSON.parse(persistedBytes.toString("utf8"));

function cloneLedger() {
  return JSON.parse(JSON.stringify(persistedLedger));
}

function reseal(ledger) {
  ledger.ledgerDigest = computeZiweiExpertPublicCandidatePrescreenDigest(ledger);
  return ledger;
}

function expectCode(fn, expectedCode) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof ZiweiExpertPublicCandidatePrescreenError);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  return { ...environment, ...extra };
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

test("persisted Ziwei public prescreen passes exact full-loader closure with private brand", async () => {
  const result = await loadZiweiExpertPublicCandidatePrescreen(PROJECT_ROOT);
  assert.equal(result.ok, true);
  assert.equal(isVerifiedZiweiExpertPublicCandidatePrescreen(result), true);
  assert.equal(isVerifiedZiweiExpertPublicCandidatePrescreen({ ...result }), false);
  assert.equal(result.publicCandidateLeadsObserved, 4);
  assert.equal(result.sourceObservations, 4);
  assert.equal(result.deduplicatedSourceGroups, 4);
  assert.equal(result.reviewQuestions, 6);
  assert.equal(result.pairwiseAssessments, 6);
  assert.equal(result.reviewerSlotsOccupied, 0);
  assert.equal(result.reviewerSlotsRequired, 2);
  assert.equal(result.sourceBindingsFrozenVerified, 0);
  assert.equal(result.sourceBindingsRequired, 27);
  assert.equal(result.sourceRequirementPartialCandidates, 2);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.fixedVerifierNetworkAttempted, false);
  assert.equal(result.expertClaimsAuthorized, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.ledger));
});

test("persisted raw identity, canonical pretty bytes, and domain-separated digest are exact", () => {
  assert.equal(persistedBytes.byteLength, ziweiExpertPublicCandidatePrescreenTestOnly.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedBytes).digest("hex"),
    ziweiExpertPublicCandidatePrescreenTestOnly.EXPECTED_PERSISTED_RAW.rawSha256
  );
  assert.equal(persistedBytes.toString("utf8"), serializeZiweiExpertPublicCandidatePrescreen(persistedLedger));
  assert.equal(computeZiweiExpertPublicCandidatePrescreenDigest(persistedLedger), persistedLedger.ledgerDigest);
});

test("four named entries remain uncontacted leads with no seat, status, opinion, or consent", () => {
  const ledger = verifyZiweiExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(
    ledger.candidates.map((entry) => entry.publicDisplayName),
    ["宋杭融", "林于棻", "了無居士（黃忠霖）", "趙翊吾"]
  );
  for (const candidate of ledger.candidates) {
    assert.equal(candidate.candidateState, "uncontacted_public_candidate_lead");
    assert.equal(candidate.reviewerSlot, null);
    for (const key of [
      "identityVerified",
      "credentialVerified",
      "scopeVerified",
      "independenceVerified",
      "participationConsentVerified",
      "expertStatusVerified",
      "expertOpinionCollected",
      "sealedOriginalOpinion",
      "countsTowardExpertGate"
    ]) assert.equal(candidate[key], false, `${candidate.candidateLeadId}.${key}`);
  }
});

test("four operator-recorded response carriers remain exact and do not bind semantic meaning", () => {
  const ledger = verifyZiweiExpertPublicCandidatePrescreenLedger(persistedLedger);
  const observations = ledger.sourceObservations;
  assert.deepEqual(
    observations.map((entry) => ({
      group: entry.sourceUpstreamGroupId,
      status: entry.httpStatus,
      redirected: entry.redirectObserved,
      type: entry.contentType,
      bytes: entry.observedResponseBytes,
      sha256: entry.observedResponseSha256
    })),
    [
      { group: "NUK", status: 200, redirected: false, type: "text/html; charset=utf-8", bytes: 54043, sha256: "3adaf422315f6c1c13e2147162295134836b546f180ddd83a9357c9cb6d1fdec" },
      { group: "NTUB", status: 200, redirected: false, type: "text/html; charset=UTF-8", bytes: 61875, sha256: "a5f78e4ef5a1872dca0c02da384328e268825f089574e7275e440cf113728546" },
      { group: "PCCU", status: 200, redirected: false, type: "text/html; charset=utf-8", bytes: 60444, sha256: "537d7cce893c05ef9195174dae62eaf938efff6afa3cc59771963a98cbf7c090" },
      { group: "YUNTECH_GHC_JOURNAL", status: 200, redirected: false, type: "application/pdf", bytes: 4355708, sha256: "869899282cd4eb2b5dd5dbafe9413759c1f4e9e89b352932c33e4097d3835064" }
    ]
  );
  for (const entry of observations) {
    assert.equal(entry.finalUrl, entry.sourceUrl);
    assert.equal(entry.responseBodyRetained, false);
    assert.equal(entry.supportsCandidateDiscoveryOnly, true);
    assert.equal(entry.sourceMeaningBoundByObservedResponseHash, false);
    assert.equal(entry.authoritative, false);
  }
  const pccu = observations.find((entry) => entry.sourceUpstreamGroupId === "PCCU");
  const yuntech = observations.find((entry) => entry.sourceUpstreamGroupId === "YUNTECH_GHC_JOURNAL");
  assert.match(pccu.observationSummary, /营销自述不是 credential 或 authenticity/u);
  assert.match(yuntech.observationSummary, /不证明当前角色或实务规则能力/u);
  assert.equal(ledger.candidates[2].credentialVerified, false);
  assert.equal(ledger.candidates[3].credentialVerified, false);
  assert.equal(ledger.sourceGroups.length, 4);
  assert.equal(new Set(ledger.sourceGroups.map((entry) => entry.sourceUpstreamGroupId)).size, 4);
  assert.deepEqual(ledger.candidates.map((entry) => entry.deduplicatedSourceGroupCount), [1, 1, 1, 1]);
  assert.equal(ledger.sourceGroupPolicy.distinctPublicUpstreamGroupsDoNotEstablishCandidatePairwiseIndependence, true);
  assert.equal(ledger.sourceGroupPolicy.sourceGroupCountDoesNotEstablishIdentityCredentialOrScope, true);
});

test("six Ziwei review questions remain leads and three reviewer roles cannot substitute", () => {
  const ledger = verifyZiweiExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(ledger.reviewQuestionIds, ZIWEI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS);
  for (const candidate of ledger.candidates) {
    assert.equal(candidate.scopeMatrix.length, 6);
    assert.equal(candidate.scopeMatrix.some((entry) => entry.state === "verified"), false);
  }
  assert.deepEqual(
    ledger.roleSeparation.map((entry) => entry.roleId),
    ["ziwei_domain_expert", "calendar_engineering_reproducibility_reviewer", "source_rights_reviewer"]
  );
  assert.ok(ledger.roleSeparation[0].doesNotEstablish.includes("engineering_implementation_correctness"));
  assert.ok(ledger.roleSeparation[1].doesNotEstablish.includes("ziwei_domain_truth"));
  assert.ok(ledger.roleSeparation[2].doesNotEstablish.includes("legal_judgment"));
});

test("all six pairs retain ten unresolved independence factors and count zero", () => {
  const ledger = verifyZiweiExpertPublicCandidatePrescreenLedger(persistedLedger);
  assert.deepEqual(ledger.independenceFactorIds, ZIWEI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS);
  assert.equal(ledger.pairwiseIndependenceAssessments.length, 6);
  for (const pair of ledger.pairwiseIndependenceAssessments) {
    assert.equal(pair.assessmentState, "not_started");
    assert.equal(pair.factorStates.length, 10);
    assert.equal(pair.unknownFactorsPresent, true);
    assert.equal(pair.pairwiseIndependenceEstablished, false);
    assert.equal(pair.countsTowardExpertGate, false);
  }
});

test("zero-instance receipt separates 0/2 experts, 2 partial candidates, and 0/27 bindings", () => {
  assert.deepEqual(
    verifyZiweiExpertPublicCandidatePrescreenLedger(persistedLedger).zeroInstanceReceipt,
    {
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
      sourceBindingsRequired: 27,
      sourceBindingsFrozenVerified: 0,
      sourceRequirementPartialCandidates: 2,
      expertReviewBundleStatus: "absent/0",
      formalExpertGateCount: 0
    }
  );
});

test("observation and lineage boundaries keep network authority, epoch, and integration red", () => {
  const ledger = verifyZiweiExpertPublicCandidatePrescreenLedger(persistedLedger);
  for (const key of [
    "publicResponseBodiesStored",
    "publicResponseBodiesRefetchedByFixedVerifier",
    "fixedVerifierNetworkAttempted",
    "sourceMeaningBoundByObservedResponseHash",
    "serverDateHeaderCaptured",
    "exactLocalClockInstantCaptured",
    "redirectHopHeadersCaptured",
    "tlsPeerCertificateCaptured",
    "networkProvenanceEstablished",
    "publisherAuthenticityEstablished",
    "publisherSignatureVerified",
    "firstSeenEstablished",
    "futureFreshnessEstablished",
    "crossFileAtomicSnapshot",
    "mutationEpochAvailable",
    "intervalMutationExcludedAcrossFiles",
    "abaExcluded"
  ]) assert.equal(ledger.observationBoundary[key], false, key);
  assert.equal(ledger.observationBoundary.mutationEpochReceipt, null);
  assert.equal(ledger.lineageBoundary.activeAdmissionEffect, "none");
  assert.equal(ledger.lineageBoundary.predecessorArtifactsModified, 0);
  assert.equal(ledger.lineageBoundary.predecessorBacklinksAdded, 0);
  assert.equal(ledger.lineageBoundary.formalManifestIntegrated, false);
  assert.equal(ledger.lineageBoundary.formalRegistryIntegrated, false);
});

test("ledger stores no page body, PDF bytes, quote, private contact, dossier, or formal seat field", () => {
  const ledger = verifyZiweiExpertPublicCandidatePrescreenLedger(persistedLedger);
  visit(ledger, (key) => {
    assert.doesNotMatch(key, /^(?:email|phone|telephone|address|contactDetails|privateDossier|credentialDocument|certificateImage)$/iu);
    assert.doesNotMatch(key, /^(?:pageBody|body|html|rawText|fullText|excerpt|quote|exactQuote|documentContent|pageContent|pdfBytes|htmlBytes)$/iu);
    assert.doesNotMatch(key, /^(?:reviewPacket|formalManifestBacklink|formalRegistryBacklink|assignedExpertSeat)$/iu);
  });
});

test("self-resealed authority, seat, opinion, and zero-instance promotions are rejected", () => {
  const mutations = [
    (ledger) => { ledger.authorityBoundary.expertClaimsAuthorized = true; },
    (ledger) => { ledger.candidates[0].reviewerSlot = "ziwei-domain-reviewer-A"; },
    (ledger) => { ledger.candidates[0].expertOpinionCollected = true; },
    (ledger) => { ledger.zeroInstanceReceipt.independentExpertReviewsVerified = 1; }
  ];
  for (const mutate of mutations) {
    const ledger = cloneLedger();
    mutate(ledger);
    assert.throws(() => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(ledger)));
  }
});

test("self-resealed hash-to-semantics, publisher, TLS, time, and freshness promotions are rejected", () => {
  for (const key of [
    "sourceMeaningBoundByObservedResponseHash",
    "publisherAuthenticityEstablished",
    "tlsPeerCertificateCaptured",
    "serverDateHeaderCaptured",
    "firstSeenEstablished",
    "futureFreshnessEstablished"
  ]) {
    const ledger = cloneLedger();
    ledger.observationBoundary[key] = true;
    assert.throws(() => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(ledger)), key);
  }
  const observation = cloneLedger();
  observation.sourceObservations[0].sourceMeaningBoundByObservedResponseHash = true;
  expectCode(
    () => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(observation)),
    "HASH_SEMANTIC_PROMOTION_FORBIDDEN"
  );
});

test("self-resealed response metadata, scope, and independence fabrication is rejected", () => {
  const response = cloneLedger();
  response.sourceObservations[0].observedResponseSha256 = "0".repeat(64);
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(response)), "LEDGER_CONTRACT_MISMATCH");

  const scope = cloneLedger();
  scope.candidates[0].scopeMatrix[0].state = "verified";
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(scope)), "LEDGER_CONTRACT_MISMATCH");

  const independence = cloneLedger();
  independence.pairwiseIndependenceAssessments[0].factorStates[0].state = "no_relationship_established";
  independence.pairwiseIndependenceAssessments[0].pairwiseIndependenceEstablished = true;
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(independence)), "LEDGER_CONTRACT_MISMATCH");
});

test("forbidden payload injection and ordinary unknown or digest drift fail closed", () => {
  const injections = [
    ["contactDetails", "private", "PRIVATE_CONTACT_OR_DOSSIER_FIELD_FORBIDDEN"],
    ["pageBody", "copied body", "PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN"],
    ["pdfBytes", "copied pdf", "PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN"],
    ["exactQuote", "copied quote", "PAGE_BODY_OR_QUOTE_FIELD_FORBIDDEN"],
    ["assignedExpertSeat", "A", "FORMAL_BACKLINK_OR_SEAT_FIELD_FORBIDDEN"]
  ];
  for (const [key, value, code] of injections) {
    const ledger = cloneLedger();
    ledger.candidates[0][key] = value;
    expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(ledger)), code);
  }
  const unknown = cloneLedger();
  unknown.surprise = false;
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(reseal(unknown)), "LEDGER_CONTRACT_MISMATCH");
  const stale = cloneLedger();
  stale.status = "promoted";
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(stale), "LEDGER_DIGEST_MISMATCH");
});

test("strict byte parser rejects duplicate keys and passive capture rejects active object tricks", () => {
  expectCode(
    () => parseZiweiExpertPublicCandidatePrescreenJsonBytes(
      Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"2.0.0"}', "utf8"),
      "duplicate-test.json"
    ),
    "JSON_DUPLICATE_KEY"
  );
  expectCode(
    () => verifyZiweiExpertPublicCandidatePrescreenLedger(new Proxy(cloneLedger(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );
  const accessor = cloneLedger();
  Object.defineProperty(accessor, "status", { enumerable: true, get() { return "unsafe"; } });
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(accessor), "INPUT_ACCESSOR_FORBIDDEN");
  const alias = cloneLedger();
  alias.candidates[1].scopeMatrix = alias.candidates[0].scopeMatrix;
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(alias), "INPUT_ALIAS_FORBIDDEN");
  const cycle = cloneLedger();
  cycle.cycle = cycle;
  expectCode(() => verifyZiweiExpertPublicCandidatePrescreenLedger(cycle), "INPUT_CYCLE_FORBIDDEN");
});

test("bound upstreams and formal/current consumers contain zero backlink to this child", async () => {
  const paths = [
    ...persistedLedger.upstreamArtifacts.map((entry) => entry.path),
    ...persistedLedger.noBacklinkScan.paths
  ];
  for (const relativePath of paths) {
    const text = await readFile(path.join(PROJECT_ROOT, ...relativePath.split("/")), "utf8");
    assert.equal(text.includes(persistedLedger.ledgerId), false, `${relativePath} ledger backlink`);
    assert.equal(text.includes(ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH), false, `${relativePath} path backlink`);
  }
  assert.equal(persistedLedger.noBacklinkScan.backlinksFound, 0);
  assert.equal(persistedLedger.noBacklinkScan.formalOrCurrentRegistryManifestIntegrationAdded, false);
});

test("fixed CLI passes offline at the exact workspace root with a narrow red summary", () => {
  const child = spawnSync(process.execPath, [VERIFY_SCRIPT], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  assert.ok(child.stdout.startsWith(OK_PREFIX));
  const summary = JSON.parse(child.stdout.slice(OK_PREFIX.length));
  assert.equal(summary.publicCandidateLeadsObserved, 4);
  assert.equal(summary.sourceObservations, 4);
  assert.equal(summary.deduplicatedSourceGroups, 4);
  assert.equal(summary.reviewerSlots, "0/2");
  assert.equal(summary.sourceBindings, "0/27");
  assert.equal(summary.sourceRequirementPartialCandidates, 2);
  assert.equal(summary.fixedVerifierNetworkAttempted, false);
  assert.equal(summary.expertClaimsAuthorized, false);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.publicReleaseAuthorized, false);
});

test("CLI rejects operands, visible environment preloads, and execArgv preloads", () => {
  const operand = spawnSync(process.execPath, [VERIFY_SCRIPT, "unexpected"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.equal(operand.status, 1);
  assert.equal(operand.stdout, "");
  assert.equal(operand.stderr, "ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_FAILED CLI_ARGUMENTS_REJECTED\n");

  for (const env of [
    cleanEnvironment({ NODE_OPTIONS: "--trace-warnings" }),
    cleanEnvironment({ NODE_PATH: "." })
  ]) {
    const child = spawnSync(process.execPath, [VERIFY_SCRIPT], { cwd: PROJECT_ROOT, encoding: "utf8", env });
    assert.equal(child.status, 1);
    assert.equal(child.stdout, "");
    assert.equal(child.stderr, PRELOAD_FAILURE);
  }

  const execArgv = spawnSync(
    process.execPath,
    ["--import=data:text/javascript,globalThis.__ziweiPreload=true", VERIFY_SCRIPT],
    { cwd: PROJECT_ROOT, encoding: "utf8", env: cleanEnvironment() }
  );
  assert.equal(execArgv.status, 1);
  assert.equal(execArgv.stdout, "");
  assert.equal(execArgv.stderr, PRELOAD_FAILURE);
});

test("fixed CLI rejects a wrong cwd before reading the ledger or upstreams", () => {
  const child = spawnSync(process.execPath, [VERIFY_SCRIPT], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.equal(child.status, 1);
  assert.equal(child.stdout, "");
  assert.equal(child.stderr, "ZIWEI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_FAILED FIXED_WORKSPACE_ROOT_REQUIRED\n");
});

test("CLI import is side-effect free and verifier sources contain no network client", () => {
  const imported = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(VERIFY_SCRIPT).href)}); process.stdout.write("imported")`],
    { cwd: PROJECT_ROOT, encoding: "utf8", env: cleanEnvironment() }
  );
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, "imported");
  assert.equal(imported.stderr, "");

  return Promise.all([readFile(VERIFY_SCRIPT, "utf8"), readFile(LIB_SCRIPT, "utf8")]).then((sources) => {
    for (const source of sources) {
      assert.doesNotMatch(source, /from\s+["']node:(?:http|https|net|tls|dns)["']/u);
      assert.doesNotMatch(source, /\bfetch\s*\(/u);
    }
  });
});

test("canonical comparison remains exact after a passive clone", () => {
  const verified = verifyZiweiExpertPublicCandidatePrescreenLedger(cloneLedger());
  assert.equal(
    canonicalStringifyZiweiExpertPublicCandidatePrescreen(verified),
    canonicalStringifyZiweiExpertPublicCandidatePrescreen(persistedLedger)
  );
});
