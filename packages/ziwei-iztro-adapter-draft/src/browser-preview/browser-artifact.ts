import { z } from "zod";
import {
  ZIWEI_DIGEST_ALGORITHM,
  ZIWEI_DIGEST_VERIFICATION,
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  ZIWEI_SHICHEN_SLOTS,
  canonicalizeZiweiDigestJson,
  sha256ZiweiCanonicalJson,
  ziweiBirthInputDraftSchema,
  ziweiFactProvenanceDraftSchema,
  ziweiFixtureEvidenceDraftSchema,
  ziweiNatalFactsDraftSchema,
  ziweiRuleSnapshotDraftSchema,
  type ZiweiBirthInputDraft,
  type ZiweiNatalFactsDraft,
  type ZiweiNatalFixtureDraft,
  type ZiweiRuleSnapshotDraft
} from "../contract-bridge.ts";
import {
  ZIWEI_BROWSER_PROBE_ADAPTER_ID,
  ZIWEI_BROWSER_PROBE_PROTOCOL
} from "./browser-protocol.ts";

export const ZIWEI_BROWSER_ENGINEERING_ARTIFACT_KIND =
  "ziwei_browser_natal_engineering_artifact" as const;
export const ZIWEI_BROWSER_ENGINEERING_ARTIFACT_VERSION =
  "ziwei-browser-engineering-artifact/0.1-draft" as const;
export const ZIWEI_BROWSER_EXECUTION_VERSION =
  "ziwei-browser-execution/0.1-draft" as const;
export const ZIWEI_BROWSER_DIGEST_VERIFICATION_SCOPE =
  "structure_and_recomputed_unkeyed_digest_integrity" as const;
export const ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION =
  "ziwei-browser-source-graph/0.1-draft" as const;
export const ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM = "sha256-source-graph-v1" as const;
export const ZIWEI_BROWSER_SOURCE_PATHS = Object.freeze([
  "src/browser-preview/browser-artifact.ts",
  "src/browser-preview/browser-client.ts",
  "src/browser-preview/browser-protocol.ts",
  "src/browser-preview/browser-worker.ts",
  "src/browser-preview/display-projection.ts",
  "src/browser-preview/major-star-content.ts",
  "src/browser-preview/major-star-palace-content.ts",
  "src/browser-preview/core-minor-star-content.ts",
  "src/browser-preview/core-minor-star-sanfang-review.ts",
  "src/browser-preview/core-minor-star-sanfang-review-feedback.ts",
  "src/browser-preview/natal-transformation-content.ts",
  "src/browser-preview/natal-transformation-palace-content.ts",
  "src/browser-preview/natal-transformation-palace-review-feedback.ts",
  "src/browser-preview/major-star-combination-review.ts",
  "src/browser-preview/major-star-synthesis-review.ts",
  "src/browser-preview/palace-first-synthesis-review.ts",
  "src/browser-preview/natal-transformation-review.ts",
  "src/browser-preview/palace-four-part-synthesis-content.ts",
  "src/browser-preview/main-response-gate.ts",
  "src/browser-preview/main.ts",
  "src/contract-bridge.ts",
  "src/iztro-2.5.8-lock-closure.json"
] as const);

const ZERO_SHA256 = "0".repeat(64);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SOURCE_ID_PATTERN = /^source:[a-z0-9][a-z0-9._-]*$/u;

const sha256Schema = z.string().regex(SHA256_PATTERN);
const sourceIdSchema = z.string().regex(SOURCE_ID_PATTERN).max(180);

export const ziweiBrowserSourceIdentityDraftSchema = z.strictObject({
  identityVersion: z.literal(ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION),
  digestAlgorithm: z.literal(ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM),
  files: z.array(z.strictObject({
    path: z.string().min(1).max(300),
    sha256: sha256Schema
  })).length(ZIWEI_BROWSER_SOURCE_PATHS.length),
  browserSourceGraphSha256: sha256Schema,
  browserWorkerSourceSha256: sha256Schema
}).superRefine((value, context) => {
  value.files.forEach((entry, index) => {
    if (entry.path !== ZIWEI_BROWSER_SOURCE_PATHS[index]) {
      context.addIssue({
        code: "custom",
        path: ["files", index, "path"],
        message: "Browser source identity must keep the complete canonical source path list"
      });
    }
  });
  const worker = value.files.find((entry) => entry.path === "src/browser-preview/browser-worker.ts");
  if (!worker || worker.sha256 !== value.browserWorkerSourceSha256) {
    context.addIssue({
      code: "custom",
      path: ["browserWorkerSourceSha256"],
      message: "Browser Worker source digest must bind its exact source-graph entry"
    });
  }
});

