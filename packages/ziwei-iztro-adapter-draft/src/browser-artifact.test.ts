// @vitest-environment node

import { beforeAll, describe, expect, it } from "vitest";
import {
  calculateIztro258EngineeringFixture,
  createIztro258RuleSnapshotDraft
} from "./index.ts";
import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  ziweiNatalFixtureDraftSchema,
  type ZiweiBirthInputDraft,
  type ZiweiNatalFixtureDraft
} from "./contract-bridge.ts";
import {
  createZiweiBrowserEngineeringArtifactDraft,
  calculateZiweiBrowserSourceGraphSha256,
  verifyZiweiBrowserEngineeringArtifactDraft,
  ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
  ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
  ZIWEI_BROWSER_SOURCE_PATHS,
  ziweiBrowserEngineeringArtifactDraftSchema,
  type ZiweiBrowserEngineeringArtifactDraft,
  type ZiweiBrowserSourceIdentityDraft
} from "./browser-preview/browser-artifact.ts";
import { requireVerifiedBrowserProbeResponse } from "./browser-preview/main-response-gate.ts";
import { createZiweiBrowserDisplayProjection } from "./browser-preview/display-projection.ts";
import {
  ZIWEI_BROWSER_PROBE_PROTOCOL,
  type BrowserProbeSuccessResponse
} from "./browser-preview/browser-protocol.ts";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const WORKER_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_WORKER_ID = "33333333-3333-4333-8333-333333333333";
const STARTED_AT = "2026-08-10T00:00:00.000Z";
const COMPLETED_AT = "2026-08-10T00:00:00.010Z";

const INPUT: ZiweiBirthInputDraft = {
  contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  systemId: ZIWEI_DOUSHU_SYSTEM_ID,
  calendarInput: { calendar: "gregorian", date: "1995-08-18" },
  shichenIndex: 6,
  sexForCalculation: "male",
  solarTimeAdjustment: "none",
  civilContext: {
    usedForCalculation: false,
    localTime: null,
    timeZone: null,
    location: {
      precision: "unknown",
      label: "browser-artifact-test",
      latitude: null,
      longitude: null
    }
  },
  birthSourceRef: "local.browser.test",
  sourceNote: "Browser engineering artifact integrity test input."
};

let nodeFixture: ZiweiNatalFixtureDraft;
let artifact: ZiweiBrowserEngineeringArtifactDraft;
let successResponse: BrowserProbeSuccessResponse;
let browserSourceIdentity: ZiweiBrowserSourceIdentityDraft;

beforeAll(async () => {
  const ruleSnapshot = await createIztro258RuleSnapshotDraft();
  nodeFixture = await calculateIztro258EngineeringFixture(INPUT, { ruleSnapshot });
  const files = ZIWEI_BROWSER_SOURCE_PATHS.map((path, index) => ({
    path,
    sha256: (index + 1).toString(16).repeat(64)
  }));
  const sourceProjection = {
    identityVersion: ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
    digestAlgorithm: ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
    files
  } as const;
  browserSourceIdentity = {
    ...sourceProjection,
    browserSourceGraphSha256: await calculateZiweiBrowserSourceGraphSha256(sourceProjection),
    browserWorkerSourceSha256: files.find((entry) => entry.path.endsWith("browser-worker.ts"))!.sha256
  };
  artifact = await createZiweiBrowserEngineeringArtifactDraft({
    input: nodeFixture.input,
    ruleSnapshot: nodeFixture.ruleSnapshot,
    facts: nodeFixture.facts,
    requestId: REQUEST_ID,
    workerInstanceId: WORKER_ID,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    browserSourceIdentity
  });
  successResponse = {
    ok: true,
    protocolVersion: ZIWEI_BROWSER_PROBE_PROTOCOL,
    requestId: REQUEST_ID,
    workerInstanceId: WORKER_ID,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    result: { artifact }
  };
}, 30_000);

