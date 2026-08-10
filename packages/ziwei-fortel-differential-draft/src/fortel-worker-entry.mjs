import fortel from "fortel-ziweidoushu";
import { parentPort, workerData } from "node:worker_threads";

const PROTOCOL_VERSION = "hakimi-ziwei-fortel-differential-worker/0.1-draft";
const UPSTREAM_VERSION = "1.3.4";

const BRANCH_IDS = Object.freeze([
  "zi", "chou", "yin", "mao", "chen", "si",
  "wu", "wei", "shen", "you", "xu", "hai"
]);
const STEM_IDS = Object.freeze([
  "jia", "yi", "bing", "ding", "wu", "ji", "geng", "xin", "ren", "gui"
]);
const ROLE_BY_TEMPLE_KEY = Object.freeze({
  TEMPLE_DESTINY: "life",
  TEMPLE_BROTHER: "siblings",
  TEMPLE_MARRIAGE: "spouse",
  TEMPLE_CHILDREN: "children",
  TEMPLE_MONEY: "wealth",
  TEMPLE_ILLNESS: "health",
  TEMPLE_MOVE: "travel",
  TEMPLE_FRIEND: "friends",
  TEMPLE_CAREER: "career",
  TEMPLE_HOUSE: "property",
  TEMPLE_HAPPINESS: "wellbeing",
  TEMPLE_PARENT: "parents"
});
const ROLE_IDS = Object.freeze([
  "life", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "wellbeing", "parents"
]);
const MAJOR_KEY_MAP = Object.freeze({
  MAJOR_STAR_EMPEROR: "ziweiMaj",
  MAJOR_STAR_CHANGE: "tianjiMaj",
  MAJOR_STAR_SUN: "taiyangMaj",
  MAJOR_STAR_GOLD: "wuquMaj",
  MAJOR_STAR_ENJOYMENT: "tiantongMaj",
  MAJOR_STAR_FIRE: "lianzhenMaj",
  MAJOR_STAR_TREASURY: "tianfuMaj",
  MAJOR_STAR_MOON: "taiyinMaj",
  MAJOR_STAR_GREED: "tanlangMaj",
  MAJOR_STAR_ARGUMENT: "jumenMaj",
  MAJOR_STAR_SUPPORT: "tianxiangMaj",
  MAJOR_STAR_RULE: "tianliangMaj",
  MAJOR_STAR_GENERAL: "qishaMaj",
  MAJOR_STAR_PIONEER: "pojunMaj"
});
const MINOR_KEY_MAP = Object.freeze({
  MINOR_STAR_EARN: "lucunMin",
  MINOR_STAR_BENEFACTOR_MAN: "tiankuiMin",
  MINOR_STAR_BENEFACTOR_WOMAN: "tianyueMin",
  MINOR_STAR_CLEVER: "wenchangMin",
  MINOR_STAR_SKILL: "wenquMin",
  MINOR_STAR_SUPPORT_LEFT: "zuofuMin",
  MINOR_STAR_SUPPORT_RIGHT: "youbiMin",
  MINOR_STAR_VOID_GROUND: "dikongMin",
  MINOR_STAR_LOST: "dijieMin",
  MINOR_STAR_BURNING: "huoxingMin",
  MINOR_STAR_HIDDEN_FIRE: "lingxingMin",
  MINOR_STAR_COMPETITION: "qingyangMin",
  MINOR_STAR_HINDRANCE: "tuoluoMin",
  MINOR_STAR_PEGASUS: "tianmaMin"
});
const TRANSFORMATION_BY_KEY = Object.freeze({
  WEALTHINESS: "lu",
  POWER: "quan",
  FAME: "ke",
  PROBLEM: "ji"
});
const BUREAU_BY_PATTERN = Object.freeze({
  2: "water_2",
  3: "wood_3",
  4: "metal_4",
  5: "earth_5",
  6: "fire_6"
});