export const ziweiBrowserExecutionDraftSchema = z.strictObject({
  executionVersion: z.literal(ZIWEI_BROWSER_EXECUTION_VERSION),
  runtimeAdapterId: z.literal(ZIWEI_BROWSER_PROBE_ADAPTER_ID),
  runtimeAdapterVersion: z.literal("0.1.0"),
  browserWorkerProtocolVersion: z.literal(ZIWEI_BROWSER_PROBE_PROTOCOL),
  runtime: z.literal("browser_web_worker"),
  isolation: z.literal("fresh_browser_worker_per_calculation"),
  persistence: z.literal("none"),
  externalNetworkAccess: z.literal("not_initiated_by_calculation"),
  requestId: z.string().uuid(),
  workerInstanceId: z.string().uuid(),
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }),
  referenceEngine: z.strictObject({
    adapterId: z.literal("hakimi.ziwei.iztro.node_adapter"),
    adapterVersion: z.literal("0.1.0"),
    upstreamName: z.literal("iztro"),
    upstreamVersion: z.literal("2.5.8"),
    upstreamCommit: z.literal("9d39f1743bf31c2b3c635c9b9556215d9c90ee2c"),
    upstreamNpmIntegrity: z.literal(
      "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg=="
    ),
    dependencyGraphSha256: sha256Schema
  }),
  sourceIdentity: z.strictObject({
    profileId: z.literal("iztro.2_5_8.default_heaven"),
    profileVersion: z.literal("0.1.0"),
    ruleSnapshotSha256: sha256Schema,
    referenceSourceIds: z.array(sourceIdSchema).min(1).max(50)
  }),
  browserSourceIdentity: ziweiBrowserSourceIdentityDraftSchema
}).superRefine((value, context) => {
  if (Date.parse(value.completedAt) < Date.parse(value.startedAt)) {
    context.addIssue({
      code: "custom",
      path: ["completedAt"],
      message: "Browser execution completion cannot precede its start"
    });
  }
});

export const ziweiBrowserArtifactDigestDraftSchema = z.strictObject({
  digestAlgorithm: z.literal(ZIWEI_DIGEST_ALGORITHM),
  inputSha256: sha256Schema,
  ruleSnapshotSha256: sha256Schema,
  factsSha256: sha256Schema,
  artifactSha256: sha256Schema,
  digestVerification: z.literal(ZIWEI_DIGEST_VERIFICATION),
  verificationScope: z.literal(ZIWEI_BROWSER_DIGEST_VERIFICATION_SCOPE),
  unkeyedDigestOnly: z.literal(true),
  historicalExecutionAuthenticated: z.literal(false)
});

