import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { calculateChart, digestRuleProfile } from "@hakimi/bazi-core";
import {
  PAIR_STRUCTURE_RESEARCH_POLICY,
  PairStructureResearchIntegrityError,
  projectPairStructureResearch
} from "@hakimi/comparison-core";
import {
  formalComparisonSourceSchema,
  revisionRecordSchema,
  type BirthInput,
  type FormalComparisonSource,
  type PairStructureResearchProjection,
  type PairStructureResearchRequest
} from "@hakimi/contracts";
import { sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  FULL_AUDIT_PRIVACY_WARNING,
  PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS,
  PAIR_STRUCTURE_ANONYMOUS_REDACTIONS,
  PAIR_STRUCTURE_FACTS_ONLY_NOTICE,
  PAIR_STRUCTURE_REPORT_FORMAT_VERSION,
  PAIR_STRUCTURE_SOURCE_OBSERVATION_COUNT,
  PAIR_REIDENTIFICATION_WARNING,
  REIDENTIFICATION_WARNING,
  buildPairStructureAnonymousResearchReport,
  exportPairStructureAnonymousMarkdown,
  exportPairStructureFullAuditJson,
  renderPairStructureAnonymousMarkdown,
  verifyPairStructureFullAuditEnvelope
} from "./index";

const TARGET_INSTANT = "2026-08-02T09:15:00.000Z";
const CASE_IDS = [
  "10111111-1111-4111-8111-111111111111",
  "20222222-2222-4222-8222-222222222222"
] as const;
const REVISION_IDS = [
  "a0111111-1111-4111-8111-111111111111",
  "b0222222-2222-4222-8222-222222222222"
] as const;
const ALIASES = ["匿名门禁甲-ALIAS-SENTINEL", "匿名门禁乙-ALIAS-SENTINEL"] as const;
const LOCATIONS = ["甲地点-LOCATION-SENTINEL", "乙地点-LOCATION-SENTINEL"] as const;
const SOURCE_NOTES = ["甲来源-SOURCE-NOTE-SENTINEL", "乙来源-SOURCE-NOTE-SENTINEL"] as const;
const RULE_PACK_IDS = ["pair-test-pack-a", "pair-test-pack-b"] as const;
const RULE_PACK_DIGESTS = ["a".repeat(64), "b".repeat(64)] as const;

const INPUTS: readonly BirthInput[] = [
  {
    schemaVersion: "1.0.0",
    calendarType: "gregorian",
    date: "1995-08-18",
    time: "23:30",
    timePrecision: "exact_minute",
    timeZone: "Asia/Shanghai",
    sex: "male",
    lunarLeapMonth: false,
    location: { label: LOCATIONS[0], latitude: 31.2304, longitude: 121.4737, precision: "coordinates" },
    sourceNote: SOURCE_NOTES[0]
  },
  {
    schemaVersion: "1.0.0",
    calendarType: "gregorian",
    date: "1996-03-09",
    time: "09:26",
    timePrecision: "exact_minute",
    timeZone: "Asia/Tokyo",
    sex: "female",
    lunarLeapMonth: false,
    location: { label: LOCATIONS[1], latitude: 35.6762, longitude: 139.6503, precision: "coordinates" },
    sourceNote: SOURCE_NOTES[1]
  }
];

async function source(index: 0 | 1): Promise<FormalComparisonSource> {
  const rulePackBinding = {
    kind: "installed_rule_pack" as const,
    packDigest: RULE_PACK_DIGESTS[index],
    profileDigest: await digestRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
    packId: RULE_PACK_IDS[index],
    profileId: WORKING_DEFAULT_RULE_PROFILE.profileId,
    profileVersion: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
    useMode: "exact" as const
  };
  const chart = await calculateChart(INPUTS[index], WORKING_DEFAULT_RULE_PROFILE, { rulePackBinding });
  const revision = revisionRecordSchema.parse({
    schemaVersion: "1.0.0",
    id: REVISION_IDS[index],
    caseId: CASE_IDS[index],
    revisionNumber: 1,
    createdAt: chart.manifest.calculatedAt,
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    rulePackBinding,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  });
  return formalComparisonSourceSchema.parse({
    schemaVersion: "1.0.0",
    slotId: index === 0 ? "A" : "B",
    caseRecord: { id: CASE_IDS[index], alias: ALIASES[index] },
    revision,
    revisionSnapshotDigest: await sha256Hex(revision)
  });
}

function request(): PairStructureResearchRequest {
  return {
    schemaVersion: "1.0.0",
    kind: "pair_structure_research",
    policy: PAIR_STRUCTURE_RESEARCH_POLICY,
    subjects: [
      { slotId: "A", caseId: CASE_IDS[0], revisionId: REVISION_IDS[0], manualDirection: null },
      { slotId: "B", caseId: CASE_IDS[1], revisionId: REVISION_IDS[1], manualDirection: null }
    ],
    atInstant: TARGET_INSTANT
  };
}

