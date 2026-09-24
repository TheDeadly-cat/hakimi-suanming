import { RELEASE_BROWSER_MATRIX } from "./playwright.release-browser-matrix.ts";

export const RELEASE_BROWSER_RESULT_SUMMARY_SCHEMA_VERSION = 1 as const;
export const REQUIRED_RELEASE_BROWSER_RECEIPT_IDS = Object.freeze([
  "backup",
  "boot",
  "pwa",
  "web-v1-flow"
] as const);
export const REQUIRED_RELEASE_BROWSER_TESTS_PER_PROJECT = Object.freeze({
  backup: 4,
  boot: 8,
  pwa: 1,
  "web-v1-flow": 1
} as const);
export const CROSS_SCHEMA_V13_V16_RECEIPT_ID = "cross-schema-v13-v16" as const;
export const CROSS_SCHEMA_V13_V16_SPEC_PATH =
  "apps/web/e2e/service-worker-cross-schema-v13-v16.spec.ts" as const;
export const CROSS_SCHEMA_V13_V16_TEST_TITLES = Object.freeze([
  "双旧 v13 页中一页已确认、另一页仍在万条慢审计时，新 v16 worker 接管后自动收敛",
  "首个 v16 试运行页在源冻结被慢旧页拖过时限后自动重试并完成收敛",
  "全新浏览器直接安装 v16 时从空 v13 建立完整目标并确认 clean epoch",
  "富 v13 数据直升 v16 后，业务写入变 dirty、全审计恢复 clean、再次启动命中 cache",
  "v16 冻结多个 v13 页的真实写入，提交后旧页只收敛到 v16",
  "v16 影子容量不足时保留 v13、目标零创建且不发送 BOOT_OK",
  "v16 目标启动校验失败时隔离影子库并保持 v13 可恢复",
  "v16 目标完整审计摘要不符时删除目标并保留 v13",
  "v16 Dexie 迁移事务中止时回滚 shadow、mutationState 不留下半代",
  "v16 control 已提交但 BOOT_OK 中断时保持写锁，刷新后 clean 收敛",
  "陈旧页面持有 v16 target versionchange 时超时失败关闭且不提交目标",
  "dirty v16 全审计期间并发受支持写入使 CAS 失败，随后全审计恢复并命中 clean cache",
  "v16 隔离受阻后同 migrationId 只清理不续跑，新 migrationId 可长期重发"
] as const);
// Completion evidence also covers cross-schema fixtures. The original four
// receipt ids above retain their separate default-v13 artifact-binding meaning.
export const REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT = Object.freeze({
  ...REQUIRED_RELEASE_BROWSER_TESTS_PER_PROJECT,
  [CROSS_SCHEMA_V13_V16_RECEIPT_ID]: 13
} as const);
export const REQUIRED_RELEASE_BROWSER_PROJECT_NAMES = Object.freeze(
  RELEASE_BROWSER_MATRIX.map((browser) => browser.projectName)
);

export type ReleaseBrowserReceiptId =
  (typeof REQUIRED_RELEASE_BROWSER_RECEIPT_IDS)[number];
export type ReleaseBrowserCompletionReceiptId =
  keyof typeof REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT;
export type ReleaseBrowserFullResultStatus =
  "passed" | "failed" | "timedout" | "interrupted";
export type ReleaseBrowserTestResultStatus =
  "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

export type ReleaseBrowserTestObservation = Readonly<{
  projectName: string;
  expectedStatus: ReleaseBrowserTestResultStatus;
  outcome: "skipped" | "expected" | "unexpected" | "flaky";
  resultStatuses: readonly ReleaseBrowserTestResultStatus[];
  title?: string;
  file?: string;
  retryIndexes?: readonly number[];
}>;

type BuildReleaseBrowserResultSummaryInput = Readonly<{
  receiptId: string;
  fullResultStatus: ReleaseBrowserFullResultStatus;
  expectedTestsPerProject: number;
  observations: readonly ReleaseBrowserTestObservation[];
  errors?: readonly string[];
}>;

