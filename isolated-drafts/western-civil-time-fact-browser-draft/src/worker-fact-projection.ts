import {
  isWesternCivilTimeFactReceipt,
  type WesternCivilTimeFactReceipt
} from "./civil-time.ts";
import {
  DATA_HANDLING_BOUNDARY,
  OPERATION_BOUNDARY,
  PROJECT_GOVERNANCE_CONTEXT,
  WESTERN_AUTHORITY_BOUNDARY,
  WESTERN_CIVIL_BROWSER_EXCLUDED_PRODUCTS,
  WESTERN_CIVIL_BROWSER_FACT_DIGEST_DOMAIN,
  WESTERN_CIVIL_BROWSER_FACT_SCHEMA_VERSION,
  type WesternCivilBrowserFactProjection
} from "./browser-fact-projection.ts";
import {
  WESTERN_FACT_CHAIN_VERSION,
  deepFreeze,
  sha256Canonical
} from "./protocol.ts";

export async function createWesternCivilBrowserFactProjection(
  receipt: WesternCivilTimeFactReceipt
): Promise<WesternCivilBrowserFactProjection> {
  if (!isWesternCivilTimeFactReceipt(receipt)) {
    throw new Error("SOURCE_RECEIPT_PRIVATE_BRAND_REQUIRED");
  }
  if (receipt.authorityBoundary.formalInputContractAdmitted !== false
    || receipt.authorityBoundary.civilTimeDomainTruthCertified !== false
    || receipt.authorityBoundary.astronomicalFactsEstablished !== false
    || receipt.authorityBoundary.contentTruthEstablished !== false
    || receipt.authorityBoundary.expertTruthEstablished !== false
    || receipt.authorityBoundary.rightsLegalConclusionEstablished !== false
    || receipt.authorityBoundary.releaseReady !== false
    || receipt.authorityBoundary.publicDeploymentAuthorized !== false
    || receipt.authorityBoundary.publicReleaseAuthorized !== false
    || receipt.authorityBoundary.expertClaimsAuthorized !== false
    || receipt.authorityBoundary.highRiskClaimsAuthorized !== false
    || receipt.authorityBoundary.crossSystemAuthorityInherited !== false
    || receipt.authorityBoundary.canonicalZoneIdentityEstablished !== false
    || receipt.dataHandling.safeToLog !== false
    || receipt.dataHandling.safeToPersist !== false
    || receipt.dataHandling.safeToPublish !== false
    || receipt.dataHandling.candidateDigestIsAnonymous !== false) {
    throw new Error("SOURCE_RECEIPT_BOUNDARY_MISMATCH");
  }

  const withoutFinalDigest = {
    schemaVersion: WESTERN_CIVIL_BROWSER_FACT_SCHEMA_VERSION,
    chainVersion: WESTERN_FACT_CHAIN_VERSION,
    classification: "civil_time_engineering_fact_only" as const,
    formalAdmissionStatus: "not_admitted_isolated_browser_draft" as const,
    sourceReceipt: {
      schemaVersion: receipt.schemaVersion,
      resolverVersion: receipt.resolverVersion,
      receiptSha256: receipt.digests.receiptSha256,
      requestSha256: receipt.inputBinding.requestSha256,
      processLocalBrandVerifiedBeforeProjection: true as const,
      structuredClonePreservesSourceBrand: false as const
    },
    declaredCivilTime: {
      date: receipt.civilTime.date,
      time: receipt.civilTime.time,
      timePrecision: receipt.civilTime.timePrecision,
      timeZoneToken: receipt.civilTime.timeZone,
      requestedDstDisambiguation: receipt.civilTime.requestedDstDisambiguation,
      canonicalZoneIdentityEstablished: false as const
    },
    tzdbBinding: receipt.tzdbBinding,
    resolution: receipt.resolution,
    excludedProducts: WESTERN_CIVIL_BROWSER_EXCLUDED_PRODUCTS,
    operationBoundary: OPERATION_BOUNDARY,
    dataHandling: DATA_HANDLING_BOUNDARY,
    authorityBoundary: WESTERN_AUTHORITY_BOUNDARY,
    projectGovernanceContext: PROJECT_GOVERNANCE_CONTEXT,
    digests: {
      algorithm: "SHA-256" as const,
      canonicalizationProfile: "hakimi.sorted-key-json.finite-number.v1" as const,
      sourceReceiptSha256: receipt.digests.receiptSha256,
      digestIsDigitalSignature: false as const
    }
  };
  const browserProjectionSha256 = await sha256Canonical(
    WESTERN_CIVIL_BROWSER_FACT_DIGEST_DOMAIN,
    withoutFinalDigest
  );
  return deepFreeze({
    ...withoutFinalDigest,
    digests: { ...withoutFinalDigest.digests, browserProjectionSha256 }
  });
}
