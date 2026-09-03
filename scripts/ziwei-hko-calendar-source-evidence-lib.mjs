import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const MAX_JSON_BYTES = 1_000_000;
const MAX_SOURCE_BYTES = 1_000_000;
const MAX_RAW_RESOURCE_BYTES = 65_536;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u;

export const ZIWEI_HKO_EVIDENCE_PATH =
  "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json";
export const ZIWEI_HKO_CANDIDATE_ID =
  "hakimi.ziwei.source-candidate/hko-calendar-boundary-replay-2023-2028/1.0.0";
export const ZIWEI_HKO_SUBJECT_ID = "ziwei.engineering.official-calendar-differential";

const SOURCE_SPECS = Object.freeze([
  Object.freeze({
    role: "annual_raw_response_snapshots",
    path: "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
    bytes: 15_501,
    sha256: "32dfd1a9ed204c5b96a100a082d1d02f0b9391ddcc867f32c2c06d39f2972fe2"
  }),
  Object.freeze({
    role: "calendar_boundary_matrix",
    path: "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json",
    bytes: 13_700,
    sha256: "6d89fc823112556b21e3792637db3164a380cde2d2a8c28206bb9b83975e64ec"
  }),
  Object.freeze({
    role: "strict_parser_and_replay_implementation",
    path: "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.ts",
    bytes: 26_429,
    sha256: "5b653c50eb81144e2fa1738a6c0f34b425b23901e18078f38fa4273cdc9f9399"
  })
]);

const EXPECTED_YEARS = Object.freeze([2023, 2024, 2025, 2026, 2027, 2028]);
const EXPECTED_GZIP_SHA256 = Object.freeze(new Map([
  [2023, "a47d523c041d1bb88ba40b29d7b35da0a87e4cfbe9fca42bb03ff4e2910a02ab"],
  [2024, "7229e310fdd84ebb03cb06dad4f74db712c0badeb0020fc8eb09a5482a649ecb"],
  [2025, "7b843d29284f16951ee4cc07ce7bd64671d05f595b2cadcd9714940ed8207d79"],
  [2026, "4fd3256fe7f73728f06a52da7f625eeaf6e25edce3978c33b0d4e66c47b22f3c"],
  [2027, "77d4403d14d25376e4b42adf9f8a6f18e5bd223cdcf635c07513e06ef49f3b88"],
  [2028, "3492e08f4f7a8b070818caec04ce2c9432bde66487605358b7ab4d3ac7700a1b"]
]));
const MONTHS = Object.freeze(new Map([
  ["正月", 1], ["一月", 1], ["二月", 2], ["三月", 3], ["四月", 4], ["五月", 5], ["六月", 6],
  ["七月", 7], ["八月", 8], ["九月", 9], ["十月", 10], ["十一月", 11], ["十二月", 12]
]));
const DAYS = Object.freeze(new Map([
  ["初一", 1], ["初二", 2], ["初三", 3], ["初四", 4], ["初五", 5], ["初六", 6], ["初七", 7], ["初八", 8], ["初九", 9], ["初十", 10],
  ["十一", 11], ["十二", 12], ["十三", 13], ["十四", 14], ["十五", 15], ["十六", 16], ["十七", 17], ["十八", 18], ["十九", 19], ["二十", 20],
  ["廿一", 21], ["廿二", 22], ["廿三", 23], ["廿四", 24], ["廿五", 25], ["廿六", 26], ["廿七", 27], ["廿八", 28], ["廿九", 29], ["三十", 30]
]));
const ENGLISH_MONTHS = Object.freeze(new Map([
  ["Jan", 1], ["Feb", 2], ["Mar", 3], ["Apr", 4], ["May", 5], ["Jun", 6],
  ["Jul", 7], ["Aug", 8], ["Sep", 9], ["Oct", 10], ["Nov", 11], ["Dec", 12]
]));

export class ZiweiHkoCalendarSourceEvidenceError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "ZiweiHkoCalendarSourceEvidenceError";
    this.code = code;
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  throw new ZiweiHkoCalendarSourceEvidenceError("NON_CANONICAL_VALUE", "HKO evidence 只接受有限规范 JSON 值。");
}

