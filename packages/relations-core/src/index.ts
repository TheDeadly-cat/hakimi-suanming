import { PILLAR_RELATION_TYPES, type ChartFacts, type PillarRelationType } from "@hakimi/contracts";
import { I18n, LunarUtil } from "lunar-typescript";

export const RELATIONS_CORE_ENGINE = Object.freeze({
  name: "hakimi-relations-core" as const,
  version: "0.1.0" as const,
  upstreamName: "lunar-typescript" as const,
  upstreamVersion: "1.8.6" as const,
  upstreamTagCommit: "0f3e95d15e31f1a7c7b93d624542649347328a20" as const,
  upstreamIntegrity:
    "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA==" as const
});

export const RELATION_OUTPUT_SCHEMA_VERSION = "1.0.0" as const;
export const RELATION_RULE_PROFILE_VERSION = "1.0.0" as const;
export const EMBEDDED_RELATION_TABLE_VERSION = "1.0.0" as const;
const RELATION_FACT_ALGORITHM_VERSION = "v1" as const;

export type RelationType = PillarRelationType;
export type RelationCompleteness = "binary" | "complete_set" | "incomplete_set";
export type RelationVerificationStatus =
  | "upstream_public_constant_audited"
  | "embedded_table_pending_consultant_review";
export type PillarPosition = "year" | "month" | "day" | "hour";

function frozenRelationTypeCopy(): typeof PILLAR_RELATION_TYPES {
  return Object.freeze([...PILLAR_RELATION_TYPES]) as unknown as typeof PILLAR_RELATION_TYPES;
}

const CANONICAL_RELATION_TYPES = frozenRelationTypeCopy();

/** Public enumeration copy. Historical execution uses its own private frozen copy. */
export const RELATION_TYPES = frozenRelationTypeCopy();

export type FourPillarsInput = Readonly<Record<PillarPosition, string>>;
export type RelationsInput = ChartFacts | FourPillarsInput;

export type RelationRuleProfile = {
  schemaVersion: "1.0.0";
  profileId: "p0-03-working-default";
  profileVersion: "1.0.0";
  enabled: Record<RelationType, boolean>;
  stemClashRule: "lunar-util-chong-gan-4-v1" | "disabled";
  incompleteSetPolicy: "emit_two_of_three" | "complete_only";
  punishmentSetRule: "two_triads_plus_zi_mao_and_four_self_branches-v1";
};

const DEFAULT_ENABLED = Object.freeze(
  Object.fromEntries(CANONICAL_RELATION_TYPES.map((type) => [type, true])) as Record<RelationType, boolean>
);

export const DEFAULT_RELATION_RULE_PROFILE: Readonly<RelationRuleProfile> = Object.freeze({
  schemaVersion: "1.0.0",
  profileId: "p0-03-working-default",
  profileVersion: RELATION_RULE_PROFILE_VERSION,
  enabled: DEFAULT_ENABLED,
  stemClashRule: "lunar-util-chong-gan-4-v1",
  incompleteSetPolicy: "emit_two_of_three",
  punishmentSetRule: "two_triads_plus_zi_mao_and_four_self_branches-v1"
});

export type RelationParticipant = {
  position: PillarPosition;
  ganZhi: string;
  component: "stem" | "branch";
  value: string;
};

export type RelationFact = {
  id: string;
  relationType: RelationType;
  ruleId: string;
  completeness: RelationCompleteness;
  participants: RelationParticipant[];
  requiredMembers: string[];
  presentMembers: string[];
  missingMembers: string[];
  algorithmId: string;
  tableVersion: string;
  verificationStatus: RelationVerificationStatus;
  sourceRefs: string[];
  knownGaps: string[];
};

export type RelationsResult = {
  schemaVersion: typeof RELATION_OUTPUT_SCHEMA_VERSION;
  kind: "pillar_relation_facts";
  pillars: FourPillarsInput;
  ruleProfile: RelationRuleProfile;
  facts: RelationFact[];
  manifest: {
    engine: typeof RELATIONS_CORE_ENGINE;
    deterministic: true;
    interpretationIncluded: false;
  };
};

export type RelationsCalculationEngineDescriptor = Readonly<{
  name: string;
  version: string;
  upstreamName: string;
  upstreamVersion: string;
  upstreamTagCommit: string;
  upstreamIntegrity: string;
}>;

export type RelationsExecutorDescriptor = Readonly<{
  outputSchemaVersion: string;
  ruleProfile: Readonly<{
    schemaVersion: string;
    profileId: string;
    profileVersion: string;
  }>;
  embeddedRelationTableVersion: string;
  factAlgorithmVersion: string;
  engine: Readonly<RelationsCalculationEngineDescriptor>;
}>;

