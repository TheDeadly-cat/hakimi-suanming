import bundledEngineeringFactRegistry from "./generated-engineering-fact-receipts.v1.json" with { type: "json" };

export const CROSS_SYSTEM_COMPARISON_DRAFT_VERSION = "cross-system-readonly-comparison/0.3-draft" as const;

export const CROSS_SYSTEM_IDS = Object.freeze([
  "bazi",
  "ziwei-doushu",
  "western-astrology"
] as const);

export type CrossSystemId = (typeof CROSS_SYSTEM_IDS)[number];

const ARTIFACT_KIND_BY_SYSTEM = Object.freeze({
  bazi: "bazi_engineering_fact_projection",
  "ziwei-doushu": "ziwei_engineering_fact_projection",
  "western-astrology": "western_engineering_fact_projection"
} as const);

export type CrossSystemArtifactKind = (typeof ARTIFACT_KIND_BY_SYSTEM)[CrossSystemId];

export type CrossSystemFrozenFactDraft = Readonly<{
  field: string;
  value: string;
  sourceRef: string;
}>;

export type CrossSystemEngineeringFactReceiptReferenceDraft = Readonly<{
  registryId: "hakimi.cross-system/engineering-fact-replay/1.0.0";
  registryDigest: string;
  receiptId: string;
  receiptDigest: string;
  receiptClass: "offline_current_workspace_replay_observation";
}>;

