import { sha256Hex } from "../rule-layer/canonical.ts";
import {
  HORIZONS_DIFFERENTIAL_MANIFEST_VERSION,
  horizonsDifferentialQueryManifest
} from "./query-manifest.ts";

export type HorizonsVectorRow = Readonly<{
  label: string;
  xAu: number;
  yAu: number;
  zAu: number;
}>;

export type OfficialHorizonsEvidenceRecord = Readonly<{
  schemaVersion: 1;
  recordKind: "official_horizons_response_evidence";
  manifestVersion: typeof HORIZONS_DIFFERENTIAL_MANIFEST_VERSION;
  utcInstant: string;
  providerTargetId: string;
  centerId: string;
  retrievedAtIso: string;
  sourceUrl: string;
  byteLength: number;
  sha256: string;
  responseFormat: "text";
  notes: string;
}>;

export type VerifiedHorizonsResponse = Readonly<{
  evidence: OfficialHorizonsEvidenceRecord;
  rows: readonly HorizonsVectorRow[];
}>;

export function parseHorizonsVectorRows(text: string): HorizonsVectorRow[] {
  const rows: HorizonsVectorRow[] = [];
  const pattern = /^(.{0,80}?)\s*X\s*=\s*([-+0-9.Ee]+)\s+Y\s*=\s*([-+0-9.Ee]+)\s+Z\s*=\s*([-+0-9.Ee]+)/gmu;
  for (const match of text.matchAll(pattern)) {
    const xAu = Number(match[2]);
    const yAu = Number(match[3]);
    const zAu = Number(match[4]);
    if (!Number.isFinite(xAu) || !Number.isFinite(yAu) || !Number.isFinite(zAu)) {
      throw new Error("Horizons vector row contains non-finite values");
    }
    rows.push({
      label: (match[1] ?? "").trim(),
      xAu,
      yAu,
      zAu
    });
  }
  return rows;
}

function requireRecord(candidate: unknown): Record<string, unknown> {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Horizons evidence record must be an object");
  }
  return candidate as Record<string, unknown>;
}

export function verifyOfficialHorizonsResponse(
  bytes: Uint8Array,
  recordCandidate: unknown
): VerifiedHorizonsResponse {
  const manifest = horizonsDifferentialQueryManifest;
  const record = requireRecord(recordCandidate);
  if (record.schemaVersion !== 1
    || record.recordKind !== "official_horizons_response_evidence"
    || record.manifestVersion !== HORIZONS_DIFFERENTIAL_MANIFEST_VERSION
    || record.responseFormat !== "text") {
    throw new Error("Horizons evidence record does not match the frozen differential manifest");
  }
  const expected: OfficialHorizonsEvidenceRecord = record as unknown as OfficialHorizonsEvidenceRecord;
  if (expected.utcInstant !== manifest.utcInstant
    || expected.providerTargetId !== manifest.target.providerTargetId
    || expected.centerId !== manifest.target.centerId
    || typeof expected.retrievedAtIso !== "string"
    || typeof expected.sourceUrl !== "string"
    || !expected.sourceUrl.startsWith(manifest.endpoint)) {
    throw new Error("Horizons evidence record does not bind the frozen target, center and UTC instant");
  }
  if (expected.byteLength !== bytes.byteLength) {
    throw new Error("Horizons evidence byte length does not match the locked response");
  }
  const actualSha256 = sha256Hex(bytes);
  if (!/^[a-f0-9]{64}$/u.test(expected.sha256) || expected.sha256 !== actualSha256) {
    throw new Error("Horizons evidence SHA-256 does not match the locked response bytes");
  }
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!text.includes("$$SOE") || !text.includes("$$EOE") || !text.includes("X =")) {
    throw new Error("Horizons response does not contain a locked VECTORS table");
  }
  const rows = parseHorizonsVectorRows(text);
  if (rows.length !== 1) {
    throw new Error(`Horizons single-instant VECTORS query must contain exactly one row (found ${rows.length})`);
  }
  if (!rows[0]!.label.includes("2025-Mar-20 09:01")) {
    throw new Error("Horizons row label does not match the frozen 2025-03-20 09:01 UTC instant");
  }
  return { evidence: expected, rows };
}