export type HistoricalRelationsExecutor = Readonly<{
  executorId: string;
  descriptor: Readonly<RelationsExecutorDescriptor>;
  /** Compatibility alias; descriptor is the lookup identity. */
  engine: Readonly<RelationsCalculationEngineDescriptor>;
  calculatePillarRelations: (
    input: RelationsInput,
    ruleProfile?: RelationRuleProfile
  ) => RelationsResult;
}>;

export type RelationsCoreErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_RULE"
  | "UPSTREAM_TABLE_INVALID"
  | "HISTORICAL_EXECUTOR_UNAVAILABLE"
  | "HISTORICAL_RESULT_MISMATCH";

export class RelationsCoreError extends Error {
  constructor(
    readonly code: RelationsCoreErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "RelationsCoreError";
  }
}

const POSITIONS: readonly PillarPosition[] = ["year", "month", "day", "hour"];
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const STEM_SET = new Set<string>(STEMS);
const BRANCH_SET = new Set<string>(BRANCHES);
const POSITION_ORDER = new Map(POSITIONS.map((position, index) => [position, index]));
const RELATION_ORDER = new Map(CANONICAL_RELATION_TYPES.map((type, index) => [type, index]));

const LUNAR_UTIL_SOURCE =
  "https://github.com/6tail/lunar-typescript/blob/0f3e95d15e31f1a7c7b93d624542649347328a20/src/lib/LunarUtil.ts#L809-L814";
const BAZIGO_SOURCE =
  "https://github.com/yale8848/BaziGo/blob/02b21ddb25a6f7a271daf5ca6b1f099cd356baee/SiZhu/hehuachong.go";
const CHINA_TESTING_SOURCE =
  "https://github.com/china-testing/bazi/blob/7150d5b6fba5e563dd0751b957dc990bb84ab6f0/ganzhi.py#L182-L282";

type PillarValue = {
  position: PillarPosition;
  ganZhi: string;
  stem: string;
  branch: string;
};

type PairRule = {
  id: string;
  members: readonly [string, string];
};

type SetRule = {
  id: string;
  members: readonly [string, string, string];
};

type RelationMetadata = Pick<
  RelationFact,
  "tableVersion" | "verificationStatus" | "sourceRefs" | "knownGaps"
>;

const UPSTREAM_METADATA = (tableName: string): RelationMetadata => ({
  tableVersion: `${RELATIONS_CORE_ENGINE.upstreamName}@${RELATIONS_CORE_ENGINE.upstreamVersion}:LunarUtil.${tableName}`,
  verificationStatus: "upstream_public_constant_audited",
  sourceRefs: [LUNAR_UTIL_SOURCE],
  knownGaps: []
});

const EMBEDDED_METADATA: RelationMetadata = {
  tableVersion: `hakimi-relations-core:embedded-tables@${EMBEDDED_RELATION_TABLE_VERSION}`,
  verificationStatus: "embedded_table_pending_consultant_review",
  sourceRefs: [
    "@hakimi/relations-core:embedded-traditional-relations:v1",
    BAZIGO_SOURCE,
    CHINA_TESTING_SOURCE
  ],
  knownGaps: [
    "lunar-typescript 1.8.6 does not expose this generic four-pillar relation table; the embedded mapping awaits table-by-table consultant verification."
  ]
};

const THREE_MEMBER_GAP =
  "An incomplete fact records two present members and one missing member only; it does not assert a completed three-member set.";
const PUNISHMENT_GAP =
  "The profile reports two configured three-member sets, the Zi-Mao binary pair, and four duplicate-branch self pairs; directional pair variants are not emitted.";
const BREAK_GAP =
  "Open-source implementations differ on the Yin-Hai and Si-Shen break pairs; this six-pair table remains pending consultant verification.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function translateUpstreamToken(value: string): string {
  const match = /^\{([^}]+)\}$/.exec(value);
  return match ? I18n.getMessage(match[1]) : value;
}

