import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";

export const BAZI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH =
  "content/system-admission/bazi-expert-public-candidate-prescreen.v1.json";

const MAX_LEDGER_BYTES = 1_000_000;
const MAX_BASIS_BYTES = 1_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const LEDGER_CREATED_AT = "2026-08-29T00:00:00.000Z";
const LEDGER_ID = "hakimi.bazi.expert-public-candidate-prescreen/1.0.0";
const CANDIDATE_STATE = "uncontacted_public_candidate_lead";
const BASIS_BINDING = Object.freeze({
  path: "docs/阶段D八字现实专家公开候选预筛-2026-08-29.md",
  role: "non_authoritative_public_prescreen_narrative_basis",
  rawBytes: 17_149,
  rawSha256: "4c4c1d3371825cdd68bb2d20fb21c1be53a097d7f1e7259ba93bf221e0329988"
});

export const BAZI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS = Object.freeze([
  "month-command-hidden-stem-duplication",
  "relative-factor-weighting",
  "strength-band-thresholds",
  "strength-invalidation-structures"
]);

export const BAZI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS = Object.freeze([
  "same_institution_or_organization",
  "teacher_student_or_lineage_relationship",
  "family_or_household_relationship",
  "shared_commercial_interest",
  "rule_or_case_set_coauthorship",
  "shared_professional_service",
  "reporting_or_supervision_relationship",
  "prior_exposure_to_other_reviewer_conclusion",
  "shared_unpublished_source_or_case_material",
  "same_upstream_algorithm_or_textbook_dependency"
]);

const EXPECTED_SOURCE_GROUPS = Object.freeze([
  Object.freeze({
    sourceUpstreamGroupId: "NYCU",
    publicOwnerLabel: "国立阳明交通大学",
    observationIds: Object.freeze(["LIN-NYCU-TEACHER", "LIN-NYCU-ALUMNI", "LIN-NYCU-PAPER"])
  }),
  Object.freeze({
    sourceUpstreamGroupId: "JAPAN_DIVINATION_ASSOCIATION",
    publicOwnerLabel: "日本占術協会",
    observationIds: Object.freeze(["OYAMA-ASSOC-RESEARCH", "OYAMA-ASSOC-OVERVIEW", "OYAMA-ASSOC-MEMBER"])
  }),
  Object.freeze({
    sourceUpstreamGroupId: "SETSUWA_PUBLISHER",
    publicOwnerLabel: "説話社",
    observationIds: Object.freeze(["OYAMA-PUBLISHER"])
  }),
  Object.freeze({
    sourceUpstreamGroupId: "NDL",
    publicOwnerLabel: "日本国立国会图书馆",
    observationIds: Object.freeze(["OYAMA-NDL"])
  }),
  Object.freeze({
    sourceUpstreamGroupId: "NCCU",
    publicOwnerLabel: "国立政治大学",
    observationIds: Object.freeze(["ZHANG-NCCU-THESIS", "ZHANG-NCCU-HUB"])
  }),
  Object.freeze({
    sourceUpstreamGroupId: "FJU_EXTENSION",
    publicOwnerLabel: "辅仁大学推广教育",
    observationIds: Object.freeze(["CHEN-FJU-COURSE"])
  })
]);

