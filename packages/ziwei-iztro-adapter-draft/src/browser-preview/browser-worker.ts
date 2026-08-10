/// <reference lib="webworker" />

import { astro } from "iztro";
import { setLanguage, t } from "iztro/lib/i18n";
import zhCnStars from "iztro/lib/i18n/locales/zh-CN/star";
import ruleSnapshotCandidate from "./generated-rule-snapshot.ts";
import browserSourceIdentity from "./generated-browser-source-identity.ts";
import dependencyLockClosure from "../iztro-2.5.8-lock-closure.json";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  ZIWEI_EARTHLY_BRANCH_IDS,
  ZIWEI_SHICHEN_SLOTS,
  sha256ZiweiCanonicalJson,
  ziweiBirthInputDraftSchema,
  ziweiNatalFactsDraftSchema,
  ziweiRuleSnapshotDraftSchema,
  type ZiweiBirthInputDraft,
  type ZiweiNatalFactsDraft,
  type ZiweiRuleSnapshotDraft
} from "../contract-bridge.ts";
import { createZiweiBrowserEngineeringArtifactDraft } from "./browser-artifact.ts";
import {
  ZIWEI_BROWSER_PROBE_PROTOCOL,
  type BrowserProbeRequest,
  type BrowserProbeResponse,
  type BrowserProbeSuccessResult
} from "./browser-protocol.ts";

const workerScope = self as DedicatedWorkerGlobalScope;
const EXPECTED_UPSTREAM_VERSION = "2.5.8" as const;
const EXPECTED_UPSTREAM_COMMIT = "9d39f1743bf31c2b3c635c9b9556215d9c90ee2c" as const;
const EXPECTED_UPSTREAM_INTEGRITY = "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg==" as const;

const BRANCH_KEYS = Object.freeze([
  "ziEarthly", "chouEarthly", "yinEarthly", "maoEarthly", "chenEarthly", "siEarthly",
  "wuEarthly", "weiEarthly", "shenEarthly", "youEarthly", "xuEarthly", "haiEarthly"
] as const);
const BRANCH_IDS = ZIWEI_EARTHLY_BRANCH_IDS;
const UPSTREAM_BRIGHTNESS_BRANCH_IDS = Object.freeze([
  "yin", "mao", "chen", "si", "wu", "wei", "shen", "you", "xu", "hai", "zi", "chou"
] as const);
const STEM_KEYS = Object.freeze([
  "jiaHeavenly", "yiHeavenly", "bingHeavenly", "dingHeavenly", "wuHeavenly",
  "jiHeavenly", "gengHeavenly", "xinHeavenly", "renHeavenly", "guiHeavenly"
] as const);
const BRIGHTNESS_KEYS = Object.freeze(["miao", "wang", "de", "li", "ping", "xian", "bu"] as const);
const TRANSFORMATION_KEYS = Object.freeze(["sihuaLu", "sihuaQuan", "sihuaKe", "sihuaJi"] as const);
const TRANSFORMATION_IDS = Object.freeze(["lu", "quan", "ke", "ji"] as const);
const PALACE_ROLE_BY_KEY = Object.freeze<Record<string, string>>({
  soulPalace: "life",
  siblingsPalace: "siblings",
  spousePalace: "spouse",
  childrenPalace: "children",
  wealthPalace: "wealth",
  healthPalace: "health",
  surfacePalace: "travel",
  friendsPalace: "friends",
  careerPalace: "career",
  propertyPalace: "property",
  spiritPalace: "wellbeing",
  parentsPalace: "parents"
});
const BUREAU_BY_KEY = Object.freeze<Record<string, string>>({
  water2nd: "water_2",
  wood3rd: "wood_3",
  metal4th: "metal_4",
  earth5th: "earth_5",
  fire6th: "fire_6"
});
class BrowserProbeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BrowserProbeError";
    this.code = code;
  }
}

