import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SINGLE_CHART_REPORT_PRESENTATION_CONTRACT } from "@hakimi/research-export";
import {
  findSingleChartReportBindingIssue,
  SingleChartReport
} from "./single-chart-report";

type ReportModel = Parameters<typeof findSingleChartReportBindingIssue>[0];
type CalculationSourceState = {
  downstreamSource: "stored_receipt" | "explicit_projection" | "not_evaluable";
  receiptLedgerStatus: "available" | "schema_unavailable";
  comparisonStatus: "matched" | "mismatch" | "exact_executor_unavailable" | "not_applicable";
  storedHistoricalOutputCompared: boolean;
};

const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;
const PILLAR_LABELS = ["年柱", "月柱", "日柱", "时柱"] as const;
const PILLAR_PROVENANCE_FIELDS = [
  "ganZhi",
  "hiddenStems",
  "stemTenGod",
  "branchTenGods",
  "wuXing",
  "nayin",
  "twelveGrowth",
  "xun",
  "voidBranches"
] as const;
const INTERPRETATION_KINDS = [
  "scope",
  "factor_ledger",
  "month_main_duplication",
  "subtotal",
  "classification",
  "sensitivity",
  "boundary"
] as const;
const INTERPRETATION_VISIBLE_CANONICAL_TEXT = "这是由冻结 Envelope 规范渲染器重建的工程候选句。";
const INTERPRETATION_BINDING_ID = "binding:core:derive-assessment";
const INTERPRETATION_EVIDENCE_SUBJECT_ID = "bazi.strength.binding.core.derive-assessment.v1";
const INTERPRETATION_SOURCE_ID = "hakimi-strength-core-0.1.0";
const INTERPRETATION_SOURCE_TITLE = "哈基米旺衰因素共享派生核";
const INTERPRETATION_SOURCE_URL = "/packages/bazi-interpretation/src/strength-assessment-core.ts";
const INTERPRETATION_SOURCE_REVISION = "hakimi-bazi-strength-ten-god-candidate/0.1.0";

function createAnonymousInterpretationEvidence() {
  const statements = INTERPRETATION_KINDS.map((kind, index) => ({
    statementId: `statement-${index + 1}`,
    order: index + 1,
    kind,
    text: INTERPRETATION_VISIBLE_CANONICAL_TEXT,
    classification: "supported" as const,
    displayStatus: "visible_with_evidence" as const,
    factIds: [`fact-${index + 1}`],
    ruleIds: [`rule-${index + 1}`],
    sourceBindingIds: [INTERPRETATION_BINDING_ID],
    registryLocatorVerifiedBindingIds: [INTERPRETATION_BINDING_ID],
    stabilityAssessmentIds: [],
    missingEvidence: [],
    conflictIds: [],
    rationale: "引用闭合只说明工程投影，未建立专家或科学真值。",
    sourceLocatorCoverage: "verified" as const,
    exactCanonicalRendererMatch: true as const
  }));
  return {
    status: "available" as const,
    reason: null,
    scope: "strength_engineering_candidate_only" as const,
    includeHour: true,
    envelopeProfileVersion: "hakimi.bazi.interpretation_evidence_envelope/0.2.0",
    envelopeContentVersion: "0.19.0",
    sourceRegistry: {
      profileVersion: "hakimi.bazi.strength_claim_registry/0.2.0",
      contentVersion: "0.18.0",
      registrySha256: null
    },
    payloadSha256: null,
    statements,
    assertionFamilies: INTERPRETATION_KINDS.map((kind) => ({
      kind,
      total: 1,
      displayable: 1,
      withheld: 0
    })),
    coverage: {
      statementsTotal: statements.length,
      displayable: statements.length,
      withheld: 0,
      assertionFamilies: INTERPRETATION_KINDS.length,
      referencedSourceBindings: 1,
      registryLocatorVerifiedBindings: 1,
      referencedSources: 1,
      pinnedRevisionSources: 1,
      sourceTextsIncluded: 0
    },
    admissionSummary: {
      visibility: "redacted" as const,
      sourceTextCopiedIntoAdmissionLedger: false as const
    },
    sources: [],
    sourceBindings: [],
    boundary: {
      referenceResolutionEstablishesSemanticTruth: false as const,
      expertTruthClaimed: false as const,
      scientificValidityClaimed: false as const,
      formalActivationAllowed: false as const,
      publicReleaseAuthorized: false as const,
      authenticityClaimed: false as const,
      sourceTextIncluded: false as const,
      locatorReviewEstablishesExactQuote: false as const,
      locatorVerificationEstablishesContentIdentity: false as const,
      sourceRegistrationEstablishesDistributionRights: false as const,
      citationTargetEstablishesSourceIdentity: false as const,
      admissionLedgerCopiesSourceText: false as const,
      citationReviewEstablishesSemanticTruth: false as const,
      rightsReviewEstablishesSemanticTruth: false as const,
      reviewerIdentityVerified: false as const,
      reviewerIndependenceVerified: false as const,
      overallGoodBad: null,
      result: null
    }
  };
}

function createReport(): ReportModel {
  const contract = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT;
  const marker = contract.anonymous.marker;
  const rows = (labels: readonly string[]) => labels.map((label) => ({ label, value: "测试值" }));
  const caseRows = rows(contract.rowLabels.case);
  Object.assign(caseRows[0]!, { value: "匿名案例" });
  Object.assign(caseRows[1]!, { value: "CASE" });
  Object.assign(caseRows[2]!, { value: "第 1 版 / R1" });
  Object.assign(caseRows[3]!, { value: marker });
  Object.assign(caseRows[4]!, { value: marker });
  const birthRows = rows(contract.rowLabels.birth);
  for (const label of ["地点", "坐标", "来源备注"]) {
    Object.assign(birthRows.find((row) => row.label === label)!, { value: marker });
  }
  const calibrationRows = rows(contract.rowLabels.calibration);
  Object.assign(calibrationRows.find((row) => row.label === "真太阳时预览")!, { value: marker });
  for (const label of ["时间校准警告", "计算警告"]) {
    Object.assign(calibrationRows.find((row) => row.label === label)!, { value: "0 条（匿名模式不展开）" });
  }
  const ruleRows = rows(contract.rowLabels.ruleUnbound);
  for (const label of ["规则说明", "规则来源"]) {
    Object.assign(ruleRows.find((row) => row.label === label)!, { value: marker });
  }
  const integrityRows = rows(contract.rowLabels.integrity);
  for (const label of ["结果哈希", "计算时间"]) {
    Object.assign(integrityRows.find((row) => row.label === label)!, { value: marker });
  }

  return {
    schemaVersion: contract.identity.schemaVersion,
    formatVersion: contract.identity.formatVersion,
    kind: contract.identity.kind,
    title: contract.identity.title,
    subtitle: "只读测试报告",
    caseReference: "CASE",
    revisionReference: "R1",
    caseLabel: "匿名案例",
    revisionLabel: "第 1 版 · 最新",
    previewNotice: contract.identity.previewNotice,
    privacyWarning: contract.identity.privacyWarning,
    anonymized: true,
    suggestedFileBase: "hakimi-chart-r1-anonymous",
    caseRows,
    birthRows,
    calibrationRows,
    ruleRows,
    integrityRows,
    pillars: PILLAR_KEYS.map((key, index) => ({
      key,
      label: PILLAR_LABELS[index],
      ganZhi: "甲子",
      stemTenGod: "比肩",
      hiddenStems: "癸",
      nayin: "海中金",
      xun: "甲子旬",
      voidBranches: "戌亥",
      branchTenGods: "正印",
      wuXing: "木水",
      twelveGrowth: "沐浴"
    })),
    provenance: PILLAR_KEYS.flatMap((pillar) => PILLAR_PROVENANCE_FIELDS.map((field) => ({
      field: `pillars.${pillar}.${field}`,
      kind: "rule_derived",
      algorithmId: marker,
      verificationStatus: "experimental",
      sourceRefs: [],
      note: marker
    }))),
    researchNotes: [],
    events: [],
    eventTimeDerivations: [],
    citations: [],
    redactions: [...contract.anonymous.redactions],
    calculationSource: {
      natalSource: "verified_stored_revision",
      notice: "当前发布代没有可读取的历史收据账本。",
      profileId: "explicit-projection-test",
      downstreamSource: "explicit_projection",
      receiptLedgerStatus: "schema_unavailable",
      comparisonStatus: "not_applicable",
      storedHistoricalOutputCompared: false,
      receiptReference: null,
      requestFingerprint: null,
      receiptDigest: null,
      projectionDigest: null,
      capturedAt: null,
      expertEvidenceStatus: "not_verified",
      components: contract.calculationComponents.map((component) => ({
        ...component,
        status: component.key === "transit" ? "not_requested" : "projected",
        executorId: component.key === "transit" ? null : `${component.key}-test`,
        resultDigest: null
      }))
    },
    interpretationEvidence: createAnonymousInterpretationEvidence()
  } as unknown as ReportModel;
}