const EXPECTED_OBSERVATIONS = Object.freeze([
  Object.freeze({
    sourceObservationId: "LIN-NYCU-TEACHER",
    candidateLeadId: "bazi-public-lead-001",
    sourceUrl: "https://stat.nycu.edu.tw/zh_tw/members/teacher/%E6%9E%97%E8%81%96%E8%BB%92-86259034",
    sourceUpstreamGroupId: "NYCU",
    sourceType: "current_faculty_public_page",
    observationSummary: "公开教师页列出两项与八字量化研究相关的项目题名。"
  }),
  Object.freeze({
    sourceObservationId: "LIN-NYCU-ALUMNI",
    candidateLeadId: "bazi-public-lead-001",
    sourceUrl: "https://nctu-alumni-voice.sec.nycu.edu.tw/?p=4495",
    sourceUpstreamGroupId: "NYCU",
    sourceType: "public_alumni_interview",
    observationSummary: "公开校友访谈提供同一候选的机构背景线索。"
  }),
  Object.freeze({
    sourceObservationId: "LIN-NYCU-PAPER",
    candidateLeadId: "bazi-public-lead-001",
    sourceUrl: "https://shenghsuanlin.web.nycu.edu.tw/2021/04/22/%E5%85%AB%E5%AD%97%E8%AB%96%E5%91%BD%E9%87%8F%E5%8C%96%E7%A0%94%E7%A9%B6%E4%B9%8B%E5%95%8F%E5%8D%B7%E7%99%BC%E5%B1%95/",
    sourceUpstreamGroupId: "NYCU",
    sourceType: "public_research_page",
    observationSummary: "NYCU 托管公开页展示八字量化问卷研究题名。"
  }),
  Object.freeze({
    sourceObservationId: "OYAMA-ASSOC-RESEARCH",
    candidateLeadId: "bazi-public-lead-002",
    sourceUrl: "https://uranai-japan.or.jp/rp_archive/",
    sourceUpstreamGroupId: "JAPAN_DIVINATION_ASSOCIATION",
    sourceType: "public_association_research_archive",
    observationSummary: "协会公开研究档案提供候选与四柱推命领域的发现线索。"
  }),
  Object.freeze({
    sourceObservationId: "OYAMA-ASSOC-OVERVIEW",
    candidateLeadId: "bazi-public-lead-002",
    sourceUrl: "https://uranai-japan.or.jp/overview/",
    sourceUpstreamGroupId: "JAPAN_DIVINATION_ASSOCIATION",
    sourceType: "public_association_overview",
    observationSummary: "协会概况页提供候选与组织关系的待核线索。"
  }),
  Object.freeze({
    sourceObservationId: "OYAMA-ASSOC-MEMBER",
    candidateLeadId: "bazi-public-lead-002",
    sourceUrl: "https://uranai-japan.or.jp/membership-list/",
    sourceUpstreamGroupId: "JAPAN_DIVINATION_ASSOCIATION",
    sourceType: "public_association_membership_list",
    observationSummary: "协会公开名单提供候选关联线索。"
  }),
  Object.freeze({
    sourceObservationId: "OYAMA-PUBLISHER",
    candidateLeadId: "bazi-public-lead-002",
    sourceUrl: "https://www.setsuwa.co.jp/publishingDetail.php?pKey=150",
    sourceUpstreamGroupId: "SETSUWA_PUBLISHER",
    sourceType: "public_publisher_catalog",
    observationSummary: "出版社公开书目提供候选著作线索。"
  }),
  Object.freeze({
    sourceObservationId: "OYAMA-NDL",
    candidateLeadId: "bazi-public-lead-002",
    sourceUrl: "https://ndlsearch.ndl.go.jp/books/R100000002-I000010973545",
    sourceUpstreamGroupId: "NDL",
    sourceType: "public_national_library_catalog",
    observationSummary: "国家图书馆公开书目提供对应著作的存在性线索。"
  }),
  Object.freeze({
    sourceObservationId: "ZHANG-NCCU-THESIS",
    candidateLeadId: "bazi-public-lead-003",
    sourceUrl: "https://thesis.lib.nccu.edu.tw/thesis/detail/f55bc057bbdefe8bf032062c9dc542ec/",
    sourceUpstreamGroupId: "NCCU",
    sourceType: "public_thesis_detail",
    observationSummary: "论文详情页列出 2002 年《子平學之理論研究》。"
  }),
  Object.freeze({
    sourceObservationId: "ZHANG-NCCU-HUB",
    candidateLeadId: "bazi-public-lead-003",
    sourceUrl: "https://ah.lib.nccu.edu.tw/item?item_id=107759&locale=en",
    sourceUpstreamGroupId: "NCCU",
    sourceType: "public_institutional_repository_record",
    observationSummary: "机构典藏页提供同一论文的馆藏记录。"
  }),
  Object.freeze({
    sourceObservationId: "CHEN-FJU-COURSE",
    candidateLeadId: "bazi-public-lead-004",
    sourceUrl: "https://www.ext.fju.edu.tw/course.php?id=71124",
    sourceUpstreamGroupId: "FJU_EXTENSION",
    sourceType: "public_extension_course_page",
    observationSummary: "推广教育公开课程页列出 2026 年四柱八字进阶研究班。"
  })
]);

const EXPECTED_CANDIDATES = Object.freeze([
  Object.freeze({
    candidateLeadId: "bazi-public-lead-001",
    publicDisplayName: "林聖軒",
    proposedReviewDirection: "methodology_and_engineering_reproducibility_candidate",
    sourceObservationIds: Object.freeze(["LIN-NYCU-TEACHER", "LIN-NYCU-ALUMNI", "LIN-NYCU-PAPER"]),
    sourceUpstreamGroupIds: Object.freeze(["NYCU"]),
    scopeStates: Object.freeze(["unknown", "methodology_only", "methodology_only", "unknown"])
  }),
  Object.freeze({
    candidateLeadId: "bazi-public-lead-002",
    publicDisplayName: "小山眞樹代",
    proposedReviewDirection: "four_pillars_domain_rule_interpretation_candidate",
    sourceObservationIds: Object.freeze([
      "OYAMA-ASSOC-RESEARCH",
      "OYAMA-ASSOC-OVERVIEW",
      "OYAMA-ASSOC-MEMBER",
      "OYAMA-PUBLISHER",
      "OYAMA-NDL"
    ]),
    sourceUpstreamGroupIds: Object.freeze(["JAPAN_DIVINATION_ASSOCIATION", "NDL", "SETSUWA_PUBLISHER"]),
    scopeStates: Object.freeze([
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required"
    ])
  }),
  Object.freeze({
    candidateLeadId: "bazi-public-lead-003",
    publicDisplayName: "張新智",
    proposedReviewDirection: "ziping_theory_and_version_interpretation_candidate",
    sourceObservationIds: Object.freeze(["ZHANG-NCCU-THESIS", "ZHANG-NCCU-HUB"]),
    sourceUpstreamGroupIds: Object.freeze(["NCCU"]),
    scopeStates: Object.freeze([
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "potentially_related_scope_confirmation_required"
    ])
  }),
  Object.freeze({
    candidateLeadId: "bazi-public-lead-004",
    publicDisplayName: "陳怡廷",
    proposedReviewDirection: "teaching_practice_and_high_risk_expression_candidate",
    sourceObservationIds: Object.freeze(["CHEN-FJU-COURSE"]),
    sourceUpstreamGroupIds: Object.freeze(["FJU_EXTENSION"]),
    scopeStates: Object.freeze([
      "potentially_related_scope_confirmation_required",
      "potentially_related_scope_confirmation_required",
      "unknown",
      "potentially_related_scope_confirmation_required"
    ])
  })
]);

