import { createHash } from "node:crypto";
import { open, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  readZiweiHkoCalendarSourceEvidence,
  verifyZiweiHkoCalendarSourceEvidence
} from "./ziwei-hko-calendar-source-evidence-lib.mjs";

const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BASIS_ARTIFACT_BYTES = 5_000_000;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const ZIWEI_HKO_CALENDAR_SUBJECT_ID =
  "ziwei.engineering.official-calendar-differential";
const ZIWEI_HKO_CALENDAR_CANDIDATE_ID =
  "hakimi.ziwei.source-candidate/hko-calendar-boundary-replay-2023-2028/1.0.0";
const ZIWEI_HKO_CALENDAR_EVIDENCE_PATH =
  "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json";

function subject(subjectId, category, title, evidenceMode, reviewTrack, basisAnchors) {
  return Object.freeze({
    subjectId,
    category,
    title,
    evidenceMode,
    reviewTrack,
    basisAnchors: Object.freeze([...basisAnchors])
  });
}

function definition(input) {
  return Object.freeze({
    ...input,
    basisArtifactPaths: Object.freeze([...input.basisArtifactPaths]),
    candidateEvidence: input.candidateEvidence
      ? Object.freeze({ ...input.candidateEvidence })
      : null,
    subjects: Object.freeze(input.subjects.map((entry) => Object.freeze(entry)))
  });
}

const ZIWEI_SUBJECTS = [
  subject("ziwei.engineering.canonical-digest-and-receipt", "engineering_identity", "canonical JSON、四层摘要与计算回执语义", "locked_engineering_artifact", "engineering_reproducibility_review_required", ["contract canonical digest", "receipt boundary"]),
  subject("ziwei.engineering.fortel-differential-semantics", "engineering_identity", "Fortel 差分字段同义性、不可比项与独立性边界", "locked_engineering_artifact", "engineering_reproducibility_review_required", ["source layering", "fixture evidence gate"]),
  subject("ziwei.engineering.iztro-version-config-and-worker", "engineering_identity", "iztro 精确版本、完整配置、依赖闭包与 fresh Worker 行为", "locked_engineering_artifact", "engineering_reproducibility_review_required", ["frozen decisions", "license and material rights"]),
  subject("ziwei.engineering.official-calendar-differential", "engineering_identity", "官方公农历与节气差分的范围、版本和边界", "official_technical_artifact", "engineering_reproducibility_review_required", ["source layering", "fixture evidence gate"]),
  subject("ziwei.input.calendar-mode-and-leap-month", "input_semantics", "公历、农历与闰月输入语义", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "frozen decisions"]),
  subject("ziwei.input.civil-time-zone-dst-and-location", "input_semantics", "民用时间、IANA 时区、DST 与地点审计语义", "official_technical_artifact", "two_independent_domain_reviews_required", ["frozen decisions"]),
  subject("ziwei.input.early-late-zi-hour-boundaries", "input_semantics", "早子、晚子、十二时辰与半开时间边界", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions"]),
  subject("ziwei.input.sex-for-calculation-semantics", "input_semantics", "排盘用性别参数与身份信息的隔离语义", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions"]),
  subject("ziwei.input.solar-time-policy", "input_semantics", "真太阳时、坐标与时辰推导策略", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions"]),
  subject("ziwei.interpretation.palace-star-transformation-synthesis", "interpretation", "宫位、星曜、四化与三方四正的解释及合成边界", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "next gate"]),
  subject("ziwei.policy.high-risk-expression-boundary", "high_risk_policy", "健康、法律、财务、生死与灾祸等高风险表达边界", "project_policy", "two_independent_domain_reviews_and_conservative_policy_required", ["fixture evidence gate", "next gate"]),
  subject("ziwei.rights.engine-code-and-dependency-notices", "rights_dependency", "iztro、Fortel 及完整依赖闭包的代码许可与通知义务", "rights_evidence", "independent_rights_review_required", ["license and material rights"]),
  subject("ziwei.rights.rule-text-and-interpretation-material", "rights_dependency", "古籍、现代规则书、解释文字和数据编排的作品/版本/载体权利", "rights_evidence", "independent_rights_review_required", ["license and material rights"]),
  subject("ziwei.rules.auxiliary-minor-star-inclusion", "rule_semantics", "辅星、杂曜、煞曜的收录范围与安置规则", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "frozen decisions"]),
  subject("ziwei.rules.brightness-table", "rule_semantics", "20×12 星曜亮度表、缺失值与流派版本", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions"]),
  subject("ziwei.rules.direction-and-major-periods", "rule_semantics", "阴阳性别顺逆、大限起点、十年区间与宫位映射", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "frozen decisions"]),
  subject("ziwei.rules.five-elements-bureau", "rule_semantics", "五行局确定与大限虚岁起点", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "frozen decisions"]),
  subject("ziwei.rules.flying-transformation-and-self-transformation", "rule_semantics", "飞星、宫干四化与自化的启用和流派隔离", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions", "next gate"]),
  subject("ziwei.rules.life-and-body-palace", "rule_semantics", "命宫、身宫及命主身主算法", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "frozen decisions"]),
  subject("ziwei.rules.natal-star-placement", "rule_semantics", "本命主星与辅星安置算法", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "frozen decisions"]),
  subject("ziwei.rules.opposite-palace-borrowing", "rule_semantics", "借对宫规则、触发条件与解释范围", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions", "next gate"]),
  subject("ziwei.rules.sanfang-sizheng-relations", "rule_semantics", "三方四正关系、字段语义与合成限制", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "next gate"]),
  subject("ziwei.rules.star-registry-and-scope", "rule_semantics", "162 项星曜注册表、命名双射与 natal scope", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "frozen decisions"]),
  subject("ziwei.rules.ten-stem-transformations", "rule_semantics", "十天干禄权科忌四化表与定位", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions"]),
  subject("ziwei.rules.transit-layer-policy", "rule_semantics", "本命、大限、流年、流月与流日层级隔离", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "next gate"]),
  subject("ziwei.rules.twelve-palace-order-and-role", "rule_semantics", "十二宫子至亥规范顺序与宫位角色", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions"]),
  subject("ziwei.rules.year-and-day-boundaries", "rule_semantics", "年分界、运限年分界、晚子换日与年龄分界", "domain_text_or_standard", "two_independent_domain_reviews_required", ["frozen decisions"])
];

