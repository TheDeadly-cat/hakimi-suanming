import { describe, expect, it } from "vitest";
import {
  FULL_BACKUP_FORMAT,
  FULL_BACKUP_FORMAT_VERSION,
  FULL_BACKUP_SCOPE,
  FULL_BACKUP_DIGEST_ALGORITHM,
  CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
  LEGACY_CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
  LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
  EVENT_TIME_MIGRATION_RECEIPT_RECORD_VERSION,
  EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION,
  EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
  RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION,
  TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
  TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
  UNKNOWN_HOUR_PROBE_CANDIDATE_IDS,
  ACTIVE_RULE_PACK_RECORD_ID,
  EVENT_RECORD_VERSION,
  EVENT_TIME_FULL_BACKUP_FORMAT_VERSION,
  KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION,
  LOCAL_APP_SETTINGS_ID,
  LOCAL_APP_SETTINGS_RECORD_VERSION,
  LOCAL_ATTACHMENT_RECORD_VERSION,
  LOCAL_RESEARCHER_PROFILE_ID,
  LOCAL_RESEARCHER_PROFILE_RECORD_VERSION,
  LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION,
  MAX_LOCAL_ATTACHMENT_BYTES,
  PREVIOUS_FULL_BACKUP_FORMAT_VERSION,
  RESEARCH_QUERY_VERSION,
  RESEARCH_SUBJECT_RECORD_VERSION,
  SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION,
  SCHEMA_VERSION,
  SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION,
  birthInputSchema,
  candidateSetRecordSchema,
  candidateSetTzdbComparisonSchema,
  candidateSetTzdbProbeDiffSchema,
  caseRecordSchema,
  citationRecordSchema,
  citationTargetKeys,
  eventRecordSchema,
  eventTimeMigrationReceiptSchema,
  eventTimeFullBackupEnvelopeSchema,
  eventTimeMigrationFullBackupEnvelopeSchema,
  fullBackupEnvelopeSchema,
  isCandidateSetRecord,
  knowledgeDocumentRecordSchema,
  knowledgeFullBackupEnvelopeSchema,
  localAppSettingsRecordSchema,
  activeRulePackRecordSchema,
  installedRulePackRecordSchema,
  localAttachmentRecordSchema,
  localResearcherProfileRecordSchema,
  localUserDataFullBackupEnvelopeSchema,
  legacyCandidateSetRecordV1Schema,
  legacyCaseRecordV1Schema,
  legacyEventRecordV1Schema,
  legacySavedViewRecordV1Schema,
  migrateLegacyEventRecordV1,
  migrateLegacySavedViewRecordV1,
  normalizeResearchQueryText,
  previousFullBackupEnvelopeSchema,
  ruleRegistryFullBackupDigestsSchema,
  ruleRegistryFullBackupEnvelopeSchema,
  ruleRegistryFullBackupManifestSchema,
  ruleRegistryFullBackupPayloadSchema,
  sourceRightsFullBackupEnvelopeSchema,
  unknownHourCandidateResultSchema,
  unknownHourBirthInputSchema,
  researchNoteRecordSchema,
  researchQuerySchema,
  ruleProfileSchema,
  savedViewFullBackupDigestsSchema,
  savedViewFullBackupEnvelopeSchema,
  savedViewFullBackupManifestSchema,
  savedViewFullBackupPayloadSchema,
  savedViewRecordSchema,
  sourceRightsRecordSchema,
  tzdbMigrationReceiptSchema,
  tzdbMigrationFullBackupEnvelopeSchema,
  tzdbMigrationFullBackupManifestSchema,
  tzdbMigrationFullBackupDigestsSchema,
  tzdbMigrationFullBackupPayloadSchema,
  type ResearchSubjectRecord
} from "./index";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { BUNDLED_TIME_ZONE_DATABASE, BUNDLED_TZDB_SNAPSHOT_ID } from "@hakimi/tzdb-core";

const validBirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26",
  timePrecision: "exact_minute",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "北京", latitude: null, longitude: null, precision: "city" },
  sourceNote: ""
};

describe("birthInputSchema", () => {
  it("接受明确的公历分钟输入", () => {
    expect(birthInputSchema.parse(validBirthInput).date).toBe("1995-08-18");
  });

  it("按所选历法校验日期形状，并保留农历闰月标记", () => {
    const lunar = {
      ...validBirthInput,
      calendarType: "lunar",
      date: "2023-02-30",
      lunarLeapMonth: true
    };
    expect(birthInputSchema.parse(lunar)).toMatchObject({
      calendarType: "lunar",
      date: "2023-02-30",
      lunarLeapMonth: true
    });
    expect(birthInputSchema.safeParse({ ...lunar, date: "2023-02-31" }).success).toBe(false);
    expect(birthInputSchema.safeParse({ ...validBirthInput, date: "2024-02-30" }).success).toBe(false);
  });

  it("接受严格 HH:mm:ss 的秒级边界输入，并拒绝精度与文本不匹配", () => {
    const exactSecond = { ...validBirthInput, time: "16:27:07", timePrecision: "exact_second" };
    expect(birthInputSchema.parse(exactSecond).time).toBe("16:27:07");
    expect(birthInputSchema.safeParse({ ...exactSecond, time: "16:27" }).success).toBe(false);
    expect(birthInputSchema.safeParse({ ...validBirthInput, time: "16:27:07" }).success).toBe(false);
  });

  it.each(["2024-02-31", "1899-12-31", "2101-01-01"])("拒绝非法或越界日期 %s", (date) => {
    expect(birthInputSchema.safeParse({ ...validBirthInput, date }).success).toBe(false);
  });

  it("不会把未知时辰伪装成精确分钟", () => {
    const result = birthInputSchema.safeParse({ ...validBirthInput, time: null });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.join(".") === "time")).toBe(true);
  });

  it("未知时辰专用契约只接受 null 时间，主契约也拒绝合成时刻", () => {
    const unknown = { ...validBirthInput, time: null, timePrecision: "unknown_hour" };
    expect(unknownHourBirthInputSchema.safeParse(unknown).success).toBe(true);
    expect(unknownHourBirthInputSchema.safeParse({ ...unknown, time: "12:30" }).success).toBe(false);
    expect(birthInputSchema.safeParse({ ...unknown, time: "12:30" }).success).toBe(false);
  });

  it("拒绝不存在的 IANA 时区", () => {
    expect(birthInputSchema.safeParse({ ...validBirthInput, timeZone: "China/Nowhere" }).success).toBe(false);
  });
});

