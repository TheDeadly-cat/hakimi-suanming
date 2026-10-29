import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { buildBaziPreliminaryAssessment } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { ChartReadingWorkbench } from "./chart-reading-workbench";
let revision: RevisionRecord;
beforeAll(async () => {
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26", timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic feedback form", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111", caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-16T00:00:00.000Z" });
});
describe("usable feedback form with immutable selected conclusion", () => {
  it("opens a requested domain without losing a draft or automatically refreshing its original after a version change", async () => {
    const assessment = buildBaziPreliminaryAssessment(revision), save = vi.fn().mockResolvedValue(undefined);
    const choice = { id: "annual-domain-2032-locked-wealth", label: "2032年 · 资源安排", originalConclusion: "已有成果的验收与结算", sourceVersions: ["domain/old"] };
    const props = { revision, caseName: "合成", assessment, onAddFeedback: save };
    const view = render(<ChartReadingWorkbench {...props} extraFeedbackChoices={[choice]} />);
    fireEvent.change(screen.getByLabelText("实际情况"), { target: { value: "合成草稿，暂未验证" } });
    view.rerender(<ChartReadingWorkbench {...props} extraFeedbackChoices={[choice]} feedbackTarget={{ id: choice.id, requestId: 1 }} />);
    await waitFor(() => expect((screen.getByLabelText("要反馈的原结论") as HTMLSelectElement).value).toBe(choice.id));
    expect((screen.getByLabelText("实际情况") as HTMLTextAreaElement).value).toBe("合成草稿，暂未验证");
    expect(save).not.toHaveBeenCalled();
    const changed = { ...choice, sourceVersions: ["domain/new"] };
    view.rerender(<ChartReadingWorkbench {...props} extraFeedbackChoices={[changed]} feedbackTarget={{ id: choice.id, requestId: 1 }} />);
    expect((screen.getByRole("button", { name: "添加反馈" }) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<ChartReadingWorkbench {...props} extraFeedbackChoices={[changed]} feedbackTarget={{ id: choice.id, requestId: 2 }} />);
    await waitFor(() => expect((screen.getByRole("button", { name: "添加反馈" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "添加反馈" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0]).toMatchObject({ subjectId: choice.id, originalConclusion: choice.originalConclusion,
      actualSituation: "合成草稿，暂未验证", sourceVersions: ["domain/new"], rating: "unverified" });
    cleanup();
  });
  it("collects rating, aspect, free-form time, actual facts and a revision request without technical input", async () => {
    const assessment = buildBaziPreliminaryAssessment(revision), save = vi.fn().mockResolvedValue(undefined);
    render(<ChartReadingWorkbench revision={revision} caseName="合成" assessment={assessment} onAddFeedback={save} />);
    fireEvent.click(screen.getByLabelText("部分符合"));
    fireEvent.change(screen.getByLabelText("具体哪方面符合或不同"), { target: { value: "事业方向符合，时期不同" } });
    fireEvent.change(screen.getByLabelText("对应时间（可填年份、月份或阶段）"), { target: { value: "毕业前后" } });
    fireEvent.change(screen.getByLabelText("实际情况"), { target: { value: "先完成学习，后来才开始项目。" } });
    fireEvent.change(screen.getByLabelText("希望如何修订（可选）"), { target: { value: "把两个阶段分开说明。" } });
    fireEvent.click(screen.getByRole("button", { name: "添加反馈" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0]).toEqual({ originalConclusion: assessment.headline, actualSituation: "先完成学习，后来才开始项目。", subjectId: "natal-overview", subjectLabel: assessment.headline,
      sourceVersions: [assessment.version], rating: "partial", aspect: "事业方向符合，时期不同", occurredAt: "毕业前后", requestedRevision: "把两个阶段分开说明。" });
    await waitFor(() => expect(screen.getByText("反馈已保存，可在解读记录中追加复核或个人修订。").getAttribute("role")).toBe("status"));
    cleanup();
  });
  it("retains a draft but disables saving when a selected year/option changes until it is explicitly reselected", async () => {
    const assessment = buildBaziPreliminaryAssessment(revision), save = vi.fn().mockResolvedValue(undefined);
    const original = { id: "month-selected", label: "2026 年月度", originalConclusion: "旧月原结论", sourceVersions: ["monthly/old"] };
    const props = { revision, caseName: "合成", assessment, onAddFeedback: save };
    const view = render(<ChartReadingWorkbench {...props} extraFeedbackChoices={[original]} />);
    fireEvent.change(screen.getByLabelText("要反馈的原结论"), { target: { value: original.id } });
    fireEvent.change(screen.getByLabelText("实际情况"), { target: { value: "对应旧月的经历保留" } });
    const changed = { ...original, label: "2027 年月度", originalConclusion: "新月原结论", sourceVersions: ["monthly/new"] };
    view.rerender(<ChartReadingWorkbench {...props} extraFeedbackChoices={[changed]} />);
    expect(screen.getByRole("alert").textContent).toContain("重新选择");
    expect((screen.getByRole("button", { name: "添加反馈" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("实际情况") as HTMLTextAreaElement).value).toBe("对应旧月的经历保留");
    fireEvent.change(screen.getByLabelText("要反馈的原结论"), { target: { value: changed.id } });
    fireEvent.click(screen.getByRole("button", { name: "添加反馈" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0].originalConclusion).toBe("新月原结论");
    expect(save.mock.calls[0]![0].sourceVersions).toEqual(["monthly/new"]);
    cleanup();
  });
  it("allows unverified without inventing an experience and keeps all fields after an unknown save result", async () => {
    const assessment = buildBaziPreliminaryAssessment(revision), save = vi.fn().mockRejectedValue(new Error("保存结果尚未确认，已停止重复写入。"));
    render(<ChartReadingWorkbench revision={revision} caseName="合成" assessment={assessment} onAddFeedback={save} />);
    fireEvent.change(screen.getByLabelText("希望如何修订（可选）"), { target: { value: "以后补充实际经历" } });
    fireEvent.click(screen.getByRole("button", { name: "添加反馈" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("停止重复写入"));
    expect(save.mock.calls[0]![0]).toMatchObject({ rating: "unverified", actualSituation: "" });
    expect((screen.getByLabelText("希望如何修订（可选）") as HTMLTextAreaElement).value).toBe("以后补充实际经历");
    cleanup();
  });
  it("requires reselection for a version-only change even when the visible conclusion text stays the same", () => {
    const assessment = buildBaziPreliminaryAssessment(revision), save = vi.fn();
    const choice = { id: "same-text", label: "阶段结论", originalConclusion: "相同文字仍有不同规则版本", sourceVersions: ["reading/old"] };
    const props = { revision, caseName: "合成", assessment, onAddFeedback: save };
    const view = render(<ChartReadingWorkbench {...props} extraFeedbackChoices={[choice]} />);
    fireEvent.change(screen.getByLabelText("要反馈的原结论"), { target: { value: choice.id } });
    view.rerender(<ChartReadingWorkbench {...props} extraFeedbackChoices={[{ ...choice, sourceVersions: ["reading/new"] }]} />);
    expect((screen.getByRole("button", { name: "添加反馈" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("重新选择");
    expect(save).not.toHaveBeenCalled(); cleanup();
  });
});