const WESTERN_SUBJECTS = [
  subject("western.astronomy.aberration-lighttime-and-deflection", "astronomy_semantics", "光行时、像差与太阳引力偏折策略", "official_technical_artifact", "engineering_reproducibility_review_required", ["current scope and fact layering", "must fail closed"]),
  subject("western.astronomy.ephemeris-version-coverage-and-artifacts", "astronomy_semantics", "星历数据集、版本、覆盖区间与工件清单", "official_technical_artifact", "engineering_reproducibility_review_required", ["source layering", "must fail closed"]),
  subject("western.astronomy.geocentric-topocentric-origin", "astronomy_semantics", "地心与地表观测原点及海拔要求", "official_technical_artifact", "engineering_reproducibility_review_required", ["current scope and fact layering", "must fail closed"]),
  subject("western.astronomy.official-horizons-differential", "engineering_identity", "JPL Horizons 官方响应、查询清单与差分容差", "official_technical_artifact", "engineering_reproducibility_review_required", ["JPL Horizons differential", "strict receipt contract"]),
  subject("western.astronomy.precession-nutation-and-ecliptic", "astronomy_semantics", "岁差、章动、黄道与坐标变换方案", "official_technical_artifact", "engineering_reproducibility_review_required", ["source layering", "must fail closed"]),
  subject("western.astronomy.provider-flags-and-no-fallback", "astronomy_semantics", "请求/生效选项、provider flags、warning 与零后备", "locked_engineering_artifact", "engineering_reproducibility_review_required", ["must fail closed", "first isolated UTC diagnostic"]),
  subject("western.astronomy.reference-frame-identity", "astronomy_semantics", "ICRF/J2000 等参考系身份与输出框架", "official_technical_artifact", "engineering_reproducibility_review_required", ["source layering", "must fail closed"]),
  subject("western.astronomy.target-center-identity", "astronomy_semantics", "天体实体中心与系统质心的目标身份", "official_technical_artifact", "engineering_reproducibility_review_required", ["current scope and fact layering", "must fail closed"]),
  subject("western.input.calendar-time-zone-and-dst", "input_semantics", "历法、IANA 时区、DST gap/overlap 与 UTC 转换", "official_technical_artifact", "engineering_reproducibility_review_required", ["current scope and fact layering", "must fail closed"]),
  subject("western.input.coordinates-elevation-and-sign-convention", "input_semantics", "经纬度、海拔与东西经符号规范", "official_technical_artifact", "engineering_reproducibility_review_required", ["must fail closed"]),
  subject("western.input.unknown-time-and-uncertainty", "input_semantics", "未知时辰、时间精度与候选输入策略", "project_policy", "two_independent_domain_reviews_required", ["must fail closed"]),
  subject("western.interpretation.planet-sign-house-aspect", "interpretation", "行星、星座、宫位和相位解释及合成边界", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "next gate"]),
  subject("western.policy.high-risk-expression-boundary", "high_risk_policy", "健康、法律、财务、生死与灾祸等高风险表达边界", "project_policy", "two_independent_domain_reviews_and_conservative_policy_required", ["strict receipt contract", "next gate"]),
  subject("western.rights.engine-code-and-distribution", "rights_dependency", "Astronomy Engine、SOFA、Swiss Ephemeris 候选代码许可和组合分发边界", "rights_evidence", "independent_rights_review_required", ["license gate"]),
  subject("western.rights.ephemeris-time-data-redistribution", "rights_dependency", "JPL/NAIF kernel、IERS、EOP、闰秒和时区数据的再分发条件", "rights_evidence", "independent_rights_review_required", ["license gate"]),
  subject("western.rights.interpretation-assets", "rights_dependency", "占星解释文字、图标、字体和模板的作品/版本/载体权利", "rights_evidence", "independent_rights_review_required", ["license gate", "next gate"]),
  subject("western.rules.applying-and-separating", "rule_semantics", "入相、出相与相对黄经速度算法", "domain_text_or_standard", "two_independent_domain_reviews_required", ["must fail closed", "independent astrology rules"]),
  subject("western.rules.aspect-angles-and-orbs", "rule_semantics", "相位角、orb、优先级与重复消解", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current artifacts", "independent astrology rules"]),
  subject("western.rules.dignity-policy", "rule_semantics", "庙旺落陷等 dignity 表及流派版本", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current scope and fact layering", "next gate"]),
  subject("western.rules.house-systems", "rule_semantics", "Placidus、整宫、等宫、波菲利等宫制定义与失败行为", "domain_text_or_standard", "two_independent_domain_reviews_required", ["independent astrology rules", "must fail closed"]),
  subject("western.rules.node-policy", "rule_semantics", "月交点 true/mean 口径", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current scope and fact layering", "next gate"]),
  subject("western.rules.retrograde-policy", "rule_semantics", "逆行判定、瞬时速度与边界", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current scope and fact layering", "next gate"]),
  subject("western.rules.transit-and-progression", "rule_semantics", "行运、次限及其他推进方法的版本隔离", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current scope and fact layering", "next gate"]),
  subject("western.rules.tropical-sidereal-and-ayanamsa", "rule_semantics", "热带/恒星黄道与 ayanamsa 口径", "domain_text_or_standard", "two_independent_domain_reviews_required", ["current scope and fact layering", "next gate"]),
  subject("western.rules.zodiac-sign-boundaries", "rule_semantics", "黄经到十二星座的规范边界与 0° 回绕", "domain_text_or_standard", "two_independent_domain_reviews_required", ["independent astrology rules"]),
  subject("western.time.tt-tdb-and-deltat", "time_scale", "TT、TDB、DeltaT 与 Julian Day 关系", "official_technical_artifact", "engineering_reproducibility_review_required", ["current artifacts", "must fail closed"]),
  subject("western.time.ut1-and-eop", "time_scale", "UT1、DUT1、EOP 产品和缺失策略", "official_technical_artifact", "engineering_reproducibility_review_required", ["source layering", "must fail closed"]),
  subject("western.time.utc-tai-and-leap-seconds", "time_scale", "UTC、TAI 与闰秒快照", "official_technical_artifact", "engineering_reproducibility_review_required", ["current artifacts", "must fail closed"])
];

export const INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS = Object.freeze([
  definition({
    productSystemId: "ziwei-doushu",
    contractSystemId: "ziwei",
    ledgerPath: "content/system-admission/ziwei-source-binding-requirements.v1.json",
    basisArtifactPaths: [
      "docs/紫微斗数契约草案与来源门-v0.1.md",
      "packages/ziwei-doushu-contracts-draft/src/index.ts",
      "packages/ziwei-iztro-adapter-draft/src/index.ts"
    ],
    candidateEvidence: {
      subjectId: ZIWEI_HKO_CALENDAR_SUBJECT_ID,
      candidateId: ZIWEI_HKO_CALENDAR_CANDIDATE_ID,
      evidencePath: ZIWEI_HKO_CALENDAR_EVIDENCE_PATH
    },
    subjects: ZIWEI_SUBJECTS
  }),
  definition({
    productSystemId: "western-astrology",
    contractSystemId: "western",
    ledgerPath: "content/system-admission/western-source-binding-requirements.v1.json",
    basisArtifactPaths: [
      "docs/西洋星盘契约草案与来源门-v0.1.md",
      "packages/western-astrology-contracts-draft/src/index.ts",
      "packages/western-astronomy-engine-adapter-draft/src/index.ts"
    ],
    candidateEvidence: null,
    subjects: WESTERN_SUBJECTS
  })
]);

export class IndependentSourceRequirementsError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "IndependentSourceRequirementsError";
    this.code = code;
  }
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  throw new IndependentSourceRequirementsError("NON_CANONICAL_JSON", "来源 requirements 只接受有限规范 JSON 值。");
}

export function canonicalStringifyIndependentSourceRequirements(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeIndependentSourceRequirementsDigest(ledger) {
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return createHash("sha256")
    .update(canonicalStringifyIndependentSourceRequirements(unsigned), "utf8")
    .digest("hex");
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new IndependentSourceRequirementsError("UNSAFE_BASIS_PATH", `来源 requirements 路径不安全：${relativePath}`);
  }
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

async function basisArtifactEvidence(workspaceRoot, relativePath) {
  const root = await realpath(path.resolve(workspaceRoot));
  const absolute = safeWorkspaceFile(root, relativePath);
  const actual = await realpath(absolute);
  const relative = path.relative(root, actual);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new IndependentSourceRequirementsError("UNSAFE_BASIS_PATH", `来源 requirements 路径越界：${relativePath}`);
  }
  if (path.normalize(actual).toLowerCase() !== path.normalize(absolute).toLowerCase()) {
    throw new IndependentSourceRequirementsError("UNSAFE_BASIS_PATH", `来源 requirements 依据文件拒绝符号链接：${relativePath}`);
  }
  const handle = await open(actual, "r");
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size <= 0n || before.size > BigInt(MAX_BASIS_ARTIFACT_BYTES)) {
      throw new IndependentSourceRequirementsError("BASIS_ARTIFACT_INVALID", `来源 requirements 依据文件无效：${relativePath}`);
    }
    const buffer = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    const sameEndpoint = before.dev === after.dev
      && before.ino === after.ino
      && before.size === after.size
      && before.mtimeNs === after.mtimeNs
      && before.ctimeNs === after.ctimeNs;
    if (!sameEndpoint || BigInt(buffer.byteLength) !== before.size) {
      throw new IndependentSourceRequirementsError(
        "BASIS_ARTIFACT_CHANGED",
        `来源 requirements 依据文件在读取期间发生变化：${relativePath}`
      );
    }
    return Object.freeze({
      path: relativePath,
      bytes: buffer.byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex")
    });
  } finally {
    await handle.close();
  }
}

