import { readFile } from "node:fs/promises";
import {
  assertHkoBoundaryMatrixMatchesCalendars,
  assertHkoCalendarRangeContinuity,
  assertHkoCalendarBoundaryMatrixArtifact,
  verifyHkoAnnualResourceLock
} from "../src/official-calendar-evidence.ts";

const artifactUrl = new URL(
  "../fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json",
  import.meta.url
);
const MAX_HKO_ANNUAL_RESOURCE_BYTES = 64 * 1024;

async function fetchWithBoundedRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(url, {
        headers: {
          accept: "text/csv,*/*;q=0.1",
          "accept-encoding": "identity",
          "user-agent": "Hakimi-Calendar-Evidence-Audit/0.1"
        },
        redirect: "error",
        signal: AbortSignal.timeout(20_000)
      });
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function readLockedBody(response: Response, expectedBytes: number): Promise<Uint8Array> {
  if (expectedBytes <= 0 || expectedBytes > MAX_HKO_ANNUAL_RESOURCE_BYTES) {
    await response.body?.cancel("Locked HKO resource size exceeds the audit ceiling.");
    throw new Error(`Locked HKO resource size ${expectedBytes} exceeds the ${MAX_HKO_ANNUAL_RESOURCE_BYTES}-byte ceiling.`);
  }
  const rawContentLength = response.headers.get("content-length");
  if (rawContentLength === null || !/^[1-9]\d*$/u.test(rawContentLength)) {
    await response.body?.cancel("Missing or invalid Content-Length.");
    throw new Error("HKO audit refuses a response without one strict positive Content-Length.");
  }
  const contentLength = Number(rawContentLength);
  if (contentLength !== expectedBytes || contentLength > MAX_HKO_ANNUAL_RESOURCE_BYTES) {
    await response.body?.cancel("Content-Length does not match the locked resource size.");
    throw new Error(`HKO Content-Length ${contentLength} does not match locked size ${expectedBytes}.`);
  }
  if (!response.body) throw new Error("HKO response has no readable body.");

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > expectedBytes || total > MAX_HKO_ANNUAL_RESOURCE_BYTES) {
        await reader.cancel("HKO response exceeded its locked byte budget.");
        throw new Error(`HKO response exceeded the ${expectedBytes}-byte locked budget.`);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total !== expectedBytes) {
    throw new Error(`HKO response ended at ${total} bytes; expected ${expectedBytes}.`);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function main() {
  const candidate: unknown = JSON.parse(await readFile(artifactUrl, "utf8"));
  assertHkoCalendarBoundaryMatrixArtifact(candidate);

  const calendars = [];
  const resources = [];
  for (const lock of candidate.annualResources) {
    const response = await fetchWithBoundedRetry(lock.resourceUrl);
    const body = await readLockedBody(response, lock.resourceBytes);
    const calendar = verifyHkoAnnualResourceLock(lock, response.status, body);
    calendars.push(calendar);
    resources.push({
      year: lock.year,
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      bytes: calendar.resourceBytes,
      sha256: calendar.resourceSha256,
      rows: calendar.rows.length,
      lineEnding: calendar.lineEnding,
      hasUtf8Bom: calendar.hasUtf8Bom
    });
  }
  const seams = assertHkoCalendarRangeContinuity(calendars);
  assertHkoBoundaryMatrixMatchesCalendars(candidate, calendars);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    format: candidate.format,
    claimScope: candidate.claimScope,
    civilDateOnly: candidate.civilDateOnly,
    productionEligible: candidate.productionEligible,
    expertTruthClaimed: candidate.expertTruthClaimed,
    dailyRowsVerified: calendars.reduce((sum, calendar) => sum + calendar.rows.length, 0),
    crossFileSeamsVerified: seams.length,
    boundaryPairsVerified: candidate.boundaryMatrix.length,
    resources
  }, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const detail = error instanceof Error
    ? { name: error.name, message: error.message, code: "code" in error ? error.code : undefined }
    : { message: String(error) };
  process.stderr.write(`${JSON.stringify({ ok: false, error: detail }, null, 2)}\n`);
  process.exitCode = 1;
});
