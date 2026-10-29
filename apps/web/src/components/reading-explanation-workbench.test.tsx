import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { calculateChart } from "@hakimi/bazi-core";
import { researchNoteRecordSchema, storedRevisionRecordSchema, type RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { ReadingExplanationWorkbench } from "./reading-explanation-workbench";
import { ReadingSavedExplanation } from "./reading-saved-explanation";
import { appendReadingExplanationIndex, unassessedReadingTime, validateReadingExplanationIndex,
  type ReadingConclusion, type ReadingExplanationIndex } from "../lib/reading-explanation-index";
import { encodeReadingReportBundle } from "../lib/local-reading-report-bundle";
import { packReadingSnapshot } from "../lib/local-reading-snapshot-codec";
import { LOCAL_READING_SNAPSHOT_TAG } from "../lib/local-reading-record";
import { READING_NAVIGATION_STORAGE_KEY, readReadingNavigation, readingNavigationIdentity, writeReadingNavigation } from "../lib/reading-navigation-context";

let revision: RevisionRecord;
const generatedAt = "2026-10-24T00:00:00.000Z";
const reportVersion = "hakimi.local-reading-edition/0.22.0";
const reportText = "# 合成旧报告原文\n\n## 条件\n本段保留标点与换行。\n{\"sourceSubjects\":\"这是个人文字，不是字段\"}\n";

beforeEach(() => window.sessionStorage.removeItem(READING_NAVIGATION_STORAGE_KEY));

beforeAll(async () => {
  // A real synthetic revision supplies identity only. Explicit UI conclusions
  // below exercise navigation and provenance, not new astrological claims.
  const chart = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "unspecified", lunarLeapMonth: false,
    location: { label: "Synthetic explanation workbench test", latitude: null, longitude: null, precision: "unknown" },
    sourceNote: "Synthetic UI test, not an observed life outcome." }, WORKING_DEFAULT_RULE_PROFILE);
  revision = storedRevisionRecordSchema.parse({ ...chart, schemaVersion: "1.0.0", id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222", revisionNumber: 1, createdAt: "2026-10-23T00:00:00.000Z" });
});

function conclusion(key: string, domain: ReadingConclusion["domain"], label: string, text: string,
  scope: ReadingConclusion["scope"], direction: string | null = null): ReadingConclusion {
  return { stableId: `${revision.id}/${key}`, label, text, domain, scope, sourceSubjects: [`source:${key}`], direction,
    origin: "calculated", sourceVersions: ["synthetic-ui-source/1"], personalTextIds: [], evidence: {
      facts: [`合成事实：${key}`], support: [`合成支持：${key}`], limits: [`合成适用限制：${key}`],
      unknowns: [`合成未定项：${key}`], citations: [], ruleApplications: [{ ruleId: `synthetic:${key}`, title: `合成规则：${key}`,
        decision: "仅供此组件范围核对，不表示真实预测。", support: [`本项独立支持：${key}`], limitations: ["仅限当前结论"], sourceIds: [], sourceSubjects: [`source:${key}`] }]
    } };
}
function fixture(): ReadingExplanationIndex {
  const natal: ReadingConclusion["scope"] = { level: "natal", year: null, branchId: null, startInstant: null, endExclusiveInstant: null };
  const scope = (year: number, branchId: string, level: "year" | "month" = "year"): ReadingConclusion["scope"] => ({
    level, year, branchId, startInstant: `${year}-02-04T00:00:00.000Z`, endExclusiveInstant: level === "year" ? `${year + 1}-02-04T00:00:00.000Z` : `${year}-03-05T00:00:00.000Z`
  });
  const conclusions = [
    conclusion("natal:pattern", "natal", "合成格局主判", "月令背景合成第一句。当前主判：本盘的结构任务与实际限制一并保留。", natal),
    conclusion("natal:use:first", "natal", "合成首用", "首用合成第一句。不能省略的取舍条件。", natal),
    conclusion("natal:career", "career", "事业发展 · 合成主线", "事业合成第一句。事业完整第二句必须保留。", natal),
    conclusion("natal:wealth", "wealth", "收入开支 · 合成主线", "财务合成第一句。财务另有独立限制。", natal),
    conclusion("natal:relationships", "relationship", "感情相处 · 合成主线", "感情合成第一句。感情不借事业方向。", natal),
    conclusion("year:forward:2028:career", "career", "2028年 · 事业", "顺行年段原文，具有自身机会。", scope(2028, "forward"), "favorable"),
    conclusion("year:backward:2028:career", "career", "2028年 · 事业", "逆行年段原文，保留自身压力。", scope(2028, "backward"), "pressured"),
    conclusion("year:forward:2029:career", "career", "2029年 · 事业", "次年原文，尚无独立方向。", scope(2029, "forward"), "neutral"),
    conclusion("month:forward:2028:month-one:career", "career", "2028立春月 · 事业", "本月事业是中性事项，不借全年机会。", scope(2028, "forward", "month"), "neutral"),
    conclusion("month:forward:2029:month-two:wealth", "wealth", "2029立春月 · 收支", "本月收支有自身压力，不改全年中性。", scope(2029, "forward", "month"), "pressured")
  ];
  const career = conclusions.find(item => item.stableId.endsWith("/natal:career"))!;
  career.evidence.citations = ["synthetic-career"];
  return validateReadingExplanationIndex({ version: "hakimi.reading-explanation-index/0.1.0", generatedAt,
    sourceSnapshot: { caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true,
      input: revision.input, ruleProfile: revision.ruleProfile, ruleProfileDigest: revision.manifest.ruleProfileDigest,
      timeCalibration: revision.timeCalibration, engineVersions: { engine: revision.manifest.engine }, context: null,
      sourceVersions: ["synthetic-ui-source/1"], reportVersion, inputRecordedAt: revision.createdAt }, conclusions,
    sources: [{ id: "synthetic-career", title: "事业合成来源", url: "https://example.invalid/career", locator: "合成测试位置",
      excerpt: "仅属于事业的合成摘录。", interpretation: "合成引用关联，不是古籍原文或现实验证。" },
    { id: "synthetic-wealth", title: "无关财务来源", url: "https://example.invalid/wealth", locator: "另一测试位置",
      excerpt: "不可借给事业的财务摘录。", interpretation: "不得作为事业结论依据。" }],
    citationBindings: [{ conclusionId: career.stableId, sourceId: "synthetic-career", producerField: "synthetic.career.sourceIds", usageNote: "仅该项关联" }],
    uncertainty: unassessedReadingTime(revision), limitations: ["UI测试中的结论不是计算准确率证据。"] });
}
function article(label: string) {
  return screen.queryByRole("heading", { name: label })?.closest("article")
    ?? [...document.querySelectorAll<HTMLElement>("article[data-reading-conclusion]")].find(node => node.querySelector(".reading-summary-professional-label")?.textContent === label)!;
}

function fixtureWith2030() {
  const index = fixture();
  const year = index.conclusions.find(item => item.scope.year === 2029 && item.scope.level === "year")!;
  const month = index.conclusions.find(item => item.scope.year === 2029 && item.scope.level === "month")!;
  for (const source of [year, month]) {
    const item = structuredClone(source);
    item.stableId = item.stableId.replaceAll("2029", "2030");
    item.label = item.label.replaceAll("2029", "2030");
    item.scope = { ...item.scope, year: 2030, startInstant: "2030-02-04T00:00:00.000Z",
      endExclusiveInstant: item.scope.level === "year" ? "2031-02-04T00:00:00.000Z" : "2030-03-05T00:00:00.000Z" };
    index.conclusions.push(item);
    if (item.scope.level === "year") index.conclusions.push({ ...structuredClone(item), domain: "wealth",
      stableId: `${revision.id}/year:forward:2030:wealth`, label: "2030年 · 收入", text: "2030年收入的独立原文与限制。" });
  }
  return index;
}

it("puts directly available topics and year before two initial cards while keeping all originals and limits expandable", () => {
  const index = fixture();
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  const groups = view.container.querySelector(".reading-summary-groups")!;
  for (const label of ["事业发展", "收入与开支", "年份对照", "关键月份"]) {
    const button = screen.getByRole("button", { name: label });
    expect(button.compareDocumentPosition(groups) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
  expect(screen.getByLabelText("年份", { exact: true }).compareDocumentPosition(groups) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(groups.querySelectorAll(":scope > section > article")).toHaveLength(2);
  const more = view.container.querySelector<HTMLDetailsElement>(".reading-summary-more")!;
  expect(more.open).toBe(false);
  fireEvent.click(within(more).getByText("展开其余 3 条摘要、条件与原文"));
  expect(within(groups as HTMLElement).getAllByRole("button", { name: "查看原文及条件" })).toHaveLength(5);
  expect(groups.querySelectorAll("[data-reading-conclusion]")).toHaveLength(index.conclusions.filter(item => item.scope.level === "natal").length);
  fireEvent.click(screen.getByText("展开这份报告的完整限制"));
  expect(screen.getByText(index.limitations[0]!, { exact: true })).toBeTruthy();
});

it("retains 2030 and the chosen branch across income, career, months and overview without substituting the first year", () => {
  const index = fixtureWith2030(), onRequestYear = vi.fn(), onSelectionChange = vi.fn();
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} onRequestYear={onRequestYear} onSelectionChange={onSelectionChange} />);
  fireEvent.click(screen.getByRole("button", { name: "收入与开支" }));
  fireEvent.change(screen.getByLabelText("年份", { exact: true }), { target: { value: "2030" } });
  expect(onSelectionChange.mock.lastCall?.[0].isReady).toBe(false);
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "forward" } });
  expect(screen.getByText("2030年收入的独立原文与限制。", { exact: true })).toBeTruthy();
  for (const label of ["事业发展", "关键月份", "一页摘要", "收入与开支"]) {
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByLabelText("年份", { exact: true })).toHaveProperty("value", "2030");
    if (label !== "一页摘要") expect(screen.getByLabelText("分别查看结果")).toHaveProperty("value", "forward");
  }
  expect(onRequestYear.mock.calls).toEqual([[2030]]);
  expect(onSelectionChange.mock.lastCall?.[0]).toMatchObject({ topic: "wealth", year: 2030, branchId: "forward", isReady: true });
});

