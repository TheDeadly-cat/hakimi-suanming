import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  BAZI_DTT_MONTH_COMMAND_THREE_ROLE_REVIEW_PACKET_RELATIVE_PATH,
  buildBaziDttMonthCommandThreeRoleReviewPacket,
  baziDttMonthCommandThreeRoleReviewPacketTestOnly,
  computeBaziDttMonthCommandThreeRoleReviewPacketDigest,
  isVerifiedBaziDttMonthCommandThreeRoleReviewPacket,
  loadBaziDttMonthCommandThreeRoleReviewPacket
} from "./bazi-dtt-month-command-three-role-review-packet-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packetPath = path.join(workspaceRoot,
  ...BAZI_DTT_MONTH_COMMAND_THREE_ROLE_REVIEW_PACKET_RELATIVE_PATH.split("/"));

async function readPersisted() {
  return JSON.parse(await readFile(packetPath, "utf8"));
}

function assertRecursivelyFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertRecursivelyFrozen(child, seen);
}

function reseal(value) {
  value.packetDigest = computeBaziDttMonthCommandThreeRoleReviewPacketDigest(value);
  return value;
}

test("persisted packet is the deterministic five-basis projection", async () => {
  const [persisted, built] = await Promise.all([
    readPersisted(),
    buildBaziDttMonthCommandThreeRoleReviewPacket(workspaceRoot)
  ]);
  assert.deepEqual(persisted, built);
  assert.equal(persisted.packetDigest,
    computeBaziDttMonthCommandThreeRoleReviewPacketDigest(persisted));
  assertRecursivelyFrozen(built);
});

test("full loader returns the only branded, frozen packet capability", async () => {
  const result = await loadBaziDttMonthCommandThreeRoleReviewPacket(workspaceRoot);
  assert.equal(result.dttMonthCommandThreeRoleReviewPacketMechanicallyVerified, true);
  assert.equal(isVerifiedBaziDttMonthCommandThreeRoleReviewPacket(result), true);
  assert.equal(isVerifiedBaziDttMonthCommandThreeRoleReviewPacket(structuredClone(result)), false);
  assert.equal(isVerifiedBaziDttMonthCommandThreeRoleReviewPacket({ ...result }), false);
  assert.equal(isVerifiedBaziDttMonthCommandThreeRoleReviewPacket(
    await buildBaziDttMonthCommandThreeRoleReviewPacket(workspaceRoot)), false);
  assertRecursivelyFrozen(result);
});

test("all five current basis identities are exact and both current full-loader brands are consumed", async () => {
  const packet = await readPersisted();
  assert.equal(packet.basisArtifacts.length, 5);
  const expected = Object.values(baziDttMonthCommandThreeRoleReviewPacketTestOnly.PINS);
  for (let index = 0; index < expected.length; index += 1) {
    const actual = packet.basisArtifacts[index];
    const pin = expected[index];
    assert.equal(actual.path, pin.path);
    assert.equal(actual.bytes, pin.rawBytes);
    assert.equal(actual.sha256, pin.rawSha256);
    assert.equal(actual.semanticId, pin.semanticId);
    assert.equal(actual.semanticDigest, pin.semanticDigest);
    assert.equal(actual.privateBrandConsumed,
      pin === baziDttMonthCommandThreeRoleReviewPacketTestOnly.PINS.readiness
      || pin === baziDttMonthCommandThreeRoleReviewPacketTestOnly.PINS.publicEvidence);
  }
  assert.equal(packet.integrityBoundary.reconciliationV2StaleHistoricalPrivateBrandConsumed, false);
  assert.equal(packet.integrityBoundary.readinessV19CurrentPrivateBrandConsumed, true);
  assert.equal(packet.integrityBoundary.publicEvidenceV1CurrentPrivateBrandConsumed, true);
});