export type CrossSystemArtifactSummaryDraft = Readonly<{
  systemId: CrossSystemId;
  artifactKind: CrossSystemArtifactKind;
  label: string;
  frozenFacts: readonly CrossSystemFrozenFactDraft[];
  ruleIdentity: Readonly<{
    profileId: string;
    profileVersion: string;
    profileDigest: string;
  }>;
  engineeringEvidenceRefs: readonly string[];
  engineeringFactReceipt: CrossSystemEngineeringFactReceiptReferenceDraft;
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

export const CROSS_SYSTEM_OBSERVATION_PARTITIONS = Object.freeze([
  "convergences",
  "divergences",
  "inputSemanticConflicts",
  "schoolConflicts",
  "evidenceQualityDifferences",
  "nonComparableConcepts",
  "unresolvedQuestions"
] as const);

export type CrossSystemObservationPartition =
  (typeof CROSS_SYSTEM_OBSERVATION_PARTITIONS)[number];

export type CrossSystemObservationBasisDraft = Readonly<{
  systemId: CrossSystemId;
  basisType: "frozen_fact" | "rule_identity" | "engineering_receipt" | "declared_concept";
  reference: string;
}>;

export type CrossSystemObservationDraft = Readonly<{
  observationId: string;
  title: string;
  systemIds: readonly CrossSystemId[];
  basisRefs: readonly CrossSystemObservationBasisDraft[];
  note: string;
  entryMode: "manual_explicit_entry_unverified";
  assessmentState: "unreviewed_observation";
  conceptEquivalenceClaimed: false;
  expertTruthClaimed: false;
  modelArbitrationUsed: false;
}>;

export type CrossSystemObservationInventoryDraft = Readonly<
  Record<CrossSystemObservationPartition, readonly CrossSystemObservationDraft[]>
>;

export type CrossSystemReadonlyComparisonDraft = Readonly<{
  schemaVersion: typeof CROSS_SYSTEM_COMPARISON_DRAFT_VERSION;
  envelopeVersion: 3;
  createdAt: string;
  systems: readonly CrossSystemArtifactSummaryDraft[];
  factsFrozen: true;
  factEvidenceState: "registry_bound_offline_engineering_replay_not_domain_truth";
  factReceiptRegistry: Readonly<{
    registryId: "hakimi.cross-system/engineering-fact-replay/1.0.0";
    registryDigest: string;
    trustClass: "offline_current_workspace_replay_observation_not_domain_truth";
    systemsWithEngineeringReplayReceipt: 2;
    systemsRequired: 4;
    formalComparisonAuthorized: false;
  }>;
  noScoring: true;
  noWeighting: true;
  noMajorityVote: true;
  noModelArbitration: true;
  noAutoPersonMerge: true;
  noConceptEquivalenceInference: true;
  explicitSubjectLink: CrossSystemExplicitSubjectLinkDraft | null;
  observations: CrossSystemObservationInventoryDraft;
  contentSha256: string;
}>;

export type CrossSystemComparisonPayload = Omit<CrossSystemReadonlyComparisonDraft, "contentSha256">;

export type CrossSystemVerificationResult =
  | { ok: true; value: CrossSystemReadonlyComparisonDraft }
  | { ok: false; reasons: readonly string[] };

type BundledEngineeringReceipt = Readonly<{
  receiptId: string;
  receiptClass: "offline_current_workspace_replay_observation";
  receiptDigest: string;
  systemId: string;
  status: string;
  projectedFacts: readonly CrossSystemFrozenFactDraft[];
  projectedFactsSha256: string;
  ruleIdentity: CrossSystemArtifactSummaryDraft["ruleIdentity"];
  engineeringEvidenceRefs: readonly string[];
  boundary: Readonly<{
    productionEligible: false;
    expertTruthClaimed: false;
    successReceiptIssued: false;
    contentTruthEstablished: false;
    sourceTextTruthEstablished: false;
    rightsLegalConclusionEstablished: false;
    formalComparisonAuthorized: false;
    publicDeploymentAuthorized: false;
  }>;
}>;

type BundledEngineeringRegistry = Readonly<{
  schemaVersion: string;
  recordType: string;
  registryId: "hakimi.cross-system/engineering-fact-replay/1.0.0";
  registryStatus: string;
  systems: readonly Readonly<{
    systemId: string;
    receiptStatus: string;
    receipt: BundledEngineeringReceipt | null;
  }>[];
  gateSummary: Readonly<{
    systemsRequired: number;
    systemsWithEngineeringReplayReceipt: number;
    formalCrossSystemComparisonAuthorized: boolean;
  }>;
  registryDigest: string;
}>;

const EXPECTED_BUNDLED_SYSTEM_IDENTITIES = Object.freeze([
  Object.freeze({
    systemId: "bazi",
    receiptStatus: "blocked_saved_manifest_not_current",
    receiptId: null,
    receiptDigest: null,
    projectedFactsSha256: null
  }),
  Object.freeze({
    systemId: "ziwei-doushu",
    receiptStatus: "engineering_replay_verified_not_admitted",
    receiptId: "cross-system.engineering-replay/ziwei.synthetic-e1",
    receiptDigest: "22d981cd3f56c4a1e9e275f7121c466b100255efe9dded6d202fcfa405e473c1",
    projectedFactsSha256: "6a085ae0ce4f421142de642ade7c61ceccefe74efd446233670708e068ac0719"
  }),
  Object.freeze({
    systemId: "western-astrology",
    receiptStatus: "engineering_replay_verified_not_admitted",
    receiptId: "cross-system.engineering-replay/western.synthetic-e1",
    receiptDigest: "9042d7bd0e25f17c3564db4aaa342860f0d24622306cf65c6ad7256aae3c1f32",
    projectedFactsSha256: "7f9fabb2b314308710568b44b1c1a6adc75e3141f0843184990bcdca39995499"
  }),
  Object.freeze({
    systemId: "vedic-astrology",
    receiptStatus: "absent_no_registered_product_or_fact_producer",
    receiptId: null,
    receiptDigest: null,
    projectedFactsSha256: null
  })
] as const);

const BUNDLED_ENGINEERING_FACT_REGISTRY = deepFreezeJson(
  capturePassiveJsonSnapshot(bundledEngineeringFactRegistry)
) as BundledEngineeringRegistry;

function capturePassiveJsonValue(
  value: unknown,
  state: { nodes: number; textCharacters: number; active: WeakSet<object> },
  depth: number
): unknown {
  if (depth > 64) throw new Error("input exceeds maximum depth");
  state.nodes += 1;
  if (state.nodes > 200_000) throw new Error("input exceeds maximum node count");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("input contains a non-finite number");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) throw new Error("input exceeds maximum text size");
    return value;
  }
  if (typeof value !== "object") throw new Error("input contains a non-JSON value");
  if (state.active.has(value)) throw new Error("input contains a cycle");
  state.active.add(value);
  try {
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key === "symbol")) throw new Error("input contains a Symbol property");
    if (array) {
      if (prototype !== Array.prototype) throw new Error("input array prototype is invalid");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        throw new Error("input array length is invalid");
      }
      const allowed = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (keys.some((key) => !allowed.has(key as string))) {
        throw new Error("input array contains extra properties");
      }
      const result: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          throw new Error("input contains a sparse or accessor array element");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) throw new Error("input object prototype is invalid");
    const entries: Array<[string, unknown]> = [];
    for (const key of keys) {
      const descriptor = descriptors[key as string];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        throw new Error("input contains an accessor or non-enumerable field");
      }
      entries.push([
        key as string,
        capturePassiveJsonValue(descriptor.value, state, depth + 1)
      ]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value: unknown): unknown {
  return capturePassiveJsonValue(value, {
    nodes: 0,
    textCharacters: 0,
    active: new WeakSet<object>()
  }, 0);
}