function copyAndAuditPartnerTable(
  tableName: "HE_GAN_5" | "CHONG_GAN_4" | "HE_ZHI_6" | "CHONG",
  source: readonly string[],
  domain: readonly string[],
  allowEmpty = false
): PairRule[] {
  if (source.length !== domain.length) {
    throw new RelationsCoreError(
      "UPSTREAM_TABLE_INVALID",
      `${tableName} length ${source.length} does not match domain length ${domain.length}.`
    );
  }

  const normalized = source.map(translateUpstreamToken);
  const domainSet = new Set(domain);
  const unique = new Map<string, PairRule>();
  normalized.forEach((partner, index) => {
    if (partner === "" && allowEmpty) return;
    if (!domainSet.has(partner)) {
      throw new RelationsCoreError(
        "UPSTREAM_TABLE_INVALID",
        `${tableName}[${index}] contains an unsupported partner token.`
      );
    }
    const sourceMember = domain[index];
    const reverseIndex = domain.indexOf(partner);
    if (reverseIndex < 0 || normalized[reverseIndex] !== sourceMember) {
      throw new RelationsCoreError("UPSTREAM_TABLE_INVALID", `${tableName} is not symmetric.`);
    }
    const members = [sourceMember, partner].sort(
      (left, right) => domain.indexOf(left) - domain.indexOf(right)
    ) as [string, string];
    const key = members.join("");
    unique.set(key, { id: `${tableName.toLowerCase()}:${key}`, members });
  });
  return [...unique.values()].sort(
    (left, right) => domain.indexOf(left.members[0]) - domain.indexOf(right.members[0])
  );
}

function auditChineseDomain(): void {
  const upstreamStems = LunarUtil.GAN.slice(1);
  const upstreamBranches = LunarUtil.ZHI.slice(1);
  if (upstreamStems.join("") !== STEMS.join("") || upstreamBranches.join("") !== BRANCHES.join("")) {
    throw new RelationsCoreError(
      "UPSTREAM_TABLE_INVALID",
      "lunar-typescript must be in its Simplified Chinese domain for relations-core."
    );
  }
}

auditChineseDomain();

const STEM_COMBINATION_RULES = copyAndAuditPartnerTable(
  "HE_GAN_5",
  [...LunarUtil.HE_GAN_5],
  STEMS
);
const STEM_CLASH_RULES = copyAndAuditPartnerTable(
  "CHONG_GAN_4",
  [...LunarUtil.CHONG_GAN_4],
  STEMS,
  true
);
const BRANCH_COMBINATION_RULES = copyAndAuditPartnerTable(
  "HE_ZHI_6",
  [...LunarUtil.HE_ZHI_6],
  BRANCHES
);
const BRANCH_CLASH_RULES = copyAndAuditPartnerTable("CHONG", [...LunarUtil.CHONG], BRANCHES);

const THREE_HARMONY_RULES: readonly SetRule[] = [
  { id: "three-harmony:shen-zi-chen", members: ["申", "子", "辰"] },
  { id: "three-harmony:hai-mao-wei", members: ["亥", "卯", "未"] },
  { id: "three-harmony:yin-wu-xu", members: ["寅", "午", "戌"] },
  { id: "three-harmony:si-you-chou", members: ["巳", "酉", "丑"] }
];

const THREE_MEETING_RULES: readonly SetRule[] = [
  { id: "three-meeting:hai-zi-chou", members: ["亥", "子", "丑"] },
  { id: "three-meeting:yin-mao-chen", members: ["寅", "卯", "辰"] },
  { id: "three-meeting:si-wu-wei", members: ["巳", "午", "未"] },
  { id: "three-meeting:shen-you-xu", members: ["申", "酉", "戌"] }
];

const THREE_PUNISHMENT_RULES: readonly SetRule[] = [
  { id: "three-punishment:yin-si-shen", members: ["寅", "巳", "申"] },
  { id: "three-punishment:chou-wei-xu", members: ["丑", "未", "戌"] }
];

const BINARY_PUNISHMENT_RULES: readonly PairRule[] = [
  { id: "binary-punishment:zi-mao", members: ["子", "卯"] }
];

const SELF_PUNISHMENT_BRANCHES = ["辰", "午", "酉", "亥"] as const;

const BRANCH_HARM_RULES: readonly PairRule[] = [
  { id: "six-harm:zi-wei", members: ["子", "未"] },
  { id: "six-harm:chou-wu", members: ["丑", "午"] },
  { id: "six-harm:yin-si", members: ["寅", "巳"] },
  { id: "six-harm:mao-chen", members: ["卯", "辰"] },
  { id: "six-harm:shen-hai", members: ["申", "亥"] },
  { id: "six-harm:you-xu", members: ["酉", "戌"] }
];

const BRANCH_BREAK_RULES: readonly PairRule[] = [
  { id: "six-break:zi-you", members: ["子", "酉"] },
  { id: "six-break:chou-chen", members: ["丑", "辰"] },
  { id: "six-break:yin-hai", members: ["寅", "亥"] },
  { id: "six-break:mao-wu", members: ["卯", "午"] },
  { id: "six-break:si-shen", members: ["巳", "申"] },
  { id: "six-break:wei-xu", members: ["未", "戌"] }
];