test("DTT reconciliation v2 keeps its 1.6/1.2 parents while v1.7/1.3 carry the same candidate digests", async () => {
  const packet = await readPersisted();
  const parents = packet.lineageBoundary.reconciliationV2CandidateParents;
  assert.equal(parents.sourceBinding.ledgerId,
    "hakimi.bazi.strength.source-binding-candidates/1.6.0");
  assert.equal(parents.sourceRights.ledgerId,
    "hakimi.bazi.strength.source-rights-candidates/1.2.0");
  assert.equal(packet.lineageBoundary.reconciliationV2ParentsRewrittenToV17OrV13, false);
  assert.equal(packet.lineageBoundary.dttSourceCandidateCarriedForwardUnchangedInV17, true);
  assert.equal(packet.lineageBoundary.dttRightsCandidateCarriedForwardUnchangedInV13, true);
  assert.equal(parents.sourceBinding.candidateDigest, packet.subjectLock.sourceCandidateDigest);
  assert.equal(parents.sourceRights.candidateDigest, packet.subjectLock.rightsCandidateDigest);
});

test("public evidence fixes SSID and CADAL revision URL, time and main-slot hash while dynamic URLs stay discovery-only", async () => {
  const packet = await readPersisted();
  const projection = packet.publicEvidenceProjection;
  const pin = baziDttMonthCommandThreeRoleReviewPacketTestOnly.PINS.publicEvidence;
  assert.equal(projection.observationId, pin.semanticId);
  assert.equal(projection.observationDigest, pin.semanticDigest);
  assert.deepEqual(projection.observationArtifact, {
    path: pin.path,
    bytes: pin.rawBytes,
    sha256: pin.rawSha256
  });
  assert.equal(projection.dynamicDescriptionUrlsAreDiscoveryOnly, true);
  assert.equal(projection.dynamicDescriptionUrlsCountAsFixedRightsEvidence, false);
  assert.equal(projection.fixedRevisionUrlsStoredByPublicEvidence, false);
  assert.equal(projection.fixedRevisionUrlsDerivedFromPublicEvidenceFields, true);
  assert.deepEqual(projection.fixedCarrierPageRevisions.map((entry) => ({
    id: entry.fixedFilePageRevisionId,
    time: entry.fixedFilePageRevisionTimestamp,
    sha256: entry.fixedFilePageMainSlotSha256
  })), [
    {
      id: 708090379,
      time: "2022-11-20T09:29:18Z",
      sha256: "55d405f7cc909c4ee2f356e3bacd7da2903bc759596e6ab1cae13b58014fbc05"
    },
    {
      id: 1104458375,
      time: "2025-10-24T20:27:06Z",
      sha256: "30194bbd8c92409dc8efb02f536b0909a6b29fa793528bc6ac81063bb04bc001"
    }
  ]);
  for (const entry of projection.fixedCarrierPageRevisions) {
    const fixed = new URL(entry.fixedFilePageRevisionUrl);
    const dynamic = new URL(entry.dynamicDescriptionUrl);
    assert.equal(fixed.searchParams.get("oldid"), String(entry.fixedFilePageRevisionId));
    assert.equal(fixed.searchParams.get("title"), entry.carrierFileTitle);
    assert.equal(entry.fixedFilePageRevisionUrlOldidMatchesRevisionId, true);
    assert.equal(entry.fixedFilePageRevisionUrlDerivation,
      "derived_from_public_evidence_carrier_file_title_and_fixed_revision_id");
    assert.equal(dynamic.searchParams.has("oldid"), false);
    assert.equal(entry.dynamicDescriptionUrlRole, "discovery_only_not_fixed_rights_evidence");
    assert.equal(entry.dynamicDescriptionUrlCountsAsFixedRightsEvidence, false);
  }
});

test("fixed revision URL validator rejects mismatched oldid or extra query authority", () => {
  const tools = baziDttMonthCommandThreeRoleReviewPacketTestOnly;
  const title = "File:SSID-11335994 滴天髓闡微.pdf";
  const id = 708090379;
  const correct = tools.fixedRevisionUrl(title, id);
  assert.doesNotThrow(() => tools.assertFixedRevisionUrl(correct, title, id));
  assert.throws(
    () => tools.assertFixedRevisionUrl(correct.replace(String(id), "708090380"), title, id),
    (error) => error?.code === "PUBLIC_EVIDENCE_FIXED_REVISION_URL_INVALID"
  );
  assert.throws(
    () => tools.assertFixedRevisionUrl(`${correct}&license=asserted`, title, id),
    (error) => error?.code === "PUBLIC_EVIDENCE_FIXED_REVISION_URL_INVALID"
  );
});