type ReverseRegistries = Readonly<{
  starByLabel: ReadonlyMap<string, string>;
  palaceByLabel: ReadonlyMap<string, string>;
  stemByLabel: ReadonlyMap<string, string>;
  branchByLabel: ReadonlyMap<string, string>;
  brightnessByLabel: ReadonlyMap<string, string>;
  transformationByLabel: ReadonlyMap<string, string>;
  bureauByLabel: ReadonlyMap<string, string>;
}>;

type BrowserCalculation = Readonly<{
  input: ZiweiBirthInputDraft;
  ruleSnapshot: ZiweiRuleSnapshotDraft;
  facts: ZiweiNatalFactsDraft;
}>;

workerScope.addEventListener("message", (event: MessageEvent<unknown>) => {
  void handleRequest(event.data);
}, { once: true });

async function handleRequest(candidate: unknown): Promise<void> {
  const startedAt = new Date().toISOString();
  const workerInstanceId = crypto.randomUUID();
  let requestId: string | null = null;
  let response: BrowserProbeResponse;
  try {
    const request = requireRequest(candidate);
    requestId = request.requestId;
    const calculation = await calculate(request);
    const completedAt = new Date().toISOString();
    const artifact = await createZiweiBrowserEngineeringArtifactDraft({
      input: calculation.input,
      ruleSnapshot: calculation.ruleSnapshot,
      facts: calculation.facts,
      requestId,
      workerInstanceId,
      startedAt,
      completedAt,
      browserSourceIdentity
    });
    const result: BrowserProbeSuccessResult = {
      artifact
    };
    response = {
      ok: true,
      protocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
      requestId,
      workerInstanceId,
      startedAt,
      completedAt,
      result
    };
  } catch (cause) {
    const error = cause instanceof BrowserProbeError
      ? cause
      : new BrowserProbeError("BROWSER_PROBE_FAILED", cause instanceof Error ? cause.message : String(cause));
    response = {
      ok: false,
      protocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
      requestId,
      workerInstanceId,
      startedAt,
      completedAt: new Date().toISOString(),
      error: { code: error.code, message: error.message }
    };
  }
  workerScope.postMessage(response);
  workerScope.close();
}

function requireRequest(candidate: unknown): BrowserProbeRequest {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    fail("INVALID_REQUEST", "请求必须是结构化对象");
  }
  const record = candidate as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["action", "input", "protocolVersion", "requestId"])) {
    fail("INVALID_REQUEST", "请求含有未知字段或缺少字段");
  }
  if (record.protocolVersion !== ZIWEI_BROWSER_PROBE_PROTOCOL || record.action !== "calculate") {
    fail("PROTOCOL_MISMATCH", "请求协议或动作不受支持");
  }
  if (typeof record.requestId !== "string" || !/^[0-9a-f-]{36}$/iu.test(record.requestId)) {
    fail("INVALID_REQUEST_ID", "请求缺少有效身份");
  }
  return {
    protocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
    action: "calculate",
    requestId: record.requestId,
    input: ziweiBirthInputDraftSchema.parse(record.input)
  };
}

async function calculate(request: BrowserProbeRequest): Promise<BrowserCalculation> {
  const input = request.input;
  if (input.calendarInput.calendar !== "gregorian") {
    fail("UNSUPPORTED_BROWSER_CALENDAR", "浏览器探针当前只接受公历输入");
  }
  const ruleSnapshot = await requireLockedRuleSnapshot();
  if (input.calendarInput.date < ruleSnapshot.verifiedRange.from || input.calendarInput.date > ruleSnapshot.verifiedRange.to) {
    fail("OUTSIDE_VERIFIED_RANGE", "日期超出当前工程核对范围 1900-01-01 至 2100-12-31");
  }
  const registries = frozenRegistries();
  const config = effectiveConfigFromRules(ruleSnapshot, registries);
  const chart = astro.withOptions({
    type: "solar",
    dateStr: input.calendarInput.date,
    timeIndex: input.shichenIndex,
    gender: input.sexForCalculation,
    isLeapMonth: false,
    fixLeap: ruleSnapshot.rules.leapMonthPlacement.mode === "iztro_fix_leap",
    language: "zh-CN",
    astroType: ruleSnapshot.rules.chartType,
    config
  });
  assertExactJson(
    astro.getConfig(),
    config,
    "EFFECTIVE_CONFIG_MISMATCH",
    "浏览器引擎没有保留本次完整规则配置"
  );

  const facts = ziweiNatalFactsDraftSchema.parse(mapChart(input, ruleSnapshot, chart, registries));

  return {
    input,
    ruleSnapshot,
    facts
  };
}

