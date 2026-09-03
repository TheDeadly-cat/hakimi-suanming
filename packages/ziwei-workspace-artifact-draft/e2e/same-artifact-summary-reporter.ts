import os from "node:os";
import path from "node:path";
import { lstatSync, realpathSync, writeFileSync } from "node:fs";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult
} from "@playwright/test/reporter";

type SanitizedOutcome = Readonly<{
  projectName: string;
  scenarioId: string;
  expectedStatus: string;
  status: string;
  retry: number;
}>;

type ReporterOptions = Readonly<{ summaryPath?: unknown; configProbe?: unknown }>;

const PROJECT_NAMES = Object.freeze(["chrome", "msedge"] as const);
const SCENARIOS = Object.freeze([
  ["独立 4218 工作台完成计算、保存、重开、跨标签刷新与唯一清空", "ziwei.workspace.full-flow-save-reopen-clear"],
  ["当前盘四段式直读按宫切换、空宫失败关闭且零写入", "ziwei.workspace.four-part-readonly"],
  ["核心十二辅星候选只投影精确命中并保持非核心星失败关闭", "ziwei.workspace.core-minor-projection-readonly"],
  ["四化十二宫审稿模板可下载、只读预检且篡改失败后零写入", "ziwei.workspace.transformation-feedback-readonly"],
  ["v0.13 当前盘核心十二辅煞三方四正审稿包保持只读、整盘绑定与切宫稳定", "ziwei.workspace.core-minor-feedback-readonly"],
  ["独立紫微档案 8 条完整备份导出、清空与原子恢复", "ziwei.workspace.backup-clear-atomic-restore"],
  ["多标签陈旧写入在真实浏览器失败关闭且不产生部分写入", "ziwei.workspace.stale-tab-write"],
  ["紫微计算 Worker 崩溃时失败关闭且不出现保存表单", "ziwei.workspace.worker-crash"],
  ["紫微计算 Worker 畸形回执时失败关闭且不出现保存表单", "ziwei.workspace.worker-malformed"],
  ["损坏的紫微完整备份预检失败关闭且零写入", "ziwei.workspace.corrupt-backup"],
  ["紫微完整备份内容冲突恢复预检失败关闭且零写入", "ziwei.workspace.backup-content-conflict"],
  ["紫微保存事务中止时失败关闭且不产生部分写入", "ziwei.workspace.transaction-abort"],
  ["紫微保存遇到设备配额不足时失败关闭且不产生部分写入", "ziwei.workspace.quota-failure"],
  ["三方并发下两个陈旧标签页的保存均失败关闭且不产生部分写入", "ziwei.workspace.three-party-stale-writes"]
] as const);
const SCENARIO_BY_TITLE = new Map<string, string>(SCENARIOS);
const SCENARIO_ORDER = new Map<string, number>(SCENARIOS.map((entry, index) => [entry[1], index]));

function samePath(left: string, right: string): boolean {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function requiredTemporaryChild(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || !path.isAbsolute(value)) {
    throw new Error("same-artifact summaryPath must be an absolute system-temporary path");
  }
  const resolved = path.resolve(value);
  const parent = path.dirname(resolved);
  const parentStat = lstatSync(parent);
  const realParent = realpathSync.native(parent);
  const temporaryRoot = realpathSync.native(os.tmpdir());
  const relative = path.relative(temporaryRoot, realParent);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink() || !samePath(parent, realParent)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("same-artifact summaryPath parent must be a real system-temporary directory");
  }
  return path.join(realParent, path.basename(resolved));
}

export default class SameArtifactSummaryReporter implements Reporter {
  private readonly summaryPath: string;
  private readonly configProbe: boolean;
  private readonly outcomes: SanitizedOutcome[] = [];
  private readonly seenOutcomeKeys = new Set<string>();
  private configuredProjectNames: readonly string[] = [];
  private declaredOutcomeCount = 0;