function makeFullReport(report = createReport()): ReportModel {
  const record = report as unknown as {
    anonymized: boolean;
    caseLabel: string;
    caseReference: string;
    revisionLabel: string;
    revisionReference: string;
    suggestedFileBase: string;
    redactions: string[];
    calculationSource: ReportModel["calculationSource"];
    interpretationEvidence: ReportModel["interpretationEvidence"];
  };
  record.anonymized = false;
  record.caseLabel = "测试案例";
  record.caseReference = "case-test";
  record.revisionLabel = "第 1 版 · 最新";
  record.revisionReference = "revision-test";
  record.suggestedFileBase = "hakimi-chart-r1-full";
  record.redactions = [];
  record.calculationSource.projectionDigest = "a".repeat(64);
  record.calculationSource.components.forEach((component, index) => {
    if (component.status === "projected") component.resultDigest = String(index + 1).repeat(64);
  });
  record.interpretationEvidence.payloadSha256 = "b".repeat(64);
  record.interpretationEvidence.sources = [{
    sourceId: INTERPRETATION_SOURCE_ID,
    order: 1,
    sourceType: "engineering_contract",
    title: INTERPRETATION_SOURCE_TITLE,
    editionOrCarrier: "本仓源码；当前工程定义",
    url: INTERPRETATION_SOURCE_URL,
    stableRevision: INTERPRETATION_SOURCE_REVISION,
    registryVerificationStatus: "repository_policy_verified",
    workRightsStatus: "internal_project_source",
    carrierRightsStatus: "local_repository_only",
    usageBoundary: "只证明当前工程如何从命盘事实派生因素、五行关系与汇总，不证明命理或科学正确。",
    sourceRightsRecordStatus: "binding_scoped",
    expertTruthClaimed: false,
    scientificValidityClaimed: false
  }];
  record.interpretationEvidence.sourceBindings = [{
    bindingId: INTERPRETATION_BINDING_ID,
    evidenceSubjectId: INTERPRETATION_EVIDENCE_SUBJECT_ID,
    order: 1,
    sourceId: INTERPRETATION_SOURCE_ID,
    sourceType: "engineering_contract",
    evidenceRole: "defines_engineering_candidate",
    locator: {
      kind: "stable_symbol",
      value: "deriveBaziStrengthAssessment + collectBaziStrengthFactors",
      registryVerificationStatus: "verified",
      verificationScope: "repository_symbol_registration_only",
      contentSha256: null
    },
    parameterSupport: "exact_engineering_definition",
    supports: "当前工程从日主、透干、藏干与时柱可靠性派生完整因素账。",
    doesNotSupport: ["命理真值", "科学有效性", "用户吉凶"],
    mechanicalAdmission: {
      sourceIdentityStatus: "not_assessed",
      citationReviewState: "no_citation",
      redistributionState: "not_applicable_no_verified",
      candidateCitationReferences: [],
      verifiedCitationReferences: [],
      rejectedCitationReferences: [],
      redistributableVerifiedCitationReferences: []
    }
  }];
  record.interpretationEvidence.admissionSummary = {
    visibility: "full",
    evaluationStatus: "evaluated",
    bindingsTotal: 1,
    bindingsWithNonRejectedCitation: 0,
    bindingsWithVerifiedCitation: 0,
    bindingsWithRedistributableVerifiedCitation: 0,
    citationRecords: {
      matching: 0,
      structured: 0,
      candidate: 0,
      verified: 0,
      rejected: 0
    },
    knowledgeDocumentsBound: 0,
    sourceRightsRecordsBound: 0,
    sourceTextCopiedIntoAdmissionLedger: false,
    structuredCitationCoverage: "none",
    distributionRightsState: "no_matching_source_text"
  };
  return report;
}

function withMatchingInterpretationCitation(
  status: "user_candidate" | "verified" | "rejected",
  redistributableSourceRights = false
): ReportModel {
  const report = makeFullReport();
  const citation = {
    reference: "C1",
    status,
    statusLabel: SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.citationStatusLabels[status],
    targets: [
      "命盘字段 pillars.day.ganZhi",
      `证据主题 ${INTERPRETATION_EVIDENCE_SUBJECT_ID}`
    ],
    evidenceSubjectIds: [INTERPRETATION_EVIDENCE_SUBJECT_ID],
    quote: "测试引文",
    annotation: "仅用于机械准入合同测试。",
    decisionNote: status === "user_candidate" ? "" : "已按测试合同裁定。",
    reviewerCount: status === "verified" ? 2 : 0,
    locator: "section-1 · 第 1-1 行",
    source: {
      documentReference: "D1",
      title: "测试资料",
      author: "",
      edition: "",
      contentHash: "a".repeat(64),
      sourceUrl: "",
      publisher: "",
      publicationYear: "",
      origin: redistributableSourceRights ? "bundled" : "user_import",
      rightsStatus: redistributableSourceRights ? "licensed_verified" : "user_unverified",
      workStatus: redistributableSourceRights ? "public_domain_verified" : "unknown",
      editionStatus: redistributableSourceRights ? "licensed_verified" : "unknown",
      distributionPolicy: redistributableSourceRights ? "redistributable" : "local_private_only",
      reviewStatus: redistributableSourceRights ? "double_reviewed" : "unreviewed",
      redistributableSourceRights
    }
  };
  (report as unknown as { citations: unknown[] }).citations = [citation];
  const evidence = interpretationEvidenceRecord(report);
  const binding = (evidence.sourceBindings as Array<Record<string, unknown>>)[0]!;
  binding.mechanicalAdmission = {
    sourceIdentityStatus: "not_assessed",
    citationReviewState: status === "verified"
      ? "verified_present"
      : status === "user_candidate"
        ? "candidate_only"
        : "rejected_only",
    redistributionState: status !== "verified"
      ? "not_applicable_no_verified"
      : redistributableSourceRights
        ? "all_verified_sources_redistributable"
        : "no_verified_source_redistributable",
    candidateCitationReferences: status === "user_candidate" ? ["C1"] : [],
    verifiedCitationReferences: status === "verified" ? ["C1"] : [],
    rejectedCitationReferences: status === "rejected" ? ["C1"] : [],
    redistributableVerifiedCitationReferences: status === "verified" && redistributableSourceRights
      ? ["C1"]
      : []
  };
  evidence.admissionSummary = {
    visibility: "full",
    evaluationStatus: "evaluated",
    bindingsTotal: 1,
    bindingsWithNonRejectedCitation: status === "rejected" ? 0 : 1,
    bindingsWithVerifiedCitation: status === "verified" ? 1 : 0,
    bindingsWithRedistributableVerifiedCitation: status === "verified" && redistributableSourceRights ? 1 : 0,
    citationRecords: {
      matching: 1,
      structured: status === "rejected" ? 0 : 1,
      candidate: status === "user_candidate" ? 1 : 0,
      verified: status === "verified" ? 1 : 0,
      rejected: status === "rejected" ? 1 : 0
    },
    knowledgeDocumentsBound: 1,
    sourceRightsRecordsBound: 1,
    sourceTextCopiedIntoAdmissionLedger: false,
    structuredCitationCoverage: status === "rejected" ? "none" : "complete",
    distributionRightsState: redistributableSourceRights
      ? "all_matching_source_text_redistributable"
      : "contains_nonredistributable_source_text"
  };
  return report;
}

function setCalculationSourceState(report: ReportModel, state: CalculationSourceState): ReportModel {
  Object.assign((report as unknown as { calculationSource: CalculationSourceState }).calculationSource, state);
  return report;
}