function assertExactKeys(record: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new RelationsCoreError("UNSUPPORTED_RULE", `${label} contains unknown or missing fields.`);
  }
}

function validateRuleProfile(value: unknown): RelationRuleProfile {
  if (!isRecord(value)) {
    throw new RelationsCoreError("UNSUPPORTED_RULE", "Relation rule profile must be an object.");
  }
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "profileId",
      "profileVersion",
      "enabled",
      "stemClashRule",
      "incompleteSetPolicy",
      "punishmentSetRule"
    ],
    "Relation rule profile"
  );
  if (
    value.schemaVersion !== "1.0.0" ||
    value.profileId !== "p0-03-working-default" ||
    value.profileVersion !== "1.0.0" ||
    !isRecord(value.enabled) ||
    !["lunar-util-chong-gan-4-v1", "disabled"].includes(value.stemClashRule as string) ||
    !["emit_two_of_three", "complete_only"].includes(value.incompleteSetPolicy as string) ||
    value.punishmentSetRule !== "two_triads_plus_zi_mao_and_four_self_branches-v1"
  ) {
    throw new RelationsCoreError("UNSUPPORTED_RULE", "Relation rule profile selects an unknown rule.");
  }
  assertExactKeys(value.enabled, CANONICAL_RELATION_TYPES, "enabled");
  for (const type of CANONICAL_RELATION_TYPES) {
    if (typeof value.enabled[type] !== "boolean") {
      throw new RelationsCoreError("UNSUPPORTED_RULE", `enabled.${type} must be boolean.`);
    }
  }
  return structuredClone(value) as RelationRuleProfile;
}

function extractPillars(input: unknown): PillarValue[] {
  if (!isRecord(input)) {
    throw new RelationsCoreError("INVALID_INPUT", "Relations input must be an object.");
  }
  const source = isRecord(input.pillars) ? input.pillars : input;
  return POSITIONS.map((position) => {
    const raw = source[position];
    const ganZhi = typeof raw === "string" ? raw : isRecord(raw) ? raw.ganZhi : undefined;
    if (typeof ganZhi !== "string" || [...ganZhi].length !== 2) {
      throw new RelationsCoreError("INVALID_INPUT", `${position} pillar must contain a two-character ganZhi.`);
    }
    const [stem, branch] = [...ganZhi];
    if (!STEM_SET.has(stem) || !BRANCH_SET.has(branch) || LunarUtil.getJiaZiIndex(ganZhi) < 0) {
      throw new RelationsCoreError("INVALID_INPUT", `${position} pillar ${ganZhi} is not a valid JiaZi.`);
    }
    if (isRecord(raw)) {
      if (raw.stem !== undefined && raw.stem !== stem) {
        throw new RelationsCoreError("INVALID_INPUT", `${position} pillar stem conflicts with ganZhi.`);
      }
      if (raw.branch !== undefined && raw.branch !== branch) {
        throw new RelationsCoreError("INVALID_INPUT", `${position} pillar branch conflicts with ganZhi.`);
      }
    }
    return { position, ganZhi, stem, branch };
  });
}

function participant(pillar: PillarValue, component: "stem" | "branch"): RelationParticipant {
  return {
    position: pillar.position,
    ganZhi: pillar.ganZhi,
    component,
    value: pillar[component]
  };
}

function factId(
  type: RelationType,
  completeness: RelationCompleteness,
  ruleId: string,
  participants: readonly RelationParticipant[]
): string {
  return `${type}|${completeness}|${ruleId}|${participants
    .map((item) => `${item.position}:${item.value}`)
    .join("|")}`;
}

function relationFactAlgorithmId(
  relationType: RelationType,
  completeness: RelationCompleteness,
  version: string
): string {
  return `${RELATIONS_CORE_ENGINE.name}:${relationType}:${
    completeness === "binary" ? "position-pair-scan" : "required-set-presence"
  }:${version}`;
}

function makeFact(
  relationType: RelationType,
  ruleId: string,
  completeness: RelationCompleteness,
  participants: RelationParticipant[],
  requiredMembers: readonly string[],
  presentMembers: string[],
  missingMembers: string[],
  metadata: RelationMetadata,
  extraGaps: readonly string[] = []
): RelationFact {
  return {
    id: factId(relationType, completeness, ruleId, participants),
    relationType,
    ruleId,
    completeness,
    participants,
    requiredMembers: [...requiredMembers],
    presentMembers,
    missingMembers,
    algorithmId: relationFactAlgorithmId(
      relationType,
      completeness,
      RELATION_FACT_ALGORITHM_VERSION
    ),
    tableVersion: metadata.tableVersion,
    verificationStatus: metadata.verificationStatus,
    sourceRefs: [...metadata.sourceRefs],
    knownGaps: [...metadata.knownGaps, ...extraGaps]
  };
}