async function requireLockedRuleSnapshot(): Promise<ZiweiRuleSnapshotDraft> {
  const snapshot = ziweiRuleSnapshotDraftSchema.parse(ruleSnapshotCandidate);
  const { ruleSnapshotSha256: embeddedDigest, ...projection } = snapshot;
  const [actualRuleDigest, dependencyGraphDigest, starDigest, mutagenDigest, brightnessDigest] = await Promise.all([
    sha256ZiweiCanonicalJson(projection),
    sha256ZiweiCanonicalJson(dependencyLockClosure),
    sha256ZiweiCanonicalJson(snapshot.rules.starRegistry.entries),
    sha256ZiweiCanonicalJson(snapshot.rules.mutagenTable.entries),
    sha256ZiweiCanonicalJson({
      canonicalBranchOrder: snapshot.rules.brightnessTable.canonicalBranchOrder,
      missingStarPolicy: snapshot.rules.brightnessTable.missingStarPolicy,
      entries: snapshot.rules.brightnessTable.entries
    })
  ]);
  if (actualRuleDigest !== embeddedDigest) {
    fail("RULE_SNAPSHOT_DIGEST_MISMATCH", "规则快照的 canonical SHA-256 不匹配");
  }
  if (dependencyGraphDigest !== snapshot.engine.dependencyGraphSha256) {
    fail("DEPENDENCY_GRAPH_DIGEST_MISMATCH", "浏览器内置依赖闭包与规则快照不一致");
  }
  if (starDigest !== snapshot.rules.starRegistry.contentSha256
    || mutagenDigest !== snapshot.rules.mutagenTable.contentSha256
    || brightnessDigest !== snapshot.rules.brightnessTable.contentSha256) {
    fail("RULE_TABLE_DIGEST_MISMATCH", "规则表内容摘要不匹配");
  }
  if (snapshot.contractVersion !== ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION
    || snapshot.systemId !== ZIWEI_DOUSHU_SYSTEM_ID
    || snapshot.profileId !== "iztro.2_5_8.default_heaven"
    || snapshot.profileVersion !== "0.1.0"
    || snapshot.status !== "contract_draft"
    || snapshot.engine.adapterId !== "hakimi.ziwei.iztro.node_adapter"
    || snapshot.engine.adapterVersion !== "0.1.0"
    || snapshot.engine.upstreamName !== "iztro"
    || snapshot.engine.upstreamVersion !== EXPECTED_UPSTREAM_VERSION
    || snapshot.engine.upstreamCommit !== EXPECTED_UPSTREAM_COMMIT
    || snapshot.engine.upstreamNpmIntegrity !== EXPECTED_UPSTREAM_INTEGRITY
    || snapshot.engine.isolation !== "fresh_worker_per_calculation"
    || snapshot.engine.isolatedExecution !== true
    || snapshot.engine.configurationMode !== "full_snapshot_per_calculation") {
    fail("REFERENCE_ENGINE_IDENTITY_MISMATCH", "规则快照不再绑定既定 Node 参考引擎");
  }
  if (snapshot.verifiedRange.from !== "1900-01-01"
    || snapshot.verifiedRange.to !== "2100-12-31"
    || snapshot.verifiedRange.outsideRangePolicy !== "reject"
    || snapshot.rules.yearBoundary !== "lunar_new_year"
    || snapshot.rules.horoscopeBoundary !== "lunar_new_year"
    || snapshot.rules.lateZiDay !== "next_civil_day"
    || snapshot.rules.ageBoundary !== "calendar_year"
    || snapshot.rules.algorithm !== "iztro_default"
    || snapshot.rules.chartType !== "heaven"
    || snapshot.rules.interpretationIncluded !== false
    || snapshot.review.status !== "unreviewed") {
    fail("REFERENCE_PROFILE_IDENTITY_MISMATCH", "浏览器探针拒绝扩大的范围或改变的规则口径");
  }
  if (snapshot.rules.starRegistry.entries.length !== 162
    || snapshot.rules.mutagenTable.entries.length !== 10
    || snapshot.rules.brightnessTable.entries.length !== 20
    || stableJson(snapshot.rules.brightnessTable.canonicalBranchOrder) !== stableJson(BRANCH_IDS)) {
    fail("REFERENCE_TABLE_SHAPE_MISMATCH", "规则快照表形状已改变");
  }
  const lock = dependencyLockClosure as {
    schemaVersion?: unknown;
    proofScope?: unknown;
    nodes?: Array<{ name?: unknown; version?: unknown; integrity?: unknown }>;
  };
  const iztroNode = lock.nodes?.find((node) => node.name === "iztro");
  if (lock.schemaVersion !== 1
    || lock.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || lock.nodes?.length !== 6
    || iztroNode?.version !== EXPECTED_UPSTREAM_VERSION
    || iztroNode.integrity !== EXPECTED_UPSTREAM_INTEGRITY) {
    fail("DEPENDENCY_LOCK_IDENTITY_MISMATCH", "内置依赖闭包身份不是既定 iztro 2.5.8 闭包");
  }
  return snapshot;
}