const startedAt = new Date().toISOString();
const workerInstanceId = crypto.randomUUID();

try {
  const request = requireRequest(workerData);
  assertFrozenUpstreamProfile();
  const projection = calculateProjection(request.input);
  parentPort?.postMessage({
    ok: true,
    protocolVersion: PROTOCOL_VERSION,
    requestId: request.requestId,
    workerInstanceId,
    startedAt,
    completedAt: new Date().toISOString(),
    runtimeVersion: process.version,
    upstreamVersion: UPSTREAM_VERSION,
    result: projection
  });
} catch (error) {
  parentPort?.postMessage({
    ok: false,
    protocolVersion: PROTOCOL_VERSION,
    requestId: isRecord(workerData) && typeof workerData.requestId === "string"
      ? workerData.requestId
      : null,
    workerInstanceId,
    startedAt,
    completedAt: new Date().toISOString(),
    runtimeVersion: process.version,
    upstreamVersion: UPSTREAM_VERSION,
    error: {
      code: error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "FORTEL_WORKER_FAILED",
      message: error instanceof Error ? error.message : String(error)
    }
  });
} finally {
  parentPort?.close();
}

function requireRequest(value) {
  if (!isRecord(value)
    || !hasExactKeys(value, ["action", "input", "protocolVersion", "requestId"])
    || value.protocolVersion !== PROTOCOL_VERSION
    || value.action !== "project"
    || typeof value.requestId !== "string"
    || !/^[0-9a-f-]{36}$/iu.test(value.requestId)) {
    throw codedError("INVALID_REQUEST", "Fortel Worker request envelope is invalid");
  }
  return { ...value, input: requireInput(value.input) };
}

function requireInput(value) {
  if (!isRecord(value)
    || !hasExactKeys(value, ["gregorianDate", "sexForCalculation", "shichenIndex"])
    || typeof value.gregorianDate !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/u.test(value.gregorianDate)
    || !Number.isInteger(value.shichenIndex)
    || value.shichenIndex < 0
    || value.shichenIndex > 12
    || (value.sexForCalculation !== "male" && value.sexForCalculation !== "female")) {
    throw codedError("INVALID_INPUT", "Fortel input must be one strict Gregorian date, one of 13 shichen slots, and a binary calculation sex");
  }
  const [year, month, day] = value.gregorianDate.split("-").map(Number);
  const exactDate = new Date(Date.UTC(year, month - 1, day));
  if (exactDate.getUTCFullYear() !== year
    || exactDate.getUTCMonth() + 1 !== month
    || exactDate.getUTCDate() !== day
    || value.gregorianDate < "1900-01-31"
    || value.gregorianDate > "2100-12-31") {
    throw codedError("INPUT_OUTSIDE_VERIFIED_RANGE", "Fortel differential dates are restricted to 1900-01-31 through 2100-12-31");
  }
  return value;
}

function assertFrozenUpstreamProfile() {
  const shichen = fortel.DayTimeGround.values();
  const expectedHours = [[0, 1], ...Array.from({ length: 11 }, (_, index) => [index * 2 + 1, index * 2 + 3]), [23, 24]];
  if (shichen.length !== 13 || shichen.some((slot, index) =>
    slot.index !== index
    || slot.hourStart !== expectedHours[index][0]
    || slot.hourEnd !== expectedHours[index][1])) {
    throw codedError("UPSTREAM_PROFILE_MISMATCH", "Fortel 13-slot shichen profile changed");
  }
  const majorKeys = fortel.MajorStar.stars.map((star) => star.key).sort();
  const minorKeys = fortel.MinorStar.stars.map((star) => star.key).sort();
  if (canonical(majorKeys) !== canonical(Object.keys(MAJOR_KEY_MAP).sort())
    || canonical(minorKeys) !== canonical(Object.keys(MINOR_KEY_MAP).sort())) {
    throw codedError("UPSTREAM_PROFILE_MISMATCH", "Fortel named major/minor star registries changed");
  }
  const templeKeys = fortel.Temple.LOOP_TEMPLES.map((temple) => temple.key);
  if (canonical(templeKeys) !== canonical(Object.keys(ROLE_BY_TEMPLE_KEY))) {
    throw codedError("UPSTREAM_PROFILE_MISMATCH", "Fortel twelve-palace registry changed");
  }
}