describe("ruleProfileSchema", () => {
  it("版本化规则快照可以往返", () => {
    const encoded = JSON.stringify(WORKING_DEFAULT_RULE_PROFILE);
    expect(ruleProfileSchema.parse(JSON.parse(encoded))).toEqual(WORKING_DEFAULT_RULE_PROFILE);
  });

  it("拒绝未知换日枚举", () => {
    const invalid = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      calendar: { ...WORKING_DEFAULT_RULE_PROFILE.calendar, dayBoundary: "guess_at_runtime" }
    };
    expect(ruleProfileSchema.safeParse(invalid).success).toBe(false);
  });

  it.each([
    ["zi_start_23", "civil_day"],
    ["midnight", "after_day_change"],
    ["split_zi", "after_day_change"]
  ] as const)("拒绝互相矛盾的换日与子时日干基准：%s / %s", (dayBoundary, ziHourDayStemBasis) => {
    const invalid = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      calendar: { ...WORKING_DEFAULT_RULE_PROFILE.calendar, dayBoundary, ziHourDayStemBasis }
    };
    const result = ruleProfileSchema.safeParse(invalid);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "calendar.ziHourDayStemBasis")).toBe(true);
    }
  });

  it("显式允许 split_zi 使用 civil_day 基准，计算支持状态由引擎另行判定", () => {
    const splitZi = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      calendar: {
        ...WORKING_DEFAULT_RULE_PROFILE.calendar,
        dayBoundary: "split_zi",
        ziHourDayStemBasis: "civil_day"
      }
    };

    expect(ruleProfileSchema.safeParse(splitZi).success).toBe(true);
  });

  it("拒绝倒置的强验证日期范围", () => {
    const invalid = {
      ...WORKING_DEFAULT_RULE_PROFILE,
      supportedRange: {
        ...WORKING_DEFAULT_RULE_PROFILE.supportedRange,
        stronglyVerifiedFrom: "2000-01-02",
        stronglyVerifiedTo: "2000-01-01"
      }
    };
    expect(ruleProfileSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("local rule registry contracts", () => {
  const digest = "a".repeat(64);
  const profileDigest = "b".repeat(64);
  const importedAt = "2026-08-02T00:00:00.000Z";

  it("binds an installed record id to its immutable pack digest", () => {
    const installed = {
      schemaVersion: SCHEMA_VERSION,
      recordVersion: 1,
      recordType: "installed_rule_pack",
      id: digest,
      packDigest: digest,
      profileDigest,
      packId: "research-pack",
      profileId: "research-profile",
      profileVersion: "1.0.0",
      canonicalJson: "{}",
      localTrust: "unverified_local_import",
      importedAt
    };
    expect(installedRulePackRecordSchema.safeParse(installed).success).toBe(true);
    expect(installedRulePackRecordSchema.safeParse({ ...installed, id: "c".repeat(64) }).success).toBe(false);
  });

  it("requires the activation timestamp to bind the local approval", () => {
    const active = {
      schemaVersion: SCHEMA_VERSION,
      recordVersion: 1,
      recordType: "active_rule_pack",
      id: ACTIVE_RULE_PACK_RECORD_ID,
      activeDigest: digest,
      activeProfileDigest: profileDigest,
      activatedAt: importedAt,
      approval: {
        status: "locally_approved_for_activation",
        acknowledgedAt: importedAt,
        acknowledgementVersion: "rule-pack-local-approval@1",
        appVersion: "0.2.0-p0",
        engineName: "hakimi-bazi-core",
        engineVersion: "0.1.0"
      }
    };
    expect(activeRulePackRecordSchema.safeParse(active).success).toBe(true);
    expect(activeRulePackRecordSchema.safeParse({
      ...active,
      approval: { ...active.approval, acknowledgedAt: "2026-08-02T00:00:01.000Z" }
    }).success).toBe(false);
  });
});

const eventFixture = {
  schemaVersion: SCHEMA_VERSION,
  recordVersion: EVENT_RECORD_VERSION,
  id: "10000000-0000-4000-8000-000000000001",
  caseId: "10000000-0000-4000-8000-000000000002",
  revisionId: null,
  transitNodeRef: null,
  datePrecision: "day" as const,
  startDate: "2024-02-29",
  endDate: null,
  title: "闰日事件",
  tags: ["校验"],
  sourceRefs: ["访谈记录"],
  feedback: "unreviewed" as const,
  bodyFormat: "markdown" as const,
  body: "正文",
  deletedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  timeContext: { kind: "calendar_date" as const }
};

function zonedMinuteContext(localDateTime: string, canonicalUtc: string) {
  const candidate = {
    choice: "unique" as const,
    instant: canonicalUtc,
    utcOffset: "+08:00",
    utcOffsetMinutes: 480,
    resolvedWallTime: `${localDateTime}:00`,
    zonedDateTime: `${localDateTime}:00+08:00[Asia/Shanghai]`,
    matchesInputWallTime: true as const
  };
  return {
    kind: "zoned_minute" as const,
    timeZone: "Asia/Shanghai",
    tzdbVersion: "browser-intl-unreported" as const,
    start: {
      localDateTime,
      resolution: {
        kind: "unique" as const,
        policy: "reject" as const,
        status: "resolved_unique" as const,
        requestedWallTime: `${localDateTime}:00`,
        candidates: [candidate],
        selectedCandidate: candidate
      },
      canonicalUtc
    },
    end: null
  };
}

describe("research data schemas", () => {
  it("接受闰年 02-29，拒绝非闰年 02-29 与不存在的 02-31", () => {
    expect(eventRecordSchema.safeParse(eventFixture).success).toBe(true);
    expect(eventRecordSchema.safeParse({ ...eventFixture, startDate: "2023-02-29" }).success).toBe(false);
    expect(eventRecordSchema.safeParse({ ...eventFixture, startDate: "2024-02-31" }).success).toBe(false);
  });

  it("minute 精度同样校验真实公历日期", () => {
    expect(eventRecordSchema.safeParse({
      ...eventFixture,
      datePrecision: "minute",
      startDate: "2024-02-29T23:59",
      timeContext: zonedMinuteContext("2024-02-29T23:59", "2024-02-29T15:59:00Z")
    }).success).toBe(true);
    expect(eventRecordSchema.safeParse({
      ...eventFixture,
      datePrecision: "minute",
      startDate: "2023-02-29T12:00",
      timeContext: zonedMinuteContext("2023-02-29T12:00", "2023-02-29T04:00:00Z")
    }).success).toBe(false);
    expect(eventRecordSchema.safeParse({
      ...eventFixture,
      datePrecision: "minute",
      startDate: "2024-02-31T12:00",
      timeContext: zonedMinuteContext("2024-02-31T12:00", "2024-02-29T04:00:00Z")
    }).success).toBe(false);
    expect(eventRecordSchema.safeParse({
      ...eventFixture,
      datePrecision: "minute",
      startDate: "2024-02-29T23:59",
      timeContext: { kind: "calendar_date" }
    }).success).toBe(false);
  });

  it("冻结旧 Event v1 并纯迁移为显式 legacy_floating", () => {
    const { recordVersion: _recordVersion, timeContext: _timeContext, ...legacy } = eventFixture;
    const before = structuredClone(legacy);

    expect(legacyEventRecordV1Schema.safeParse(legacy).success).toBe(true);
    expect(legacyEventRecordV1Schema.safeParse(eventFixture).success).toBe(false);
    expect(eventRecordSchema.safeParse(legacy).success).toBe(false);
    expect(migrateLegacyEventRecordV1(legacy)).toMatchObject({
      ...legacy,
      recordVersion: EVENT_RECORD_VERSION,
      timeContext: { kind: "legacy_floating" }
    });
    expect(legacy).toEqual(before);
  });

  it("冻结 SavedView v1 严格结构，当前 v2 不再接受旧任意 filters", () => {
    const note = {
      schemaVersion: SCHEMA_VERSION,
      id: "10000000-0000-4000-8000-000000000003",
      caseId: eventFixture.caseId,
      anchor: { kind: "case" },
      bodyFormat: "markdown",
      body: "正文",
      tags: [],
      sourceRefs: [],
      lifecycle: "active",
      editVersion: 1,
      createdAt: eventFixture.createdAt,
      updatedAt: eventFixture.updatedAt
    };
    const view = {
      schemaVersion: SCHEMA_VERSION,
      id: "10000000-0000-4000-8000-000000000004",
      name: "研究视图",
      query: "财运",
      filters: { tags: ["案例"], archived: false },
      sort: { field: "updatedAt", direction: "desc" },
      createdAt: eventFixture.createdAt,
      updatedAt: eventFixture.updatedAt
    };

    expect(researchNoteRecordSchema.safeParse({ ...note, unknown: true }).success).toBe(false);
    expect(eventRecordSchema.safeParse({ ...eventFixture, unknown: true }).success).toBe(false);
    expect(legacySavedViewRecordV1Schema.parse(view)).toEqual(view);
    expect(legacySavedViewRecordV1Schema.safeParse({ ...view, unknown: true }).success).toBe(false);
    expect(legacySavedViewRecordV1Schema.safeParse({ ...view, filters: { invalid: undefined } }).success).toBe(false);
    expect(legacySavedViewRecordV1Schema.safeParse({ ...view, filters: { invalid: Number.NaN } }).success).toBe(false);
    expect(savedViewRecordSchema.safeParse(view).success).toBe(false);
  });
});

describe("event time semantic derivation receipt contracts", () => {
  const caseId = "10000000-0000-4000-8000-000000000101";
  const revisionId = "10000000-0000-4000-8000-000000000102";
  const sourceSnapshot = {
    formatVersion: EVENT_TIME_MIGRATION_SNAPSHOT_FORMAT_VERSION,
    eventRecordVersion: EVENT_RECORD_VERSION,
    caseId,
    revisionId,
    transitNodeRef: null,
    datePrecision: "minute" as const,
    startDate: "2024-02-29T23:59",
    endDate: null,
    timeContext: { kind: "legacy_floating" as const }
  };
  const targetTimeContext = {
    ...zonedMinuteContext("2024-02-29T23:59", "2024-02-29T15:59:00Z"),
    tzdbVersion: BUNDLED_TZDB_SNAPSHOT_ID,
    timeZoneDatabase: BUNDLED_TIME_ZONE_DATABASE
  };
  const targetSnapshot = {
    ...sourceSnapshot,
    timeContext: targetTimeContext
  };
  const receipt = {
    schemaVersion: SCHEMA_VERSION,
    recordVersion: EVENT_TIME_MIGRATION_RECEIPT_RECORD_VERSION,
    id: "10000000-0000-4000-8000-000000000105",
    operation: "event_time_semantic_derivation",
    authorization: { kind: "explicit_local_user_confirmation" },
    source: {
      kind: "event",
      recordId: "10000000-0000-4000-8000-000000000103",
      snapshot: sourceSnapshot,
      snapshotDigest: "a".repeat(64)
    },
    target: {
      kind: "event",
      recordId: "10000000-0000-4000-8000-000000000104",
      snapshot: targetSnapshot,
      snapshotDigest: "b".repeat(64)
    },
    interpretation: {
      kind: "zoned_minute",
      timeZone: "Asia/Shanghai",
      startDisambiguation: "reject",
      endDisambiguation: null
    },
    createdAt: "2026-08-02T00:00:00.000Z"
  };

  it("accepts an explicit new-ID derivation bound to the current content-addressed tzdb", () => {
    expect(eventTimeMigrationReceiptSchema.safeParse(receipt).success).toBe(true);
  });

  it("accepts a non-minute derivation without inventing IANA, DST, or UTC semantics", () => {
    const calendarSource = {
      ...sourceSnapshot,
      datePrecision: "unknown" as const,
      startDate: null,
      endDate: null
    };
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      source: { ...receipt.source, snapshot: calendarSource },
      target: {
        ...receipt.target,
        snapshot: { ...calendarSource, timeContext: { kind: "calendar_date" as const } }
      },
      interpretation: { kind: "calendar_date" }
    }).success).toBe(true);
  });

  it("rejects same endpoints, non-legacy sources, legacy or unbound targets, and changed lineage", () => {
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      target: { ...receipt.target, recordId: receipt.source.recordId }
    }).success).toBe(false);
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      source: { ...receipt.source, snapshot: { ...sourceSnapshot, timeContext: targetTimeContext } }
    }).success).toBe(false);
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      target: { ...receipt.target, snapshot: { ...targetSnapshot, timeContext: { kind: "legacy_floating" } } }
    }).success).toBe(false);
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      target: {
        ...receipt.target,
        snapshot: {
          ...targetSnapshot,
          timeContext: zonedMinuteContext("2024-02-29T23:59", "2024-02-29T15:59:00Z")
        }
      }
    }).success).toBe(false);
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      target: { ...receipt.target, snapshot: { ...targetSnapshot, revisionId: null } }
    }).success).toBe(false);
  });

  it("rejects a target kind or concrete DST interpretation that does not match the source and target", () => {
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      interpretation: { ...receipt.interpretation, startDisambiguation: "earlier" }
    }).success).toBe(false);
    expect(eventTimeMigrationReceiptSchema.safeParse({
      ...receipt,
      target: {
        ...receipt.target,
        snapshot: { ...targetSnapshot, datePrecision: "day", startDate: "2024-02-29", timeContext: { kind: "calendar_date" } }
      }
    }).success).toBe(false);
    expect(eventTimeMigrationReceiptSchema.safeParse({ ...receipt, unknown: true }).success).toBe(false);
  });
});

