import { lstatSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult
} from "@playwright/test/reporter";

type ReporterOptions = Readonly<{ summaryPath?: unknown; configProbe?: unknown }>;
type SanitizedStatus = "passed" | "failed" | "timedOut" | "skipped" | "interrupted"
  | "failed_stage_bootstrap"
  | "failed_stage_after_each_problem_check_console_warning"
  | "failed_stage_after_each_problem_check_console_error"
  | "failed_stage_after_each_problem_check_pageerror"
  | "failed_stage_after_each_problem_check_requestfailed"
  | "failed_stage_unique_input" | "failed_stage_unique_run_resolved"
  | "failed_stage_unique_exact_facts" | "failed_stage_unique_input_clear"
  | "failed_stage_unique_iana_navigation";
type SanitizedOutcome = Readonly<{
  projectName: string;
  scenarioId: string;
  status: SanitizedStatus;
  retry: 0;
}>;

const PROJECT_NAMES = Object.freeze(["chrome", "msedge"] as const);
const SCENARIOS = Object.freeze([
  ["唯一民用时只生成工程事实", "unique"],
  ["本地墙时空档失败关闭且无部分事实", "gap"],
  ["本地墙时重叠默认拒绝并失败关闭", "overlap_reject"],
  ["本地墙时重叠显式选择较早瞬时点", "overlap_earlier"],
  ["本地墙时重叠显式选择较晚瞬时点", "overlap_later"]
] as const);
const SCENARIO_BY_TITLE = new Map<string, string>(SCENARIOS);
const SCENARIO_ORDER = new Map<string, number>(SCENARIOS.map((entry, index) => [entry[1], index]));
const FIXED_STAGE_STATUS = new Map<string, SanitizedStatus>([
  ["VEDIC_FIXED_STAGE:bootstrap", "failed_stage_bootstrap"],
  ["VEDIC_FIXED_STAGE:after_each_problem_check_console_warning",
    "failed_stage_after_each_problem_check_console_warning"],
  ["VEDIC_FIXED_STAGE:after_each_problem_check_console_error",
    "failed_stage_after_each_problem_check_console_error"],
  ["VEDIC_FIXED_STAGE:after_each_problem_check_pageerror",
    "failed_stage_after_each_problem_check_pageerror"],
  ["VEDIC_FIXED_STAGE:after_each_problem_check_requestfailed",
    "failed_stage_after_each_problem_check_requestfailed"],
  ["VEDIC_FIXED_STAGE:unique_input", "failed_stage_unique_input"],
  ["VEDIC_FIXED_STAGE:unique_run_resolved", "failed_stage_unique_run_resolved"],
  ["VEDIC_FIXED_STAGE:unique_exact_facts", "failed_stage_unique_exact_facts"],
  ["VEDIC_FIXED_STAGE:unique_input_clear", "failed_stage_unique_input_clear"],
  ["VEDIC_FIXED_STAGE:unique_iana_navigation", "failed_stage_unique_iana_navigation"]
]);

function sanitizedStatus(result: TestResult): SanitizedStatus {
  if (result.status === "passed") return "passed";
  for (const error of result.errors) {
    if (typeof error.message !== "string") continue;
    const direct = FIXED_STAGE_STATUS.get(error.message);
    if (direct) return direct;
    const withoutPrefix = error.message.startsWith("Error: ") ? error.message.slice(7) : "";
    const prefixed = FIXED_STAGE_STATUS.get(withoutPrefix);
    if (prefixed) return prefixed;
  }
  return result.status;
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = path.normalize(left);
  const normalizedRight = path.normalize(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function requiredEvidenceTempRoot(): string {
  const raw = process.env.HAKIMI_VEDIC_EVIDENCE_TEMP_ROOT;
  if (typeof raw !== "string" || !path.isAbsolute(raw)) {
    throw new Error("Vedic evidence temp root must be absolute");
  }
  const resolved = path.resolve(raw);
  const stat = lstatSync(resolved);
  const real = realpathSync.native(resolved);
  const systemTemp = realpathSync.native(os.tmpdir());
  const relative = path.relative(systemTemp, real);
  if (!/^hakimi-vedic-same-artifact-[a-f0-9-]{36}$/u.test(path.basename(resolved))
      || !stat.isDirectory() || stat.isSymbolicLink() || !samePath(resolved, real)
      || (!samePath(real, systemTemp)
        && (relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)))) {
    throw new Error("Vedic evidence temp root must be the runner-owned isolated process temp or its real child");
  }
  return real;
}

function requiredTemporaryOutput(value: unknown, evidenceTempRoot: string): string {
  if (typeof value !== "string" || !path.isAbsolute(value)) {
    throw new Error("Vedic summaryPath must be absolute");
  }
  const resolved = path.resolve(value);
  const parent = path.dirname(resolved);
  const stat = lstatSync(parent);
  const realParent = realpathSync.native(parent);
  const relative = path.relative(evidenceTempRoot, realParent);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !samePath(parent, realParent)
      || relative.length === 0 || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Vedic summaryPath parent must be below the runner-owned temp root");
  }
  return path.join(realParent, path.basename(resolved));
}