it("restores same-tab navigation after unmount while retaining no input, question, prose or old-report contents", () => {
  const index = fixtureWith2030(), onRequestYear = vi.fn();
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "收入与开支" }));
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "forward" } });
  fireEvent.change(screen.getByLabelText("在这份报告中查找"), { target: { value: "2030年关键月份，私人备注不要保存" } });
  fireEvent.click(screen.getByRole("button", { name: "查找报告" }));
  const stored = window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY)!;
  expect(stored.length).toBeLessThanOrEqual(4096);
  for (const privateText of ["私人备注", index.conclusions[0]!.text, revision.input.date, "sourceNote", "previousIndex"]) expect(stored).not.toContain(privateText);
  view.unmount();
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} onRequestYear={onRequestYear} />);
  expect(screen.getByRole("button", { name: "关键月份" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByLabelText("年份", { exact: true })).toHaveProperty("value", "2030");
  expect(screen.getByLabelText("分别查看结果")).toHaveProperty("value", "forward");
  expect(screen.getByLabelText("在这份报告中查找")).toHaveProperty("value", "");
  expect(onRequestYear.mock.calls).toEqual([[2030]]);
});

it("resets stale navigation and an open conclusion when the revision changes", () => {
  const index = fixtureWith2030();
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  fireEvent.change(screen.getByLabelText("年份", { exact: true }), { target: { value: "2030" } });
  fireEvent.click(within(article("合成格局主判")).getByRole("button", { name: "查看原文及条件" }));
  const nextRevision = { ...revision, id: "33333333-3333-4333-8333-333333333333", revisionNumber: 2 };
  const nextIndex = structuredClone(index);
  nextIndex.sourceSnapshot.revisionId = nextRevision.id;
  for (const item of nextIndex.conclusions) item.stableId = item.stableId.replace(revision.id, nextRevision.id);
  view.rerender(<ReadingExplanationWorkbench index={nextIndex} revision={nextRevision} records={[]} />);
  expect(screen.getByRole("button", { name: "一页摘要" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByLabelText("年份", { exact: true })).toHaveProperty("value", "");
  expect(screen.queryByRole("button", { name: "返回刚才的摘要" })).toBeNull();
});

it("waits for the initial report range before validating restored navigation", () => {
  const index = fixtureWith2030(), onRequestYear = vi.fn();
  writeReadingNavigation(index, revision, { topic: "month", year: 2030, branchId: "forward" });
  const stored = window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY);
  const partial = { ...index, conclusions: index.conclusions.filter(item => item.scope.level === "natal") };
  const view = render(<ReadingExplanationWorkbench index={partial} revision={revision} records={[]} loading onRequestYear={onRequestYear} />);
  expect(window.sessionStorage.getItem(READING_NAVIGATION_STORAGE_KEY)).toBe(stored);
  expect(onRequestYear).not.toHaveBeenCalled();
  view.rerender(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} onRequestYear={onRequestYear} />);
  expect(screen.getByRole("button", { name: "关键月份" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByLabelText("年份", { exact: true })).toHaveProperty("value", "2030");
  expect(screen.getByLabelText("分别查看结果")).toHaveProperty("value", "forward");
  expect(onRequestYear.mock.calls).toEqual([[2030]]);
});

it("retains the active selection when preparing months adds producer version coverage", () => {
  const index = fixtureWith2030();
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  fireEvent.change(screen.getByLabelText("年份", { exact: true }), { target: { value: "2030" } });
  fireEvent.click(screen.getByRole("button", { name: "关键月份" }));
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "forward" } });
  const month = index.conclusions.find(item => item.scope.level === "month" && item.scope.year === 2030)!;
  fireEvent.change(screen.getByLabelText("月份与领域"), { target: { value: month.stableId } });
  const expanded = structuredClone(index);
  expanded.sourceSnapshot.sourceVersions.push("synthetic-prepared-months/1");
  view.rerender(<ReadingExplanationWorkbench index={expanded} revision={revision} records={[]} />);
  expect(screen.getByRole("button", { name: "关键月份" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByLabelText("年份", { exact: true })).toHaveProperty("value", "2030");
  expect(screen.getByLabelText("月份与领域")).toHaveProperty("value", month.stableId);
  expect(screen.getByText(month.text, { exact: true })).toBeTruthy();
});

it("rejects stale source identities and validates stored years, branches and month range before restoring", () => {
  const index = fixtureWith2030();
  writeReadingNavigation(index, revision, { topic: "month", year: 2030, branchId: "forward" });
  for (const field of ["reportVersion", "chartResultHash", "ruleProfileDigest", "revisionId", "caseId"] as const) {
    const changed = structuredClone(index);
    changed.sourceSnapshot[field] += "-changed";
    expect(readReadingNavigation(changed, revision)).toEqual({ topic: "summary" });
  }
  const wrongMonth = index.conclusions.find(item => item.scope.level === "month" && item.scope.year === 2028)!.stableId;
  window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, JSON.stringify({ version: 1,
    identity: readingNavigationIdentity(index, revision), selection: { topic: "month", year: 2030, branchId: "forward", monthId: wrongMonth } }));
  expect(readReadingNavigation(index, revision)).toMatchObject({ topic: "month", year: 2030, branchId: "forward", monthId: undefined });
  window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, JSON.stringify({ version: 1,
    identity: readingNavigationIdentity(index, revision), selection: { topic: "month", year: 2099, comparisonYear: 2098, branchId: "nonexistent", monthId: wrongMonth } }));
  expect(readReadingNavigation(index, revision)).toMatchObject({ year: undefined, comparisonYear: undefined, branchId: undefined, monthId: undefined });
});