const EXPECTED_PAIR_IDS = Object.freeze([
  "bazi-public-lead-001--bazi-public-lead-002",
  "bazi-public-lead-001--bazi-public-lead-003",
  "bazi-public-lead-001--bazi-public-lead-004",
  "bazi-public-lead-002--bazi-public-lead-003",
  "bazi-public-lead-002--bazi-public-lead-004",
  "bazi-public-lead-003--bazi-public-lead-004"
]);

const EXPECTED_AUTHORITY_BOUNDARY = Object.freeze({
  identityVerified: false,
  credentialVerified: false,
  scopeVerified: false,
  independenceVerified: false,
  expertStatusVerified: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  releaseReady: false,
  expertClaimsAuthorized: false,
  publicDeploymentAuthorized: false
});

const EXPECTED_OBSERVATION_BOUNDARY = Object.freeze({
  heldHandleRead: true,
  sameBufferHashAndParse: true,
  basisSameBufferHashAndInspection: true,
  finalFileSymlinkRejected: true,
  directorySymlinkRejected: true,
  unknownFieldsRejected: true,
  crossFileAtomicSnapshot: false,
  mutationEpochAvailable: false,
  intervalMutationExcluded: false,
  abaExcluded: false
});

const EXPECTED_DOES_NOT_ESTABLISH = Object.freeze([
  "real_person_identity",
  "current_credentials",
  "four_question_scope",
  "pairwise_independence",
  "expert_status",
  "content_truth",
  "expert_truth",
  "rights_or_legal_conclusion",
  "formal_review_gate",
  "release_readiness",
  "public_release_authorization",
  "cross_file_atomic_snapshot",
  "interval_mutation_or_aba_exclusion"
]);

export class BaziExpertPublicCandidatePrescreenError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziExpertPublicCandidatePrescreenError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziExpertPublicCandidatePrescreenError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "预筛输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 100_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "预筛输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      fail("INPUT_VALUE_INVALID", "预筛输入含无效数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 1_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "预筛输入超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "预筛输入只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "预筛输入不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "预筛输入不接受循环引用。");
  state.active.add(value);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = Array.isArray(value);
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "预筛输入对象不能被安全捕获。", cause);
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "预筛输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "预筛数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 100_000) {
        fail("INPUT_ARRAY_INVALID", "预筛数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "预筛数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "预筛输入不接受稀疏数组或访问器元素。");
        }
        output.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return output;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "预筛输入只接受普通对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "预筛输入不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    active: new WeakSet(),
    nodes: 0,
    textCharacters: 0
  }, 0);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key])])
    );
  }
  fail("NON_CANONICAL_JSON", "预筛账只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziExpertPublicCandidatePrescreen(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeBaziExpertPublicCandidatePrescreenDigest(ledger) {
  const snapshot = capturePassiveJsonSnapshot(ledger);
  const { ledgerDigest: _ledgerDigest, ...unsigned } = snapshot;
  return createHash("sha256")
    .update(canonicalStringifyBaziExpertPublicCandidatePrescreen(unsigned), "utf8")
    .digest("hex");
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
      } else if (value !== null && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}

export function parseBaziExpertPublicCandidatePrescreenJsonBytes(
  bytes,
  label = "八字现实专家公开候选预筛账",
  maxBytes = MAX_LEDGER_BYTES
) {
  if (!(bytes instanceof Uint8Array)) fail("JSON_INVALID", `${label} 必须是字节。`);
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || bytes.byteLength > maxBytes) {
    fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  }
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "bazi-expert-public-candidate-prescreen.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, cause);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof BaziExpertPublicCandidatePrescreenError) throw cause;
    fail("JSON_INVALID", `${label} 不是有效 JSON。`, cause);
  }
}

function scanForbiddenFields(value) {
  if (Array.isArray(value)) {
    for (const child of value) scanForbiddenFields(child);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/(?:private|contact|consent|dossier|opinion)/iu.test(key)) {
      fail("PRIVATE_OR_CONTACT_FIELD_FORBIDDEN", "公开预筛账不得包含私有、联络、同意或审阅材料字段。");
    }
    if (/^(?:pageBody|body|html|rawText|fullText|excerpt|quote|documentContent|pageContent)$/iu.test(key)) {
      fail("PAGE_BODY_FIELD_FORBIDDEN", "公开预筛账不得保存页面正文或摘录字段。");
    }
    if (/^(?:expertName|reviewerName|reviewerSeat|seatId|assignedSeat)$/iu.test(key)) {
      fail("EXPERT_OR_SEAT_FIELD_FORBIDDEN", "公开候选不得被改写为专家姓名或正式席位。");
    }
    if (/(?:packet|manifest|registry|backlink)/iu.test(key)) {
      fail("FORMAL_BACKLINK_FIELD_FORBIDDEN", "公开预筛账不得反向接入正式包、manifest 或 registry。");
    }
    scanForbiddenFields(child);
  }
}

function assertExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("LEDGER_INVALID", `${label} 必须是对象。`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  const extras = actual.filter((key) => !expected.includes(key));
  if (extras.length > 0) fail("UNKNOWN_FIELD_FORBIDDEN", `${label} 含未知字段。`);
  fail("LEDGER_INVALID", `${label} 缺少必要字段。`);
}

function assertExactArray(actual, expected, label, code = "LEDGER_INVALID") {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(code, `${label} 必须保持固定顺序与内容。`);
  }
}

function assertExactScalar(actual, expected, label, code = "LEDGER_INVALID") {
  if (actual !== expected) fail(code, `${label} 不符合固定合同。`);
}