export default class VedicSameArtifactSummaryReporter implements Reporter {
  private readonly summaryPath: string;
  private readonly configProbe: boolean;
  private readonly outcomes: SanitizedOutcome[] = [];
  private readonly outcomeKeys = new Set<string>();
  private configuredProjectNames: readonly string[] = [];
  private declaredOutcomeCount = 0;

  constructor(options: ReporterOptions = {}) {
    this.summaryPath = requiredTemporaryOutput(options.summaryPath, requiredEvidenceTempRoot());
    if (typeof options.configProbe !== "boolean") {
      throw new Error("Vedic configProbe must be an explicit boolean");
    }
    this.configProbe = options.configProbe;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.configuredProjectNames = Object.freeze(config.projects.map((project) => project.name).sort());
    if (JSON.stringify(this.configuredProjectNames) !== JSON.stringify(PROJECT_NAMES)) {
      throw new Error("Vedic evidence suite requires exact chrome and msedge projects");
    }
    const declarations = new Set<string>();
    for (const test of suite.allTests()) {
      const projectName = test.parent.project()?.name ?? "";
      const scenarioId = SCENARIO_BY_TITLE.get(test.title);
      const key = `${projectName}\u0000${scenarioId ?? ""}`;
      if (!PROJECT_NAMES.includes(projectName as "chrome" | "msedge") || !scenarioId
          || test.expectedStatus !== "passed" || declarations.has(key)) {
        throw new Error("Vedic evidence suite contains an extra, duplicate, or non-passing declaration");
      }
      declarations.add(key);
    }
    this.declaredOutcomeCount = suite.allTests().length;
    if (this.declaredOutcomeCount !== 10 || declarations.size !== 10) {
      throw new Error("Vedic evidence suite must declare exactly ten outcomes");
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const projectName = test.parent.project()?.name ?? "";
    const scenarioId = SCENARIO_BY_TITLE.get(test.title);
    const key = `${projectName}\u0000${scenarioId ?? ""}`;
    const status = sanitizedStatus(result);
    if (!PROJECT_NAMES.includes(projectName as "chrome" | "msedge") || !scenarioId
        || this.outcomeKeys.has(key) || test.expectedStatus !== "passed" || result.retry !== 0
        || !["passed", "timedOut", "skipped", "interrupted",
          "failed_stage_bootstrap",
          "failed_stage_after_each_problem_check_console_warning",
          "failed_stage_after_each_problem_check_console_error",
          "failed_stage_after_each_problem_check_pageerror",
          "failed_stage_after_each_problem_check_requestfailed",
          "failed_stage_unique_input", "failed_stage_unique_run_resolved",
          "failed_stage_unique_exact_facts", "failed_stage_unique_input_clear",
          "failed_stage_unique_iana_navigation"
        ].includes(status)) {
      throw new Error("Vedic evidence outcome is extra, duplicate, retried, or has an unknown fixed status");
    }
    this.outcomeKeys.add(key);
    this.outcomes.push(Object.freeze({
      projectName,
      scenarioId,
      status,
      retry: 0
    }));
  }

  onEnd(result: FullResult): void {
    if (this.configProbe) {
      if (result.status !== "passed" || this.declaredOutcomeCount !== 10
          || this.outcomes.length !== 0 || this.outcomeKeys.size !== 0) {
        throw new Error("Vedic config path probe did not remain list-only");
      }
      writeFileSync(this.summaryPath, `${JSON.stringify({
        schemaVersion: "hakimi.vedic.same-artifact-config-path-probe/1",
        configuredProjectNames: this.configuredProjectNames,
        declaredOutcomeCount: this.declaredOutcomeCount,
        reporterLoadedFromConfig: true
      })}\n`, { encoding: "utf8", flag: "wx" });
      return;
    }
    const outcomes = [...this.outcomes].sort((left, right) => (
      PROJECT_NAMES.indexOf(left.projectName as "chrome" | "msedge")
      - PROJECT_NAMES.indexOf(right.projectName as "chrome" | "msedge")
      || (SCENARIO_ORDER.get(left.scenarioId) ?? -1) - (SCENARIO_ORDER.get(right.scenarioId) ?? -1)
    ));
    const exactTenPassed = result.status === "passed" && outcomes.length === 10
      && this.outcomeKeys.size === 10 && outcomes.every((entry) => entry.status === "passed");
    writeFileSync(this.summaryPath, `${JSON.stringify({
      schemaVersion: "hakimi.vedic.same-artifact-playwright-summary/1",
      overallStatus: exactTenPassed ? "passed" : "failed",
      configuredProjectNames: this.configuredProjectNames,
      outcomeCount: outcomes.length,
      outcomes
    })}\n`, { encoding: "utf8", flag: "wx" });
  }

  printsToStdio(): boolean {
    return false;
  }
}