function frozenRegistries(): ReverseRegistries {
  setLanguage("zh-CN");
  const starEntries = Object.entries(zhCnStars as Record<string, string>);
  if (starEntries.length !== 162) fail("STAR_REGISTRY_SIZE_MISMATCH", `星曜注册表数量为 ${starEntries.length}，预期 162`);
  return {
    starByLabel: uniqueReverseMap(starEntries, "star"),
    palaceByLabel: uniqueReverseMap(Object.keys(PALACE_ROLE_BY_KEY).map((key) => [key, t(key)]), "palace"),
    stemByLabel: uniqueReverseMap(STEM_KEYS.map((key) => [key, t(key)]), "stem"),
    branchByLabel: uniqueReverseMap(BRANCH_KEYS.map((key) => [key, t(key)]), "branch"),
    brightnessByLabel: uniqueReverseMap(BRIGHTNESS_KEYS.map((key) => [key, t(key)]), "brightness"),
    transformationByLabel: uniqueReverseMap(TRANSFORMATION_KEYS.map((key) => [key, t(key)]), "transformation"),
    bureauByLabel: uniqueReverseMap(Object.keys(BUREAU_BY_KEY).map((key) => [key, t(key)]), "bureau")
  };
}

function uniqueReverseMap(entries: Array<readonly [string, string]>, namespace: string): ReadonlyMap<string, string> {
  const reverse = new Map<string, string>();
  for (const [key, label] of entries) {
    if (!label || reverse.has(label)) fail("AMBIGUOUS_FROZEN_LABEL", `${namespace} 标签映射不唯一`);
    reverse.set(label, key);
  }
  return reverse;
}

