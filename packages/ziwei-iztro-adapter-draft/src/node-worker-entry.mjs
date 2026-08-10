import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { parentPort, workerData } from "node:worker_threads";

const require = createRequire(import.meta.url);
const { astro, data } = require("iztro");
const { setLanguage, t } = require("iztro/lib/i18n");
const zhCnStars = require("iztro/lib/i18n/locales/zh-CN/star").default;

const PROTOCOL_VERSION = "hakimi-ziwei-iztro-worker/0.1-draft";
const DEPENDENCY_LOCK_CLOSURE = loadDependencyLockClosure();
const EXPECTED_RUNTIME_VERSIONS = Object.freeze(Object.fromEntries(
  DEPENDENCY_LOCK_CLOSURE.nodes.map((node) => [node.name, node.version])
));
const BRANCH_KEYS = Object.freeze([
  "ziEarthly", "chouEarthly", "yinEarthly", "maoEarthly", "chenEarthly", "siEarthly",
  "wuEarthly", "weiEarthly", "shenEarthly", "youEarthly", "xuEarthly", "haiEarthly"
]);
const BRANCH_IDS = Object.freeze(BRANCH_KEYS.map((key) => key.replace(/Earthly$/u, "")));
const UPSTREAM_BRIGHTNESS_BRANCH_IDS = Object.freeze([
  "yin", "mao", "chen", "si", "wu", "wei", "shen", "you", "xu", "hai", "zi", "chou"
]);
const STEM_KEYS = Object.freeze([
  "jiaHeavenly", "yiHeavenly", "bingHeavenly", "dingHeavenly", "wuHeavenly",
  "jiHeavenly", "gengHeavenly", "xinHeavenly", "renHeavenly", "guiHeavenly"
]);
const BRIGHTNESS_KEYS = Object.freeze(["miao", "wang", "de", "li", "ping", "xian", "bu"]);
const TRANSFORMATION_KEYS = Object.freeze(["sihuaLu", "sihuaQuan", "sihuaKe", "sihuaJi"]);
const TRANSFORMATION_IDS = Object.freeze(["lu", "quan", "ke", "ji"]);
const PALACE_ROLE_BY_KEY = Object.freeze({
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
const BUREAU_BY_KEY = Object.freeze({
  water2nd: "water_2",
  wood3rd: "wood_3",
  metal4th: "metal_4",
  earth5th: "earth_5",
  fire6th: "fire_6"
});
const EXPECTED_NPM_INTEGRITY = DEPENDENCY_LOCK_CLOSURE.nodes.find((node) => node.name === "iztro")?.integrity;
const SHICHEN_BRANCH_IDS = Object.freeze([
  "zi", "chou", "yin", "mao", "chen", "si", "wu", "wei", "shen", "you", "xu", "hai", "zi"
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function loadDependencyLockClosure() {
  const candidate = JSON.parse(fs.readFileSync(
    new URL("./iztro-2.5.8-lock-closure.json", import.meta.url),
    "utf8"
  ));
  if (candidate?.schemaVersion !== 1
    || candidate?.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || !Array.isArray(candidate?.nodes)
    || candidate.nodes.length !== 6
    || candidate.nodes.some((node) => (
      !node || typeof node.name !== "string" || typeof node.version !== "string"
      || typeof node.integrity !== "string"
    ))) {
    fail("DEPENDENCY_LOCK_INVALID", "Bundled package-lock closure identity is invalid");
  }
  const names = candidate.nodes.map((node) => node.name);
  if (new Set(names).size !== names.length || !candidate.nodes.some((node) => node.name === "iztro")) {
    fail("DEPENDENCY_LOCK_INVALID", "Bundled package-lock closure nodes are incomplete or duplicated");
  }
  return candidate;
}

function resolveLockedPackageEntry(packageName) {
  switch (packageName) {
    case "@babel/runtime": return require.resolve("@babel/runtime/helpers/typeof");
    case "dayjs": return require.resolve("dayjs");
    case "i18next": return require.resolve("i18next");
    case "iztro": return require.resolve("iztro");
    case "lunar-lite": return require.resolve("lunar-lite");
    case "lunar-typescript": return require.resolve("lunar-typescript");
    default: fail("DEPENDENCY_MANIFEST_NOT_FOUND", `Unknown locked package ${packageName}`);
  }
}

function packageVersion(packageName) {
  const resolved = resolveLockedPackageEntry(packageName);
  let cursor = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
  while (true) {
    const manifestPath = path.join(cursor, "package.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.name === packageName && typeof manifest.version === "string") return manifest.version;
    }
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  fail("DEPENDENCY_MANIFEST_NOT_FOUND", `Cannot resolve the installed manifest for ${packageName}`);
}

function verifyRuntimeGraph() {
  const actual = {
    "@babel/runtime": packageVersion("@babel/runtime"),
    dayjs: packageVersion("dayjs"),
    i18next: packageVersion("i18next"),
    iztro: packageVersion("iztro"),
    "lunar-lite": packageVersion("lunar-lite"),
    "lunar-typescript": packageVersion("lunar-typescript")
  };
  if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_RUNTIME_VERSIONS)) {
    fail("DEPENDENCY_GRAPH_MISMATCH", `Expected the frozen iztro dependency graph, received ${JSON.stringify(actual)}`);
  }
  return actual;
}

function uniqueReverseMap(entries, namespace) {
  const reverse = new Map();
  for (const [key, label] of entries) {
    if (typeof label !== "string" || label.length === 0) fail("INVALID_FROZEN_LABEL", `${namespace}.${key} has no zh-CN label`);
    if (reverse.has(label)) fail("AMBIGUOUS_FROZEN_LABEL", `${namespace} label ${label} is not a bijection`);
    reverse.set(label, key);
  }
  return reverse;
}

function camelToKebab(value) {
  return value.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}

function projectStarId(upstreamKey) {
  return `ziwei.star.iztro.${camelToKebab(upstreamKey)}`;
}

function frozenRegistries() {
  setLanguage("zh-CN");
  const starEntries = Object.entries(zhCnStars);
  if (starEntries.length !== 162) fail("STAR_REGISTRY_SIZE_MISMATCH", `Expected 162 star keys, received ${starEntries.length}`);
  const starByLabel = uniqueReverseMap(starEntries, "star");
  const palaceByLabel = uniqueReverseMap(Object.keys(PALACE_ROLE_BY_KEY).map((key) => [key, t(key)]), "palace");
  const stemByLabel = uniqueReverseMap(STEM_KEYS.map((key) => [key, t(key)]), "stem");
  const branchByLabel = uniqueReverseMap(BRANCH_KEYS.map((key) => [key, t(key)]), "branch");
  const brightnessByLabel = uniqueReverseMap(BRIGHTNESS_KEYS.map((key) => [key, t(key)]), "brightness");
  const transformationByLabel = uniqueReverseMap(TRANSFORMATION_KEYS.map((key) => [key, t(key)]), "transformation");
  const bureauByLabel = uniqueReverseMap(Object.keys(BUREAU_BY_KEY).map((key) => [key, t(key)]), "bureau");
  return {
    starEntries,
    starByLabel,
    palaceByLabel,
    stemByLabel,
    branchByLabel,
    brightnessByLabel,
    transformationByLabel,
    bureauByLabel
  };
}

function requireMapped(reverse, label, namespace) {
  const key = reverse.get(label);
  if (!key) fail("UNKNOWN_UPSTREAM_LABEL", `Unknown ${namespace} label ${JSON.stringify(label)}`);
  return key;
}

function stableStemId(key) {
  if (!STEM_KEYS.includes(key)) fail("UNKNOWN_STEM_KEY", `Unknown heavenly-stem key ${key}`);
  return key.replace(/Heavenly$/u, "");
}

function stableBranchId(key) {
  if (!BRANCH_KEYS.includes(key)) fail("UNKNOWN_BRANCH_KEY", `Unknown earthly-branch key ${key}`);
  return key.replace(/Earthly$/u, "");
}

function defaultProfile(registries, runtimeVersions) {
  const starRegistryEntries = registries.starEntries.map(([upstreamKey, zhCnLabel]) => ({
    upstreamKey,
    starId: projectStarId(upstreamKey),
    zhCnLabel
  }));
  const mutagenEntries = STEM_KEYS.map((stemKey) => ({
    heavenlyStemId: stableStemId(stemKey),
    transformations: Object.fromEntries(
      TRANSFORMATION_IDS.map((transformationId, index) => [
        transformationId,
        projectStarId(data.heavenlyStems[stemKey].mutagen[index])
      ])
    )
  }));
  const brightnessEntries = Object.keys(data.STARS_INFO).sort().map((starKey) => {
    const values = data.STARS_INFO[starKey].brightness;
    if (!Array.isArray(values) || values.length !== 12) fail("INVALID_BRIGHTNESS_ROW", `${starKey} must have twelve brightness values`);
    return {
      starId: projectStarId(starKey),
      byEarthlyBranch: Object.fromEntries(
        BRANCH_IDS.map((branchId) => {
          const upstreamIndex = UPSTREAM_BRIGHTNESS_BRANCH_IDS.indexOf(branchId);
          const value = values[upstreamIndex];
          return [branchId, value === "" ? null : value];
        })
      )
    };
  });
  if (brightnessEntries.length !== 20) fail("BRIGHTNESS_TABLE_SIZE_MISMATCH", `Expected 20 brightness rows, received ${brightnessEntries.length}`);
  return {
    runtimeVersions,
    upstreamNpmIntegrity: EXPECTED_NPM_INTEGRITY,
    workerProtocolVersion: PROTOCOL_VERSION,
    starRegistryEntries,
    mutagenEntries,
    brightnessEntries,
    canonicalBranchOrder: [...BRANCH_IDS],
    missingStarPolicy: "null_brightness"
  };
}

function assertExactJson(actual, expected, code, message) {
  if (stableJson(actual) !== stableJson(expected)) fail(code, message);
}

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
}

function effectiveConfigFromRules(rules, profile) {
  assertExactJson(rules.starRegistry.entries, profile.starRegistryEntries, "STAR_REGISTRY_MISMATCH", "Rule snapshot does not contain the frozen iztro 2.5.8 star registry");
  assertExactJson(rules.mutagenTable.entries, profile.mutagenEntries, "MUTAGEN_TABLE_MISMATCH", "Rule snapshot does not contain the frozen iztro 2.5.8 mutagen table");
  assertExactJson(rules.brightnessTable.entries, profile.brightnessEntries, "BRIGHTNESS_TABLE_MISMATCH", "Rule snapshot does not contain the frozen iztro 2.5.8 brightness table");
  assertExactJson(rules.brightnessTable.canonicalBranchOrder, profile.canonicalBranchOrder, "BRIGHTNESS_ORDER_MISMATCH", "Brightness branch order is not canonical");
  if (rules.brightnessTable.missingStarPolicy !== profile.missingStarPolicy) fail("BRIGHTNESS_POLICY_MISMATCH", "Brightness missing-star policy changed");

  const starKeyById = new Map(profile.starRegistryEntries.map((entry) => [entry.starId, entry.upstreamKey]));
  const mutagens = Object.fromEntries(rules.mutagenTable.entries.map((entry) => {
    const stemKey = `${entry.heavenlyStemId}Heavenly`;
    const values = TRANSFORMATION_IDS.map((transformationId) => {
      const key = starKeyById.get(entry.transformations[transformationId]);
      if (!key) fail("UNREGISTERED_MUTAGEN_STAR", `Unknown mutagen star ${entry.transformations[transformationId]}`);
      return key;
    });
    return [stemKey, values];
  }));
  const brightness = Object.fromEntries(rules.brightnessTable.entries.map((entry) => {
    const starKey = starKeyById.get(entry.starId);
    if (!starKey) fail("UNREGISTERED_BRIGHTNESS_STAR", `Unknown brightness star ${entry.starId}`);
    return [starKey, UPSTREAM_BRIGHTNESS_BRANCH_IDS.map((branchId) => entry.byEarthlyBranch[branchId] ?? "")];
  }));
  return {
    mutagens,
    brightness,
    yearDivide: rules.yearBoundary === "li_chun" ? "exact" : "normal",
    horoscopeDivide: rules.horoscopeBoundary === "li_chun" ? "exact" : "normal",
    ageDivide: rules.ageBoundary === "birthday" ? "birthday" : "normal",
    dayDivide: rules.lateZiDay === "current_civil_day" ? "current" : "forward",
    algorithm: rules.algorithm === "iztro_zhongzhou" ? "zhongzhou" : "default"
  };
}

function mapStar(star, category, registries) {
  if (star.scope !== "origin") fail("NON_NATAL_STAR_SCOPE", `Expected natal scope, received ${JSON.stringify(star.scope)}`);
  const starKey = requireMapped(registries.starByLabel, star.name, "star");
  let brightnessId = null;
  if (star.brightness) {
    brightnessId = requireMapped(registries.brightnessByLabel, star.brightness, "brightness");
  }
  const transformationIds = [];
  if (star.mutagen) {
    const transformationKey = requireMapped(registries.transformationByLabel, star.mutagen, "transformation");
    const transformationIndex = TRANSFORMATION_KEYS.indexOf(transformationKey);
    if (transformationIndex < 0) fail("UNKNOWN_TRANSFORMATION_KEY", `Unknown transformation key ${transformationKey}`);
    transformationIds.push(TRANSFORMATION_IDS[transformationIndex]);
  }
  return {
    starId: projectStarId(starKey),
    scope: "natal",
    category,
    brightnessId,
    transformationIds,
    placementRuleId: `iztro.2_5_8.${category}_placement`
  };
}

function mapGanzhi(pair, registries) {
  if (!Array.isArray(pair) || pair.length !== 2) fail("INVALID_GANZHI_PAIR", "Upstream ganzhi must be a stem/branch pair");
  const stemKey = requireMapped(registries.stemByLabel, pair[0], "stem");
  const branchKey = requireMapped(registries.branchByLabel, pair[1], "branch");
  return `${stableStemId(stemKey)}_${stableBranchId(branchKey)}`;
}

function splitGanzhiId(value) {
  const match = /^(jia|yi|bing|ding|wu|ji|geng|xin|ren|gui)_(zi|chou|yin|mao|chen|si|wu|wei|shen|you|xu|hai)$/u.exec(value);
  if (!match) fail("INVALID_MAPPED_GANZHI", `Mapped ganzhi ${value} is not canonical`);
  return { stemId: match[1], branchId: match[2] };
}

function canonicalGregorianDate(value) {
  const match = /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/u.exec(value);
  if (!match) fail("INVALID_GREGORIAN_OUTPUT", `Upstream returned invalid Gregorian date ${JSON.stringify(value)}`);
  return `${match[1].padStart(4, "0")}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function mapChart(input, rules, chart, registries) {
  if (rules.chartType !== "heaven") fail("UNSUPPORTED_CHART_TYPE", "The first adapter draft supports only the heaven chart and fails closed for earth/human charts");
  const gregorianDate = canonicalGregorianDate(chart.solarDate);
  if (input.calendarInput.calendar === "gregorian" && gregorianDate !== input.calendarInput.date) {
    fail("GREGORIAN_ROUNDTRIP_MISMATCH", "Upstream changed the canonical Gregorian input date");
  }
  const rawLunar = chart.rawDates?.lunarDate;
  if (!rawLunar) fail("MISSING_LUNAR_DATE", "Upstream did not return a raw lunar date");
  if (input.calendarInput.calendar === "chinese_lunisolar") {
    const requested = input.calendarInput.date;
    if (rawLunar.lunarYear !== requested.year || rawLunar.lunarMonth !== requested.month
      || rawLunar.lunarDay !== requested.day || rawLunar.isLeap !== requested.isLeapMonth) {
      fail("LUNAR_ROUNDTRIP_MISMATCH", "Upstream silently normalized or ignored the requested lunar date/leap-month flag");
    }
  }

  const rawGanzhi = chart.rawDates?.chineseDate;
  if (!rawGanzhi) fail("MISSING_GANZHI", "Upstream did not return raw ganzhi facts");
  const ganzhi = {
    year: mapGanzhi(rawGanzhi.yearly, registries),
    month: mapGanzhi(rawGanzhi.monthly, registries),
    day: mapGanzhi(rawGanzhi.daily, registries),
    hour: mapGanzhi(rawGanzhi.hourly, registries)
  };
  const natalYear = splitGanzhiId(ganzhi.year);

  const mappedPalaces = chart.palaces.map((palace) => {
    const palaceKey = requireMapped(registries.palaceByLabel, palace.name, "palace");
    const stemKey = requireMapped(registries.stemByLabel, palace.heavenlyStem, "stem");
    const branchKey = requireMapped(registries.branchByLabel, palace.earthlyBranch, "branch");
    const stars = [
      ...palace.majorStars.map((star) => mapStar(star, "major", registries)),
      ...palace.minorStars.map((star) => mapStar(star, "minor", registries)),
      ...palace.adjectiveStars.map((star) => mapStar(star, "auxiliary", registries))
    ];
    const range = palace.decadal?.range;
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger)) {
      fail("INVALID_DECADAL_RANGE", `Palace ${palace.name} has no exact decadal range`);
    }
    return {
      earthlyBranchId: stableBranchId(branchKey),
      heavenlyStemId: stableStemId(stemKey),
      roleId: PALACE_ROLE_BY_KEY[palaceKey],
      isBodyPalace: palace.isBodyPalace === true,
      stars,
      upstreamDecadal: { startAge: range[0], endAge: range[1] }
    };
  });
  const byBranch = new Map(mappedPalaces.map((palace) => [palace.earthlyBranchId, palace]));
  const palaces = BRANCH_IDS.map((branchId) => {
    const palace = byBranch.get(branchId);
    if (!palace) fail("MISSING_CANONICAL_PALACE", `No palace was mapped for ${branchId}`);
    const { upstreamDecadal: _discarded, ...fact } = palace;
    return fact;
  });
  if (new Set(palaces.map((palace) => palace.roleId)).size !== 12) fail("DUPLICATE_PALACE_ROLE", "Final palaces do not contain twelve distinct roles");
  const lifePalace = palaces.find((palace) => palace.roleId === "life");
  const bodyPalaces = palaces.filter((palace) => palace.isBodyPalace);
  if (!lifePalace || bodyPalaces.length !== 1) fail("INVALID_LIFE_BODY_PALACE", "Final palaces must contain one life palace and one body palace");

  const periodsByAge = [...mappedPalaces].sort((left, right) => left.upstreamDecadal.startAge - right.upstreamDecadal.startAge);
  if (periodsByAge[0]?.roleId !== "life") fail("FIRST_PERIOD_NOT_LIFE_PALACE", "The first major period must bind the final life palace");
  const firstBranchIndex = BRANCH_IDS.indexOf(periodsByAge[0].earthlyBranchId);
  const secondBranchIndex = BRANCH_IDS.indexOf(periodsByAge[1].earthlyBranchId);
  const step = (secondBranchIndex - firstBranchIndex + 12) % 12;
  const direction = step === 1 ? "forward" : step === 11 ? "backward" : fail("INVALID_PERIOD_DIRECTION", `Major periods step by ${step} branches`);
  const majorPeriods = periodsByAge.map((palace, index) => ({
    sequence: index + 1,
    palaceRoleId: palace.roleId,
    heavenlyStemId: palace.heavenlyStemId,
    earthlyBranchId: palace.earthlyBranchId,
    direction,
    ageKind: "nominal_age",
    startAge: palace.upstreamDecadal.startAge,
    endAge: palace.upstreamDecadal.endAge
  }));

  const polarity = ["zi", "yin", "chen", "wu", "shen", "xu"].includes(natalYear.branchId) ? "yang" : "yin";
  const expectedDirection = (input.sexForCalculation === "male" ? "yang" : "yin") === polarity ? "forward" : "backward";
  if (direction !== expectedDirection) fail("PERIOD_DIRECTION_BASIS_MISMATCH", "Mapped period order disagrees with natal-year-branch polarity and calculation sex");

  const bureauKey = requireMapped(registries.bureauByLabel, chart.fiveElementsClass, "five-elements bureau");
  const lifeMasterKey = requireMapped(registries.starByLabel, chart.soul, "life master star");
  const bodyMasterKey = requireMapped(registries.starByLabel, chart.body, "body master star");
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
      shichen: {
        index: input.shichenIndex,
        branchId: SHICHEN_BRANCH_IDS[input.shichenIndex],
        civilRange: [
          "00:00-01:00", "01:00-03:00", "03:00-05:00", "05:00-07:00", "07:00-09:00",
          "09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00",
          "19:00-21:00", "21:00-23:00", "23:00-24:00"
        ][input.shichenIndex]
      },
      ganzhi
    },
    directionBasis: {
      yearStemId: natalYear.stemId,
      yearBranchId: natalYear.branchId,
      yearPolarity: polarity,
      sexForCalculation: input.sexForCalculation,
      resolvedDirection: direction,
      ruleId: "iztro.2_5_8.year_branch_polarity_sex"
    },
    lifePalaceBranchId: lifePalace.earthlyBranchId,
    bodyPalaceBranchId: bodyPalaces[0].earthlyBranchId,
    lifeMasterStarId: projectStarId(lifeMasterKey),
    bodyMasterStarId: projectStarId(bodyMasterKey),
    fiveElementBureauId: BUREAU_BY_KEY[bureauKey],
    palaces,
    majorPeriods
  };
}

function calculate(request, profile, registries) {
  const { input, ruleSnapshot } = request;
  if (ruleSnapshot.rules.leapMonthPlacement.mode === "iztro_fix_leap"
    && input.calendarInput.calendar === "chinese_lunisolar"
    && input.calendarInput.date.isLeapMonth
    && input.shichenIndex === 12) {
    fail("UNSUPPORTED_LEAP_MONTH_LATE_ZI", "Leap-month late-Zi input is held closed until an audited compatibility rule exists");
  }
  if (ruleSnapshot.rules.chartType !== "heaven") {
    fail("UNSUPPORTED_CHART_TYPE", "Earth and human charts remain outside the first isolated adapter slice");
  }
  const config = effectiveConfigFromRules(ruleSnapshot.rules, profile);
  const calendarInput = input.calendarInput;
  const option = {
    type: calendarInput.calendar === "gregorian" ? "solar" : "lunar",
    dateStr: calendarInput.calendar === "gregorian"
      ? calendarInput.date
      : `${calendarInput.date.year}-${calendarInput.date.month}-${calendarInput.date.day}`,
    timeIndex: input.shichenIndex,
    gender: input.sexForCalculation,
    isLeapMonth: calendarInput.calendar === "chinese_lunisolar" ? calendarInput.date.isLeapMonth : false,
    fixLeap: ruleSnapshot.rules.leapMonthPlacement.mode === "iztro_fix_leap",
    language: "zh-CN",
    astroType: ruleSnapshot.rules.chartType,
    config
  };
  const chart = astro.withOptions(option);
  const retainedConfig = astro.getConfig();
  assertExactJson(
    retainedConfig,
    config,
    "EFFECTIVE_CONFIG_MISMATCH",
    "iztro did not retain the complete effective profile supplied for this calculation"
  );
  return mapChart(input, ruleSnapshot.rules, chart, registries);
}

async function main() {
  if (!parentPort) fail("NO_PARENT_PORT", "Worker must run under node:worker_threads");
  const startedAt = new Date().toISOString();
  const workerInstanceId = randomUUID();
  try {
    if (!workerData || workerData.protocolVersion !== PROTOCOL_VERSION) {
      fail("PROTOCOL_MISMATCH", "Unknown or missing worker protocol version");
    }
    const runtimeVersions = verifyRuntimeGraph();
    const registries = frozenRegistries();
    const profile = defaultProfile(registries, runtimeVersions);
    let result;
    if (workerData.action === "profile") {
      result = profile;
    } else if (workerData.action === "calculate") {
      result = { profile, facts: calculate(workerData, profile, registries) };
    } else {
      fail("UNKNOWN_ACTION", `Unknown worker action ${JSON.stringify(workerData.action)}`);
    }
    parentPort.postMessage({
      ok: true,
      protocolVersion: PROTOCOL_VERSION,
      requestId: workerData.requestId,
      workerInstanceId,
      startedAt,
      completedAt: new Date().toISOString(),
      runtimeVersion: process.version,
      result
    });
  } catch (error) {
    parentPort.postMessage({
      ok: false,
      protocolVersion: PROTOCOL_VERSION,
      requestId: workerData?.requestId ?? null,
      workerInstanceId,
      startedAt,
      completedAt: new Date().toISOString(),
      runtimeVersion: process.version,
      error: {
        code: typeof error?.code === "string" ? error.code : "IZTRO_WORKER_FAILED",
        message: error instanceof Error ? error.message : String(error)
      }
    });
  }
  parentPort.close();
}

await main();