describe("Ziwei Browser engineering artifact", () => {
  it("fails closed when the Browser source sentinel is loaded outside the dedicated Vite injection", async () => {
    await expect(import("./browser-preview/generated-browser-source-identity.ts"))
      .rejects.toThrow(/was not injected by the dedicated Vite boundary/u);
  });

  it("keeps the Browser artifact and Node-only receipt mutually non-interchangeable", async () => {
    const browserVerification = await verifyZiweiBrowserEngineeringArtifactDraft(artifact);
    expect(browserVerification.success).toBe(true);
    expect(artifact.artifactKind).toBe("ziwei_browser_natal_engineering_artifact");
    expect(artifact.execution.runtime).toBe("browser_web_worker");
    expect(artifact.digests.historicalExecutionAuthenticated).toBe(false);
    expect(artifact.boundary.productionEligible).toBe(false);
    expect(artifact.boundary.expertTruthClaimed).toBe(false);

    expect(ziweiBrowserEngineeringArtifactDraftSchema.safeParse(nodeFixture).success).toBe(false);
    expect(ziweiNatalFixtureDraftSchema.safeParse(artifact).success).toBe(false);
  });

  it("rejects unknown and missing Browser artifact fields", async () => {
    const withUnknown = structuredClone(artifact) as ZiweiBrowserEngineeringArtifactDraft & { unexpected?: boolean };
    withUnknown.unexpected = true;
    const unknownResult = await verifyZiweiBrowserEngineeringArtifactDraft(withUnknown);
    expect(unknownResult.success).toBe(false);
    if (!unknownResult.success) expect(unknownResult.reason).toBe("schema_invalid");

    const missing = structuredClone(artifact) as unknown as Record<string, unknown>;
    delete missing.evidence;
    const missingResult = await verifyZiweiBrowserEngineeringArtifactDraft(missing);
    expect(missingResult.success).toBe(false);
    if (!missingResult.success) expect(missingResult.reason).toBe("schema_invalid");
  });

  it.each([
    ["input", tamperInput],
    ["rule", tamperRule],
    ["facts", tamperFacts],
    ["execution", tamperExecution]
  ] as const)("fails closed when %s content is changed", async (_label, tamper) => {
    const changed = structuredClone(artifact);
    tamper(changed);
    const result = await verifyZiweiBrowserEngineeringArtifactDraft(changed);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.reason).toBe("digest_mismatch");
  });

  it("makes the main-thread gate reject a bad artifact digest before display", async () => {
    const response = structuredClone(successResponse);
    response.result.artifact.digests.factsSha256 = "0".repeat(64);
    await expect(requireVerifiedBrowserProbeResponse(response, REQUEST_ID, INPUT, browserSourceIdentity))
      .rejects.toThrow(/工件验真失败|digest mismatch/u);
  });

  it("makes the main-thread gate reject an envelope/Worker identity mismatch before display", async () => {
    const response = structuredClone(successResponse);
    (response as { workerInstanceId: string }).workerInstanceId = OTHER_WORKER_ID;
    await expect(requireVerifiedBrowserProbeResponse(response, REQUEST_ID, INPUT, browserSourceIdentity))
      .rejects.toThrow(/身份与回包信封不一致/u);
  });

  it("returns only a fully verified artifact from the main-thread gate", async () => {
    const accepted = await requireVerifiedBrowserProbeResponse(
      successResponse,
      REQUEST_ID,
      INPUT,
      browserSourceIdentity
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error("expected success");
    expect(accepted.result.artifact.digests.artifactSha256).toBe(artifact.digests.artifactSha256);
    expect(accepted.result.artifact.execution.requestId).toBe(REQUEST_ID);
  });

  it("rejects same-count Worker-supplied display text and derives display only from verified facts", async () => {
    const forged = structuredClone(successResponse) as unknown as {
      result: Record<string, unknown>;
    };
    forged.result.displayPalaces = artifact.facts.palaces.map(() => ({ label: "伪造星曜" }));
    forged.result.displaySummary = { gregorianDate: artifact.facts.calendarFacts.gregorianDate };
    await expect(requireVerifiedBrowserProbeResponse(forged, REQUEST_ID, INPUT, browserSourceIdentity))
      .rejects.toThrow(/成功结果字段不完整/u);

    const projection = createZiweiBrowserDisplayProjection(artifact);
    expect(projection.displayPalaces).toHaveLength(12);
    expect(projection.displayPalaces[0]!.stars.map((star) => star.category)).toEqual(
      artifact.facts.palaces[0]!.stars.map((star) => star.category)
    );
  });

  it("rejects a validly shaped artifact from a different Browser source graph", async () => {
    const otherIdentity = structuredClone(browserSourceIdentity);
    otherIdentity.files[0]!.sha256 = "f".repeat(64);
    otherIdentity.browserSourceGraphSha256 = await calculateZiweiBrowserSourceGraphSha256(otherIdentity);
    await expect(requireVerifiedBrowserProbeResponse(successResponse, REQUEST_ID, INPUT, otherIdentity))
      .rejects.toThrow(/源码图身份/u);
  });
});

function tamperInput(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  candidate.input.sourceNote = `${candidate.input.sourceNote} changed`;
}

function tamperRule(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  candidate.ruleSnapshot.sourceCatalog[0]!.notes = `${candidate.ruleSnapshot.sourceCatalog[0]!.notes} changed`;
}

function tamperFacts(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  const lunarDate = candidate.facts.calendarFacts.lunarDate;
  lunarDate.day = lunarDate.day === 30 ? 29 : lunarDate.day + 1;
}

function tamperExecution(candidate: ZiweiBrowserEngineeringArtifactDraft): void {
  candidate.execution.workerInstanceId = OTHER_WORKER_ID;
}