describe("ResearchQuery v1 contract", () => {
  const caseQuery = {
    version: RESEARCH_QUERY_VERSION,
    scope: "cases" as const,
    text: "事业 调整",
    lifecycle: "active" as const,
    favorites: "any" as const,
    revisionScope: "latest" as const,
    caseTags: ["事业"],
    dayMasters: ["辛"],
    monthBranches: ["辰"],
    relationTypes: ["branch_six_clash"],
    ruleProfileDigests: ["a".repeat(64)],
    transit: {
      atInstant: "2026-08-01T12:00:00.000Z",
      manualDirection: null,
      matches: [{ nodeType: "year" as const, ganZhi: "丙午", stemTenGod: null }]
    },
    events: {
      text: "岗位",
      tags: ["事业"],
      feedbacks: ["supports" as const],
      lifecycle: "active" as const,
      binding: "transit_node" as const
    },
    sort: { field: "updatedAt" as const, direction: "desc" as const }
  };

  it("严格保存跨组 AND 查询及其 UTC、Revision、事件和结构条件", () => {
    expect(researchQuerySchema.parse(caseQuery)).toEqual(caseQuery);
    expect(researchQuerySchema.safeParse({ ...caseQuery, unknown: true }).success).toBe(false);
    expect(researchQuerySchema.safeParse({ ...caseQuery, dayMasters: ["辛", "甲"] }).success).toBe(false);
    expect(researchQuerySchema.safeParse({ ...caseQuery, transit: { ...caseQuery.transit, atInstant: "2026-08-01T12:00:00Z" } }).success).toBe(false);
  });

  it("拒绝非规范查询文字，并公开与执行器一致的显式规范化函数", () => {
    expect(normalizeResearchQueryText("  ＡＢＣ\t事业  ")).toBe("abc 事业");
    expect(researchQuerySchema.safeParse({ ...caseQuery, text: "  事业  调整 " }).success).toBe(false);
    expect(researchQuerySchema.safeParse({
      ...caseQuery,
      events: { ...caseQuery.events!, text: "JOB" }
    }).success).toBe(false);
    expect(researchQuerySchema.safeParse({
      ...caseQuery,
      events: { ...caseQuery.events!, text: "job" }
    }).success).toBe(true);
  });

  it("不允许把运限节点事件条件从确定的运限查询中拆开", () => {
    expect(researchQuerySchema.safeParse({ ...caseQuery, transit: null }).success).toBe(false);
    expect(researchQuerySchema.safeParse({
      ...caseQuery,
      transit: { ...caseQuery.transit, matches: [
        { nodeType: "year", ganZhi: "丙午", stemTenGod: null },
        { nodeType: "dayun", ganZhi: "辛巳", stemTenGod: null }
      ] }
    }).success).toBe(false);
  });

  it("运限匹配可按干支或十神，但不能提交空节点条件", () => {
    const transit = caseQuery.transit!;
    expect(researchQuerySchema.safeParse({
      ...caseQuery,
      transit: { ...transit, matches: [{ nodeType: "year", ganZhi: null, stemTenGod: "正官" }] }
    }).success).toBe(true);
    expect(researchQuerySchema.safeParse({
      ...caseQuery,
      transit: { ...transit, matches: [{ nodeType: "year", ganZhi: null, stemTenGod: null }] }
    }).success).toBe(false);
  });

  it("候选组契约没有正式盘结构、运限或 Revision 字段", () => {
    const candidateQuery = {
      version: RESEARCH_QUERY_VERSION,
      scope: "candidate_sets",
      text: "时辰待考",
      lifecycle: "all",
      favorites: "only",
      tags: ["待核验"],
      sort: { field: "alias", direction: "asc" }
    };
    expect(researchQuerySchema.safeParse(candidateQuery).success).toBe(true);
    expect(researchQuerySchema.safeParse({ ...candidateQuery, dayMasters: ["辛"] }).success).toBe(false);
  });

  it("排序字段按查询 scope 收紧", () => {
    const eventQuery = {
      version: RESEARCH_QUERY_VERSION,
      scope: "events",
      text: "岗位",
      tags: [],
      feedbacks: [],
      lifecycle: "all",
      binding: { kind: "any" },
      sort: { field: "title", direction: "asc" }
    };
    expect(researchQuerySchema.safeParse(eventQuery).success).toBe(true);
    expect(researchQuerySchema.safeParse({ ...eventQuery, sort: { field: "alias", direction: "asc" } }).success).toBe(false);
    expect(researchQuerySchema.safeParse({ ...caseQuery, sort: { field: "title", direction: "asc" } }).success).toBe(false);
  });

  it("SavedView v2 严格区分可执行和待人工迁移状态", () => {
    const base = {
      schemaVersion: SCHEMA_VERSION,
      id: "10000000-0000-4000-8000-000000000004",
      name: "研究视图",
      createdAt: eventFixture.createdAt,
      updatedAt: eventFixture.updatedAt
    };
    const ready = {
      ...base,
      recordVersion: 2,
      state: "ready",
      query: caseQuery,
      queryDigest: "b".repeat(64),
      editVersion: 1
    };
    expect(savedViewRecordSchema.parse(ready)).toEqual(ready);
    expect(savedViewRecordSchema.safeParse({ ...ready, filters: {} }).success).toBe(false);

    const legacy = legacySavedViewRecordV1Schema.parse({
      ...base,
      query: "事业",
      filters: { arbitrary: { nested: true } },
      sort: { field: "updatedAt", direction: "desc" }
    });
    const migrated = migrateLegacySavedViewRecordV1(legacy);
    expect(migrated).toMatchObject({
      ...base,
      recordVersion: 2,
      state: "migration_required",
      editVersion: 1,
      legacyRecord: legacy,
      migrationReason: "legacy_untyped_filters_require_manual_review"
    });
    expect("query" in migrated).toBe(false);
    expect(savedViewRecordSchema.safeParse({ ...migrated, name: "不一致" }).success).toBe(false);
  });
});