function assertFalse(value, label, code = "AUTHORITY_PROMOTION_FORBIDDEN") {
  if (value !== false) fail(code, `${label} 必须保持 false。`);
}

function assertSafePublicUrl(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.length < 12 || rawUrl.length > 2_048) {
    fail("PUBLIC_URL_INVALID", "公开来源 URL 无效。");
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (cause) {
    fail("PUBLIC_URL_INVALID", "公开来源 URL 不能解析。", cause);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) {
    fail("PUBLIC_URL_INVALID", "公开来源 URL 必须是无凭据、无片段的 HTTPS URL。");
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch (cause) {
    fail("PUBLIC_URL_INVALID", "公开来源 URL 路径编码无效。", cause);
  }
  const pathSegments = decodedPath.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  if (pathSegments.some((segment) => ["login", "signin", "sign-in", "auth"].includes(segment))) {
    fail("LOGIN_URL_FORBIDDEN", "公开预筛账不得保存登录或认证入口 URL。");
  }
}

function verifyBasisBinding(binding) {
  assertExactKeys(binding, ["path", "role", "rawBytes", "rawSha256"], "basisArtifacts[0]");
  for (const [key, expected] of Object.entries(BASIS_BINDING)) {
    assertExactScalar(binding[key], expected, `basisArtifacts[0].${key}`, "BASIS_BINDING_INVALID");
  }
}

function verifySourceGroups(sourceGroups) {
  if (!Array.isArray(sourceGroups) || sourceGroups.length !== EXPECTED_SOURCE_GROUPS.length) {
    fail("SOURCE_GROUP_COUNT_INVALID", "公开来源必须恰好折叠为 6 个上游组。");
  }
  const groupIds = sourceGroups.map((entry) => entry?.sourceUpstreamGroupId);
  if (new Set(groupIds).size !== groupIds.length) {
    fail("SOURCE_GROUP_DOUBLE_COUNT", "同一上游组不得重复计数。");
  }
  for (let index = 0; index < EXPECTED_SOURCE_GROUPS.length; index += 1) {
    const actual = sourceGroups[index];
    const expected = EXPECTED_SOURCE_GROUPS[index];
    assertExactKeys(actual, ["sourceUpstreamGroupId", "publicOwnerLabel", "observationIds"], `sourceGroups[${index}]`);
    assertExactScalar(actual.sourceUpstreamGroupId, expected.sourceUpstreamGroupId, `sourceGroups[${index}].sourceUpstreamGroupId`, "SOURCE_GROUP_CATALOG_MISMATCH");
    assertExactScalar(actual.publicOwnerLabel, expected.publicOwnerLabel, `sourceGroups[${index}].publicOwnerLabel`, "SOURCE_GROUP_CATALOG_MISMATCH");
    if (!Array.isArray(actual.observationIds) || new Set(actual.observationIds).size !== actual.observationIds.length) {
      fail("SOURCE_GROUP_DOUBLE_COUNT", "同一来源观察不得在一个上游组内重复计数。");
    }
    assertExactArray(actual.observationIds, expected.observationIds, `sourceGroups[${index}].observationIds`, "SOURCE_GROUP_CATALOG_MISMATCH");
  }
}

function verifySourceObservations(observations) {
  if (!Array.isArray(observations) || observations.length !== 11) {
    fail("SOURCE_OBSERVATION_COUNT_INVALID", "公开预筛账必须恰好保存 11 条合格公开观察。");
  }
  const observationIds = observations.map((entry) => entry?.sourceObservationId);
  if (new Set(observationIds).size !== observationIds.length) {
    fail("SOURCE_OBSERVATION_DUPLICATE", "公开来源观察 ID 不得重复。");
  }
  for (let index = 0; index < EXPECTED_OBSERVATIONS.length; index += 1) {
    const actual = observations[index];
    const expected = EXPECTED_OBSERVATIONS[index];
    assertExactKeys(actual, [
      "sourceObservationId",
      "candidateLeadId",
      "sourceUrl",
      "sourceUpstreamGroupId",
      "sourceType",
      "observationSummary",
      "observedAt",
      "supportsCandidateDiscoveryOnly",
      "authoritative"
    ], `sourceObservations[${index}]`);
    assertSafePublicUrl(actual.sourceUrl);
    for (const key of [
      "sourceObservationId",
      "candidateLeadId",
      "sourceUrl",
      "sourceUpstreamGroupId",
      "sourceType",
      "observationSummary"
    ]) {
      assertExactScalar(actual[key], expected[key], `sourceObservations[${index}].${key}`, "SOURCE_OBSERVATION_CATALOG_MISMATCH");
    }
    if (typeof actual.observationSummary !== "string"
      || actual.observationSummary.length < 8
      || actual.observationSummary.length > 240
      || /<\/?(?:html|body|script|article)[\s>]/iu.test(actual.observationSummary)) {
      fail("OBSERVATION_SUMMARY_INVALID", "公开观察摘要必须是短小的非正文转述。");
    }
    if (!DATE_PATTERN.test(actual.observedAt) || actual.observedAt !== "2026-08-29") {
      fail("OBSERVATION_DATE_INVALID", "公开观察日期不符合固定批次。");
    }
    assertExactScalar(actual.supportsCandidateDiscoveryOnly, true, `sourceObservations[${index}].supportsCandidateDiscoveryOnly`);
    assertFalse(actual.authoritative, `sourceObservations[${index}].authoritative`);
  }
}

function verifyCandidates(candidates, observations) {
  if (!Array.isArray(candidates) || candidates.length !== EXPECTED_CANDIDATES.length) {
    fail("CANDIDATE_COUNT_INVALID", "公开预筛账必须恰好包含 4 个候选线索。");
  }
  const candidateIds = candidates.map((entry) => entry?.candidateLeadId);
  if (new Set(candidateIds).size !== candidateIds.length) fail("CANDIDATE_DUPLICATE", "候选线索 ID 不得重复。");
  for (let index = 0; index < EXPECTED_CANDIDATES.length; index += 1) {
    const actual = candidates[index];
    const expected = EXPECTED_CANDIDATES[index];
    assertExactKeys(actual, [
      "candidateLeadId",
      "publicDisplayName",
      "candidateState",
      "proposedReviewDirection",
      "sourceObservationIds",
      "sourceUpstreamGroupIds",
      "deduplicatedSourceGroupCount",
      "multiplePublicUpstreamGroupsObserved",
      "scopeMatrix",
      "slotAssignment",
      "identityVerified",
      "credentialVerified",
      "scopeVerified",
      "independenceVerified",
      "expertStatusVerified",
      "countsTowardExpertGate"
    ], `candidates[${index}]`);
    for (const key of ["candidateLeadId", "publicDisplayName", "proposedReviewDirection"]) {
      assertExactScalar(actual[key], expected[key], `candidates[${index}].${key}`, "CANDIDATE_CATALOG_MISMATCH");
    }
    assertExactScalar(actual.candidateState, CANDIDATE_STATE, `candidates[${index}].candidateState`, "CANDIDATE_STATE_PROMOTION_FORBIDDEN");
    assertExactArray(actual.sourceObservationIds, expected.sourceObservationIds, `candidates[${index}].sourceObservationIds`, "CANDIDATE_SOURCE_MAPPING_INVALID");
    if (!Array.isArray(actual.sourceUpstreamGroupIds)
      || new Set(actual.sourceUpstreamGroupIds).size !== actual.sourceUpstreamGroupIds.length) {
      fail("SOURCE_GROUP_DOUBLE_COUNT", "候选上游组必须去重后计数。");
    }
    assertExactArray(actual.sourceUpstreamGroupIds, expected.sourceUpstreamGroupIds, `candidates[${index}].sourceUpstreamGroupIds`, "CANDIDATE_SOURCE_MAPPING_INVALID");
    const observedGroups = new Set(
      observations
        .filter((observation) => observation.candidateLeadId === actual.candidateLeadId)
        .map((observation) => observation.sourceUpstreamGroupId)
    );
    assertExactScalar(actual.deduplicatedSourceGroupCount, observedGroups.size, `candidates[${index}].deduplicatedSourceGroupCount`, "SOURCE_GROUP_DOUBLE_COUNT");
    assertExactScalar(actual.multiplePublicUpstreamGroupsObserved, observedGroups.size >= 2, `candidates[${index}].multiplePublicUpstreamGroupsObserved`, "SOURCE_GROUP_DOUBLE_COUNT");
    if (!Array.isArray(actual.scopeMatrix) || actual.scopeMatrix.length !== 4) {
      fail("SCOPE_MATRIX_INVALID", "每个候选必须保留四题 scope matrix。");
    }
    for (let questionIndex = 0; questionIndex < 4; questionIndex += 1) {
      const scope = actual.scopeMatrix[questionIndex];
      assertExactKeys(scope, ["questionId", "state"], `candidates[${index}].scopeMatrix[${questionIndex}]`);
      assertExactScalar(scope.questionId, BAZI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS[questionIndex], `candidates[${index}].scopeMatrix[${questionIndex}].questionId`, "SCOPE_MATRIX_INVALID");
      if (scope.state === "direct_public_evidence_observed" || scope.state === "verified") {
        fail("SCOPE_PROMOTION_FORBIDDEN", "公开候选观察不得晋级为已核验 scope。");
      }
      assertExactScalar(scope.state, expected.scopeStates[questionIndex], `candidates[${index}].scopeMatrix[${questionIndex}].state`, "SCOPE_MATRIX_INVALID");
    }
    if (actual.slotAssignment !== null) fail("SEAT_PROMOTION_FORBIDDEN", "公开候选不得占用 reviewer slot。");
    assertFalse(actual.identityVerified, `candidates[${index}].identityVerified`);
    assertFalse(actual.credentialVerified, `candidates[${index}].credentialVerified`);
    assertFalse(actual.scopeVerified, `candidates[${index}].scopeVerified`, "SCOPE_PROMOTION_FORBIDDEN");
    assertFalse(actual.independenceVerified, `candidates[${index}].independenceVerified`, "INDEPENDENCE_FABRICATION_FORBIDDEN");
    assertFalse(actual.expertStatusVerified, `candidates[${index}].expertStatusVerified`);
    assertFalse(actual.countsTowardExpertGate, `candidates[${index}].countsTowardExpertGate`);
  }
}

function verifyPairwiseIndependence(assessments) {
  if (!Array.isArray(assessments) || assessments.length !== EXPECTED_PAIR_IDS.length) {
    fail("PAIRWISE_ASSESSMENT_INVALID", "四个候选必须保留全部 6 个未开始配对。");
  }
  const pairIds = assessments.map((entry) => entry?.pairId);
  if (new Set(pairIds).size !== pairIds.length) {
    fail("PAIRWISE_ASSESSMENT_INVALID", "候选配对不得重复。");
  }
  for (let index = 0; index < assessments.length; index += 1) {
    const assessment = assessments[index];
    const pairId = EXPECTED_PAIR_IDS[index];
    const candidateLeadIds = pairId.split("--");
    assertExactKeys(assessment, [
      "pairId",
      "candidateLeadIds",
      "factorStates",
      "pairwiseIndependenceEstablished",
      "countsTowardExpertGate"
    ], `pairwiseIndependenceAssessments[${index}]`);
    assertExactScalar(assessment.pairId, pairId, `pairwiseIndependenceAssessments[${index}].pairId`, "PAIRWISE_ASSESSMENT_INVALID");
    assertExactArray(assessment.candidateLeadIds, candidateLeadIds, `pairwiseIndependenceAssessments[${index}].candidateLeadIds`, "PAIRWISE_ASSESSMENT_INVALID");
    if (!Array.isArray(assessment.factorStates)
      || assessment.factorStates.length !== BAZI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS.length) {
      fail("INDEPENDENCE_FABRICATION_FORBIDDEN", "每个候选配对必须保留全部 10 项未决独立性因素。");
    }
    for (let factorIndex = 0; factorIndex < assessment.factorStates.length; factorIndex += 1) {
      const factor = assessment.factorStates[factorIndex];
      const factorId = BAZI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS[factorIndex];
      const expectedState = factorId === "prior_exposure_to_other_reviewer_conclusion"
        ? "not_applicable_before_review"
        : "unknown";
      assertExactKeys(factor, ["factorId", "state"], `pairwiseIndependenceAssessments[${index}].factorStates[${factorIndex}]`);
      assertExactScalar(factor.factorId, factorId, `pairwiseIndependenceAssessments[${index}].factorStates[${factorIndex}].factorId`, "INDEPENDENCE_FABRICATION_FORBIDDEN");
      assertExactScalar(factor.state, expectedState, `pairwiseIndependenceAssessments[${index}].factorStates[${factorIndex}].state`, "INDEPENDENCE_FABRICATION_FORBIDDEN");
    }
    assertFalse(assessment.pairwiseIndependenceEstablished, `pairwiseIndependenceAssessments[${index}].pairwiseIndependenceEstablished`, "INDEPENDENCE_FABRICATION_FORBIDDEN");
    assertFalse(assessment.countsTowardExpertGate, `pairwiseIndependenceAssessments[${index}].countsTowardExpertGate`, "INDEPENDENCE_FABRICATION_FORBIDDEN");
  }
}

function verifyAuthorityBoundary(authorityBoundary) {
  assertExactKeys(authorityBoundary, Object.keys(EXPECTED_AUTHORITY_BOUNDARY), "authorityBoundary");
  for (const key of Object.keys(EXPECTED_AUTHORITY_BOUNDARY)) {
    assertFalse(authorityBoundary[key], `authorityBoundary.${key}`);
  }
}

function verifyObservationBoundary(observationBoundary) {
  assertExactKeys(observationBoundary, Object.keys(EXPECTED_OBSERVATION_BOUNDARY), "observationBoundary");
  for (const [key, expected] of Object.entries(EXPECTED_OBSERVATION_BOUNDARY)) {
    assertExactScalar(observationBoundary[key], expected, `observationBoundary.${key}`);
  }
}

export function verifyBaziExpertPublicCandidatePrescreenLedger(input) {
  const ledger = capturePassiveJsonSnapshot(input);
  scanForbiddenFields(ledger);
  assertExactKeys(ledger, [
    "schemaVersion",
    "recordType",
    "ledgerId",
    "status",
    "createdAt",
    "basisArtifacts",
    "sourceGroupPolicy",
    "sourceGroups",
    "sourceObservations",
    "reviewQuestionIds",
    "candidates",
    "independenceFactorIds",
    "pairwiseIndependenceAssessments",
    "authorityBoundary",
    "observationBoundary",
    "doesNotEstablish",
    "ledgerDigest"
  ], "ledger");
  assertExactScalar(ledger.schemaVersion, "1.0.0", "schemaVersion");
  assertExactScalar(ledger.recordType, "bazi_expert_public_candidate_prescreen_v1", "recordType");
  assertExactScalar(ledger.ledgerId, LEDGER_ID, "ledgerId");
  assertExactScalar(ledger.status, "public_candidate_discovery_only_non_authoritative", "status");
  assertExactScalar(ledger.createdAt, LEDGER_CREATED_AT, "createdAt");
  if (!Array.isArray(ledger.basisArtifacts) || ledger.basisArtifacts.length !== 1) {
    fail("BASIS_BINDING_INVALID", "预筛账必须且只能绑定一份本地叙述 basis。");
  }
  verifyBasisBinding(ledger.basisArtifacts[0]);
  assertExactKeys(ledger.sourceGroupPolicy, [
    "deduplicationKey",
    "sameGroupObservationsCountOnce",
    "sourceObservationCount",
    "deduplicatedSourceGroupCount"
  ], "sourceGroupPolicy");
  assertExactScalar(ledger.sourceGroupPolicy.deduplicationKey, "sourceUpstreamGroupId", "sourceGroupPolicy.deduplicationKey");
  assertExactScalar(ledger.sourceGroupPolicy.sameGroupObservationsCountOnce, true, "sourceGroupPolicy.sameGroupObservationsCountOnce");
  assertExactScalar(ledger.sourceGroupPolicy.sourceObservationCount, 11, "sourceGroupPolicy.sourceObservationCount", "SOURCE_OBSERVATION_COUNT_INVALID");
  assertExactScalar(ledger.sourceGroupPolicy.deduplicatedSourceGroupCount, 6, "sourceGroupPolicy.deduplicatedSourceGroupCount", "SOURCE_GROUP_COUNT_INVALID");
  verifySourceGroups(ledger.sourceGroups);
  verifySourceObservations(ledger.sourceObservations);
  assertExactArray(ledger.reviewQuestionIds, BAZI_EXPERT_PUBLIC_PRESCREEN_REVIEW_QUESTION_IDS, "reviewQuestionIds", "SCOPE_MATRIX_INVALID");
  verifyCandidates(ledger.candidates, ledger.sourceObservations);
  assertExactArray(ledger.independenceFactorIds, BAZI_EXPERT_PUBLIC_PRESCREEN_INDEPENDENCE_FACTOR_IDS, "independenceFactorIds", "INDEPENDENCE_FABRICATION_FORBIDDEN");
  verifyPairwiseIndependence(ledger.pairwiseIndependenceAssessments);
  verifyAuthorityBoundary(ledger.authorityBoundary);
  verifyObservationBoundary(ledger.observationBoundary);
  assertExactArray(ledger.doesNotEstablish, EXPECTED_DOES_NOT_ESTABLISH, "doesNotEstablish");
  if (typeof ledger.ledgerDigest !== "string" || !SHA256_PATTERN.test(ledger.ledgerDigest)) {
    fail("LEDGER_DIGEST_INVALID", "ledgerDigest 必须是小写 SHA-256。");
  }
  const computedDigest = computeBaziExpertPublicCandidatePrescreenDigest(ledger);
  if (computedDigest !== ledger.ledgerDigest) {
    fail("LEDGER_DIGEST_MISMATCH", "公开候选预筛账摘要不匹配。");
  }
  return deepFreezeJson(ledger);
}

function normalizePathIdentity(value) {
  const normalized = path.resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || relativePath.includes(":")) {
    fail("ARTIFACT_PATH_INVALID", "工件路径必须是仓内规范相对路径。");
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    fail("ARTIFACT_PATH_INVALID", "工件路径不得为空、绝对或逃逸。");
  }
  return parts;
}