it("continues reading when tab storage is invalid or unavailable", () => {
  const index = fixture();
  for (const raw of ["{broken", "x".repeat(4097)]) {
    window.sessionStorage.setItem(READING_NAVIGATION_STORAGE_KEY, raw);
    expect(readReadingNavigation(index, revision)).toEqual({ topic: "summary" });
  }
  const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
  try {
    render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
    expect(screen.getByText("事业合成第一句。事业完整第二句必须保留。", { exact: true })).toBeTruthy();
  } finally { get.mockRestore(); set.mockRestore(); }
});

it.each([false, true])("explains actual recorded direction conditions and searches only the current/saved report (saved=%s)", savedReport => {
  const index = fixture(), before = JSON.stringify(index);
  const view = render(savedReport ? <ReadingSavedExplanation index={index}/>
    : <ReadingExplanationWorkbench index={index} revision={revision} records={[]}/>);
  fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
  expect(screen.getByText(/这份报告的性别未填写/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "补充资料" }).getAttribute("href")).toBe(`/cases/${revision.caseId}/revisions/${revision.id}/revise`);
  fireEvent.click(screen.getByText("先分别查看", { exact: true }));
  expect(screen.getByText(/年干为阴且性别为女，对应结果一/)).toBeTruthy();
  expect((screen.getByLabelText("分别查看结果") as HTMLSelectElement).value).toBe("");
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "backward" } });
  fireEvent.change(screen.getByLabelText("在这份报告中查找"), { target: { value: "2028年事业" } });
  fireEvent.click(screen.getByRole("button", { name: "查找报告" }));
  expect(screen.getByText("逆行年段原文，保留自身压力。", { exact: true })).toBeTruthy();
  expect(screen.queryByText("顺行年段原文，具有自身机会。", { exact: true })).toBeNull();
  expect(article("2028年 · 事业").textContent).toContain("2028-02-04 08:00起至2029-02-04 08:00前（北京时间）；逆行路径");
  if (savedReport) expect(article("2028年 · 事业").textContent).toContain("合成适用限制：year:backward:2028:career");
  const yearControl = screen.getByLabelText(savedReport ? "保存范围内的年份" : "年份", { exact: true });
  expect((yearControl as HTMLSelectElement).value).toBe("2028");
  fireEvent.change(yearControl, { target: { value: "" } });
  expect(screen.getByText("事业合成第一句。事业完整第二句必须保留。", { exact: true })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("在这份报告中查找"), { target: { value: "明天天气" } });
  fireEvent.click(screen.getByRole("button", { name: "查找报告" }));
  expect(screen.getByRole("status").textContent).toContain("这里只查找已有报告，不是通用聊天");
  expect(view.container.querySelectorAll("[data-reading-conclusion], [data-saved-reading-conclusion]")).toHaveLength(0);
  expect(JSON.stringify(index)).toBe(before);
});

