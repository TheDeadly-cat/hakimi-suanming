import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const WORKSPACE_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const ANNOUNCEMENT_SEMANTIC_DOMAIN =
  "hakimi-western-tzdb-2026c-live-announcement-semantics-v1\0";
const MAX_ANNOUNCEMENT_BYTES = 1_000_000;
const MAX_TAR_OUTPUT_BYTES = 64 * 1024 * 1024;
const MAX_TAR_ENTRIES = 10_000;
const TAR_BLOCK_BYTES = 512;
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });

const FIXED_PUBLIC_HOSTS = new Set([
  "www.iana.org",
  "data.iana.org",
  "lists.iana.org",
  "registry.npmjs.org"
]);

export class WesternTzdb2026cLiveAuditError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternTzdb2026cLiveAuditError";
    Object.defineProperty(this, "code", { value: code, enumerable: false });
    Object.defineProperty(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new WesternTzdb2026cLiveAuditError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function asSnapshotBuffer(value, label) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    fail("BYTES_REQUIRED", `${label} 必须是字节序列。`);
  }
  return Buffer.from(value);
}

export function computeByteIdentity(value) {
  const bytes = asSnapshotBuffer(value, "identity input");
  return Object.freeze({
    rawBytes: bytes.byteLength,
    rawSha256: createHash("sha256").update(bytes).digest("hex"),
    rawSha512: createHash("sha512").update(bytes).digest("hex")
  });
}