function snapshotStat(stats) {
  return Object.freeze({
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    nlink: stats.nlink,
    size: stats.size,
    mtimeNs: stats.mtimeNs,
    ctimeNs: stats.ctimeNs
  });
}

function sameStat(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryChain(workspaceRoot, parts) {
  const snapshots = [];
  let cursor = workspaceRoot;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    let stats;
    let resolved;
    try {
      [stats, resolved] = await Promise.all([lstat(cursor, { bigint: true }), realpath(cursor)]);
    } catch (cause) {
      fail("DIRECTORY_CHAIN_INVALID", "工件目录链不能被安全读取。", cause);
    }
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      fail("SYMLINK_FORBIDDEN", "工件目录链不得包含 symlink、junction 或非目录端点。");
    }
    if (normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("SYMLINK_FORBIDDEN", "工件目录链 realpath 不匹配。");
    }
    snapshots.push(Object.freeze({ path: cursor, resolved, stat: snapshotStat(stats) }));
  }
  return snapshots;
}

async function revalidateDirectoryChain(snapshots) {
  for (const snapshot of snapshots) {
    let stats;
    let resolved;
    try {
      [stats, resolved] = await Promise.all([
        lstat(snapshot.path, { bigint: true }),
        realpath(snapshot.path)
      ]);
    } catch (cause) {
      fail("FILE_CHANGED_DURING_READ", "held-handle 读取期间目录链发生变化。", cause);
    }
    if (stats.isSymbolicLink()
      || !stats.isDirectory()
      || !sameStat(snapshot.stat, snapshotStat(stats))
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("FILE_CHANGED_DURING_READ", "held-handle 读取期间目录链发生变化。");
    }
  }
}

