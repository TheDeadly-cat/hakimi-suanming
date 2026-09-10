import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError
} from "@playwright/test/reporter";
import {
  buildReleaseBrowserResultSummary,
  CROSS_SCHEMA_V13_V16_RECEIPT_ID,
  CROSS_SCHEMA_V13_V16_SPEC_PATH,
  REQUIRED_RELEASE_BROWSER_PROJECT_NAMES,
  type ReleaseBrowserTestObservation
} from "./playwright.release-browser-result.ts";

type StrictReporterOptions = Readonly<{
  receiptId: string;
  expectedTestsPerProject: number;
}>;

const workspaceRoot = fileURLToPath(new URL("../../", import.meta.url));
const crossSchemaConfigPath = path.join(workspaceRoot, "apps/web/playwright.cross-schema-v13-v16.config.ts");
const crossSchemaTestDirectory = path.dirname(path.join(workspaceRoot, CROSS_SCHEMA_V13_V16_SPEC_PATH));
const crossSchemaSpecName = path.basename(CROSS_SCHEMA_V13_V16_SPEC_PATH);

function isUnfilteredGrep(value: FullConfig["grep"]): boolean {
  return value instanceof RegExp && value.source === ".*" && value.flags === "";
}

export function validateCrossSchemaV13V16CompletionConfig(
  config: FullConfig,
  argv: readonly string[] = process.argv
): string[] {
  const errors: string[] = [];
  if (path.resolve(config.configFile ?? "") !== path.resolve(crossSchemaConfigPath)
    || path.resolve(config.rootDir) !== path.resolve(crossSchemaTestDirectory)) {
    errors.push("Cross-schema completion requires the original config and test directory.");
  }
  if (config.workers !== 1 || config.fullyParallel !== false
    || config.forbidOnly !== true || config.failOnFlakyTests !== true
    || config.maxFailures !== 0) {
    errors.push("Cross-schema completion requires the complete serial fail-on-flaky execution policy.");
  }
  if (config.shard !== null || !isUnfilteredGrep(config.grep) || config.grepInvert !== null) {
    errors.push("Cross-schema completion does not admit sharding or title filters.");
  }
  if ([...(config.argv ?? []), ...argv].some((argument) =>
    /^(?:--(?:grep|grep-invert|project|shard|last-failed|only-changed|test-list|test-list-invert|repeat-each))(?:=|$)/u.test(argument)
    || /^-[gG]/u.test(argument)
  )) {
    errors.push("Cross-schema completion does not admit a filtered or repeated CLI invocation.");
  }
  if (JSON.stringify(config.projects.map((project) => project.name))
    !== JSON.stringify(REQUIRED_RELEASE_BROWSER_PROJECT_NAMES)) {
    errors.push("Cross-schema completion projects must be exactly msedge and chrome.");
  }
  for (const project of config.projects) {
    const matches = Array.isArray(project.testMatch) ? project.testMatch : [project.testMatch];
    if (project.use.channel !== project.name
      || project.retries !== 0 || project.repeatEach !== 1
      || project.dependencies.length !== 0 || project.teardown !== undefined) {
      errors.push(`Cross-schema completion brand or attempt policy changed: ${project.name}.`);
    }
    if (path.resolve(project.testDir) !== path.resolve(crossSchemaTestDirectory)
      || matches.length !== 1 || matches[0] !== crossSchemaSpecName
      || !Array.isArray(project.testIgnore) || project.testIgnore.length !== 0
      || !isUnfilteredGrep(project.grep) || project.grepInvert !== null) {
      errors.push(`Cross-schema completion spec selection changed: ${project.name}.`);
    }
  }
  return errors;
}

export function isPlaywrightListOnlyInvocation(
  argv: readonly string[] = process.argv
): boolean {
  return argv.includes("--list");
}

export default class ReleaseBrowserStrictReporter implements Reporter {
  private readonly options: StrictReporterOptions;
  private tests: TestCase[] = [];
  private configErrors: string[] = [];
  private reportedErrors: string[] = [];

  constructor(options: StrictReporterOptions) {
    this.options = options;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.tests = suite.allTests();
    this.configErrors = this.options.receiptId === CROSS_SCHEMA_V13_V16_RECEIPT_ID
      ? validateCrossSchemaV13V16CompletionConfig(config)
      : [];
    if (this.options.receiptId === CROSS_SCHEMA_V13_V16_RECEIPT_ID
      && this.tests.some((test) => test.retries !== 0 || test.repeatEachIndex !== 0)) {
      this.configErrors.push("Cross-schema completion does not admit per-test retries or repetition.");
    }
  }

  onError(error: TestError): void {
    this.reportedErrors.push(error.message ?? error.value ?? "Playwright reported an error.");
  }

  async onEnd(result: FullResult): Promise<{ status?: FullResult["status"] }> {
    // `playwright test --list` reports every discovered test as skipped. It is
    // a static discovery command, not release evidence, so it must neither
    // emit a receipt summary nor fail its own listing. The receipt runner still
    // fails closed because the canonical browser commands never contain
    // `--list` and a browser receipt without a summary is invalid.
    if (isPlaywrightListOnlyInvocation()) {
      return { status: result.status };
    }

    const configuredReceiptId = this.options.receiptId;
    const environmentReceiptId = process.env.HAKIMI_RELEASE_BROWSER_RECEIPT_ID;
    const errors: string[] = [...this.configErrors, ...this.reportedErrors];
    if (environmentReceiptId && environmentReceiptId !== configuredReceiptId) {
      errors.push(
        `Reporter receipt id mismatch: expected ${configuredReceiptId}, got ${environmentReceiptId}.`
      );
    }

    const observations: ReleaseBrowserTestObservation[] = this.tests.map((test) => ({
      projectName: test.parent.project()?.name ?? "unknown-project",
      expectedStatus: test.expectedStatus,
      outcome: test.outcome(),
      resultStatuses: test.results.map((testResult) => testResult.status),
      ...(configuredReceiptId === CROSS_SCHEMA_V13_V16_RECEIPT_ID ? {
        title: test.title,
        file: path.relative(workspaceRoot, test.location.file).replaceAll("\\", "/"),
        retryIndexes: test.results.map((testResult) => testResult.retry)
      } : {})
    }));
    const summary = buildReleaseBrowserResultSummary({
      receiptId: configuredReceiptId,
      fullResultStatus: result.status,
      expectedTestsPerProject: this.options.expectedTestsPerProject,
      observations,
      errors
    });

    const outputPath = process.env.HAKIMI_RELEASE_BROWSER_RESULT_OUTPUT;
    let writeFailed = false;
    if (outputPath) {
      try {
        if (!path.isAbsolute(outputPath)) {
          throw new Error("Release browser result output must be absolute.");
        }
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
      } catch (error) {
        writeFailed = true;
        process.stderr.write(
          `Release browser result summary write failed: ${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    }
    process.stdout.write(`HAKIMI_RELEASE_BROWSER_RESULT ${JSON.stringify(summary)}\n`);

    return {
      status: summary.strictGatePassed && !writeFailed ? result.status : "failed"
    };
  }
}