it.each([false, true])("renders each distinct year direction in Chinese without mutating saved values (saved=%s)", savedReport => {
  const index = fixture();
  index.conclusions = index.conclusions.filter(item => item.scope.branchId !== "backward");
  const template = index.conclusions.find(item => item.scope.year === 2029 && item.scope.level === "year")!;
  const directions = ["favorable", "pressured", "mixed", "neutral", "unknown"];
  index.conclusions.push(...directions.map((direction, n) => ({ ...structuredClone(template), stableId: `${revision.id}/year:direction:${n}`, label: `独立方向${n}`, direction })));
  const before = JSON.stringify(index);
  render(savedReport ? <ReadingSavedExplanation index={index}/> : <ReadingExplanationWorkbench index={index} revision={revision} records={[]}/>);
  expect(screen.queryByLabelText("分别查看结果")).toBeNull();
  if (savedReport) fireEvent.click(screen.getByText("年份、月份与更多查看"));
  fireEvent.click(screen.getByRole("button", { name: "年份对照" }));
  const text = screen.getByRole("status").textContent!;
  for (const label of ["支持较多", "阻力较多", "支持和阻力并存", "暂无明确倾向", "信息不足，尚不能判断"]) expect(text).toContain(label);
  for (const value of directions) expect(text).not.toContain(value);
  expect(JSON.stringify(index)).toBe(before);
});