async function readBoundedHandle(handle, maxBytes) {
  const buffer = Buffer.allocUnsafe(maxBytes + 1);
  let offset = 0;
  while (offset < buffer.byteLength) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxBytes) fail("ARTIFACT_TOO_LARGE", "工件超过 held-handle 有界读取上限。");
  return buffer.subarray(0, offset);
}

async function readStableWorkspaceFile(workspaceRootInput, relativePath, maxBytes) {
  const parts = validateRelativePath(relativePath);
  const workspaceRoot = path.resolve(workspaceRootInput);
  let rootStats;
  let rootResolved;
  try {
    [rootStats, rootResolved] = await Promise.all([
      lstat(workspaceRoot, { bigint: true }),
      realpath(workspaceRoot)
    ]);
  } catch (cause) {
    fail("WORKSPACE_ROOT_INVALID", "workspaceRoot 不能被安全读取。", cause);
  }
  if (rootStats.isSymbolicLink()
    || !rootStats.isDirectory()
    || normalizePathIdentity(rootResolved) !== normalizePathIdentity(workspaceRoot)) {
    fail("WORKSPACE_ROOT_INVALID", "workspaceRoot 必须是非链接真实目录。");
  }
  const absolutePath = path.resolve(workspaceRoot, ...parts);
  const relativeCheck = path.relative(workspaceRoot, absolutePath);
  if (!relativeCheck || relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) {
    fail("ARTIFACT_PATH_INVALID", "工件路径逃逸或指向 workspaceRoot。");
  }
  const directorySnapshots = await captureDirectoryChain(workspaceRoot, parts.slice(0, -1));
  let before;
  let beforeRealpath;
  try {
    [before, beforeRealpath] = await Promise.all([
      lstat(absolutePath, { bigint: true }),
      realpath(absolutePath)
    ]);
  } catch (cause) {
    fail("ARTIFACT_READ_FAILED", "工件端点不能被安全读取。", cause);
  }
  if (before.isSymbolicLink() || !before.isFile()) {
    fail("SYMLINK_FORBIDDEN", "工件必须是非链接普通文件。");
  }
  if (before.nlink !== 1n) fail("HARDLINK_FORBIDDEN", "工件必须是单链接普通文件。");
  if (before.size > BigInt(maxBytes)) fail("ARTIFACT_TOO_LARGE", "工件超过读取上限。");
  if (normalizePathIdentity(beforeRealpath) !== normalizePathIdentity(absolutePath)) {
    fail("SYMLINK_FORBIDDEN", "工件 realpath 不匹配。");
  }
  const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
  } catch (cause) {
    fail("ARTIFACT_READ_FAILED", "工件 held handle 打开失败。", cause);
  }
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile()
      || opened.nlink !== 1n
      || !sameStat(snapshotStat(before), snapshotStat(opened))) {
      fail("FILE_CHANGED_DURING_READ", "工件在 held handle 打开前发生变化。");
    }
    const bytes = await readBoundedHandle(handle, maxBytes);
    const afterHandle = await handle.stat({ bigint: true });
    let afterPath;
    let afterRealpath;
    try {
      [afterPath, afterRealpath] = await Promise.all([
        lstat(absolutePath, { bigint: true }),
        realpath(absolutePath)
      ]);
    } catch (cause) {
      fail("FILE_CHANGED_DURING_READ", "工件在 held-handle 读取期间发生变化。", cause);
    }
    if (afterPath.isSymbolicLink()
      || !afterPath.isFile()
      || afterPath.nlink !== 1n
      || !sameStat(snapshotStat(opened), snapshotStat(afterHandle))
      || !sameStat(snapshotStat(afterHandle), snapshotStat(afterPath))
      || BigInt(bytes.byteLength) !== afterHandle.size
      || normalizePathIdentity(afterRealpath) !== normalizePathIdentity(absolutePath)) {
      fail("FILE_CHANGED_DURING_READ", "工件在 held-handle 读取期间发生变化。");
    }
    await revalidateDirectoryChain(directorySnapshots);
    return Object.freeze({
      path: relativePath,
      rawBytes: bytes.byteLength,
      rawSha256: createHash("sha256").update(bytes).digest("hex"),
      bytes
    });
  } finally {
    await handle.close().catch(() => {});
  }
}