export const ziweiBrowserEngineeringArtifactDraftSchema = z.strictObject({
  contractVersion: z.literal(ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION),
  systemId: z.literal(ZIWEI_DOUSHU_SYSTEM_ID),
  artifactKind: z.literal(ZIWEI_BROWSER_ENGINEERING_ARTIFACT_KIND),
  artifactVersion: z.literal(ZIWEI_BROWSER_ENGINEERING_ARTIFACT_VERSION),
  input: ziweiBirthInputDraftSchema,
  ruleSnapshot: ziweiRuleSnapshotDraftSchema,
  facts: ziweiNatalFactsDraftSchema,
  provenance: z.array(ziweiFactProvenanceDraftSchema).min(1).max(1_000),
  evidence: ziweiFixtureEvidenceDraftSchema,
  execution: ziweiBrowserExecutionDraftSchema,
  digests: ziweiBrowserArtifactDigestDraftSchema,
  boundary: z.strictObject({
    productionEligible: z.literal(false),
    expertTruthClaimed: z.literal(false),
    interpretationIncluded: z.literal(false),
    baziCaseRevisionLinked: z.literal(false),
    productionDatabaseIncluded: z.literal(false),
    fullBackupIncluded: z.literal(false)
  })
}).superRefine((value, context) => {
  const rule = value.ruleSnapshot;
  const execution = value.execution;

  if (value.input.calendarInput.calendar !== "gregorian"
    || value.facts.calendarFacts.gregorianDate !== value.input.calendarInput.date) {
    context.addIssue({
      code: "custom",
      path: ["facts", "calendarFacts", "gregorianDate"],
      message: "The Browser artifact must preserve its Gregorian input date"
    });
  }
  const expectedShichen = ZIWEI_SHICHEN_SLOTS[value.input.shichenIndex];
  if (!expectedShichen
    || value.facts.calendarFacts.shichen.index !== expectedShichen.index
    || value.facts.calendarFacts.shichen.branchId !== expectedShichen.branchId
    || value.facts.calendarFacts.shichen.civilRange !== expectedShichen.civilRange) {
    context.addIssue({
      code: "custom",
      path: ["facts", "calendarFacts", "shichen"],
      message: "The Browser artifact facts must bind the complete input Shichen slot"
    });
  }
  if (value.facts.directionBasis.sexForCalculation !== value.input.sexForCalculation) {
    context.addIssue({
      code: "custom",
      path: ["facts", "directionBasis", "sexForCalculation"],
      message: "The Browser artifact facts must bind the calculation sex"
    });
  }
  if (value.facts.calendarFacts.gregorianDate < rule.verifiedRange.from
    || value.facts.calendarFacts.gregorianDate > rule.verifiedRange.to) {
    context.addIssue({
      code: "custom",
      path: ["facts", "calendarFacts", "gregorianDate"],
      message: "The Browser artifact facts fall outside the frozen verified range"
    });
  }

  if (execution.referenceEngine.adapterId !== rule.engine.adapterId
    || execution.referenceEngine.adapterVersion !== rule.engine.adapterVersion
    || execution.referenceEngine.upstreamName !== rule.engine.upstreamName
    || execution.referenceEngine.upstreamVersion !== rule.engine.upstreamVersion
    || execution.referenceEngine.upstreamCommit !== rule.engine.upstreamCommit
    || execution.referenceEngine.upstreamNpmIntegrity !== rule.engine.upstreamNpmIntegrity
    || execution.referenceEngine.dependencyGraphSha256 !== rule.engine.dependencyGraphSha256) {
    context.addIssue({
      code: "custom",
      path: ["execution", "referenceEngine"],
      message: "The Browser execution must bind the same frozen reference-engine identity"
    });
  }
  if (execution.sourceIdentity.profileId !== rule.profileId
    || execution.sourceIdentity.profileVersion !== rule.profileVersion
    || execution.sourceIdentity.ruleSnapshotSha256 !== rule.ruleSnapshotSha256
    || !sameStrings(execution.sourceIdentity.referenceSourceIds, rule.engine.sourceIds)) {
    context.addIssue({
      code: "custom",
      path: ["execution", "sourceIdentity"],
      message: "The Browser execution source identity must bind the complete frozen rule source identity"
    });
  }
  if (value.digests.ruleSnapshotSha256 !== rule.ruleSnapshotSha256) {
    context.addIssue({
      code: "custom",
      path: ["digests", "ruleSnapshotSha256"],
      message: "The stored rule digest must equal the embedded frozen-rule digest"
    });
  }

  const knownSources = new Set(rule.sourceCatalog.map((source) => source.sourceId));
  for (const [index, item] of value.provenance.entries()) {
    for (const sourceId of item.sourceIds) {
      if (!knownSources.has(sourceId)) {
        context.addIssue({
          code: "custom",
          path: ["provenance", index, "sourceIds"],
          message: `Browser artifact provenance cites an unknown source ${sourceId}`
        });
      }
    }
    if (item.verificationStatus !== "engineering_fixture_only") {
      context.addIssue({
        code: "custom",
        path: ["provenance", index, "verificationStatus"],
        message: "Browser engineering provenance cannot claim expert review"
      });
    }
  }
  const coveredFamilies = new Set(value.provenance.map((item) => item.factFamily));
  if (rule.rules.enabledFactFamilies.some((family) => !coveredFamilies.has(family))) {
    context.addIssue({
      code: "custom",
      path: ["provenance"],
      message: "Browser artifact provenance must cover every enabled fact family"
    });
  }
  if (value.evidence.truthStatus !== "upstream_regression"
    || !sameStrings(value.evidence.claimScopes, ["adapter_behavior", "chart_structure"])
    || value.evidence.productionEligible !== false
    || value.evidence.expertTruthClaimed !== false) {
    context.addIssue({
      code: "custom",
      path: ["evidence"],
      message: "Browser evidence is limited to upstream engineering regression and chart structure"
    });
  }
});