export function canonicalStringifyZiweiHkoCalendarSourceEvidence(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeZiweiHkoCalendarSourceEvidenceDigest(evidence) {
  const { evidenceDigest: _evidenceDigest, ...unsigned } = evidence;
  return sha256(Buffer.from(canonicalStringifyZiweiHkoCalendarSourceEvidence(unsigned), "utf8"));
}

function safeWorkspacePath(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("UNSAFE_PATH", `HKO evidence 路径不安全：${relativePath}`);
  }
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function readBoundedWorkspaceFile(workspaceRoot, relativePath, maxBytes) {
  const root = await realpath(path.resolve(workspaceRoot));
  const absolute = safeWorkspacePath(root, relativePath);
  let actual;
  try {
    actual = await realpath(absolute);
  } catch (cause) {
    throw new ZiweiHkoCalendarSourceEvidenceError("FILE_UNAVAILABLE", `HKO evidence 文件不可读：${relativePath}`, { cause });
  }
  const escaped = path.relative(root, actual);
  if (escaped === "" || escaped === ".." || escaped.startsWith(`..${path.sep}`) || path.isAbsolute(escaped)) {
    throw new ZiweiHkoCalendarSourceEvidenceError("UNSAFE_PATH", `HKO evidence 路径越界：${relativePath}`);
  }
  if (path.normalize(actual).toLowerCase() !== path.normalize(absolute).toLowerCase()) {
    throw new ZiweiHkoCalendarSourceEvidenceError("SYMLINK_REJECTED", `HKO evidence 拒绝符号链接：${relativePath}`);
  }
  const handle = await open(actual, "r");
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size <= 0n || before.size > BigInt(maxBytes)) {
      throw new ZiweiHkoCalendarSourceEvidenceError("FILE_SIZE_INVALID", `HKO evidence 文件为空或超限：${relativePath}`);
    }
    const buffer = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (!sameEndpoint(before, after) || BigInt(buffer.byteLength) !== before.size) {
      throw new ZiweiHkoCalendarSourceEvidenceError("ENDPOINT_CHANGED", `HKO evidence 读取期间端点变化：${relativePath}`);
    }
    return Object.freeze({
      path: relativePath,
      bytes: buffer.byteLength,
      sha256: sha256(buffer),
      buffer
    });
  } finally {
    await handle.close();
  }
}

function parseJson(buffer, label) {
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch (cause) {
    throw new ZiweiHkoCalendarSourceEvidenceError("INVALID_JSON", `${label} 不是有效 JSON。`, { cause });
  }
}

function assertSourceIdentity(readResult, spec) {
  if (readResult.bytes !== spec.bytes || readResult.sha256 !== spec.sha256) {
    throw new ZiweiHkoCalendarSourceEvidenceError("SOURCE_ARTIFACT_DRIFT", `${spec.path} 与锁定 bytes/SHA-256 不一致。`);
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new ZiweiHkoCalendarSourceEvidenceError("EVIDENCE_INVALID", `${label} 必须是普通 JSON 对象。`);
  }
  return value;
}

function computeSourceBodySetDigest(resources) {
  const projection = resources.map((entry) => ({
    year: entry.year,
    resourceUrl: entry.resourceUrl,
    resourceBytes: entry.rawBytes,
    resourceSha256: entry.rawSha256
  }));
  return sha256(Buffer.from(
    `hakimi.ziwei.hko-source-body-set/1\n${canonicalStringifyZiweiHkoCalendarSourceEvidence(projection)}`,
    "utf8"
  ));
}

