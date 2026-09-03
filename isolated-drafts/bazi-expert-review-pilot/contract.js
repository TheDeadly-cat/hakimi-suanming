import { OVERALL_QUESTIONS, INVALIDATION_STRUCTURES } from "./data/questions.js";
import { SCENARIOS, SEAT_ORDERS } from "./data/scenarios.js";

export const PILOT_PACK_ID = "hakimi.bazi.expert-review-usability-pilot/0.2.0";
export const PILOT_TEMPLATE_VERSION = "hakimi.bazi.expert-review-pilot-template/0.2.0";
export const PILOT_REVIEW_PURPOSE = "pilot_usability_and_question_quality_only";
export const UNASSIGNED_REVIEW_CYCLE_ID = "pilot-review-cycle.unassigned";
export const UNASSIGNED_PACKAGE_MANIFEST_RAW_SHA256 = "0".repeat(64);
export const PILOT_REVIEW_CYCLE_ID_PATTERN = /^pilot-review-cycle\.[a-f0-9]{64}$/u;
export const PILOT_COMPLETE_SUBMISSION_MAX_BYTES = 5 * 1024 * 1024;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CURRENT_DRAFT_RECORD_VERSION = "1.1.0";
const LEGACY_DRAFT_RECORD_VERSION = "1.0.0";

export function createPilotSessionContext({
  reviewCycleId = UNASSIGNED_REVIEW_CYCLE_ID,
  packageManifestRawSha256 = UNASSIGNED_PACKAGE_MANIFEST_RAW_SHA256
} = {}) {
  const isUnassigned = reviewCycleId === UNASSIGNED_REVIEW_CYCLE_ID;
  if (isUnassigned) {
    if (packageManifestRawSha256 !== UNASSIGNED_PACKAGE_MANIFEST_RAW_SHA256) {
      throw new PilotContractError("开发预览的 package manifest 摘要必须明确为未分配。 ");
    }
    return Object.freeze({
      bindingMode: "development_preview_unassigned",
      reviewCycleId,
      packageManifestRawSha256
    });
  }
  if (!PILOT_REVIEW_CYCLE_ID_PATTERN.test(reviewCycleId)
    || !SHA256_PATTERN.test(packageManifestRawSha256)
    || packageManifestRawSha256 === UNASSIGNED_PACKAGE_MANIFEST_RAW_SHA256) {
    throw new PilotContractError("实体单席包必须绑定合法 opaque reviewCycleId 与非零 package manifest SHA-256。 ");
  }
  return Object.freeze({
    bindingMode: "physical_seat_package",
    reviewCycleId,
    packageManifestRawSha256
  });
}

export function assertPhysicalReviewCycleId(reviewCycleId) {
  if (typeof reviewCycleId !== "string" || !PILOT_REVIEW_CYCLE_ID_PATTERN.test(reviewCycleId)) {
    throw new PilotContractError("reviewCycleId 必须是 pilot-review-cycle. 加 64 位小写十六进制。 ");
  }
  return reviewCycleId;
}

export const RELEASE_GOVERNANCE = Object.freeze({
  releaseIdentity: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  schema13MutationEpochUsed: false,
  productStorageMutationPerformed: false
});

export const PILOT_AUTHORITY_BOUNDARY = Object.freeze({
  templateOnly: true,
  pilotOnly: true,
  countsTowardFormal2of2: false,
  countsTowardExpertGate: false,
  formalAdmissionAllowed: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  scientificValidityEstablished: false,
  releaseReady: false,
  expertClaimsAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  digitalSignatureEstablished: false,
  firstSeenEstablished: false,
  custodyEstablished: false,
  trustedTimeEstablished: false,
  trustedBootstrapEstablished: false,
  packageAuthenticityEstablished: false,
  pinProvenanceVerified: false,
  signature: false,
  samePrivilegeIntervalMutationExcluded: false,
  realPersonDistributionReady: false,
  sameCycleReplayExcluded: false
});

export const PILOT_PRIVACY_BOUNDARY = Object.freeze({
  personDataPresenceAssessed: false,
  personDerivedDigestExcluded: false,
  safeToPublish: false,
  handlingClassification: "private_off_repository_only",
  repositoryStorageAllowed: false,
  toolAutomaticUploadPerformed: false,
  downloadDestinationControlledByBrowserOrOperatingSystem: true,
  alternateDataStreamsEnumerated: false,
  alternateDataStreamsExcluded: false
});

const FACT_VALUES = new Set(["established", "not_established", "insufficient_information", "outside_tradition"]);
const POSITION_VALUES = new Set(["support", "oppose", "conditional", "cannot_decide"]);
const RISK_VALUES = new Set(["conservative_expression_only", "defer", "no_release", "not_applicable"]);
const STRUCTURE_VALUES = new Set(INVALIDATION_STRUCTURES);
const SCENARIO_IDS = SCENARIOS.map((scenario) => scenario.id);
const QUESTION_IDS = OVERALL_QUESTIONS.map((question) => question.id);
const MAX_IMPORT_BYTES = 1024 * 1024;
const SENSITIVE_TEXT_RULES = Object.freeze([
  Object.freeze({
    code: "explicit_person_name",
    pattern: /(?:(?:姓名|名字|专家名|审阅人|联系人)(?:名称)?\s*(?:[:：=]|为|是|叫)?\s*|(?:我|本人)\s*叫\s*|名叫\s*)[\p{Script=Han}A-Za-z·]{2,40}|本人\s*是\s*[\p{Script=Han}·]{2,4}(?=$|[，。；,;\s])/iu,
    message: "检测到显式姓名或联系人字段"
  }),
  Object.freeze({
    code: "contact_detail",
    pattern: /(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?86[- ]?)?1[3-9](?:[- ]?\d){9}|(?:电话(?:号|号码)?|手机(?:号|号码)?|微信(?:号|账号|ID)?|WeChat(?: ID| account)?|QQ(?:号|账号)?|邮箱(?:地址)?|邮件(?:地址)?|联系方式)\s*(?:[:：=]|为|是)?\s*[A-Za-z0-9._+@ -]{5,})/iu,
    message: "检测到联系方式"
  }),
  Object.freeze({
    code: "credential_or_identifier",
    pattern: /(?:\b\d{17}[\dXx]\b|(?:身份证(?:号|号码)?|护照(?:号|号码)?|证件(?:号|号码)?|执业证(?:号|号码)?|credential)\s*(?:[:：=]|为|是)?\s*[A-Za-z0-9-]{4,})/iu,
    message: "检测到证件或身份编号"
  }),
  Object.freeze({
    code: "birth_date",
    pattern: /(?:19|20)\d{2}\s*(?:[-/.年])\s*(?:0?[1-9]|1[0-2])\s*(?:[-/.月])\s*(?:0?[1-9]|[12]\d|3[01])\s*日?/iu,
    message: "检测到完整日期；本 pilot 不接收现实出生日期"
  }),
  Object.freeze({
    code: "birth_time",
    pattern: /(?:(?:[01]?\d|2[0-3])\s*(?::|：|时|点)\s*[0-5]\d\s*分?|(?:凌晨|早上|上午|中午|下午|傍晚|晚上)\s*[零〇一二两三四五六七八九十]{1,3}\s*点\s*(?:半|[零〇一二两三四五六七八九十]{1,3}\s*分)?\s*(?:出生)?|(?:出生时间|生于)\s*(?:[:：=]|为|是)?\s*[零〇一二两三四五六七八九十]{1,3}\s*点\s*(?:半|[零〇一二两三四五六七八九十]{1,3}\s*分)?)/iu,
    message: "检测到具体时间；本 pilot 不接收现实出生时间"
  }),
  Object.freeze({
    code: "location_or_address",
    pattern: /(?:(?:出生地|籍贯|现住址|家庭住址|居住地|地址|现居(?:住)?|住在)\s*(?:[:：=]|为|是)?\s*\S{2,}|-?\d{1,3}\.\d{3,}\s*[,，]\s*-?\d{1,3}\.\d{3,})/iu,
    message: "检测到地点、地址或坐标"
  }),
  Object.freeze({
    code: "institution_identity",
    pattern: /(?:机构|单位|学校|公司|协会|工作室)(?:名称)?\s*(?:[:：=]|为|是)\s*\S{2,}/iu,
    message: "检测到机构身份信息"
  }),
  Object.freeze({
    code: "real_case_narrative",
    pattern: /(?:(?:真实|实际|现实|本人|客户|来访者|当事人|命主).{0,10}(?:案例|个案|出生|生于|住址|病历|经历|事件)|(?:我有(?:一位|一个)?|我的|某一?位?|一位)\s*(?:客户|来访者|当事人|命主).{0,24})/iu,
    message: "检测到现实案例或个人经历叙述"
  }),
  Object.freeze({
    code: "sex_or_gender_identity",
    pattern: /(?:性别|男命|女命)\s*(?:[:：=]|为|是)?\s*(?:男|女)/iu,
    message: "检测到现实人物性别信息"
  })
]);