export type ZiweiBrowserExecutionDraft = z.infer<typeof ziweiBrowserExecutionDraftSchema>;
export type ZiweiBrowserSourceIdentityDraft = z.infer<typeof ziweiBrowserSourceIdentityDraftSchema>;
export type ZiweiBrowserEngineeringArtifactDraft = z.infer<
  typeof ziweiBrowserEngineeringArtifactDraftSchema
>;

export type ZiweiBrowserArtifactDigestSet = Readonly<{
  inputSha256: string;
  ruleSnapshotSha256: string;
  factsSha256: string;
  artifactSha256: string;
}>;

export type ZiweiBrowserArtifactDigestMismatch = Readonly<{
  fieldPath:
    | "digests.inputSha256"
    | "ruleSnapshot.ruleSnapshotSha256"
    | "execution.sourceIdentity.ruleSnapshotSha256"
    | "digests.ruleSnapshotSha256"
    | "digests.factsSha256"
    | "execution.browserSourceIdentity.browserSourceGraphSha256"
    | "digests.artifactSha256";
  expected: string;
  actual: string;
}>;

export type ZiweiBrowserArtifactVerificationResult =
  | Readonly<{
      success: true;
      data: ZiweiBrowserEngineeringArtifactDraft;
      digests: ZiweiBrowserArtifactDigestSet;
    }>
  | Readonly<{
      success: false;
      reason: "schema_invalid";
      error: z.ZodError<ZiweiBrowserEngineeringArtifactDraft>;
    }>
  | Readonly<{
      success: false;
      reason: "schema_normalized_input" | "digest_calculation_failed";
      message: string;
    }>
  | Readonly<{
      success: false;
      reason: "digest_mismatch";
      mismatches: readonly ZiweiBrowserArtifactDigestMismatch[];
    }>;

export type CreateZiweiBrowserArtifactOptions = Readonly<{
  input: ZiweiBirthInputDraft;
  ruleSnapshot: ZiweiRuleSnapshotDraft;
  facts: ZiweiNatalFactsDraft;
  requestId: string;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  browserSourceIdentity: ZiweiBrowserSourceIdentityDraft;
}>;

export async function createZiweiBrowserEngineeringArtifactDraft(
  options: CreateZiweiBrowserArtifactOptions
): Promise<ZiweiBrowserEngineeringArtifactDraft> {
  const input = ziweiBirthInputDraftSchema.parse(options.input);
  const ruleSnapshot = ziweiRuleSnapshotDraftSchema.parse(options.ruleSnapshot);
  const facts = ziweiNatalFactsDraftSchema.parse(options.facts);
  const browserSourceIdentity = ziweiBrowserSourceIdentityDraftSchema.parse(options.browserSourceIdentity);
  const provenance = createBrowserProvenance();
  const evidence: ZiweiNatalFixtureDraft["evidence"] = {
    truthStatus: "upstream_regression",
    claimScopes: ["adapter_behavior", "chart_structure"],
    productionEligible: false,
    expertTruthClaimed: false,
    note: "Fresh Browser Worker output bound to the complete frozen rule snapshot and package-lock closure identity. Canonical SHA-256 is unkeyed integrity evidence, does not authenticate historical execution, and is not expert truth."
  };
  const execution: ZiweiBrowserExecutionDraft = {
    executionVersion: ZIWEI_BROWSER_EXECUTION_VERSION,
    runtimeAdapterId: ZIWEI_BROWSER_PROBE_ADAPTER_ID,
    runtimeAdapterVersion: "0.1.0",
    browserWorkerProtocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
    runtime: "browser_web_worker",
    isolation: "fresh_browser_worker_per_calculation",
    persistence: "none",
    externalNetworkAccess: "not_initiated_by_calculation",
    requestId: options.requestId,
    workerInstanceId: options.workerInstanceId,
    startedAt: options.startedAt,
    completedAt: options.completedAt,
    referenceEngine: {
      adapterId: "hakimi.ziwei.iztro.node_adapter",
      adapterVersion: "0.1.0",
      upstreamName: "iztro",
      upstreamVersion: "2.5.8",
      upstreamCommit: "9d39f1743bf31c2b3c635c9b9556215d9c90ee2c",
      upstreamNpmIntegrity:
        "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg==",
      dependencyGraphSha256: ruleSnapshot.engine.dependencyGraphSha256
    },
    sourceIdentity: {
      profileId: "iztro.2_5_8.default_heaven",
      profileVersion: "0.1.0",
      ruleSnapshotSha256: ruleSnapshot.ruleSnapshotSha256,
      referenceSourceIds: [...ruleSnapshot.engine.sourceIds]
    },
    browserSourceIdentity
  };
  const candidate: ZiweiBrowserEngineeringArtifactDraft = {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: ZIWEI_DOUSHU_SYSTEM_ID,
    artifactKind: ZIWEI_BROWSER_ENGINEERING_ARTIFACT_KIND,
    artifactVersion: ZIWEI_BROWSER_ENGINEERING_ARTIFACT_VERSION,
    input,
    ruleSnapshot,
    facts,
    provenance,
    evidence,
    execution,
    digests: {
      digestAlgorithm: ZIWEI_DIGEST_ALGORITHM,
      inputSha256: ZERO_SHA256,
      ruleSnapshotSha256: ruleSnapshot.ruleSnapshotSha256,
      factsSha256: ZERO_SHA256,
      artifactSha256: ZERO_SHA256,
      digestVerification: ZIWEI_DIGEST_VERIFICATION,
      verificationScope: ZIWEI_BROWSER_DIGEST_VERIFICATION_SCOPE,
      unkeyedDigestOnly: true,
      historicalExecutionAuthenticated: false
    },
    boundary: {
      productionEligible: false,
      expertTruthClaimed: false,
      interpretationIncluded: false,
      baziCaseRevisionLinked: false,
      productionDatabaseIncluded: false,
      fullBackupIncluded: false
    }
  };
  const structurallyParsed = ziweiBrowserEngineeringArtifactDraftSchema.parse(candidate);
  Object.assign(structurallyParsed.digests, await calculateZiweiBrowserArtifactDigests(structurallyParsed));
  const verified = await verifyZiweiBrowserEngineeringArtifactDraft(structurallyParsed);
  if (!verified.success) {
    throw new Error(`Generated Browser artifact failed verification: ${describeVerificationFailure(verified)}`);
  }
  return verified.data;
}