const PROJECT_SUMMARY_KEYS = Object.freeze([
  "projectName",
  "discovered",
  "passed",
  "skipped",
  "failed",
  "timedOut",
  "interrupted",
  "unexpected",
  "flaky",
  "nonPassedExpectedStatus",
  "attempts"
]);
const SUMMARY_KEYS = Object.freeze([
  "schemaVersion",
  "summaryType",
  "receiptId",
  "expectedTestsPerProject",
  "expectedProjectNames",
  "fullResultStatus",
  "strictGatePassed",
  "unexpectedProjectNames",
  "errors",
  "projects"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

export function isReleaseBrowserReceiptId(value: unknown): value is ReleaseBrowserReceiptId {
  return typeof value === "string"
    && Object.hasOwn(REQUIRED_RELEASE_BROWSER_TESTS_PER_PROJECT, value);
}

export function isReleaseBrowserCompletionReceiptId(
  value: unknown
): value is ReleaseBrowserCompletionReceiptId {
  return typeof value === "string"
    && Object.hasOwn(REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT, value);
}

function crossSchemaCompletionErrors(
  observations: readonly ReleaseBrowserTestObservation[]
): string[] {
  const errors: string[] = [];
  const expectedTitles = JSON.stringify([...CROSS_SCHEMA_V13_V16_TEST_TITLES].sort());
  for (const projectName of REQUIRED_RELEASE_BROWSER_PROJECT_NAMES) {
    const projectObservations = observations.filter((entry) => entry.projectName === projectName);
    if (JSON.stringify(projectObservations.map((entry) => entry.title).sort()) !== expectedTitles) {
      errors.push(`Cross-schema completion must contain every original title exactly once: ${projectName}.`);
    }
  }
  for (const observation of observations) {
    if (observation.file !== CROSS_SCHEMA_V13_V16_SPEC_PATH) {
      errors.push(`Cross-schema completion came from another or missing spec: ${observation.projectName}.`);
    }
    if (!Array.isArray(observation.retryIndexes)
      || observation.retryIndexes.length !== 1
      || observation.retryIndexes[0] !== 0) {
      errors.push(`Cross-schema completion requires one initial attempt: ${observation.projectName}.`);
    }
  }
  return errors;
}

export function buildReleaseBrowserResultSummary({
  receiptId,
  fullResultStatus,
  expectedTestsPerProject,
  observations,
  errors = []
}: BuildReleaseBrowserResultSummaryInput) {
  const summaryErrors = receiptId === CROSS_SCHEMA_V13_V16_RECEIPT_ID
    ? [...errors, ...crossSchemaCompletionErrors(observations)]
    : [...errors];
  const expectedProjectNames = [...REQUIRED_RELEASE_BROWSER_PROJECT_NAMES];
  const unexpectedProjectNames = [...new Set(
    observations
      .map((observation) => observation.projectName)
      .filter((projectName) => !expectedProjectNames.includes(projectName as never))
  )].sort();

  const projects = expectedProjectNames.map((projectName) => {
    const projectObservations = observations.filter(
      (observation) => observation.projectName === projectName
    );
    return Object.freeze({
      projectName,
      discovered: projectObservations.length,
      passed: projectObservations.filter((observation) =>
        observation.expectedStatus === "passed"
        && observation.outcome === "expected"
        && observation.resultStatuses.length === 1
        && observation.resultStatuses[0] === "passed"
      ).length,
      skipped: projectObservations.filter((observation) =>
        observation.expectedStatus === "skipped"
        || observation.outcome === "skipped"
        || observation.resultStatuses.includes("skipped")
      ).length,
      failed: projectObservations.filter((observation) =>
        observation.resultStatuses.includes("failed")
      ).length,
      timedOut: projectObservations.filter((observation) =>
        observation.resultStatuses.includes("timedOut")
      ).length,
      interrupted: projectObservations.filter((observation) =>
        observation.resultStatuses.includes("interrupted")
      ).length,
      unexpected: projectObservations.filter((observation) =>
        observation.outcome === "unexpected"
      ).length,
      flaky: projectObservations.filter((observation) =>
        observation.outcome === "flaky"
      ).length,
      nonPassedExpectedStatus: projectObservations.filter((observation) =>
        observation.expectedStatus !== "passed"
      ).length,
      attempts: projectObservations.reduce(
        (count, observation) => count + observation.resultStatuses.length,
        0
      )
    });
  });

  const strictProjectCounts = projects.every((project) =>
    project.discovered === expectedTestsPerProject
    && project.passed === expectedTestsPerProject
    && project.skipped === 0
    && project.failed === 0
    && project.timedOut === 0
    && project.interrupted === 0
    && project.unexpected === 0
    && project.flaky === 0
    && project.nonPassedExpectedStatus === 0
    && project.attempts === expectedTestsPerProject
  );
  const strictGatePassed = isReleaseBrowserCompletionReceiptId(receiptId)
    && expectedTestsPerProject === REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT[receiptId]
    && fullResultStatus === "passed"
    && unexpectedProjectNames.length === 0
    && summaryErrors.length === 0
    && strictProjectCounts;

  return Object.freeze({
    schemaVersion: RELEASE_BROWSER_RESULT_SUMMARY_SCHEMA_VERSION,
    summaryType: "release_browser_test_summary" as const,
    receiptId,
    expectedTestsPerProject,
    expectedProjectNames: Object.freeze(expectedProjectNames),
    fullResultStatus,
    strictGatePassed,
    unexpectedProjectNames: Object.freeze(unexpectedProjectNames),
    errors: Object.freeze(summaryErrors),
    projects: Object.freeze(projects)
  });
}

export function assertStrictReleaseBrowserResultSummary(
  value: unknown,
  expectedReceiptId: string
): asserts value is ReturnType<typeof buildReleaseBrowserResultSummary> {
  if (!isRecord(value) || !hasExactKeys(value, SUMMARY_KEYS)) {
    throw new Error("Release browser result summary shape is invalid.");
  }
  const expectedTestsPerProject = isReleaseBrowserCompletionReceiptId(value.receiptId)
    ? REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT[value.receiptId]
    : null;
  if (
    value.schemaVersion !== RELEASE_BROWSER_RESULT_SUMMARY_SCHEMA_VERSION
    || value.summaryType !== "release_browser_test_summary"
    || value.receiptId !== expectedReceiptId
    || !isReleaseBrowserCompletionReceiptId(value.receiptId)
    || value.expectedTestsPerProject !== expectedTestsPerProject
    || value.fullResultStatus !== "passed"
    || value.strictGatePassed !== true
    || JSON.stringify(value.expectedProjectNames) !==
      JSON.stringify(REQUIRED_RELEASE_BROWSER_PROJECT_NAMES)
    || !Array.isArray(value.unexpectedProjectNames)
    || value.unexpectedProjectNames.length !== 0
    || !Array.isArray(value.errors)
    || value.errors.length !== 0
    || !Array.isArray(value.projects)
    || value.projects.length !== REQUIRED_RELEASE_BROWSER_PROJECT_NAMES.length
  ) {
    throw new Error("Release browser result summary did not satisfy the strict matrix gate.");
  }

  for (let index = 0; index < value.projects.length; index += 1) {
    const project = value.projects[index];
    if (!isRecord(project) || !hasExactKeys(project, PROJECT_SUMMARY_KEYS)) {
      throw new Error("Release browser project result shape is invalid.");
    }
    if (
      project.projectName !== REQUIRED_RELEASE_BROWSER_PROJECT_NAMES[index]
      || project.discovered !== expectedTestsPerProject
      || project.passed !== expectedTestsPerProject
      || project.skipped !== 0
      || project.failed !== 0
      || project.timedOut !== 0
      || project.interrupted !== 0
      || project.unexpected !== 0
      || project.flaky !== 0
      || project.nonPassedExpectedStatus !== 0
      || project.attempts !== expectedTestsPerProject
      || !PROJECT_SUMMARY_KEYS.slice(1).every((key) => isNonNegativeInteger(project[key]))
    ) {
      throw new Error(`Release browser project result is not an exact pass: ${String(project.projectName)}.`);
    }
  }
}