it("does not invent direction conditions when a saved profile did not record the supported rule", () => {
  const index = fixture();
  index.sourceSnapshot.ruleProfile = {};
  render(<ReadingSavedExplanation index={index}/>);
  fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
  fireEvent.click(screen.getByText("先分别查看", { exact: true }));
  expect(screen.getByText(/未记录可说明的顺逆规则/)).toBeTruthy();
  expect(screen.queryByText(/本报告采用的成立条件/)).toBeNull();
});

it.each(["2029年关键月份", "2029年3月事业"])("requests the explicit searched month year and keeps the controls aligned: %s", question => {
  const index = fixture(), onRequestYear = vi.fn();
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} onRequestYear={onRequestYear}/>);
  fireEvent.change(screen.getByLabelText("在这份报告中查找"), { target: { value: question } });
  fireEvent.click(screen.getByRole("button", { name: "查找报告" }));
  expect(onRequestYear.mock.calls).toEqual([[2029]]);
  expect((screen.getByLabelText("年份", { exact: true }) as HTMLSelectElement).value).toBe("2029");
});

it.each([false, true])("clears an explicit comparison selection without silently falling back to searched years (saved=%s)", savedReport => {
  const index = fixture();
  index.conclusions = index.conclusions.filter(item => item.scope.branchId !== "backward");
  render(savedReport ? <ReadingSavedExplanation index={index}/> : <ReadingExplanationWorkbench index={index} revision={revision} records={[]}/>);
  fireEvent.change(screen.getByLabelText("在这份报告中查找"), { target: { value: "对照2028年和2029年" } });
  fireEvent.click(screen.getByRole("button", { name: "查找报告" }));
  const control = screen.getByLabelText(savedReport ? "保存范围内的对照年份" : "对照年份", { exact: true });
  expect((control as HTMLSelectElement).value).toBe("2029");
  fireEvent.change(control, { target: { value: "" } });
  expect(screen.getByRole("status").textContent).toBe("请选择两个不同年份作对照。");
  expect(screen.queryByText("次年原文，尚无独立方向。", { exact: true })).toBeNull();
});
async function openEvidence(container: HTMLElement, label: string) {
  const summary = within(container).getByText(`查看依据 · ${label}`, { exact: true });
  const detail = summary.closest("details")!;
  detail.open = true;
  fireEvent(detail, new Event("toggle", { bubbles: true }));
  await waitFor(() => expect(within(container).getByRole("heading", { name: "本盘事实" })).toBeTruthy());
}
async function saved(index: ReadingExplanationIndex, variant: "valid" | "case" | "revision" | "version" | "time" | "legacy" = "valid") {
  const old = structuredClone(index);
  if (variant === "time") old.generatedAt = "2026-10-26T00:00:00.000Z";
  const bundle = { reading: reportText, archive: variant === "legacy" ? "原档案没有逐条索引。" : appendReadingExplanationIndex("合成完整档案。", old),
    version: variant === "version" ? "hakimi.local-reading-edition/0.21.1" : reportVersion };
  return researchNoteRecordSchema.parse({ schemaVersion: "1.0.0", id: crypto.randomUUID(),
    caseId: variant === "case" ? "33333333-3333-4333-8333-333333333333" : revision.caseId,
    anchor: { kind: "revision", revisionId: variant === "revision" ? "44444444-4444-4444-8444-444444444444" : revision.id },
    bodyFormat: "markdown", body: await packReadingSnapshot(await encodeReadingReportBundle(bundle)), tags: [LOCAL_READING_SNAPSHOT_TAG],
    sourceRefs: [], lifecycle: "active", editVersion: 1, createdAt: "2026-10-25T00:00:00.000Z", updatedAt: "2026-10-25T00:00:00.000Z" });
}

it("does not truncate an unmapped pattern into a misleading first sentence and retains its full original", () => {
  const index = fixture(), pattern = index.conclusions.find(c => c.stableId.endsWith("/natal:pattern"))!;
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  expect(screen.getByRole("button", { name: "一页摘要" }).getAttribute("aria-pressed")).toBe("true");
  expect(article(pattern.label).getAttribute("data-summary-state")).toBe("original_required");
  expect(article(pattern.label).textContent).toContain("原文阅读");
  fireEvent.click(within(article(pattern.label)).getByRole("button", { name: "查看原文及条件" }));
  const text = article(pattern.label).querySelector("p.reading-explanation-original")!.textContent;
  expect(text).toBe(pattern.text);
  expect(text).toContain("当前主判：本盘的结构任务与实际限制一并保留。");
});