function firstProvenance(report: ReportModel): Record<string, unknown> {
  return (report as unknown as { provenance: Record<string, unknown>[] }).provenance[0];
}

function interpretationEvidenceRecord(report: ReportModel): Record<string, unknown> {
  return (report as unknown as { interpretationEvidence: Record<string, unknown> }).interpretationEvidence;
}

function interpretationStatements(report: ReportModel): Array<Record<string, unknown>> {
  return interpretationEvidenceRecord(report).statements as Array<Record<string, unknown>>;
}

describe("SingleChartReport binding contracts", () => {
  it("accepts the current anonymous projection and stored-receipt positive states", () => {
    const anonymousProjection = createReport();
    expect(findSingleChartReportBindingIssue(anonymousProjection)).toBeNull();

    const storedReceipt = setCalculationSourceState(createReport(), {
      downstreamSource: "stored_receipt",
      receiptLedgerStatus: "available",
      comparisonStatus: "matched",
      storedHistoricalOutputCompared: true
    });
    expect(findSingleChartReportBindingIssue(storedReceipt)).toBeNull();
  });

  it("accepts a stored receipt when its exact executor is unavailable without claiming a completed comparison", () => {
    const report = setCalculationSourceState(createReport(), {
      downstreamSource: "stored_receipt",
      receiptLedgerStatus: "available",
      comparisonStatus: "exact_executor_unavailable",
      storedHistoricalOutputCompared: false
    });
    expect(findSingleChartReportBindingIssue(report)).toBeNull();
  });

  it("rejects anonymous provenance source references and nonblank notes without echoing canaries", () => {
    const cases = [
      {
        canary: "private-document-reference-canary",
        mutate: (report: ReportModel) => {
          firstProvenance(report).sourceRefs = ["private-document-reference-canary"];
        }
      },
      {
        canary: "private-provenance-note-canary",
        mutate: (report: ReportModel) => {
          firstProvenance(report).note = "private-provenance-note-canary";
        }
      }
    ];

    for (const testCase of cases) {
      const report = createReport();
      testCase.mutate(report);
      const issue = findSingleChartReportBindingIssue(report);
      expect(issue).toBe("匿名报告的字段来源链仍携带来源引用或备注");
      expect(issue).not.toContain(testCase.canary);

      const view = render(<SingleChartReport report={report} />);
      expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
      expect(document.body.textContent).not.toContain(testCase.canary);
      view.unmount();
    }
  });

  it("只接受当前匿名 provenance 固定移除标记，并拒绝旧空值或其他类型", () => {
    const current = createReport();
    firstProvenance(current).note = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.anonymous.marker;
    expect(findSingleChartReportBindingIssue(current)).toBeNull();

    for (const note of [null, undefined, "", " \t\n"]) {
      const legacy = createReport();
      firstProvenance(legacy).note = note;
      expect(findSingleChartReportBindingIssue(legacy)).toBe("报告未通过当前单盘报告结构与语义契约");
    }

    const invalid = createReport();
    firstProvenance(invalid).note = { private: "object-note-canary" };
    const issue = findSingleChartReportBindingIssue(invalid);
    expect(issue).not.toBeNull();
    expect(issue).not.toContain("object-note-canary");
  });

  it("requires real four-pillar provenance coverage and contract enums while safely redacting extensions", () => {
    const extended = makeFullReport();
    (extended as unknown as { provenance: Record<string, unknown>[] }).provenance.push({
      field: "calendar.solarText",
      kind: "calendar_fact",
      algorithmId: "calendar-test",
      verificationStatus: "adjudicated",
      sourceRefs: [],
      note: "（匿名模式已移除）"
    });
    expect(findSingleChartReportBindingIssue(extended)).toBeNull();

    const placeholder = createReport();
    (placeholder as unknown as { provenance: Record<string, unknown>[] }).provenance.push({
      field: "字段 37（非标准路径已移除）",
      kind: "rule_derived",
      algorithmId: SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.anonymous.marker,
      verificationStatus: "experimental",
      sourceRefs: [],
      note: "（匿名模式已移除）"
    });
    expect(findSingleChartReportBindingIssue(placeholder)).toBeNull();

    const leakedExtension = createReport();
    (leakedExtension as unknown as { provenance: Record<string, unknown>[] }).provenance.push({
      field: "private.person.name-canary",
      kind: "rule_derived",
      algorithmId: SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.anonymous.marker,
      verificationStatus: "experimental",
      sourceRefs: [],
      note: "（匿名模式已移除）"
    });
    const leakedExtensionIssue = findSingleChartReportBindingIssue(leakedExtension);
    expect(leakedExtensionIssue).toBe("匿名报告的非规范字段来源未使用固定移除占位");
    expect(leakedExtensionIssue).not.toContain("private.person.name-canary");

    const missing = createReport();
    (missing as unknown as { provenance: Record<string, unknown>[] }).provenance = (
      missing as unknown as { provenance: Record<string, unknown>[] }
    ).provenance.filter((item) => item.field !== "pillars.hour.voidBranches");
    expect(findSingleChartReportBindingIssue(missing)).toBe("字段来源链未完整覆盖四柱报告字段");

    const invalidKind = createReport();
    firstProvenance(invalidKind).kind = "calculated-canary";
    const invalidKindIssue = findSingleChartReportBindingIssue(invalidKind);
    expect(invalidKindIssue).toBe("字段来源链包含未识别的来源类型");
    expect(invalidKindIssue).not.toContain("calculated-canary");
    const paddedKind = createReport();
    firstProvenance(paddedKind).kind = " rule_derived ";
    expect(findSingleChartReportBindingIssue(paddedKind)).toBe("字段来源链包含未识别的来源类型");

    const invalidVerification = createReport();
    firstProvenance(invalidVerification).verificationStatus = "engine-verified-canary";
    const invalidVerificationIssue = findSingleChartReportBindingIssue(invalidVerification);
    expect(invalidVerificationIssue).toBe("字段来源链包含未识别的核验状态");
    expect(invalidVerificationIssue).not.toContain("engine-verified-canary");
    const paddedVerification = createReport();
    firstProvenance(paddedVerification).verificationStatus = " experimental ";
    expect(findSingleChartReportBindingIssue(paddedVerification)).toBe("字段来源链包含未识别的核验状态");
  });

  it("rejects contradictory ledger, source, comparison, and comparison-evidence combinations", () => {
    const contradictions: CalculationSourceState[] = [
      {
        downstreamSource: "stored_receipt",
        receiptLedgerStatus: "schema_unavailable",
        comparisonStatus: "not_applicable",
        storedHistoricalOutputCompared: false
      },
      {
        downstreamSource: "explicit_projection",
        receiptLedgerStatus: "schema_unavailable",
        comparisonStatus: "matched",
        storedHistoricalOutputCompared: false
      },
      {
        downstreamSource: "explicit_projection",
        receiptLedgerStatus: "schema_unavailable",
        comparisonStatus: "not_applicable",
        storedHistoricalOutputCompared: true
      },
      {
        downstreamSource: "explicit_projection",
        receiptLedgerStatus: "available",
        comparisonStatus: "mismatch",
        storedHistoricalOutputCompared: true
      },
      {
        downstreamSource: "stored_receipt",
        receiptLedgerStatus: "available",
        comparisonStatus: "matched",
        storedHistoricalOutputCompared: false
      },
      {
        downstreamSource: "stored_receipt",
        receiptLedgerStatus: "available",
        comparisonStatus: "not_applicable",
        storedHistoricalOutputCompared: false
      },
      {
        downstreamSource: "explicit_projection",
        receiptLedgerStatus: "available",
        comparisonStatus: "exact_executor_unavailable",
        storedHistoricalOutputCompared: false
      }
    ];

    for (const state of contradictions) {
      const report = setCalculationSourceState(createReport(), state);
      expect(findSingleChartReportBindingIssue(report)).toBe(
        "下游计算来源的账本、来源、复演与历史比对状态组合不一致"
      );
    }
  });

  it("把当前 schema identity、匿名标识与严格对象结构绑定到展示门且不回显 canary", () => {
    const cases: Array<(report: ReportModel) => void> = [
      (report) => { (report as unknown as { formatVersion: string }).formatVersion = "99.0.0"; },
      (report) => { delete (report as unknown as { schemaVersion?: string }).schemaVersion; },
      (report) => { (report as unknown as { kind: string }).kind = "future-report-kind"; },
      (report) => { (report as unknown as { caseLabel: string }).caseLabel = "PRIVATE-CASE-LABEL-CANARY"; },
      (report) => { (report as unknown as { caseReference: string }).caseReference = "PRIVATE-CASE-ID-CANARY"; },
      (report) => {
        (report as unknown as { caseRows: Array<{ value: string }> }).caseRows[0]!.value = "PRIVATE-ROW-CANARY";
      },
      (report) => { firstProvenance(report).algorithmId = "PRIVATE-ALGORITHM-CANARY"; },
      (report) => { (report as unknown as Record<string, unknown>).unexpectedPrivateField = "PRIVATE-EXTRA-CANARY"; }
    ];

    for (const mutate of cases) {
      const report = createReport();
      mutate(report);
      const issue = findSingleChartReportBindingIssue(report);
      expect(issue).not.toBeNull();
      expect(issue).not.toContain("PRIVATE-");
      const view = render(<SingleChartReport report={report} />);
      expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
      expect(document.body.textContent).not.toContain("PRIVATE-");
      view.unmount();
    }
  });

  it("拒绝组件位置、来源状态与完整收据元数据的畸形对象，避免 React child 崩溃", () => {
    const malformedReports = [
      (() => {
        const report = createReport();
        (report as unknown as { calculationSource: { components: unknown[] } }).calculationSource.components.splice(1);
        return report;
      })(),
      (() => {
        const report = createReport();
        const component = (report as unknown as { calculationSource: { components: Array<Record<string, unknown>> } }).calculationSource.components[0]!;
        component.label = "Transit";
        return report;
      })(),
      (() => {
        const report = createReport();
        const source = (report as unknown as { calculationSource: Record<string, unknown> }).calculationSource;
        source.downstreamSource = "not_evaluable";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        (report as unknown as { calculationSource: Record<string, unknown> }).calculationSource.receiptReference = {
          private: "PRIVATE-RECEIPT-OBJECT-CANARY"
        };
        return report;
      })()
    ];

    for (const report of malformedReports) {
      expect(findSingleChartReportBindingIssue(report)).not.toBeNull();
      expect(() => {
        const view = render(<SingleChartReport report={report} />);
        expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
        expect(document.body.textContent).not.toContain("PRIVATE-RECEIPT-OBJECT-CANARY");
        view.unmount();
      }).not.toThrow();
    }
  });

  it("绑定引用状态标签与复核计数，并允许 Note/Event 使用各自命名空间中的相同引用", () => {
    const citation = {
      reference: "C1",
      status: "user_candidate" as const,
      statusLabel: SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.citationStatusLabels.user_candidate,
      targets: ["命盘字段 pillars.day.ganZhi"],
      evidenceSubjectIds: [],
      quote: "测试引文",
      annotation: "测试批注",
      decisionNote: "",
      reviewerCount: 0,
      locator: "section-1 · 第 1-1 行",
      source: {
        documentReference: "D1",
        title: "测试资料",
        author: "",
        edition: "",
        contentHash: "a".repeat(64),
        sourceUrl: "",
        publisher: "",
        publicationYear: "",
        origin: "user_import" as const,
        rightsStatus: "user_unverified",
        workStatus: "unknown",
        editionStatus: "unknown",
        distributionPolicy: "local_private_only",
        reviewStatus: "unreviewed",
        redistributableSourceRights: false
      }
    };
    const wrongLabel = makeFullReport();
    (wrongLabel as unknown as { citations: unknown[] }).citations = [{ ...citation, statusLabel: "双人核验" }];
    expect(findSingleChartReportBindingIssue(wrongLabel)).toBe(
      "结构化引用的状态标签或裁定说明未与 candidate / verified / rejected 状态闭合"
    );

    const unreviewedVerified = makeFullReport();
    (unreviewedVerified as unknown as { citations: unknown[] }).citations = [{
      ...citation,
      status: "verified",
      statusLabel: "双人核验",
      decisionNote: "已裁定",
      reviewerCount: 0
    }];
    expect(findSingleChartReportBindingIssue(unreviewedVerified)).toBe("已核验引用缺少至少两名复核者");

    const namespaced = makeFullReport();
    const entry = {
      reference: "shared-reference",
      title: "测试研究条目",
      meta: [{ label: "状态", value: "测试" }],
      body: "测试正文",
      sourceRefs: []
    };
    (namespaced as unknown as { researchNotes: unknown[]; events: unknown[] }).researchNotes = [{ ...entry }];
    (namespaced as unknown as { researchNotes: unknown[]; events: unknown[] }).events = [{ ...entry }];
    expect(findSingleChartReportBindingIssue(namespaced)).toBeNull();
    const view = render(<SingleChartReport report={namespaced} />);
    expect(screen.getAllByText("shared-reference")).toHaveLength(2);
    view.unmount();
  });

  it("v1.7 接受 candidate、rejected、verified 与机械可再分发的 binding scoped 准入闭合", () => {
    for (const report of [
      withMatchingInterpretationCitation("user_candidate"),
      withMatchingInterpretationCitation("rejected"),
      withMatchingInterpretationCitation("verified"),
      withMatchingInterpretationCitation("verified", true)
    ]) {
      expect(findSingleChartReportBindingIssue(report)).toBeNull();
    }

    const view = render(<SingleChartReport report={withMatchingInterpretationCitation("verified", true)} />);
    expect(document.body.textContent).toContain(INTERPRETATION_EVIDENCE_SUBJECT_ID);
    expect(document.body.textContent).toContain("存在 verified Citation");
    expect(document.body.textContent).toContain("全部 verified 来源机械满足可再分发条件");
    expect(document.body.textContent).toContain("not_assessed（未评估）");
    expect(document.body.textContent).toContain("verified 不等于内容正确或专家审定");
    expect(document.body.textContent).toContain("redistributable 不等于内容正确、专家审定或公开发布授权");
    view.unmount();
  });

  it("Web binding 只把同一 C# 的可见 chart_field + binding subject 合取计入准入", () => {
    const clearAdmission = (report: ReportModel) => {
      const evidence = interpretationEvidenceRecord(report);
      const binding = (evidence.sourceBindings as Array<Record<string, unknown>>)[0]!;
      binding.mechanicalAdmission = {
        sourceIdentityStatus: "not_assessed",
        citationReviewState: "no_citation",
        redistributionState: "not_applicable_no_verified",
        candidateCitationReferences: [],
        verifiedCitationReferences: [],
        rejectedCitationReferences: [],
        redistributableVerifiedCitationReferences: []
      };
      evidence.admissionSummary = {
        visibility: "full",
        evaluationStatus: "evaluated",
        bindingsTotal: 1,
        bindingsWithNonRejectedCitation: 0,
        bindingsWithVerifiedCitation: 0,
        bindingsWithRedistributableVerifiedCitation: 0,
        citationRecords: { matching: 0, structured: 0, candidate: 0, verified: 0, rejected: 0 },
        knowledgeDocumentsBound: 0,
        sourceRightsRecordsBound: 0,
        sourceTextCopiedIntoAdmissionLedger: false,
        structuredCitationCoverage: "none",
        distributionRightsState: "no_matching_source_text"
      };
    };

    const subjectOnly = withMatchingInterpretationCitation("user_candidate");
    const subjectOnlyCitation = (
      subjectOnly as unknown as { citations: Array<Record<string, unknown>> }
    ).citations[0]!;
    subjectOnlyCitation.targets = [`证据主题 ${INTERPRETATION_EVIDENCE_SUBJECT_ID}`];
    clearAdmission(subjectOnly);
    expect(findSingleChartReportBindingIssue(subjectOnly)).toBeNull();

    const splitAcrossCitations = withMatchingInterpretationCitation("user_candidate");
    const splitCitations = (
      splitAcrossCitations as unknown as { citations: Array<Record<string, unknown>> }
    ).citations;
    const chartOnly = splitCitations[0]!;
    const subjectOnlySecond = structuredClone(chartOnly);
    chartOnly.targets = ["命盘字段 pillars.day.ganZhi"];
    chartOnly.evidenceSubjectIds = [];
    subjectOnlySecond.reference = "C2";
    subjectOnlySecond.targets = [`证据主题 ${INTERPRETATION_EVIDENCE_SUBJECT_ID}`];
    splitCitations.push(subjectOnlySecond);
    clearAdmission(splitAcrossCitations);
    expect(findSingleChartReportBindingIssue(splitAcrossCitations)).toBeNull();
  });

  it("同一 D# 可由多条连续 C# 复用，但 summary 只按唯一 D# 计算资料与权利记录", () => {
    const report = withMatchingInterpretationCitation("user_candidate");
    const citations = (report as unknown as { citations: Array<Record<string, unknown>> }).citations;
    const secondCitation = structuredClone(citations[0]!);
    secondCitation.reference = "C2";
    citations.push(secondCitation);
    const evidence = interpretationEvidenceRecord(report);
    const binding = (evidence.sourceBindings as Array<Record<string, unknown>>)[0]!;
    (binding.mechanicalAdmission as Record<string, unknown>).candidateCitationReferences = ["C1", "C2"];
    const summary = evidence.admissionSummary as Record<string, unknown>;
    const citationRecords = summary.citationRecords as Record<string, unknown>;
    citationRecords.matching = 2;
    citationRecords.structured = 2;
    citationRecords.candidate = 2;

    expect(findSingleChartReportBindingIssue(report)).toBeNull();
    expect(summary.knowledgeDocumentsBound).toBe(1);
    expect(summary.sourceRightsRecordsBound).toBe(1);

    summary.knowledgeDocumentsBound = 2;
    summary.sourceRightsRecordsBound = 2;
    expect(findSingleChartReportBindingIssue(report)).toBe(
      "旺衰叙事机械准入摘要未与 binding ledger 及完整报告 Citation 投影闭合"
    );
  });

  it("同一 D# 即使 contentHash 相同也拒绝任何资料或权利投影差异", () => {
    const mutations: Array<(source: Record<string, unknown>) => void> = [
      (source) => { source.title = "同 hash 的另一标题"; },
      (source) => { source.origin = "bundled"; },
      (source) => { source.rightsStatus = "blocked"; }
    ];

    for (const mutateSource of mutations) {
      const report = withMatchingInterpretationCitation("user_candidate");
      const citations = (report as unknown as { citations: Array<Record<string, unknown>> }).citations;
      const secondCitation = structuredClone(citations[0]!);
      secondCitation.reference = "C2";
      mutateSource(secondCitation.source as Record<string, unknown>);
      citations.push(secondCitation);

      expect(findSingleChartReportBindingIssue(report)).toBe(
        "同一报告内 D# KnowledgeDocument 引用必须指向完全相同的资料与权利投影"
      );
    }
  });

  it("v1.7 对 C#、evidence subject、来源权利、source identity、机械分区与摘要矛盾失败关闭", () => {
    const malformedReports: ReportModel[] = [
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        ((report as unknown as { citations: Array<Record<string, unknown>> }).citations[0]!).reference = "C2";
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        const source = ((report as unknown as { citations: Array<{ source: Record<string, unknown> }> }).citations[0]!).source;
        source.documentReference = "D2";
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        const citations = (report as unknown as { citations: Array<Record<string, unknown>> }).citations;
        const second = structuredClone(citations[0]!);
        second.reference = "C2";
        (second.source as Record<string, unknown>).contentHash = "b".repeat(64);
        citations.push(second);
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        ((report as unknown as { citations: Array<Record<string, unknown>> }).citations[0]!).evidenceSubjectIds = [
          "bazi.strength.binding.unknown.v1"
        ];
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        const citation = (report as unknown as { citations: Array<Record<string, unknown>> }).citations[0]!;
        citation.evidenceSubjectIds = [INTERPRETATION_EVIDENCE_SUBJECT_ID, INTERPRETATION_EVIDENCE_SUBJECT_ID];
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        const citation = (report as unknown as { citations: Array<Record<string, unknown>> }).citations[0]!;
        citation.targets = ["旺衰工程候选因素账"];
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        const citation = (report as unknown as { citations: Array<Record<string, unknown>> }).citations[0]!;
        citation.targets = [
          `证据主题 ${INTERPRETATION_EVIDENCE_SUBJECT_ID}`,
          `证据主题 ${INTERPRETATION_EVIDENCE_SUBJECT_ID}`
        ];
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("verified", true);
        const source = ((report as unknown as { citations: Array<{ source: Record<string, unknown> }> }).citations[0]!).source;
        source.redistributableSourceRights = false;
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("user_candidate");
        const source = ((report as unknown as { citations: Array<{ source: Record<string, unknown> }> }).citations[0]!).source;
        source.reviewStatus = "pending";
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("verified");
        const binding = (interpretationEvidenceRecord(report).sourceBindings as Array<Record<string, unknown>>)[0]!;
        (binding.mechanicalAdmission as Record<string, unknown>).sourceIdentityStatus = "verified";
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("verified");
        const binding = (interpretationEvidenceRecord(report).sourceBindings as Array<Record<string, unknown>>)[0]!;
        (binding.mechanicalAdmission as Record<string, unknown>).verifiedCitationReferences = [];
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("verified");
        const summary = interpretationEvidenceRecord(report).admissionSummary as Record<string, unknown>;
        summary.bindingsWithVerifiedCitation = 0;
        return report;
      })(),
      (() => {
        const report = withMatchingInterpretationCitation("verified");
        const summary = interpretationEvidenceRecord(report).admissionSummary as Record<string, unknown>;
        summary.evaluationStatus = "not_evaluated_interpretation_withheld";
        return report;
      })()
    ];

    for (const report of malformedReports) {
      expect(findSingleChartReportBindingIssue(report)).not.toBeNull();
      const view = render(<SingleChartReport report={report} />);
      expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
      view.unmount();
    }
  });

  it("在共享展示容量边界内接受正文，并在解析前拒绝超限文本", () => {
    const atLimit = createReport();
    (atLimit as unknown as { subtitle: string }).subtitle = "界".repeat(
      SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.bodyCharacters
    );
    expect(findSingleChartReportBindingIssue(atLimit)).toBeNull();

    const overLimit = createReport();
    (overLimit as unknown as { subtitle: string }).subtitle = "界".repeat(
      SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.bodyCharacters + 1
    );
    expect(findSingleChartReportBindingIssue(overLimit)).toBe("报告缺少或无法安全显示正文：subtitle");
  });

  it("在 React 大规模构造前按共享 whole-report aggregate 上限拒绝并且不回显 canary", () => {
    const report = makeFullReport();
    const limits = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits;
    const canary = "PRIVATE-WEB-AGGREGATE-CANARY-4814";
    const provenance = (report as unknown as { provenance: Array<Record<string, unknown>> }).provenance;
    provenance.forEach((item, index) => {
      item.note = index === 0
        ? `${canary}${"𠀀".repeat(limits.bodyCharacters - canary.length)}`
        : "𠀀".repeat(limits.bodyCharacters);
    });
    const seed = structuredClone(provenance[0]);
    if (!seed) throw new Error("测试报告缺少 provenance");
    while (provenance.length < 43) {
      provenance.push({
        ...structuredClone(seed),
        field: `aggregate.extension.${provenance.length + 1}`,
        note: "𠀀".repeat(limits.bodyCharacters)
      });
    }

    const issue = findSingleChartReportBindingIssue(report);
    expect(issue).toBe(
      `单盘报告 aggregate 文本超过 ${limits.aggregateCodePoints} Unicode code points 安全展示上限`
    );
    expect(issue).not.toContain(canary);

    const view = render(<SingleChartReport report={report} />);
    expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
    expect(document.body.textContent).not.toContain(canary);
    view.unmount();
  });

  it("在任何字段读取前拒绝顶层与嵌套的隐藏 getter，失败卡不执行或回显 canary", () => {
    const issue = "报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象";

    const topLevel = createReport();
    const topLevelCanary = "PRIVATE-HIDDEN-TOP-LEVEL-CANARY-1942";
    let topLevelGetterCalls = 0;
    Object.defineProperty(topLevel, "interpretationEvidence", {
      configurable: true,
      enumerable: false,
      get() {
        topLevelGetterCalls += 1;
        return topLevelCanary;
      }
    });
    expect(findSingleChartReportBindingIssue(topLevel)).toBe(issue);
    expect(topLevelGetterCalls).toBe(0);
    const topLevelView = render(<SingleChartReport report={topLevel} />);
    expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
    expect(document.body.textContent).not.toContain(topLevelCanary);
    expect(topLevelGetterCalls).toBe(0);
    topLevelView.unmount();

    const nested = makeFullReport();
    const nestedCanary = "PRIVATE-HIDDEN-NESTED-CANARY-7638";
    let nestedGetterCalls = 0;
    const source = (nested.interpretationEvidence.sources as Array<Record<string, unknown>>)[0]!;
    Object.defineProperty(source, "title", {
      configurable: true,
      enumerable: false,
      get() {
        nestedGetterCalls += 1;
        return nestedCanary;
      }
    });
    expect(findSingleChartReportBindingIssue(nested)).toBe(issue);
    expect(nestedGetterCalls).toBe(0);
    const nestedView = render(<SingleChartReport report={nested} />);
    expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
    expect(document.body.textContent).not.toContain(nestedCanary);
    expect(nestedGetterCalls).toBe(0);
    nestedView.unmount();
  });

  it("同一报告对象原地变成隐藏 getter 后会在下一次渲染重新失败关闭", () => {
    const report = createReport();
    const canary = "PRIVATE-SAME-IDENTITY-RERENDER-CANARY-5129";
    let getterCalls = 0;
    const view = render(<SingleChartReport report={report} />);
    expect(screen.queryByRole("alert")).toBeNull();

    Object.defineProperty(report, "subtitle", {
      configurable: true,
      enumerable: false,
      get() {
        getterCalls += 1;
        return canary;
      }
    });
    view.rerender(<SingleChartReport report={report} />);

    expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
    expect(document.body.textContent).not.toContain(canary);
    expect(getterCalls).toBe(0);
    view.unmount();
  });

  it("校验与渲染只消费自有数据快照，不读取透明 Proxy 的 get trap", () => {
    const source = createReport();
    const canary = "PRIVATE-PROXY-GET-CANARY-8463";
    let getTrapCalls = 0;
    const report = new Proxy(source, {
      get(target, key, receiver) {
        getTrapCalls += 1;
        if (key === "title") return canary;
        return Reflect.get(target, key, receiver);
      }
    }) as ReportModel;

    expect(findSingleChartReportBindingIssue(report)).toBeNull();
    expect(getTrapCalls).toBe(0);
    const view = render(<SingleChartReport report={report} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("heading", { name: SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.identity.title })).toBeTruthy();
    expect(document.body.textContent).not.toContain(canary);
    expect(getTrapCalls).toBe(0);
    view.unmount();
  });

  it("不让 Object.prototype 污染把 accessor 伪装成 data descriptor 或补齐缺失字段", () => {
    const accessorReport = createReport();
    let sourceGetterCalls = 0;
    let inheritedValueGetterCalls = 0;
    Object.defineProperty(accessorReport, "interpretationEvidence", {
      configurable: true,
      enumerable: true,
      get() {
        sourceGetterCalls += 1;
        return "PRIVATE-PROTOTYPE-DESCRIPTOR-CANARY-3308";
      }
    });

    const missingFieldReport = createReport() as unknown as Record<string, unknown>;
    delete missingFieldReport.title;
    let inheritedTitleGetterCalls = 0;
    let accessorIssue: string | null = null;
    let missingFieldIssue: string | null = null;
    const previousValue = Object.getOwnPropertyDescriptor(Object.prototype, "value");
    const previousTitle = Object.getOwnPropertyDescriptor(Object.prototype, "title");
    try {
      Object.defineProperty(Object.prototype, "title", {
        configurable: true,
        get() {
          inheritedTitleGetterCalls += 1;
          return "PRIVATE-INHERITED-TITLE-CANARY-3310";
        }
      });
      Object.defineProperty(Object.prototype, "value", {
        configurable: true,
        get() {
          inheritedValueGetterCalls += 1;
          return "PRIVATE-INHERITED-DESCRIPTOR-VALUE-CANARY-3309";
        }
      });
      accessorIssue = findSingleChartReportBindingIssue(accessorReport);
      missingFieldIssue = findSingleChartReportBindingIssue(missingFieldReport as unknown as ReportModel);
    } finally {
      if (previousValue) Object.defineProperty(Object.prototype, "value", previousValue);
      else Reflect.deleteProperty(Object.prototype, "value");
      if (previousTitle) Object.defineProperty(Object.prototype, "title", previousTitle);
      else Reflect.deleteProperty(Object.prototype, "title");
    }

    expect(accessorIssue).toBe("报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象");
    expect(missingFieldIssue).toBe("缺少或无法安全显示必要报告字段：title");
    expect(sourceGetterCalls).toBe(0);
    expect(inheritedValueGetterCalls).toBe(0);
    expect(inheritedTitleGetterCalls).toBe(0);
  });

  it("在完整 descriptor 复制前拒绝超长数组、超量对象键与稀疏数组", () => {
    const oversizedArrayReport = createReport() as unknown as Record<string, unknown>;
    let oversizedArrayOwnKeysCalls = 0;
    oversizedArrayReport.extra = new Proxy(new Array(513), {
      ownKeys(target) {
        oversizedArrayOwnKeysCalls += 1;
        return Reflect.ownKeys(target);
      }
    });
    expect(findSingleChartReportBindingIssue(oversizedArrayReport as unknown as ReportModel)).toBe(
      "报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象"
    );
    expect(oversizedArrayOwnKeysCalls).toBe(0);

    const oversizedObjectReport = createReport() as unknown as Record<string, unknown>;
    const oversizedObject = Object.fromEntries(
      Array.from({ length: 1_025 }, (_, index) => [`key-${index}`, false])
    );
    let oversizedObjectDescriptorCalls = 0;
    oversizedObjectReport.extra = new Proxy(oversizedObject, {
      getOwnPropertyDescriptor(target, key) {
        oversizedObjectDescriptorCalls += 1;
        return Reflect.getOwnPropertyDescriptor(target, key);
      }
    });
    expect(findSingleChartReportBindingIssue(oversizedObjectReport as unknown as ReportModel)).toBe(
      "报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象"
    );
    expect(oversizedObjectDescriptorCalls).toBe(0);

    const sparseArrayReport = createReport();
    (sparseArrayReport as unknown as { redactions: string[] }).redactions = new Array(1);
    expect(findSingleChartReportBindingIssue(sparseArrayReport)).toBe(
      "报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象"
    );
  });

  it("快照全图预算覆盖共享合同允许的 provenance 与嵌套 sourceRefs 上限", () => {
    const report = makeFullReport();
    const limits = SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits;
    const provenance = (report as unknown as { provenance: Array<Record<string, unknown>> }).provenance;
    while (provenance.length < limits.collections.provenance) {
      const index = provenance.length;
      provenance.push({
        field: `extension.contract-max.${index}`,
        kind: "rule_derived",
        algorithmId: "contract-max",
        verificationStatus: "experimental",
        sourceRefs: Array.from(
          { length: limits.nestedEntries },
          (_, sourceIndex) => `r${sourceIndex}`
        ),
        note: ""
      });
    }
    expect(provenance).toHaveLength(limits.collections.provenance);
    expect(findSingleChartReportBindingIssue(report)).toBeNull();
  });

  it("根与嵌套 revoked Proxy 都返回失败关闭问题而不是让 React render 抛错", () => {
    const rootRevocable = Proxy.revocable(createReport(), {});
    rootRevocable.revoke();
    expect(findSingleChartReportBindingIssue(rootRevocable.proxy as ReportModel)).toBe(
      "报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象"
    );
    const view = render(<SingleChartReport report={rootRevocable.proxy as ReportModel} />);
    expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
    view.unmount();

    const nestedReport = createReport() as unknown as Record<string, unknown>;
    const nestedRevocable = Proxy.revocable({}, {});
    nestedReport.extra = nestedRevocable.proxy;
    nestedRevocable.revoke();
    expect(findSingleChartReportBindingIssue(nestedReport as unknown as ReportModel)).toBe(
      "报告包含不可安全读取的隐藏属性、访问器或非 JSON 对象"
    );
  });

  it("展示旺衰叙事证据目录、逐句规范正文与摘要，同时保持 legacy-v13 发布身份边界", () => {
    const report = createReport();
    const view = render(<SingleChartReport report={report} />);

    expect(screen.getByRole("navigation", { name: "单盘报告章节目录" }).textContent).toContain("旺衰叙事证据");
    expect(screen.getByRole("heading", { name: /^旺衰叙事证据/ })).toBeTruthy();
    expect(screen.getAllByText(INTERPRETATION_VISIBLE_CANONICAL_TEXT)).toHaveLength(INTERPRETATION_KINDS.length);
    expect(screen.getByText("逐句规范重建与机械准入，不是内容、专家或发布真值")).toBeTruthy();
    expect(document.querySelector('[data-evidence-metric="interpretation-total"]')?.textContent).toContain("7");
    expect(document.querySelector('[data-evidence-metric="interpretation-displayable"]')?.textContent).toContain("7");
    expect(document.querySelector('[data-evidence-metric="interpretation-withheld"]')?.textContent).toContain("0");

    const root = document.querySelector<HTMLElement>('.single-chart-report-print-root[data-binding-state="bound"]');
    expect(root?.dataset.releaseIdentity).toBe("legacy-v13");
    expect(root?.dataset.targetSchema).toBe("13");
    expect(root?.dataset.migrationId).toBe("null");
    expect(root?.dataset.mutationEpochBypassed).toBe("false");
    expect(root?.dataset.publicReleaseAuthorized).toBe("false");
    expect(root?.dataset.expertTruthEstablished).toBe("false");
    expect(root?.dataset.scientificValidityClaimed).toBe("false");
    view.unmount();
  });

  it("合法 withheld 句只展示状态与缺失证据，不渲染正文", () => {
    const report = createReport();
    const firstStatement = interpretationStatements(report)[0]!;
    firstStatement.text = null;
    firstStatement.classification = "blocked";
    firstStatement.displayStatus = "withheld";
    firstStatement.missingEvidence = ["missing-verified-locator"];
    const evidence = interpretationEvidenceRecord(report);
    const families = evidence.assertionFamilies as Array<Record<string, unknown>>;
    families[0]!.displayable = 0;
    families[0]!.withheld = 1;
    const coverage = evidence.coverage as Record<string, unknown>;
    coverage.displayable = 6;
    coverage.withheld = 1;

    expect(findSingleChartReportBindingIssue(report)).toBeNull();
    const view = render(<SingleChartReport report={report} />);
    expect(screen.getByText("withheld · 不展示正文")).toBeTruthy();
    expect(screen.getByText("missing-verified-locator")).toBeTruthy();
    expect(screen.getAllByText(INTERPRETATION_VISIBLE_CANONICAL_TEXT)).toHaveLength(6);
    view.unmount();
  });

  it("在 Schema 解析前拒绝 withheld 正文 canary，整份报告失败关闭且不回显", () => {
    const report = createReport();
    const canary = "PRIVATE-WITHHELD-TEXT-CANARY-9517";
    const statement = interpretationStatements(report)[0]!;
    statement.text = canary;
    statement.classification = "blocked";
    statement.displayStatus = "withheld";
    statement.missingEvidence = ["missing-verified-locator"];

    const issue = findSingleChartReportBindingIssue(report);
    expect(issue).toBe("withheld 旺衰叙事句子仍携带正文");
    expect(issue).not.toContain(canary);
    const view = render(<SingleChartReport report={report} />);
    expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
    expect(document.body.textContent).not.toContain(canary);
    view.unmount();
  });

  it("拒绝超量、重复、非法枚举、错误顺序、错误摘要和匿名 binding 泄漏", () => {
    const canary = "PRIVATE-APPENDIX-KIND-CANARY-2874";
    const malformedReports: ReportModel[] = [
      (() => {
        const report = createReport();
        interpretationStatements(report)[1]!.statementId = "statement-1";
        return report;
      })(),
      (() => {
        const report = createReport();
        interpretationStatements(report)[0]!.kind = canary;
        return report;
      })(),
      (() => {
        const report = createReport();
        interpretationStatements(report)[0]!.classification = " supported ";
        return report;
      })(),
      (() => {
        const report = createReport();
        interpretationStatements(report)[0]!.order = 2;
        return report;
      })(),
      (() => {
        const report = createReport();
        interpretationStatements(report)[0]!.registryLocatorVerifiedBindingIds = [];
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        interpretationEvidenceRecord(report).payloadSha256 = "NOT-A-SHA-CANARY";
        return report;
      })(),
      (() => {
        const report = createReport();
        interpretationEvidenceRecord(report).sourceBindings = [{
          bindingId: "PRIVATE-BINDING-CANARY",
          order: 1,
          sourceId: "source-test",
          sourceType: "engineering_contract",
          evidenceRole: "defines_engineering_candidate",
          locator: {
            kind: "stable_symbol",
            value: "symbol",
            registryVerificationStatus: "verified",
            verificationScope: "repository_symbol_registration_only",
            contentSha256: null
          },
          parameterSupport: "exact_engineering_definition",
          supports: "private support canary",
          doesNotSupport: ["private boundary canary"]
        }];
        return report;
      })(),
      (() => {
        const report = createReport();
        (interpretationEvidenceRecord(report).coverage as Record<string, unknown>).displayable = 999;
        return report;
      })(),
      (() => {
        const report = createReport();
        const seed = structuredClone(interpretationStatements(report)[0]!);
        interpretationEvidenceRecord(report).statements = Array.from(
          { length: SINGLE_CHART_REPORT_PRESENTATION_CONTRACT.limits.collections.interpretationStatements + 1 },
          (_, index) => ({ ...structuredClone(seed), statementId: `oversize-${index + 1}`, order: index + 1 })
        );
        return report;
      })()
    ];

    for (const report of malformedReports) {
      const issue = findSingleChartReportBindingIssue(report);
      expect(issue).not.toBeNull();
      expect(issue).not.toContain("PRIVATE-");
      const view = render(<SingleChartReport report={report} />);
      expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
      expect(document.body.textContent).not.toContain(canary);
      expect(document.body.textContent).not.toContain("PRIVATE-BINDING-CANARY");
      expect(document.body.textContent).not.toContain("NOT-A-SHA-CANARY");
      view.unmount();
    }
  });

  it("v1.7 严格门拒绝来源资格、URL、版本、权利、join、subject、locator 与反向边界晋升", () => {
    const sourceRecord = (report: ReportModel) => (
      (interpretationEvidenceRecord(report).sources as Array<Record<string, unknown>>)[0]!
    );
    const bindingRecord = (report: ReportModel) => (
      (interpretationEvidenceRecord(report).sourceBindings as Array<Record<string, unknown>>)[0]!
    );
    const boundaryRecord = (report: ReportModel) => (
      interpretationEvidenceRecord(report).boundary as Record<string, unknown>
    );
    const malformedReports: ReportModel[] = [
      (() => {
        const report = makeFullReport();
        sourceRecord(report).unexpectedSourceField = "PRIVATE-SOURCE-EXTRA-CANARY";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        sourceRecord(report).order = 2;
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        sourceRecord(report).url = "https://PRIVATE-USER:PRIVATE-PASS@example.invalid/source";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        sourceRecord(report).stableRevision = null;
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        sourceRecord(report).workRightsStatus = "PRIVATE-RIGHTS-PASSED-CANARY";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        sourceRecord(report).sourceRightsRecordStatus = "not_bound";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        bindingRecord(report).sourceId = "PRIVATE-UNMATCHED-SOURCE-CANARY";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        bindingRecord(report).evidenceSubjectId = "bazi.strength.binding.policy.weights.v1";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        bindingRecord(report).sourceType = "review_gate_locator";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        const locator = bindingRecord(report).locator as Record<string, unknown>;
        locator.verificationScope = "pinned_carrier_heading_only";
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        const locator = bindingRecord(report).locator as Record<string, unknown>;
        locator.contentSha256 = "c".repeat(64);
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        bindingRecord(report).doesNotSupport = [];
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        boundaryRecord(report).sourceRegistrationEstablishesDistributionRights = true;
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        boundaryRecord(report).citationTargetEstablishesSourceIdentity = true;
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        boundaryRecord(report).admissionLedgerCopiesSourceText = true;
        return report;
      })(),
      (() => {
        const report = makeFullReport();
        (interpretationEvidenceRecord(report).coverage as Record<string, unknown>)
          .structuredCitationRecordsBound = 1;
        return report;
      })()
    ];

    for (const report of malformedReports) {
      const issue = findSingleChartReportBindingIssue(report);
      expect(issue).not.toBeNull();
      expect(issue).not.toContain("PRIVATE-");
      const view = render(<SingleChartReport report={report} />);
      expect(screen.getByRole("alert").textContent).toContain("单盘报告绑定失败");
      expect(document.body.textContent).not.toContain("PRIVATE-");
      expect(document.body.textContent).not.toContain("c".repeat(64));
      view.unmount();
    }
  });

  it("完整模式展示唯一来源资格、三轴状态与完整 binding 反向边界，匿名模式不泄露明细", () => {
    const anonymousView = render(<SingleChartReport report={createReport()} />);
    expect(screen.queryByText("唯一来源资格账（注册表快照）")).toBeNull();
    expect(screen.queryByText("来源 binding 与反向边界")).toBeNull();
    expect(document.body.textContent).not.toContain(INTERPRETATION_SOURCE_ID);
    expect(document.body.textContent).not.toContain(INTERPRETATION_SOURCE_TITLE);
    expect(document.body.textContent).not.toContain(INTERPRETATION_SOURCE_URL);
    expect(document.body.textContent).not.toContain(INTERPRETATION_SOURCE_REVISION);
    expect(document.body.textContent).not.toContain("当前工程从日主、透干、藏干与时柱可靠性派生完整因素账");
    expect(document.body.textContent).toContain("1 个来源、1 条 binding、1 条注册表 locator 已核");
    expect(screen.getByText("机械准入明细已脱敏")).toBeTruthy();
    expect(screen.getByText("匿名模式不展示动态准入数量与状态")).toBeTruthy();
    const anonymousEvidenceRoot = document.querySelector<HTMLElement>('[data-interpretation-status="available"]');
    expect(anonymousEvidenceRoot?.dataset.admissionVisibility).toBe("redacted");
    expect(anonymousEvidenceRoot?.dataset.bindingsWithVerifiedCitation).toBeUndefined();
    expect(anonymousEvidenceRoot?.dataset.bindingsWithRedistributableVerifiedCitation).toBeUndefined();
    expect(document.body.textContent).not.toContain("条 binding 有非 rejected Citation");
    anonymousView.unmount();

    const fullView = render(<SingleChartReport report={makeFullReport()} />);
    expect(screen.getByText("唯一来源资格账（注册表快照）")).toBeTruthy();
    expect(screen.getByText("来源 binding 与反向边界")).toBeTruthy();
    expect(document.body.textContent).toContain(INTERPRETATION_SOURCE_ID);
    expect(screen.getAllByText(INTERPRETATION_SOURCE_TITLE).length).toBeGreaterThanOrEqual(2);
    expect(document.body.textContent).toContain(INTERPRETATION_SOURCE_URL);
    expect(document.body.textContent).toContain(INTERPRETATION_SOURCE_REVISION);
    expect(document.body.textContent).toContain("当前工程从日主、透干、藏干与时柱可靠性派生完整因素账");
    expect(document.body.textContent).toContain("该 binding 不支持");
    expect(document.body.textContent).toContain("用户吉凶");
    expect(document.body.textContent).toContain("无匹配结构化 Citation");
    expect(document.body.textContent).toContain("Citation target 未评估其资料是否就是该 registry 来源");
    expect(screen.getAllByText("注册表 locator 已核").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/^binding scoped Citation 机械准入/)).toBeTruthy();
    expect(screen.getByText("binding scoped SourceRights 机械状态")).toBeTruthy();
    expect(document.body.textContent).not.toContain("来源已核验");
    expect(document.body.textContent).not.toContain("权利通过");
    expect(document.body.textContent).toContain("b".repeat(64));
    const evidenceRoot = document.querySelector<HTMLElement>('[data-interpretation-status="available"]');
    expect(evidenceRoot?.dataset.registryLocatorVerifiedBindings).toBe("1");
    expect(evidenceRoot?.dataset.admissionVisibility).toBe("full");
    expect(evidenceRoot?.dataset.bindingsWithVerifiedCitation).toBe("0");
    expect(evidenceRoot?.dataset.sourceTextsIncluded).toBe("0");
    fullView.unmount();
  });

  it("DST unresolved 使用零句零 binding 的显式阻断态", () => {
    const report = createReport();
    const current = createAnonymousInterpretationEvidence();
    (report as unknown as { interpretationEvidence: unknown }).interpretationEvidence = {
      ...current,
      status: "withheld",
      reason: "dst_unresolved",
      payloadSha256: null,
      statements: [],
      assertionFamilies: [],
      sources: [],
      sourceBindings: [],
      coverage: {
        statementsTotal: 0,
        displayable: 0,
        withheld: 0,
        assertionFamilies: 0,
        referencedSourceBindings: 0,
        registryLocatorVerifiedBindings: 0,
        referencedSources: 0,
        pinnedRevisionSources: 0,
        sourceTextsIncluded: 0
      },
      admissionSummary: {
        visibility: "redacted",
        sourceTextCopiedIntoAdmissionLedger: false
      }
    };

    expect(findSingleChartReportBindingIssue(report)).toBeNull();
    const view = render(<SingleChartReport report={report} />);
    expect(screen.getByText("DST 时间仍未解析，叙事证据已失败关闭")).toBeTruthy();
    expect(document.querySelector('[data-interpretation-status="withheld"]')).toBeTruthy();
    expect(document.querySelector<HTMLElement>('.single-chart-report-print-root[data-binding-state="bound"]')
      ?.dataset.interpretationExactRendererMatch).toBe("not-applicable");
    expect(document.body.textContent).not.toContain(INTERPRETATION_VISIBLE_CANONICAL_TEXT);
    expect(document.querySelector('[data-evidence-metric="interpretation-total"]')?.textContent).toContain("0");
    view.unmount();
  });

  it("完整报告的 DST unresolved 把全零准入显式标为未评估", () => {
    const report = makeFullReport();
    const current = createAnonymousInterpretationEvidence();
    (report as unknown as { interpretationEvidence: unknown }).interpretationEvidence = {
      ...current,
      status: "withheld",
      reason: "dst_unresolved",
      payloadSha256: null,
      statements: [],
      assertionFamilies: [],
      sources: [],
      sourceBindings: [],
      coverage: {
        statementsTotal: 0,
        displayable: 0,
        withheld: 0,
        assertionFamilies: 0,
        referencedSourceBindings: 0,
        registryLocatorVerifiedBindings: 0,
        referencedSources: 0,
        pinnedRevisionSources: 0,
        sourceTextsIncluded: 0
      },
      admissionSummary: {
        visibility: "full",
        evaluationStatus: "not_evaluated_interpretation_withheld",
        bindingsTotal: 0,
        bindingsWithNonRejectedCitation: 0,
        bindingsWithVerifiedCitation: 0,
        bindingsWithRedistributableVerifiedCitation: 0,
        citationRecords: {
          matching: 0,
          structured: 0,
          candidate: 0,
          verified: 0,
          rejected: 0
        },
        knowledgeDocumentsBound: 0,
        sourceRightsRecordsBound: 0,
        sourceTextCopiedIntoAdmissionLedger: false,
        structuredCitationCoverage: "none",
        distributionRightsState: "no_matching_source_text"
      }
    };

    expect(findSingleChartReportBindingIssue(report)).toBeNull();
    const view = render(<SingleChartReport report={report} />);
    expect(document.body.textContent).toContain("admission: not_evaluated_interpretation_withheld");
    view.unmount();

    const malformed = structuredClone(report);
    const summary = interpretationEvidenceRecord(malformed).admissionSummary as Record<string, unknown>;
    summary.evaluationStatus = "evaluated";
    expect(findSingleChartReportBindingIssue(malformed)).toBe(
      "DST 阻断的完整报告机械准入摘要必须保持未评估零值"
    );
  });
});