function effectiveConfigFromRules(ruleSnapshot: ZiweiRuleSnapshotDraft, registries: ReverseRegistries) {
  const starKeyById = new Map(ruleSnapshot.rules.starRegistry.entries.map((entry) => [entry.starId, entry.upstreamKey]));
  for (const [upstreamKey, label] of Object.entries(zhCnStars as Record<string, string>)) {
    if (registries.starByLabel.get(label) !== upstreamKey) fail("STAR_REGISTRY_BIJECTION_MISMATCH", "星曜注册表双射失效");
  }
  const mutagens = Object.fromEntries(ruleSnapshot.rules.mutagenTable.entries.map((entry) => {
    const values = TRANSFORMATION_IDS.map((transformationId) => {
      const key = starKeyById.get(entry.transformations[transformationId]);
      if (!key) fail("UNREGISTERED_MUTAGEN_STAR", `四化引用了未登记星曜 ${entry.transformations[transformationId]}`);
      return key;
    });
    return [`${entry.heavenlyStemId}Heavenly`, values];
  }));
  const brightness = Object.fromEntries(ruleSnapshot.rules.brightnessTable.entries.map((entry) => {
    const starKey = starKeyById.get(entry.starId);
    if (!starKey) fail("UNREGISTERED_BRIGHTNESS_STAR", `亮度表引用了未登记星曜 ${entry.starId}`);
    return [starKey, UPSTREAM_BRIGHTNESS_BRANCH_IDS.map((branchId) => entry.byEarthlyBranch[branchId] ?? "")];
  }));
  return {
    mutagens,
    brightness,
    yearDivide: ruleSnapshot.rules.yearBoundary === "li_chun" ? "exact" as const : "normal" as const,
    horoscopeDivide: ruleSnapshot.rules.horoscopeBoundary === "li_chun" ? "exact" as const : "normal" as const,
    ageDivide: ruleSnapshot.rules.ageBoundary === "birthday" ? "birthday" as const : "normal" as const,
    dayDivide: ruleSnapshot.rules.lateZiDay === "current_civil_day" ? "current" as const : "forward" as const,
    algorithm: ruleSnapshot.rules.algorithm === "iztro_zhongzhou" ? "zhongzhou" as const : "default" as const
  };
}

