import type { ZiweiBirthInputDraft } from "../contract-bridge.ts";
import type { ZiweiBrowserEngineeringArtifactDraft } from "./browser-artifact.ts";

export const ZIWEI_BROWSER_PROBE_PROTOCOL = "hakimi-ziwei-browser-probe/0.2-draft" as const;
export const ZIWEI_BROWSER_PROBE_ADAPTER_ID = "hakimi.ziwei.iztro.browser_probe" as const;

export type BrowserProbeRequest = Readonly<{
  protocolVersion: typeof ZIWEI_BROWSER_PROBE_PROTOCOL;
  requestId: string;
  action: "calculate";
  input: ZiweiBirthInputDraft;
}>;

export type BrowserProbeMajorStarContentSource = Readonly<{
  sourceId: string;
  sourceKind: "public_domain_classical_transcription" | "modern_original_learning_material";
  title: string;
  sourceUrl: string;
  accessedAt: string;
  usageBoundary: string;
  expertTruthClaimed: false;
}>;

export type BrowserProbeMajorStarSourceRef = Readonly<{
  sourceId: string;
  locator: string;
}>;

export type BrowserProbeCoreMinorStarTraditionalCluster =
  | "supporting_six"
  | "challenging_six";

export type BrowserProbeCoreMinorStarSourceRef = Readonly<{
  sourceId: string;
  locator: string;
  bindingTarget: "exact_star" | "exact_palace_role" | "nomenclature_conflict";
  semanticCandidateSupport: boolean;
}>;

export type BrowserProbeCoreMinorStarNatalTransformationRule = Readonly<{
  yearStemId: "bing" | "wu" | "ji" | "xin" | "ren";
  transformationId: "ke" | "ji";
  transformationLabel: "科" | "忌";
}>;

export type BrowserProbeCoreMinorStarEarthlyBranchId =
  | "zi"
  | "chou"
  | "yin"
  | "mao"
  | "chen"
  | "si"
  | "wu"
  | "wei"
  | "shen"
  | "you"
  | "xu"
  | "hai";

export type BrowserProbeCoreMinorStarBrightnessId =
  | "miao"
  | "wang"
  | "de"
  | "li"
  | "ping"
  | "xian"
  | "bu";

export type BrowserProbeCoreMinorStarBrightnessByEarthlyBranch = Readonly<
  Record<BrowserProbeCoreMinorStarEarthlyBranchId,
    BrowserProbeCoreMinorStarBrightnessId | null>
>;

export type BrowserProbeCoreMinorStarFactProjectionBoundary = Readonly<{
  /** Compatibility/display summary only; exact validation uses brightnessByEarthlyBranch. */
  brightnessCanAppear: boolean;
  brightnessByEarthlyBranch: BrowserProbeCoreMinorStarBrightnessByEarthlyBranch;
  natalBirthYearTransformationRules:
    readonly BrowserProbeCoreMinorStarNatalTransformationRule[];
  factValuesOnly: true;
  interpretationIncluded: false;
}>;

export type BrowserProbeCoreMinorStarContentSource = Readonly<{
  sourceId: string;
  sourceKind:
    | "modern_original_minor_star_learning_material"
    | "public_domain_classical_minor_star_transcription";
  title: string;
  sourceUrl: string;
  accessedAt: string;
  usageBoundary: string;
  candidateUseOnly: true;
  schoolBoundaryDeclared: true;
  expertTruthClaimed: false;
}>;

