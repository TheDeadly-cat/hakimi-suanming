import { ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION } from "./contract-bridge.ts";
import { calculateIztro258EngineeringFixture } from "./iztro-adapter-bridge.ts";
import {
  MemoryZiweiWorkspaceRevisionByteStoreDraft,
  ZiweiWorkspaceRevisionRepositoryDraft
} from "./index.ts";

const [date = "1995-08-18", shichenText = "6", sex = "male"] = process.argv.slice(2);
const shichenIndex = Number(shichenText);

try {
  const fixture = await calculateIztro258EngineeringFixture({
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date },
    shichenIndex,
    sexForCalculation: sex,
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: null,
      timeZone: null,
      location: { precision: "unknown", label: "", latitude: null, longitude: null }
    },
    birthSourceRef: "cli.workspace.engineering_preview",
    sourceNote: "Isolated workspace export/import demo; not expert truth or production data."
  });

  const studyId = globalThis.crypto.randomUUID();
  const revisionId = globalThis.crypto.randomUUID();
  const firstPort = new MemoryZiweiWorkspaceRevisionByteStoreDraft();
  const firstSession = new ZiweiWorkspaceRevisionRepositoryDraft(firstPort);
  const saved = await firstSession.saveRevision({
    studyId,
    revisionId,
    parentRevisionId: null,
    createdAt: new Date().toISOString(),
    title: `紫微隔离研究 ${date}`,
    note: "Fresh iztro engineering artifact in an immutable draft Revision.",
    fixture
  });
  const reopened = await new ZiweiWorkspaceRevisionRepositoryDraft(firstPort)
    .reopenRevision(revisionId);
  const exported = await firstSession.exportRevision(revisionId);

  const importedPort = new MemoryZiweiWorkspaceRevisionByteStoreDraft();
  const importedSession = new ZiweiWorkspaceRevisionRepositoryDraft(importedPort);
  const imported = await importedSession.importRevision(exported.bytes);
  const reopenedAfterImport = await new ZiweiWorkspaceRevisionRepositoryDraft(importedPort)
    .reopenContent(exported.contentSha256);

  console.log(JSON.stringify({
    warning: "Isolated engineering Revision only; unkeyed digest integrity is not engine authentication or expert truth.",
    saveStatus: saved.status,
    studyId,
    revisionId,
    parentRevisionId: reopened.parentRevisionId,
    fixtureArtifactSha256: reopened.fixtureArtifactSha256,
    contentAddress: reopened.contentAddress,
    export: {
      mimeType: exported.mimeType,
      fileName: exported.fileName,
      byteLength: exported.byteLength
    },
    importStatus: imported.status,
    reopenAfterImportMatches: reopenedAfterImport.contentSha256 === reopened.contentSha256,
    boundary: reopened.boundary
  }, null, 2));
} catch (error) {
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "ZIWEI_WORKSPACE_DEMO_FAILED";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${code}: ${message}`);
  process.exitCode = 1;
}
