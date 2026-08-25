import Dexie from "dexie";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import { SCHEMA_VERSION, type BirthInput, type CitationRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, KnowledgeRepository, ResearchDatabase } from "@hakimi/storage";
import { readLocalBaziCitationReviewContextFromRepositoriesForTesting } from "../lib/bazi-citation-review-context";
import { LocalSourceAwareReviewPanel } from "./local-source-aware-review-panel";

const SUBJECT_ID = "bazi.pillar.day.ganzhi.v1";
const FIELD_PATH = "pillars.day.ganZhi";
const ARRAY_SUBJECT_ID = "bazi.pillar.month.branch-ten-gods.v1";
const ARRAY_FIELD_PATH = "pillars.month.branchTenGods";
const FIXTURE_NOW = "2026-08-24T12:00:00.000Z";
const CASE_SECRET = "UI_CONTEXT_CASE_SECRET_MUST_NOT_LEAK";
const NOTES_SECRET = "UI_CONTEXT_NOTES_SECRET_MUST_NOT_LEAK";
const BIRTH_SECRET = "UI_CONTEXT_BIRTH_SECRET_MUST_NOT_LEAK";

const birthInput: BirthInput = {
  schemaVersion: SCHEMA_VERSION,
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: {
    label: BIRTH_SECRET,
    latitude: 31.2304,
    longitude: 121.4737,
    precision: "coordinates"
  },
  sourceNote: BIRTH_SECRET
};