it("focuses a complete conclusion and returns to the same expanded summary card and scroll position", () => {
  const index = fixture(), before = JSON.stringify(index);
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const initialScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
  Object.defineProperty(window, "scrollY", { configurable: true, value: 1234 });
  try {
    const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
    fireEvent.click(screen.getByText("展开其余 3 条摘要、条件与原文"));
    const summary = article("收入开支 · 合成主线");
    const condition = summary.querySelector("details")!;
    fireEvent.click(within(summary).getByText("条件与术语"));
    expect(condition.open).toBe(true);
    const trigger = within(summary).getByRole("button", { name: "查看原文及条件" });
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(view.container.querySelector(".reading-explanation-results h3"));
    expect(view.container.querySelector<HTMLElement>(".reading-summary-groups")!.hidden).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "返回刚才的摘要" }));
    expect(document.activeElement).toBe(trigger);
    expect(condition.isConnected).toBe(true);
    expect(condition.open).toBe(true);
    expect(scroll).toHaveBeenLastCalledWith({ top: 1234, behavior: "instant" });
    expect(JSON.stringify(index)).toBe(before);
  } finally {
    scroll.mockRestore();
    if (initialScrollY) Object.defineProperty(window, "scrollY", initialScrollY);
  }
});

it("returns to the same month list with the selected year and branch intact", () => {
  const index = fixture();
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "关键月份" }));
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "forward" } });
  const month = view.container.querySelector<HTMLElement>(".reading-explanation-results article")!;
  const id = month.dataset.readingConclusion;
  fireEvent.click(within(month).getByRole("button", { name: "读完整结论" }));
  fireEvent.click(screen.getByRole("button", { name: "返回刚才的列表" }));
  expect(screen.getByLabelText("年份")).toHaveProperty("value", "2028");
  expect(screen.getByLabelText("分别查看结果")).toHaveProperty("value", "forward");
  expect(document.activeElement?.closest("article")?.dataset.readingConclusion).toBe(id);
  expect(document.activeElement?.textContent).toBe("读完整结论");
});

