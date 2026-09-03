import {
  loadBaziDttMonthCommandThreeRoleReviewPacket
} from "./bazi-dtt-month-command-three-role-review-packet-lib.mjs";

try {
  const result = await loadBaziDttMonthCommandThreeRoleReviewPacket(process.cwd());
  process.stdout.write(`${JSON.stringify({
    ok: true,
    packetId: result.packetId,
    packetDigest: result.packetDigest,
    artifact: result.artifact,
    basis: {
      sourceLedgerId: result.sourceLedgerId,
      rightsLedgerId: result.rightsLedgerId,
      reconciliationId: result.reconciliationId,
      readinessLedgerId: result.readinessLedgerId,
      publicEvidenceObservationId: result.publicEvidenceObservationId
    },
    reviewRoles: result.reviewRolesDefined,
    reviewerSeats: `${result.reviewerSeatsOccupied}/${result.reviewerSeatsRequired}`,
    reviewItems: `${result.reviewItemsCompleted}/${result.reviewItemsRequired}`,
    domainSeatItemAssignments:
      `${result.domainSeatItemAssignmentsOccupied}/${result.domainSeatItemRequirementsDefined}`,
    domainSeatItemCompletions:
      `${result.domainSeatItemCompletions}/${result.domainSeatItemRequirementsDefined}`,
    bindingFreeze: `${result.bindingFrozenVerified}/${result.bindingRequired}`,
    domainReviews: `${result.independentDomainReviewsVerified}/${result.independentDomainReviewsRequired}`,
    authority: {
      formal: result.formalAdmissionAuthorized,
      rights: result.rightsLegalConclusionEstablished,
      content: result.contentTruthEstablished,
      expert: result.expertTruthEstablished,
      release: result.releaseReady,
      publicDeployment: result.publicDeploymentAuthorized,
      expertClaims: result.expertClaimsAuthorized
    },
    releaseIdentity: result.releaseIdentity,
    targetSchema: result.targetSchema,
    migrationId: result.migrationId
  }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error?.stack ?? String(error)}\n`);
  process.exitCode = 1;
}
