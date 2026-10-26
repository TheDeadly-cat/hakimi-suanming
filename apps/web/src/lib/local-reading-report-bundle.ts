/** Two immutable texts in one saved note. Compression remains the snapshot codec's job. */
export const READING_REPORT_BUNDLE_VERSION = "hakimi.local-reading-report-bundle/1";
export const READING_REPORT_BUNDLE_MARKER = "<!-- hakimi.reading-report-bundle/v1 -->";
const FAMILY = "<!-- hakimi.reading-report-bundle";
const MAX_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const incompleteUnicode = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const shaPattern = /^[a-f0-9]{64}$/u;
const errorMessage = "这份报告的阅读稿或完整档案未通过校验，原记录仍保留。";

/** Writer-only capacity rejection; damaged saved reports keep the original reader error. */
export class ReadingReportCapacityError extends Error {
  readonly code = "reading_report_capacity";
  constructor() {
    super("完整报告超过当前本机可保存的大小，请分别导出完整解读和完整依据；已保存资料保持不变。");
    this.name = "ReadingReportCapacityError";
  }
}

export type ReadingReportBundle = Readonly<{ reading: string; archive: string; version: string }>;
type TextPart = { text: string; utf8Bytes: number; sha256: string };
type Envelope = { format: typeof READING_REPORT_BUNDLE_VERSION; version: string; reading: TextPart; archive: TextPart; sha256: string };

function fail(): never { throw new Error(errorMessage); }
function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function validText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_BYTES && !incompleteUnicode.test(value);
}
function validVersion(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 160
    && value === value.trim() && !/[\s\u0000-\u001f\u007f-\u009f]/u.test(value) && !incompleteUnicode.test(value);
}
const digest = async (bytes: Uint8Array<ArrayBuffer>) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  (byte) => byte.toString(16).padStart(2, "0")).join("");
function identity(version: string, reading: TextPart, archive: TextPart): Uint8Array<ArrayBuffer> {
  return encoder.encode(JSON.stringify([READING_REPORT_BUNDLE_VERSION, version,
    reading.utf8Bytes, reading.sha256, archive.utf8Bytes, archive.sha256]));
}
async function encodePart(text: string): Promise<TextPart> {
  const bytes = encoder.encode(text);
  if (bytes.byteLength > MAX_BYTES) throw new ReadingReportCapacityError();
  return { text, utf8Bytes: bytes.byteLength, sha256: await digest(bytes) };
}
function validPart(value: unknown): value is TextPart {
  return exactObject(value, ["text", "utf8Bytes", "sha256"]) && validText(value.text)
    && Number.isSafeInteger(value.utf8Bytes) && (value.utf8Bytes as number) > 0 && (value.utf8Bytes as number) <= MAX_BYTES
    && typeof value.sha256 === "string" && shaPattern.test(value.sha256);
}
async function verifyPart(part: TextPart): Promise<boolean> {
  const bytes = encoder.encode(part.text);
  return bytes.byteLength === part.utf8Bytes && await digest(bytes) === part.sha256;
}

/** Recognizes the reserved family, including unsupported or damaged marker versions. */
export function isReadingReportBundle(text: string): boolean {
  return text.startsWith(FAMILY) || text.startsWith(`\ufeff${FAMILY}`);
}

export async function encodeReadingReportBundle(input: ReadingReportBundle): Promise<string> {
  if (!exactObject(input, ["reading", "archive", "version"]) || typeof input.reading !== "string"
    || typeof input.archive !== "string" || !validVersion(input.version)) fail();
  if (input.reading.length > MAX_BYTES || input.archive.length > MAX_BYTES) throw new ReadingReportCapacityError();
  if (!validText(input.reading) || !validText(input.archive)) fail();
  const [reading, archive] = await Promise.all([encodePart(input.reading), encodePart(input.archive)]);
  const envelope: Envelope = { format: READING_REPORT_BUNDLE_VERSION, version: input.version, reading, archive,
    sha256: await digest(identity(input.version, reading, archive)) };
  const result = `${READING_REPORT_BUNDLE_MARKER}\n${JSON.stringify(envelope)}`;
  if (result.length > MAX_BYTES || encoder.encode(result).byteLength > MAX_BYTES) throw new ReadingReportCapacityError();
  return result;
}

/** Legacy text is null; a recognized but invalid bundle must never become ordinary prose. */
export async function decodeReadingReportBundle(text: string): Promise<ReadingReportBundle | null> {
  if (!isReadingReportBundle(text)) return null;
  try {
    if (!text.startsWith(`${READING_REPORT_BUNDLE_MARKER}\n`) || text.length > MAX_BYTES
      || encoder.encode(text).byteLength > MAX_BYTES) return fail();
    const payload = text.slice(READING_REPORT_BUNDLE_MARKER.length + 1);
    const envelope: unknown = JSON.parse(payload);
    if (!exactObject(envelope, ["format", "version", "reading", "archive", "sha256"])
      || envelope.format !== READING_REPORT_BUNDLE_VERSION || !validVersion(envelope.version)
      || !validPart(envelope.reading) || !validPart(envelope.archive)
      || typeof envelope.sha256 !== "string" || !shaPattern.test(envelope.sha256)
      // The writer is canonical: reject duplicate JSON keys, trailing data and alternate spellings.
      || JSON.stringify(envelope) !== payload) return fail();
    const [readingValid, archiveValid, binding] = await Promise.all([
      verifyPart(envelope.reading), verifyPart(envelope.archive), digest(identity(envelope.version, envelope.reading, envelope.archive))
    ]);
    if (!readingValid || !archiveValid || binding !== envelope.sha256) return fail();
    return { reading: envelope.reading.text, archive: envelope.archive.text, version: envelope.version };
  } catch { return fail(); }
}