function parseGregorianDate(raw, expectedYear) {
  const match = /^(\d{1,2})-([A-Z][a-z]{2})-(\d{2})$/u.exec(raw);
  if (!match || !ENGLISH_MONTHS.has(match[2])) {
    throw new ZiweiHkoCalendarSourceEvidenceError("CSV_INVALID", `HKO 公历日期格式无效：${raw}`);
  }
  const day = Number(match[1]);
  const month = ENGLISH_MONTHS.get(match[2]);
  const year = 2000 + Number(match[3]);
  const instant = new Date(Date.UTC(year, month - 1, day));
  if (
    year !== expectedYear
    || instant.getUTCFullYear() !== year
    || instant.getUTCMonth() + 1 !== month
    || instant.getUTCDate() !== day
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("CSV_INVALID", `HKO 公历日期越界：${raw}`);
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextGregorianDate(date) {
  const instant = new Date(`${date}T00:00:00.000Z`);
  instant.setUTCDate(instant.getUTCDate() + 1);
  return instant.toISOString().slice(0, 10);
}

function parseLunarMonth(raw) {
  const isLeapMonth = raw.startsWith("閏") || raw.startsWith("闰");
  const normalized = isLeapMonth ? raw.slice(1) : raw;
  const month = MONTHS.get(normalized);
  if (month === undefined) {
    throw new ZiweiHkoCalendarSourceEvidenceError("CSV_INVALID", `HKO 农历月份无效：${raw}`);
  }
  return { month, isLeapMonth };
}

function lunarTuple(row) {
  return [row.gregorianDate, row.lunarYear, row.lunarMonth, row.lunarDay, row.isLeapMonth];
}

function assertLunarDayContinuity(before, after, label) {
  if (after.lunarDay === 1) return;
  if (
    after.lunarYear !== before.lunarYear
    || after.lunarMonth !== before.lunarMonth
    || after.isLeapMonth !== before.isLeapMonth
    || after.lunarDay !== before.lunarDay + 1
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("CSV_CONTINUITY_INVALID", `HKO 农历日期不连续：${label}`);
  }
}

function boundaryKind(before, after) {
  if (after.lunarDay !== 1) return null;
  if (after.lunarMonth === 1 && !after.isLeapMonth && after.lunarYear === before.lunarYear + 1) return "lunar_new_year";
  if (after.isLeapMonth && !before.isLeapMonth && after.lunarMonth === before.lunarMonth) return "leap_month_start";
  if (before.isLeapMonth && !after.isLeapMonth && after.lunarMonth !== before.lunarMonth) return "leap_month_end";
  return "ordinary_month_transition";
}

function parseIndependentAnnualCalendar(lock, raw) {
  const hasUtf8Bom = raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  const text = raw.toString("utf8");
  const withoutBom = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const hasCrLf = withoutBom.includes("\r\n");
  const hasBareLf = /(^|[^\r])\n/u.test(withoutBom);
  const lineEnding = hasCrLf ? "CRLF" : "LF";
  if ((hasCrLf && hasBareLf) || (!hasCrLf && withoutBom.includes("\r"))) {
    throw new ZiweiHkoCalendarSourceEvidenceError("CSV_INVALID", `HKO ${lock.year} 换行混合。`);
  }
  const lines = withoutBom.split(hasCrLf ? "\r\n" : "\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.shift() !== "Gregorian Date,Chinese year (Gan-Zhi),Chinese year (Zodiac),Lunar month,Lunar Date") {
    throw new ZiweiHkoCalendarSourceEvidenceError("CSV_INVALID", `HKO ${lock.year} CSV header 无效。`);
  }
  let lunarYear = lock.year - 1;
  const rows = lines.map((line, index) => {
    const fields = line.split(",");
    if (fields.length !== 5 || !/^[\p{Script=Han}]{2}年$/u.test(fields[1]) || fields[2].length === 0) {
      throw new ZiweiHkoCalendarSourceEvidenceError("CSV_INVALID", `HKO ${lock.year} 第 ${index + 2} 行字段无效。`);
    }
    const month = parseLunarMonth(fields[3]);
    const lunarDay = DAYS.get(fields[4]);
    if (lunarDay === undefined) {
      throw new ZiweiHkoCalendarSourceEvidenceError("CSV_INVALID", `HKO ${lock.year} 农历日无效：${fields[4]}`);
    }
    if (month.month === 1 && !month.isLeapMonth && lunarDay === 1) lunarYear = lock.year;
    return Object.freeze({
      gregorianDate: parseGregorianDate(fields[0], lock.year),
      lunarYear,
      lunarMonth: month.month,
      lunarDay,
      isLeapMonth: month.isLeapMonth
    });
  });
  for (let index = 1; index < rows.length; index += 1) {
    if (nextGregorianDate(rows[index - 1].gregorianDate) !== rows[index].gregorianDate) {
      throw new ZiweiHkoCalendarSourceEvidenceError("CSV_CONTINUITY_INVALID", `HKO ${lock.year} 公历日期不连续。`);
    }
    assertLunarDayContinuity(rows[index - 1], rows[index], `${lock.year}:${index}`);
  }
  if (
    raw.byteLength !== lock.resourceBytes
    || sha256(raw) !== lock.resourceSha256
    || hasUtf8Bom !== lock.hasUtf8Bom
    || lineEnding !== lock.lineEnding
    || rows.length !== lock.rowCount
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("RESOURCE_IDENTITY_MISMATCH", `HKO ${lock.year} 资源锁不一致。`);
  }
  return Object.freeze({ year: lock.year, rows: Object.freeze(rows), hasUtf8Bom, lineEnding });
}

function deriveIndependentBoundaries(calendars) {
  return calendars.flatMap((calendar) => {
    const result = [];
    for (let index = 1; index < calendar.rows.length; index += 1) {
      const before = calendar.rows[index - 1];
      const after = calendar.rows[index];
      const kind = boundaryKind(before, after);
      if (kind) result.push([kind, lunarTuple(before), lunarTuple(after)]);
    }
    return result;
  });
}

function assertIndependentRangeSeams(calendars) {
  const seams = [];
  for (let index = 1; index < calendars.length; index += 1) {
    const before = calendars[index - 1].rows.at(-1);
    const after = calendars[index].rows[0];
    if (nextGregorianDate(before.gregorianDate) !== after.gregorianDate) {
      throw new ZiweiHkoCalendarSourceEvidenceError("CSV_CONTINUITY_INVALID", "HKO 跨年公历接缝不连续。");
    }
    assertLunarDayContinuity(before, after, `${calendars[index - 1].year}->${calendars[index].year}`);
    seams.push(Object.freeze({ fromYear: calendars[index - 1].year, toYear: calendars[index].year }));
  }
  return Object.freeze(seams);
}

async function replayCurrentSources(workspaceRoot) {
  const reads = await Promise.all(SOURCE_SPECS.map(async (spec) => {
    const readResult = await readBoundedWorkspaceFile(workspaceRoot, spec.path, MAX_SOURCE_BYTES);
    assertSourceIdentity(readResult, spec);
    return readResult;
  }));
  const byRole = new Map(SOURCE_SPECS.map((spec, index) => [spec.role, reads[index]]));
  const matrix = parseJson(byRole.get("calendar_boundary_matrix").buffer, "HKO boundary matrix");
  const snapshots = parseJson(byRole.get("annual_raw_response_snapshots").buffer, "HKO source snapshots");

  if (
    snapshots?.format !== "hakimi-hko-annual-csv-source-snapshots/0.1-draft"
    || snapshots.compression !== "gzip"
    || snapshots.contentTransferEncoding !== "base64"
    || snapshots.productionEligible !== false
    || !Array.isArray(snapshots.snapshots)
    || snapshots.snapshots.length !== EXPECTED_YEARS.length
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("SNAPSHOT_SET_INVALID", "HKO snapshot 集合身份无效。");
  }
  if (
    matrix.claimScope !== "calendar_resolution"
    || matrix.civilDateOnly !== true
    || matrix.productionEligible !== false
    || matrix.expertTruthClaimed !== false
    || matrix.source?.datasetPage !== "https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table"
    || matrix.source?.termsUrl !== "https://data.gov.hk/tc/terms-and-conditions"
    || !Array.isArray(matrix.annualResources)
    || matrix.annualResources.length !== EXPECTED_YEARS.length
    || !Array.isArray(matrix.boundaryMatrix)
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("MATRIX_SCOPE_INVALID", "HKO matrix 范围或来源 locator 被扩大或漂移。");
  }
  const years = snapshots.snapshots.map((entry) => entry?.year);
  if (canonicalStringifyZiweiHkoCalendarSourceEvidence(years) !== canonicalStringifyZiweiHkoCalendarSourceEvidence(EXPECTED_YEARS)) {
    throw new ZiweiHkoCalendarSourceEvidenceError("SNAPSHOT_SET_INVALID", "HKO snapshot 年份必须精确为 2023–2028。" );
  }

  const calendars = [];
  const resources = [];
  for (let index = 0; index < EXPECTED_YEARS.length; index += 1) {
    const snapshot = assertPlainObject(snapshots.snapshots[index], `HKO snapshot ${index}`);
    const lock = matrix.annualResources[index];
    if (lock?.year !== snapshot.year || typeof snapshot.payload !== "string" || !CANONICAL_BASE64.test(snapshot.payload)) {
      throw new ZiweiHkoCalendarSourceEvidenceError("SNAPSHOT_SET_INVALID", `HKO ${snapshot.year} snapshot 编码或锁顺序无效。`);
    }
    const gzip = Buffer.from(snapshot.payload, "base64");
    if (
      gzip.toString("base64") !== snapshot.payload
      || gzip.byteLength !== snapshot.gzipBytes
      || sha256(gzip) !== EXPECTED_GZIP_SHA256.get(snapshot.year)
    ) {
      throw new ZiweiHkoCalendarSourceEvidenceError("GZIP_IDENTITY_MISMATCH", `HKO ${snapshot.year} gzip 身份不一致。`);
    }
    let raw;
    try {
      raw = gunzipSync(gzip, { maxOutputLength: MAX_RAW_RESOURCE_BYTES });
    } catch (cause) {
      throw new ZiweiHkoCalendarSourceEvidenceError("GZIP_DECODE_FAILED", `HKO ${snapshot.year} gzip 解码失败或超限。`, { cause });
    }
    const calendar = parseIndependentAnnualCalendar(lock, raw);
    calendars.push(calendar);
    resources.push(Object.freeze({
      year: snapshot.year,
      resourceUrl: lock.resourceUrl,
      gzipBytes: gzip.byteLength,
      gzipSha256: sha256(gzip),
      rawBytes: raw.byteLength,
      rawSha256: sha256(raw),
      rowCount: calendar.rows.length,
      boundaryCount: lock.boundaryCount,
      hasUtf8Bom: calendar.hasUtf8Bom,
      lineEnding: calendar.lineEnding
    }));
  }

  const seams = assertIndependentRangeSeams(calendars);
  const rebuilt = deriveIndependentBoundaries(calendars);
  const matrixProjection = matrix.boundaryMatrix.map((entry) => {
    if (!Array.isArray(entry) || entry.length !== 4 || typeof entry[1] !== "string") {
      throw new ZiweiHkoCalendarSourceEvidenceError("MATRIX_SCOPE_INVALID", "HKO boundary matrix 行无效。");
    }
    return [entry[1], entry[2], entry[3]];
  });
  if (
    calendars.reduce((sum, calendar) => sum + calendar.rows.length, 0) !== 2_192
    || seams.length !== 5
    || rebuilt.length !== 74
    || canonicalStringifyZiweiHkoCalendarSourceEvidence(rebuilt)
      !== canonicalStringifyZiweiHkoCalendarSourceEvidence(matrixProjection)
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("REPLAY_MISMATCH", "HKO 6 资源／2,192 日／74 边界／5 接缝重放不一致。");
  }
  const kindCounts = Object.fromEntries([
    "lunar_new_year",
    "ordinary_month_transition",
    "leap_month_start",
    "leap_month_end"
  ].map((kind) => [kind, rebuilt.filter((entry) => entry[0] === kind).length]));
  if (canonicalStringifyZiweiHkoCalendarSourceEvidence(kindCounts)
    !== canonicalStringifyZiweiHkoCalendarSourceEvidence({
      lunar_new_year: 6,
      ordinary_month_transition: 62,
      leap_month_start: 3,
      leap_month_end: 3
    })) {
    throw new ZiweiHkoCalendarSourceEvidenceError(
      "REPLAY_MISMATCH",
      `HKO boundary kind 分布不一致：${canonicalStringifyZiweiHkoCalendarSourceEvidence(kindCounts)}`
    );
  }

  return Object.freeze({
    sourceArtifacts: SOURCE_SPECS.map((spec, index) => Object.freeze({
      role: spec.role,
      path: spec.path,
      bytes: reads[index].bytes,
      sha256: reads[index].sha256
    })),
    resources: Object.freeze(resources),
    sourceBodySetDigest: computeSourceBodySetDigest(resources),
    retrievedAt: matrix.source.retrievedAt,
    datasetPage: matrix.source.datasetPage,
    termsUrl: matrix.source.termsUrl,
    attribution: matrix.source.attribution,
    kindCounts: Object.freeze(kindCounts)
  });
}

export async function buildCurrentZiweiHkoCalendarSourceEvidence(workspaceRoot, options = {}) {
  const replay = await replayCurrentSources(workspaceRoot);
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "ziwei_hko_calendar_source_candidate_evidence",
    evidenceLedgerId: "hakimi.ziwei.hko-calendar-source-evidence/1.0.0",
    status: "candidate_evidence_replayed_unbound_not_admitted",
    createdAt: options.createdAt ?? new Date().toISOString(),
    systemIdentity: {
      productSystemId: "ziwei-doushu",
      contractSystemId: "ziwei",
      releaseIdentity: "isolated-ziwei-draft-no-main-schema",
      targetSchema: null,
      migrationId: null,
      baziLegacyV13AuthorityInherited: false
    },
    artifactRole: {
      evidenceClass: "source_candidate_engineering_replay",
      productArtifact: false,
      formalSourceBinding: false,
      centralRegistryEntry: false,
      crossSystemReceipt: false
    },
    candidateIdentity: {
      subjectId: ZIWEI_HKO_SUBJECT_ID,
      candidateId: ZIWEI_HKO_CANDIDATE_ID,
      candidateState: "candidate_only_unbound",
      coverageScope: "calendar_resolution",
      sourceBodySetDigest: replay.sourceBodySetDigest,
      subjectFullySatisfied: false,
      bindingFrozenVerified: false
    },
    boundaryBindings: {
      bindingDirection: "hko_child_to_ziwei_source_requirements_only",
      childBindsDomainManifestDirectly: false,
      childBindsCentralRegistry: false,
      childBindsCrossSystemRegistry: false,
      authorityInheritanceAllowed: false
    },
    sourceArtifacts: replay.sourceArtifacts,
    resources: replay.resources,
    derivedCoverage: {
      annualResourcesBound: 6,
      rawSourceBodiesStored: 6,
      dailyRowsBound: 2_192,
      crossFileSeamsBound: 5,
      boundaryPairsBound: 74,
      boundaryKindCounts: replay.kindCounts,
      calendarResolutionOnly: true,
      solarTermsCovered: false
    },
    observationBoundary: {
      datasetPage: replay.datasetPage,
      termsUrl: replay.termsUrl,
      frozenResourcesRetrievedAt: replay.retrievedAt,
      attributionObservedInExistingArtifact: replay.attribution,
      currentRemoteFreshnessRevalidated: false,
      publisherIdentityIndependentlyVerified: false,
      digitalSignatureVerified: false
    },
    rightsBoundary: {
      termsUrlBound: true,
      termsBodyStored: false,
      currentTermsVersionFrozen: false,
      workRightsEstablished: false,
      editionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusion: "not_established",
      redistributionAuthorized: false,
      publicRepositoryBodyInclusionAuthorized: false,
      publicBuildInclusionAuthorized: false,
      storagePolicy: "existing_workspace_snapshot_pending_independent_rights_review"
    },
    expertBoundary: {
      expertTruthClaimed: false,
      independentDomainReviewsVerified: 0,
      expertClaimsAuthorized: false
    },
    integrityBoundary: {
      replayParserImplementation: "independent_child_parser_not_draft_ts_execution",
      resourceHashAndParseUseSameDecodedBuffer: true,
      fixtureHashAndJsonParseUseSameReadBuffer: true,
      parserHashAndExecutionUseSameReadBuffer: false,
      digestIsDigitalSignature: false,
      artifactAuthenticityEstablished: false,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      ziweiRuleTruthEstablished: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      browserRuntimeEvidenceEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      baziAuthority: false,
      westernAuthority: false,
      vedicAuthority: false
    },
    doesNotEstablish: [
      "late_zi_day_boundary",
      "shichen",
      "year_month_day_or_hour_pillars",
      "solar_time_adjustment",
      "ziwei_chart_rules",
      "expert_interpretation",
      "source_authenticity_or_digital_signature",
      "three_layer_rights_or_legal_conclusion",
      "redistribution_authorization",
      "browser_runtime_or_release_evidence",
      "release_readiness_or_public_authorization"
    ]
  };
  return Object.freeze({
    ...unsigned,
    evidenceDigest: computeZiweiHkoCalendarSourceEvidenceDigest(unsigned)
  });
}

async function readEvidenceArtifact(workspaceRoot) {
  const readResult = await readBoundedWorkspaceFile(workspaceRoot, ZIWEI_HKO_EVIDENCE_PATH, MAX_JSON_BYTES);
  return Object.freeze({
    evidence: assertPlainObject(parseJson(readResult.buffer, "Ziwei HKO evidence"), "Ziwei HKO evidence"),
    path: readResult.path,
    bytes: readResult.bytes,
    sha256: readResult.sha256
  });
}

export async function readZiweiHkoCalendarSourceEvidence(workspaceRoot) {
  return (await readEvidenceArtifact(workspaceRoot)).evidence;
}

export async function verifyZiweiHkoCalendarSourceEvidence(workspaceRoot, evidenceInput) {
  const artifact = await readEvidenceArtifact(workspaceRoot);
  const evidence = evidenceInput === undefined ? artifact.evidence : assertPlainObject(evidenceInput, "Ziwei HKO evidence input");
  if (
    canonicalStringifyZiweiHkoCalendarSourceEvidence(evidence)
    !== canonicalStringifyZiweiHkoCalendarSourceEvidence(artifact.evidence)
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("EVIDENCE_INPUT_MISMATCH", "调用方 HKO evidence 与持久化工件不一致。");
  }
  if (
    typeof evidence.createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(evidence.createdAt)
    || !LOWERCASE_SHA256.test(evidence.evidenceDigest ?? "")
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("EVIDENCE_INVALID", "HKO evidence 时间或摘要无效。");
  }
  const expected = await buildCurrentZiweiHkoCalendarSourceEvidence(workspaceRoot, { createdAt: evidence.createdAt });
  if (
    canonicalStringifyZiweiHkoCalendarSourceEvidence(evidence)
    !== canonicalStringifyZiweiHkoCalendarSourceEvidence(expected)
  ) {
    throw new ZiweiHkoCalendarSourceEvidenceError("EVIDENCE_MISMATCH", "HKO evidence 与当前冻结资源重放或失败关闭边界不一致。");
  }
  return Object.freeze({
    evidence,
    evidenceDigest: evidence.evidenceDigest,
    candidateId: evidence.candidateIdentity.candidateId,
    subjectId: evidence.candidateIdentity.subjectId,
    sourceBodySetDigest: evidence.candidateIdentity.sourceBodySetDigest,
    coverageScope: evidence.candidateIdentity.coverageScope,
    subjectFullySatisfied: evidence.candidateIdentity.subjectFullySatisfied,
    artifact: Object.freeze({ path: artifact.path, bytes: artifact.bytes, sha256: artifact.sha256 })
  });
}