export async function calculateZiweiBrowserArtifactDigests(
  artifact: ZiweiBrowserEngineeringArtifactDraft
): Promise<ZiweiBrowserArtifactDigestSet> {
  const [inputSha256, ruleSnapshotSha256, factsSha256, artifactSha256] = await Promise.all([
    sha256ZiweiCanonicalJson(artifact.input),
    sha256ZiweiCanonicalJson(projectRuleSnapshotForDigest(artifact.ruleSnapshot)),
    sha256ZiweiCanonicalJson(artifact.facts),
    sha256ZiweiCanonicalJson(projectBrowserArtifactForDigest(artifact))
  ]);
  return Object.freeze({ inputSha256, ruleSnapshotSha256, factsSha256, artifactSha256 });
}

export async function calculateZiweiBrowserSourceGraphSha256(
  identity: Pick<ZiweiBrowserSourceIdentityDraft, "identityVersion" | "digestAlgorithm" | "files">
): Promise<string> {
  return sha256ZiweiCanonicalJson({
    identityVersion: identity.identityVersion,
    digestAlgorithm: identity.digestAlgorithm,
    files: identity.files
  });
}

export async function verifyZiweiBrowserEngineeringArtifactDraft(
  candidate: unknown
): Promise<ZiweiBrowserArtifactVerificationResult> {
  const parsed = ziweiBrowserEngineeringArtifactDraftSchema.safeParse(candidate);
  if (!parsed.success) return { success: false, reason: "schema_invalid", error: parsed.error };

  let rawCanonicalJson: string;
  let parsedCanonicalJson: string;
  try {
    rawCanonicalJson = canonicalizeZiweiDigestJson(candidate);
    parsedCanonicalJson = canonicalizeZiweiDigestJson(parsed.data);
  } catch (cause) {
    return {
      success: false,
      reason: "digest_calculation_failed",
      message: cause instanceof Error ? cause.message : "Browser artifact is not canonical JSON"
    };
  }
  if (rawCanonicalJson !== parsedCanonicalJson) {
    return {
      success: false,
      reason: "schema_normalized_input",
      message: "Browser artifact changed during strict Schema normalization"
    };
  }

  let digests: ZiweiBrowserArtifactDigestSet;
  let sourceGraphSha256: string;
  try {
    [digests, sourceGraphSha256] = await Promise.all([
      calculateZiweiBrowserArtifactDigests(parsed.data),
      calculateZiweiBrowserSourceGraphSha256(parsed.data.execution.browserSourceIdentity)
    ]);
  } catch (cause) {
    return {
      success: false,
      reason: "digest_calculation_failed",
      message: cause instanceof Error ? cause.message : "Browser artifact digest calculation failed"
    };
  }
  const mismatches: ZiweiBrowserArtifactDigestMismatch[] = [];
  addDigestMismatch(mismatches, "digests.inputSha256", digests.inputSha256, parsed.data.digests.inputSha256);
  addDigestMismatch(
    mismatches,
    "ruleSnapshot.ruleSnapshotSha256",
    digests.ruleSnapshotSha256,
    parsed.data.ruleSnapshot.ruleSnapshotSha256
  );
  addDigestMismatch(
    mismatches,
    "execution.sourceIdentity.ruleSnapshotSha256",
    digests.ruleSnapshotSha256,
    parsed.data.execution.sourceIdentity.ruleSnapshotSha256
  );
  addDigestMismatch(
    mismatches,
    "digests.ruleSnapshotSha256",
    digests.ruleSnapshotSha256,
    parsed.data.digests.ruleSnapshotSha256
  );
  addDigestMismatch(mismatches, "digests.factsSha256", digests.factsSha256, parsed.data.digests.factsSha256);
  addDigestMismatch(
    mismatches,
    "execution.browserSourceIdentity.browserSourceGraphSha256",
    sourceGraphSha256,
    parsed.data.execution.browserSourceIdentity.browserSourceGraphSha256
  );
  addDigestMismatch(
    mismatches,
    "digests.artifactSha256",
    digests.artifactSha256,
    parsed.data.digests.artifactSha256
  );
  return mismatches.length > 0
    ? { success: false, reason: "digest_mismatch", mismatches }
    : { success: true, data: parsed.data, digests };
}