function inspectBasisBytes(bytes) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("BASIS_INVALID", "basis 不得包含 UTF-8 BOM。");
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("BASIS_INVALID", "basis 不是严格 UTF-8。", cause);
  }
  const requiredMarkers = [
    "# 阶段 D：八字现实专家公开候选预筛",
    ...EXPECTED_CANDIDATES.map((candidate) => candidate.candidateLeadId),
    ...EXPECTED_OBSERVATIONS.map((observation) => observation.sourceObservationId)
  ];
  if (requiredMarkers.some((marker) => !source.includes(marker))) {
    fail("BASIS_INVALID", "basis 缺少本批次候选或合格公开观察标记。");
  }
}

function publicArtifactIdentity(snapshot) {
  return Object.freeze({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}

export async function loadBaziExpertPublicCandidatePrescreen(workspaceRoot = process.cwd()) {
  const ledgerSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BAZI_EXPERT_PUBLIC_CANDIDATE_PRESCREEN_RELATIVE_PATH,
    MAX_LEDGER_BYTES
  );
  const parsedLedger = parseBaziExpertPublicCandidatePrescreenJsonBytes(
    ledgerSnapshot.bytes,
    "八字现实专家公开候选预筛账",
    MAX_LEDGER_BYTES
  );
  const ledger = verifyBaziExpertPublicCandidatePrescreenLedger(parsedLedger);
  const basisSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    ledger.basisArtifacts[0].path,
    MAX_BASIS_BYTES
  );
  if (basisSnapshot.rawBytes !== ledger.basisArtifacts[0].rawBytes
    || basisSnapshot.rawSha256 !== ledger.basisArtifacts[0].rawSha256) {
    fail("BASIS_DRIFT", "本地公开预筛叙述 basis 已漂移。");
  }
  inspectBasisBytes(basisSnapshot.bytes);
  const result = {
    ok: true,
    status: ledger.status,
    ledgerId: ledger.ledgerId,
    ledgerDigest: ledger.ledgerDigest,
    candidateLeads: ledger.candidates.length,
    sourceObservations: ledger.sourceObservations.length,
    deduplicatedSourceGroups: ledger.sourceGroups.length,
    scopeQuestions: ledger.reviewQuestionIds.length,
    independenceFactors: ledger.independenceFactorIds.length,
    pairwiseAssessments: ledger.pairwiseIndependenceAssessments.length,
    expertGateCount: ledger.candidates.filter((candidate) => candidate.countsTowardExpertGate).length,
    releaseReady: ledger.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: ledger.authorityBoundary.publicDeploymentAuthorized,
    ledgerArtifact: publicArtifactIdentity(ledgerSnapshot),
    basisArtifacts: Object.freeze([publicArtifactIdentity(basisSnapshot)]),
    ledger
  };
  return deepFreezeJson(result);
}