async function verifyCitation(
  database: ResearchDatabase,
  citation: CitationRecord,
  suffix: string
): Promise<void> {
  await database.citations.put({
    ...citation,
    status: "verified",
    reviewAttestations: [
      { reviewerId: `ui-context-reviewer-a-${suffix}`, reviewedAt: FIXTURE_NOW, note: "定位复核" },
      { reviewerId: `ui-context-reviewer-b-${suffix}`, reviewedAt: FIXTURE_NOW, note: "引用复核" }
    ],
    decisionNote: "只确认测试夹具的本机定位闭合。",
    editVersion: citation.editVersion + 1,
    updatedAt: FIXTURE_NOW
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LocalSourceAwareReviewPanel + real v13 ReviewContext", () => {
  it("shows only the digest-matched minimal field context after explicit read", async () => {
    const database = new ResearchDatabase(
      `hakimi-local-source-review-context-ui-${crypto.randomUUID()}`,
      { targetSchema: 13 }
    );
    const cases = new CaseRepository(database, () => FIXTURE_NOW);
    const knowledge = new KnowledgeRepository(database, () => FIXTURE_NOW);
    const originalSendBeacon = Object.getOwnPropertyDescriptor(window.navigator, "sendBeacon");
    try {
      const chart = await calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE);
      const bundle = await cases.createCase({
        alias: CASE_SECRET,
        notes: NOTES_SECRET,
        calculated: chart
      });
      const revision = bundle.revisions[0]!;
      const content = ["# 两条来源", "第一条本机核验摘录", "第二条本机核验摘录"].join("\n");
      const knowledgeDocument = await knowledge.createDocument({
        title: "字段来源 UI 集成夹具",
        author: "本地测试",
        edition: "隔离版",
        sourceNote: "仅用于自动化",
        fileName: "ui-context.md",
        format: "markdown",
        content,
        byteSize: new TextEncoder().encode(content).byteLength
      });
      const first = await knowledge.createCitation({
        documentId: knowledgeDocument.id,
        locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
        annotation: "第一条",
        targets: [{ kind: "evidence_subject", subjectId: SUBJECT_ID }]
      });
      const second = await knowledge.createCitation({
        documentId: knowledgeDocument.id,
        locator: { sectionId: "section-1", startLine: 3, endLine: 3 },
        annotation: "第二条",
        targets: [{ kind: "evidence_subject", subjectId: SUBJECT_ID }]
      });
      await verifyCitation(database, first, "0");
      await verifyCitation(database, second, "1");

      const fetchMock = vi.fn();
      const webSocketMock = vi.fn();
      const sendBeaconMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      vi.stubGlobal("WebSocket", webSocketMock);
      Object.defineProperty(window.navigator, "sendBeacon", {
        configurable: true,
        writable: true,
        value: sendBeaconMock
      });
      const xhrSendSpy = vi.spyOn(XMLHttpRequest.prototype, "send");
      const storageSetItemSpy = vi.spyOn(Storage.prototype, "setItem");
      const storageRemoveItemSpy = vi.spyOn(Storage.prototype, "removeItem");
      const storageClearSpy = vi.spyOn(Storage.prototype, "clear");
      const idbAddSpy = vi.spyOn(IDBObjectStore.prototype, "add");
      const idbPutSpy = vi.spyOn(IDBObjectStore.prototype, "put");
      const idbDeleteSpy = vi.spyOn(IDBObjectStore.prototype, "delete");
      const idbClearSpy = vi.spyOn(IDBObjectStore.prototype, "clear");

      const locator = {
        caseId: bundle.caseRecord.id,
        revisionId: revision.id,
        evidenceSubjectId: SUBJECT_ID,
        fieldPath: FIELD_PATH
      };
      const releaseIdentity = {
        dbGeneration: "legacy-v13" as const,
        databaseName: database.name,
        targetSchema: 13,
        migrationId: null,
        buildVersion: null,
        manifestDigest: null,
        evidenceId: null,
        evidenceBound: false,
        engineeringEvidenceOnly: true as const
      };
      const readSnapshot = vi.fn((subjectId, options) => (
        knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, options)
      ));
      const readReviewContext = vi.fn((rawLocator, options) => (
        readLocalBaziCitationReviewContextFromRepositoriesForTesting(rawLocator, {
          releaseIdentity,
          caseRepository: cases,
          knowledgeRepository: knowledge
        }, options)
      ));

      render(
        <LocalSourceAwareReviewPanel
          subjectId={SUBJECT_ID}
          reviewContextLocator={locator}
          readSnapshot={readSnapshot}
          readReviewContext={readReviewContext}
        />
      );
      expect(readSnapshot).not.toHaveBeenCalled();
      expect(readReviewContext).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));

      const contextRegion = await screen.findByRole("region", {
        name: "Revision 字段最小只读上下文"
      });
      expect(within(contextRegion).getByText(FIELD_PATH)).toBeTruthy();
      expect(within(contextRegion).getByText(/首次 pass 已丢弃/)).toBeTruthy();
      expect(within(contextRegion).queryByText(CASE_SECRET)).toBeNull();
      expect(within(contextRegion).queryByText(NOTES_SECRET)).toBeNull();
      expect(within(contextRegion).queryByText(BIRTH_SECRET)).toBeNull();
      expect(readSnapshot).toHaveBeenCalledTimes(2);
      expect(readReviewContext).toHaveBeenCalledTimes(1);
      expect(document.querySelector("[data-review-context-bound='true']")).toBeTruthy();
      expect(document.querySelector("[data-mutation-epoch-bypassed='false']")).toBeTruthy();

      const firstContextRead = await readReviewContext.mock.results[0]!.value;
      fireEvent.click(screen.getByRole("button", { name: "重新读取并复核" }));
      await waitFor(() => expect(readReviewContext).toHaveBeenCalledTimes(2));
      expect(readReviewContext).toHaveBeenNthCalledWith(2, locator, {
        expectedPriorContextPayloadSha256: firstContextRead.context.integrity.payloadSha256
      });
      const secondContextRead = await readReviewContext.mock.results[1]!.value;
      expect(secondContextRead.repositoryReadBinding).toMatchObject({
        expectedPriorContextPayloadSha256: firstContextRead.context.integrity.payloadSha256,
        expectedPriorContextMatched: true
      });
      expect(await screen.findByRole("region", {
        name: "Revision 字段最小只读上下文"
      })).toBeTruthy();
      expect(readSnapshot).toHaveBeenCalledTimes(4);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(webSocketMock).not.toHaveBeenCalled();
      expect(sendBeaconMock).not.toHaveBeenCalled();
      expect(xhrSendSpy).not.toHaveBeenCalled();
      expect(storageSetItemSpy).not.toHaveBeenCalled();
      expect(storageRemoveItemSpy).not.toHaveBeenCalled();
      expect(storageClearSpy).not.toHaveBeenCalled();
      expect(idbAddSpy).not.toHaveBeenCalled();
      expect(idbPutSpy).not.toHaveBeenCalled();
      expect(idbDeleteSpy).not.toHaveBeenCalled();
      expect(idbClearSpy).not.toHaveBeenCalled();

      vi.restoreAllMocks();
      if (originalSendBeacon) {
        Object.defineProperty(window.navigator, "sendBeacon", originalSendBeacon);
      } else {
        Reflect.deleteProperty(window.navigator, "sendBeacon");
      }
    } finally {
      vi.restoreAllMocks();
      if (originalSendBeacon) {
        Object.defineProperty(window.navigator, "sendBeacon", originalSendBeacon);
      } else {
        Reflect.deleteProperty(window.navigator, "sendBeacon");
      }
      database.close();
      await Dexie.delete(database.name);
    }
  }, 60_000);

  it("projects a real array field without inventing an unregistered day-boundary rule", async () => {
    const database = new ResearchDatabase(
      `hakimi-local-source-review-context-array-ui-${crypto.randomUUID()}`,
      { targetSchema: 13 }
    );
    const cases = new CaseRepository(database, () => FIXTURE_NOW);
    const knowledge = new KnowledgeRepository(database, () => FIXTURE_NOW);
    try {
      const chart = await calculateChart(birthInput, WORKING_DEFAULT_RULE_PROFILE);
      const bundle = await cases.createCase({
        alias: CASE_SECRET,
        notes: NOTES_SECRET,
        calculated: chart
      });
      const revision = bundle.revisions[0]!;
      const expectedValue = revision.facts.pillars.month.branchTenGods;
      expect(expectedValue.length).toBeGreaterThan(0);

      const sourceQuote = "MONTH_BRANCH_TEN_GODS_SOURCE_TEXT_MUST_NOT_ENTER_CONTEXT";
      const content = ["# 月支十神来源", sourceQuote, "第二条独立定位摘录"].join("\n");
      const knowledgeDocument = await knowledge.createDocument({
        title: "月支十神数组字段 UI 集成夹具",
        author: "本地测试",
        edition: "隔离版",
        sourceNote: "仅用于自动化",
        fileName: "ui-context-array.md",
        format: "markdown",
        content,
        byteSize: new TextEncoder().encode(content).byteLength
      });
      const first = await knowledge.createCitation({
        documentId: knowledgeDocument.id,
        locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
        annotation: "数组字段第一条",
        targets: [{ kind: "evidence_subject", subjectId: ARRAY_SUBJECT_ID }]
      });
      const second = await knowledge.createCitation({
        documentId: knowledgeDocument.id,
        locator: { sectionId: "section-1", startLine: 3, endLine: 3 },
        annotation: "数组字段第二条",
        targets: [{ kind: "evidence_subject", subjectId: ARRAY_SUBJECT_ID }]
      });
      await verifyCitation(database, first, "array-0");
      await verifyCitation(database, second, "array-1");

      const locator = {
        caseId: bundle.caseRecord.id,
        revisionId: revision.id,
        evidenceSubjectId: ARRAY_SUBJECT_ID,
        fieldPath: ARRAY_FIELD_PATH
      };
      const releaseIdentity = {
        dbGeneration: "legacy-v13" as const,
        databaseName: database.name,
        targetSchema: 13,
        migrationId: null,
        buildVersion: null,
        manifestDigest: null,
        evidenceId: null,
        evidenceBound: false,
        engineeringEvidenceOnly: true as const
      };
      const readSnapshot = vi.fn((subjectId, options) => (
        knowledge.readLocalKnowledgeSourceAwareRetrievalSnapshot(subjectId, options)
      ));
      const readReviewContext = vi.fn((rawLocator, options) => (
        readLocalBaziCitationReviewContextFromRepositoriesForTesting(rawLocator, {
          releaseIdentity,
          caseRepository: cases,
          knowledgeRepository: knowledge
        }, options)
      ));

      render(
        <LocalSourceAwareReviewPanel
          subjectId={ARRAY_SUBJECT_ID}
          reviewContextLocator={locator}
          readSnapshot={readSnapshot}
          readReviewContext={readReviewContext}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: "读取来源并复核 Revision 上下文" }));

      const contextRegion = await screen.findByRole("region", {
        name: "Revision 字段最小只读上下文"
      });
      expect(within(contextRegion).getByText(ARRAY_FIELD_PATH)).toBeTruthy();
      expect(within(contextRegion).getByText(expectedValue.join("、"))).toBeTruthy();
      expect(within(contextRegion).getByText("该证据主题未投影换日规则")).toBeTruthy();
      expect(within(contextRegion).queryByText("23:00 子初换日")).toBeNull();
      expect(within(contextRegion).queryByText("00:00 午夜换日")).toBeNull();
      expect(within(contextRegion).queryByText(CASE_SECRET)).toBeNull();
      expect(within(contextRegion).queryByText(NOTES_SECRET)).toBeNull();
      expect(within(contextRegion).queryByText(BIRTH_SECRET)).toBeNull();
      expect(within(contextRegion).queryByText(sourceQuote)).toBeNull();

      expect(readSnapshot).toHaveBeenCalledTimes(2);
      expect(readReviewContext).toHaveBeenCalledTimes(1);
      const secondSourceSnapshot = await readSnapshot.mock.results[1]!.value;
      const contextRead = await readReviewContext.mock.results[0]!.value;
      expect(contextRead.context.subjectBinding.ruleProfilePaths).toEqual([]);
      expect(contextRead.context.ruleProjection.items).toEqual([]);
      expect(contextRead.context.worksetBinding).toMatchObject({
        suppliedStorageSidecarSnapshotSha256: secondSourceSnapshot.storageSnapshot.snapshotSha256,
        packetPayloadSha256: secondSourceSnapshot.packet.integrity.payloadSha256,
        matchingSourceSetSha256: secondSourceSnapshot.packet.sourceSet.matchingSourceSetSha256
      });
      expect(document.querySelector("[data-review-context-bound='true']")).toBeTruthy();
      expect(document.querySelector("[data-mutation-epoch-bypassed='false']")).toBeTruthy();
    } finally {
      database.close();
      await Dexie.delete(database.name);
    }
  }, 60_000);
});
