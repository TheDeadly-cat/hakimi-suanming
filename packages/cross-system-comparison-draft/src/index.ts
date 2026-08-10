export const CROSS_SYSTEM_COMPARISON_DRAFT_VERSION = "cross-system-readonly-comparison/0.1-draft" as const;

export const CROSS_SYSTEM_IDS = Object.freeze([
  "bazi",
  "ziwei-doushu",
  "western-astrology"
] as const);

export type CrossSystemId = (typeof CROSS_SYSTEM_IDS)[number];

const ARTIFACT_KIND_BY_SYSTEM = Object.freeze({
  bazi: "bazi_revision_summary",
  "ziwei-doushu": "ziwei_revision_summary",
  "western-astrology": "western_rule_artifact"
} as const);

export type CrossSystemArtifactKind = (typeof ARTIFACT_KIND_BY_SYSTEM)[CrossSystemId];

export type CrossSystemFrozenFactDraft = Readonly<{
  field: string;
  value: string;
  sourceRef?: string;
}>;

export type CrossSystemArtifactSummaryDraft = Readonly<{
  systemId: CrossSystemId;
  artifactKind: CrossSystemArtifactKind;
  label: string;
  frozenFacts: readonly CrossSystemFrozenFactDraft[];
  ruleIdentity: Readonly<{
    profileId: string;
    profileVersion: string;
    profileDigest?: string;
  }>;
  sourceRefs: readonly string[];
  boundary: Readonly<{
    productionEligible: false;
    expertTruthClaimed: false;
    successReceiptIssued: false;
  }>;
}>;

export type CrossSystemExplicitSubjectLinkDraft = Readonly<{
  label: string;
  confirmedByUser: true;
  removable: true;
}>;

export type CrossSystemReadonlyComparisonDraft = Readonly<{
  schemaVersion: typeof CROSS_SYSTEM_COMPARISON_DRAFT_VERSION;
  envelopeVersion: 1;
  createdAt: string;
  systems: readonly CrossSystemArtifactSummaryDraft[];
  factsFrozen: true;
  noScoring: true;
  noAutoPersonMerge: true;
  explicitSubjectLink: CrossSystemExplicitSubjectLinkDraft | null;
  contentSha256: string;
}>;

export type CrossSystemComparisonPayload = Omit<CrossSystemReadonlyComparisonDraft, "contentSha256">;

