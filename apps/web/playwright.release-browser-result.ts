import { RELEASE_BROWSER_MATRIX } from "./playwright.release-browser-matrix.ts";

export const RELEASE_BROWSER_RESULT_SUMMARY_SCHEMA_VERSION = 1 as const;
export const REQUIRED_RELEASE_BROWSER_RECEIPT_IDS = Object.freeze([
  "pwa",
  "web-v1-flow"
] as const);
export const REQUIRED_RELEASE_BROWSER_PROJECT_NAMES = Object.freeze(
  RELEASE_BROWSER_MATRIX.map((browser) => browser.projectName)
);

export type ReleaseBrowserReceiptId =
  (typeof REQUIRED_RELEASE_BROWSER_RECEIPT_IDS)[number];
export type ReleaseBrowserFullResultStatus =
  "passed" | "failed" | "timedout" | "interrupted";
export type ReleaseBrowserTestResultStatus =
  "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

export type ReleaseBrowserTestObservation = Readonly<{
  projectName: string;
  expectedStatus: ReleaseBrowserTestResultStatus;
  outcome: "skipped" | "expected" | "unexpected" | "flaky";
  resultStatuses: readonly ReleaseBrowserTestResultStatus[];
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
    && (REQUIRED_RELEASE_BROWSER_RECEIPT_IDS as readonly string[]).includes(value);
}

export function buildReleaseBrowserResultSummary({
  receiptId,
  fullResultStatus,
  expectedTestsPerProject,
  observations,
  errors = []
}: BuildReleaseBrowserResultSummaryInput) {
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
  const strictGatePassed = isReleaseBrowserReceiptId(receiptId)
    && Number.isInteger(expectedTestsPerProject)
    && expectedTestsPerProject > 0
    && fullResultStatus === "passed"
    && unexpectedProjectNames.length === 0
    && errors.length === 0
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
    errors: Object.freeze([...errors]),
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
  if (
    value.schemaVersion !== RELEASE_BROWSER_RESULT_SUMMARY_SCHEMA_VERSION
    || value.summaryType !== "release_browser_test_summary"
    || value.receiptId !== expectedReceiptId
    || !isReleaseBrowserReceiptId(value.receiptId)
    || value.expectedTestsPerProject !== 1
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
      || project.discovered !== 1
      || project.passed !== 1
      || project.skipped !== 0
      || project.failed !== 0
      || project.timedOut !== 0
      || project.interrupted !== 0
      || project.unexpected !== 0
      || project.flaky !== 0
      || project.nonPassedExpectedStatus !== 0
      || project.attempts !== 1
      || !PROJECT_SUMMARY_KEYS.slice(1).every((key) => isNonNegativeInteger(project[key]))
    ) {
      throw new Error(`Release browser project result is not an exact pass: ${String(project.projectName)}.`);
    }
  }
}