export function describeVerificationFailure(
  result: Exclude<ZiweiBrowserArtifactVerificationResult, { success: true }>
): string {
  if (result.reason === "schema_invalid") return result.error.issues[0]?.message ?? "schema invalid";
  if (result.reason === "digest_mismatch") {
    return `digest mismatch at ${result.mismatches.map((item) => item.fieldPath).join(", ")}`;
  }
  return result.message;
}

function createBrowserProvenance(): ZiweiNatalFixtureDraft["provenance"] {
  return [
    provenance("calendar", "facts.calendarFacts", "iztro.2_5_8.calendar_resolution"),
    provenance("palaces", "facts.palaces", "iztro.2_5_8.natal_palaces"),
    provenance("natal_stars", "facts.palaces", "iztro.2_5_8.natal_star_placement"),
    provenance("transformations", "facts.palaces", "iztro.2_5_8.birth_year_mutagens"),
    provenance("major_periods", "facts.majorPeriods", "iztro.2_5_8.major_periods")
  ];
}

function provenance(
  factFamily: ZiweiNatalFixtureDraft["provenance"][number]["factFamily"],
  fieldPath: string,
  algorithmId: string
): ZiweiNatalFixtureDraft["provenance"][number] {
  return {
    factFamily,
    fieldPath,
    algorithmId,
    sourceIds: ["source:iztro-2.5.8"],
    verificationStatus: "engineering_fixture_only"
  };
}

function projectRuleSnapshotForDigest(
  ruleSnapshot: ZiweiRuleSnapshotDraft
): Omit<ZiweiRuleSnapshotDraft, "ruleSnapshotSha256"> {
  const { ruleSnapshotSha256: _excluded, ...projection } = ruleSnapshot;
  return projection;
}

function projectBrowserArtifactForDigest(artifact: ZiweiBrowserEngineeringArtifactDraft): unknown {
  const {
    inputSha256: _input,
    ruleSnapshotSha256: _rule,
    factsSha256: _facts,
    artifactSha256: _artifact,
    ...digestMetadata
  } = artifact.digests;
  return {
    contractVersion: artifact.contractVersion,
    systemId: artifact.systemId,
    artifactKind: artifact.artifactKind,
    artifactVersion: artifact.artifactVersion,
    input: artifact.input,
    ruleSnapshot: artifact.ruleSnapshot,
    facts: artifact.facts,
    provenance: artifact.provenance,
    evidence: artifact.evidence,
    execution: artifact.execution,
    digests: digestMetadata,
    boundary: artifact.boundary
  };
}

function addDigestMismatch(
  mismatches: ZiweiBrowserArtifactDigestMismatch[],
  fieldPath: ZiweiBrowserArtifactDigestMismatch["fieldPath"],
  expected: string,
  actual: string
): void {
  if (expected !== actual) mismatches.push({ fieldPath, expected, actual });
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