let projection: PairStructureResearchProjection;

beforeAll(async () => {
  projection = await projectPairStructureResearch(request(), await Promise.all([source(0), source(1)]));
});

describe("pair structure research export", () => {
  it("冻结匿名报告 v1 的 76 项系统事实白名单与移除项", () => {
    const contract = JSON.parse(readFileSync(resolve(
      process.cwd(),
      "packages/research-export/src/golden/pair-structure-report.contract.v1.json"
    ), "utf8"));

    expect(PAIR_STRUCTURE_REPORT_FORMAT_VERSION).toBe(contract.formatVersion);
    expect(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS).toEqual(contract.anonymousObservationIds);
    expect(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS).toHaveLength(contract.anonymousObservationCountPerParticipant);
    expect(PAIR_STRUCTURE_ANONYMOUS_REDACTIONS).toEqual(contract.redactions);
    expect(PAIR_STRUCTURE_SOURCE_OBSERVATION_COUNT).toBe(contract.sourceObservationCountPerParticipant);
    expect(new Set(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS).size).toBe(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS.length);
    for (const denied of [
      "input.location",
      "input.source_note",
      "input.complete_snapshot",
      "calibration.solar",
      "calibration.complete_snapshot",
      "rule.profile",
      "rule.luck_cycle",
      "rule.digest",
      "rule.luck_digest",
      "rule.complete_snapshot",
      "calendar.complete_snapshot",
      "evidence.revision_snapshot",
      "evidence.result_hash"
    ]) expect(PAIR_STRUCTURE_ANONYMOUS_OBSERVATION_IDS).not.toContain(denied);
  });

  it("匿名模型仅保留 A/B、R号、白名单事实与去引用六层节点", async () => {
    const report = await buildPairStructureAnonymousResearchReport(projection);
    const serialized = JSON.stringify(report);

    expect(report.participants.map((participant) => [
      participant.role,
      participant.revisionLabel,
      participant.observationCount,
      participant.transit.status === "resolved" ? participant.transit.slots.length : 0
    ])).toEqual([["A", "R1", 76, 6], ["B", "R1", 76, 6]]);
    expect(report.targetInstant).toBe(TARGET_INSTANT);
    expect(report.sourceIntegrityVerified).toBe(true);
    expect(report.auditLinkIncluded).toBe(false);
    expect(report.privacyWarning).toBe(REIDENTIFICATION_WARNING);
    expect(report.pairPrivacyWarning).toBe(PAIR_REIDENTIFICATION_WARNING);
    expect(report.scopeNotice).toBe(PAIR_STRUCTURE_FACTS_ONLY_NOTICE);
    expect(report.policy).toEqual(PAIR_STRUCTURE_RESEARCH_POLICY);

    for (const retained of ["1995-08-18", "23:30", "Asia/Shanghai", "1996-03-09", "09:26", "Asia/Tokyo"]) {
      expect(serialized).toContain(retained);
    }
    for (const sensitive of [
      ...CASE_IDS,
      ...REVISION_IDS,
      ...ALIASES,
      ...LOCATIONS,
      ...SOURCE_NOTES,
      ...RULE_PACK_IDS,
      ...RULE_PACK_DIGESTS,
      "31.2304",
      "121.4737",
      "35.6762",
      "139.6503",
      projection.participants[0].item.revisionSnapshotDigest,
      projection.participants[1].item.revisionSnapshotDigest,
      projection.participants[0].item.revision.manifest.resultHash,
      projection.participants[1].item.revision.manifest.resultHash,
      projection.participants[0].item.revision.ruleProfile.label,
      projection.participants[0].item.revision.ruleProfile.notice
    ]) expect(serialized).not.toContain(sensitive);
    expect(serialized).not.toContain("nodeId");
    expect(serialized).not.toContain("caseAlias");
    expect(serialized).not.toContain("revisionId");
    expect(serialized).not.toContain("resultHash");
    expect(serialized).not.toContain("differenceCount");
  });

  it("匿名 Markdown 字节稳定、双方分段且不能替代完整审计包", async () => {
    const report = await buildPairStructureAnonymousResearchReport(projection);
    const first = renderPairStructureAnonymousMarkdown(report);
    const second = await exportPairStructureAnonymousMarkdown(projection);

    expect(second).toEqual(first);
    expect(first.suggestedFileName).toBe("hakimi-pair-a-r1-b-r1-at-20260802t091500z-anonymous.md");
    expect(first.content).toContain("# 双案例结构研究匿名报告");
    expect(first.content).toContain("## 对象甲 · R1");
    expect(first.content).toContain("## 对象乙 · R1");
    expect(first.content).toContain(TARGET_INSTANT);
    expect(first.content).toContain("匿名报告不能替代完整审计 JSON");
    expect(first.content).toContain(REIDENTIFICATION_WARNING);
    expect(first.content).toContain(PAIR_REIDENTIFICATION_WARNING);
    for (const sensitive of [...CASE_IDS, ...REVISION_IDS, ...ALIASES, ...LOCATIONS, ...SOURCE_NOTES]) {
      expect(first.content).not.toContain(sensitive);
    }
  });

  it("完整审计 JSON 是验签后的原始事实工件并显式标记敏感", async () => {
    const document = await exportPairStructureFullAuditJson(projection, { acknowledgedSensitiveData: true });
    const envelope = JSON.parse(document.content);

    expect(document.suggestedFileName).toBe(
      `hakimi-pair-a-r1-b-r1-${projection.manifest.resultHash.slice(0, 12)}-full-audit.json`
    );
    expect(document.sensitiveDataIncluded).toBe(true);
    expect(document.warnings).toEqual([FULL_AUDIT_PRIVACY_WARNING, PAIR_STRUCTURE_FACTS_ONLY_NOTICE]);
    expect(envelope.kind).toBe("pair_structure_full_audit_envelope");
    expect(envelope.privacy).toBe("full_sensitive");
    expect(envelope.privacyWarning).toBe(FULL_AUDIT_PRIVACY_WARNING);
    expect(envelope.projectionResultHash).toBe(projection.manifest.resultHash);
    expect(envelope.projection).toEqual(projection);
    await expect(verifyPairStructureFullAuditEnvelope(envelope)).resolves.toEqual(envelope);
    for (const [index, participant] of envelope.projection.participants.entries()) {
      const byId = new Map(participant.observations.map((observation: { id: string; value: string }) => [
        observation.id,
        observation.value
      ]));
      expect(byId.get("rule.pack_source")).toBe("installed_rule_pack");
      expect(byId.get("rule.pack_id")).toBe(RULE_PACK_IDS[index]);
      expect(byId.get("rule.pack_digest")).toBe(RULE_PACK_DIGESTS[index]);
      expect(byId.get("rule.pack_profile_id")).toBe(WORKING_DEFAULT_RULE_PROFILE.profileId);
      expect(byId.get("rule.pack_profile_version")).toBe(WORKING_DEFAULT_RULE_PROFILE.profileVersion);
      expect(byId.get("rule.pack_profile_digest")).toBe(participant.item.revision.manifest.ruleProfileDigest);
      expect(byId.get("rule.pack_use_mode")).toBe("exact");
    }
    expect(document.content.endsWith("\n")).toBe(true);
    for (const sensitive of [...CASE_IDS, ...REVISION_IDS, ...ALIASES, ...LOCATIONS, ...SOURCE_NOTES]) {
      expect(document.content).toContain(sensitive);
    }
  });

  it("匿名与完整导出都会拒绝内层事实篡改，完整 JSON 不绕过完整性门", async () => {
    const tampered = structuredClone(projection);
    tampered.participants[0].observations[0].value = "伪造事实";

    await expect(exportPairStructureAnonymousMarkdown(tampered))
      .rejects.toBeInstanceOf(PairStructureResearchIntegrityError);
    await expect(exportPairStructureFullAuditJson(tampered, { acknowledgedSensitiveData: true }))
      .rejects.toBeInstanceOf(PairStructureResearchIntegrityError);
  });

  it("完整审计 API 本身也要求显式敏感确认", async () => {
    await expect(exportPairStructureFullAuditJson(projection, undefined as never)).rejects.toThrow();
    await expect(exportPairStructureFullAuditJson(
      projection,
      { acknowledgedSensitiveData: false } as never
    )).rejects.toThrow();
  });

  it("完整审计信封拒绝摘要改写和内层投影篡改", async () => {
    const document = await exportPairStructureFullAuditJson(projection, { acknowledgedSensitiveData: true });
    const envelope = JSON.parse(document.content);
    await expect(verifyPairStructureFullAuditEnvelope({
      ...envelope,
      projectionResultHash: "0".repeat(64)
    })).rejects.toThrow(/绑定内层/);

    envelope.projection.participants[1].observations[0].value = "伪造事实";
    await expect(verifyPairStructureFullAuditEnvelope(envelope))
      .rejects.toBeInstanceOf(PairStructureResearchIntegrityError);
  });

  it("匿名渲染拒绝带未知字段的伪造报告", async () => {
    const report = await buildPairStructureAnonymousResearchReport(projection);
    await expect(() => renderPairStructureAnonymousMarkdown({ ...report, pairScore: 99 } as never)).toThrow();
  });
});