export class PilotContractError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "PilotContractError";
    this.errors = errors;
  }
}

function scanStrictJson(rawText, label) {
  let index = 0;
  let depth = 0;
  const fail = (message) => {
    throw new PilotContractError(`${label} 不是严格 JSON：${message}`);
  };
  const whitespace = /[\u0009\u000a\u000d\u0020]/u;
  const skipWhitespace = () => {
    while (index < rawText.length && whitespace.test(rawText[index])) index += 1;
  };
  const parseStringToken = () => {
    if (rawText[index] !== '"') fail("字符串起始符无效。 ");
    const start = index;
    index += 1;
    while (index < rawText.length) {
      const code = rawText.charCodeAt(index);
      if (rawText[index] === '"') {
        index += 1;
        try {
          return JSON.parse(rawText.slice(start, index));
        } catch {
          fail("字符串转义无效。 ");
        }
      }
      if (code < 0x20) fail("字符串含未转义控制字符。 ");
      if (rawText[index] === "\\") {
        index += 1;
        if (index >= rawText.length || !'"\\/bfnrtu'.includes(rawText[index])) fail("字符串转义无效。 ");
        if (rawText[index] === "u") {
          const hex = rawText.slice(index + 1, index + 5);
          if (!/^[a-fA-F0-9]{4}$/u.test(hex)) fail("Unicode 转义无效。 ");
          index += 4;
        }
      }
      index += 1;
    }
    fail("字符串未闭合。 ");
  };
  const parseValue = () => {
    skipWhitespace();
    if (depth > 128) fail("嵌套层级超过 128。 ");
    const token = rawText[index];
    if (token === '"') {
      parseStringToken();
      return;
    }
    if (token === "{") {
      depth += 1;
      index += 1;
      skipWhitespace();
      const keys = new Set();
      if (rawText[index] === "}") {
        index += 1;
        depth -= 1;
        return;
      }
      while (index < rawText.length) {
        skipWhitespace();
        const key = parseStringToken();
        if (keys.has(key)) fail(`对象含重复键 ${JSON.stringify(key)}。`);
        keys.add(key);
        skipWhitespace();
        if (rawText[index] !== ":") fail("对象键后缺少冒号。 ");
        index += 1;
        parseValue();
        skipWhitespace();
        if (rawText[index] === "}") {
          index += 1;
          depth -= 1;
          return;
        }
        if (rawText[index] !== ",") fail("对象成员分隔符无效。 ");
        index += 1;
      }
      fail("对象未闭合。 ");
    }
    if (token === "[") {
      depth += 1;
      index += 1;
      skipWhitespace();
      if (rawText[index] === "]") {
        index += 1;
        depth -= 1;
        return;
      }
      while (index < rawText.length) {
        parseValue();
        skipWhitespace();
        if (rawText[index] === "]") {
          index += 1;
          depth -= 1;
          return;
        }
        if (rawText[index] !== ",") fail("数组成员分隔符无效。 ");
        index += 1;
      }
      fail("数组未闭合。 ");
    }
    for (const literal of ["true", "false", "null"]) {
      if (rawText.startsWith(literal, index)) {
        index += literal.length;
        return;
      }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rawText.slice(index));
    if (!number) fail("值无效。 ");
    index += number[0].length;
  };
  skipWhitespace();
  parseValue();
  skipWhitespace();
  if (index !== rawText.length) fail("末尾含额外内容。 ");
}

export function parseStrictJsonText(rawText, {
  label = "输入",
  maxBytes = PILOT_COMPLETE_SUBMISSION_MAX_BYTES
} = {}) {
  if (typeof rawText !== "string") throw new PilotContractError(`${label} 必须是 UTF-8 文本。`);
  const byteLength = new TextEncoder().encode(rawText).byteLength;
  if (byteLength > maxBytes) throw new PilotContractError(`${label} 超过 ${maxBytes} 字节上限。`);
  if (rawText.charCodeAt(0) === 0xfeff) throw new PilotContractError(`${label} 不得包含 BOM。`);
  scanStrictJson(rawText, label);
  try {
    return JSON.parse(rawText);
  } catch {
    throw new PilotContractError(`${label} 不是有效 JSON。`);
  }
}

export function parseStrictJsonBytes(bytes, options = {}) {
  if (!(bytes instanceof Uint8Array)) throw new PilotContractError("输入必须是 Uint8Array。 ");
  const maxBytes = options.maxBytes ?? PILOT_COMPLETE_SUBMISSION_MAX_BYTES;
  if (bytes.byteLength > maxBytes) throw new PilotContractError(`输入超过 ${maxBytes} 字节上限。`);
  let rawText;
  try {
    rawText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new PilotContractError(`${options.label ?? "输入"} 不是严格 UTF-8。`);
  }
  return parseStrictJsonText(rawText, { ...options, maxBytes });
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) throw new PilotContractError(`${label} 必须是普通 JSON 对象。`);
}

function assertExactKeys(value, expected, label) {
  assertPlainObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new PilotContractError(`${label} 字段集合不匹配。`);
  }
}

function assertJsonTree(value, path = "root", seen = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new PilotContractError(`${path} 含非有限数值。`);
    return;
  }
  if (typeof value !== "object") throw new PilotContractError(`${path} 含非 JSON 值。`);
  if (seen.has(value)) throw new PilotContractError(`${path} 含循环引用。`);
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) throw new PilotContractError(`${path} 含稀疏数组。`);
      assertJsonTree(value[index], `${path}[${index}]`, seen);
    }
  } else {
    assertPlainObject(value, path);
    for (const [key, child] of Object.entries(value)) assertJsonTree(child, `${path}.${key}`, seen);
  }
  seen.delete(value);
}