function calculateProjection(input) {
  const [year, month, day] = input.gregorianDate.split("-").map(Number);
  const config = fortel.DestinyConfigBuilder.withSolar({
    year,
    month,
    day,
    bornTimeGround: fortel.DayTimeGround.get(input.shichenIndex),
    configType: fortel.ConfigType.SKY,
    gender: input.sexForCalculation === "male" ? fortel.Gender.M : fortel.Gender.F
  });
  const roundTrip = fortel.defaultCalendar.lunar2solar(
    config.year,
    config.month,
    config.day,
    config.isLeapMonth
  );
  if (!roundTrip
    || roundTrip.solarYear !== year
    || roundTrip.solarMonth !== month
    || roundTrip.solarDay !== day) {
    throw codedError("CALENDAR_ROUND_TRIP_MISMATCH", "Fortel Gregorian/lunar round trip did not preserve the strict input date");
  }

  const board = new fortel.DestinyBoard(config);
  const roleBranches = {};
  const palaceStems = {};
  const majorStarBranches = {};
  const minorStarBranches = {};
  for (const cell of board.cells) {
    const branchId = requireIndexed(BRANCH_IDS, cell.ground.index, "earthly branch");
    const roleTemple = cell.temples.find((temple) => temple.key !== "TEMPLE_BODY");
    const roleId = roleTemple ? ROLE_BY_TEMPLE_KEY[roleTemple.key] : null;
    if (!roleId || Object.hasOwn(roleBranches, roleId)) {
      throw codedError("INVALID_FORTEL_FACTS", "Fortel did not return exactly one canonical role per palace");
    }
    roleBranches[roleId] = branchId;
    palaceStems[roleId] = requireIndexed(STEM_IDS, cell.sky.index, "heavenly stem");
    for (const star of cell.majorStars) {
      insertUnique(majorStarBranches, MAJOR_KEY_MAP[star.key], branchId, "major star");
    }
    for (const star of cell.minorStars) {
      insertUnique(minorStarBranches, MINOR_KEY_MAP[star.key], branchId, "minor star");
    }
  }
  requireExactKeySet(roleBranches, ROLE_IDS, "palace roles");
  requireExactKeySet(majorStarBranches, Object.values(MAJOR_KEY_MAP), "major stars");
  requireExactKeySet(minorStarBranches, Object.values(MINOR_KEY_MAP), "minor stars");

  const transformations = {};
  for (const [derivative, star] of board.bornStarDerivativeMap.entries()) {
    const transformationId = TRANSFORMATION_BY_KEY[derivative.key];
    const canonicalStarId = MAJOR_KEY_MAP[star.key] ?? MINOR_KEY_MAP[star.key];
    insertUnique(transformations, transformationId, canonicalStarId, "transformation");
  }
  requireExactKeySet(transformations, ["lu", "quan", "ke", "ji"], "transformations");

  const majorPeriods = board.cells
    .map((cell) => {
      const roleTemple = cell.temples.find((temple) => temple.key !== "TEMPLE_BODY");
      const roleId = roleTemple ? ROLE_BY_TEMPLE_KEY[roleTemple.key] : null;
      if (!roleId) throw codedError("INVALID_FORTEL_FACTS", "Fortel major period has no canonical palace role");
      return {
        roleId,
        heavenlyStemId: requireIndexed(STEM_IDS, cell.sky.index, "major-period heavenly stem"),
        earthlyBranchId: requireIndexed(BRANCH_IDS, cell.ground.index, "major-period earthly branch"),
        direction: board.configDirection.direction === 1 ? "forward" : "backward",
        startAge: cell.ageStart,
        endAge: cell.ageEnd
      };
    })
    .sort((left, right) => left.startAge - right.startAge)
    .map((period, index) => ({ sequence: index + 1, ...period }));
  if (majorPeriods.length !== 12
    || majorPeriods.some((period, index) => period.endAge !== period.startAge + 9
      || (index > 0 && period.startAge !== majorPeriods[index - 1].endAge + 1))) {
    throw codedError("INVALID_FORTEL_FACTS", "Fortel major periods are not twelve contiguous ten-year ranges");
  }

  const bodyCell = board.getCellByTemple(fortel.Temple.TEMPLE_BODY);
  const bureauId = BUREAU_BY_PATTERN[board.element.patternNumber];
  if (!bureauId) throw codedError("INVALID_FORTEL_FACTS", "Fortel returned an unknown five-element bureau");

  return {
    projectionVersion: "hakimi-ziwei-named-facts/0.1-draft",
    chartType: "heaven",
    input: { ...input },
    calendar: {
      gregorianDate: input.gregorianDate,
      lunarDate: {
        year: config.year,
        month: config.month,
        day: config.day,
        isLeapMonth: config.isLeapMonth
      },
      shichenIndex: input.shichenIndex,
      yearGanzhi: ganzhi(config.yearSky.index, config.yearGround.index),
      monthGanzhi: ganzhi(config.monthSky.index, config.monthGround.index),
      dayGanzhi: ganzhi(config.daySky.index, config.dayGround.index),
      hourGanzhi: null
    },
    lifePalaceBranchId: requireIndexed(BRANCH_IDS, board.destinyTempleCellGround.index, "life palace"),
    bodyPalaceBranchId: requireIndexed(BRANCH_IDS, bodyCell.ground.index, "body palace"),
    fiveElementBureauId: bureauId,
    direction: board.configDirection.direction === 1 ? "forward" : "backward",
    roleBranches,
    palaceStems,
    majorStarBranches,
    minorStarBranches,
    transformations,
    majorPeriods,
    engineSpecific: {
      monthGanzhiSemantics: "fortel_bundled_calendar_solar_term_month",
      lateZiDayPolicy: "same_civil_day",
      chartType: "SKY",
      librarySchoolClaim: "zhongzhou"
    },
    unsupportedFieldFamilies: [
      "hour_ganzhi",
      "brightness_scale",
      "auxiliary_star_inventory",
      "borrowed_palace_ratios",
      "runtime_transits",
      "interpretation"
    ]
  };
}

function ganzhi(stemIndex, branchIndex) {
  return `${requireIndexed(STEM_IDS, stemIndex, "ganzhi stem")}_${requireIndexed(BRANCH_IDS, branchIndex, "ganzhi branch")}`;
}

function requireIndexed(values, index, label) {
  const value = Number.isInteger(index) ? values[index] : null;
  if (!value) throw codedError("INVALID_FORTEL_FACTS", `Fortel returned an unknown ${label}`);
  return value;
}

function insertUnique(target, key, value, label) {
  if (typeof key !== "string" || typeof value !== "string" || Object.hasOwn(target, key)) {
    throw codedError("INVALID_FORTEL_FACTS", `Fortel returned an unknown or duplicate ${label}`);
  }
  target[key] = value;
}

function requireExactKeySet(value, expected, label) {
  if (canonical(Object.keys(value).sort()) !== canonical([...expected].sort())) {
    throw codedError("INVALID_FORTEL_FACTS", `Fortel ${label} do not match the frozen named-field registry`);
  }
}

function hasExactKeys(value, expected) {
  return canonical(Object.keys(value).sort()) === canonical([...expected].sort());
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonical(value) {
  return JSON.stringify(value);
}

function codedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