const knowledgeDocumentFixture = {
  schemaVersion: SCHEMA_VERSION,
  id: "20000000-0000-4000-8000-000000000001",
  recordType: "user_knowledge_document" as const,
  title: "研究摘录",
  author: "某作者",
  edition: "第一版",
  sourceNote: "用户本地资料",
  fileName: "研究摘录.md",
  format: "markdown" as const,
  byteSize: 128,
  content: "序言\n# 第一章\n正文",
  contentHash: "a".repeat(64),
  lineCount: 3,
  sections: [
    { id: "section-1", title: "开篇", level: 0, startLine: 1, endLine: 1 },
    { id: "section-2", title: "第一章", level: 1, startLine: 2, endLine: 3 }
  ],
  editVersion: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const citationFixture = {
  schemaVersion: SCHEMA_VERSION,
  id: "20000000-0000-4000-8000-000000000002",
  documentId: knowledgeDocumentFixture.id,
  documentContentHash: knowledgeDocumentFixture.contentHash,
  locator: { sectionId: "section-2", startLine: 2, endLine: 3 },
  quote: "# 第一章\n正文",
  annotation: "待与其他版本对读",
  targets: [
    { kind: "research_note" as const, noteId: "20000000-0000-4000-8000-000000000003" },
    { kind: "event" as const, eventId: "20000000-0000-4000-8000-000000000004" },
    {
      kind: "chart_field" as const,
      caseId: "20000000-0000-4000-8000-000000000005",
      revisionId: "20000000-0000-4000-8000-000000000006",
      field: "pillars.day.ganZhi"
    }
  ],
  targetKeys: [] as string[],
  status: "user_candidate" as const,
  reviewAttestations: [],
  decisionNote: "",
  editVersion: 1,
  createdAt: knowledgeDocumentFixture.createdAt,
  updatedAt: knowledgeDocumentFixture.updatedAt
};
citationFixture.targetKeys = citationTargetKeys(citationFixture.targets);

describe("knowledge document and citation contracts", () => {
  it("accepts one strict normalized document and all citation target variants", () => {
    expect(knowledgeDocumentRecordSchema.parse(knowledgeDocumentFixture)).toEqual(knowledgeDocumentFixture);
    expect(citationRecordSchema.parse(citationFixture)).toEqual(citationFixture);
  });

  it("keeps user-import rights local and rejects ancient-work-only bundled clearance", () => {
    const base = {
      schemaVersion: SCHEMA_VERSION,
      recordType: "knowledge_source_rights",
      documentId: knowledgeDocumentFixture.id,
      documentContentHash: knowledgeDocumentFixture.contentHash,
      origin: "user_import",
      source: { sourceUrl: null, publisher: "", publicationYear: null, acquiredAt: knowledgeDocumentFixture.createdAt },
      rights: {
        status: "user_unverified",
        workStatus: "unknown",
        editionStatus: "unknown",
        basis: "user_declaration",
        jurisdiction: null,
        licenseId: null,
        copyrightNotice: "",
        evidenceRefs: [],
        distributionPolicy: "local_private_only"
      },
      review: { status: "unreviewed", attestations: [], note: "" },
      editVersion: 1,
      createdAt: knowledgeDocumentFixture.createdAt,
      updatedAt: knowledgeDocumentFixture.updatedAt
    } as const;
    expect(sourceRightsRecordSchema.safeParse(base).success).toBe(true);
    expect(sourceRightsRecordSchema.safeParse({
      ...base,
      origin: "bundled",
      rights: {
        ...base.rights,
        status: "public_domain_verified",
        workStatus: "public_domain_verified",
        editionStatus: "unknown",
        basis: "public_domain",
        jurisdiction: "CN",
        evidenceRefs: ["https://example.com/evidence"],
        distributionPolicy: "redistributable"
      },
      review: {
        status: "double_reviewed",
        attestations: [
          { reviewerId: "a", reviewedAt: base.createdAt, note: "" },
          { reviewerId: "b", reviewedAt: base.createdAt, note: "" }
        ],
        note: ""
      }
    }).success).toBe(false);
  });

  it("rejects non-normalized content, inconsistent line snapshots, and invalid section coverage", () => {
    expect(knowledgeDocumentRecordSchema.safeParse({
      ...knowledgeDocumentFixture,
      content: "甲\r\n乙"
    }).success).toBe(false);
    expect(knowledgeDocumentRecordSchema.safeParse({
      ...knowledgeDocumentFixture,
      content: "甲\0乙"
    }).success).toBe(false);
    expect(knowledgeDocumentRecordSchema.safeParse({
      ...knowledgeDocumentFixture,
      lineCount: 4
    }).success).toBe(false);
    expect(knowledgeDocumentRecordSchema.safeParse({
      ...knowledgeDocumentFixture,
      sections: [{ id: "section-2", title: "缺少首行", level: 1, startLine: 2, endLine: 3 }]
    }).success).toBe(false);
    expect(knowledgeDocumentRecordSchema.safeParse({
      ...knowledgeDocumentFixture,
      rightsStatus: "verified_public_domain"
    }).success).toBe(false);
    expect(knowledgeDocumentRecordSchema.safeParse({
      ...knowledgeDocumentFixture,
      unknown: true
    }).success).toBe(false);
  });

  it("requires non-empty unique targets and exact 1-based citation coordinates", () => {
    expect(citationRecordSchema.safeParse({ ...citationFixture, targets: [] }).success).toBe(false);
    expect(citationRecordSchema.safeParse({
      ...citationFixture,
      targets: [citationFixture.targets[0], citationFixture.targets[0]]
    }).success).toBe(false);
    expect(citationRecordSchema.safeParse({
      ...citationFixture,
      locator: { sectionId: "section-0", startLine: 0, endLine: 1 }
    }).success).toBe(false);
    expect(citationRecordSchema.safeParse({
      ...citationFixture,
      locator: { sectionId: "section-2", startLine: 1, endLine: 201 }
    }).success).toBe(false);
    expect(citationRecordSchema.safeParse({
      ...citationFixture,
      targets: [{
        kind: "chart_field",
        caseId: "20000000-0000-4000-8000-000000000005",
        revisionId: "20000000-0000-4000-8000-000000000006",
        field: "facts.pillars.day.ganZhi"
      }]
    }).success).toBe(false);
    expect(citationRecordSchema.safeParse({ ...citationFixture, quote: "甲".repeat(20_001) }).success).toBe(false);
  });
});

const localAttachmentFixture = {
  schemaVersion: SCHEMA_VERSION,
  recordVersion: LOCAL_ATTACHMENT_RECORD_VERSION,
  recordType: "local_attachment" as const,
  id: "30000000-0000-4000-8000-000000000001",
  fileName: "命盘证据.pdf",
  mediaType: "application/pdf",
  byteLength: 3,
  contentBase64: "AQID",
  contentHash: "c".repeat(64),
  description: "仅保存在本机的研究附件",
  link: {
    kind: "research_subject" as const,
    subjectId: "30000000-0000-4000-8000-000000000002"
  },
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const localResearcherProfileFixture = {
  schemaVersion: SCHEMA_VERSION,
  recordVersion: LOCAL_RESEARCHER_PROFILE_RECORD_VERSION,
  recordType: "local_researcher_profile" as const,
  id: LOCAL_RESEARCHER_PROFILE_ID,
  displayName: "本地研究者",
  organization: "",
  researchFocus: "八字结构与流年对读",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

const localAppSettingsFixture = {
  schemaVersion: SCHEMA_VERSION,
  recordVersion: LOCAL_APP_SETTINGS_RECORD_VERSION,
  recordType: "local_app_settings" as const,
  id: LOCAL_APP_SETTINGS_ID,
  locale: "zh-CN" as const,
  defaultTimeZone: "Asia/Shanghai",
  defaultCalendarType: "gregorian" as const,
  preferredDensity: "comfortable" as const,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z"
};

describe("local attachment, researcher profile, and app settings contracts", () => {
  it("accepts exact local records and every canonical Base64 padding width", () => {
    expect(localAttachmentRecordSchema.parse(localAttachmentFixture)).toEqual(localAttachmentFixture);
    expect(localResearcherProfileRecordSchema.parse(localResearcherProfileFixture)).toEqual(
      localResearcherProfileFixture
    );
    expect(localAppSettingsRecordSchema.parse(localAppSettingsFixture)).toEqual(localAppSettingsFixture);

    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      byteLength: 0,
      contentBase64: ""
    }).success).toBe(true);
    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      byteLength: 1,
      contentBase64: "AQ=="
    }).success).toBe(true);
    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      byteLength: 2,
      contentBase64: "AQI="
    }).success).toBe(true);
  });

  it.each([
    ["AQ", "missing padding"],
    ["AQ=", "wrong length"],
    ["AQ===", "excess padding"],
    ["A=Q=", "interior padding"],
    ["AQ==\n", "whitespace"],
    ["AA-_", "URL-safe alphabet"],
    ["AR==", "non-zero pad bits before =="],
    ["AQJ=", "non-zero pad bits before ="]
  ])("rejects non-canonical Base64 %s (%s)", (contentBase64) => {
    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      byteLength: contentBase64.endsWith("==") ? 1 : 2,
      contentBase64
    }).success).toBe(false);
  });

  it("binds byteLength to decoded content and enforces the attachment size ceiling", () => {
    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      byteLength: 2
    }).success).toBe(false);
    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      byteLength: MAX_LOCAL_ATTACHMENT_BYTES + 1
    }).success).toBe(false);
  });

  it.each([
    "../证据.pdf",
    "资料\\证据.pdf",
    ".",
    "..",
    "证据\u0000.pdf",
    "证据\u0085.pdf",
    "report\u202Efdp.exe",
    "report\u2066pdf\u2069.exe",
    "证据\u200B.pdf",
    " 证据.pdf"
  ])(
    "rejects unsafe or non-canonical attachment file name %j",
    (fileName) => {
      expect(localAttachmentRecordSchema.safeParse({ ...localAttachmentFixture, fileName }).success).toBe(false);
    }
  );

  it("accepts canonical lowercase MIME types and rejects parameters or ambiguous spellings", () => {
    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      mediaType: "application/vnd.hakimi+json"
    }).success).toBe(true);
    for (const mediaType of ["Application/PDF", "text/plain; charset=utf-8", "text", "text /plain", "text/"]) {
      expect(localAttachmentRecordSchema.safeParse({ ...localAttachmentFixture, mediaType }).success).toBe(false);
    }
  });

  it("rejects unknown fields at each strict local-record boundary", () => {
    expect(localAttachmentRecordSchema.safeParse({ ...localAttachmentFixture, unknown: true }).success).toBe(false);
    expect(localAttachmentRecordSchema.safeParse({
      ...localAttachmentFixture,
      link: { ...localAttachmentFixture.link, unknown: true }
    }).success).toBe(false);
    expect(localResearcherProfileRecordSchema.safeParse({
      ...localResearcherProfileFixture,
      unknown: true
    }).success).toBe(false);
    expect(localAppSettingsRecordSchema.safeParse({ ...localAppSettingsFixture, unknown: true }).success).toBe(false);
  });

  it("pins singleton identities, validates IANA time zones, and preserves timestamp order", () => {
    expect(localResearcherProfileRecordSchema.safeParse({
      ...localResearcherProfileFixture,
      id: "another-profile"
    }).success).toBe(false);
    expect(localAppSettingsRecordSchema.safeParse({
      ...localAppSettingsFixture,
      id: "another-settings"
    }).success).toBe(false);
    expect(localAppSettingsRecordSchema.safeParse({
      ...localAppSettingsFixture,
      defaultTimeZone: "Mars/Olympus"
    }).success).toBe(false);
    expect(localResearcherProfileRecordSchema.safeParse({
      ...localResearcherProfileFixture,
      updatedAt: "2026-07-31T23:59:59.000Z"
    }).success).toBe(false);
    expect(localAppSettingsRecordSchema.safeParse({
      ...localAppSettingsFixture,
      updatedAt: "2026-07-31T23:59:59.000Z"
    }).success).toBe(false);
  });
});