function requiredSubject(entry, candidateBinding) {
  const hasCandidate = candidateBinding !== undefined;
  return Object.freeze({
    ...entry,
    bindingState: hasCandidate ? "candidate_only_unbound" : "required_unbound",
    sourceCandidateIds: Object.freeze(hasCandidate ? [candidateBinding.candidateId] : []),
    frozenBindingId: null,
    sourceBodyDigest: hasCandidate ? candidateBinding.sourceBodySetDigest : null,
    exactQuoteStored: false,
    exactLocatorEstablished: hasCandidate,
    workRightsEstablished: false,
    editionRightsEstablished: false,
    carrierRightsEstablished: false,
    rightsLegalConclusion: "not_established",
    expertReviewIds: Object.freeze([]),
    frozenAt: null
  });
}

async function candidateEvidenceBindings(workspaceRoot, definitionInput) {
  const spec = definitionInput.candidateEvidence;
  if (spec === null) return Object.freeze([]);
  if (
    !spec
    || spec.subjectId !== ZIWEI_HKO_CALENDAR_SUBJECT_ID
    || spec.candidateId !== ZIWEI_HKO_CALENDAR_CANDIDATE_ID
    || spec.evidencePath !== ZIWEI_HKO_CALENDAR_EVIDENCE_PATH
  ) {
    throw new IndependentSourceRequirementsError(
      "DEFINITION_INVALID",
      `${definitionInput.productSystemId} 来源 candidate evidence 定义无效。`
    );
  }
  const evidence = await readZiweiHkoCalendarSourceEvidence(workspaceRoot);
  const verified = await verifyZiweiHkoCalendarSourceEvidence(workspaceRoot, evidence);
  if (
    verified.subjectId !== spec.subjectId
    || verified.candidateId !== spec.candidateId
    || verified.coverageScope !== "calendar_resolution"
    || verified.subjectFullySatisfied !== false
    || !LOWERCASE_SHA256.test(verified.evidenceDigest ?? "")
    || !LOWERCASE_SHA256.test(verified.sourceBodySetDigest ?? "")
    || verified.artifact?.path !== spec.evidencePath
    || !Number.isSafeInteger(verified.artifact?.bytes)
    || verified.artifact.bytes <= 0
    || !LOWERCASE_SHA256.test(verified.artifact?.sha256 ?? "")
  ) {
    throw new IndependentSourceRequirementsError(
      "CANDIDATE_EVIDENCE_INVALID",
      "紫微 HKO 日历 candidate evidence 未保持精确 subject、部分覆盖或摘要边界。"
    );
  }
  const artifact = verified.artifact;
  return Object.freeze([Object.freeze({
    subjectId: spec.subjectId,
    candidateId: spec.candidateId,
    path: artifact.path,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    evidenceDigest: verified.evidenceDigest,
    sourceBodySetDigest: verified.sourceBodySetDigest,
    coverageScope: verified.coverageScope,
    subjectFullySatisfied: false
  })]);
}

