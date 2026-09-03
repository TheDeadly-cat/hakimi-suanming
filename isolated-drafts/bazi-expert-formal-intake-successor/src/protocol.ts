export const SUCCESSOR_VERSION =
  "hakimi.bazi.expert-formal-intake-successor/0.2-draft" as const;
export const REVIEW_INPUT_MANIFEST_VERSION =
  "hakimi.bazi.current-review-input-manifest/3.0.0" as const;
export const SELECTED_BINDING_SET_DIGEST_DOMAIN =
  "hakimi/bazi/expert-formal-intake-successor/selected-binding-set/v3" as const;

export const RELEASE_GOVERNANCE = Object.freeze({
  releaseIdentity: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochAvailableForSchema13: false,
  mutationEpochReceipt: null,
  reviewCycleEpochIsSchema13MutationEpoch: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
} as const);

export const AUTHORITY_NONE = Object.freeze({
  collectionAuthorized: false,
  identityEstablished: false,
  credentialsEstablished: false,
  scopeEstablished: false,
  participationConsentEstablished: false,
  verifierAuthorityEstablished: false,
  pairwiseIndependenceEstablished: false,
  opinionAuthenticityEstablished: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  humanAttestationRecorded: false,
  countsTowardFormal2of2: false,
  countsTowardExpertGate: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  rightsLegalConclusionEstablished: false,
  formalAdmissionAuthorized: false,
  releaseReady: false,
  publicReleaseAuthorized: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
} as const);

export const PRIVACY_BOUNDARY = Object.freeze({
  repositoryProjectionContainsDirectIdentity: false,
  repositoryProjectionContainsPseudonym: false,
  repositoryProjectionContainsContactDetails: false,
  repositoryProjectionContainsRawCredential: false,
  repositoryProjectionContainsRawOpinion: false,
  repositoryProjectionContainsUrlOrPath: false,
  privateMaterialRemainsOffRepository: true,
  opaqueIdentifierEntropyVerified: false,
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  safeToPublish: false
} as const);

export const RUNTIME_TRUST_BOUNDARY = Object.freeze({
  hiddenPreloadExcluded: false,
  nodeRuntimeIdentityEstablished: false,
  loaderIdentityEstablished: false,
  runtimeLauncherIdentityEstablished: false,
  cliOutputTrustedAttestation: false,
  arbitraryPreEvaluationCodeExecutionExcluded: false
} as const);

export const BINDING_IDS = Object.freeze([
  "binding:core:derive-assessment",
  "binding:policy:factor-inclusion",
  "binding:policy:direction-map",
  "binding:policy:weights",
  "binding:policy:month-duplication",
  "binding:policy:thresholds",
  "binding:sensitivity:six-scenarios",
  "binding:dtt:month-command",
  "binding:smt-v5:relative-relations",
  "binding:smt-v10:whole-chart",
  "binding:yhzp:hidden-listing",
  "binding:zpzz:review-gates"
] as const);
export type BindingId = typeof BINDING_IDS[number];

export type ReviewScope =
  | Readonly<{
    mode: "usability_only";
  }>
  | Readonly<{
    mode: "single_binding";
    bindingId: BindingId;
  }>
  | Readonly<{
    mode: "full_frozen_set";
  }>;

export type SelectedMaterialDeliveryBoundary = Readonly<{
  bindingId: BindingId;
  sharingPolicyCode: SharingPolicyCode;
  deliveryModeCode:
    | "not_authorized"
    | "locator_or_link_reference_delivery_candidate_only"
    | "private_review_material_delivery_candidate_only"
    | "redistributable_material_delivery_candidate_only";
  expertActuallyViewedMaterialVerified: false;
  sourceBodyCopyingExcluded: false;
}>;

