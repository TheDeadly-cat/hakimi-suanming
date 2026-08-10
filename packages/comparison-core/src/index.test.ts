import { describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import {
  buildCalculatedChartHashPayload,
  formalComparisonProjectionSchema,
  formalComparisonSourceSchema,
  revisionRecordSchema,
  type BirthInput,
  type FormalComparisonRequest,
  type FormalComparisonSlotId,
  type FormalComparisonSource,
  type RulePackBinding,
  type RevisionRecord
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE, withDayBoundary } from "@hakimi/rule-profiles";
import {
  buildFormalComparisonHashPayload,
  buildComparisonMatrix,
  comparisonItemsFromFormalSources,
  FormalComparisonIntegrityError,
  projectFormalComparison,
  verifyFormalComparisonProjectionIntegrity
} from "./index";

const BASE_INPUT: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "23:30",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "", latitude: null, longitude: null, precision: "unknown" },
  sourceNote: ""
};

async function source(
  slotId: FormalComparisonSlotId,
  alias: string,
  input: BirthInput = BASE_INPUT,
  boundary: "zi_start_23" | "midnight" = "zi_start_23",
  rulePackBinding?: RulePackBinding
): Promise<FormalComparisonSource> {
  const chart = await calculateChart(
    input,
    withDayBoundary(boundary),
    rulePackBinding ? { rulePackBinding } : undefined
  );
  const caseId = crypto.randomUUID();
  const revision = revisionRecordSchema.parse({
    schemaVersion: "1.0.0",
    id: crypto.randomUUID(),
    caseId,
    revisionNumber: 1,
    createdAt: chart.manifest.calculatedAt,
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    ...(chart.rulePackBinding ? { rulePackBinding: chart.rulePackBinding } : {}),
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  });
  return formalComparisonSourceSchema.parse({
    schemaVersion: "1.0.0",
    slotId,
    caseRecord: { id: caseId, alias },
    revision,
    revisionSnapshotDigest: await sha256Hex(revision)
  });
}

async function installedRulePackBinding(
  boundary: "zi_start_23" | "midnight" = "zi_start_23"
): Promise<RulePackBinding> {
  const profile = withDayBoundary(boundary);
  return {
    kind: "installed_rule_pack",
    packId: "comparison-test-pack",
    packDigest: "1".repeat(64),
    profileId: profile.profileId,
    profileVersion: profile.profileVersion,
    profileDigest: await sha256Hex(profile),
    useMode: "exact"
  };
}

function request(sources: readonly FormalComparisonSource[], withTransit = true): FormalComparisonRequest {
  return {
    schemaVersion: "1.0.0",
    baselineSlotId: "A",
    slots: sources.map((item) => ({
      slotId: item.slotId,
      caseId: item.caseRecord.id,
      revisionId: item.revision.id,
      manualDirection: null
    })),
    transit: withTransit
      ? { mode: "same_instant", atInstant: "2024-02-04T08:27:07.000Z" }
      : { mode: "none" }
  };
}

