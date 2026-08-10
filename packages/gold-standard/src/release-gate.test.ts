import { describe, expect, it } from "vitest";

import {
  P003_CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID,
  PROJECT_GOLD_CATEGORY_DEFINITIONS,
  PROJECT_GOLD_DATASET_CATALOG,
  PROJECT_GOLD_REQUIRED_CASE_COUNT,
  ProjectGoldReleaseGateError,
  createCurrentProjectGoldReleaseRegistry,
  summarizeProjectGoldReleaseGate,
  type ProjectGoldCaseRegistration
} from "./release-gate";

function cloneRegistry() {
  return structuredClone(createCurrentProjectGoldReleaseRegistry());
}

function candidateRegistration(
  overrides: Partial<ProjectGoldCaseRegistration> = {}
): ProjectGoldCaseRegistration {
  const base: ProjectGoldCaseRegistration = {
    registrationId: "synthetic-dataset:synthetic-case",
    datasetId: "synthetic-dataset",
    caseId: "synthetic-case",
    caseFingerprint: "synthetic|unique|case",
    category: "stable_date",
    evidence: {
      status: "candidate",
      authoritySourceIds: [],
      independentImplementationIds: [],
      reviewerIds: [],
      decisionRecordRef: null,
      fixtureIntegrated: false
    }
  };
  return { ...base, ...overrides };
}