function scanPairs(
  pillars: readonly PillarValue[],
  relationType: RelationType,
  component: "stem" | "branch",
  rules: readonly PairRule[],
  metadata: RelationMetadata,
  extraGaps: readonly string[] = []
): RelationFact[] {
  const byKey = new Map(rules.map((rule) => [[...rule.members].sort().join("|"), rule]));
  const facts: RelationFact[] = [];
  for (let left = 0; left < pillars.length; left += 1) {
    for (let right = left + 1; right < pillars.length; right += 1) {
      const key = [pillars[left][component], pillars[right][component]].sort().join("|");
      const rule = byKey.get(key);
      if (!rule) continue;
      const participants = [participant(pillars[left], component), participant(pillars[right], component)];
      facts.push(
        makeFact(
          relationType,
          rule.id,
          "binary",
          participants,
          rule.members,
          participants.map((item) => item.value),
          [],
          metadata,
          extraGaps
        )
      );
    }
  }
  return facts;
}

function scanThreeMemberSets(
  pillars: readonly PillarValue[],
  relationType: RelationType,
  rules: readonly SetRule[],
  profile: RelationRuleProfile,
  extraGaps: readonly string[] = []
): RelationFact[] {
  const facts: RelationFact[] = [];
  for (const rule of rules) {
    const present = rule.members.filter((member) => pillars.some((pillar) => pillar.branch === member));
    if (present.length < 2) continue;
    const complete = present.length === 3;
    if (!complete && profile.incompleteSetPolicy === "complete_only") continue;
    const participants = pillars
      .filter((pillar) => rule.members.includes(pillar.branch))
      .map((pillar) => participant(pillar, "branch"));
    facts.push(
      makeFact(
        relationType,
        rule.id,
        complete ? "complete_set" : "incomplete_set",
        participants,
        rule.members,
        [...present],
        rule.members.filter((member) => !present.includes(member)),
        EMBEDDED_METADATA,
        [THREE_MEMBER_GAP, ...extraGaps]
      )
    );
  }
  return facts;
}

function scanSelfPunishment(pillars: readonly PillarValue[]): RelationFact[] {
  const facts: RelationFact[] = [];
  for (const branch of SELF_PUNISHMENT_BRANCHES) {
    const matching = pillars.filter((pillar) => pillar.branch === branch);
    if (matching.length < 2) continue;
    const participants = matching.map((pillar) => participant(pillar, "branch"));
    facts.push(
      makeFact(
        "branch_self_punishment",
        `self-punishment:${branch}`,
        "binary",
        participants,
        [branch, branch],
        participants.map((item) => item.value),
        [],
        EMBEDDED_METADATA,
        [PUNISHMENT_GAP]
      )
    );
  }
  return facts;
}

function compareFacts(left: RelationFact, right: RelationFact): number {
  const typeOrder = (RELATION_ORDER.get(left.relationType) ?? 0) - (RELATION_ORDER.get(right.relationType) ?? 0);
  if (typeOrder !== 0) return typeOrder;
  const completenessOrder = { binary: 0, complete_set: 1, incomplete_set: 2 } as const;
  const completeness = completenessOrder[left.completeness] - completenessOrder[right.completeness];
  if (completeness !== 0) return completeness;
  const leftPositions = left.participants
    .map((item) => POSITION_ORDER.get(item.position) ?? 0)
    .join("");
  const rightPositions = right.participants
    .map((item) => POSITION_ORDER.get(item.position) ?? 0)
    .join("");
  return leftPositions.localeCompare(rightPositions) || left.ruleId.localeCompare(right.ruleId, "en");
}