function mapChart(
  input: ZiweiBirthInputDraft,
  ruleSnapshot: ZiweiRuleSnapshotDraft,
  chart: any,
  registries: ReverseRegistries
): ZiweiNatalFactsDraft {
  if (ruleSnapshot.rules.chartType !== "heaven") fail("UNSUPPORTED_CHART_TYPE", "浏览器探针只支持天盘");
  const gregorianDate = canonicalGregorianDate(chart.solarDate);
  if (input.calendarInput.calendar !== "gregorian" || gregorianDate !== input.calendarInput.date) {
    fail("GREGORIAN_ROUNDTRIP_MISMATCH", "上游改变了公历输入日期");
  }
  const rawLunar = chart.rawDates?.lunarDate;
  const rawGanzhi = chart.rawDates?.chineseDate;
  if (!rawLunar || !rawGanzhi) fail("MISSING_CALENDAR_FACTS", "上游没有返回完整历法事实");
  const ganzhi = {
    year: mapGanzhi(rawGanzhi.yearly, registries),
    month: mapGanzhi(rawGanzhi.monthly, registries),
    day: mapGanzhi(rawGanzhi.daily, registries),
    hour: mapGanzhi(rawGanzhi.hourly, registries)
  };
  const natalYear = splitGanzhiId(ganzhi.year);

  const mappedPalaces = chart.palaces.map((palace: any) => {
    const palaceKey = requireMapped(registries.palaceByLabel, palace.name, "palace");
    const stemKey = requireMapped(registries.stemByLabel, palace.heavenlyStem, "stem");
    const branchKey = requireMapped(registries.branchByLabel, palace.earthlyBranch, "branch");
    const range = palace.decadal?.range;
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger)) {
      fail("INVALID_DECADAL_RANGE", `${palace.name} 缺少完整大限范围`);
    }
    return {
      earthlyBranchId: stableBranchId(branchKey),
      heavenlyStemId: stableStemId(stemKey),
      roleId: PALACE_ROLE_BY_KEY[palaceKey],
      isBodyPalace: palace.isBodyPalace === true,
      stars: [
        ...palace.majorStars.map((star: any) => mapStar(star, "major", registries)),
        ...palace.minorStars.map((star: any) => mapStar(star, "minor", registries)),
        ...palace.adjectiveStars.map((star: any) => mapStar(star, "auxiliary", registries))
      ],
      upstreamDecadal: { startAge: range[0] as number, endAge: range[1] as number }
    };
  });
  const byBranch = new Map(mappedPalaces.map((palace: any) => [palace.earthlyBranchId, palace]));
  const palaces = BRANCH_IDS.map((branchId) => {
    const palace = byBranch.get(branchId) as any;
    if (!palace) fail("MISSING_CANONICAL_PALACE", `缺少 ${branchId} 宫位`);
    const { upstreamDecadal: _discarded, ...fact } = palace;
    return fact;
  });
  if (new Set(palaces.map((palace: any) => palace.roleId)).size !== 12) {
    fail("DUPLICATE_PALACE_ROLE", "十二宫角色没有形成唯一集合");
  }
  const lifePalace = palaces.find((palace: any) => palace.roleId === "life");
  const bodyPalaces = palaces.filter((palace: any) => palace.isBodyPalace);
  if (!lifePalace || bodyPalaces.length !== 1) fail("INVALID_LIFE_BODY_PALACE", "命宫或身宫数量不正确");

  const periodsByAge = [...mappedPalaces].sort((left: any, right: any) => left.upstreamDecadal.startAge - right.upstreamDecadal.startAge);
  if (periodsByAge[0]?.roleId !== "life") fail("FIRST_PERIOD_NOT_LIFE_PALACE", "首个大限没有绑定命宫");
  const firstBranchIndex = BRANCH_IDS.indexOf(periodsByAge[0].earthlyBranchId);
  const secondBranchIndex = BRANCH_IDS.indexOf(periodsByAge[1].earthlyBranchId);
  const step = (secondBranchIndex - firstBranchIndex + 12) % 12;
  const direction: "forward" | "backward" = step === 1
    ? "forward"
    : step === 11
      ? "backward"
      : fail("INVALID_PERIOD_DIRECTION", `大限步进为 ${step}`);
  const majorPeriods = periodsByAge.map((palace: any, index: number) => ({
    sequence: index + 1,
    palaceRoleId: palace.roleId,
    heavenlyStemId: palace.heavenlyStemId,
    earthlyBranchId: palace.earthlyBranchId,
    direction,
    ageKind: "nominal_age" as const,
    startAge: palace.upstreamDecadal.startAge,
    endAge: palace.upstreamDecadal.endAge
  }));

  const polarity = ["zi", "yin", "chen", "wu", "shen", "xu"].includes(natalYear.branchId) ? "yang" : "yin";
  const expectedDirection = (input.sexForCalculation === "male" ? "yang" : "yin") === polarity ? "forward" : "backward";
  if (direction !== expectedDirection) {
    fail("PERIOD_DIRECTION_BASIS_MISMATCH", "大限顺逆与出生年支阴阳及排盘用性别不一致");
  }
  const bureauKey = requireMapped(registries.bureauByLabel, chart.fiveElementsClass, "bureau");
  const lifeMasterKey = requireMapped(registries.starByLabel, chart.soul, "life-master");
  const bodyMasterKey = requireMapped(registries.starByLabel, chart.body, "body-master");
  const shichen = ZIWEI_SHICHEN_SLOTS[input.shichenIndex];
  if (!shichen) fail("INVALID_SHICHEN", "时辰索引没有对应契约时段");

  return {
    contractVersion: input.contractVersion,
    systemId: input.systemId,
    calendarFacts: {
      gregorianDate,
      lunarDate: {
        year: rawLunar.lunarYear,
        month: rawLunar.lunarMonth,
        day: rawLunar.lunarDay,
        isLeapMonth: rawLunar.isLeap
      },
      shichen: { ...shichen },
      ganzhi
    },
    directionBasis: {
      yearStemId: natalYear.stemId as any,
      yearBranchId: natalYear.branchId as any,
      yearPolarity: polarity,
      sexForCalculation: input.sexForCalculation,
      resolvedDirection: direction,
      ruleId: "iztro.2_5_8.year_branch_polarity_sex"
    },
    lifePalaceBranchId: lifePalace.earthlyBranchId,
    bodyPalaceBranchId: bodyPalaces[0].earthlyBranchId,
    lifeMasterStarId: projectStarId(lifeMasterKey),
    bodyMasterStarId: projectStarId(bodyMasterKey),
    fiveElementBureauId: BUREAU_BY_KEY[bureauKey] as any,
    palaces,
    majorPeriods
  };
}