describe("candidate-set tzdb migration receipt contracts", () => {
  const targetTzdbVersion =
    `iana-tzdb@2026c/sha256:${"f".repeat(64)}/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3`;
  const probeDiffs = UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.map((candidateId, index) => ({
    candidateId,
    sourceStatus: "calculated",
    targetStatus: index === 0 ? "unresolved" : "calculated",
    behaviorChanged: index === 0,
    hashChanged: index <= 1,
    changedFields: index === 0 ? ["status", "unresolved_reason"] : []
  }));
  const comparison = {
    formatVersion: LEGACY_CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
    source: {
      tzdbVersion: "browser-intl-unreported",
      resultHash: "b".repeat(64)
    },
    target: {
      tzdbVersion: targetTzdbVersion,
      resultHash: "d".repeat(64)
    },
    probeDiffs,
    behaviorChangedCount: 1,
    hashOnlyChangedCount: 1,
    unchangedCount: 11
  };
  const receipt = {
    schemaVersion: SCHEMA_VERSION,
    recordVersion: LEGACY_TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
    id: "10000000-0000-4000-8000-000000000032",
    operation: "candidate_set_tzdb_recalculation",
    source: {
      kind: "candidate_set",
      recordId: "10000000-0000-4000-8000-000000000030",
      snapshotDigest: "a".repeat(64),
      resultHash: "b".repeat(64),
      tzdbVersion: "browser-intl-unreported"
    },
    target: {
      kind: "candidate_set",
      recordId: "10000000-0000-4000-8000-000000000031",
      snapshotDigest: "c".repeat(64),
      resultHash: "d".repeat(64),
      tzdbVersion: targetTzdbVersion
    },
    comparison,
    comparisonDigest: "e".repeat(64),
    createdAt: "2026-08-02T00:00:00.000Z"
  };

  const resolutionCandidate = {
    choice: "unique" as const,
    instant: "2026-08-02T00:00:00Z",
    utcOffset: "+00:00",
    utcOffsetMinutes: 0,
    resolvedWallTime: "2026-08-02T00:00:00",
    zonedDateTime: "2026-08-02T00:00:00+00:00[UTC]",
    matchesInputWallTime: true
  };
  const sourceResolutionFingerprint = {
    kind: "unique" as const,
    policy: "reject" as const,
    status: "resolved_unique" as const,
    requestedWallTime: "2026-08-02T00:00:00",
    candidates: [resolutionCandidate],
    selectedCandidate: resolutionCandidate
  };
  const targetResolutionCandidate = {
    ...resolutionCandidate,
    instant: "2026-08-02T01:00:00Z"
  };
  const targetResolutionFingerprint = {
    ...sourceResolutionFingerprint,
    candidates: [targetResolutionCandidate],
    selectedCandidate: targetResolutionCandidate
  };
  const v2ProbeDiffs = UNKNOWN_HOUR_PROBE_CANDIDATE_IDS.map((candidateId, index) => ({
    candidateId,
    sourceStatus: "calculated" as const,
    targetStatus: "calculated" as const,
    sourceResolutionFingerprint,
    targetResolutionFingerprint: index === 0 ? targetResolutionFingerprint : sourceResolutionFingerprint,
    behaviorChanged: index === 0,
    hashChanged: index <= 1,
    changedFields: index === 0
      ? ["time_resolution_candidates", "time_resolution_fingerprint"] as const
      : []
  }));
  const v2Comparison = {
    formatVersion: CANDIDATE_SET_TZDB_COMPARISON_FORMAT_VERSION,
    source: comparison.source,
    target: comparison.target,
    probeDiffs: v2ProbeDiffs,
    behaviorChangedCount: 1,
    hashOnlyChangedCount: 1,
    unchangedCount: 11
  };
  const v2Receipt = {
    ...receipt,
    recordVersion: TZDB_MIGRATION_RECEIPT_RECORD_VERSION,
    comparison: v2Comparison
  };

  it("accepts one append-only receipt with 13 canonically ordered probe diffs", () => {
    expect(candidateSetTzdbComparisonSchema.safeParse(comparison).success).toBe(true);
    expect(tzdbMigrationReceiptSchema.safeParse(receipt).success).toBe(true);
    expect(candidateSetTzdbComparisonSchema.safeParse(v2Comparison).success).toBe(true);
    expect(tzdbMigrationReceiptSchema.safeParse(v2Receipt).success).toBe(true);
  });

  it("rejects non-canonical behavior flags, changed-field order, probe order, and counts", () => {
    expect(candidateSetTzdbProbeDiffSchema.safeParse({
      ...probeDiffs[0],
      behaviorChanged: false
    }).success).toBe(false);
    expect(candidateSetTzdbProbeDiffSchema.safeParse({
      ...probeDiffs[0],
      changedFields: ["unresolved_reason", "status"]
    }).success).toBe(false);
    expect(candidateSetTzdbProbeDiffSchema.safeParse({
      ...probeDiffs[0],
      hashChanged: false
    }).success).toBe(false);
    expect(candidateSetTzdbComparisonSchema.safeParse({
      ...comparison,
      probeDiffs: [probeDiffs[1], probeDiffs[0], ...probeDiffs.slice(2)]
    }).success).toBe(false);
    expect(candidateSetTzdbComparisonSchema.safeParse({
      ...comparison,
      hashOnlyChangedCount: 0,
      unchangedCount: 12
    }).success).toBe(false);
  });

  it("rejects same-endpoint and comparison/endpoint identity mismatches", () => {
    expect(tzdbMigrationReceiptSchema.safeParse({
      ...receipt,
      target: { ...receipt.target, recordId: receipt.source.recordId }
    }).success).toBe(false);
    expect(tzdbMigrationReceiptSchema.safeParse({
      ...receipt,
      comparison: {
        ...receipt.comparison,
        target: { ...receipt.comparison.target, resultHash: "9".repeat(64) }
      }
    }).success).toBe(false);
    expect(tzdbMigrationReceiptSchema.safeParse({ ...receipt, extra: true }).success).toBe(false);
  });
});