export type BrowserProbeCoreMinorStarCandidateContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.core_minor_star.neutral_candidate/0.1";
  contentKind: "neutral_core_minor_star_semantics_candidate";
  starId: string;
  label: string;
  factCategory: "minor";
  traditionalCluster: BrowserProbeCoreMinorStarTraditionalCluster;
  traditionalClusterIsOutcome: false;
  traditionalClusterBoundary: string;
  factProjectionBoundary: BrowserProbeCoreMinorStarFactProjectionBoundary;
  coreThemes: readonly [string, string, string];
  plainLanguage: string;
  counterweight: string;
  reviewPrompt: string;
  derivationMethod: "editorial_synthesis_of_source_bound_core_minor_star_themes";
  sourceRefs: readonly BrowserProbeCoreMinorStarSourceRef[];
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeCoreMinorStarPalaceCandidateContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.core_minor_star_all_palaces.neutral_candidate/0.1";
  contentKind: "neutral_core_minor_star_palace_semantics_candidate";
  starId: string;
  label: string;
  factCategory: "minor";
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  baseCandidateContentId: string;
  palaceRoleContentId: string;
  traditionalCluster: BrowserProbeCoreMinorStarTraditionalCluster;
  traditionalClusterIsOutcome: false;
  positionSummary: string;
  counterweight: string;
  reviewPrompt: string;
  derivationMethod: "editorial_synthesis_of_core_minor_star_theme_and_palace_domain";
  sourceRefs: readonly BrowserProbeCoreMinorStarSourceRef[];
  requiresCombinationReview: true;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeNatalTransformationLabel = "禄" | "权" | "科" | "忌";

export type BrowserProbeNatalTransformationContentSource = Readonly<{
  sourceId: string;
  sourceKind:
    | "modern_original_mutagen_learning_material"
    | "public_domain_classical_mutagen_transcription"
    | "secondary_method_difference_overview";
  title: string;
  sourceUrl: string;
  accessedAt: string;
  usageBoundary: string;
  expertTruthClaimed: false;
}>;

export type BrowserProbeNatalTransformationCandidateContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.natal_transformation.neutral_candidate/0.1";
  contentKind: "neutral_natal_transformation_modifier_candidate";
  transformationLabel: BrowserProbeNatalTransformationLabel;
  motionLabel: string;
  plainLanguage: string;
  counterweight: string;
  reviewPrompt: string;
  derivationMethod: "editorial_synthesis_of_source_bound_natal_transformation_themes";
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeNatalTransformationPalaceCandidateContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.natal_transformation_all_palaces.neutral_candidate/0.1";
  contentKind: "neutral_natal_transformation_palace_modifier_candidate";
  transformationLabel: BrowserProbeNatalTransformationLabel;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  genericCandidateContentId: string;
  palaceRoleContentId: string;
  positionSummary: string;
  counterweight: string;
  reviewPrompt: string;
  derivationMethod: "editorial_synthesis_of_transformation_theme_and_palace_domain";
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbePalaceRoleId =
  | "life"
  | "siblings"
  | "spouse"
  | "children"
  | "wealth"
  | "health"
  | "travel"
  | "friends"
  | "career"
  | "property"
  | "wellbeing"
  | "parents";

export type BrowserProbeCorePalaceRoleId = Extract<
  BrowserProbePalaceRoleId,
  "life" | "wealth" | "career" | "travel"
>;

export type BrowserProbeMajorStarPalaceContentSource = Readonly<{
  sourceId: string;
  sourceKind: "public_domain_classical_palace_transcription" | "modern_original_palace_learning_material";
  title: string;
  sourceUrl: string;
  accessedAt: string;
  usageBoundary: string;
  expertTruthClaimed: false;
}>;

export type BrowserProbeMajorStarCombinationReviewSource = Readonly<{
  sourceId: string;
  sourceKind:
    | "modern_original_brightness_learning_material"
    | "modern_original_mutagen_learning_material"
    | "upstream_technical_relation_documentation"
    | "public_domain_classical_combination_transcription";
  title: string;
  sourceUrl: string;
  accessedAt: string;
  usageBoundary: string;
  expertTruthClaimed: false;
}>;

