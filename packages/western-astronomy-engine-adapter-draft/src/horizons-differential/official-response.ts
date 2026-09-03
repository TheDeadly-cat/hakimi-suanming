import { sha256Hex } from "../rule-layer/canonical.ts";
import {
  buildHorizonsQueryUrl,
  HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  horizonsDifferentialQueryManifest
} from "./query-manifest.ts";

const CANONICAL_UTC_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const API_VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?$/u;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_ABSOLUTE_SUN_GEOCENTRIC_AU = 2;

export type HorizonsVectorRow = Readonly<{
  label: string;
  julianDateUt: number;
  xAu: number;
  yAu: number;
  zAu: number;
}>;

export type HorizonsResponseEvidenceRecord = Readonly<{
  schemaVersion: 2;
  recordKind: "horizons_response_candidate_evidence";
  manifestVersion: typeof HORIZONS_DIFFERENTIAL_MANIFEST_VERSION;
  evidenceStatus: "mechanically_verified_candidate_only";
  utcInstant: string;
  providerTargetId: string;
  centerId: string;
  retrievedAtIso: string;
  sourceUrl: string;
  byteLength: number;
  sha256: string;
  responseFormat: "text";
  apiVersion: string;
  apiSource: "NASA/JPL Horizons API";
  publisherAuthenticityEstablished: false;
  networkProvenanceEstablished: false;
  rightsCleared: false;
  notes: string;
}>;

/** @deprecated Use HorizonsResponseEvidenceRecord; this alias does not establish official provenance. */
export type OfficialHorizonsEvidenceRecord = HorizonsResponseEvidenceRecord;

export type HorizonsResponseMetadata = Readonly<{
  apiVersion: string;
  apiSource: "NASA/JPL Horizons API";
  targetBodyName: "Sun";
  targetBodyId: "10";
  targetEphemerisSource: string;
  centerBodyName: "Earth";
  centerBodyId: "399";
  centerEphemerisSource: string;
  centerSiteName: "BODY CENTER";
  startTimeHeader: "A.D. 2025-Mar-20 09:01:00.0000 UT";
  stopTimeHeader: "A.D. 2025-Mar-20 09:01:00.0000 UT";
  stepSizeHeader: "DISCRETE TIME-LIST";
  outputUnitsHeader: "AU-D";
  calendarModeHeader: "Gregorian";
  outputTypeHeader: "LT CORRECTED cartesian states";
  outputFormatHeader: "1 (position only)";
  eopFile: string;
  eopCoverage: string;
  referenceFrameHeader: "ICRF";
}>;

declare const mechanicallyVerifiedHorizonsResponseBrand: unique symbol;

export type MechanicallyVerifiedHorizonsResponse = Readonly<{
  evidence: HorizonsResponseEvidenceRecord;
  responseMetadata: HorizonsResponseMetadata;
  rows: readonly HorizonsVectorRow[];
  readonly [mechanicallyVerifiedHorizonsResponseBrand]: true;
}>;

/** @deprecated Use MechanicallyVerifiedHorizonsResponse; verification is structural, not provenance authentication. */
export type VerifiedHorizonsResponse = MechanicallyVerifiedHorizonsResponse;

const mechanicallyVerifiedResponses = new WeakSet<object>();