export const REVIEW_QUESTIONS = Object.freeze([
  Object.freeze({
    questionId: "month-command-hidden-stem-duplication",
    title: "月令主气与首位藏干重复计权",
    question: "月令主气与同一月支首位藏干是否应同时计权；若同时计权，边界依据是什么？"
  }),
  Object.freeze({
    questionId: "relative-factor-weighting",
    title: "月令、透干与藏干相对权重",
    question: "透干、首位藏干、其余藏干与月令之间应采用怎样的相对权重，哪些反例会推翻当前“月令 4、透干 2、首位藏干 2、其余藏干 1”候选？"
  }),
  Object.freeze({
    questionId: "strength-band-thresholds",
    title: "旺衰五档阈值",
    question: "0.25、0.43、0.57、0.75 分档阈值是否有可复核案例集支持？"
  }),
  Object.freeze({
    questionId: "strength-invalidation-structures",
    title: "基础旺衰结论失效或改写条件",
    question: "从格、专旺、化气、合化、刑冲、调候等结构应在何时使基础旺衰结论失效或改写？"
  })
] as const);

export const REVIEW_PURPOSES = Object.freeze([
  "usability_only",
  "binding_freeze_evidence",
  "post_freeze_reaffirmation"
] as const);
export type ReviewPurpose = typeof REVIEW_PURPOSES[number];

export const PURPOSE_RECORD_TYPES = Object.freeze({
  usability_only: "bazi_expert_usability_private_envelope_v3",
  binding_freeze_evidence: "bazi_expert_binding_freeze_evidence_private_envelope_v3",
  post_freeze_reaffirmation: "bazi_expert_post_freeze_reaffirmation_private_envelope_v3"
} as const satisfies Readonly<Record<ReviewPurpose, string>>);

export const PURPOSE_REPOSITORY_RECORD_TYPES = Object.freeze({
  usability_only: "bazi_expert_usability_opaque_binding_v3",
  binding_freeze_evidence: "bazi_expert_binding_freeze_evidence_opaque_binding_v3",
  post_freeze_reaffirmation: "bazi_expert_post_freeze_reaffirmation_opaque_binding_v3"
} as const satisfies Readonly<Record<ReviewPurpose, string>>);

export const AUTHENTICATED_PRIVATE_ENVELOPE_V4 = Object.freeze({
  protocolVersion: "hakimi.bazi.authenticated-private-envelope/4.0.0",
  schemaVersion: "4.0.0",
  envelopeRecordType: "bazi_expert_binding_freeze_evidence_authenticated_private_envelope_v4",
  payloadSchemaVersion: "1.0.0",
  payloadRecordType: "bazi_expert_binding_freeze_original_opinion_synthetic_payload_v4",
  payloadMediaType: "application/json",
  payloadEncoding: "utf-8",
  compression: "none",
  purpose: "binding_freeze_evidence",
  evidenceCategoryCode: "original_opinion",
  aeadAlgorithm: "aes-256-gcm",
  signatureAlgorithm: "ed25519",
  aadDomain: "hakimi/bazi/expert-formal-intake-successor/authenticated-private-envelope/v4/aes-gcm-aad",
  signatureDomain: "hakimi/bazi/expert-formal-intake-successor/authenticated-private-envelope/v4/ed25519-statement",
  signatureStatementVersion: "hakimi.bazi.authenticated-private-envelope.signature-statement/1.0.0",
  maxEnvelopeBytes: 700_000,
  maxCiphertextBytes: 65_536,
  maxPlaintextBytes: 65_536,
  nonceBytes: 12,
  authenticationTagBytes: 16,
  signatureBytes: 64
} as const);

export const AUTHENTICATED_PRIVATE_ENVELOPE_V4_BOUNDARY = Object.freeze({
  syntheticOnly: true,
  repositoryStorageAllowed: false,
  plaintextPersistenceAllowed: false,
  envelopeCarriesKeyOrPinMaterial: false,
  sourceAuthenticationMeaning: "synthetic_out_of_envelope_key_holder_mechanical_verification_only",
  payloadSourceAuthenticated: false,
  humanIdentityEstablished: false,
  credentialsEstablished: false,
  participationConsentEstablished: false,
  opinionAuthenticityEstablished: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  pairwiseIndependenceEstablished: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  replayExcluded: false,
  formalAdmissionAllowed: false
} as const);

export const SYNTHETIC_ORIGINAL_OPINION_PAYLOAD_V4_BOUNDARY = Object.freeze({
  syntheticOnly: true,
  realPersonDataPresent: false,
  humanOpinionRecorded: false,
  domainClaimMade: false,
  accuracyStudyIncluded: false,
  formalAdmissionAllowed: false
} as const);