function calculatePillarRelationsV0_1_0(
  input: RelationsInput,
  ruleProfile: RelationRuleProfile = DEFAULT_RELATION_RULE_PROFILE
): RelationsResult {
  const profile = validateRuleProfile(ruleProfile);
  const pillars = extractPillars(input);
  const facts: RelationFact[] = [];
  const add = (type: RelationType, values: RelationFact[]): void => {
    if (profile.enabled[type]) facts.push(...values);
  };

  add(
    "stem_five_combination",
    scanPairs(pillars, "stem_five_combination", "stem", STEM_COMBINATION_RULES, UPSTREAM_METADATA("HE_GAN_5"))
  );
  if (profile.stemClashRule !== "disabled") {
    add("stem_clash", scanPairs(pillars, "stem_clash", "stem", STEM_CLASH_RULES, UPSTREAM_METADATA("CHONG_GAN_4"), [
      "lunar-typescript 1.8.6 leaves CHONG_GAN_4 I18n tokens unresolved; relations-core translates the public tokens through I18n.getMessage before auditing and copying the table."
    ]));
  }
  add(
    "branch_six_combination",
    scanPairs(
      pillars,
      "branch_six_combination",
      "branch",
      BRANCH_COMBINATION_RULES,
      UPSTREAM_METADATA("HE_ZHI_6")
    )
  );
  add(
    "branch_six_clash",
    scanPairs(pillars, "branch_six_clash", "branch", BRANCH_CLASH_RULES, UPSTREAM_METADATA("CHONG"))
  );
  add(
    "branch_three_harmony",
    scanThreeMemberSets(pillars, "branch_three_harmony", THREE_HARMONY_RULES, profile)
  );
  add(
    "branch_three_meeting",
    scanThreeMemberSets(pillars, "branch_three_meeting", THREE_MEETING_RULES, profile)
  );
  add(
    "branch_three_punishment",
    scanThreeMemberSets(pillars, "branch_three_punishment", THREE_PUNISHMENT_RULES, profile, [PUNISHMENT_GAP])
  );
  add(
    "branch_binary_punishment",
    scanPairs(
      pillars,
      "branch_binary_punishment",
      "branch",
      BINARY_PUNISHMENT_RULES,
      EMBEDDED_METADATA,
      [PUNISHMENT_GAP]
    )
  );
  add("branch_self_punishment", scanSelfPunishment(pillars));
  add(
    "branch_six_harm",
    scanPairs(pillars, "branch_six_harm", "branch", BRANCH_HARM_RULES, EMBEDDED_METADATA)
  );
  add(
    "branch_six_break",
    scanPairs(pillars, "branch_six_break", "branch", BRANCH_BREAK_RULES, EMBEDDED_METADATA, [BREAK_GAP])
  );

  const uniqueFacts = [...new Map(facts.map((fact) => [fact.id, fact])).values()].sort(compareFacts);
  const pillarRecord = Object.fromEntries(pillars.map((pillar) => [pillar.position, pillar.ganZhi])) as Record<
    PillarPosition,
    string
  >;
  return {
    schemaVersion: RELATION_OUTPUT_SCHEMA_VERSION,
    kind: "pillar_relation_facts",
    pillars: pillarRecord,
    ruleProfile: profile,
    facts: uniqueFacts,
    manifest: {
      engine: RELATIONS_CORE_ENGINE,
      deterministic: true,
      interpretationIncluded: false
    }
  };
}

/**
 * Current public entry point. Keeping this wrapper separate from the frozen
 * 0.1.0 executor lets future engines evolve without rewriting historical
 * read-only replay behavior.
 */
export function calculatePillarRelations(
  input: RelationsInput,
  ruleProfile: RelationRuleProfile = DEFAULT_RELATION_RULE_PROFILE
): RelationsResult {
  return calculatePillarRelationsV0_1_0(input, ruleProfile);
}

const RELATIONS_ENGINE_DESCRIPTOR_KEYS = Object.freeze([
  "name",
  "version",
  "upstreamName",
  "upstreamVersion",
  "upstreamTagCommit",
  "upstreamIntegrity"
] as const);

const RELATIONS_EXECUTOR_DESCRIPTOR_KEYS = Object.freeze([
  "outputSchemaVersion",
  "ruleProfile",
  "embeddedRelationTableVersion",
  "factAlgorithmVersion",
  "engine"
] as const);

const RELATIONS_RULE_PROFILE_DESCRIPTOR_KEYS = Object.freeze([
  "schemaVersion",
  "profileId",
  "profileVersion"
] as const);

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function parseCompleteRelationsEngineDescriptor(
  rawEngine: unknown
): RelationsCalculationEngineDescriptor | null {
  if (!isRecord(rawEngine)) return null;
  const actualKeys = Object.keys(rawEngine).sort();
  const expectedKeys = [...RELATIONS_ENGINE_DESCRIPTOR_KEYS].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return null;
  }
  for (const key of RELATIONS_ENGINE_DESCRIPTOR_KEYS) {
    if (typeof rawEngine[key] !== "string") return null;
  }
  return {
    name: rawEngine.name as string,
    version: rawEngine.version as string,
    upstreamName: rawEngine.upstreamName as string,
    upstreamVersion: rawEngine.upstreamVersion as string,
    upstreamTagCommit: rawEngine.upstreamTagCommit as string,
    upstreamIntegrity: rawEngine.upstreamIntegrity as string
  };
}