const RECORD_KEYS = Object.freeze([
  "apiSource",
  "apiVersion",
  "byteLength",
  "centerId",
  "evidenceStatus",
  "manifestVersion",
  "networkProvenanceEstablished",
  "notes",
  "providerTargetId",
  "publisherAuthenticityEstablished",
  "recordKind",
  "responseFormat",
  "retrievedAtIso",
  "rightsCleared",
  "schemaVersion",
  "sha256",
  "sourceUrl",
  "utcInstant"
] as const);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function snapshotExactBytes(bytes: Uint8Array): Uint8Array {
  if (bytes === null
    || typeof bytes !== "object"
    || Object.getPrototypeOf(bytes) !== Uint8Array.prototype) {
    throw new Error("Horizons response bytes must be an exact Uint8Array");
  }
  const buffer = bytes.buffer;
  if (Object.getPrototypeOf(buffer) !== ArrayBuffer.prototype) {
    throw new Error("Horizons response bytes must use a non-shared ArrayBuffer");
  }
  const bufferState = buffer as ArrayBuffer & { resizable?: boolean; detached?: boolean };
  if (bufferState.resizable === true || bufferState.detached === true) {
    throw new Error("Horizons response bytes must use a fixed, attached ArrayBuffer");
  }
  const byteLength = bytes.byteLength;
  if (!Number.isSafeInteger(byteLength) || byteLength < 1 || byteLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Horizons response byte length must be between 1 and ${MAX_RESPONSE_BYTES}`);
  }
  const snapshot = new Uint8Array(byteLength);
  snapshot.set(bytes);
  return snapshot;
}

function snapshotEvidenceRecord(candidate: unknown): HorizonsResponseEvidenceRecord {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Horizons evidence record must be a plain object");
  }
  const prototype = Object.getPrototypeOf(candidate);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Horizons evidence record must be an exact plain object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(candidate);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new Error("Horizons evidence record must not contain symbol keys");
  }
  const actualKeys = (ownKeys as string[]).sort();
  const expectedKeys = [...RECORD_KEYS].sort();
  if (actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error("Horizons evidence record keys do not match the v2 candidate contract");
  }
  const values: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of RECORD_KEYS) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new Error(`Horizons evidence record field ${key} must be an enumerable data property`);
    }
    values[key] = descriptor.value;
  }

  const manifest = horizonsDifferentialQueryManifest;
  if (values.schemaVersion !== 2
    || values.recordKind !== "horizons_response_candidate_evidence"
    || values.manifestVersion !== HORIZONS_DIFFERENTIAL_MANIFEST_VERSION
    || values.evidenceStatus !== "mechanically_verified_candidate_only"
    || values.responseFormat !== "text") {
    throw new Error("Horizons evidence record does not match the frozen v2 candidate manifest");
  }
  if (values.utcInstant !== manifest.utcInstant
    || values.providerTargetId !== manifest.target.providerTargetId
    || values.centerId !== manifest.target.centerId
    || values.sourceUrl !== buildHorizonsQueryUrl(manifest)) {
    throw new Error("Horizons evidence record does not bind the exact frozen query URL, target, center and UTC instant");
  }
  if (typeof values.retrievedAtIso !== "string"
    || !CANONICAL_UTC_PATTERN.test(values.retrievedAtIso)
    || new Date(Date.parse(values.retrievedAtIso)).toISOString() !== values.retrievedAtIso) {
    throw new Error("Horizons evidence retrieval time must be a real canonical millisecond UTC instant");
  }
  if (!Number.isSafeInteger(values.byteLength)
    || (values.byteLength as number) < 1
    || (values.byteLength as number) > MAX_RESPONSE_BYTES) {
    throw new Error("Horizons evidence byte length is outside the candidate contract");
  }
  if (typeof values.sha256 !== "string" || !SHA256_PATTERN.test(values.sha256)) {
    throw new Error("Horizons evidence SHA-256 must be lowercase hexadecimal");
  }
  if (typeof values.apiVersion !== "string"
    || !API_VERSION_PATTERN.test(values.apiVersion)
    || values.apiVersion.length > 20
    || values.apiSource !== manifest.expectedResponseSemantics.apiSource) {
    throw new Error("Horizons evidence API identity fields are invalid");
  }
  if (values.publisherAuthenticityEstablished !== false
    || values.networkProvenanceEstablished !== false
    || values.rightsCleared !== false) {
    throw new Error("Mechanical Horizons candidate evidence cannot assert provenance, authenticity or rights clearance");
  }
  if (typeof values.notes !== "string"
    || values.notes !== values.notes.trim()
    || values.notes.length < 1
    || values.notes.length > 500) {
    throw new Error("Horizons evidence notes must be a non-empty trimmed string");
  }

  return Object.freeze({
    schemaVersion: 2,
    recordKind: "horizons_response_candidate_evidence",
    manifestVersion: HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
    evidenceStatus: "mechanically_verified_candidate_only",
    utcInstant: values.utcInstant as string,
    providerTargetId: values.providerTargetId as string,
    centerId: values.centerId as string,
    retrievedAtIso: values.retrievedAtIso,
    sourceUrl: values.sourceUrl as string,
    byteLength: values.byteLength as number,
    sha256: values.sha256,
    responseFormat: "text",
    apiVersion: values.apiVersion,
    apiSource: manifest.expectedResponseSemantics.apiSource,
    publisherAuthenticityEstablished: false,
    networkProvenanceEstablished: false,
    rightsCleared: false,
    notes: values.notes
  });
}

function indexedHeader(lines: readonly string[], label: string): { value: string; index: number } {
  const pattern = new RegExp(`^${escapeRegExp(label)}\\s*:\\s*(.*?)\\s*$`, "u");
  const matches = lines.flatMap((line, index) => {
    const match = pattern.exec(line);
    return match ? [{ value: match[1] ?? "", index }] : [];
  });
  if (matches.length !== 1) {
    throw new Error(`Horizons response must contain exactly one ${label} header`);
  }
  return matches[0]!;
}

function parseBodyHeader(value: string, label: string): {
  name: string;
  id: string;
  ephemerisSource: string;
} {
  const match = /^(.+?)\s+\(([^()]+)\)\s+\{source:\s*([^{}]+)\}$/u.exec(value);
  if (!match) throw new Error(`Horizons ${label} header is malformed`);
  return {
    name: match[1]!.trim(),
    id: match[2]!.trim(),
    ephemerisSource: match[3]!.trim()
  };
}

function uniqueTrimmedLineIndex(lines: readonly string[], expected: string): number {
  const indexes: number[] = [];
  lines.forEach((line, index) => {
    if (line.trim().replace(/\s+/gu, " ") === expected) indexes.push(index);
  });
  if (indexes.length !== 1) {
    throw new Error(`Horizons response must contain exactly one ${expected} line`);
  }
  return indexes[0]!;
}

function tableBounds(lines: readonly string[]): { start: number; end: number } {
  const starts: number[] = [];
  const ends: number[] = [];
  lines.forEach((line, index) => {
    if (line.trim() === "$$SOE") starts.push(index);
    if (line.trim() === "$$EOE") ends.push(index);
  });
  if (starts.length !== 1 || ends.length !== 1 || starts[0]! >= ends[0]!) {
    throw new Error("Horizons response must contain one ordered $$SOE/$$EOE table interval");
  }
  return { start: starts[0]!, end: ends[0]! };
}

export function parseHorizonsVectorRows(text: string): HorizonsVectorRow[] {
  const lines = text.split(/\r?\n/u);
  const { start, end } = tableBounds(lines);
  const tableLines = lines.slice(start + 1, end).map((line) => line.trim()).filter(Boolean);
  if (tableLines.length !== 2) {
    throw new Error(`Horizons single-instant VECTORS table must contain exactly two non-empty lines (found ${tableLines.length})`);
  }
  const semantics = horizonsDifferentialQueryManifest.expectedResponseSemantics;
  const labelPattern = new RegExp(`^([+-]?\\d+(?:\\.\\d+)?)\\s*=\\s*(${escapeRegExp(semantics.rowCalendarLabel)})$`, "u");
  const labelMatch = labelPattern.exec(tableLines[0]!);
  if (!labelMatch || labelMatch[1] !== semantics.rowJulianDateUtText) {
    throw new Error("Horizons row label does not match the frozen discrete UTC instant");
  }
  const numberPattern = "[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[Ee][-+]?\\d+)?";
  const vectorPattern = new RegExp(`^X\\s*=\\s*(${numberPattern})\\s+Y\\s*=\\s*(${numberPattern})\\s+Z\\s*=\\s*(${numberPattern})$`, "u");
  const vectorMatch = vectorPattern.exec(tableLines[1]!);
  if (!vectorMatch) {
    throw new Error("Horizons VECTORS row must contain one exact X/Y/Z position line");
  }
  const vectorLineIndexes = lines.flatMap((line, index) =>
    vectorPattern.test(line.trim()) ? [index] : []
  );
  const calendarLabelIndexes = lines.flatMap((line, index) =>
    line.includes(semantics.rowCalendarLabel) ? [index] : []
  );
  if (vectorLineIndexes.length !== 1
    || vectorLineIndexes[0]! <= start
    || vectorLineIndexes[0]! >= end
    || calendarLabelIndexes.length !== 1
    || calendarLabelIndexes[0]! <= start
    || calendarLabelIndexes[0]! >= end) {
    throw new Error("Horizons response contains an ambiguous vector or epoch line outside the locked table interval");
  }
  const julianDateUt = Number(labelMatch[1]);
  const xAu = Number(vectorMatch[1]);
  const yAu = Number(vectorMatch[2]);
  const zAu = Number(vectorMatch[3]);
  const vectorMagnitudeAu = Math.hypot(xAu, yAu, zAu);
  if (![julianDateUt, xAu, yAu, zAu, vectorMagnitudeAu].every(Number.isFinite)
    || vectorMagnitudeAu <= 0
    || [xAu, yAu, zAu].some((value) => Math.abs(value) > MAX_ABSOLUTE_SUN_GEOCENTRIC_AU)) {
    throw new Error("Horizons Sun/geocenter vector is non-finite or outside the frozen candidate range");
  }
  return [{
    label: labelMatch[2]!,
    julianDateUt,
    xAu,
    yAu,
    zAu
  }];
}

function parseResponseMetadata(lines: readonly string[], record: HorizonsResponseEvidenceRecord): HorizonsResponseMetadata {
  const semantics = horizonsDifferentialQueryManifest.expectedResponseSemantics;
  const headers = {
    apiVersion: indexedHeader(lines, "API VERSION"),
    apiSource: indexedHeader(lines, "API SOURCE"),
    targetBody: indexedHeader(lines, "Target body name"),
    centerBody: indexedHeader(lines, "Center body name"),
    centerSiteName: indexedHeader(lines, "Center-site name"),
    startTimeHeader: indexedHeader(lines, "Start time"),
    stopTimeHeader: indexedHeader(lines, "Stop  time"),
    stepSizeHeader: indexedHeader(lines, "Step-size"),
    outputUnitsHeader: indexedHeader(lines, "Output units"),
    calendarModeHeader: indexedHeader(lines, "Calendar mode"),
    outputTypeHeader: indexedHeader(lines, "Output type"),
    outputFormatHeader: indexedHeader(lines, "Output format"),
    eopFile: indexedHeader(lines, "EOP file"),
    eopCoverage: indexedHeader(lines, "EOP coverage"),
    referenceFrameHeader: indexedHeader(lines, "Reference frame")
  } as const;
  const orderedHeaderIndexes = Object.values(headers).map((header) => header.index);
  if (orderedHeaderIndexes.some((index, position) =>
    position > 0 && index <= orderedHeaderIndexes[position - 1]!
  )) {
    throw new Error("Horizons response headers do not follow the frozen semantic order");
  }
  if (!API_VERSION_PATTERN.test(headers.apiVersion.value)
    || headers.apiVersion.value !== record.apiVersion
    || headers.apiSource.value !== semantics.apiSource
    || headers.apiSource.value !== record.apiSource) {
    throw new Error("Horizons response API version/source does not match the evidence record and manifest");
  }
  const target = parseBodyHeader(headers.targetBody.value, "target body");
  const center = parseBodyHeader(headers.centerBody.value, "center body");
  if (target.name !== semantics.targetBodyName
    || target.id !== semantics.targetBodyId
    || center.name !== semantics.centerBodyName
    || center.id !== semantics.centerBodyId
    || target.ephemerisSource.length < 1
    || target.ephemerisSource.length > 120
    || center.ephemerisSource.length < 1
    || center.ephemerisSource.length > 120) {
    throw new Error("Horizons response target or center header does not match the frozen query");
  }
  const exactHeaders = {
    centerSiteName: headers.centerSiteName.value,
    startTimeHeader: headers.startTimeHeader.value,
    stopTimeHeader: headers.stopTimeHeader.value,
    stepSizeHeader: headers.stepSizeHeader.value,
    outputUnitsHeader: headers.outputUnitsHeader.value,
    calendarModeHeader: headers.calendarModeHeader.value,
    outputTypeHeader: headers.outputTypeHeader.value,
    outputFormatHeader: headers.outputFormatHeader.value,
    referenceFrameHeader: headers.referenceFrameHeader.value
  } as const;
  for (const [key, actual] of Object.entries(exactHeaders)) {
    const expected = semantics[key as keyof typeof exactHeaders];
    if (actual !== expected) {
      throw new Error(`Horizons response ${key} does not match the frozen query semantics`);
    }
  }
  const eopFile = headers.eopFile.value;
  const eopCoverage = headers.eopCoverage.value;
  if (eopFile.length < 1 || eopFile.length > 120 || eopCoverage.length < 1 || eopCoverage.length > 300) {
    throw new Error("Horizons response EOP observation headers are invalid");
  }
  const timeHeaderIndex = uniqueTrimmedLineIndex(lines, semantics.tableTimeHeader);
  const axesHeaderIndex = uniqueTrimmedLineIndex(lines, semantics.tableAxesHeader);
  const bounds = tableBounds(lines);
  if (headers.referenceFrameHeader.index >= timeHeaderIndex
    || timeHeaderIndex >= axesHeaderIndex
    || axesHeaderIndex >= bounds.start) {
    throw new Error("Horizons response headers and VECTORS table are not ordered before $$SOE");
  }
  return Object.freeze({
    apiVersion: headers.apiVersion.value,
    apiSource: semantics.apiSource,
    targetBodyName: semantics.targetBodyName,
    targetBodyId: semantics.targetBodyId,
    targetEphemerisSource: target.ephemerisSource,
    centerBodyName: semantics.centerBodyName,
    centerBodyId: semantics.centerBodyId,
    centerEphemerisSource: center.ephemerisSource,
    centerSiteName: semantics.centerSiteName,
    startTimeHeader: semantics.startTimeHeader,
    stopTimeHeader: semantics.stopTimeHeader,
    stepSizeHeader: semantics.stepSizeHeader,
    outputUnitsHeader: semantics.outputUnitsHeader,
    calendarModeHeader: semantics.calendarModeHeader,
    outputTypeHeader: semantics.outputTypeHeader,
    outputFormatHeader: semantics.outputFormatHeader,
    eopFile,
    eopCoverage,
    referenceFrameHeader: semantics.referenceFrameHeader
  });
}

export function isMechanicallyVerifiedHorizonsResponse(
  candidate: unknown
): candidate is MechanicallyVerifiedHorizonsResponse {
  return candidate !== null
    && typeof candidate === "object"
    && mechanicallyVerifiedResponses.has(candidate as object);
}

export function verifyHorizonsResponseCandidate(
  bytes: Uint8Array,
  recordCandidate: unknown
): MechanicallyVerifiedHorizonsResponse {
  const snapshot = snapshotExactBytes(bytes);
  const record = snapshotEvidenceRecord(recordCandidate);
  if (record.byteLength !== snapshot.byteLength) {
    throw new Error("Horizons evidence byte length does not match the response snapshot");
  }
  const actualSha256 = sha256Hex(snapshot);
  if (record.sha256 !== actualSha256) {
    throw new Error("Horizons evidence SHA-256 does not match the response snapshot");
  }
  if (snapshot[0] === 0xef && snapshot[1] === 0xbb && snapshot[2] === 0xbf) {
    throw new Error("Horizons response must not contain a UTF-8 BOM");
  }
  for (const byte of snapshot) {
    if (byte === 0) throw new Error("Horizons response must not contain NUL bytes");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(snapshot);
  const lines = text.split(/\r?\n/u);
  const responseMetadata = parseResponseMetadata(lines, record);
  const rows = Object.freeze(parseHorizonsVectorRows(text).map((row) => Object.freeze(row)));
  const verified = Object.freeze({
    evidence: record,
    responseMetadata,
    rows
  }) as MechanicallyVerifiedHorizonsResponse;
  mechanicallyVerifiedResponses.add(verified);
  return verified;
}

/**
 * @deprecated No current record can establish official provenance. Callers
 * needing candidate-only mechanics must use verifyHorizonsResponseCandidate.
 */
export function verifyOfficialHorizonsResponse(
  bytes: Uint8Array,
  recordCandidate: unknown
): MechanicallyVerifiedHorizonsResponse {
  verifyHorizonsResponseCandidate(bytes, recordCandidate);
  throw new Error(
    "mechanical Horizons candidate verification does not establish publisher authenticity or network provenance"
  );
}