export const PREDECESSOR_V2_RECORD_TYPES = Object.freeze([
  "bazi_current_review_input_manifest_v2",
  "bazi_expert_usability_private_envelope_v2",
  "bazi_expert_binding_freeze_evidence_private_envelope_v2",
  "bazi_expert_post_freeze_reaffirmation_private_envelope_v2",
  "bazi_expert_usability_opaque_binding_v2",
  "bazi_expert_binding_freeze_evidence_opaque_binding_v2",
  "bazi_expert_post_freeze_reaffirmation_opaque_binding_v2",
  "bazi_expert_formal_correction_candidate_v2",
  "bazi_expert_formal_withdrawal_candidate_v2",
  "bazi_expert_formal_credential_revocation_candidate_v2"
] as const);

export const HISTORICAL_RECORD_TYPES = Object.freeze([
  "bazi_expert_public_identity_binding_v1",
  "bazi_expert_original_opinion_v1",
  "bazi_expert_private_opinion_seal_receipt_v1",
  "bazi_expert_pairwise_independence_assessment_v1",
  "bazi_expert_disagreement_inventory_v1",
  "bazi_expert_reconciliation_note_v1",
  "bazi_expert_review_bundle_v1"
] as const);

export const PILOT_RECORD_TYPES = Object.freeze([
  "bazi_expert_pilot_draft_v1",
  "bazi_expert_pilot_opinion_v1",
  "bazi_expert_pilot_usability_feedback_v1",
  "bazi_expert_pilot_file_seal_receipt_v1",
  "bazi_expert_pilot_complete_submission_package_v1",
  "bazi_expert_review_pilot_physical_seat_package_manifest_v1",
  "bazi_expert_review_pilot_physical_pair_manifest_v1",
  "bazi_expert_pilot_external_pin_prelaunch_candidate_v1",
  "bazi_expert_pilot_handoff_observation_v1",
  "bazi_expert_review_pilot_private_pair_comparison_candidate_v1",
  "bazi_expert_pilot_pair_compare_source_observation_candidate_v1",
  "bazi_expert_pilot_pair_compare_browser_executable_observation_candidate_v1",
  "bazi_expert_pilot_pair_compare_clean_profile_preflight_candidate_v1",
  "bazi_expert_pilot_pair_compare_clean_profile_run_candidate_v1",
  "bazi_expert_pilot_pair_compare_clean_profile_stop_observation_candidate_v1",
  "bazi_review_ui_synthetic_pair_cdp_precleanup_probe_candidate_v1",
  "bazi_review_ui_synthetic_pair_cdp_runtime_observation_candidate_v1",
  "bazi_expert_single_binding_nocode_rehearsal_draft_v1",
  "bazi_expert_single_binding_nocode_rehearsal_readback_candidate_v1",
  "bazi_expert_single_binding_nocode_rehearsal_submission_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_draft_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_readback_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_session_submission_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_handoff_artifacts_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_file_seal_receipt_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_complete_return_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_complete_return_preflight_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_pair_comparison_candidate_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_precommit_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_physical_seat_package_manifest_v1",
  "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_manifest_v1",
  "bazi_expert_single_binding_physical_clean_profile_preflight_candidate_v1",
  "bazi_expert_single_binding_physical_clean_profile_run_candidate_v1",
  "bazi_expert_single_binding_physical_clean_profile_stop_observation_candidate_v1"
] as const);

export const SHARING_POLICY_CODES = Object.freeze([
  "not_authorized",
  "private_review_only",
  "link_only",
  "redistributable"
] as const);
export type SharingPolicyCode = typeof SHARING_POLICY_CODES[number];

export const EVIDENCE_CATEGORY_CODES = Object.freeze([
  "owner_authorization",
  "participation_consent",
  "usability_response",
  "reviewer_context",
  "identity_assessment",
  "credential_assessment",
  "scope_assessment",
  "verifier_authority",
  "pairwise_independence",
  "original_opinion",
  "first_seen",
  "custody",
  "prior_binding_evidence",
  "post_freeze_reaffirmation"
] as const);
export type EvidenceCategoryCode = typeof EVIDENCE_CATEGORY_CODES[number];