export async function buildCurrentIndependentSourceRequirements(workspaceRoot, definitionInput, options = {}) {
  const sortedDefinitions = [...definitionInput.subjects]
    .sort((left, right) => left.subjectId.localeCompare(right.subjectId, "en"));
  const subjectIds = sortedDefinitions.map((entry) => entry.subjectId);
  if (new Set(subjectIds).size !== subjectIds.length) {
    throw new IndependentSourceRequirementsError("DEFINITION_INVALID", `${definitionInput.productSystemId} 来源 subject 重复。`);
  }
  const basisArtifacts = await Promise.all([...definitionInput.basisArtifactPaths]
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((relativePath) => basisArtifactEvidence(workspaceRoot, relativePath)));
  const candidateBindings = await candidateEvidenceBindings(workspaceRoot, definitionInput);
  const candidateBySubjectId = new Map(
    candidateBindings.map((entry) => [entry.subjectId, entry])
  );
  if (
    candidateBindings.length !== candidateBySubjectId.size
    || [...candidateBySubjectId.keys()].some((subjectId) => !subjectIds.includes(subjectId))
  ) {
    throw new IndependentSourceRequirementsError(
      "CANDIDATE_EVIDENCE_INVALID",
      `${definitionInput.productSystemId} 来源 candidate evidence 未精确映射到一个既有 subject。`
    );
  }
  const subjects = sortedDefinitions.map((entry) => requiredSubject(
    entry,
    candidateBySubjectId.get(entry.subjectId)
  ));
  const hasCandidate = candidateBindings.length === 1;
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "independent_system_source_binding_requirements",
    ledgerId: `hakimi.${definitionInput.productSystemId}.source-binding-requirements/1.0.0`,
    productSystemId: definitionInput.productSystemId,
    contractSystemId: definitionInput.contractSystemId,
    status: hasCandidate
      ? "requirements_plus_one_partial_candidate_no_bindings_frozen"
      : "requirements_only_no_bindings_frozen",
    createdAt: options.createdAt ?? new Date().toISOString(),
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    defaultClosureRequirements: {
      sourceIdentityRequired: true,
      versionIdentityRequired: true,
      sourceBodyDigestRequired: true,
      exactLocatorRequired: true,
      minimalSufficientQuotePolicyRequired: true,
      workRightsEvidenceRequired: true,
      editionRightsEvidenceRequired: true,
      carrierRightsEvidenceRequired: true,
      nonRedistributableMaterialPolicy: "private_or_link_only",
      twoIndependentDomainOpinionsRequiredForDomainClaims: true,
      generatedModelWinnerSelectionAllowed: false
    },
    basisArtifacts,
    ...(hasCandidate ? { candidateEvidenceBindings: candidateBindings } : {}),
    subjects,
    gateSummary: {
      bindingRequired: subjects.length,
      bindingFrozenVerified: 0,
      sourceCandidatesAttached: candidateBindings.length,
      sourceBodiesBound: candidateBindings.length,
      exactQuotesBound: 0,
      exactLocatorsEstablished: candidateBindings.length,
      workRightsEstablished: 0,
      editionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      expertReviewedSubjects: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseReady: false
    },
    evidenceLedger: {
      engineeringRequirementIdentity: hasCandidate
        ? "basis_artifacts_subject_inventory_and_one_partial_source_candidate_digests_verified"
        : "basis_artifacts_and_subject_inventory_digests_verified",
      browserRuntimeEvidence: "not_assessed_in_requirements_ledger",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [
      ...(hasCandidate
        ? [
            "source_candidate_authenticity_or_frozen_binding",
            "source_body_set_as_full_subject_exact_quote_or_rights_clearance"
          ]
        : [
            "source_candidate_identity",
            "source_body_or_exact_quote"
          ]),
      "binding_frozen_verification",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "browser_or_runtime_validation",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  return Object.freeze({
    ...unsigned,
    ledgerDigest: computeIndependentSourceRequirementsDigest(unsigned)
  });
}

function requireLedgerObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new IndependentSourceRequirementsError("LEDGER_INVALID", "来源 requirements ledger 必须是 JSON 对象。");
  }
  return value;
}