function expectGateError(action: () => unknown, code: ProjectGoldReleaseGateError["code"]) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ProjectGoldReleaseGateError);
    expect((error as ProjectGoldReleaseGateError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe("P0-03 统一 360 金标准配额", () => {
  it("固定十二类准确配额且合计 360", () => {
    expect(PROJECT_GOLD_CATEGORY_DEFINITIONS).toEqual([
      { id: "stable_date", label: "普通稳定日期", quota: 30 },
      { id: "calendar_conversion", label: "公农历转换", quota: 24 },
      { id: "solar_term_astronomy", label: "节气天文时刻", quota: 36 },
      { id: "timezone_dst_dateline", label: "时区、DST 与日期线", quota: 30 },
      { id: "year_boundary", label: "界年规则", quota: 18 },
      { id: "month_boundary", label: "界月规则", quota: 36 },
      { id: "day_hour_boundary", label: "换日与时辰", quota: 48 },
      { id: "solar_time", label: "真太阳时", quota: 30 },
      { id: "luck_direction", label: "顺逆排运", quota: 18 },
      { id: "luck_start_transition", label: "起运与大运切换", quota: 36 },
      { id: "uncertain_invalid_input", label: "未知、模糊与非法输入", quota: 18 },
      { id: "derived_relations_shensha", label: "派生关系与神煞", quota: 36 }
    ]);
    expect(PROJECT_GOLD_CATEGORY_DEFINITIONS).toHaveLength(12);
    expect(PROJECT_GOLD_CATEGORY_DEFINITIONS.reduce((sum, category) => sum + category.quota, 0))
      .toBe(PROJECT_GOLD_REQUIRED_CASE_COUNT);
  });

  it("固定已知金标数据集目录，并把连续历表窗口预登记为只诊断", () => {
    expect(PROJECT_GOLD_DATASET_CATALOG).toEqual([
      {
        datasetId: "jie-boundary-2024-candidates",
        category: "month_boundary",
        countingPolicy: "gold_candidate"
      },
      {
        datasetId: "hko-calendar-conversion-candidates-v1",
        category: "calendar_conversion",
        countingPolicy: "gold_candidate"
      },
      {
        datasetId: P003_CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID,
        category: "calendar_conversion",
        countingPolicy: "diagnostic_only"
      }
    ]);
  });

  it("默认只登记 36 条界月与 24 条公农历候选，零金标且发布门关闭", () => {
    const registry = createCurrentProjectGoldReleaseRegistry();
    const report = summarizeProjectGoldReleaseGate(registry);

    expect(report.counts).toEqual({
      total: 60,
      candidate: 60,
      cross_checked: 0,
      verified: 0,
      authority: 24,
      independent: 23
    });
    expect(report.remainingCaseSlots).toBe(300);
    expect(report.releaseGatePassed).toBe(false);

    const monthBoundary = report.categories.find((item) => item.category === "month_boundary");
    const calendarConversion = report.categories.find((item) => item.category === "calendar_conversion");
    expect(monthBoundary).toMatchObject({ label: "界月规则", quota: 36, total: 36, candidate: 36, verified: 0, quotaFilled: true });
    expect(calendarConversion).toMatchObject({
      quota: 24,
      total: 24,
      candidate: 24,
      verified: 0,
      authority: 24,
      independent: 23,
      quotaFilled: true
    });
    expect(report.categories
      .filter((item) => !["month_boundary", "calendar_conversion"].includes(item.category))
      .every((item) => item.total === 0)).toBe(true);
  });

  it("现有两个数据集只能映射到各自唯一项目类别", () => {
    const registry = cloneRegistry();
    registry.registrations[0]!.category = "solar_term_astronomy";
    expectGateError(() => summarizeProjectGoldReleaseGate(registry), "DATASET_CATEGORY_MISMATCH");

    const calendar = cloneRegistry();
    calendar.registrations[36]!.category = "stable_date";
    expectGateError(() => summarizeProjectGoldReleaseGate(calendar), "DATASET_CATEGORY_MISMATCH");
  });

  it("拒绝未登记数据集，不能用结构合法的任意案例填充空余配额", () => {
    const registry = cloneRegistry();
    registry.registrations.push(candidateRegistration({
      registrationId: "unknown-dataset:unknown-case",
      datasetId: "unknown-dataset",
      caseId: "unknown-case",
      caseFingerprint: "unknown|dataset|case"
    }));
    expectGateError(() => summarizeProjectGoldReleaseGate(registry), "UNKNOWN_DATASET");
  });

  it("拒绝把预登记的连续历表诊断窗口计入公农历金标配额", () => {
    const registry = cloneRegistry();
    registry.registrations.push(candidateRegistration({
      registrationId: `${P003_CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID}:window-2089-09-04`,
      datasetId: P003_CALENDAR_DIVERGENCE_WINDOWS_DATASET_ID,
      caseId: "window-2089-09-04",
      caseFingerprint: "diagnostic-window|2089-09-03|2089-10-04",
      category: "calendar_conversion"
    }));
    expectGateError(() => summarizeProjectGoldReleaseGate(registry), "NON_COUNTING_DATASET");
  });

  it("未知类别和错误配额均失败关闭", () => {
    const unknown = cloneRegistry() as unknown as { registrations: Array<{ category: string }> };
    unknown.registrations[0]!.category = "invented_gold_category";
    expectGateError(() => summarizeProjectGoldReleaseGate(unknown), "INVALID_FORMAT");

    const wrongQuota = cloneRegistry();
    wrongQuota.categoryQuotas.find((item) => item.category === "stable_date")!.quota = 29;
    expectGateError(() => summarizeProjectGoldReleaseGate(wrongQuota), "QUOTA_MISMATCH");
  });

  it("跨数据集案例 ID、登记映射和语义指纹必须全局唯一", () => {
    const duplicatedCase = cloneRegistry();
    const first = duplicatedCase.registrations[0]!;
    duplicatedCase.registrations.push(candidateRegistration({
      registrationId: "another-dataset:duplicated-case",
      datasetId: "another-dataset",
      caseId: first.caseId,
      caseFingerprint: "another-semantic-fingerprint"
    }));
    expectGateError(() => summarizeProjectGoldReleaseGate(duplicatedCase), "DUPLICATE_MAPPING");

    const duplicatedMapping = cloneRegistry();
    duplicatedMapping.registrations.push(structuredClone(duplicatedMapping.registrations[0]!));
    expectGateError(() => summarizeProjectGoldReleaseGate(duplicatedMapping), "DUPLICATE_MAPPING");

    const duplicatedFingerprint = cloneRegistry();
    duplicatedFingerprint.registrations.push(candidateRegistration({
      caseFingerprint: duplicatedFingerprint.registrations[0]!.caseFingerprint
    }));
    expectGateError(() => summarizeProjectGoldReleaseGate(duplicatedFingerprint), "DUPLICATE_MAPPING");
  });

  it("类别登记不能超过固定配额", () => {
    const registry = cloneRegistry();
    const knownMonthBoundaryDatasetId = registry.registrations[0]!.datasetId;
    registry.registrations.push(candidateRegistration({
      registrationId: `${knownMonthBoundaryDatasetId}:month-overflow`,
      datasetId: knownMonthBoundaryDatasetId,
      caseId: "month-overflow",
      caseFingerprint: "synthetic|month|overflow",
      category: "month_boundary"
    }));
    expectGateError(() => summarizeProjectGoldReleaseGate(registry), "CATEGORY_OVERFLOW");
  });

  it("不能把当前 candidate 补写字段后伪装成 verified", () => {
    const registry = cloneRegistry();
    registry.registrations[0]!.evidence = {
      status: "verified",
      authoritySourceIds: ["authority-a"],
      independentImplementationIds: ["implementation-b"],
      reviewerIds: ["reviewer-a", "reviewer-b"],
      decisionRecordRef: `sha256:${"a".repeat(64)}`,
      fixtureIntegrated: true
    };
    expectGateError(() => summarizeProjectGoldReleaseGate(registry), "DATASET_EVIDENCE_MISMATCH");

    const structurallyFalse = cloneRegistry() as unknown as { registrations: unknown[] };
    structurallyFalse.registrations.push(candidateRegistration({
      registrationId: "synthetic-dataset:false-verified",
      caseId: "false-verified",
      caseFingerprint: "synthetic|false|verified",
      evidence: {
        status: "verified",
        authoritySourceIds: [],
        independentImplementationIds: [],
        reviewerIds: [],
        decisionRecordRef: null,
        fixtureIntegrated: false
      }
    }));
    expectGateError(() => summarizeProjectGoldReleaseGate(structurallyFalse), "INVALID_FORMAT");
  });

  it("项目总计与逐类别声明任一不守恒都会失败关闭", () => {
    const total = cloneRegistry();
    total.declaredCounts.total += 1;
    expectGateError(() => summarizeProjectGoldReleaseGate(total), "COUNT_MISMATCH");

    const category = cloneRegistry();
    category.declaredCategoryCounts.find((item) => item.category === "month_boundary")!.candidate -= 1;
    expectGateError(() => summarizeProjectGoldReleaseGate(category), "COUNT_MISMATCH");
  });
});