it("keeps the same full conclusion and its own evidence through summary, topic and details", async () => {
  const index = fixture(), original = JSON.stringify(index), label = "事业发展 · 合成主线", id = `${revision.id}/natal:career`;
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  const summary = article(label);
  expect(summary.getAttribute("data-reading-conclusion")).toBe(id);
  expect(summary.getAttribute("data-summary-state")).toBe("original_required");
  expect(within(summary).queryByText("事业合成第一句。", { exact: true })).toBeNull();
  expect(screen.queryByText("事业合成第一句。事业完整第二句必须保留。", { exact: true })).toBeNull();
  fireEvent.click(within(summary).getByRole("button", { name: "查看原文及条件" }));
  expect(article(label).getAttribute("data-reading-conclusion")).toBe(id);
  expect(within(article(label)).getByText(index.conclusions.find(c => c.stableId === id)!.text, { exact: true })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
  const topic = article(label);
  expect(topic.getAttribute("data-reading-conclusion")).toBe(id);
  await openEvidence(topic, label);
  for (const line of ["合成事实：natal:career", "本项独立支持：natal:career", "合成适用限制：natal:career", "合成未定项：natal:career", "仅属于事业的合成摘录。"]) expect(within(topic).getByText(line, { exact: true })).toBeTruthy();
  expect(within(topic).getByRole("link", { name: "事业合成来源" }).getAttribute("href")).toBe("https://example.invalid/career");
  expect(screen.queryByText("不可借给事业的财务摘录。", { exact: true })).toBeNull();
  expect(JSON.stringify(index)).toBe(original);
});

it("groups the overview into three tasks and opens and closes glossary help without losing the current conclusion", () => {
  const index = fixture();
  const pattern = index.conclusions.find(c => c.stableId.endsWith("/natal:pattern"))!;
  pattern.label = "格局主判";
  pattern.text = "本盘采用格局原结论。偏弱仅为当前分类，不是身体差。完整条件保留。";
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  for (const name of ["当前解释", "相关生活主题", "待确定事项"]) expect(screen.getByRole("region", { name })).toBeTruthy();
  fireEvent.click(within(article(pattern.label)).getByRole("button", { name: "查看原文及条件" }));
  const node = article(pattern.label);
  fireEvent.click(within(node).getByText("解释这条里的术语"));
  const trigger = within(node).getByRole("button", { name: "解释偏弱" });
  fireEvent.click(trigger);
  expect(screen.getByRole("complementary", { name: "偏弱的说明" }).textContent).toContain("不是身体弱或能力差");
  fireEvent.keyDown(screen.getByRole("complementary", { name: "偏弱的说明" }), { key: "Escape" });
  expect(screen.queryByRole("complementary", { name: "偏弱的说明" })).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(node.querySelector(".reading-explanation-original")!.textContent).toBe(pattern.text);
  expect(node.getAttribute("data-reading-conclusion")).toBe(pattern.stableId);
});

it("preserves adopted personal prose literally and does not display automatic citations as its support", async () => {
  const index = fixture(), career = index.conclusions.find(c => c.domain === "career" && c.scope.level === "natal")!;
  const text = "## 条件\n本人采用：与自动结论不同。\n{\"sourceSubjects\":\"字面原文\"}";
  career.origin = "personal"; career.text = text; career.personalTextIds = ["synthetic-personal-1"];
  career.evidence = { facts: [], ruleApplications: [], support: [], limits: [], unknowns: ["个人记录，不作自动规则背书。"], citations: [] };
  index.citationBindings = [];
  const validated = validateReadingExplanationIndex(index);
  render(<ReadingExplanationWorkbench index={validated} revision={revision} records={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
  const node = article(career.label);
  expect(node.querySelector("p.reading-explanation-original")!.textContent).toBe(text);
  await openEvidence(node, career.label);
  expect(within(node).getByText("个人原文，不作自动规则背书。", { exact: true })).toBeTruthy();
  expect(within(node).queryByRole("link", { name: "事业合成来源" })).toBeNull();
  expect(node.textContent).not.toContain("事业完整第二句必须保留");
});

it("requires an explicit direction for a year and displays only that branch with its original range", () => {
  const index = fixture(), before = JSON.stringify(index);
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "事业发展" }));
  fireEvent.change(screen.getByLabelText("年份", { exact: true }), { target: { value: "2028" } });
  expect(screen.getByText("这份报告有两套结果，请在“先分别查看”中选择一套来阅读这一年；选择仅用于查看，不代表确认哪套正确。", { exact: true })).toBeTruthy();
  expect(screen.queryByText("顺行年段原文，具有自身机会。", { exact: true })).toBeNull();
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "backward" } });
  expect(screen.getByText("逆行年段原文，保留自身压力。", { exact: true })).toBeTruthy();
  expect(screen.queryByText("顺行年段原文，具有自身机会。", { exact: true })).toBeNull();
  expect(article("2028年 · 事业").textContent).toContain("2028-02-04 08:00起至2029-02-04 08:00前（北京时间）；逆行路径");
  expect(JSON.stringify(index)).toBe(before);
});

it("requests the selected month-year without inventing a direction or borrowing the annual one", () => {
  const index = fixture(), before = JSON.stringify(index), onRequestYear = vi.fn();
  render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} onRequestYear={onRequestYear} monthsLoading />);
  fireEvent.click(screen.getByRole("button", { name: "关键月份" }));
  expect(onRequestYear.mock.calls).toEqual([[2028]]);
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "forward" } });
  fireEvent.change(screen.getByLabelText("年份", { exact: true }), { target: { value: "2029" } });
  expect(onRequestYear.mock.calls).toEqual([[2028], [2029]]);
  const month = index.conclusions.find(c => c.scope.level === "month" && c.scope.year === 2029)!;
  fireEvent.change(screen.getByLabelText("月份与领域"), { target: { value: month.stableId } });
  expect(article(month.label).getAttribute("data-reading-conclusion")).toBe(month.stableId);
  expect(screen.getByText(month.text, { exact: true })).toBeTruthy();
  expect(screen.queryByText("次年原文，尚无独立方向。", { exact: true })).toBeNull();
  expect(screen.getByText("正在按所选年份整理流月，已有本命与年度结论仍可阅读。", { exact: true })).toBeTruthy();
  expect(onRequestYear.mock.calls).toEqual([[2028], [2029]]);
  expect(JSON.stringify(index)).toBe(before);
});