  constructor(options: ReporterOptions = {}) {
    this.summaryPath = requiredTemporaryChild(options.summaryPath);
    if (typeof options.configProbe !== "boolean") {
      throw new Error("same-artifact configProbe must be an explicit boolean");
    }
    this.configProbe = options.configProbe;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.configuredProjectNames = Object.freeze(config.projects.map((project) => project.name).sort());
    if (JSON.stringify(this.configuredProjectNames) !== JSON.stringify(PROJECT_NAMES)) {
      throw new Error("same-artifact suite must use exact chrome and msedge projects");
    }
    const declared = new Set<string>();
    for (const test of suite.allTests()) {
      const projectName = test.parent.project()?.name ?? "";
      const scenarioId = SCENARIO_BY_TITLE.get(test.title);
      const key = `${projectName}\u0000${scenarioId ?? ""}`;
      if (!PROJECT_NAMES.includes(projectName as "chrome" | "msedge") || !scenarioId
          || test.expectedStatus !== "passed" || declared.has(key)) {
        throw new Error("same-artifact suite contains an extra, duplicate, or non-passing declaration");
      }
      declared.add(key);
    }
    this.declaredOutcomeCount = suite.allTests().length;
    if (this.declaredOutcomeCount !== 28 || declared.size !== 28) {
      throw new Error(`same-artifact suite must contain exactly 28 outcomes, got ${suite.allTests().length}`);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const projectName = test.parent.project()?.name ?? "";
    const scenarioId = SCENARIO_BY_TITLE.get(test.title);
    const key = `${projectName}\u0000${scenarioId ?? ""}`;
    if (!scenarioId || this.seenOutcomeKeys.has(key) || test.expectedStatus !== "passed"
        || result.retry !== 0 || result.status !== "passed") {
      throw new Error("same-artifact outcome is extra, duplicate, retried, or non-passing");
    }
    this.seenOutcomeKeys.add(key);
    this.outcomes.push(Object.freeze({
      projectName,
      scenarioId,
      expectedStatus: test.expectedStatus,
      status: result.status,
      retry: result.retry
    }));
  }

  onEnd(result: FullResult): void {
    if (this.configProbe) {
      if (result.status !== "passed" || this.declaredOutcomeCount !== 28
          || this.outcomes.length !== 0 || this.seenOutcomeKeys.size !== 0) {
        throw new Error("same-artifact cwd config probe did not remain list-only");
      }
      writeFileSync(this.summaryPath, `${JSON.stringify({
        schemaVersion: "hakimi.ziwei.same-artifact-config-path-probe/1",
        configuredProjectNames: this.configuredProjectNames,
        declaredOutcomeCount: this.declaredOutcomeCount,
        reporterLoadedFromConfig: true
      })}\n`, { encoding: "utf8", flag: "wx" });
      return;
    }
    if (result.status !== "passed" || this.outcomes.length !== 28 || this.seenOutcomeKeys.size !== 28) {
      throw new Error("same-artifact matrix did not finish as an exact 28/28 pass");
    }
    const summary = {
      schemaVersion: "hakimi.ziwei.same-artifact-playwright-summary/1",
      overallStatus: result.status,
      configuredProjectNames: this.configuredProjectNames,
      outcomeCount: this.outcomes.length,
      outcomes: [...this.outcomes].sort((left, right) => (
        PROJECT_NAMES.indexOf(left.projectName as "chrome" | "msedge")
        - PROJECT_NAMES.indexOf(right.projectName as "chrome" | "msedge")
        || (SCENARIO_ORDER.get(left.scenarioId) ?? -1) - (SCENARIO_ORDER.get(right.scenarioId) ?? -1)
      ))
    };
    writeFileSync(this.summaryPath, `${JSON.stringify(summary)}\n`, { encoding: "utf8", flag: "wx" });
  }

  printsToStdio(): boolean {
    return false;
  }
}