describe("full-backup contract generations", () => {
  const digest = "b".repeat(64);
  const commonManifest = {
    format: FULL_BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    scope: FULL_BACKUP_SCOPE,
    appVersion: "0.2.0-p0",
    exportedAt: "2026-08-01T00:00:00.000Z",
    digestAlgorithm: FULL_BACKUP_DIGEST_ALGORITHM
  };
  const sixPartitionCounts = {
    cases: 0,
    revisions: 0,
    candidateSets: 0,
    researchNotes: 0,
    events: 0,
    savedViews: 0
  };
  const sixPartitionDigests = {
    cases: digest,
    revisions: digest,
    candidateSets: digest,
    researchNotes: digest,
    events: digest,
    savedViews: digest,
    payload: digest,
    envelope: digest
  };
  const sixPartitionPayload = {
    cases: [],
    revisions: [],
    candidateSets: [],
    researchNotes: [],
    events: [],
    savedViews: []
  };
  const ninePartitionCounts = {
    ...sixPartitionCounts,
    knowledgeDocuments: 0,
    citations: 0,
    sourceRights: 0
  };
  const ninePartitionDigests = {
    ...sixPartitionDigests,
    knowledgeDocuments: digest,
    citations: digest,
    sourceRights: digest
  };
  const ninePartitionPayload = {
    ...sixPartitionPayload,
    knowledgeDocuments: [],
    citations: [],
    sourceRights: []
  };
  const savedViewGeneration = {
    manifest: {
      ...commonManifest,
      formatVersion: SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION,
      counts: ninePartitionCounts
    },
    digests: ninePartitionDigests,
    payload: ninePartitionPayload
  };
  const ruleRegistryGeneration = {
    manifest: {
      ...commonManifest,
      formatVersion: RULE_REGISTRY_FULL_BACKUP_FORMAT_VERSION,
      counts: {
        ...ninePartitionCounts,
        attachments: 1,
        researcherProfiles: 1,
        appSettings: 1,
        ruleRegistry: 0
      }
    },
    digests: {
      ...ninePartitionDigests,
      attachments: digest,
      researcherProfiles: digest,
      appSettings: digest,
      ruleRegistry: digest
    },
    payload: {
      ...ninePartitionPayload,
      attachments: [localAttachmentFixture],
      researcherProfiles: [localResearcherProfileFixture],
      appSettings: [localAppSettingsFixture],
      ruleRegistry: []
    }
  };
  const tzdbMigrationGeneration = {
    manifest: {
      ...ruleRegistryGeneration.manifest,
      formatVersion: TZDB_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
      counts: {
        ...ruleRegistryGeneration.manifest.counts,
        tzdbMigrationReceipts: 0
      }
    },
    digests: {
      ...ruleRegistryGeneration.digests,
      tzdbMigrationReceipts: digest
    },
    payload: {
      ...ruleRegistryGeneration.payload,
      tzdbMigrationReceipts: []
    }
  };
  const eventTimeMigrationGeneration = {
    manifest: {
      ...tzdbMigrationGeneration.manifest,
      formatVersion: EVENT_TIME_MIGRATION_FULL_BACKUP_FORMAT_VERSION,
      counts: {
        ...tzdbMigrationGeneration.manifest.counts,
        eventTimeMigrationReceipts: 0
      }
    },
    digests: {
      ...tzdbMigrationGeneration.digests,
      eventTimeMigrationReceipts: digest
    },
    payload: {
      ...tzdbMigrationGeneration.payload,
      eventTimeMigrationReceipts: []
    }
  };
  const latest = {
    manifest: {
      ...eventTimeMigrationGeneration.manifest,
      formatVersion: FULL_BACKUP_FORMAT_VERSION,
      counts: {
        ...eventTimeMigrationGeneration.manifest.counts,
        revisionCalculationReceipts: 0
      }
    },
    digests: {
      ...eventTimeMigrationGeneration.digests,
      revisionCalculationReceipts: digest
    },
    payload: {
      ...eventTimeMigrationGeneration.payload,
      revisionCalculationReceipts: []
    }
  };
  const omitKey = (record: Record<string, unknown>, key: string): Record<string, unknown> =>
    Object.fromEntries(Object.entries(record).filter(([candidate]) => candidate !== key));

  it("freezes v0.2-v0.6 as generations distinct from current v1.0", () => {
    const previous = {
      manifest: {
        ...commonManifest,
        formatVersion: PREVIOUS_FULL_BACKUP_FORMAT_VERSION,
        counts: sixPartitionCounts
      },
      digests: sixPartitionDigests,
      payload: sixPartitionPayload
    };
    expect(previousFullBackupEnvelopeSchema.safeParse(previous).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(previous).success).toBe(false);

    const knowledgeGeneration = {
      manifest: {
        ...commonManifest,
        formatVersion: KNOWLEDGE_FULL_BACKUP_FORMAT_VERSION,
        counts: { ...sixPartitionCounts, knowledgeDocuments: 0, citations: 0 }
      },
      digests: { ...sixPartitionDigests, knowledgeDocuments: digest, citations: digest },
      payload: { ...sixPartitionPayload, knowledgeDocuments: [], citations: [] }
    };
    expect(knowledgeFullBackupEnvelopeSchema.safeParse(knowledgeGeneration).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(knowledgeGeneration).success).toBe(false);

    const sourceRightsGeneration = {
      manifest: {
        ...commonManifest,
        formatVersion: SOURCE_RIGHTS_FULL_BACKUP_FORMAT_VERSION,
        counts: { ...sixPartitionCounts, knowledgeDocuments: 0, citations: 0, sourceRights: 0 }
      },
      digests: { ...sixPartitionDigests, knowledgeDocuments: digest, citations: digest, sourceRights: digest },
      payload: { ...sixPartitionPayload, knowledgeDocuments: [], citations: [], sourceRights: [] }
    };
    expect(sourceRightsFullBackupEnvelopeSchema.safeParse(sourceRightsGeneration).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(sourceRightsGeneration).success).toBe(false);

    const eventTimeGeneration = {
      ...sourceRightsGeneration,
      manifest: {
        ...sourceRightsGeneration.manifest,
        formatVersion: EVENT_TIME_FULL_BACKUP_FORMAT_VERSION
      }
    };
    expect(eventTimeFullBackupEnvelopeSchema.safeParse(eventTimeGeneration).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(eventTimeGeneration).success).toBe(false);
  });

  it("freezes v0.7 savedViewFullBackup schemas to exactly the original nine partitions", () => {
    expect(savedViewFullBackupManifestSchema.safeParse(savedViewGeneration.manifest).success).toBe(true);
    expect(savedViewFullBackupDigestsSchema.safeParse(savedViewGeneration.digests).success).toBe(true);
    expect(savedViewFullBackupPayloadSchema.safeParse(savedViewGeneration.payload).success).toBe(true);
    expect(savedViewFullBackupEnvelopeSchema.safeParse(savedViewGeneration).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(savedViewGeneration).success).toBe(false);

    expect(savedViewFullBackupManifestSchema.safeParse({
      ...savedViewGeneration.manifest,
      counts: { ...savedViewGeneration.manifest.counts, attachments: 0 }
    }).success).toBe(false);
    expect(savedViewFullBackupDigestsSchema.safeParse({
      ...savedViewGeneration.digests,
      researcherProfiles: digest
    }).success).toBe(false);
    expect(savedViewFullBackupPayloadSchema.safeParse({
      ...savedViewGeneration.payload,
      appSettings: []
    }).success).toBe(false);
    expect(savedViewFullBackupPayloadSchema.safeParse(
      omitKey(savedViewGeneration.payload, "sourceRights")
    ).success).toBe(false);
  });

  it("freezes v0.9 to the original thirteen partitions", () => {
    expect(ruleRegistryFullBackupManifestSchema.safeParse(ruleRegistryGeneration.manifest).success).toBe(true);
    expect(ruleRegistryFullBackupDigestsSchema.safeParse(ruleRegistryGeneration.digests).success).toBe(true);
    expect(ruleRegistryFullBackupPayloadSchema.safeParse(ruleRegistryGeneration.payload).success).toBe(true);
    expect(ruleRegistryFullBackupEnvelopeSchema.safeParse(ruleRegistryGeneration).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(ruleRegistryGeneration).success).toBe(false);
    expect(ruleRegistryFullBackupEnvelopeSchema.safeParse(latest).success).toBe(false);
    expect(ruleRegistryFullBackupPayloadSchema.safeParse({
      ...ruleRegistryGeneration.payload,
      tzdbMigrationReceipts: []
    }).success).toBe(false);
  });

  it("freezes v1.0 to exactly the fourteen partitions that predate Event receipts", () => {
    expect(tzdbMigrationFullBackupManifestSchema.safeParse(tzdbMigrationGeneration.manifest).success).toBe(true);
    expect(tzdbMigrationFullBackupDigestsSchema.safeParse(tzdbMigrationGeneration.digests).success).toBe(true);
    expect(tzdbMigrationFullBackupPayloadSchema.safeParse(tzdbMigrationGeneration.payload).success).toBe(true);
    expect(tzdbMigrationFullBackupEnvelopeSchema.safeParse(tzdbMigrationGeneration).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(tzdbMigrationGeneration).success).toBe(false);
    expect(tzdbMigrationFullBackupEnvelopeSchema.safeParse(latest).success).toBe(false);
    expect(tzdbMigrationFullBackupPayloadSchema.safeParse({
      ...tzdbMigrationGeneration.payload,
      eventTimeMigrationReceipts: []
    }).success).toBe(false);
  });

  it("freezes v1.1 to exactly the fifteen partitions that predate Revision calculation receipts", () => {
    expect(eventTimeMigrationFullBackupEnvelopeSchema.safeParse(eventTimeMigrationGeneration).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(eventTimeMigrationGeneration).success).toBe(false);
    expect(eventTimeMigrationFullBackupEnvelopeSchema.safeParse(latest).success).toBe(false);
    expect(eventTimeMigrationFullBackupEnvelopeSchema.safeParse({
      ...eventTimeMigrationGeneration,
      payload: {
        ...eventTimeMigrationGeneration.payload,
        revisionCalculationReceipts: []
      }
    }).success).toBe(false);
  });

  it("accepts current v1.2 only with all sixteen exact partitions", () => {
    expect(fullBackupEnvelopeSchema.safeParse(latest).success).toBe(true);
    expect(previousFullBackupEnvelopeSchema.safeParse(latest).success).toBe(false);
    expect(savedViewFullBackupEnvelopeSchema.safeParse(latest).success).toBe(false);
    expect(fullBackupEnvelopeSchema.safeParse({
      ...latest,
      payload: { ...latest.payload, derivedQueryResults: [] }
    }).success).toBe(false);
  });

  it("keeps the calculation-receipt outer record strict while leaving projection semantics to revision-replay", () => {
    const receipt = {
      schemaVersion: "1.0.0",
      recordType: "revision_calculation_receipt",
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-08-03T00:00:00.000Z",
      captureKind: "revision_creation_baseline",
      requestFingerprint: digest,
      sourceRevision: {
        caseId: "22222222-2222-4222-8222-222222222222",
        revisionId: "33333333-3333-4333-8333-333333333333",
        revisionNumber: 1,
        snapshotDigest: digest,
        natalResultHash: digest
      },
      projection: {},
      receiptDigest: digest
    };
    const withReceipt = {
      manifest: {
        ...latest.manifest,
        counts: { ...latest.manifest.counts, revisionCalculationReceipts: 1 }
      },
      digests: latest.digests,
      payload: { ...latest.payload, revisionCalculationReceipts: [receipt] }
    };

    expect(fullBackupEnvelopeSchema.safeParse(withReceipt).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse({
      ...withReceipt,
      payload: {
        ...withReceipt.payload,
        revisionCalculationReceipts: [{ ...receipt, projection: [] }]
      }
    }).success).toBe(false);
    expect(fullBackupEnvelopeSchema.safeParse({
      ...withReceipt,
      payload: {
        ...withReceipt.payload,
        revisionCalculationReceipts: [{ ...receipt, unexpected: true }]
      }
    }).success).toBe(false);
    const { snapshotDigest: _removed, ...incompleteSource } = receipt.sourceRevision;
    expect(fullBackupEnvelopeSchema.safeParse({
      ...withReceipt,
      payload: {
        ...withReceipt.payload,
        revisionCalculationReceipts: [{ ...receipt, sourceRevision: incompleteSource }]
      }
    }).success).toBe(false);
  });

  it("freezes v0.8 to the original twelve partitions", () => {
    const v08 = {
      manifest: {
        ...ruleRegistryGeneration.manifest,
        formatVersion: LOCAL_USER_DATA_FULL_BACKUP_FORMAT_VERSION,
        counts: omitKey(ruleRegistryGeneration.manifest.counts, "ruleRegistry")
      },
      digests: omitKey(ruleRegistryGeneration.digests, "ruleRegistry"),
      payload: omitKey(ruleRegistryGeneration.payload, "ruleRegistry")
    };
    expect(localUserDataFullBackupEnvelopeSchema.safeParse(v08).success).toBe(true);
    expect(fullBackupEnvelopeSchema.safeParse(v08).success).toBe(false);
    expect(localUserDataFullBackupEnvelopeSchema.safeParse({
      ...v08,
      payload: { ...v08.payload, ruleRegistry: [] }
    }).success).toBe(false);
  });

  it.each([
    "attachments",
    "researcherProfiles",
    "appSettings",
    "ruleRegistry",
    "tzdbMigrationReceipts",
    "eventTimeMigrationReceipts",
    "revisionCalculationReceipts"
  ])(
    "requires the current %s partition in counts, digests, and payload",
    (partition) => {
      expect(fullBackupEnvelopeSchema.safeParse({
        ...latest,
        manifest: { ...latest.manifest, counts: omitKey(latest.manifest.counts, partition) }
      }).success).toBe(false);
      expect(fullBackupEnvelopeSchema.safeParse({
        ...latest,
        digests: omitKey(latest.digests, partition)
      }).success).toBe(false);
      expect(fullBackupEnvelopeSchema.safeParse({
        ...latest,
        payload: omitKey(latest.payload, partition)
      }).success).toBe(false);
    }
  );

  it("enforces profile and settings singleton limits in both counts and payload", () => {
    expect(fullBackupEnvelopeSchema.safeParse({
      ...latest,
      manifest: {
        ...latest.manifest,
        counts: { ...latest.manifest.counts, researcherProfiles: 2 }
      }
    }).success).toBe(false);
    expect(fullBackupEnvelopeSchema.safeParse({
      ...latest,
      manifest: {
        ...latest.manifest,
        counts: { ...latest.manifest.counts, appSettings: 2 }
      }
    }).success).toBe(false);
    expect(fullBackupEnvelopeSchema.safeParse({
      ...latest,
      payload: {
        ...latest.payload,
        researcherProfiles: [localResearcherProfileFixture, localResearcherProfileFixture]
      }
    }).success).toBe(false);
    expect(fullBackupEnvelopeSchema.safeParse({
      ...latest,
      payload: {
        ...latest.payload,
        appSettings: [localAppSettingsFixture, localAppSettingsFixture]
      }
    }).success).toBe(false);
  });
});

