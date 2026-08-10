import { afterEach, describe, expect, it, vi } from "vitest";
import Dexie from "dexie";
import type { BirthInput, RulePackBinding, RuleProfile } from "@hakimi/contracts";
import { calculateChart, digestRuleProfile } from "@hakimi/bazi-core";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary } from "@hakimi/rule-profiles";
import {
  CaseRepository,
  DuplicateBirthFingerprintError,
  KnowledgeRepository,
  ResearchDatabase,
  ResearchRepository
} from "./index";

const databases: ResearchDatabase[] = [];

function createRepository() {
  const database = new ResearchDatabase(`hakimi-test-${crypto.randomUUID()}`);
  databases.push(database);
  return new CaseRepository(database);
}

const input: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

async function rulePackBindingFor(
  profile: RuleProfile,
  overrides: Partial<RulePackBinding> = {}
): Promise<RulePackBinding> {
  return {
    kind: "installed_rule_pack",
    packDigest: "a".repeat(64),
    profileDigest: await digestRuleProfile(profile),
    packId: "storage-bound-pack",
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    useMode: "exact",
    ...overrides
  };
}

afterEach(async () => {
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("CaseRepository", () => {
  it("以 Case + Revision 分离保存并可重新读取", async () => {
    const repository = createRepository();
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const created = await repository.createCase({ alias: "案例 A", tags: ["演示"], calculated });
    const reopened = await repository.getCase(created.caseRecord.id);
    expect(reopened?.caseRecord.alias).toBe("案例 A");
    expect(reopened?.revisions).toHaveLength(1);
    expect(reopened?.revisions[0].manifest.resultHash).toBe(calculated.manifest.resultHash);
    expect(reopened?.revisions[0].ruleProfile).toEqual(WORKING_DEFAULT_RULE_PROFILE);
  });

  it("变更计算规则时创建新修订，不覆盖旧盘", async () => {
    const repository = createRepository();
    const firstChart = await calculateChart(input, withDayBoundary("zi_start_23"));
    const created = await repository.createCase({ alias: "边界案例", calculated: firstChart });
    const secondChart = await calculateChart(input, withDayBoundary("midnight"));
    const updated = await repository.addRevision(created.caseRecord.id, secondChart);
    expect(updated.revisions).toHaveLength(2);
    expect(updated.caseRecord.revisionCount).toBe(2);
    expect(updated.revisions[0].ruleProfile.calendar.dayBoundary).toBe("zi_start_23");
    expect(updated.revisions[1].ruleProfile.calendar.dayBoundary).toBe("midnight");
  });

  it("为 createCase 与 addRevision 原样持久化规则包绑定，并在重读时通过完整性复算", async () => {
    const repository = createRepository();
    const firstBinding = await rulePackBindingFor(WORKING_DEFAULT_RULE_PROFILE);
    const firstChart = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE, {
      rulePackBinding: firstBinding
    });
    const created = await repository.createCase({ alias: "规则包绑定案例", calculated: firstChart });

    expect(created.revisions[0].rulePackBinding).toEqual(firstBinding);
    await expect(repository.getRevision(created.revisions[0].id)).resolves.toMatchObject({
      rulePackBinding: firstBinding,
      manifest: { resultHash: firstChart.manifest.resultHash }
    });

    const secondBinding = await rulePackBindingFor(WORKING_DEFAULT_RULE_PROFILE, {
      packDigest: "b".repeat(64),
      packId: "storage-bound-pack-second"
    });
    const secondChart = await calculateChart(
      { ...input, time: "09:26" },
      WORKING_DEFAULT_RULE_PROFILE,
      { rulePackBinding: secondBinding }
    );
    const updated = await repository.addRevision(created.caseRecord.id, secondChart);

    expect(updated.revisions[0].rulePackBinding).toEqual(firstBinding);
    expect(updated.revisions[1].rulePackBinding).toEqual(secondBinding);
    const reopened = await repository.getCase(created.caseRecord.id);
    expect(reopened?.revisions.map((revision) => revision.rulePackBinding)).toEqual([
      firstBinding,
      secondBinding
    ]);
    expect(reopened?.revisions.map((revision) => revision.manifest.resultHash)).toEqual([
      firstChart.manifest.resultHash,
      secondChart.manifest.resultHash
    ]);
  });

  it("在一个只读事务中导出指定历史修订及其相关研究证据，不偷换成最新版", async () => {
    const repository = createRepository();
    const research = new ResearchRepository(repository.database, () => "2026-08-01T00:00:00.000Z");
    const knowledge = new KnowledgeRepository(repository.database, () => "2026-08-01T00:00:00.000Z");
    const first = await repository.createCase({
      alias: "历史修订导出",
      calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE)
    });
    const firstRevision = first.revisions[0];
    const updated = await repository.addRevision(
      first.caseRecord.id,
      await calculateChart({ ...input, time: "09:26" }, WORKING_DEFAULT_RULE_PROFILE)
    );
    const latestRevision = updated.revisions[1];
    const caseNote = await research.createResearchNote({
      caseId: first.caseRecord.id,
      anchor: { kind: "case" },
      body: "案例级笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const firstNote = await research.createResearchNote({
      caseId: first.caseRecord.id,
      anchor: { kind: "revision", revisionId: firstRevision.id },
      body: "第一版笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const secondNote = await research.createResearchNote({
      caseId: first.caseRecord.id,
      anchor: { kind: "revision", revisionId: latestRevision.id },
      body: "第二版笔记",
      tags: [],
      sourceRefs: [],
      lifecycle: "active"
    });
    const firstEvent = await research.createEvent({
      caseId: first.caseRecord.id,
      revisionId: firstRevision.id,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "第一版事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    const secondEvent = await research.createEvent({
      caseId: first.caseRecord.id,
      revisionId: latestRevision.id,
      transitNodeRef: null,
      datePrecision: "unknown",
      startDate: null,
      endDate: null,
      title: "第二版事件",
      tags: [],
      sourceRefs: [],
      feedback: "unreviewed",
      body: ""
    });
    const source = "# 第一章\n第一版正文\n第二版正文";
    const knowledgeDocument = await knowledge.createDocument({
      title: "单盘导出来源",
      author: "用户",
      edition: "本地版",
      sourceNote: "",
      fileName: "single-chart.md",
      format: "markdown",
      content: source,
      byteSize: new TextEncoder().encode(source).byteLength
    });
    const firstCitation = await knowledge.createCitation({
      documentId: knowledgeDocument.id,
      locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
      annotation: "第一版字段证据",
      targets: [{
        kind: "chart_field",
        caseId: first.caseRecord.id,
        revisionId: firstRevision.id,
        field: "pillars.day.ganZhi"
      }]
    });
    const secondCitation = await knowledge.createCitation({
      documentId: knowledgeDocument.id,
      locator: { sectionId: "section-1", startLine: 3, endLine: 3 },
      annotation: "第二版字段证据",
      targets: [{
        kind: "chart_field",
        caseId: first.caseRecord.id,
        revisionId: latestRevision.id,
        field: "pillars.day.ganZhi"
      }]
    });

    const snapshot = await repository.readSingleChartExportSnapshot(first.caseRecord.id, firstRevision.id);

    expect(snapshot.revision.id).toBe(firstRevision.id);
    expect(snapshot.revision.id).not.toBe(snapshot.caseRecord.latestRevisionId);
    expect(new Set(snapshot.researchNotes.map((record) => record.id))).toEqual(new Set([caseNote.id, firstNote.id]));
    expect(snapshot.researchNotes.map((record) => record.id)).not.toContain(secondNote.id);
    expect(snapshot.events.map((record) => record.id)).toEqual([firstEvent.id]);
    expect(snapshot.events.map((record) => record.id)).not.toContain(secondEvent.id);
    expect(snapshot.citations.map((record) => record.id)).toEqual([firstCitation.id]);
    expect(snapshot.citations.map((record) => record.id)).not.toContain(secondCitation.id);
    expect(snapshot.knowledgeDocuments.map((record) => record.id)).toEqual([knowledgeDocument.id]);
    expect(snapshot.sourceRights).toHaveLength(1);
  });

  it("单盘导出快照在来源权利哈希被篡改时失败关闭", async () => {
    const repository = createRepository();
    const knowledge = new KnowledgeRepository(repository.database, () => "2026-08-01T00:00:00.000Z");
    const bundle = await repository.createCase({
      alias: "权利篡改",
      calculated: await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE)
    });
    const revision = bundle.revisions[0];
    const source = "# 第一章\n可信正文";
    const knowledgeDocument = await knowledge.createDocument({
      title: "权利来源",
      author: "用户",
      edition: "本地版",
      sourceNote: "",
      fileName: "rights.md",
      format: "markdown",
      content: source,
      byteSize: new TextEncoder().encode(source).byteLength
    });
    await knowledge.createCitation({
      documentId: knowledgeDocument.id,
      locator: { sectionId: "section-1", startLine: 2, endLine: 2 },
      annotation: "字段证据",
      targets: [{
        kind: "chart_field",
        caseId: bundle.caseRecord.id,
        revisionId: revision.id,
        field: "pillars.day.ganZhi"
      }]
    });
    const rights = await repository.database.sourceRights.get(knowledgeDocument.id);
    if (!rights) throw new Error("测试权利记录不存在");
    await repository.database.sourceRights.put({ ...rights, documentContentHash: "0".repeat(64) });

    await expect(repository.readSingleChartExportSnapshot(bundle.caseRecord.id, revision.id))
      .rejects.toMatchObject({ code: "SOURCE_RIGHTS_CONFLICT" });
  });

  it("修订写入失败时事务回滚，不留下半条案例", async () => {
    const repository = createRepository();
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    vi.spyOn(repository.database.revisions, "add").mockRejectedValueOnce(new Error("模拟写入失败"));
    await expect(repository.createCase({ alias: "应回滚", calculated })).rejects.toThrow("模拟写入失败");
    expect(await repository.database.cases.count()).toBe(0);
    expect(await repository.database.revisions.count()).toBe(0);
  });

  it("并发 reject 写入以同一派生指纹表原子串行化，只允许一条提交", async () => {
    const repository = createRepository();
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    const results = await Promise.allSettled([
      repository.createCase({ alias: "并发甲", calculated, duplicateGuard: "reject" }),
      repository.createCase({ alias: "并发乙", calculated, duplicateGuard: "reject" })
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") expect(rejected.reason).toBeInstanceOf(DuplicateBirthFingerprintError);
    expect(await repository.database.cases.count()).toBe(1);
    expect(await repository.database.revisions.count()).toBe(1);
    expect(await repository.database.birthFingerprints.count()).toBe(1);
  });

  it("显式 allow 仍可保存研究副本，并为每个 Revision 保留独立索引归属", async () => {
    const repository = createRepository();
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);
    await repository.createCase({ alias: "副本甲", calculated, duplicateGuard: "allow" });
    await repository.createCase({ alias: "副本乙", calculated, duplicateGuard: "allow" });

    expect(await repository.database.cases.count()).toBe(2);
    expect(await repository.database.birthFingerprints.count()).toBe(2);
    expect(await repository.listBirthFingerprints()).toHaveLength(1);
  });

  it("两个浏览器连接共享原子 reject 门，而后提交的显式 allow 仍保留副本语义", async () => {
    const databaseName = `hakimi-cross-connection-${crypto.randomUUID()}`;
    const firstDatabase = new ResearchDatabase(databaseName);
    const secondDatabase = new ResearchDatabase(databaseName);
    databases.push(firstDatabase, secondDatabase);
    const first = new CaseRepository(firstDatabase);
    const second = new CaseRepository(secondDatabase);
    const calculated = await calculateChart(input, WORKING_DEFAULT_RULE_PROFILE);

    const competingRejects = await Promise.allSettled([
      first.createCase({ alias: "连接甲", calculated, duplicateGuard: "reject" }),
      second.createCase({ alias: "连接乙", calculated, duplicateGuard: "reject" })
    ]);
    expect(competingRejects.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await firstDatabase.cases.count()).toBe(1);

    await first.clearAll();
    await first.createCase({ alias: "先拒重写入", calculated, duplicateGuard: "reject" });
    await second.createCase({ alias: "后续显式副本", calculated, duplicateGuard: "allow" });
    expect(await firstDatabase.cases.count()).toBe(2);
    expect(await firstDatabase.birthFingerprints.count()).toBe(2);
  });

  it("clearAll removes the ninth source-rights partition together with its document", async () => {
    const repository = createRepository();
    const knowledge = new KnowledgeRepository(repository.database);
    const content = "# Local source\nPrivate import";
    await knowledge.createDocument({
      title: "Local source",
      author: "",
      edition: "",
      sourceNote: "",
      fileName: "local.md",
      format: "markdown",
      content,
      byteSize: new TextEncoder().encode(content).byteLength
    });
    expect(await repository.database.sourceRights.count()).toBe(1);

    await repository.clearAll();

    expect(await repository.database.knowledgeDocuments.count()).toBe(0);
    expect(await repository.database.sourceRights.count()).toBe(0);
  });
});
