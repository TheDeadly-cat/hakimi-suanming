export const VEDIC_CIVIL_BROWSER_RESOLVER_VERSION = "0.1.0-draft.0" as const;
export const VEDIC_CIVIL_BROWSER_RECEIPT_SCHEMA_VERSION =
  "hakimi.vedic-civil-time-browser-receipt/0.1-draft" as const;
export const VEDIC_CIVIL_BROWSER_FACT_SCHEMA_VERSION =
  "hakimi.vedic-civil-time-browser-fact-projection/0.1-draft" as const;
export const VEDIC_CIVIL_BROWSER_WORKER_PROTOCOL_VERSION =
  "hakimi.vedic-civil-time-browser-worker/0.1-draft" as const;
export const VEDIC_CIVIL_BROWSER_CHAIN_VERSION =
  "hakimi.vedic-civil-time-to-fact-only-browser-chain/0.1-draft" as const;
export const VEDIC_CIVIL_BROWSER_CANONICALIZATION_PROFILE =
  "hakimi.vedic.sorted-key-json.finite-number.browser.v1" as const;
export const VEDIC_CIVIL_BROWSER_PROJECTION_DIGEST_DOMAIN =
  "hakimi.vedic-civil-time-browser-fact-projection/0.1-draft" as const;

export const VEDIC_CIVIL_BROWSER_RESOLVED_UTC_INSTANT_GUARD = Object.freeze({
  fromInclusive: "1900-01-01T00:00:00.000Z" as const,
  toInclusive: "2100-12-31T23:59:59.999Z" as const,
  fromEpochMillisecondsInclusive: -2_208_988_800_000 as const,
  toEpochMillisecondsInclusive: 4_133_980_799_999 as const,
  semantics: "conservative_browser_chain_guard_not_tzdb_coverage_claim" as const
});

export const PROJECT_GOVERNANCE_CONTEXT = Object.freeze({
  activeLine: "legacy-v13" as const,
  targetSchema: 13 as const,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

export const VEDIC_SYSTEM_IDENTITY = Object.freeze({
  contractSystemId: "vedic" as const,
  productSystemId: "vedic-astrology" as const,
  releaseIdentity: null,
  targetSchema: null,
  migrationId: null,
  researchOnly: true,
  integrated: false,
  authoritative: false,
  baziAuthorityInherited: false,
  ziweiAuthorityInherited: false,
  westernAuthorityInherited: false,
  legacyV13IdentityInherited: false
});

export const VEDIC_CIVIL_BROWSER_AUTHORITY_BOUNDARY = Object.freeze({
  formalInputContractAdmitted: false,
  inputContractGateSatisfied: false,
  inputAcceptanceReceiptIssued: false,
  normalizationReceiptIssued: false,
  formalTimeResolutionReceiptIssued: false,
  factReceiptIssued: false,
  ruleReceiptIssued: false,
  successReceiptIssued: false,
  canonicalZoneIdentityEstablished: false,
  civilTimeDomainTruthCertified: false,
  utcConversionAndTimeScaleRequirementSatisfied: false,
  leapSecondProvenanceEstablished: false,
  ut1ProvenanceEstablished: false,
  ttProvenanceEstablished: false,
  tdbProvenanceEstablished: false,
  eopProvenanceEstablished: false,
  astronomicalFactsEstablished: false,
  chartCalculated: false,
  siderealZodiacSelected: false,
  ayanamsaSelected: false,
  rahuKetuModeSelected: false,
  bhavaDefinitionSelected: false,
  divisionalChartRulesSelected: false,
  dashaRulesSelected: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  sourceRightsEstablished: false,
  rightsLegalConclusionEstablished: false,
  domainAuthorityAuthorized: false,
  formalSystemAdmission: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  highRiskClaimsAuthorized: false,
  crossSystemAuthorityInherited: false
});

export const VEDIC_CIVIL_BROWSER_OPERATION_BOUNDARY = Object.freeze({
  hostIntlUsed: false,
  hostTimeZoneDatabaseUsed: false,
  hostTimeZoneFallbackUsed: false,
  externalNetworkAccess: "not_runtime_verified_by_worker" as const,
  networkTransmissionPerformed: false,
  userDataStorageReadPerformed: false,
  applicationDataStoreReadPerformed: false,
  persistencePerformed: false,
  loggingPerformed: false,
  geocodingPerformed: false,
  mutationPerformed: false,
  mutationEpochAvailable: false,
  mutationEpoch: null,
  mutationEpochReceipt: null,
  mutationBoundary: "not_applicable_no_persistence" as const,
  crossFileAtomicSnapshot: false,
  intervalMutationExcluded: false,
  abaExcluded: false
});

export const VEDIC_CIVIL_BROWSER_DATA_HANDLING = Object.freeze({
  handlingProfile: "no_log_no_persist_no_publish" as const,
  containsPersonalData: true,
  containsPersonDerivedBirthData: true,
  personDerivedDigest: true,
  candidateDigestIsAnonymous: false,
  safeToLog: false,
  safeToPersist: false,
  safeToPublish: false,
  loggingAuthorized: false,
  persistenceAuthorized: false,
  retentionAuthorized: false,
  networkTransmissionAuthorized: false
});

export const VEDIC_CIVIL_BROWSER_EXCLUDED_PRODUCTS = Object.freeze([
  "full_vedic_input_acceptance",
  "normalization_receipt",
  "formal_time_resolution_receipt",
  "utc_conversion_and_time_scale_contract",
  "leap_seconds",
  "UT1",
  "TT",
  "TDB",
  "EOP",
  "ephemeris",
  "sidereal_zodiac",
  "ayanamsa",
  "rahu_ketu",
  "bhava",
  "divisional_charts",
  "dasha",
  "chart",
  "astrological_content"
] as const);