function deepFreezeJson<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function bundledRegistryShapeIsPinned(): boolean {
  if (!Array.isArray(BUNDLED_ENGINEERING_FACT_REGISTRY.systems)
    || BUNDLED_ENGINEERING_FACT_REGISTRY.systems.length
      !== EXPECTED_BUNDLED_SYSTEM_IDENTITIES.length) return false;

  return EXPECTED_BUNDLED_SYSTEM_IDENTITIES.every((expected, index) => {
    const entry = BUNDLED_ENGINEERING_FACT_REGISTRY.systems[index];
    if (!isRecord(entry)
      || entry.systemId !== expected.systemId
      || entry.receiptStatus !== expected.receiptStatus) return false;
    if (expected.receiptDigest === null) return entry.receipt === null;
    const receipt = entry.receipt;
    return isRecord(receipt)
      && isRecord(receipt.boundary)
      && receipt.systemId === expected.systemId
      && receipt.status === expected.receiptStatus
      && receipt.receiptId === expected.receiptId
      && receipt.receiptDigest === expected.receiptDigest
      && receipt.projectedFactsSha256 === expected.projectedFactsSha256
      && receipt.receiptClass === "offline_current_workspace_replay_observation"
      && receipt.boundary.productionEligible === false
      && receipt.boundary.expertTruthClaimed === false
      && receipt.boundary.successReceiptIssued === false
      && receipt.boundary.contentTruthEstablished === false
      && receipt.boundary.sourceTextTruthEstablished === false
      && receipt.boundary.rightsLegalConclusionEstablished === false
      && receipt.boundary.formalComparisonAuthorized === false
      && receipt.boundary.publicDeploymentAuthorized === false;
  });
}

function assertBundledRegistryShapeIsPinned(): void {
  if (!bundledRegistryShapeIsPinned()) {
    throw new Error("bundled engineering fact receipt registry identity is invalid");
  }
}

function bundledReceiptForSystem(systemId: CrossSystemId): BundledEngineeringReceipt | null {
  const entry = BUNDLED_ENGINEERING_FACT_REGISTRY.systems.find(
    (candidate) => candidate.systemId === systemId
  );
  return entry?.receiptStatus === "engineering_replay_verified_not_admitted"
    ? entry.receipt
    : null;
}

export function createRegisteredCrossSystemSummaryDraft(
  systemId: CrossSystemId,
  label: string
): CrossSystemArtifactSummaryDraft {
  assertBundledRegistryShapeIsPinned();
  const receipt = bundledReceiptForSystem(systemId);
  if (!receipt) throw new Error(`${systemId} has no current engineering replay receipt`);
  return capturePassiveJsonSnapshot({
    systemId,
    artifactKind: ARTIFACT_KIND_BY_SYSTEM[systemId],
    label,
    frozenFacts: receipt.projectedFacts,
    ruleIdentity: receipt.ruleIdentity,
    engineeringEvidenceRefs: receipt.engineeringEvidenceRefs,
    engineeringFactReceipt: {
      registryId: BUNDLED_ENGINEERING_FACT_REGISTRY.registryId,
      registryDigest: BUNDLED_ENGINEERING_FACT_REGISTRY.registryDigest,
      receiptId: receipt.receiptId,
      receiptDigest: receipt.receiptDigest,
      receiptClass: receipt.receiptClass
    },
    boundary: {
      productionEligible: false,
      expertTruthClaimed: false,
      successReceiptIssued: false
    }
  }) as CrossSystemArtifactSummaryDraft;
}