export function canonicalStringify(value) {
  assertJsonTree(value);
  const visit = (entry) => {
    if (entry === null || typeof entry !== "object") return JSON.stringify(entry);
    if (Array.isArray(entry)) return `[${entry.map(visit).join(",")}]`;
    return `{${Object.keys(entry).sort().map((key) => `${JSON.stringify(key)}:${visit(entry[key])}`).join(",")}}`;
  };
  return visit(value);
}

export async function sha256HexBytes(bytes) {
  if (!globalThis.crypto?.subtle) throw new PilotContractError("当前浏览器不支持本地 SHA-256 文件校验。");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256HexText(value) {
  return sha256HexBytes(new TextEncoder().encode(value));
}

async function domainDigest(domain, value) {
  return sha256HexText(`${domain}\u0000${canonicalStringify(value)}`);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreezeJson(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreezeJson(child, seen);
  return Object.freeze(value);
}

function emptyCaseResponse(scenarioId) {
  return {
    scenarioId,
    factAssessment: "",
    rulePosition: "",
    reason: "",
    applicabilityConditions: "",
    counterexamples: "",
    invalidationStructures: [],
    highRiskDisposition: "",
    revisionSuggestion: ""
  };
}

function emptyOverallResponse(questionId) {
  return {
    questionId,
    position: "",
    expertOriginalText: "",
    rationale: "",
    uncertainties: ""
  };
}

export async function computeSessionDigests(seatId) {
  if (!(seatId in SEAT_ORDERS)) throw new PilotContractError("seat 只能是 A 或 B。");
  const orderedScenarios = [...SCENARIOS].sort((left, right) => left.id.localeCompare(right.id));
  return Object.freeze({
    scenarioSetDigest: await domainDigest("hakimi/bazi-expert-pilot/scenario-set/v1", orderedScenarios),
    questionSetDigest: await domainDigest("hakimi/bazi-expert-pilot/question-set/v1", OVERALL_QUESTIONS),
    entryOrderDigest: await domainDigest("hakimi/bazi-expert-pilot/entry-order/v1", SEAT_ORDERS[seatId])
  });
}

export async function createPilotDraft(seatId, sessionContext = createPilotSessionContext()) {
  const normalizedSession = createPilotSessionContext(sessionContext);
  const digests = await computeSessionDigests(seatId);
  return {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_draft_v1",
    recordVersion: CURRENT_DRAFT_RECORD_VERSION,
    reviewPurpose: PILOT_REVIEW_PURPOSE,
    seatId,
    finalized: false,
    releaseGovernance: cloneJson(RELEASE_GOVERNANCE),
    authorityBoundary: cloneJson(PILOT_AUTHORITY_BOUNDARY),
    privacyBoundary: cloneJson(PILOT_PRIVACY_BOUNDARY),
    sessionBinding: {
      pilotPackId: PILOT_PACK_ID,
      templateVersion: PILOT_TEMPLATE_VERSION,
      scenarioIds: [...SCENARIO_IDS],
      questionIds: [...QUESTION_IDS],
      entryOrder: [...SEAT_ORDERS[seatId]],
      ...digests,
      bindingMode: normalizedSession.bindingMode,
      reviewCycleId: normalizedSession.reviewCycleId,
      packageManifestRawSha256: normalizedSession.packageManifestRawSha256,
      sourceTemplateStatus: "historical_candidate_not_current_formal_packet"
    },
    acknowledgements: {
      pilotOnly: false,
      syntheticOnly: false,
      noCrossOpinionAccess: false,
      privateOffRepositoryHandling: false
    },
    reviewerSelfDescription: {
      selfDescribedTradition: "",
      selfDescribedScope: ""
    },
    caseResponses: Object.fromEntries(SCENARIO_IDS.map((id) => [id, emptyCaseResponse(id)])),
    overallResponses: Object.fromEntries(QUESTION_IDS.map((id) => [id, emptyOverallResponse(id)])),
    usabilityFeedback: {
      clarityRating: "",
      difficultTerms: "",
      workflowComments: ""
    }
  };
}

function assertFixedObject(actual, expected, label) {
  if (canonicalStringify(actual) !== canonicalStringify(expected)) {
    throw new PilotContractError(`${label} 固定边界被改写。`);
  }
}

function assertString(value, label, max = 4000) {
  if (typeof value !== "string" || value.length > max) throw new PilotContractError(`${label} 必须是长度受限字符串。`);
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string") || new Set(value).size !== value.length) {
    throw new PilotContractError(`${label} 必须是不重复字符串数组。`);
  }
}

function sessionContextFromBinding(binding) {
  return createPilotSessionContext({
    reviewCycleId: binding?.reviewCycleId,
    packageManifestRawSha256: binding?.packageManifestRawSha256
  });
}

function assertExpectedSessionContext(binding, expectedSessionContext) {
  const actual = sessionContextFromBinding(binding);
  if (binding.bindingMode !== actual.bindingMode) throw new PilotContractError("session binding mode 无效。 ");
  if (expectedSessionContext !== null && expectedSessionContext !== undefined) {
    const expected = createPilotSessionContext(expectedSessionContext);
    if (canonicalStringify(actual) !== canonicalStringify(expected)) {
      throw new PilotContractError("草稿不属于当前 review cycle 或物理单席包。 ");
    }
  }
  return actual;
}

export async function assertPilotDraftStructure(
  draft,
  expectedSeat = draft?.seatId,
  expectedSessionContext = null
) {
  assertJsonTree(draft);
  assertExactKeys(draft, [
    "schemaVersion", "recordType", "recordVersion", "reviewPurpose", "seatId", "finalized",
    "releaseGovernance", "authorityBoundary", "privacyBoundary", "sessionBinding", "acknowledgements",
    "reviewerSelfDescription", "caseResponses", "overallResponses", "usabilityFeedback"
  ], "pilot draft");
  if (draft.schemaVersion !== "1.0.0" || draft.recordVersion !== CURRENT_DRAFT_RECORD_VERSION
    || draft.recordType !== "bazi_expert_pilot_draft_v1" || draft.reviewPurpose !== PILOT_REVIEW_PURPOSE
    || !["A", "B"].includes(draft.seatId) || draft.seatId !== expectedSeat || draft.finalized !== false) {
    throw new PilotContractError("pilot draft 身份、seat 或状态无效。");
  }
  assertFixedObject(draft.releaseGovernance, RELEASE_GOVERNANCE, "release governance");
  assertFixedObject(draft.authorityBoundary, PILOT_AUTHORITY_BOUNDARY, "authority boundary");
  assertFixedObject(draft.privacyBoundary, PILOT_PRIVACY_BOUNDARY, "privacy boundary");

  assertExactKeys(draft.sessionBinding, [
    "pilotPackId", "templateVersion", "scenarioIds", "questionIds", "entryOrder",
    "scenarioSetDigest", "questionSetDigest", "entryOrderDigest", "bindingMode", "reviewCycleId",
    "packageManifestRawSha256", "sourceTemplateStatus"
  ], "session binding");
  if (draft.sessionBinding.pilotPackId !== PILOT_PACK_ID
    || draft.sessionBinding.templateVersion !== PILOT_TEMPLATE_VERSION
    || draft.sessionBinding.sourceTemplateStatus !== "historical_candidate_not_current_formal_packet"
    || canonicalStringify(draft.sessionBinding.scenarioIds) !== canonicalStringify(SCENARIO_IDS)
      || canonicalStringify(draft.sessionBinding.questionIds) !== canonicalStringify(QUESTION_IDS)
      || canonicalStringify(draft.sessionBinding.entryOrder) !== canonicalStringify(SEAT_ORDERS[draft.seatId])) {
    throw new PilotContractError("session binding 固定集合或顺序无效。");
  }
  assertExpectedSessionContext(draft.sessionBinding, expectedSessionContext);
  const digests = await computeSessionDigests(draft.seatId);
  for (const key of ["scenarioSetDigest", "questionSetDigest", "entryOrderDigest"]) {
    if (draft.sessionBinding[key] !== digests[key]) throw new PilotContractError(`session binding ${key} 摘要失配。`);
  }

  assertExactKeys(draft.acknowledgements, [
    "pilotOnly", "syntheticOnly", "noCrossOpinionAccess", "privateOffRepositoryHandling"
  ], "acknowledgements");
  for (const value of Object.values(draft.acknowledgements)) {
    if (typeof value !== "boolean") throw new PilotContractError("acknowledgements 只能包含布尔值。");
  }
  assertExactKeys(draft.reviewerSelfDescription, ["selfDescribedTradition", "selfDescribedScope"], "reviewer self-description");
  assertString(draft.reviewerSelfDescription.selfDescribedTradition, "self-described tradition", 1000);
  assertString(draft.reviewerSelfDescription.selfDescribedScope, "self-described scope", 2000);

  assertExactKeys(draft.caseResponses, SCENARIO_IDS, "case responses");
  for (const scenarioId of SCENARIO_IDS) {
    const response = draft.caseResponses[scenarioId];
    assertExactKeys(response, [
      "scenarioId", "factAssessment", "rulePosition", "reason", "applicabilityConditions",
      "counterexamples", "invalidationStructures", "highRiskDisposition", "revisionSuggestion"
    ], `case response ${scenarioId}`);
    if (response.scenarioId !== scenarioId) throw new PilotContractError(`${scenarioId} response 身份失配。`);
    for (const key of ["factAssessment", "rulePosition", "reason", "applicabilityConditions", "counterexamples", "highRiskDisposition", "revisionSuggestion"]) {
      assertString(response[key], `${scenarioId}.${key}`);
    }
    assertStringArray(response.invalidationStructures, `${scenarioId}.invalidationStructures`);
    if (response.invalidationStructures.some((value) => !STRUCTURE_VALUES.has(value))) {
      throw new PilotContractError(`${scenarioId} 含未知失效结构。`);
    }
    if (response.invalidationStructures.length > 1
      && (response.invalidationStructures.includes("无") || response.invalidationStructures.includes("无法判断"))) {
      throw new PilotContractError(`${scenarioId} 的“无/无法判断”不能与其他结构并选。`);
    }
  }

  assertExactKeys(draft.overallResponses, QUESTION_IDS, "overall responses");
  for (const questionId of QUESTION_IDS) {
    const response = draft.overallResponses[questionId];
    assertExactKeys(response, ["questionId", "position", "expertOriginalText", "rationale", "uncertainties"], `overall response ${questionId}`);
    if (response.questionId !== questionId) throw new PilotContractError(`${questionId} response 身份失配。`);
    for (const key of ["position", "expertOriginalText", "rationale", "uncertainties"]) {
      assertString(response[key], `${questionId}.${key}`);
    }
  }

  assertExactKeys(draft.usabilityFeedback, ["clarityRating", "difficultTerms", "workflowComments"], "usability feedback");
  for (const key of ["clarityRating", "difficultTerms", "workflowComments"]) {
    assertString(draft.usabilityFeedback[key], `usabilityFeedback.${key}`);
  }
  return true;
}

function missingText(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function freeTextEntries(draft) {
  const entries = [
    ["reviewerSelfDescription.selfDescribedTradition", draft.reviewerSelfDescription.selfDescribedTradition],
    ["reviewerSelfDescription.selfDescribedScope", draft.reviewerSelfDescription.selfDescribedScope]
  ];
  for (const scenarioId of SCENARIO_IDS) {
    const response = draft.caseResponses[scenarioId];
    for (const key of ["reason", "applicabilityConditions", "counterexamples", "revisionSuggestion"]) {
      entries.push([`caseResponses.${scenarioId}.${key}`, response[key]]);
    }
  }
  for (const questionId of QUESTION_IDS) {
    const response = draft.overallResponses[questionId];
    for (const key of ["expertOriginalText", "rationale", "uncertainties"]) {
      entries.push([`overallResponses.${questionId}.${key}`, response[key]]);
    }
  }
  entries.push(
    ["usabilityFeedback.difficultTerms", draft.usabilityFeedback.difficultTerms],
    ["usabilityFeedback.workflowComments", draft.usabilityFeedback.workflowComments]
  );
  return entries;
}

export function collectPilotSensitiveDataErrors(draft) {
  const errors = [];
  for (const [path, value] of freeTextEntries(draft)) {
    if (typeof value !== "string" || value.length === 0) continue;
    const normalized = value.normalize("NFKC");
    const rule = SENSITIVE_TEXT_RULES.find((candidate) => candidate.pattern.test(normalized));
    if (rule) {
      errors.push({
        path,
        code: rule.code,
        message: `${rule.message}；请删除现实资料后再继续。该启发式预检不构成匿名证明。`
      });
    }
  }
  return errors;
}

export async function collectDraftExportErrors(draft) {
  try {
    await assertPilotDraftStructure(draft);
  } catch (error) {
    return [{ path: "contract", message: error instanceof Error ? error.message : "draft 结构无效" }];
  }
  const errors = collectPilotSensitiveDataErrors(draft);
  if (draft.acknowledgements.privateOffRepositoryHandling !== true) {
    errors.push({
      path: "acknowledgements.privateOffRepositoryHandling",
      code: "private_handling_acknowledgement_required",
      message: "导出前请确认：工具未主动上传，但下载位置由浏览器/系统决定；文件仅按私密、仓外材料处理。"
    });
  }
  return errors;
}

export async function assertPilotDraftExportable(draft) {
  const errors = await collectDraftExportErrors(draft);
  if (errors.length > 0) throw new PilotContractError("草稿导出隐私预检失败。", errors);
  return true;
}

export async function collectFinalizeErrors(draft) {
  try {
    await assertPilotDraftStructure(draft);
  } catch (error) {
    return [{ path: "contract", message: error instanceof Error ? error.message : "draft 结构无效" }];
  }
  const errors = collectPilotSensitiveDataErrors(draft);
  for (const [key, value] of Object.entries(draft.acknowledgements)) {
    if (value !== true) errors.push({ path: `acknowledgements.${key}`, message: "请确认本项边界。" });
  }
  for (const [key, value] of Object.entries(draft.reviewerSelfDescription)) {
    if (missingText(value)) errors.push({ path: `reviewerSelfDescription.${key}`, message: "请填写自述流派与复核范围；不要填写个人身份资料。" });
  }
  for (const scenarioId of SCENARIO_IDS) {
    const response = draft.caseResponses[scenarioId];
    if (!FACT_VALUES.has(response.factAssessment)) errors.push({ path: `caseResponses.${scenarioId}.factAssessment`, message: `${scenarioId} 请选择命盘事实是否正确。` });
    if (!POSITION_VALUES.has(response.rulePosition)) errors.push({ path: `caseResponses.${scenarioId}.rulePosition`, message: `${scenarioId} 请选择对当前规则的意见。` });
    for (const key of ["reason", "applicabilityConditions", "counterexamples", "revisionSuggestion"]) {
      if (missingText(response[key])) errors.push({ path: `caseResponses.${scenarioId}.${key}`, message: `${scenarioId} 请填写该字段；没有时可填写“无”。` });
    }
    if (response.invalidationStructures.length === 0) errors.push({ path: `caseResponses.${scenarioId}.invalidationStructures`, message: `${scenarioId} 请选择至少一个可能失效结构、无或无法判断。` });
    if (!RISK_VALUES.has(response.highRiskDisposition)) errors.push({ path: `caseResponses.${scenarioId}.highRiskDisposition`, message: `${scenarioId} 请选择这类结论应怎样呈现。` });
  }
  for (const questionId of QUESTION_IDS) {
    const response = draft.overallResponses[questionId];
    if (!POSITION_VALUES.has(response.position)) errors.push({ path: `overallResponses.${questionId}.position`, message: "请选择总体意见。" });
    for (const key of ["expertOriginalText", "rationale", "uncertainties"]) {
      if (missingText(response[key])) errors.push({ path: `overallResponses.${questionId}.${key}`, message: "请填写专家原文、理由与不确定点；没有时可填写“无”。" });
    }
  }
  if (!new Set(["1", "2", "3", "4", "5"]).has(draft.usabilityFeedback.clarityRating)) {
    errors.push({ path: "usabilityFeedback.clarityRating", message: "请选择易懂程度。" });
  }
  for (const key of ["difficultTerms", "workflowComments"]) {
    if (missingText(draft.usabilityFeedback[key])) errors.push({ path: `usabilityFeedback.${key}`, message: "请填写易用性反馈；没有时可填写“无”。" });
  }
  return errors;
}

export function serializeUtf8Json(value) {
  assertJsonTree(value);
  return `${JSON.stringify(value, null, 2)}\n`;
}

function migrateLegacyUnassignedDraft(parsed, expectedSessionContext) {
  if (parsed?.recordType !== "bazi_expert_pilot_draft_v1"
    || parsed?.recordVersion !== LEGACY_DRAFT_RECORD_VERSION) return parsed;
  const expected = createPilotSessionContext(expectedSessionContext ?? {});
  if (expected.bindingMode !== "development_preview_unassigned") {
    throw new PilotContractError("旧版未绑定草稿只能在明确的开发预览中恢复，不能导入实体单席包。 ");
  }
  assertExactKeys(parsed.sessionBinding, [
    "pilotPackId", "templateVersion", "scenarioIds", "questionIds", "entryOrder",
    "scenarioSetDigest", "questionSetDigest", "entryOrderDigest", "sourceTemplateStatus"
  ], "legacy session binding");
  if (parsed.sessionBinding.templateVersion !== "hakimi.bazi.expert-review-pilot-template/0.1.0") {
    throw new PilotContractError("旧版草稿模板身份无效。 ");
  }
  return {
    ...parsed,
    recordVersion: CURRENT_DRAFT_RECORD_VERSION,
    sessionBinding: {
      ...parsed.sessionBinding,
      pilotPackId: PILOT_PACK_ID,
      templateVersion: PILOT_TEMPLATE_VERSION,
      bindingMode: expected.bindingMode,
      reviewCycleId: expected.reviewCycleId,
      packageManifestRawSha256: expected.packageManifestRawSha256
    }
  };
}

export async function parsePilotDraft(rawText, expectedSeat, expectedSessionContext = createPilotSessionContext()) {
  let parsed;
  try {
    parsed = parseStrictJsonText(rawText, { label: "导入草稿", maxBytes: MAX_IMPORT_BYTES });
  } catch (cause) {
    if (cause instanceof PilotContractError) throw cause;
    throw new PilotContractError("导入文件不是有效 JSON。", [{ path: "import", message: "严格 JSON 解析失败。" }]);
  }
  parsed = migrateLegacyUnassignedDraft(parsed, expectedSessionContext);
  await assertPilotDraftStructure(parsed, expectedSeat, expectedSessionContext);
  const sensitiveDataErrors = collectPilotSensitiveDataErrors(parsed);
  if (sensitiveDataErrors.length > 0) {
    throw new PilotContractError("导入草稿包含禁止的敏感资料。", sensitiveDataErrors);
  }
  return parsed;
}

function projectCaseResponses(draft) {
  return SCENARIO_IDS.map((scenarioId) => cloneJson(draft.caseResponses[scenarioId]));
}

function projectOverallResponses(draft) {
  return QUESTION_IDS.map((questionId) => cloneJson(draft.overallResponses[questionId]));
}

export async function buildFinalArtifacts(draft, clientClock = new Date()) {
  const errors = await collectFinalizeErrors(draft);
  if (errors.length > 0) throw new PilotContractError("封存前仍有必填项未完成。", errors);
  const clientClockFinalizedAt = clientClock.toISOString();
  const opinionUnsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_opinion_v1",
    recordVersion: "1.1.0",
    recordId: `${PILOT_PACK_ID}/${draft.sessionBinding.reviewCycleId}/seat-${draft.seatId.toLowerCase()}/original`,
    reviewPurpose: PILOT_REVIEW_PURPOSE,
    seatId: draft.seatId,
    clientClockFinalizedAt,
    clientClockIsTrustedTime: false,
    releaseGovernance: cloneJson(RELEASE_GOVERNANCE),
    authorityBoundary: cloneJson(PILOT_AUTHORITY_BOUNDARY),
    privacyBoundary: cloneJson(PILOT_PRIVACY_BOUNDARY),
    sessionBinding: cloneJson(draft.sessionBinding),
    reviewerSelfDescription: cloneJson(draft.reviewerSelfDescription),
    noCrossOpinionAccessSelfDeclared: draft.acknowledgements.noCrossOpinionAccess,
    caseResponses: projectCaseResponses(draft),
    overallQuestionResponses: projectOverallResponses(draft),
    expertTextTransformationApplied: false,
    originalsOverwritten: false
  };
  const recordDigest = await domainDigest("hakimi/bazi-expert-pilot/opinion-record/v1", opinionUnsigned);
  const opinionRecord = {
    ...opinionUnsigned,
    integrity: {
      hashAlgorithm: "SHA-256",
      digestDomain: "hakimi/bazi-expert-pilot/opinion-record/v1",
      recordDigest,
      digestIsDigitalSignature: false,
      authenticityEstablished: false
    }
  };
  const opinionFilename = `hakimi-bazi-pilot-seat-${draft.seatId.toLowerCase()}-original-opinion.json`;
  const opinionText = serializeUtf8Json(opinionRecord);
  const opinionBytes = new TextEncoder().encode(opinionText);
  const rawOpinionSha256 = await sha256HexBytes(opinionBytes);

  const usabilityUnsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_usability_feedback_v1",
    recordVersion: "1.1.0",
    reviewPurpose: "pilot_interface_usability_only",
    seatId: draft.seatId,
    clientClockFinalizedAt,
    clientClockIsTrustedTime: false,
    sessionBinding: cloneJson(draft.sessionBinding),
    usabilityFeedback: cloneJson(draft.usabilityFeedback),
    partOfDomainOpinion: false,
    authorityBoundary: cloneJson(PILOT_AUTHORITY_BOUNDARY),
    privacyBoundary: cloneJson(PILOT_PRIVACY_BOUNDARY)
  };
  const usabilityDigest = await domainDigest("hakimi/bazi-expert-pilot/usability-record/v1", usabilityUnsigned);
  const usabilityRecord = {
    ...usabilityUnsigned,
    integrity: {
      hashAlgorithm: "SHA-256",
      digestDomain: "hakimi/bazi-expert-pilot/usability-record/v1",
      recordDigest: usabilityDigest,
      digestIsDigitalSignature: false,
      authenticityEstablished: false
    }
  };
  const usabilityFilename = `hakimi-bazi-pilot-seat-${draft.seatId.toLowerCase()}-usability.json`;
  const usabilityText = serializeUtf8Json(usabilityRecord);

  const sealUnsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_file_seal_receipt_v1",
    recordVersion: "1.1.0",
    reviewPurpose: PILOT_REVIEW_PURPOSE,
    seatId: draft.seatId,
    pilotPackId: PILOT_PACK_ID,
    sessionBinding: cloneJson(draft.sessionBinding),
    opinionRef: { recordId: opinionRecord.recordId, recordDigest },
    privacyBoundary: cloneJson(PILOT_PRIVACY_BOUNDARY),
    rawOpinionArtifact: {
      filename: opinionFilename,
      mediaType: "application/json",
      encoding: "utf-8",
      byteLength: opinionBytes.byteLength,
      sha256: rawOpinionSha256
    },
    clientClockFinalizedAt,
    clientClockIsTrustedTime: false,
    digestIsDigitalSignature: false,
    authenticityEstablished: false,
    firstSeenEstablished: false,
    custodyEstablished: false,
    toolAutomaticUploadPerformed: false
  };
  const sealDigest = await domainDigest("hakimi/bazi-expert-pilot/file-seal-receipt/v1", sealUnsigned);
  const sealReceipt = {
    ...sealUnsigned,
    integrity: {
      hashAlgorithm: "SHA-256",
      digestDomain: "hakimi/bazi-expert-pilot/file-seal-receipt/v1",
      recordDigest: sealDigest,
      digestIsDigitalSignature: false,
      authenticityEstablished: false
    }
  };
  const sealFilename = `hakimi-bazi-pilot-seat-${draft.seatId.toLowerCase()}-seal-receipt.json`;
  const sealText = serializeUtf8Json(sealReceipt);
  const shaFilename = `${opinionFilename}.sha256.txt`;
  const shaText = `${rawOpinionSha256}  ${opinionFilename}\n`;
  const embeddedFiles = [
    {
      role: "domain_opinion_original",
      filename: opinionFilename,
      mediaType: "application/json",
      rawSha256: rawOpinionSha256,
      exactUtf8Text: opinionText
    },
    {
      role: "usability_feedback_separate_from_domain_opinion",
      filename: usabilityFilename,
      mediaType: "application/json",
      rawSha256: await sha256HexText(usabilityText),
      exactUtf8Text: usabilityText
    },
    {
      role: "file_seal_receipt",
      filename: sealFilename,
      mediaType: "application/json",
      rawSha256: await sha256HexText(sealText),
      exactUtf8Text: sealText
    },
    {
      role: "opinion_checksum_text",
      filename: shaFilename,
      mediaType: "text/plain",
      rawSha256: await sha256HexText(shaText),
      exactUtf8Text: shaText
    }
  ];
  const completePackageUnsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_complete_submission_package_v1",
    recordVersion: "1.1.0",
    reviewPurpose: PILOT_REVIEW_PURPOSE,
    seatId: draft.seatId,
    pilotPackId: PILOT_PACK_ID,
    sessionBinding: cloneJson(draft.sessionBinding),
    logicalArtifactsRemainSeparate: true,
    usabilityIsPartOfDomainOpinion: false,
    distributionAuthorized: false,
    toolAutomaticUploadPerformed: false,
    authorityBoundary: cloneJson(PILOT_AUTHORITY_BOUNDARY),
    privacyBoundary: cloneJson(PILOT_PRIVACY_BOUNDARY),
    embeddedFiles
  };
  const completePackageDigest = await domainDigest(
    "hakimi/bazi-expert-pilot/complete-submission-package/v1",
    completePackageUnsigned
  );
  const completePackageRecord = {
    ...completePackageUnsigned,
    integrity: {
      hashAlgorithm: "SHA-256",
      digestDomain: "hakimi/bazi-expert-pilot/complete-submission-package/v1",
      recordDigest: completePackageDigest,
      digestIsDigitalSignature: false,
      authenticityEstablished: false
    }
  };
  const completePackageFilename = `hakimi-bazi-pilot-seat-${draft.seatId.toLowerCase()}-complete-submission.json`;
  const completePackageText = serializeUtf8Json(completePackageRecord);
  return deepFreezeJson({
    opinionRecord,
    opinionFilename,
    opinionText,
    usabilityRecord,
    usabilityFilename,
    usabilityText,
    sealReceipt,
    sealFilename,
    sealText,
    shaFilename,
    shaText,
    completePackageRecord,
    completePackageFilename,
    completePackageText,
    completePackageDigest,
    completePackageRawSha256: await sha256HexText(completePackageText),
    recordDigest,
    rawOpinionSha256
  });
}

function assertSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new PilotContractError(`${label} 必须是小写 SHA-256。`);
  }
}

function assertCanonicalClientClock(value, label) {
  if (typeof value !== "string") throw new PilotContractError(`${label} 必须是字符串。`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new PilotContractError(`${label} 必须是严格毫秒级 UTC 时间。`);
  }
}

async function assertPilotRecordIntegrity(record, digestDomain, label) {
  assertExactKeys(record.integrity, [
    "hashAlgorithm", "digestDomain", "recordDigest", "digestIsDigitalSignature", "authenticityEstablished"
  ], `${label}.integrity`);
  assertSha256(record.integrity.recordDigest, `${label}.integrity.recordDigest`);
  const { integrity: _integrity, ...unsigned } = record;
  const expectedDigest = await domainDigest(digestDomain, unsigned);
  if (record.integrity.hashAlgorithm !== "SHA-256"
    || record.integrity.digestDomain !== digestDomain
    || record.integrity.recordDigest !== expectedDigest
    || record.integrity.digestIsDigitalSignature !== false
    || record.integrity.authenticityEstablished !== false) {
    throw new PilotContractError(`${label} integrity 失配或越权。`);
  }
}

function assertEmbeddedFile(entry, expected, index) {
  assertExactKeys(entry, ["role", "filename", "mediaType", "rawSha256", "exactUtf8Text"], `embeddedFiles.${index}`);
  if (entry.role !== expected.role || entry.filename !== expected.filename || entry.mediaType !== expected.mediaType) {
    throw new PilotContractError(`embeddedFiles.${index} 身份无效。`);
  }
  if (/[\\/:]/u.test(entry.filename) || entry.filename === "." || entry.filename === "..") {
    throw new PilotContractError(`embeddedFiles.${index}.filename 含路径或 ADS 语义。`);
  }
  assertString(entry.exactUtf8Text, `embeddedFiles.${index}.exactUtf8Text`, PILOT_COMPLETE_SUBMISSION_MAX_BYTES);
  assertSha256(entry.rawSha256, `embeddedFiles.${index}.rawSha256`);
}