test("rights carrier rows crosswalk one-to-one to fixed public revisions and dynamic refs cannot count as fixed evidence", async () => {
  const packet = await readPersisted();
  const fixedByAnchor = new Map(
    packet.publicEvidenceProjection.fixedCarrierPageRevisions.map((entry) => [entry.anchorId, entry])
  );
  const layers = packet.rightsEvidenceProjection.carrierLayers;
  assert.equal(layers.length, 2);
  assert.equal(new Set(layers.map((entry) => entry.anchorId)).size, 2);
  assert.deepEqual(new Set(layers.map((entry) => entry.anchorId)), new Set(fixedByAnchor.keys()));
  for (const layer of layers) {
    const fixed = fixedByAnchor.get(layer.anchorId);
    assert.ok(fixed);
    assert.equal(Object.hasOwn(layer, "carrierDescriptionUrl"), false);
    assert.equal(Object.hasOwn(layer, "evidenceRefs"), false);
    assert.match(layer.dynamicCarrierDescriptionUrl, /^https:\/\//u);
    assert.equal(layer.dynamicCarrierDescriptionUrlRole, "discovery_only_not_fixed_rights_evidence");
    assert.equal(layer.dynamicCarrierDescriptionUrlCountsAsFixedRightsEvidence, false);
    assert.equal(layer.dynamicEvidenceRefsRole,
      "discovery_and_policy_context_only_not_fixed_carrier_rights_evidence");
    assert.equal(layer.dynamicEvidenceRefsCountAsFixedRightsEvidence, false);
    assert.equal(layer.dynamicEvidenceRefs.includes(layer.dynamicCarrierDescriptionUrl), true);
    assert.equal(layer.dynamicEvidenceRefs.includes(layer.fixedFilePageRevisionUrl), false);
    assert.equal(layer.fixedFilePageRevisionId, fixed.fixedFilePageRevisionId);
    assert.equal(layer.fixedFilePageRevisionUrl, fixed.fixedFilePageRevisionUrl);
    assert.equal(layer.fixedFilePageRevisionTimestamp, fixed.fixedFilePageRevisionTimestamp);
    assert.equal(layer.fixedFilePageMainSlotSha256, fixed.fixedFilePageMainSlotSha256);
    assert.equal(new URL(layer.fixedFilePageRevisionUrl).searchParams.get("oldid"),
      String(layer.fixedFilePageRevisionId));
    assert.equal(layer.fixedRevisionCountsAsRightsClearance, false);
  }
});

test("source projection contains only existing locators, URLs, digests and metadata, never bodies or quote text", async () => {
  const packet = await readPersisted();
  const projection = packet.sourceMaterialProjection;
  assert.equal(projection.storagePolicy, "existing_url_locator_digest_and_metadata_only");
  assert.equal(projection.sourceBodiesStored, false);
  assert.equal(projection.quoteTextsStored, false);
  assert.equal(projection.carrierFilesStored, false);
  assert.equal(projection.pageImagesStored, false);
  assert.equal(projection.quoteLocator.quoteTextStored, false);
  assert.match(projection.quoteLocator.quoteSha256, /^[a-f0-9]{64}$/u);
  assert.equal(projection.carrierLocators.length, 2);
  for (const carrier of projection.carrierLocators) {
    assert.match(carrier.carrierDescriptionUrl, /^https:\/\//u);
    assert.match(carrier.pageLocator.pageUrl, /^https:\/\//u);
    assert.match(carrier.carrierSha256, /^[a-f0-9]{64}$/u);
    assert.match(carrier.collationCandidate.collationDigest, /^[a-f0-9]{64}$/u);
    assert.equal(carrier.collationCandidate.exactGlyphSequenceEqual, false);
    assert.deepEqual(carrier.collationCandidate.humanCollatorAttestations, []);
    assert.deepEqual(carrier.collationCandidate.domainExpertReviewIds, []);
  }
  const prohibitedKeys = new Set([
    "quoteText", "sourceBody", "carrierText", "rawText", "transcriptionText", "ocrText", "excerpt"
  ]);
  function walk(value) {
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(prohibitedKeys.has(key), false, key);
      walk(child);
    }
  }
  walk(packet);
});

test("three roles define four vacant seats including independent expert A and B", async () => {
  const packet = await readPersisted();
  assert.deepEqual(packet.reviewProtocol.roles.map((role) => [role.roleId, role.seatsRequired]), [
    ["bibliographic_collation", 1],
    ["rights_legal", 1],
    ["dtt_domain_expert", 2]
  ]);
  assert.deepEqual(packet.reviewProtocol.seats.map((seat) => seat.seatId), [
    "bibliographic-collation-1", "rights-legal-1", "domain-expert-a", "domain-expert-b"
  ]);
  for (const seat of packet.reviewProtocol.seats) {
    assert.deepEqual(seat.reviewerIds, []);
    assert.deepEqual(seat.responses, []);
    assert.deepEqual(seat.attestations, []);
    assert.equal(seat.status, "vacant_not_started");
  }
});

test("domain A and B each have the same two explicit response requirements and distinct-principal rule", async () => {
  const packet = await readPersisted();
  const requirements = packet.reviewProtocol.domainSeatItemResponseRequirements;
  assert.equal(requirements.length, 4);
  for (const seatId of ["domain-expert-a", "domain-expert-b"]) {
    assert.deepEqual(
      requirements.filter((entry) => entry.seatId === seatId).map((entry) => entry.itemId),
      ["domain-01-month-command", "domain-02-independent-disposition"]
    );
  }
  for (const requirement of requirements) {
    assert.equal(requirement.principalId, null);
    assert.deepEqual(requirement.responseRefs, []);
    assert.deepEqual(requirement.attestationRefs, []);
    assert.equal(requirement.status, "required_unassigned_unanswered");
  }
  assert.deepEqual(packet.reviewProtocol.domainPrincipalSeparation, {
    seatIds: ["domain-expert-a", "domain-expert-b"],
    requiredItemIdsPerSeat: ["domain-01-month-command", "domain-02-independent-disposition"],
    eachSeatMustAnswerSameTwoItems: true,
    principalsMustBeDistinct: true,
    samePrincipalMayOccupyBothSeats: false,
    principalIds: [],
    principalAssignmentsOccupied: 0,
    principalDistinctnessVerified: false
  });
  assert.equal(packet.gateSummary.domainSeatItemRequirementsDefined, 4);
  assert.equal(packet.gateSummary.domainSeatItemAssignmentsOccupied, 0);
  assert.equal(packet.gateSummary.domainSeatItemCompletions, 0);
});

test("all twelve review items are open and every response or attestation reference is empty", async () => {
  const packet = await readPersisted();
  assert.equal(packet.reviewProtocol.reviewItems.length, 12);
  assert.equal(new Set(packet.reviewProtocol.reviewItems.map((entry) => entry.itemId)).size, 12);
  for (const item of packet.reviewProtocol.reviewItems) {
    assert.deepEqual(item.responseRefs, []);
    assert.deepEqual(item.attestationRefs, []);
    assert.equal(item.status, "open_unreviewed");
  }
  assert.equal(packet.reviewProtocol.automatedWinnerSelectionAllowed, false);
  assert.equal(packet.reviewProtocol.unresolvedDisagreementDisposition, "defer_or_reject");
});

test("0/12 binding and 0/2 expert gates remain exact positive zero", async () => {
  const packet = await readPersisted();
  assert.equal(packet.gateSummary.bindingFrozenVerified, 0);
  assert.equal(Object.is(packet.gateSummary.bindingFrozenVerified, -0), false);
  assert.equal(packet.gateSummary.bindingRequired, 12);
  assert.equal(packet.gateSummary.independentDomainReviewsVerified, 0);
  assert.equal(Object.is(packet.gateSummary.independentDomainReviewsVerified, -0), false);
  assert.equal(packet.gateSummary.independentDomainReviewsRequired, 2);
  assert.equal(packet.gateSummary.reviewerSeatsOccupied, 0);
  assert.equal(packet.gateSummary.reviewerSeatsRequired, 4);
  assert.equal(packet.gateSummary.reviewItemsCompleted, 0);
  assert.equal(packet.gateSummary.reviewItemsRequired, 12);
});

test("formal, rights, content, expert and release authority all remain false", async () => {
  const packet = await readPersisted();
  for (const key of ["formalAdmissionAuthorized", "rightsLegalConclusionEstablished",
    "contentTruthEstablished", "expertTruthEstablished", "releaseReady",
    "publicDeploymentAuthorized", "expertClaimsAuthorized"]) {
    assert.equal(packet.authorityBoundary[key], false, key);
  }
  assert.equal(packet.gateSummary.formalAdmissionComplete, false);
  assert.equal(packet.gateSummary.rightsCleared, false);
  assert.equal(packet.gateSummary.contentTruthEstablished, false);
  assert.equal(packet.gateSummary.expertTruthEstablished, false);
  assert.equal(packet.gateSummary.releaseReady, false);
});

test("release identity remains legacy-v13 / 13 / null", async () => {
  const packet = await readPersisted();
  assert.deepEqual(packet.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
});

test("current parent structures are re-extracted and cross-checked, not accepted as caller objects", async () => {
  const bundle = await baziDttMonthCommandThreeRoleReviewPacketTestOnly.loadExpectedBundle(workspaceRoot);
  assert.equal(bundle.sourceSelection.candidate.candidateDigest,
    baziDttMonthCommandThreeRoleReviewPacketTestOnly.SUBJECT.sourceCandidateDigest);
  assert.equal(bundle.rightsCandidate.candidateDigest,
    baziDttMonthCommandThreeRoleReviewPacketTestOnly.SUBJECT.rightsCandidateDigest);
  assert.equal(bundle.reconciliation.reconciliationDigest,
    baziDttMonthCommandThreeRoleReviewPacketTestOnly.PINS.reconciliation.semanticDigest);
  assert.equal(bundle.readiness.ledgerDigest,
    baziDttMonthCommandThreeRoleReviewPacketTestOnly.PINS.readiness.semanticDigest);
  assert.equal(bundle.publicEvidence.observationDigest,
    baziDttMonthCommandThreeRoleReviewPacketTestOnly.PINS.publicEvidence.semanticDigest);
  assert.equal(bundle.packet.integrityBoundary.publicEvidenceV1CurrentPrivateBrandConsumed, true);
  assert.equal(bundle.packet.integrityBoundary.callerSuppliedParentObjectsAcceptedAsAuthority, false);
});

test("self-resealed clones cannot change roles, vacancies, counts, lineage or authority", async (context) => {
  const expected = await buildBaziDttMonthCommandThreeRoleReviewPacket(workspaceRoot);
  const cases = [
    ["role", (value) => { value.reviewProtocol.roles[0].allowedScope.push("rights_legal_conclusion"); }],
    ["reviewer", (value) => { value.reviewProtocol.seats[0].reviewerIds.push("invented-reviewer"); }],
    ["response", (value) => { value.reviewProtocol.reviewItems[0].responseRefs.push("invented-response"); }],
    ["attestation", (value) => { value.reviewProtocol.seats[1].attestations.push("invented-attestation"); }],
    ["public evidence oldid", (value) => {
      value.publicEvidenceProjection.fixedCarrierPageRevisions[0].fixedFilePageRevisionUrl =
        value.publicEvidenceProjection.fixedCarrierPageRevisions[0].fixedFilePageRevisionUrl
          .replace("oldid=708090379", "oldid=708090380");
    }],
    ["public evidence timestamp", (value) => {
      value.publicEvidenceProjection.fixedCarrierPageRevisions[0].fixedFilePageRevisionTimestamp =
        "2022-11-20T09:29:19Z";
    }],
    ["public evidence main-slot hash", (value) => {
      value.publicEvidenceProjection.fixedCarrierPageRevisions[1].fixedFilePageMainSlotSha256 = "f".repeat(64);
    }],
    ["dynamic description URL promoted", (value) => {
      value.publicEvidenceProjection.fixedCarrierPageRevisions[0]
        .dynamicDescriptionUrlCountsAsFixedRightsEvidence = true;
    }],
    ["rights dynamic description promoted", (value) => {
      value.rightsEvidenceProjection.carrierLayers[0]
        .dynamicCarrierDescriptionUrlCountsAsFixedRightsEvidence = true;
    }],
    ["rights dynamic refs promoted", (value) => {
      value.rightsEvidenceProjection.carrierLayers[1]
        .dynamicEvidenceRefsCountAsFixedRightsEvidence = true;
    }],
    ["rights fixed revision URL mismatch", (value) => {
      value.rightsEvidenceProjection.carrierLayers[0].fixedFilePageRevisionUrl =
        value.rightsEvidenceProjection.carrierLayers[0].fixedFilePageRevisionUrl
          .replace("oldid=708090379", "oldid=708090380");
    }],
    ["rights fixed revision hash mismatch", (value) => {
      value.rightsEvidenceProjection.carrierLayers[1].fixedFilePageMainSlotSha256 = "e".repeat(64);
    }],
    ["domain B item drift", (value) => {
      value.reviewProtocol.domainSeatItemResponseRequirements[3].itemId = "domain-01-month-command";
    }],
    ["same principal for A and B", (value) => {
      for (const requirement of value.reviewProtocol.domainSeatItemResponseRequirements) {
        requirement.principalId = "same-principal";
      }
      value.reviewProtocol.domainPrincipalSeparation.principalIds = ["same-principal"];
      value.reviewProtocol.domainPrincipalSeparation.principalAssignmentsOccupied = 2;
    }],
    ["distinct principal rule removed", (value) => {
      value.reviewProtocol.domainPrincipalSeparation.principalsMustBeDistinct = false;
    }],
    ["assignment count promoted", (value) => { value.gateSummary.domainSeatItemAssignmentsOccupied = 1; }],
    ["completion count promoted", (value) => { value.gateSummary.domainSeatItemCompletions = 1; }],
    ["binding", (value) => { value.gateSummary.bindingFrozenVerified = 1; }],
    ["expert", (value) => { value.gateSummary.independentDomainReviewsVerified = 1; }],
    ["lineage", (value) => { value.lineageBoundary.reconciliationV2ParentsRewrittenToV17OrV13 = true; }],
    ["formal", (value) => { value.authorityBoundary.formalAdmissionAuthorized = true; }],
    ["rights", (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; }],
    ["content", (value) => { value.authorityBoundary.contentTruthEstablished = true; }],
    ["expert truth", (value) => { value.authorityBoundary.expertTruthEstablished = true; }],
    ["release", (value) => { value.authorityBoundary.releaseReady = true; }]
  ];
  for (const [label, mutate] of cases) {
    await context.test(label, () => {
      const forged = structuredClone(expected);
      mutate(forged);
      reseal(forged);
      assert.throws(
        () => baziDttMonthCommandThreeRoleReviewPacketTestOnly.assertPersisted(forged, expected),
        (error) => error?.code === "PACKET_SEMANTIC_MISMATCH"
      );
      assert.equal(isVerifiedBaziDttMonthCommandThreeRoleReviewPacket(forged), false);
    });
  }
});

test("packet digest and identity tampering fail closed", async () => {
  const expected = await buildBaziDttMonthCommandThreeRoleReviewPacket(workspaceRoot);
  const badDigest = structuredClone(expected);
  badDigest.packetDigest = "0".repeat(64);
  assert.throws(
    () => baziDttMonthCommandThreeRoleReviewPacketTestOnly.assertPersisted(badDigest, expected),
    (error) => error?.code === "PACKET_IDENTITY_MISMATCH"
  );
  const badId = structuredClone(expected);
  badId.packetId = "self-signed-clone";
  reseal(badId);
  assert.throws(
    () => baziDttMonthCommandThreeRoleReviewPacketTestOnly.assertPersisted(badId, expected),
    (error) => error?.code === "PACKET_IDENTITY_MISMATCH"
  );
});

test("CLI reports the exact red gates and release identity", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    "scripts/verify-bazi-dtt-month-command-three-role-review-packet.mjs"
  ], { cwd: workspaceRoot, windowsHide: true });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.ok, true);
  assert.equal(output.reviewerSeats, "0/4");
  assert.equal(output.reviewItems, "0/12");
  assert.equal(output.domainSeatItemAssignments, "0/4");
  assert.equal(output.domainSeatItemCompletions, "0/4");
  assert.equal(output.bindingFreeze, "0/12");
  assert.equal(output.domainReviews, "0/2");
  assert.equal(output.basis.publicEvidenceObservationId,
    "hakimi.bazi.dtt-month-command-public-evidence/2026-08-29T15:17:27.103Z");
  assert.deepEqual(output.authority, {
    formal: false,
    rights: false,
    content: false,
    expert: false,
    release: false,
    publicDeployment: false,
    expertClaims: false
  });
  assert.equal(output.releaseIdentity, "legacy-v13");
  assert.equal(output.targetSchema, 13);
  assert.equal(output.migrationId, null);
});