export function createCrossSystemFactReceiptRegistryReferenceDraft():
CrossSystemReadonlyComparisonDraft["factReceiptRegistry"] {
  assertBundledRegistryShapeIsPinned();
  return {
    registryId: BUNDLED_ENGINEERING_FACT_REGISTRY.registryId,
    registryDigest: BUNDLED_ENGINEERING_FACT_REGISTRY.registryDigest,
    trustClass: "offline_current_workspace_replay_observation_not_domain_truth",
    systemsWithEngineeringReplayReceipt: 2,
    systemsRequired: 4,
    formalComparisonAuthorized: false
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
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
  const snapshot = capturePassiveJsonSnapshot(payload) as CrossSystemComparisonPayload;
  return sha256Hex(stableStringify(snapshot));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyBounded(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right, "en"));
  const required = [...expected].sort((left, right) => left.localeCompare(right, "en"));
  return actual.length === required.length
    && actual.every((key, index) => key === required[index]);
}

function requireExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  reasons: string[],
  label: string
): void {
  if (!hasExactKeys(value, expected)) reasons.push(`${label} must contain only the exact contract fields`);
}

function validateSummary(value: unknown, reasons: string[], systemIds: Set<CrossSystemId>): void {
  if (!isRecord(value)) {
    reasons.push("system summary must be an object");
    return;
  }
  requireExactKeys(
    value,
    [
      "systemId",
      "artifactKind",
      "label",
      "frozenFacts",
      "ruleIdentity",
      "engineeringEvidenceRefs",
      "engineeringFactReceipt",
      "boundary"
    ],
    reasons,
    "system summary"
  );
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
  const bundledReceipt = bundledReceiptForSystem(id);
  if (!bundledReceipt) {
    reasons.push(`${id} has no current registry-bound engineering replay receipt`);
  }
  if (!Array.isArray(value.frozenFacts) || value.frozenFacts.length === 0) {
    reasons.push(`${id} frozenFacts must contain at least one fact`);
  } else {
    const fields = new Set<string>();
    for (const fact of value.frozenFacts) {
      if (!isRecord(fact) || !nonEmptyBounded(fact.field, 80) || !nonEmptyBounded(fact.value, 1_000)) {
        reasons.push(`${id} frozen fact must have field <= 80 and value <= 1000`);
        continue;
      }
      requireExactKeys(fact, ["field", "value", "sourceRef"], reasons, `${id} frozen fact`);
      if (fields.has(fact.field)) reasons.push(`${id} frozen fact field duplicated: ${fact.field}`);
      fields.add(fact.field);
      if (!nonEmptyBounded(fact.sourceRef, 200)) reasons.push(`${id} frozen fact sourceRef must be <= 200 chars`);
    }
  }

  if (!isRecord(value.ruleIdentity)
    || !nonEmptyBounded(value.ruleIdentity.profileId, 100)
    || !nonEmptyBounded(value.ruleIdentity.profileVersion, 50)) {
    reasons.push(`${id} ruleIdentity must include non-empty profileId and profileVersion`);
  } else {
    requireExactKeys(
      value.ruleIdentity,
      ["profileId", "profileVersion", "profileDigest"],
      reasons,
      `${id} ruleIdentity`
    );
    if (typeof value.ruleIdentity.profileDigest !== "string"
      || !/^[a-f0-9]{64}$/u.test(value.ruleIdentity.profileDigest)) {
      reasons.push(`${id} ruleIdentity.profileDigest must be lowercase SHA-256`);
    }
  }

  if (!Array.isArray(value.engineeringEvidenceRefs)
    || value.engineeringEvidenceRefs.length < 1
    || value.engineeringEvidenceRefs.length > 20
    || value.engineeringEvidenceRefs.some((ref) => !nonEmptyBounded(ref, 200))
    || new Set(value.engineeringEvidenceRefs).size !== value.engineeringEvidenceRefs.length) {
    reasons.push(`${id} engineeringEvidenceRefs must contain 1..20 unique bounded strings`);
  }

  if (!isRecord(value.engineeringFactReceipt)) {
    reasons.push(`${id} engineeringFactReceipt must be an object`);
  } else {
    requireExactKeys(
      value.engineeringFactReceipt,
      ["registryId", "registryDigest", "receiptId", "receiptDigest", "receiptClass"],
      reasons,
      `${id} engineeringFactReceipt`
    );
  }

  if (bundledReceipt) {
    const expectedReceiptReference = {
      registryId: BUNDLED_ENGINEERING_FACT_REGISTRY.registryId,
      registryDigest: BUNDLED_ENGINEERING_FACT_REGISTRY.registryDigest,
      receiptId: bundledReceipt.receiptId,
      receiptDigest: bundledReceipt.receiptDigest,
      receiptClass: bundledReceipt.receiptClass
    };
    if (stableStringify(value.frozenFacts) !== stableStringify(bundledReceipt.projectedFacts)) {
      reasons.push(`${id} frozenFacts do not match the registry-bound projector output`);
    }
    if (stableStringify(value.ruleIdentity) !== stableStringify(bundledReceipt.ruleIdentity)) {
      reasons.push(`${id} ruleIdentity does not match the registry-bound producer identity`);
    }
    if (stableStringify(value.engineeringEvidenceRefs)
      !== stableStringify(bundledReceipt.engineeringEvidenceRefs)) {
      reasons.push(`${id} engineeringEvidenceRefs do not match the registry-bound receipt`);
    }
    if (stableStringify(value.engineeringFactReceipt) !== stableStringify(expectedReceiptReference)) {
      reasons.push(`${id} engineeringFactReceipt does not match the bundled registry`);
    }
  }

  if (!isRecord(value.boundary)
    || value.boundary.productionEligible !== false
    || value.boundary.expertTruthClaimed !== false
    || value.boundary.successReceiptIssued !== false) {
    reasons.push(`${id} boundary must keep productionEligible/expertTruthClaimed/successReceiptIssued false`);
  } else {
    requireExactKeys(
      value.boundary,
      ["productionEligible", "expertTruthClaimed", "successReceiptIssued"],
      reasons,
      `${id} boundary`
    );
  }
}