export const REQUIRED_EVIDENCE_BY_PURPOSE = Object.freeze({
  usability_only: Object.freeze([
    "owner_authorization",
    "participation_consent",
    "usability_response"
  ]),
  binding_freeze_evidence: Object.freeze([
    "owner_authorization",
    "participation_consent",
    "reviewer_context",
    "identity_assessment",
    "credential_assessment",
    "scope_assessment",
    "verifier_authority",
    "pairwise_independence",
    "original_opinion",
    "first_seen",
    "custody"
  ]),
  post_freeze_reaffirmation: Object.freeze([
    "owner_authorization",
    "participation_consent",
    "reviewer_context",
    "identity_assessment",
    "credential_assessment",
    "scope_assessment",
    "verifier_authority",
    "pairwise_independence",
    "prior_binding_evidence",
    "post_freeze_reaffirmation",
    "first_seen",
    "custody"
  ])
} as const satisfies Readonly<Record<ReviewPurpose, readonly EvidenceCategoryCode[]>>);

export const LIFECYCLE_EVENT_TYPES = Object.freeze({
  correction: "bazi_expert_formal_correction_candidate_v3",
  withdrawal: "bazi_expert_formal_withdrawal_candidate_v3",
  credential_revocation: "bazi_expert_formal_credential_revocation_candidate_v3"
} as const);
export type LifecycleEventKind = keyof typeof LIFECYCLE_EVENT_TYPES;

export type ReviewInputManifestRef = Readonly<{
  manifestId: string;
  manifestDigest: string;
}>;

export type BindingCandidate = Readonly<{
  order: number;
  bindingId: string;
  evidenceSubjectId: string;
  sourceClassCode: "engineering_candidate" | "historical_source_candidate" | "review_gate_candidate";
  candidateStatusCode: "pre_freeze_candidate" | "frozen" | "blocked";
  candidateDigest: string;
  formalBindingDigest: string | null;
  sharingPolicyCode: SharingPolicyCode;
}>;

export type ReviewInputManifestV3 = Readonly<{
  schemaVersion: "3.0.0";
  recordType: "bazi_current_review_input_manifest_v3";
  manifestId: string;
  successorVersion: typeof SUCCESSOR_VERSION;
  releaseGovernance: typeof RELEASE_GOVERNANCE;
  machineIdentityRef: Readonly<{
    successorId: string;
    receiptDigest: string;
    currentMachineIdentityDigest: string;
    rawSha256: string;
  }>;
  readinessRef: Readonly<{
    ledgerId: string;
    ledgerDigest: string;
    rawSha256: string;
  }>;
  questionSet: Readonly<{
    questionSetVersion: "bazi-formal-review-question-set/2.0.0";
    questionSetDigest: string;
    questions: typeof REVIEW_QUESTIONS;
  }>;
  bindingCandidates: readonly BindingCandidate[];
  closure: Readonly<{
    bindingRequired: 12;
    bindingFrozenVerified: number;
    candidateBindingSetDigest: string;
    finalFrozenBindingSetDigest: string | null;
    finalFrozenInputExactMatch: boolean;
    allReviewMaterialsMarkedShareableBySuppliedPolicy: boolean;
  }>;
  boundaries: Readonly<{
    historicalPacketIsAuthority: false;
    pilotConversionAllowed: false;
    contentTruthEstablished: false;
    expertTruthEstablished: false;
    rightsLegalConclusionEstablished: false;
    currentEndpointAuthorityEstablished: false;
    sourceArtifactSelfDigestsRecomputed: false;
    sourceLoaderPrivateBrandsVerified: false;
    candidateDigestsAreDigitalSignatures: false;
    crossFileAtomicSnapshot: false;
    intervalMutationExcluded: false;
    abaExcluded: false;
  }>;
  integrity: Readonly<{
    digestDomain: "hakimi/bazi/current-review-input-manifest/v3";
    manifestDigest: string;
    digestIsDigitalSignature: false;
  }>;
}>;