describe("formal revision comparison projection", () => {
  it.each([2, 3, 4])("投影 %s 个稳定修订且字段顺序一致", async (count) => {
    const slots = ["A", "B", "C", "D"] as const;
    const sources = await Promise.all(Array.from({ length: count }, (_, index) => source(
      slots[index],
      `案例 ${slots[index]}`,
      { ...BASE_INPUT, time: `${String(20 + index).padStart(2, "0")}:30` }
    )));
    const projection = await projectFormalComparison(request(sources, false), sources);

    expect(projection.matrix.items).toHaveLength(count);
    expect(projection.matrix.rowCount).toBeGreaterThan(60);
    expect(projection.matrix.sections.flatMap((section) => section.rows).map((row) => row.id))
      .toEqual([...new Set(projection.matrix.sections.flatMap((section) => section.rows).map((row) => row.id))]);
    expect(projection.manifest.interpretationIncluded).toBe(false);
    expect(projection.manifest.scoreIncluded).toBe(false);
  });

  it("同一输入不同换日规则会显示规则差异，即使不能据此声称因果", async () => {
    const sources = await Promise.all([
      source("A", "子初基准", BASE_INPUT, "zi_start_23"),
      source("B", "午夜对照", BASE_INPUT, "midnight")
    ]);
    const projection = await projectFormalComparison(request(sources, false), sources);
    const dayBoundary = projection.matrix.sections.flatMap((section) => section.rows)
      .find((row) => row.id === "rule.day_boundary");

    expect(projection.matrix.sameBirthInput).toBe(true);
    expect(dayBoundary).toMatchObject({ status: "changed", different: true });
    expect(dayBoundary?.values).toEqual(["zi_start_23", "midnight"]);
    expect(projection.matrix.changedCategories).toContain("rule");
  });

  it("把 RuleProfile 与精确规则包 provenance 分列，未绑定修订明确标成内置快照", async () => {
    const binding = await installedRulePackBinding();
    const sources = await Promise.all([
      source("A", "规则包绑定盘", BASE_INPUT, "zi_start_23", binding),
      source("B", "内置规则盘")
    ]);
    const projection = await projectFormalComparison(request(sources, false), sources);
    const rows = new Map(projection.matrix.sections.flatMap((section) => section.rows).map((row) => [row.id, row]));

    expect(rows.get("rule.profile")?.label).toBe("RuleProfile 配置快照");
    expect(rows.get("rule.digest")?.label).toBe("RuleProfile 摘要");
    expect(rows.get("rule.pack_source")?.values).toEqual(["installed_rule_pack", "内置 / 未绑定规则快照"]);
    expect(rows.get("rule.pack_id")?.values).toEqual([binding.packId, "内置 / 未绑定规则快照"]);
    expect(rows.get("rule.pack_digest")?.values).toEqual([binding.packDigest, "内置 / 未绑定规则快照"]);
    expect(rows.get("rule.pack_profile_id")?.values).toEqual([binding.profileId, "内置 / 未绑定规则快照"]);
    expect(rows.get("rule.pack_profile_version")?.values).toEqual([binding.profileVersion, "内置 / 未绑定规则快照"]);
    expect(rows.get("rule.pack_profile_digest")?.values).toEqual([binding.profileDigest, "内置 / 未绑定规则快照"]);
    expect(rows.get("rule.pack_use_mode")?.values).toEqual([binding.useMode, "内置 / 未绑定规则快照"]);
    expect(rows.get("rule.pack_id")?.cells[1]).toMatchObject({
      availability: "not_applicable",
      status: "not_applicable"
    });
    expect(projection.matrix.changedCategories).toContain("rule");
    await expect(verifyFormalComparisonProjectionIntegrity(projection)).resolves.toEqual(projection);
  });

  it("缺失、未提供和改变不会被误标为相同", async () => {
    const sources = await Promise.all([
      source("A", "现代修订"),
      source("B", "旧修订")
    ]);
    const legacy = structuredClone(sources[1]);
    delete legacy.revision.luckCycleRuleSnapshot;
    delete legacy.revision.manifest.luckCycleRuleDigest;
    legacy.revision.manifest.resultHash = await sha256Hex(buildCalculatedChartHashPayload({
      input: legacy.revision.input,
      timeCalibration: legacy.revision.timeCalibration,
      ruleProfile: legacy.revision.ruleProfile,
      facts: legacy.revision.facts,
      manifest: legacy.revision.manifest
    }));
    legacy.revisionSnapshotDigest = await sha256Hex(legacy.revision);
    const items = await comparisonItemsFromFormalSources(request([sources[0], legacy], false), [sources[0], legacy]);
    const matrix = buildComparisonMatrix(items);
    const luckRule = matrix.sections.flatMap((section) => section.rows).find((row) => row.id === "rule.luck_cycle");
    const solar = matrix.sections.flatMap((section) => section.rows).find((row) => row.id === "calibration.solar");

    expect(luckRule?.status).toBe("mixed");
    expect(luckRule?.cells[1].status).toBe("missing");
    expect(solar?.status).toBe("not_applicable");
    expect(solar?.different).toBe(false);
  });

  it("把同一 UTC 瞬时点广播到全部修订并隔离每列状态", async () => {
    const sources = await Promise.all([
      source("A", "上海盘"),
      source("B", "东京盘", { ...BASE_INPUT, timeZone: "Asia/Tokyo" })
    ]);
    const projection = await projectFormalComparison(request(sources), sources);
    const resolved = projection.transits.filter((result) => result.status === "resolved");

    expect(resolved).toHaveLength(2);
    expect(resolved.map((result) => result.status === "resolved" ? result.snapshot.target.instant : null))
      .toEqual(["2024-02-04T08:27:07.000Z", "2024-02-04T08:27:07.000Z"]);
    expect(resolved.map((result) => result.status === "resolved" ? result.snapshot.target.revisionWallDateTime : null)[0])
      .not.toBe(resolved.map((result) => result.status === "resolved" ? result.snapshot.target.revisionWallDateTime : null)[1]);
  });

  it("即使攻击者重签完整修订摘要，也拒绝旧 resultHash 对应的篡改事实", async () => {
    const sources = await Promise.all([source("A", "可信 A"), source("B", "被篡改 B")]);
    const tampered = structuredClone(sources[1]);
    tampered.revision.facts.pillars.day.stem = "甲";
    tampered.revision.facts.pillars.day.ganZhi = `甲${tampered.revision.facts.pillars.day.branch}`;
    tampered.revisionSnapshotDigest = await sha256Hex(tampered.revision);

    await expect(projectFormalComparison(request([sources[0], tampered], false), [sources[0], tampered]))
      .rejects.toThrow(/摘要|完整性/);
  });

  it("输出先经严格运行时 Schema，并把任意带偏移目标规范化为 UTC", async () => {
    const sources = await Promise.all([source("A", "规范 A"), source("B", "规范 B")]);
    const rawRequest = request(sources);
    rawRequest.transit = { mode: "same_instant", atInstant: "2024-02-04T16:27:07+08:00" };
    const projection = await projectFormalComparison(rawRequest, sources);

    expect(formalComparisonProjectionSchema.parse(projection)).toEqual(projection);
    expect(projection.manifest.hashSchemaVersion).toBe("formal-comparison-hash-v1");
    expect(projection.targetInstant).toBe("2024-02-04T08:27:07.000Z");
    expect(projection.transits.every((result) =>
      result.status === "resolved" && result.snapshot.target.instant === projection.targetInstant
    )).toBe(true);

    expect(() => formalComparisonProjectionSchema.parse({ ...projection, score: 88 })).toThrow();
    const wrongCount = structuredClone(projection);
    wrongCount.matrix.rowCount += 1;
    expect(() => formalComparisonProjectionSchema.parse(wrongCount)).toThrow(/rowCount/);
    const wrongCellStatus = structuredClone(projection);
    const changedRow = wrongCellStatus.matrix.sections.flatMap((section) => section.rows)
      .find((row) => row.cells.some((cell) => cell.status === "changed"));
    expect(changedRow).toBeDefined();
    changedRow!.cells.find((cell) => cell.status === "changed")!.status = "same";
    expect(() => formalComparisonProjectionSchema.parse(wrongCellStatus)).toThrow(/字段状态/);

    const deepUnknown = structuredClone(projection);
    (deepUnknown.matrix.items[0].revision.manifest as unknown as Record<string, unknown>).forged = true;
    expect(() => formalComparisonProjectionSchema.parse(deepUnknown)).toThrow(/未知字段|静默规范化/);
    await expect(verifyFormalComparisonProjectionIntegrity(deepUnknown)).rejects.toThrow(/未知字段|静默规范化/);

    const sourceUnknown = structuredClone(sources);
    (sourceUnknown[0].revision.manifest as unknown as Record<string, unknown>).forged = true;
    await expect(projectFormalComparison(rawRequest, sourceUnknown)).rejects.toThrow(/未知字段|静默规范化/);
  });

  it("完整性验证会重建字段矩阵、完整运限快照和最外层摘要", async () => {
    const sources = await Promise.all([
      source("A", "验真 A", BASE_INPUT, "zi_start_23"),
      source("B", "验真 B", BASE_INPUT, "midnight")
    ]);
    const projection = await projectFormalComparison(request(sources), sources);
    await expect(verifyFormalComparisonProjectionIntegrity(projection)).resolves.toEqual(projection);

    const tamperedMatrix = structuredClone(projection);
    const dayBoundary = tamperedMatrix.matrix.sections.flatMap((section) => section.rows)
      .find((row) => row.id === "rule.day_boundary")!;
    dayBoundary.values[1] = "伪造换日";
    dayBoundary.cells[1].value = "伪造换日";
    tamperedMatrix.manifest.resultHash = await sha256Hex(buildFormalComparisonHashPayload(tamperedMatrix));
    expect(() => formalComparisonProjectionSchema.parse(tamperedMatrix)).not.toThrow();
    await expect(verifyFormalComparisonProjectionIntegrity(tamperedMatrix))
      .rejects.toMatchObject({ mismatch: "result" } satisfies Partial<FormalComparisonIntegrityError>);

    const tamperedTransit = structuredClone(projection);
    const resolvedTransit = tamperedTransit.transits.find((result) => result.status === "resolved")!;
    if (resolvedTransit.status === "resolved") resolvedTransit.snapshot.warnings.push("重签外层仍不能伪造运限内容");
    tamperedTransit.manifest.resultHash = await sha256Hex(buildFormalComparisonHashPayload(tamperedTransit));
    expect(() => formalComparisonProjectionSchema.parse(tamperedTransit)).not.toThrow();
    await expect(verifyFormalComparisonProjectionIntegrity(tamperedTransit))
      .rejects.toMatchObject({ mismatch: "transit" } satisfies Partial<FormalComparisonIntegrityError>);

    const tamperedRevision = structuredClone(projection);
    const item = tamperedRevision.matrix.items[1];
    item.revision.facts.pillars.day.stem = "甲";
    item.revision.facts.pillars.day.ganZhi = `甲${item.revision.facts.pillars.day.branch}`;
    item.revisionSnapshotDigest = await sha256Hex(item.revision);
    tamperedRevision.manifest.resultHash = await sha256Hex(buildFormalComparisonHashPayload(tamperedRevision));
    await expect(verifyFormalComparisonProjectionIntegrity(tamperedRevision))
      .rejects.toMatchObject({ mismatch: "revision", itemKey: item.key } satisfies Partial<FormalComparisonIntegrityError>);
  });

  it("可回放真实运限错误，并拒绝重签外层后的错误码或消息篡改", async () => {
    const sources = await Promise.all([source("A", "正常 A"), source("B", "人工方向冲突 B")]);
    const errorRequest = request(sources);
    errorRequest.slots[1].manualDirection = "forward";
    const projection = await projectFormalComparison(errorRequest, sources);

    expect(projection.transits[1]).toMatchObject({
      itemKey: sources[1].revision.id,
      status: "error",
      code: "MANUAL_DIRECTION_NOT_ALLOWED"
    });
    await expect(verifyFormalComparisonProjectionIntegrity(projection)).resolves.toEqual(projection);

    const tampered = structuredClone(projection);
    const errorResult = tampered.transits[1];
    if (errorResult.status !== "error") throw new Error("测试前置条件：第二列必须产生运限错误。");
    errorResult.message = "伪造但已重签外层的错误消息";
    tampered.manifest.resultHash = await sha256Hex(buildFormalComparisonHashPayload(tampered));
    expect(() => formalComparisonProjectionSchema.parse(tampered)).not.toThrow();
    await expect(verifyFormalComparisonProjectionIntegrity(tampered))
      .rejects.toMatchObject({ mismatch: "transit", itemKey: sources[1].revision.id } satisfies Partial<FormalComparisonIntegrityError>);
  });
});