const OBSERVATION_ID_PATTERN = /^[a-z][a-z0-9._-]{2,99}$/u;
const UNSAFE_OBSERVATION_TEXT_PATTERN =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const OBSERVATION_BASIS_TYPES = new Set([
  "frozen_fact",
  "rule_identity",
  "engineering_receipt",
  "declared_concept"
]);

function safeObservationText(value: unknown, maximum: number): value is string {
  return nonEmptyBounded(value, maximum) && !UNSAFE_OBSERVATION_TEXT_PATTERN.test(value);
}

function validateObservationInventory(
  value: unknown,
  reasons: string[],
  summaryBySystem: ReadonlyMap<CrossSystemId, Record<string, unknown>>
): void {
  if (!isRecord(value)) {
    reasons.push("observations must be an object");
    return;
  }
  requireExactKeys(value, CROSS_SYSTEM_OBSERVATION_PARTITIONS, reasons, "observations");
  const observationIds = new Set<string>();
  let totalObservations = 0;

  for (const partition of CROSS_SYSTEM_OBSERVATION_PARTITIONS) {
    const entries = value[partition];
    if (!Array.isArray(entries) || entries.length > 25) {
      reasons.push(`${partition} must be an array with at most 25 observations`);
      continue;
    }
    totalObservations += entries.length;
    for (const [index, entry] of entries.entries()) {
      const label = `${partition}[${index}]`;
      if (!isRecord(entry)) {
        reasons.push(`${label} must be an object`);
        continue;
      }
      requireExactKeys(
        entry,
        [
          "observationId",
          "title",
          "systemIds",
          "basisRefs",
          "note",
          "entryMode",
          "assessmentState",
          "conceptEquivalenceClaimed",
          "expertTruthClaimed",
          "modelArbitrationUsed"
        ],
        reasons,
        label
      );

      if (typeof entry.observationId !== "string"
        || !OBSERVATION_ID_PATTERN.test(entry.observationId)
        || observationIds.has(entry.observationId)) {
        reasons.push(`${label} observationId is invalid or duplicated`);
      } else {
        observationIds.add(entry.observationId);
      }
      if (!safeObservationText(entry.title, 120)) reasons.push(`${label} title is invalid`);
      if (!safeObservationText(entry.note, 1_000)) reasons.push(`${label} note is invalid`);
      if (entry.entryMode !== "manual_explicit_entry_unverified"
        || entry.assessmentState !== "unreviewed_observation"
        || entry.conceptEquivalenceClaimed !== false
        || entry.expertTruthClaimed !== false
        || entry.modelArbitrationUsed !== false) {
        reasons.push(`${label} must remain an unreviewed manual observation with no equivalence, expert truth or model arbitration claim`);
      }

      const minimumSystems = partition === "unresolvedQuestions" ? 1 : 2;
      const listedSystems = Array.isArray(entry.systemIds) ? entry.systemIds : [];
      if (listedSystems.length < minimumSystems
        || listedSystems.length > CROSS_SYSTEM_IDS.length
        || new Set(listedSystems).size !== listedSystems.length
        || listedSystems.some((systemId) => (
          typeof systemId !== "string"
          || !CROSS_SYSTEM_IDS.includes(systemId as CrossSystemId)
          || !summaryBySystem.has(systemId as CrossSystemId)
        ))) {
        reasons.push(`${label} systemIds must reference ${minimumSystems}..3 unique included systems`);
      } else {
        const expectedOrder = [...listedSystems]
          .sort((left, right) => CROSS_SYSTEM_IDS.indexOf(left as CrossSystemId)
            - CROSS_SYSTEM_IDS.indexOf(right as CrossSystemId));
        if (expectedOrder.some((systemId, position) => systemId !== listedSystems[position])) {
          reasons.push(`${label} systemIds must follow canonical system order`);
        }
      }

      const bases = Array.isArray(entry.basisRefs) ? entry.basisRefs : [];
      if (bases.length < 1 || bases.length > 20) {
        reasons.push(`${label} basisRefs must contain 1..20 explicit references`);
        continue;
      }
      const basisKeys = new Set<string>();
      const basisSystems = new Set<CrossSystemId>();
      for (const [basisIndex, basis] of bases.entries()) {
        const basisLabel = `${label}.basisRefs[${basisIndex}]`;
        if (!isRecord(basis)) {
          reasons.push(`${basisLabel} must be an object`);
          continue;
        }
        requireExactKeys(basis, ["systemId", "basisType", "reference"], reasons, basisLabel);
        if (typeof basis.systemId !== "string"
          || !CROSS_SYSTEM_IDS.includes(basis.systemId as CrossSystemId)
          || !listedSystems.includes(basis.systemId)) {
          reasons.push(`${basisLabel} systemId must be listed by its observation`);
          continue;
        }
        const systemId = basis.systemId as CrossSystemId;
        basisSystems.add(systemId);
        if (typeof basis.basisType !== "string" || !OBSERVATION_BASIS_TYPES.has(basis.basisType)) {
          reasons.push(`${basisLabel} basisType is invalid`);
          continue;
        }
        if (!safeObservationText(basis.reference, 200)) {
          reasons.push(`${basisLabel} reference is invalid`);
          continue;
        }
        const basisKey = `${systemId}:${basis.basisType}:${basis.reference}`;
        if (basisKeys.has(basisKey)) reasons.push(`${basisLabel} duplicates an earlier basis reference`);
        basisKeys.add(basisKey);

        const summary = summaryBySystem.get(systemId);
        if (!summary) continue;
        if (basis.basisType === "frozen_fact") {
          const facts = Array.isArray(summary.frozenFacts) ? summary.frozenFacts : [];
          if (!facts.some((fact) => isRecord(fact) && fact.field === basis.reference)) {
            reasons.push(`${basisLabel} does not reference an included frozen fact`);
          }
        } else if (basis.basisType === "rule_identity") {
          const ruleIdentity = isRecord(summary.ruleIdentity) ? summary.ruleIdentity : null;
          const expected = ruleIdentity
            ? `${String(ruleIdentity.profileId)}@${String(ruleIdentity.profileVersion)}`
            : null;
          if (basis.reference !== expected) reasons.push(`${basisLabel} does not reference the exact rule identity`);
        } else if (basis.basisType === "engineering_receipt") {
          const receipt = isRecord(summary.engineeringFactReceipt)
            ? summary.engineeringFactReceipt
            : null;
          if (!receipt || basis.reference !== receipt.receiptId) {
            reasons.push(`${basisLabel} does not reference the exact engineering receipt`);
          }
        } else if (partition !== "nonComparableConcepts") {
          reasons.push(`${basisLabel} declared_concept is allowed only for nonComparableConcepts`);
        }
      }
      for (const systemId of listedSystems) {
        if (!basisSystems.has(systemId as CrossSystemId)) {
          reasons.push(`${label} must include at least one basis reference for ${String(systemId)}`);
        }
      }
    }
  }
  if (totalObservations > 100) reasons.push("observations cannot exceed 100 total entries");
}