export async function readIndependentSourceRequirements(workspaceRoot, definitionInput) {
  const absolute = safeWorkspaceFile(workspaceRoot, definitionInput.ledgerPath);
  const metadata = await stat(absolute);
  if (!metadata.isFile() || metadata.size <= 0 || metadata.size > MAX_LEDGER_BYTES) {
    throw new IndependentSourceRequirementsError("LEDGER_INVALID", `${definitionInput.productSystemId} requirements ledger 无效。`);
  }
  try {
    return requireLedgerObject(JSON.parse(await readFile(absolute, "utf8")));
  } catch (cause) {
    if (cause instanceof IndependentSourceRequirementsError) throw cause;
    throw new IndependentSourceRequirementsError("LEDGER_INVALID", `${definitionInput.productSystemId} requirements ledger 不是有效 JSON。`, { cause });
  }
}

export async function verifyIndependentSourceRequirements(workspaceRoot, definitionInput, ledgerInput) {
  const ledger = requireLedgerObject(ledgerInput);
  if (
    typeof ledger.createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(ledger.createdAt)
    || !LOWERCASE_SHA256.test(ledger.ledgerDigest ?? "")
  ) {
    throw new IndependentSourceRequirementsError("LEDGER_INVALID", `${definitionInput.productSystemId} requirements 时间或摘要无效。`);
  }
  const expected = await buildCurrentIndependentSourceRequirements(workspaceRoot, definitionInput, {
    createdAt: ledger.createdAt
  });
  if (
    canonicalStringifyIndependentSourceRequirements(ledger)
    !== canonicalStringifyIndependentSourceRequirements(expected)
  ) {
    throw new IndependentSourceRequirementsError(
      "LEDGER_MISMATCH",
      `${definitionInput.productSystemId} requirements 与当前依据、精确 subject inventory 或失败关闭账不一致。`
    );
  }
  return Object.freeze({
    productSystemId: definitionInput.productSystemId,
    bindingRequired: ledger.gateSummary.bindingRequired,
    bindingFrozenVerified: ledger.gateSummary.bindingFrozenVerified,
    ledgerDigest: ledger.ledgerDigest,
    ledger
  });
}

export async function verifyAllIndependentSourceRequirements(workspaceRoot) {
  const results = [];
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
    results.push(await verifyIndependentSourceRequirements(workspaceRoot, definitionInput, ledger));
  }
  return Object.freeze(results);
}