export function computeSha512Sri(value) {
  const bytes = asSnapshotBuffer(value, "SRI input");
  return `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}

function assertIdentity(label, bytes, expected) {
  const observed = computeByteIdentity(bytes);
  if (observed.rawBytes !== expected.rawBytes) {
    fail("REMOTE_BYTES_MISMATCH", `${label} 字节数与固定身份不一致。`);
  }
  if (observed.rawSha256 !== expected.rawSha256) {
    fail("REMOTE_SHA256_MISMATCH", `${label} SHA-256 与固定身份不一致。`);
  }
  if (expected.rawSha512 !== undefined && observed.rawSha512 !== expected.rawSha512) {
    fail("REMOTE_SHA512_MISMATCH", `${label} SHA-512 与固定身份不一致。`);
  }
  return observed;
}

function decodeUtf8(bytes, label) {
  try {
    return UTF8_FATAL.decode(bytes);
  } catch (cause) {
    fail("UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
}

function isZeroBlock(buffer, offset) {
  for (let index = 0; index < TAR_BLOCK_BYTES; index += 1) {
    if (buffer[offset + index] !== 0) return false;
  }
  return true;
}

function readTarText(header, start, length) {
  const field = header.subarray(start, start + length);
  const zeroIndex = field.indexOf(0);
  const sliced = zeroIndex === -1 ? field : field.subarray(0, zeroIndex);
  return decodeUtf8(sliced, "tar header text").trimEnd();
}

function parseTarOctal(header, start, length, label) {
  const field = header.subarray(start, start + length);
  if ((field[0] & 0x80) !== 0) fail("TAR_BASE256_FORBIDDEN", `${label} 不接受 base-256 编码。`);
  const text = readTarText(header, start, length).trim();
  if (text === "") return 0;
  if (!/^[0-7]+$/u.test(text)) fail("TAR_NUMBER_INVALID", `${label} 不是合法八进制数。`);
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("TAR_NUMBER_INVALID", `${label} 超出安全整数范围。`);
  }
  return value;
}

function verifyTarHeaderChecksum(header) {
  const expected = parseTarOctal(header, 148, 8, "tar checksum");
  let actual = 0;
  for (let index = 0; index < TAR_BLOCK_BYTES; index += 1) {
    actual += index >= 148 && index < 156 ? 0x20 : header[index];
  }
  if (actual !== expected) fail("TAR_HEADER_CHECKSUM_MISMATCH", "tar header checksum 不匹配。");
}

function normalizeTarPath(name, prefix) {
  const combined = prefix === "" ? name : `${prefix}/${name}`;
  if (
    combined === ""
    || combined.startsWith("/")
    || combined.includes("\\")
    || combined.includes("\0")
  ) {
    fail("TAR_PATH_INVALID", "tar entry 路径无效。");
  }
  const segments = combined.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("TAR_PATH_INVALID", "tar entry 路径含空段或相对跳转。");
  }
  return combined;
}

/**
 * Parse regular-file entries without extracting them. The returned buffers are
 * in-memory copies and the caller remains responsible for dropping references.
 */
export function parseTarRegularEntries(value) {
  const tar = asSnapshotBuffer(value, "tar archive");
  if (tar.byteLength === 0 || tar.byteLength % TAR_BLOCK_BYTES !== 0) {
    fail("TAR_LENGTH_INVALID", "tar archive 长度不是 512 字节块的整数倍。");
  }

  const entries = new Map();
  let offset = 0;
  let entryCount = 0;
  let terminalBlockObserved = false;

  while (offset + TAR_BLOCK_BYTES <= tar.byteLength) {
    if (isZeroBlock(tar, offset)) {
      terminalBlockObserved = true;
      break;
    }
    entryCount += 1;
    if (entryCount > MAX_TAR_ENTRIES) fail("TAR_ENTRY_LIMIT_EXCEEDED", "tar entry 数量超过上限。");

    const header = tar.subarray(offset, offset + TAR_BLOCK_BYTES);
    verifyTarHeaderChecksum(header);
    const name = readTarText(header, 0, 100);
    const prefix = readTarText(header, 345, 155);
    const entryPath = normalizeTarPath(name, prefix);
    const size = parseTarOctal(header, 124, 12, "tar entry size");
    const typeFlag = header[156];
    const bodyStart = offset + TAR_BLOCK_BYTES;
    const bodyEnd = bodyStart + size;
    if (bodyEnd > tar.byteLength) fail("TAR_ENTRY_TRUNCATED", "tar entry 超出 archive 边界。");

    if (typeFlag === 0 || typeFlag === 0x30) {
      if (entries.has(entryPath)) fail("TAR_DUPLICATE_PATH", "tar archive 含重复 regular-file 路径。");
      entries.set(entryPath, Buffer.from(tar.subarray(bodyStart, bodyEnd)));
    }

    const paddedSize = Math.ceil(size / TAR_BLOCK_BYTES) * TAR_BLOCK_BYTES;
    offset = bodyStart + paddedSize;
  }

  if (!terminalBlockObserved) fail("TAR_TERMINATOR_MISSING", "tar archive 缺少终止块。");
  return entries;
}

export function verifyPinnedTarGzip(value, expectedEntries) {
  const gzip = asSnapshotBuffer(value, "gzip archive");
  let tar;
  try {
    tar = gunzipSync(gzip, { maxOutputLength: MAX_TAR_OUTPUT_BYTES });
  } catch (cause) {
    fail("GZIP_INVALID", "gzip archive 无法在内存上限内解压。", cause);
  }
  const entries = parseTarRegularEntries(tar);
  const selected = new Map();
  const summaries = [];
  for (const expected of expectedEntries) {
    const body = entries.get(expected.path);
    if (body === undefined) fail("TAR_REQUIRED_ENTRY_MISSING", "tar archive 缺少固定 entry。");
    const identity = assertIdentity(`tar entry ${expected.path}`, body, expected);
    selected.set(expected.path, body);
    summaries.push(Object.freeze({
      path: expected.path,
      rawBytes: identity.rawBytes,
      rawSha256: identity.rawSha256
    }));
  }
  return Object.freeze({ selected, summaries: Object.freeze(summaries) });
}

export function verifyIanaAnnouncementSemantics(value, expected) {
  const bytes = asSnapshotBuffer(value, "IANA announcement");
  const text = decodeUtf8(bytes, "IANA announcement");
  if (
    expected === null
    || typeof expected !== "object"
    || typeof expected.statedDataArchiveSha512 !== "string"
    || typeof expected.statedCommit !== "string"
    || typeof expected.statedTag !== "string"
  ) {
    fail("ANNOUNCEMENT_SPEC_INVALID", "IANA 公告语义规格无效。");
  }
  const semanticFacts = Object.freeze({
    statedDataArchiveSha512: expected.statedDataArchiveSha512,
    statedCommit: expected.statedCommit,
    statedTag: expected.statedTag
  });
  for (const fact of Object.values(semanticFacts)) {
    if (!text.includes(fact)) fail("ANNOUNCEMENT_SEMANTIC_FACT_MISSING", "IANA 公告缺少固定语义事实。");
  }
  if (!text.includes("This release corresponds to commit")) {
    fail("ANNOUNCEMENT_COMMIT_CONTEXT_MISSING", "IANA 公告缺少 commit 语义上下文。");
  }
  if (!text.includes(`tagged '${semanticFacts.statedTag}'`)) {
    fail("ANNOUNCEMENT_TAG_CONTEXT_MISSING", "IANA 公告缺少 tag 语义上下文。");
  }
  const semanticChecksum = createHash("sha256")
    .update(ANNOUNCEMENT_SEMANTIC_DOMAIN, "utf8")
    .update(semanticFacts.statedDataArchiveSha512, "utf8")
    .update("\0", "utf8")
    .update(semanticFacts.statedCommit, "utf8")
    .update("\0", "utf8")
    .update(semanticFacts.statedTag, "utf8")
    .digest("hex");
  return Object.freeze({ ...semanticFacts, semanticChecksum });
}

export function verifyPinnedLicenseQuote(value, quoteSpec) {
  const bytes = asSnapshotBuffer(value, "license representation");
  if (
    quoteSpec === null
    || typeof quoteSpec !== "object"
    || typeof quoteSpec.text !== "string"
    || !Number.isSafeInteger(quoteSpec.utf8Bytes)
    || typeof quoteSpec.sha256 !== "string"
  ) {
    fail("LICENSE_QUOTE_SPEC_INVALID", "LICENSE 最小引文规格无效。");
  }
  const quoteBytes = Buffer.from(quoteSpec.text, "utf8");
  const quoteSha256 = createHash("sha256").update(quoteBytes).digest("hex");
  if (quoteBytes.byteLength !== quoteSpec.utf8Bytes || quoteSha256 !== quoteSpec.sha256) {
    fail("LICENSE_QUOTE_IDENTITY_MISMATCH", "LICENSE 最小引文自身身份漂移。");
  }

  const sourceText = decodeUtf8(bytes, "IANA LICENSE");
  const exactSourceTextMatched = sourceText.includes(quoteSpec.text);
  const normalizedSourceText = sourceText.replace(/\s+/gu, " ").trim();
  const normalizedQuoteText = quoteSpec.text.replace(/\s+/gu, " ").trim();
  const whitespaceNormalizedMatched = normalizedSourceText.includes(normalizedQuoteText);
  if (!exactSourceTextMatched && !whitespaceNormalizedMatched) {
    fail("IANA_LICENSE_QUOTE_MISSING", "IANA LICENSE 缺少固定最小引文。");
  }
  return Object.freeze({
    exactSourceTextMatched,
    matchedAfterWhitespaceNormalization: !exactSourceTextMatched && whitespaceNormalizedMatched,
    matchMode: exactSourceTextMatched ? "exact_source_text" : "whitespace_normalized",
    quoteUtf8Bytes: quoteBytes.byteLength,
    quoteSha256
  });
}

function assertFixedPublicHttps(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch (cause) {
    fail("FIXED_URL_INVALID", "固定远程 URL 无效。", cause);
  }
  if (
    url.protocol !== "https:"
    || url.username !== ""
    || url.password !== ""
    || url.port !== ""
    || !FIXED_PUBLIC_HOSTS.has(url.hostname)
  ) {
    fail("FIXED_URL_NOT_PUBLIC_HTTPS", "live auditor 只允许固定 public HTTPS endpoint。");
  }
  return url.href;
}

async function readResponseBytesBounded(response, maxBytes, label) {
  if (response.body === null) fail("REMOTE_BODY_MISSING", `${label} 没有 response body。`);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        fail("REMOTE_BODY_LIMIT_EXCEEDED", `${label} 超过内存读取上限。`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function fetchInMemory(label, urlString, maxBytes) {
  const fixedUrl = assertFixedPublicHttps(urlString);
  let response;
  try {
    response = await fetch(fixedUrl, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(30_000)
    });
  } catch (cause) {
    fail("REMOTE_FETCH_FAILED", `${label} HTTPS 获取失败。`, cause);
  }
  if (response.status !== 200) fail("REMOTE_HTTP_STATUS_INVALID", `${label} 未返回 HTTP 200。`);
  if (response.url !== fixedUrl) fail("REMOTE_FINAL_URL_MISMATCH", `${label} final URL 与固定 URL 不一致。`);
  const bytes = await readResponseBytesBounded(response, maxBytes, label);
  return Object.freeze({
    bytes,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified")
  });
}

function parsePinnedJson(bytes, label) {
  try {
    return JSON.parse(decodeUtf8(bytes, label));
  } catch (cause) {
    if (cause instanceof WesternTzdb2026cLiveAuditError) throw cause;
    fail("PINNED_JSON_INVALID", `${label} 不是合法 JSON。`, cause);
  }
}

function assertNpmEntrySemantics(selected) {
  const packed = parsePinnedJson(
    selected.get("package/data/packed/latest.json"),
    "moment-timezone packed data"
  );
  const meta = parsePinnedJson(
    selected.get("package/data/meta/latest.json"),
    "moment-timezone meta data"
  );
  const manifest = parsePinnedJson(
    selected.get("package/package.json"),
    "moment-timezone package manifest"
  );
  if (packed?.version !== "2026c" || meta?.version !== "2026c") {
    fail("NPM_TZDB_VERSION_MISMATCH", "moment-timezone data entry 的 IANA 版本不是 2026c。");
  }
  if (!Array.isArray(packed.zones) || packed.zones.length !== 340) {
    fail("NPM_ZONE_COUNT_MISMATCH", "moment-timezone packed zone 数量漂移。");
  }
  if (!Array.isArray(packed.links) || packed.links.length !== 257) {
    fail("NPM_LINK_COUNT_MISMATCH", "moment-timezone packed link 数量漂移。");
  }
  if (manifest?.name !== "moment-timezone" || manifest?.version !== "0.6.3" || manifest?.license !== "MIT") {
    fail("NPM_PACKAGE_IDENTITY_MISMATCH", "moment-timezone package manifest 身份漂移。");
  }
  const license = decodeUtf8(selected.get("package/LICENSE"), "moment-timezone LICENSE");
  if (!license.includes("The MIT License (MIT)")) {
    fail("NPM_LICENSE_QUOTE_MISSING", "moment-timezone LICENSE 缺少固定最小引文。");
  }
  return Object.freeze({
    packageName: manifest.name,
    packageVersion: manifest.version,
    declaredLicense: manifest.license,
    packedIanaVersion: packed.version,
    metaIanaVersion: meta.version,
    packedZoneCount: packed.zones.length,
    packedLinkCount: packed.links.length
  });
}

export function findForbiddenLauncherExecArgv(execArgv) {
  if (!Array.isArray(execArgv)) fail("EXEC_ARGV_INVALID", "Node execArgv 形态无效。");
  const exactFlags = new Set([
    "--require",
    "-r",
    "--import",
    "--loader",
    "--experimental-loader"
  ]);
  const equalsPrefixes = [
    "--require=",
    "-r=",
    "--import=",
    "--loader=",
    "--experimental-loader="
  ];
  for (const value of execArgv) {
    if (typeof value !== "string") fail("EXEC_ARGV_INVALID", "Node execArgv 含非字符串参数。");
    if (exactFlags.has(value)) return value;
    for (const prefix of equalsPrefixes) {
      if (value.startsWith(prefix)) return prefix.slice(0, -1);
    }
    if (value.startsWith("-r") && !value.startsWith("--") && value.length > 2) return "-r";
  }
  return null;
}

function rejectUnsafeInvocation() {
  if (findForbiddenLauncherExecArgv(process.execArgv) !== null) {
    fail("EXEC_ARGV_FORBIDDEN", "live auditor 不接受可见的 Node preload 或 loader execArgv。");
  }
  if (typeof process.env.NODE_OPTIONS === "string") {
    fail("NODE_OPTIONS_FORBIDDEN", "live auditor 不接受 NODE_OPTIONS。");
  }
  if (typeof process.env.NODE_PATH === "string") {
    fail("NODE_PATH_FORBIDDEN", "live auditor 不接受 NODE_PATH。");
  }
  if (process.argv.length !== 2) fail("UNSAFE_ARGUMENTS", "live auditor 不接受命令行参数。");
  if (path.resolve(process.cwd()) !== WORKSPACE_ROOT) {
    fail("WORKSPACE_ROOT_MISMATCH", "live auditor 必须从固定 workspaceRoot 调用。");
  }
}

function validateBusinessDependency(dependency) {
  const remote = dependency?.WESTERN_TZDB_2026C_REMOTE_EVIDENCE;
  const testOnly = dependency?.westernTzdb2026cSourceRightsEvidenceTestOnly;
  if (
    remote === null
    || typeof remote !== "object"
    || testOnly === null
    || typeof testOnly !== "object"
    || !Array.isArray(testOnly.IANA_ARCHIVE_ENTRIES)
    || !Array.isArray(testOnly.NPM_TARBALL_ENTRIES)
  ) {
    fail("BUSINESS_DEPENDENCY_INVALID", "固定 child evidence dependency 形态无效。");
  }
  return Object.freeze({
    remote,
    ianaArchiveEntries: testOnly.IANA_ARCHIVE_ENTRIES,
    npmTarballEntries: testOnly.NPM_TARBALL_ENTRIES
  });
}

async function loadBusinessDependency() {
  let dependency;
  try {
    dependency = await import("./western-tzdb-2026c-source-rights-evidence-lib.mjs");
  } catch (cause) {
    fail("BUSINESS_DEPENDENCY_IMPORT_FAILED", "固定 child evidence dependency 加载失败。", cause);
  }
  return validateBusinessDependency(dependency);
}

export async function runWesternTzdb2026cLiveAudit(businessDependency) {
  const business = businessDependency === undefined
    ? await loadBusinessDependency()
    : validateBusinessDependency(businessDependency);
  const remote = business.remote;
  const observedFrom = new Date().toISOString();

  const [release, archive, signature, version, license, announcement, npmTarball] =
    await Promise.all([
      fetchInMemory("IANA release page", remote.releasePage.url, remote.releasePage.rawBytes),
      fetchInMemory("IANA data archive", remote.dataArchive.url, remote.dataArchive.rawBytes),
      fetchInMemory("IANA detached signature", remote.detachedSignature.url, remote.detachedSignature.rawBytes),
      fetchInMemory("IANA version", remote.versionRepresentation.url, remote.versionRepresentation.rawBytes),
      fetchInMemory("IANA LICENSE", remote.licenseRepresentation.url, remote.licenseRepresentation.rawBytes),
      fetchInMemory("IANA announcement", remote.announcement.url, MAX_ANNOUNCEMENT_BYTES),
      fetchInMemory("npm tarball", remote.npmTarball.url, remote.npmTarball.rawBytes)
    ]);

  const releaseIdentity = assertIdentity("IANA release page", release.bytes, remote.releasePage);
  const archiveIdentity = assertIdentity("IANA data archive", archive.bytes, remote.dataArchive);
  const signatureIdentity = assertIdentity("IANA detached signature", signature.bytes, remote.detachedSignature);
  const versionIdentity = assertIdentity("IANA version", version.bytes, remote.versionRepresentation);
  const licenseIdentity = assertIdentity("IANA LICENSE", license.bytes, remote.licenseRepresentation);
  const npmIdentity = assertIdentity("npm tarball", npmTarball.bytes, remote.npmTarball);

  const releaseText = decodeUtf8(release.bytes, "IANA release page");
  if (!releaseText.includes(`Release ${remote.releasePage.releaseVersion}`)
    || !releaseText.includes(remote.releasePage.releaseDate)) {
    fail("IANA_RELEASE_SEMANTICS_MISMATCH", "IANA release page 缺少固定版本或发布日期。");
  }
  if (!version.bytes.equals(Buffer.from("2026c\n", "utf8"))) {
    fail("IANA_VERSION_BODY_MISMATCH", "IANA version representation 漂移。");
  }
  const licenseQuote = verifyPinnedLicenseQuote(
    license.bytes,
    remote.licenseRepresentation.exactQuote
  );

  const ianaArchive = verifyPinnedTarGzip(archive.bytes, business.ianaArchiveEntries);
  if (!ianaArchive.selected.get("version").equals(version.bytes)) {
    fail("IANA_ARCHIVE_VERSION_DIVERGENCE", "IANA archive version 与独立 representation 不一致。");
  }
  if (!ianaArchive.selected.get("LICENSE").equals(license.bytes)) {
    fail("IANA_ARCHIVE_LICENSE_DIVERGENCE", "IANA archive LICENSE 与独立 representation 不一致。");
  }

  const announcementSemantics = verifyIanaAnnouncementSemantics(
    announcement.bytes,
    remote.announcement
  );
  if (announcementSemantics.statedDataArchiveSha512 !== archiveIdentity.rawSha512) {
    fail("ANNOUNCED_ARCHIVE_CHECKSUM_MISMATCH", "IANA 公告 SHA-512 与 archive 观察不一致。");
  }
  const announcementIdentity = computeByteIdentity(announcement.bytes);

  if (computeSha512Sri(npmTarball.bytes) !== remote.npmTarball.sri) {
    fail("NPM_SRI_MISMATCH", "npm tarball SRI 与固定 lock 身份不一致。");
  }
  const npmArchive = verifyPinnedTarGzip(npmTarball.bytes, business.npmTarballEntries);
  const npmSemantics = assertNpmEntrySemantics(npmArchive.selected);

  const observedTo = new Date().toISOString();
  return Object.freeze({
    ok: true,
    auditId: "hakimi.western.live-audit/iana-tzdb-2026c-moment-timezone-0.6.3/1.0.0",
    observedWindow: Object.freeze({ startedAt: observedFrom, endedAt: observedTo }),
    pointInTimeObservationOnly: true,
    persistedReceipt: false,
    publicHttpsInMemoryOnly: true,
    launcherObservationBoundary: Object.freeze({
      visiblePreloadAndLoaderExecArgvRejected: true,
      visibleNodeOptionsRejected: true,
      visibleNodePathRejected: true,
      preEntryExecutionOrErasureExcluded: false,
      launcherIntegrityEstablished: false
    }),
    iana: Object.freeze({
      releasePage: Object.freeze({
        rawBytes: releaseIdentity.rawBytes,
        rawSha256: releaseIdentity.rawSha256,
        releaseVersion: remote.releasePage.releaseVersion,
        releaseDate: remote.releasePage.releaseDate,
        stableIdentityMatched: true
      }),
      dataArchive: Object.freeze({
        rawBytes: archiveIdentity.rawBytes,
        rawSha256: archiveIdentity.rawSha256,
        rawSha512: archiveIdentity.rawSha512,
        etagObserved: archive.etag,
        lastModifiedObserved: archive.lastModified,
        stableIdentityMatched: true,
        requiredEntries: ianaArchive.summaries
      }),
      detachedSignature: Object.freeze({
        rawBytes: signatureIdentity.rawBytes,
        rawSha256: signatureIdentity.rawSha256,
        rawSha512: signatureIdentity.rawSha512,
        stableIdentityMatched: true,
        cryptographicallyVerified: false,
        signingKeyTrustEstablished: false,
        publisherAuthenticityEstablished: false
      }),
      versionRepresentation: Object.freeze({
        rawBytes: versionIdentity.rawBytes,
        rawSha256: versionIdentity.rawSha256,
        value: "2026c",
        stableIdentityMatched: true
      }),
      licenseRepresentation: Object.freeze({
        rawBytes: licenseIdentity.rawBytes,
        rawSha256: licenseIdentity.rawSha256,
        minimalExactQuoteMatched: licenseQuote.exactSourceTextMatched,
        minimalQuoteMatchedAfterWhitespaceNormalization: licenseQuote.matchedAfterWhitespaceNormalization,
        quoteMatchMode: licenseQuote.matchMode,
        quoteUtf8Bytes: licenseQuote.quoteUtf8Bytes,
        quoteSha256: licenseQuote.quoteSha256,
        stableIdentityMatched: true,
        rightsLegalConclusionEstablished: false
      }),
      announcement: Object.freeze({
        observedRawBytes: announcementIdentity.rawBytes,
        observedRawSha256: announcementIdentity.rawSha256,
        rawIdentityHardPinned: false,
        ...announcementSemantics
      })
    }),
    npmCarrier: Object.freeze({
      rawBytes: npmIdentity.rawBytes,
      rawSha256: npmIdentity.rawSha256,
      rawSha512: npmIdentity.rawSha512,
      sri: remote.npmTarball.sri,
      stableIdentityMatched: true,
      requiredEntries: npmArchive.summaries,
      ...npmSemantics
    }),
    storageBoundary: Object.freeze({
      scope: "this_audit_process_only",
      remoteResponseBodiesPersistedByThisAuditProcess: 0,
      remoteArchivesPersistedByThisAuditProcess: 0,
      detachedSignaturesPersistedByThisAuditProcess: 0,
      completeRemoteLicenseBodiesPersistedByThisAuditProcess: 0,
      workspaceWideAbsenceMechanicallyVerified: false
    }),
    signatureCryptographicallyVerified: false,
    signingKeyTrustEstablished: false,
    publisherAuthenticityEstablished: false,
    ianaToMomentTimezoneTransformationProvenanceEstablished: false,
    rightsLegalConclusionEstablished: false,
    redistributionAuthorized: false,
    expertTruthEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  });
}

async function main() {
  try {
    rejectUnsafeInvocation();
    const businessDependency = await loadBusinessDependency();
    const result = await runWesternTzdb2026cLiveAudit({
      WESTERN_TZDB_2026C_REMOTE_EVIDENCE: businessDependency.remote,
      westernTzdb2026cSourceRightsEvidenceTestOnly: {
        IANA_ARCHIVE_ENTRIES: businessDependency.ianaArchiveEntries,
        NPM_TARBALL_ENTRIES: businessDependency.npmTarballEntries
      }
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      ok: false,
      code: error?.code ?? "LIVE_AUDIT_FAILED",
      message: error?.safeForCli === true ? error.message : "西洋 tzdb live audit 失败。"
    })}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === path.resolve(SCRIPT_PATH)) {
  await main();
}