export type CrossSystemVerificationResult =
  | { ok: true; value: CrossSystemReadonlyComparisonDraft }
  | { ok: false; reasons: readonly string[] };

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function calculateCrossSystemComparisonSha256Draft(
  payload: CrossSystemComparisonPayload
): Promise<string> {
  return sha256Hex(stableStringify(payload));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyBounded(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function validateSummary(value: unknown, reasons: string[], systemIds: Set<CrossSystemId>): void {
  if (!isRecord(value)) {
    reasons.push("system summary must be an object");
    return;
  }
  const systemId = value.systemId;
  if (typeof systemId !== "string" || !CROSS_SYSTEM_IDS.includes(systemId as CrossSystemId)) {
    reasons.push(`unknown or duplicate systemId: ${String(systemId)}`);
    return;
  }
  const id = systemId as CrossSystemId;
  if (systemIds.has(id)) reasons.push(`duplicate systemId: ${id}`);
  systemIds.add(id);

  if (value.artifactKind !== ARTIFACT_KIND_BY_SYSTEM[id]) {
    reasons.push(`${id} artifactKind must be ${ARTIFACT_KIND_BY_SYSTEM[id]}`);
  }
  if (!nonEmptyBounded(value.label, 80)) reasons.push(`${id} label must be a non-empty string <= 80 chars`);
  if (!Array.isArray(value.frozenFacts) || value.frozenFacts.length === 0) {
    reasons.push(`${id} frozenFacts must contain at least one fact`);
  } else {
    const fields = new Set<string>();
    for (const fact of value.frozenFacts) {
      if (!isRecord(fact) || !nonEmptyBounded(fact.field, 80) || !nonEmptyBounded(fact.value, 1_000)) {
        reasons.push(`${id} frozen fact must have field <= 80 and value <= 1000`);
        continue;
      }
      if (fields.has(fact.field)) reasons.push(`${id} frozen fact field duplicated: ${fact.field}`);
      fields.add(fact.field);
      if (fact.sourceRef !== undefined && !nonEmptyBounded(fact.sourceRef, 200)) {
        reasons.push(`${id} frozen fact sourceRef must be <= 200 chars`);
      }
    }
  }

  if (!isRecord(value.ruleIdentity)
    || !nonEmptyBounded(value.ruleIdentity.profileId, 100)
    || !nonEmptyBounded(value.ruleIdentity.profileVersion, 50)) {
    reasons.push(`${id} ruleIdentity must include non-empty profileId and profileVersion`);
  } else if (value.ruleIdentity.profileDigest !== undefined
    && (typeof value.ruleIdentity.profileDigest !== "string"
      || !/^[a-f0-9]{64}$/u.test(value.ruleIdentity.profileDigest))) {
    reasons.push(`${id} ruleIdentity.profileDigest must be lowercase SHA-256`);
  }

  if (!Array.isArray(value.sourceRefs)
    || value.sourceRefs.length > 50
    || value.sourceRefs.some((ref) => !nonEmptyBounded(ref, 200))) {
    reasons.push(`${id} sourceRefs must be an array of <= 50 strings each <= 200 chars`);
  }

  if (!isRecord(value.boundary)
    || value.boundary.productionEligible !== false
    || value.boundary.expertTruthClaimed !== false
    || value.boundary.successReceiptIssued !== false) {
    reasons.push(`${id} boundary must keep productionEligible/expertTruthClaimed/successReceiptIssued false`);
  }
}

export async function verifyCrossSystemReadonlyComparisonDraft(
  candidate: unknown
): Promise<CrossSystemVerificationResult> {
  const reasons: string[] = [];
  if (!isRecord(candidate)) {
    return { ok: false, reasons: ["comparison must be an object"] };
  }
  if (candidate.schemaVersion !== CROSS_SYSTEM_COMPARISON_DRAFT_VERSION) {
    reasons.push("schemaVersion mismatch");
  }
  if (candidate.envelopeVersion !== 1) reasons.push("envelopeVersion must be 1");
  if (candidate.factsFrozen !== true) reasons.push("factsFrozen must be true");
  if (candidate.noScoring !== true) reasons.push("noScoring must be true");
  if (candidate.noAutoPersonMerge !== true) reasons.push("noAutoPersonMerge must be true");
  if (typeof candidate.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(candidate.createdAt)) {
    reasons.push("createdAt must be a UTC ISO timestamp");
  }

  if (!Array.isArray(candidate.systems) || candidate.systems.length < 1 || candidate.systems.length > 3) {
    reasons.push("systems must contain 1..3 summaries");
  } else {
    const systemIds = new Set<CrossSystemId>();
    for (const summary of candidate.systems) validateSummary(summary, reasons, systemIds);
  }

  if (candidate.explicitSubjectLink === null) {
    // Explicitly no person link is allowed.
  } else if (!isRecord(candidate.explicitSubjectLink)
    || !nonEmptyBounded(candidate.explicitSubjectLink.label, 80)
    || candidate.explicitSubjectLink.confirmedByUser !== true
    || candidate.explicitSubjectLink.removable !== true) {
    reasons.push("explicitSubjectLink must be null or a user-confirmed removable link with a label");
  }

  if (typeof candidate.contentSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(candidate.contentSha256)) {
    reasons.push("contentSha256 must be lowercase SHA-256");
  } else {
    const { contentSha256: _expected, ...payload } = candidate;
    const actual = await calculateCrossSystemComparisonSha256Draft(
      payload as unknown as CrossSystemComparisonPayload
    );
    if (actual !== candidate.contentSha256) reasons.push("contentSha256 does not match canonical payload");
  }

  if (reasons.length) return { ok: false, reasons };
  return { ok: true, value: candidate as unknown as CrossSystemReadonlyComparisonDraft };
}