function finalizedDraftProjection(opinion, usability) {
  if (!Array.isArray(opinion.caseResponses) || opinion.caseResponses.length !== SCENARIO_IDS.length) {
    throw new PilotContractError("opinion caseResponses 必须精确覆盖五个场景。 ");
  }
  if (!Array.isArray(opinion.overallQuestionResponses) || opinion.overallQuestionResponses.length !== QUESTION_IDS.length) {
    throw new PilotContractError("opinion overallQuestionResponses 必须精确覆盖四题。 ");
  }
  const caseResponses = {};
  for (let index = 0; index < SCENARIO_IDS.length; index += 1) {
    const response = opinion.caseResponses[index];
    if (response?.scenarioId !== SCENARIO_IDS[index]) throw new PilotContractError("opinion 场景顺序或身份失配。 ");
    caseResponses[response.scenarioId] = cloneJson(response);
  }
  const overallResponses = {};
  for (let index = 0; index < QUESTION_IDS.length; index += 1) {
    const response = opinion.overallQuestionResponses[index];
    if (response?.questionId !== QUESTION_IDS[index]) throw new PilotContractError("opinion 四题顺序或身份失配。 ");
    overallResponses[response.questionId] = cloneJson(response);
  }
  return {
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_draft_v1",
    recordVersion: CURRENT_DRAFT_RECORD_VERSION,
    reviewPurpose: PILOT_REVIEW_PURPOSE,
    seatId: opinion.seatId,
    finalized: false,
    releaseGovernance: cloneJson(opinion.releaseGovernance),
    authorityBoundary: cloneJson(opinion.authorityBoundary),
    privacyBoundary: cloneJson(opinion.privacyBoundary),
    sessionBinding: cloneJson(opinion.sessionBinding),
    acknowledgements: {
      pilotOnly: true,
      syntheticOnly: true,
      noCrossOpinionAccess: opinion.noCrossOpinionAccessSelfDeclared,
      privateOffRepositoryHandling: true
    },
    reviewerSelfDescription: cloneJson(opinion.reviewerSelfDescription),
    caseResponses,
    overallResponses,
    usabilityFeedback: cloneJson(usability.usabilityFeedback)
  };
}

