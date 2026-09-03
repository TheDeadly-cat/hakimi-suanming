#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  BaziPrcCopyrightLawPublicEvidenceError,
  loadBaziPrcCopyrightLawPublicEvidence
} from "./bazi-prc-copyright-law-public-evidence-lib.mjs";

export async function runBaziPrcCopyrightLawPublicEvidenceVerification(workspaceRoot = process.cwd()) {
  return loadBaziPrcCopyrightLawPublicEvidence(workspaceRoot);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  try {
    const result = await runBaziPrcCopyrightLawPublicEvidenceVerification();
    process.stdout.write(`${JSON.stringify({
      offlineOperatorRecordedLinkHashObservationMechanicallyVerified:
        result.offlineOperatorRecordedLinkHashObservationMechanicallyVerified,
      observationClass: "operator_recorded_link_hash_only_non_adjudicative_not_formal_rights_record",
      status: result.status,
      observationDigest: result.observationDigest,
      activeLine: result.activeLine,
      targetSchema: result.targetSchema,
      migrationId: result.migrationId,
      operatorRecordedPublications: result.operatorRecordedPublications,
      deduplicatedPublisherPageGroups: result.deduplicatedPublisherPageGroups,
      candidateRuleObservationLinks: result.candidateRuleLinks,
      formalSourceRightsRecordsCreated: result.formalSourceRightsRecordsCreated,
      formalSourceCarrierRecordsCreated: result.formalSourceCarrierRecordsCreated,
      bindingFrozenVerified: result.bindingFrozenVerified,
      bindingRequired: result.bindingRequired,
      realIndependentExpertsVerified: result.realIndependentExpertsVerified,
      expertSeatsRequired: result.expertSeatsRequired,
      remoteCaptureMechanicallyVerified: result.remoteCaptureMechanicallyVerified,
      publisherAuthenticityEstablished: result.publisherAuthenticityEstablished,
      statuteApplicabilityToCandidateWorksEstablished:
        result.statuteApplicabilityToCandidateWorksEstablished,
      legalConclusion: result.legalConclusion,
      contentTruthEstablished: result.contentTruthEstablished,
      expertTruthEstablished: result.expertTruthEstablished,
      releaseReady: result.releaseReady,
      expertClaimsAuthorized: result.expertClaimsAuthorized,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      observationArtifact: result.observationArtifact,
      sourceParentArtifact: result.sourceParentArtifact,
      rightsParentArtifact: result.rightsParentArtifact,
      basisArtifact: result.basisArtifact
    })}\n`);
  } catch (error) {
    const code = error instanceof BaziPrcCopyrightLawPublicEvidenceError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${JSON.stringify({
      offlineOperatorRecordedLinkHashObservationMechanicallyVerified: false,
      code
    })}\n`);
    process.exitCode = 1;
  }
}