export type BrowserProbeMajorStarPalaceCandidateContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.major_star_all_palaces.neutral_candidate/0.2";
  contentKind: "neutral_palace_semantics_candidate";
  starId: string;
  label: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  positionSummary: string;
  reviewPrompt: string;
  derivationMethod: "editorial_synthesis_of_star_theme_and_palace_domain";
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  requiresCombinationReview: true;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbePalaceRoleCandidateContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.palace_role.neutral_candidate/0.1";
  contentKind: "neutral_palace_domain_candidate";
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  domainSummary: string;
  reviewPrompt: string;
  derivationMethod: "editorial_restatement_of_source_bound_palace_domain";
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeMajorStarCandidateContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.major_star.neutral_candidate/0.1";
  contentKind: "neutral_base_semantics_candidate";
  starId: string;
  label: string;
  coreThemes: readonly string[];
  plainLanguage: string;
  balancePrompt: string;
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeDisplayStar = Readonly<{
  starId: string;
  label: string;
  category: "major" | "minor" | "auxiliary";
  brightnessLabel: string | null;
  transformations: readonly string[];
  candidateContent: BrowserProbeMajorStarCandidateContent | null;
  palaceCandidateContent: BrowserProbeMajorStarPalaceCandidateContent | null;
  coreMinorCandidateContent: BrowserProbeCoreMinorStarCandidateContent | null;
  coreMinorPalaceCandidateContent: BrowserProbeCoreMinorStarPalaceCandidateContent | null;
}>;

export type BrowserProbeDisplayPalace = Readonly<{
  earthlyBranchId: string;
  earthlyBranchLabel: string;
  heavenlyStemLabel: string;
  roleId: string;
  roleLabel: string;
  isBodyPalace: boolean;
  stars: readonly BrowserProbeDisplayStar[];
}>;

export type BrowserProbeSanfangRelation =
  | "self"
  | "opposite_plus_6"
  | "trine_plus_4"
  | "trine_minus_4";

export type BrowserProbeDisplaySanfangMember = Readonly<{
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palace: BrowserProbeDisplayPalace;
}>;

export type BrowserProbeDisplaySanfangGroup = Readonly<{
  targetEarthlyBranchId: string;
  targetRoleId: string;
  members: readonly BrowserProbeDisplaySanfangMember[];
}>;

export type BrowserProbeCombinationStarFact = Readonly<{
  starId: string;
  label: string;
  category: "major" | "minor" | "auxiliary";
  brightnessLabel: string | null;
  transformations: readonly string[];
}>;

export type BrowserProbeMajorStarCombinationSanfangFact = Readonly<{
  relation: Exclude<BrowserProbeSanfangRelation, "self">;
  relationLabel: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: string;
  palaceRoleLabel: string;
  majorStars: readonly BrowserProbeCombinationStarFact[];
  transformationStars: readonly BrowserProbeCombinationStarFact[];
  otherStarCount: number;
}>;