export async function preflightPilotCompleteSubmissionBytes(bytes, expectedSession) {
  const completePackage = parseStrictJsonBytes(bytes, {
    label: "完整提交资料",
    maxBytes: PILOT_COMPLETE_SUBMISSION_MAX_BYTES
  });
  assertPlainObject(expectedSession, "expected session");
  assertExactKeys(expectedSession, ["seatId", "reviewCycleId", "packageManifestRawSha256"], "expected session");
  if (!new Set(["A", "B"]).has(expectedSession.seatId)) throw new PilotContractError("expected seat 无效。 ");
  const expectedContext = createPilotSessionContext(expectedSession);
  if (expectedContext.bindingMode !== "physical_seat_package") {
    throw new PilotContractError("回件只接受实体单席 package binding。 ");
  }

  assertExactKeys(completePackage, [
    "schemaVersion", "recordType", "recordVersion", "reviewPurpose", "seatId", "pilotPackId",
    "sessionBinding", "logicalArtifactsRemainSeparate", "usabilityIsPartOfDomainOpinion",
    "distributionAuthorized", "toolAutomaticUploadPerformed", "authorityBoundary", "privacyBoundary",
    "embeddedFiles", "integrity"
  ], "complete submission");
  if (completePackage.schemaVersion !== "1.0.0"
    || completePackage.recordType !== "bazi_expert_pilot_complete_submission_package_v1"
    || completePackage.recordVersion !== "1.1.0"
    || completePackage.reviewPurpose !== PILOT_REVIEW_PURPOSE
    || completePackage.seatId !== expectedSession.seatId
    || completePackage.pilotPackId !== PILOT_PACK_ID
    || completePackage.logicalArtifactsRemainSeparate !== true
    || completePackage.usabilityIsPartOfDomainOpinion !== false
    || completePackage.distributionAuthorized !== false
    || completePackage.toolAutomaticUploadPerformed !== false) {
    throw new PilotContractError("complete submission 身份、seat 或固定边界无效。 ");
  }
  assertFixedObject(completePackage.authorityBoundary, PILOT_AUTHORITY_BOUNDARY, "complete authority boundary");
  assertFixedObject(completePackage.privacyBoundary, PILOT_PRIVACY_BOUNDARY, "complete privacy boundary");
  assertExpectedSessionContext(completePackage.sessionBinding, expectedContext);
  await assertPilotRecordIntegrity(
    completePackage,
    "hakimi/bazi-expert-pilot/complete-submission-package/v1",
    "complete submission"
  );

  if (!Array.isArray(completePackage.embeddedFiles) || completePackage.embeddedFiles.length !== 4) {
    throw new PilotContractError("完整提交资料必须精确包含四个逻辑工件。 ");
  }
  const seatLower = expectedSession.seatId.toLowerCase();
  const expectedEmbedded = [
    {
      role: "domain_opinion_original",
      filename: `hakimi-bazi-pilot-seat-${seatLower}-original-opinion.json`,
      mediaType: "application/json"
    },
    {
      role: "usability_feedback_separate_from_domain_opinion",
      filename: `hakimi-bazi-pilot-seat-${seatLower}-usability.json`,
      mediaType: "application/json"
    },
    {
      role: "file_seal_receipt",
      filename: `hakimi-bazi-pilot-seat-${seatLower}-seal-receipt.json`,
      mediaType: "application/json"
    },
    {
      role: "opinion_checksum_text",
      filename: `hakimi-bazi-pilot-seat-${seatLower}-original-opinion.json.sha256.txt`,
      mediaType: "text/plain"
    }
  ];
  for (let index = 0; index < expectedEmbedded.length; index += 1) {
    const entry = completePackage.embeddedFiles[index];
    assertEmbeddedFile(entry, expectedEmbedded[index], index);
    if (entry.rawSha256 !== await sha256HexText(entry.exactUtf8Text)) {
      throw new PilotContractError(`embeddedFiles.${index} 原始字节摘要不匹配。`);
    }
  }

  const [opinionEntry, usabilityEntry, sealEntry, checksumEntry] = completePackage.embeddedFiles;
  const opinion = parseStrictJsonText(opinionEntry.exactUtf8Text, { label: "领域试填原样记录" });
  const usability = parseStrictJsonText(usabilityEntry.exactUtf8Text, { label: "易用性反馈" });
  const seal = parseStrictJsonText(sealEntry.exactUtf8Text, { label: "pilot 文件校验回执" });

  assertExactKeys(opinion, [
    "schemaVersion", "recordType", "recordVersion", "recordId", "reviewPurpose", "seatId",
    "clientClockFinalizedAt", "clientClockIsTrustedTime", "releaseGovernance", "authorityBoundary",
    "privacyBoundary", "sessionBinding", "reviewerSelfDescription", "noCrossOpinionAccessSelfDeclared",
    "caseResponses", "overallQuestionResponses", "expertTextTransformationApplied", "originalsOverwritten",
    "integrity"
  ], "pilot opinion");
  if (opinion.schemaVersion !== "1.0.0" || opinion.recordType !== "bazi_expert_pilot_opinion_v1"
    || opinion.recordVersion !== "1.1.0" || opinion.reviewPurpose !== PILOT_REVIEW_PURPOSE
    || opinion.seatId !== expectedSession.seatId
    || opinion.recordId !== `${PILOT_PACK_ID}/${expectedSession.reviewCycleId}/seat-${seatLower}/original`
    || opinion.clientClockIsTrustedTime !== false || opinion.noCrossOpinionAccessSelfDeclared !== true
    || opinion.expertTextTransformationApplied !== false || opinion.originalsOverwritten !== false) {
    throw new PilotContractError("pilot opinion 身份或固定边界无效。 ");
  }
  assertCanonicalClientClock(opinion.clientClockFinalizedAt, "opinion.clientClockFinalizedAt");
  assertFixedObject(opinion.releaseGovernance, RELEASE_GOVERNANCE, "opinion release governance");
  assertFixedObject(opinion.authorityBoundary, PILOT_AUTHORITY_BOUNDARY, "opinion authority boundary");
  assertFixedObject(opinion.privacyBoundary, PILOT_PRIVACY_BOUNDARY, "opinion privacy boundary");
  assertExpectedSessionContext(opinion.sessionBinding, expectedContext);
  await assertPilotRecordIntegrity(opinion, "hakimi/bazi-expert-pilot/opinion-record/v1", "pilot opinion");

  assertExactKeys(usability, [
    "schemaVersion", "recordType", "recordVersion", "reviewPurpose", "seatId", "clientClockFinalizedAt",
    "clientClockIsTrustedTime", "sessionBinding", "usabilityFeedback", "partOfDomainOpinion",
    "authorityBoundary", "privacyBoundary", "integrity"
  ], "pilot usability");
  if (usability.schemaVersion !== "1.0.0"
    || usability.recordType !== "bazi_expert_pilot_usability_feedback_v1"
    || usability.recordVersion !== "1.1.0"
    || usability.reviewPurpose !== "pilot_interface_usability_only"
    || usability.seatId !== expectedSession.seatId
    || usability.clientClockFinalizedAt !== opinion.clientClockFinalizedAt
    || usability.clientClockIsTrustedTime !== false
    || usability.partOfDomainOpinion !== false) {
    throw new PilotContractError("pilot usability 身份或固定边界无效。 ");
  }
  assertExpectedSessionContext(usability.sessionBinding, expectedContext);
  assertFixedObject(usability.authorityBoundary, PILOT_AUTHORITY_BOUNDARY, "usability authority boundary");
  assertFixedObject(usability.privacyBoundary, PILOT_PRIVACY_BOUNDARY, "usability privacy boundary");
  await assertPilotRecordIntegrity(usability, "hakimi/bazi-expert-pilot/usability-record/v1", "pilot usability");

  const projection = finalizedDraftProjection(opinion, usability);
  await assertPilotDraftStructure(projection, expectedSession.seatId, expectedContext);
  const finalizedErrors = await collectFinalizeErrors(projection);
  if (finalizedErrors.length > 0) throw new PilotContractError("回件内容未通过完整性或隐私预检。", finalizedErrors);

  assertExactKeys(seal, [
    "schemaVersion", "recordType", "recordVersion", "reviewPurpose", "seatId", "pilotPackId",
    "sessionBinding", "opinionRef", "privacyBoundary", "rawOpinionArtifact", "clientClockFinalizedAt",
    "clientClockIsTrustedTime", "digestIsDigitalSignature", "authenticityEstablished",
    "firstSeenEstablished", "custodyEstablished", "toolAutomaticUploadPerformed", "integrity"
  ], "pilot seal");
  if (seal.schemaVersion !== "1.0.0" || seal.recordType !== "bazi_expert_pilot_file_seal_receipt_v1"
    || seal.recordVersion !== "1.1.0" || seal.reviewPurpose !== PILOT_REVIEW_PURPOSE
    || seal.seatId !== expectedSession.seatId || seal.pilotPackId !== PILOT_PACK_ID
    || seal.clientClockFinalizedAt !== opinion.clientClockFinalizedAt
    || seal.clientClockIsTrustedTime !== false || seal.digestIsDigitalSignature !== false
    || seal.authenticityEstablished !== false || seal.firstSeenEstablished !== false
    || seal.custodyEstablished !== false || seal.toolAutomaticUploadPerformed !== false) {
    throw new PilotContractError("pilot seal 身份或固定边界无效。 ");
  }
  assertExpectedSessionContext(seal.sessionBinding, expectedContext);
  const opinionSessionCanonical = canonicalStringify(opinion.sessionBinding);
  for (const [label, binding] of [
    ["complete submission", completePackage.sessionBinding],
    ["pilot usability", usability.sessionBinding],
    ["pilot seal", seal.sessionBinding]
  ]) {
    if (canonicalStringify(binding) !== opinionSessionCanonical) {
      throw new PilotContractError(`${label} 与 opinion session binding 不一致。`);
    }
  }
  assertFixedObject(seal.privacyBoundary, PILOT_PRIVACY_BOUNDARY, "seal privacy boundary");
  assertExactKeys(seal.opinionRef, ["recordId", "recordDigest"], "seal.opinionRef");
  assertExactKeys(seal.rawOpinionArtifact, ["filename", "mediaType", "encoding", "byteLength", "sha256"], "seal.rawOpinionArtifact");
  const opinionBytes = new TextEncoder().encode(opinionEntry.exactUtf8Text);
  if (seal.opinionRef.recordId !== opinion.recordId
    || seal.opinionRef.recordDigest !== opinion.integrity.recordDigest
    || seal.rawOpinionArtifact.filename !== opinionEntry.filename
    || seal.rawOpinionArtifact.mediaType !== "application/json"
    || seal.rawOpinionArtifact.encoding !== "utf-8"
    || seal.rawOpinionArtifact.byteLength !== opinionBytes.byteLength
    || seal.rawOpinionArtifact.sha256 !== opinionEntry.rawSha256) {
    throw new PilotContractError("pilot seal 与 opinion 原始字节或引用不匹配。 ");
  }
  await assertPilotRecordIntegrity(seal, "hakimi/bazi-expert-pilot/file-seal-receipt/v1", "pilot seal");
  if (checksumEntry.exactUtf8Text !== `${opinionEntry.rawSha256}  ${opinionEntry.filename}\n`) {
    throw new PilotContractError("opinion checksum 文本与原始意见不匹配。 ");
  }

  return deepFreezeJson({
    completePackage,
    completePackageRawSha256: await sha256HexBytes(bytes),
    reviewCycleId: expectedSession.reviewCycleId,
    seatId: expectedSession.seatId,
    packageManifestRawSha256: expectedSession.packageManifestRawSha256,
    embeddedArtifacts: completePackage.embeddedFiles.map((entry) => ({
      role: entry.role,
      filename: entry.filename,
      rawSha256: entry.rawSha256,
      byteLength: new TextEncoder().encode(entry.exactUtf8Text).byteLength
    })),
    mechanicalChecks: {
      strictUtf8AndJson: true,
      duplicateJsonKeysRejected: true,
      outerAndEmbeddedDigestsVerified: true,
      opinionSealBytesCrossLinked: true,
      seatCycleAndPackageManifestBound: true,
      privacyHeuristicRerun: true
    }
  });
}