function sameRelationsEngineDescriptor(
  left: RelationsCalculationEngineDescriptor,
  right: RelationsCalculationEngineDescriptor
): boolean {
  return left.name === right.name &&
    left.version === right.version &&
    left.upstreamName === right.upstreamName &&
    left.upstreamVersion === right.upstreamVersion &&
    left.upstreamTagCommit === right.upstreamTagCommit &&
    left.upstreamIntegrity === right.upstreamIntegrity;
}

/** Complete identity for the published relations-core 0.1.0 executor. */
export const RELATIONS_EXECUTOR_DESCRIPTOR: Readonly<RelationsExecutorDescriptor> = Object.freeze({
  outputSchemaVersion: RELATION_OUTPUT_SCHEMA_VERSION,
  ruleProfile: Object.freeze({
    schemaVersion: DEFAULT_RELATION_RULE_PROFILE.schemaVersion,
    profileId: DEFAULT_RELATION_RULE_PROFILE.profileId,
    profileVersion: DEFAULT_RELATION_RULE_PROFILE.profileVersion
  }),
  embeddedRelationTableVersion: EMBEDDED_RELATION_TABLE_VERSION,
  factAlgorithmVersion: RELATION_FACT_ALGORITHM_VERSION,
  engine: Object.freeze({ ...RELATIONS_CORE_ENGINE })
});

const UPSTREAM_TABLE_NAME_BY_RELATION: Readonly<Partial<Record<RelationType, string>>> = Object.freeze({
  stem_five_combination: "HE_GAN_5",
  stem_clash: "CHONG_GAN_4",
  branch_six_combination: "HE_ZHI_6",
  branch_six_clash: "CHONG"
});

function historicalResultMismatch(message: string): never {
  throw new RelationsCoreError(
    "HISTORICAL_RESULT_MISMATCH",
    `历史关系执行结果不属于所选执行器：${message}`
  );
}

function assertHistoricalResultMatchesDescriptor(
  result: RelationsResult,
  descriptor: RelationsExecutorDescriptor
): void {
  if (result.schemaVersion !== descriptor.outputSchemaVersion) {
    historicalResultMismatch("输出 schemaVersion 不匹配。");
  }
  const resultEngine = parseCompleteRelationsEngineDescriptor(result.manifest.engine);
  if (!resultEngine || !sameRelationsEngineDescriptor(resultEngine, descriptor.engine)) {
    historicalResultMismatch("manifest.engine 不匹配。");
  }
  if (!result.manifest.deterministic || result.manifest.interpretationIncluded) {
    historicalResultMismatch("manifest 的确定性或解释边界不匹配。");
  }
  if (
    result.ruleProfile.schemaVersion !== descriptor.ruleProfile.schemaVersion ||
    result.ruleProfile.profileId !== descriptor.ruleProfile.profileId ||
    result.ruleProfile.profileVersion !== descriptor.ruleProfile.profileVersion
  ) {
    historicalResultMismatch("规则 profile schema、ID 或版本不匹配。");
  }

  for (const fact of result.facts) {
    if (!(CANONICAL_RELATION_TYPES as readonly string[]).includes(fact.relationType)) {
      historicalResultMismatch(`事实 ${fact.id} 使用未知关系类型。`);
    }
    const expectedAlgorithmId = relationFactAlgorithmId(
      fact.relationType,
      fact.completeness,
      descriptor.factAlgorithmVersion
    );
    if (fact.algorithmId !== expectedAlgorithmId) {
      historicalResultMismatch(`事实 ${fact.id} 的 algorithmId 不匹配。`);
    }

    const upstreamTableName = UPSTREAM_TABLE_NAME_BY_RELATION[fact.relationType];
    if (upstreamTableName) {
      const expectedTableVersion =
        `${descriptor.engine.upstreamName}@${descriptor.engine.upstreamVersion}:LunarUtil.${upstreamTableName}`;
      if (
        fact.verificationStatus !== "upstream_public_constant_audited" ||
        fact.tableVersion !== expectedTableVersion
      ) {
        historicalResultMismatch(`事实 ${fact.id} 不属于锁定的上游表。`);
      }
      continue;
    }

    const expectedTableVersion =
      `${descriptor.engine.name}:embedded-tables@${descriptor.embeddedRelationTableVersion}`;
    if (
      fact.verificationStatus !== "embedded_table_pending_consultant_review" ||
      fact.tableVersion !== expectedTableVersion
    ) {
      historicalResultMismatch(`事实 ${fact.id} 不属于锁定的内嵌表。`);
    }
  }
}