it("keeps the chosen month topic and year through loading, hides stale answers, and then opens the full new month", () => {
  const index = fixture(), before = JSON.stringify(index), onRequestYear = vi.fn();
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} onRequestYear={onRequestYear} />);
  fireEvent.click(screen.getByRole("button", { name: "关键月份" }));
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "forward" } });
  const oldMonth = index.conclusions.find(c => c.scope.level === "month" && c.scope.year === 2028)!;
  fireEvent.change(screen.getByLabelText("月份与领域"), { target: { value: oldMonth.stableId } });
  expect(screen.getByText(oldMonth.text, { exact: true })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("年份", { exact: true }), { target: { value: "2029" } });
  expect((screen.getByLabelText("月份与领域") as HTMLSelectElement).value).toBe("");

  // The parent retains this component during a same-revision request; the old
  // index must not remain visible as if it were the newly requested answer.
  view.rerender(<ReadingExplanationWorkbench index={index} revision={revision} records={[]} onRequestYear={onRequestYear} loading />);
  expect(screen.getByRole("region", { name: "按问题阅读与查看依据" }).getAttribute("aria-busy")).toBe("true");
  expect(screen.getByText("正在核对所选年份与当前资料，完成后继续显示你刚才选择的专题。", { exact: true })).toBeTruthy();
  expect(view.container.querySelectorAll("[data-reading-conclusion]")).toHaveLength(0);
  expect(screen.queryByText(oldMonth.text, { exact: true })).toBeNull();

  const updated = structuredClone(index), newMonth = updated.conclusions.find(c => c.scope.level === "month" && c.scope.year === 2029)!;
  newMonth.text = "本月收支有自身压力。完整事项：临时用品与协作费用增加，仍保原来已经约定的费用。";
  const updatedBefore = JSON.stringify(updated);
  view.rerender(<ReadingExplanationWorkbench index={updated} revision={revision} records={[]} onRequestYear={onRequestYear} />);
  expect(screen.getByRole("button", { name: "关键月份" }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByLabelText("年份", { exact: true }) as HTMLSelectElement).value).toBe("2029");
  expect((screen.getByLabelText("分别查看结果") as HTMLSelectElement).value).toBe("forward");
  expect((screen.getByLabelText("月份与领域") as HTMLSelectElement).value).toBe("");
  expect(within(article(newMonth.label)).getByText("原文阅读", { exact: true })).toBeTruthy();
  expect(within(article(newMonth.label)).getByText(newMonth.text, { exact: true })).toBeTruthy();
  expect(within(article(newMonth.label)).getByRole("button", { name: "读完整结论" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("月份与领域"), { target: { value: newMonth.stableId } });
  expect(article(newMonth.label).querySelector("p.reading-explanation-original")!.textContent).toBe(newMonth.text);
  expect(within(article(newMonth.label)).queryByRole("button", { name: "读完整结论" })).toBeNull();
  fireEvent.change(screen.getByLabelText("分别查看结果"), { target: { value: "backward" } });
  expect((screen.getByLabelText("月份与领域") as HTMLSelectElement).value).toBe("");
  expect(screen.queryByText(newMonth.text, { exact: true })).toBeNull();
  expect(onRequestYear.mock.calls).toEqual([[2028], [2029]]);
  expect(JSON.stringify(index)).toBe(before);
  expect(JSON.stringify(updated)).toBe(updatedBefore);
});

it.each(["case", "revision", "version", "time"] as const)("rejects a saved report with mismatched %s while retaining its exact original reading", async variant => {
  const index = fixture(), record = await saved(index, variant), before = JSON.stringify(record);
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[record]} />);
  fireEvent.click(screen.getByText("出生时间与旧报告"));
  fireEvent.click(screen.getByRole("button", { name: "对照旧报告" }));
  fireEvent.change(screen.getByLabelText("选择旧报告"), { target: { value: record.id } });
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("未用于来源对照"));
  expect(view.container.querySelector("pre")!.textContent).toBe(reportText);
  expect(screen.queryByText("对应条目的原文没有变化。", { exact: true })).toBeNull();
  expect(JSON.stringify(record)).toBe(before);
});

it("compares a genuinely matching saved index without recomputing or changing the stored record", async () => {
  const index = fixture(), record = await saved(index), before = JSON.stringify({ index, record });
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[record]} />);
  fireEvent.click(screen.getByText("出生时间与旧报告"));
  fireEvent.click(screen.getByRole("button", { name: "对照旧报告" }));
  fireEvent.change(screen.getByLabelText("选择旧报告"), { target: { value: record.id } });
  await waitFor(() => expect(screen.getByText("对应条目的原文没有变化。", { exact: true })).toBeTruthy());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(view.container.querySelector("pre")!.textContent).toBe(reportText);
  expect(JSON.stringify({ index, record })).toBe(before);
});

it("retains legacy report text without inventing missing provenance or comparing it to current conclusions", async () => {
  const index = fixture(), record = await saved(index, "legacy");
  const view = render(<ReadingExplanationWorkbench index={index} revision={revision} records={[record]} />);
  fireEvent.click(screen.getByText("出生时间与旧报告"));
  fireEvent.click(screen.getByRole("button", { name: "对照旧报告" }));
  fireEvent.change(screen.getByLabelText("选择旧报告"), { target: { value: record.id } });
  await waitFor(() => expect(screen.getByText("这份旧报告没有保存逐条依据索引，无法可靠归因输入、规则或文案变化；下面保留当时原文。", { exact: true })).toBeTruthy());
  expect(view.container.querySelector("pre")!.textContent).toBe(reportText);
  expect(screen.queryByText("对应条目的原文没有变化。", { exact: true })).toBeNull();
  expect(view.container.querySelectorAll("[data-reading-conclusion]")).toHaveLength(0);
});