export type BrowserProbeMajorStarPalaceCombinationReview = Readonly<{
  reviewId: string;
  reviewVersion: "ziwei.major_star_all_palaces.combination_review/0.2";
  reviewKind: "source_bound_combination_fact_review";
  candidateContentId: string;
  starId: string;
  label: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  factSummary: string;
  selfState: Readonly<{
    brightnessLabel: string | null;
    transformations: readonly string[];
    transformationScope: "natal_birth_year_only";
  }>;
  samePalace: Readonly<{
    otherMajorStars: readonly BrowserProbeCombinationStarFact[];
    otherStars: readonly BrowserProbeCombinationStarFact[];
  }>;
  sanfang: readonly BrowserProbeMajorStarCombinationSanfangFact[];
  reviewQuestions: readonly [string, string, string, string];
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  result: null;
  reviewStatus: "awaiting_expert_rule";
  publicationStatus: "isolated_review_only";
  factsDerivedFromVerifiedArtifact: true;
  interpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeMajorStarSameStarSynthesisReview = Readonly<{
  synthesisId: string;
  synthesisVersion: "ziwei.major_star_all_palaces.same_star_synthesis_review/0.1";
  synthesisKind: "derived_same_star_reading_package";
  starId: string;
  label: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  candidateContentId: string;
  combinationReviewId: string;
  directStatement: string;
  readingOrderStatement: string;
  scopeNote: string;
  positionCandidate: BrowserProbeMajorStarPalaceCandidateContent;
  combinationReview: BrowserProbeMajorStarPalaceCombinationReview;
  reviewQuestions: readonly [string, string, string, string];
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  evidenceClass: "derived_same_star_projection";
  result: null;
  goodBadOrientation: null;
  eventOutcome: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_review_only";
  factsDerivedFromVerifiedArtifact: true;
  editorialCandidateIncluded: true;
  expertInterpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbePalaceFirstMemberFact = Readonly<{
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  majorStars: readonly BrowserProbeCombinationStarFact[];
  transformationStars: readonly BrowserProbeCombinationStarFact[];
  otherStarCount: number;
}>;

export type BrowserProbePalaceFirstSynthesisReview = Readonly<{
  reviewId: string;
  reviewVersion: "ziwei.palace_sanfang.first_reading_review/0.1";
  reviewKind: "derived_palace_first_reading_package";
  targetEarthlyBranchId: string;
  targetEarthlyBranchLabel: string;
  targetHeavenlyStemLabel: string;
  targetPalaceRoleId: BrowserProbePalaceRoleId;
  targetPalaceRoleLabel: string;
  palaceRoleContent: BrowserProbePalaceRoleCandidateContent;
  targetMainStarState: "present" | "empty_in_verified_facts";
  targetMajorStars: readonly BrowserProbeCombinationStarFact[];
  targetStarSynthesisIds: readonly string[];
  groupMajorStarSynthesisIds: readonly string[];
  targetPositionStatements: readonly string[];
  members: readonly BrowserProbePalaceFirstMemberFact[];
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  groupFactSummary: string;
  directStatement: string;
  readingOrderStatement: string;
  emptyMainStarBoundary: string | null;
  scopeNote: string;
  reviewQuestions: readonly [string, string, string, string];
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  evidenceClass: "derived_palace_first_projection";
  result: null;
  goodBadOrientation: null;
  eventOutcome: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_review_only";
  factsDerivedFromVerifiedArtifact: true;
  editorialCandidateIncluded: true;
  expertInterpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeNatalTransformationOccurrenceReview = Readonly<{
  occurrenceId: string;
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  palaceRoleContent: BrowserProbePalaceRoleCandidateContent;
  starId: string;
  starLabel: string;
  starCategory: "major" | "minor" | "auxiliary";
  transformationLabel: BrowserProbeNatalTransformationLabel;
  candidateContent: BrowserProbeNatalTransformationCandidateContent;
  palaceCandidateContent: BrowserProbeNatalTransformationPalaceCandidateContent;
  basePositionState: "major_star_position_candidate_present" | "not_applicable_non_major_star";
  basePositionCandidate: BrowserProbeMajorStarPalaceCandidateContent | null;
  directStatement: string;
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  evidenceClass: "verified_natal_transformation_fact_with_editorial_candidate";
  result: null;
  goodBadOrientation: null;
  eventOutcome: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_review_only";
  factsDerivedFromVerifiedArtifact: true;
  editorialCandidateIncluded: true;
  expertInterpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbePalaceNatalTransformationReview = Readonly<{
  reviewId: string;
  reviewVersion: "ziwei.palace_sanfang.natal_transformation_review/0.1";
  reviewKind: "derived_natal_transformation_modifier_review";
  targetEarthlyBranchId: string;
  targetEarthlyBranchLabel: string;
  targetPalaceRoleId: BrowserProbePalaceRoleId;
  targetPalaceRoleLabel: string;
  transformationScope: "natal_birth_year_only";
  occurrences: readonly BrowserProbeNatalTransformationOccurrenceReview[];
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  directStatement: string;
  readingOrderStatement: string;
  absenceBoundary: string | null;
  reviewQuestions: readonly [string, string, string, string];
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  evidenceClass: "derived_natal_transformation_modifier_projection";
  result: null;
  goodBadOrientation: null;
  eventOutcome: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_review_only";
  factsDerivedFromVerifiedArtifact: true;
  editorialCandidateIncluded: true;
  expertInterpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeCoreMinorStarSanfangOccurrenceReview = Readonly<{
  occurrenceId: string;
  order: number;
  targetEarthlyBranchId: string;
  targetPalaceRoleId: BrowserProbePalaceRoleId;
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  sourceStarIndex: number;
  starId: string;
  starLabel: string;
  starCategory: "minor";
  brightnessLabel: string | null;
  transformations: readonly string[];
  nomenclatureConflictState: "none" | "classical_tiankong_not_dikong";
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  baseCandidateContentId: string;
  palaceCandidateContentId: string;
  baseCandidateContent: BrowserProbeCoreMinorStarCandidateContent;
  palaceCandidateContent: BrowserProbeCoreMinorStarPalaceCandidateContent;
  directStatement: string;
  sourceRefs: readonly BrowserProbeCoreMinorStarSourceRef[];
  evidenceClass: "verified_core_minor_star_fact_with_editorial_candidate";
  result: null;
  goodBadOrientation: null;
  eventOutcome: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_review_only";
  factsDerivedFromVerifiedArtifact: true;
  editorialCandidateIncluded: true;
  expertInterpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeCoreMinorStarSanfangReview = Readonly<{
  reviewId: string;
  order: number;
  reviewVersion: "ziwei.core_minor_star.sanfang_occurrence_review/0.1";
  reviewKind: "derived_core_minor_star_sanfang_occurrence_review";
  targetEarthlyBranchId: string;
  targetEarthlyBranchLabel: string;
  targetPalaceRoleId: BrowserProbePalaceRoleId;
  targetPalaceRoleLabel: string;
  targetCoreMinorState: "present" | "empty_in_verified_facts";
  occurrences: readonly BrowserProbeCoreMinorStarSanfangOccurrenceReview[];
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  sanfangProjectionRule: BrowserProbeSanfangProjectionRule;
  directStatement: string;
  readingOrderStatement: string;
  absenceBoundary: string | null;
  reviewQuestions: readonly [string, string, string, string];
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  evidenceClass: "derived_core_minor_star_sanfang_occurrence_projection";
  result: null;
  goodBadOrientation: null;
  eventOutcome: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_review_only";
  factsDerivedFromVerifiedArtifact: true;
  editorialCandidateIncluded: true;
  expertInterpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbePalaceFourPartSectionId =
  | "palace_theme"
  | "external_pull"
  | "resource_pressure_observation"
  | "contradiction_synthesis";

export type BrowserProbePalaceFourPartRelationBinding = Readonly<{
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
}>;

export type BrowserProbePalaceFourPartMajorStarBinding = Readonly<{
  relation: BrowserProbeSanfangRelation;
  relationLabel: string;
  palaceEarthlyBranchId: string;
  palaceEarthlyBranchLabel: string;
  palaceRoleId: BrowserProbePalaceRoleId;
  palaceRoleLabel: string;
  starId: string;
  starLabel: string;
  synthesisId: string;
  positionCandidateContentId: string;
  positionSummary: string;
  brightnessLabel: string | null;
  transformations: readonly string[];
}>;

export type BrowserProbePalaceFourPartSection = Readonly<{
  sectionId: BrowserProbePalaceFourPartSectionId;
  order: 1 | 2 | 3 | 4;
  title: string;
  directStatement: string;
  relationBindings: readonly BrowserProbePalaceFourPartRelationBinding[];
  majorStarBindings: readonly BrowserProbePalaceFourPartMajorStarBinding[];
  transformationOccurrenceIds: readonly string[];
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
}>;

export type BrowserProbePalaceFourPartSynthesisContent = Readonly<{
  contentId: string;
  contentVersion: "ziwei.palace_sanfang.four_part_synthesis_candidate/0.1";
  contentKind: "derived_palace_four_part_synthesis_candidate";
  targetEarthlyBranchId: string;
  targetEarthlyBranchLabel: string;
  targetPalaceRoleId: BrowserProbePalaceRoleId;
  targetPalaceRoleLabel: string;
  targetMainStarState: "present" | "empty_in_verified_facts";
  parts: readonly [
    BrowserProbePalaceFourPartSection,
    BrowserProbePalaceFourPartSection,
    BrowserProbePalaceFourPartSection,
    BrowserProbePalaceFourPartSection
  ];
  ruleSnapshotSha256: string;
  artifactFactsSha256: string;
  sourceRefs: readonly BrowserProbeMajorStarSourceRef[];
  selectedDominantTheme: null;
  resourcePressureOrientation: null;
  goodBadOrientation: null;
  eventOutcome: null;
  result: null;
  reviewStatus: "awaiting_expert_review";
  publicationStatus: "isolated_candidate_only";
  factsDerivedFromVerifiedArtifact: true;
  editorialCandidateIncluded: true;
  expertInterpretationIncluded: false;
  expertTruthClaimed: false;
  directOutcomeAllowed: false;
  scoringAllowed: false;
}>;

export type BrowserProbeSanfangProjectionRule = Readonly<{
  ruleId: string;
  method: "target_index_self_plus_minus_4_and_plus_6";
  sourceKind: "upstream_technical_documentation";
  sourceTitle: string;
  sourceUrl: string;
  accessedAt: string;
  interpretationIncluded: false;
  expertTruthClaimed: false;
}>;

export type BrowserProbeDisplayProjection = Readonly<{
  displayPalaces: readonly BrowserProbeDisplayPalace[];
  displaySanfangGroups: readonly BrowserProbeDisplaySanfangGroup[];
  sanfangProjectionRule: BrowserProbeSanfangProjectionRule;
  majorStarContentSources: readonly BrowserProbeMajorStarContentSource[];
  majorStarPalaceContentSources: readonly BrowserProbeMajorStarPalaceContentSource[];
  coreMinorStarContentSources: readonly BrowserProbeCoreMinorStarContentSource[];
  coreMinorStarCandidateContent: readonly BrowserProbeCoreMinorStarCandidateContent[];
  coreMinorStarPalaceCandidateContent:
    readonly BrowserProbeCoreMinorStarPalaceCandidateContent[];
  majorStarCombinationReviewSources: readonly BrowserProbeMajorStarCombinationReviewSource[];
  natalTransformationContentSources: readonly BrowserProbeNatalTransformationContentSource[];
  natalTransformationCandidateContent: readonly BrowserProbeNatalTransformationCandidateContent[];
  natalTransformationPalaceCandidateContent:
    readonly BrowserProbeNatalTransformationPalaceCandidateContent[];
  majorStarPalaceCombinationReviews: readonly BrowserProbeMajorStarPalaceCombinationReview[];
  majorStarSameStarSynthesisReviews: readonly BrowserProbeMajorStarSameStarSynthesisReview[];
  palaceFirstSynthesisReviews: readonly BrowserProbePalaceFirstSynthesisReview[];
  palaceNatalTransformationReviews: readonly BrowserProbePalaceNatalTransformationReview[];
  palaceFourPartSynthesisContents: readonly BrowserProbePalaceFourPartSynthesisContent[];
  coreMinorStarSanfangReviews: readonly BrowserProbeCoreMinorStarSanfangReview[];
  displaySummary: Readonly<{
    gregorianDate: string;
    lunarDate: string;
    shichen: string;
    sex: string;
    lifePalace: string;
    bodyPalace: string;
    fiveElementBureau: string;
    direction: string;
    ganzhi: string;
  }>;
}>;

export type BrowserProbeSuccessResult = Readonly<{
  artifact: ZiweiBrowserEngineeringArtifactDraft;
}>;

export type BrowserProbeSuccessResponse = Readonly<{
  ok: true;
  protocolVersion: typeof ZIWEI_BROWSER_PROBE_PROTOCOL;
  requestId: string;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  result: BrowserProbeSuccessResult;
}>;

export type BrowserProbeFailureResponse = Readonly<{
  ok: false;
  protocolVersion: typeof ZIWEI_BROWSER_PROBE_PROTOCOL;
  requestId: string | null;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  error: Readonly<{
    code: string;
    message: string;
  }>;
}>;

export type BrowserProbeResponse = BrowserProbeSuccessResponse | BrowserProbeFailureResponse;