describe("unknown-hour candidate-set persistence contracts", () => {
  it("accepts a complete candidate set and narrows research-subject records", async () => {
    const { calculateUnknownHourCandidates } = await import("@hakimi/bazi-core");
    const candidateSet = await calculateUnknownHourCandidates(
      birthInputSchema.parse({ ...validBirthInput, time: null, timePrecision: "unknown_hour" }),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const record = candidateSetRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      recordType: "unknown_hour_candidate_set",
      id: "10000000-0000-4000-8000-000000000010",
      alias: "unknown-hour research set",
      tags: ["research"],
      notes: "",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
      favorite: true,
      deletedAt: null,
      candidateSet,
      snapshotDigest: "a".repeat(64)
    });
    const caseRecord = caseRecordSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      id: "10000000-0000-4000-8000-000000000011",
      alias: "exact-time case",
      tags: [],
      notes: "",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      latestRevisionId: "10000000-0000-4000-8000-000000000012",
      revisionCount: 1,
      recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
      favorite: false,
      deletedAt: null
    });
    const subjects: ResearchSubjectRecord[] = [caseRecord, record];
    const {
      recordVersion: _recordVersion,
      favorite: _favorite,
      deletedAt: _deletedAt,
      ...legacyCandidateRecord
    } = record;

    expect(subjects.filter(isCandidateSetRecord)).toEqual([record]);
    expect(isCandidateSetRecord(caseRecord)).toBe(false);
    expect(isCandidateSetRecord(record)).toBe(true);
    expect(legacyCandidateSetRecordV1Schema.safeParse(legacyCandidateRecord).success).toBe(true);
    expect(legacyCandidateSetRecordV1Schema.safeParse(record).success).toBe(false);
    expect(candidateSetRecordSchema.safeParse(legacyCandidateRecord).success).toBe(false);
  });

  it("rejects non-canonical candidate-set record metadata", async () => {
    const { calculateUnknownHourCandidates } = await import("@hakimi/bazi-core");
    const candidateSet = await calculateUnknownHourCandidates(
      birthInputSchema.parse({ ...validBirthInput, time: null, timePrecision: "unknown_hour" }),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const record = {
      schemaVersion: SCHEMA_VERSION,
      recordType: "unknown_hour_candidate_set",
      id: "10000000-0000-4000-8000-000000000013",
      alias: "candidate set",
      tags: ["research"],
      notes: "",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
      favorite: false,
      deletedAt: null,
      candidateSet,
      snapshotDigest: "b".repeat(64)
    };

    expect(candidateSetRecordSchema.safeParse({ ...record, unknown: true }).success).toBe(false);
    expect(candidateSetRecordSchema.safeParse({ ...record, alias: " padded " }).success).toBe(false);
    expect(candidateSetRecordSchema.safeParse({ ...record, tags: ["research", "research"] }).success).toBe(false);
    expect(candidateSetRecordSchema.safeParse({ ...record, snapshotDigest: "B".repeat(64) }).success).toBe(false);
    expect(candidateSetRecordSchema.safeParse({
      ...record,
      updatedAt: "2026-07-31T23:59:59.000Z"
    }).success).toBe(false);
    expect(candidateSetRecordSchema.safeParse({ ...record, deletedAt: "2026-08-01T00:00:01.000Z" }).success).toBe(false);
  });

  it("keeps v1 subject wrappers frozen while current wrappers require lifecycle metadata", () => {
    const legacyCase = {
      schemaVersion: SCHEMA_VERSION,
      id: "10000000-0000-4000-8000-000000000020",
      alias: "legacy case",
      tags: [],
      notes: "",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      latestRevisionId: "10000000-0000-4000-8000-000000000021",
      revisionCount: 1
    };
    expect(legacyCaseRecordV1Schema.safeParse(legacyCase).success).toBe(true);
    expect(caseRecordSchema.safeParse(legacyCase).success).toBe(false);
    expect(legacyCaseRecordV1Schema.safeParse({
      ...legacyCase,
      recordVersion: RESEARCH_SUBJECT_RECORD_VERSION,
      favorite: false,
      deletedAt: null
    }).success).toBe(false);

  });

  it("rejects probe charts or variants detached from their versioned candidate context", async () => {
    const { calculateUnknownHourCandidates } = await import("@hakimi/bazi-core");
    const candidateSet = await calculateUnknownHourCandidates(
      birthInputSchema.parse({ ...validBirthInput, time: null, timePrecision: "unknown_hour" }),
      WORKING_DEFAULT_RULE_PROFILE
    );

    const wrongInput = structuredClone(candidateSet);
    if (wrongInput.candidates[0].status !== "calculated") throw new Error("fixture probe should calculate");
    wrongInput.candidates[0].chart.input.time = "00:31";
    expect(unknownHourCandidateResultSchema.safeParse(wrongInput).success).toBe(false);

    const wrongVariant = structuredClone(candidateSet);
    wrongVariant.candidates[0].variants[0].instant = "1995-08-17T16:31:00Z";
    expect(unknownHourCandidateResultSchema.safeParse(wrongVariant).success).toBe(false);

    const wrongBranch = structuredClone(candidateSet);
    if (wrongBranch.candidates[0].status !== "calculated") throw new Error("fixture probe should calculate");
    wrongBranch.candidates[0].chart.facts.pillars.hour.branch = "丑";
    wrongBranch.candidates[0].variants[0].chart.facts.pillars.hour.branch = "丑";
    expect(unknownHourCandidateResultSchema.safeParse(wrongBranch).success).toBe(false);

    const masqueradedDefinition = structuredClone(candidateSet);
    masqueradedDefinition.candidates[1] = structuredClone(masqueradedDefinition.candidates[2]);
    masqueradedDefinition.candidates[1].probeIndex = 1;
    masqueradedDefinition.candidates[1].candidateId = "chou-01";
    for (const variant of masqueradedDefinition.candidates[1].variants) {
      variant.variantId = `chou-01@${variant.choice}`;
    }
    expect(unknownHourCandidateResultSchema.safeParse(masqueradedDefinition).success).toBe(false);

    const impossibleState = structuredClone(candidateSet) as unknown as { candidates: Array<Record<string, unknown>> };
    Object.assign(impossibleState.candidates[0], {
      status: "requires_user_time_resolution",
      chart: null,
      variants: [],
      unresolvedReason: {
        code: "DST_GAP_REQUIRES_USER_RESOLUTION",
        message: "伪造空档"
      }
    });
    expect(unknownHourCandidateResultSchema.safeParse(impossibleState).success).toBe(false);

    const detachedCalibration = structuredClone(candidateSet);
    detachedCalibration.candidates[0].timeCalibration.timeZone = "Asia/Tokyo";
    expect(unknownHourCandidateResultSchema.safeParse(detachedCalibration).success).toBe(false);

    const detachedActiveWallTime = structuredClone(candidateSet);
    if (detachedActiveWallTime.candidates[0].status !== "calculated") throw new Error("fixture probe should calculate");
    detachedActiveWallTime.candidates[0].timeCalibration.activeWallTime = "1995-08-18T00:31:00";
    detachedActiveWallTime.candidates[0].chart.timeCalibration = structuredClone(
      detachedActiveWallTime.candidates[0].timeCalibration
    );
    detachedActiveWallTime.candidates[0].variants[0].chart.timeCalibration = structuredClone(
      detachedActiveWallTime.candidates[0].timeCalibration
    );
    expect(unknownHourCandidateResultSchema.safeParse(detachedActiveWallTime).success).toBe(false);

    const detachedUniqueSelection = structuredClone(candidateSet);
    if (detachedUniqueSelection.candidates[0].status !== "calculated") throw new Error("fixture probe should calculate");
    const detachedResolution = detachedUniqueSelection.candidates[0].timeCalibration.timeZoneResolution;
    if (!detachedResolution.selectedCandidate) throw new Error("fixture should have a selected unique candidate");
    detachedResolution.selectedCandidate.zonedDateTime = `${detachedResolution.selectedCandidate.zonedDateTime}[tampered]`;
    detachedUniqueSelection.candidates[0].chart.timeCalibration = structuredClone(
      detachedUniqueSelection.candidates[0].timeCalibration
    );
    detachedUniqueSelection.candidates[0].variants[0].chart.timeCalibration = structuredClone(
      detachedUniqueSelection.candidates[0].timeCalibration
    );
    expect(unknownHourCandidateResultSchema.safeParse(detachedUniqueSelection).success).toBe(false);
  });

  it("rejects a truncated or relabelled DST-gap resolution", async () => {
    const { calculateUnknownHourCandidates } = await import("@hakimi/bazi-core");
    const candidateSet = await calculateUnknownHourCandidates(
      birthInputSchema.parse({
        ...validBirthInput,
        date: "2011-12-30",
        time: null,
        timePrecision: "unknown_hour",
        timeZone: "Pacific/Apia"
      }),
      WORKING_DEFAULT_RULE_PROFILE
    );
    const gapIndex = candidateSet.candidates.findIndex(
      (candidate) => candidate.timeCalibration.timeZoneResolution.kind === "gap"
    );
    expect(gapIndex).toBeGreaterThanOrEqual(0);

    const truncated = structuredClone(candidateSet);
    truncated.candidates[gapIndex].timeCalibration.timeZoneResolution.candidates.splice(1);
    expect(unknownHourCandidateResultSchema.safeParse(truncated).success).toBe(false);

    const relabelled = structuredClone(candidateSet);
    relabelled.candidates[gapIndex].timeCalibration.timeZoneResolution.candidates[0].choice = "unique";
    expect(unknownHourCandidateResultSchema.safeParse(relabelled).success).toBe(false);
  });
});