export async function verifyCrossSystemReadonlyComparisonDraft(
  candidateInput: unknown
): Promise<CrossSystemVerificationResult> {
  const reasons: string[] = [];
  let candidate: unknown;
  try {
    candidate = capturePassiveJsonSnapshot(candidateInput);
  } catch {
    return {
      ok: false,
      reasons: ["comparison input must be a bounded passive JSON value without accessors or aliases"]
    };
  }
  if (!isRecord(candidate)) {
    return { ok: false, reasons: ["comparison must be an object"] };
  }
  requireExactKeys(
    candidate,
    [
      "schemaVersion",
      "envelopeVersion",
      "createdAt",
      "systems",
      "factsFrozen",
      "factEvidenceState",
      "factReceiptRegistry",
      "noScoring",
      "noWeighting",
      "noMajorityVote",
      "noModelArbitration",
      "noAutoPersonMerge",
      "noConceptEquivalenceInference",
      "explicitSubjectLink",
      "observations",
      "contentSha256"
    ],
    reasons,
    "comparison"
  );
  if (candidate.schemaVersion !== CROSS_SYSTEM_COMPARISON_DRAFT_VERSION) {
    reasons.push("schemaVersion mismatch");
  }
  if (candidate.envelopeVersion !== 3) reasons.push("envelopeVersion must be 3");
  if (candidate.factsFrozen !== true) reasons.push("factsFrozen must be true");
  if (candidate.factEvidenceState !== "registry_bound_offline_engineering_replay_not_domain_truth") {
    reasons.push("factEvidenceState must remain registry-bound engineering replay without domain truth");
  }
  const { registryDigest: _bundledDigest, ...unsignedBundledRegistry } =
    BUNDLED_ENGINEERING_FACT_REGISTRY;
  const actualBundledRegistryDigest = await sha256Hex(stableStringify(unsignedBundledRegistry));
  const bundledRegistryShapePinned = bundledRegistryShapeIsPinned();
  const bundledReceiptDigestsValid = bundledRegistryShapePinned
    ? await Promise.all(
      BUNDLED_ENGINEERING_FACT_REGISTRY.systems.map(async (entry) => {
        if (entry.receipt === null) return true;
        const { receiptDigest: _receiptDigest, ...unsignedReceipt } = entry.receipt;
        return entry.receipt.receiptDigest === await sha256Hex(stableStringify(unsignedReceipt))
          && entry.receipt.projectedFactsSha256
            === await sha256Hex(stableStringify(entry.receipt.projectedFacts));
      })
    )
    : [false];
  if (!bundledRegistryShapePinned
    || actualBundledRegistryDigest !== BUNDLED_ENGINEERING_FACT_REGISTRY.registryDigest
    || bundledReceiptDigestsValid.some((valid) => !valid)
    || BUNDLED_ENGINEERING_FACT_REGISTRY.schemaVersion !== "1.0.0"
    || BUNDLED_ENGINEERING_FACT_REGISTRY.recordType
      !== "cross_system_engineering_fact_replay_registry"
    || BUNDLED_ENGINEERING_FACT_REGISTRY.registryStatus !== "fail_closed_partial_two_of_four"
    || BUNDLED_ENGINEERING_FACT_REGISTRY.gateSummary.systemsRequired !== 4
    || BUNDLED_ENGINEERING_FACT_REGISTRY.gateSummary.systemsWithEngineeringReplayReceipt !== 2
    || BUNDLED_ENGINEERING_FACT_REGISTRY.gateSummary.formalCrossSystemComparisonAuthorized !== false) {
    reasons.push("bundled engineering fact receipt registry identity is invalid");
  }
  const expectedRegistryReference = createCrossSystemFactReceiptRegistryReferenceDraft();
  if (!isRecord(candidate.factReceiptRegistry)
    || stableStringify(candidate.factReceiptRegistry) !== stableStringify(expectedRegistryReference)) {
    reasons.push("factReceiptRegistry must exactly bind the bundled fail-closed replay registry");
  } else {
    requireExactKeys(
      candidate.factReceiptRegistry,
      [
        "registryId",
        "registryDigest",
        "trustClass",
        "systemsWithEngineeringReplayReceipt",
        "systemsRequired",
        "formalComparisonAuthorized"
      ],
      reasons,
      "factReceiptRegistry"
    );
  }
  if (candidate.noScoring !== true) reasons.push("noScoring must be true");
  if (candidate.noWeighting !== true) reasons.push("noWeighting must be true");
  if (candidate.noMajorityVote !== true) reasons.push("noMajorityVote must be true");
  if (candidate.noModelArbitration !== true) reasons.push("noModelArbitration must be true");
  if (candidate.noAutoPersonMerge !== true) reasons.push("noAutoPersonMerge must be true");
  if (candidate.noConceptEquivalenceInference !== true) {
    reasons.push("noConceptEquivalenceInference must be true");
  }
  if (typeof candidate.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(candidate.createdAt)) {
    reasons.push("createdAt must be a UTC ISO timestamp");
  }

  if (!Array.isArray(candidate.systems) || candidate.systems.length < 2 || candidate.systems.length > 3) {
    reasons.push("systems must contain 2..3 receipt-bound summaries");
  } else {
    const systemIds = new Set<CrossSystemId>();
    for (const summary of candidate.systems) validateSummary(summary, reasons, systemIds);
    const observedOrder = candidate.systems
      .map((summary) => isRecord(summary) ? summary.systemId : null)
      .filter((systemId): systemId is string => typeof systemId === "string");
    const canonicalOrder = [...observedOrder]
      .sort((left, right) => CROSS_SYSTEM_IDS.indexOf(left as CrossSystemId)
        - CROSS_SYSTEM_IDS.indexOf(right as CrossSystemId));
    if (canonicalOrder.some((systemId, index) => systemId !== observedOrder[index])) {
      reasons.push("systems must follow canonical system order");
    }
  }

  if (candidate.explicitSubjectLink === null) {
    // Explicitly no person link is allowed.
  } else if (!isRecord(candidate.explicitSubjectLink)
    || !safeObservationText(candidate.explicitSubjectLink.label, 80)
    || candidate.explicitSubjectLink.confirmedByUser !== true
    || candidate.explicitSubjectLink.removable !== true) {
    reasons.push("explicitSubjectLink must be null or a user-confirmed removable link with a label");
  } else {
    requireExactKeys(
      candidate.explicitSubjectLink,
      ["label", "confirmedByUser", "removable"],
      reasons,
      "explicitSubjectLink"
    );
  }

  const summaryBySystem = new Map<CrossSystemId, Record<string, unknown>>();
  if (Array.isArray(candidate.systems)) {
    for (const summary of candidate.systems) {
      if (isRecord(summary)
        && typeof summary.systemId === "string"
        && CROSS_SYSTEM_IDS.includes(summary.systemId as CrossSystemId)
        && !summaryBySystem.has(summary.systemId as CrossSystemId)) {
        summaryBySystem.set(summary.systemId as CrossSystemId, summary);
      }
    }
  }
  validateObservationInventory(candidate.observations, reasons, summaryBySystem);

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
  return {
    ok: true,
    value: deepFreezeJson(candidate as unknown as CrossSystemReadonlyComparisonDraft)
  };
}
