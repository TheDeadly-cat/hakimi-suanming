import {
  PROJECT_GOVERNANCE_CONTEXT,
  VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE,
  VEDIC_CIVIL_BROWSER_CHAIN_VERSION,
  VEDIC_CIVIL_BROWSER_FACT_SCHEMA_VERSION,
  VEDIC_CIVIL_BROWSER_PROJECTION_DIGEST_DOMAIN,
  VEDIC_SYSTEM_IDENTITY
} from "./constants.ts";
import {
  VEDIC_CIVIL_BROWSER_INPUT_CONTRACT_IDENTITY,
  VEDIC_CIVIL_BROWSER_INPUT_SCOPE,
  VEDIC_CIVIL_BROWSER_TZDB_BINDING,
  type VedicCivilBrowserFactProjection
} from "./browser-fact-projection.ts";
import {
  isVedicCivilBrowserReceipt,
  type VedicCivilBrowserReceipt
} from "./civil-time.ts";
import {
  VedicBrowserInputBoundaryError,
  canonicalVedicBrowserJson,
  deepFreezeVedicBrowserData,
  sha256VedicBrowserCanonical
} from "./protocol.ts";

function sameCanonical(left: unknown, right: unknown): boolean {
  return canonicalVedicBrowserJson(left) === canonicalVedicBrowserJson(right);
}

export async function createVedicCivilBrowserFactProjection(
  receipt: VedicCivilBrowserReceipt
): Promise<VedicCivilBrowserFactProjection> {
  if (!isVedicCivilBrowserReceipt(receipt)) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_SOURCE_RECEIPT_BRAND_INVALID");
  }
  if (!sameCanonical(receipt.tzdbBinding, VEDIC_CIVIL_BROWSER_TZDB_BINDING)
    || !sameCanonical(receipt.inputScope, VEDIC_CIVIL_BROWSER_INPUT_SCOPE)) {
    throw new VedicBrowserInputBoundaryError("VEDIC_BROWSER_SOURCE_RECEIPT_IDENTITY_INVALID");
  }
  const projectionWithoutDigests = {
    schemaVersion: VEDIC_CIVIL_BROWSER_FACT_SCHEMA_VERSION,
    chainVersion: VEDIC_CIVIL_BROWSER_CHAIN_VERSION,
    outcome: "resolved" as const,
    classification: "vedic_civil_time_engineering_fact_only" as const,
    formalAdmissionStatus: "not_admitted_isolated_draft" as const,
    projectGovernanceContext: PROJECT_GOVERNANCE_CONTEXT,
    systemIdentity: VEDIC_SYSTEM_IDENTITY,
    inputScope: VEDIC_CIVIL_BROWSER_INPUT_SCOPE,
    inputContractIdentity: VEDIC_CIVIL_BROWSER_INPUT_CONTRACT_IDENTITY,
    declaredCivilTime: receipt.declaredCivilTime,
    tzdbBinding: receipt.tzdbBinding,
    resolution: receipt.resolution,
    excludedProducts: receipt.excludedProducts,
    operationBoundary: receipt.operationBoundary,
    dataHandling: receipt.dataHandling,
    authorityBoundary: receipt.authorityBoundary,
    sourceReceipt: {
      schemaVersion: receipt.schemaVersion,
      resolverVersion: receipt.resolverVersion,
      requestSha256: receipt.digests.requestSha256,
      receiptSha256: receipt.digests.receiptSha256,
      sourceReceiptBrandVerifiedInWorker: true as const,
      structuredClonePreservesSourceBrand: false as const
    }
  };
  const digestProjection = {
    ...projectionWithoutDigests,
    digests: {
      algorithm: "SHA-256" as const,
      implementation: "Web Crypto SubtleCrypto.digest" as const,
      canonicalizationProfile: VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE,
      requestSha256: receipt.digests.requestSha256,
      sourceReceiptSha256: receipt.digests.receiptSha256,
      digestIsDigitalSignature: false as const
    }
  };
  const browserProjectionSha256 = await sha256VedicBrowserCanonical(
    VEDIC_CIVIL_BROWSER_PROJECTION_DIGEST_DOMAIN,
    digestProjection
  );
  return deepFreezeVedicBrowserData({
    ...digestProjection,
    digests: { ...digestProjection.digests, browserProjectionSha256 }
  });
}