function mapStar(star: any, category: "major" | "minor" | "auxiliary", registries: ReverseRegistries) {
  if (star.scope !== "origin") fail("NON_NATAL_STAR_SCOPE", "星曜不是本命范围");
  const starKey = requireMapped(registries.starByLabel, star.name, "star");
  const transformationIds: string[] = [];
  if (star.mutagen) {
    const transformationKey = requireMapped(registries.transformationByLabel, star.mutagen, "transformation");
    const index = TRANSFORMATION_KEYS.indexOf(transformationKey as typeof TRANSFORMATION_KEYS[number]);
    if (index < 0) fail("UNKNOWN_TRANSFORMATION_KEY", "四化键未登记");
    transformationIds.push(TRANSFORMATION_IDS[index]);
  }
  return {
    starId: projectStarId(starKey),
    scope: "natal" as const,
    category,
    brightnessId: star.brightness
      ? requireMapped(registries.brightnessByLabel, star.brightness, "brightness")
      : null,
    transformationIds,
    placementRuleId: `iztro.2_5_8.${category}_placement`
  };
}

function mapGanzhi(pair: unknown, registries: ReverseRegistries): string {
  if (!Array.isArray(pair) || pair.length !== 2) fail("INVALID_GANZHI_PAIR", "干支必须是天干与地支二元组");
  const stemKey = requireMapped(registries.stemByLabel, pair[0], "stem");
  const branchKey = requireMapped(registries.branchByLabel, pair[1], "branch");
  return `${stableStemId(stemKey)}_${stableBranchId(branchKey)}`;
}

function splitGanzhiId(value: string): { stemId: string; branchId: string } {
  const match = /^(jia|yi|bing|ding|wu|ji|geng|xin|ren|gui)_(zi|chou|yin|mao|chen|si|wu|wei|shen|you|xu|hai)$/u.exec(value);
  if (!match) fail("INVALID_MAPPED_GANZHI", `干支 ${value} 不是规范标识`);
  return { stemId: match[1], branchId: match[2] };
}

function canonicalGregorianDate(value: unknown): string {
  if (typeof value !== "string") fail("INVALID_GREGORIAN_OUTPUT", "上游公历日期不是字符串");
  const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/u.exec(value);
  if (!match) fail("INVALID_GREGORIAN_OUTPUT", `上游公历日期格式无效：${value}`);
  return `${match[1].padStart(4, "0")}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function stableStemId(key: string): string {
  if (!STEM_KEYS.includes(key as typeof STEM_KEYS[number])) fail("UNKNOWN_STEM_KEY", `未知天干键 ${key}`);
  return key.replace(/Heavenly$/u, "");
}

function stableBranchId(key: string): string {
  if (!BRANCH_KEYS.includes(key as typeof BRANCH_KEYS[number])) fail("UNKNOWN_BRANCH_KEY", `未知地支键 ${key}`);
  return key.replace(/Earthly$/u, "");
}

function projectStarId(upstreamKey: string): string {
  const kebab = upstreamKey.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
  return `ziwei.star.iztro.${kebab}`;
}

function requireMapped(reverse: ReadonlyMap<string, string>, labelValue: unknown, namespace: string): string {
  if (typeof labelValue !== "string") fail("UNKNOWN_UPSTREAM_LABEL", `${namespace} 标签不是字符串`);
  const key = reverse.get(labelValue);
  if (!key) fail("UNKNOWN_UPSTREAM_LABEL", `未知 ${namespace} 标签 ${JSON.stringify(labelValue)}`);
  return key;
}

function assertExactJson(actual: unknown, expected: unknown, code: string, message: string): void {
  if (stableJson(actual) !== stableJson(expected)) fail(code, message);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function fail(code: string, message: string): never {
  throw new BrowserProbeError(code, message);
}