function replayPillarRelationsWithExecutor0_1_0(
  input: RelationsInput,
  ruleProfile: RelationRuleProfile = DEFAULT_RELATION_RULE_PROFILE
): RelationsResult {
  const result = calculatePillarRelationsV0_1_0(input, ruleProfile);
  assertHistoricalResultMatchesDescriptor(result, RELATIONS_EXECUTOR_DESCRIPTOR);
  return result;
}

/**
 * Append-only executor registry for read-only relation replay. Published
 * entries must never be changed or removed; a changed implementation requires
 * a new entry and a new complete composite descriptor.
 */
export const HISTORICAL_RELATIONS_EXECUTOR_REGISTRY: readonly HistoricalRelationsExecutor[] =
  Object.freeze([
    Object.freeze({
      executorId: "hakimi-relations-core:pillar-relations-executor:0.1.0",
      descriptor: RELATIONS_EXECUTOR_DESCRIPTOR,
      engine: RELATIONS_EXECUTOR_DESCRIPTOR.engine,
      calculatePillarRelations: replayPillarRelationsWithExecutor0_1_0
    })
  ]);

function parseCompleteRelationsExecutorDescriptor(
  rawDescriptor: unknown
): RelationsExecutorDescriptor | null {
  if (
    !isRecord(rawDescriptor) ||
    !hasExactKeys(rawDescriptor, RELATIONS_EXECUTOR_DESCRIPTOR_KEYS) ||
    !isRecord(rawDescriptor.ruleProfile) ||
    !hasExactKeys(rawDescriptor.ruleProfile, RELATIONS_RULE_PROFILE_DESCRIPTOR_KEYS)
  ) {
    return null;
  }
  const engine = parseCompleteRelationsEngineDescriptor(rawDescriptor.engine);
  if (!engine) return null;
  if (
    typeof rawDescriptor.outputSchemaVersion !== "string" ||
    typeof rawDescriptor.ruleProfile.schemaVersion !== "string" ||
    typeof rawDescriptor.ruleProfile.profileId !== "string" ||
    typeof rawDescriptor.ruleProfile.profileVersion !== "string" ||
    typeof rawDescriptor.embeddedRelationTableVersion !== "string" ||
    typeof rawDescriptor.factAlgorithmVersion !== "string"
  ) {
    return null;
  }
  return {
    outputSchemaVersion: rawDescriptor.outputSchemaVersion,
    ruleProfile: {
      schemaVersion: rawDescriptor.ruleProfile.schemaVersion,
      profileId: rawDescriptor.ruleProfile.profileId,
      profileVersion: rawDescriptor.ruleProfile.profileVersion
    },
    embeddedRelationTableVersion: rawDescriptor.embeddedRelationTableVersion,
    factAlgorithmVersion: rawDescriptor.factAlgorithmVersion,
    engine
  };
}

function sameRelationsExecutorDescriptor(
  left: RelationsExecutorDescriptor,
  right: RelationsExecutorDescriptor
): boolean {
  return left.outputSchemaVersion === right.outputSchemaVersion &&
    left.ruleProfile.schemaVersion === right.ruleProfile.schemaVersion &&
    left.ruleProfile.profileId === right.ruleProfile.profileId &&
    left.ruleProfile.profileVersion === right.ruleProfile.profileVersion &&
    left.embeddedRelationTableVersion === right.embeddedRelationTableVersion &&
    left.factAlgorithmVersion === right.factAlgorithmVersion &&
    sameRelationsEngineDescriptor(left.engine, right.engine);
}

/** Exact complete-descriptor lookup. Version-only matching and fallback are forbidden. */
export function lookupHistoricalRelationsExecutor(
  rawDescriptor: unknown
): HistoricalRelationsExecutor | null {
  const descriptor = parseCompleteRelationsExecutorDescriptor(rawDescriptor);
  if (!descriptor) return null;
  return HISTORICAL_RELATIONS_EXECUTOR_REGISTRY.find((entry) =>
    sameRelationsExecutorDescriptor(descriptor, entry.descriptor)
  ) ?? null;
}

/** Fail-closed form for callers that must replay stored relation facts. */
export function requireHistoricalRelationsExecutor(
  rawDescriptor: unknown
): HistoricalRelationsExecutor {
  const executor = lookupHistoricalRelationsExecutor(rawDescriptor);
  if (executor) return executor;
  throw new RelationsCoreError(
    "HISTORICAL_EXECUTOR_UNAVAILABLE",
    "未找到与完整关系执行器描述符精确匹配的历史执行器；只读复演已拒绝，且不会回退到当前版本。"
  );
}
