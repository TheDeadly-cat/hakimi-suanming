import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase
} from "@playwright/test/reporter";
import {
  buildReleaseBrowserResultSummary,
  type ReleaseBrowserTestObservation
} from "./playwright.release-browser-result.ts";

type StrictReporterOptions = Readonly<{
  receiptId: string;
  expectedTestsPerProject: number;
}>;

export function isPlaywrightListOnlyInvocation(
  argv: readonly string[] = process.argv
): boolean {
  return argv.includes("--list");
}

export default class ReleaseBrowserStrictReporter implements Reporter {
  private readonly options: StrictReporterOptions;
  private tests: TestCase[] = [];

  constructor(options: StrictReporterOptions) {
    this.options = options;
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.tests = suite.allTests();
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
    const errors: string[] = [];
    if (environmentReceiptId && environmentReceiptId !== configuredReceiptId) {
      errors.push(
        `Reporter receipt id mismatch: expected ${configuredReceiptId}, got ${environmentReceiptId}.`
      );
    }

    const observations: ReleaseBrowserTestObservation[] = this.tests.map((test) => ({
      projectName: test.parent.project()?.name ?? "unknown-project",
      expectedStatus: test.expectedStatus,
      outcome: test.outcome(),
      resultStatuses: test.results.map((testResult) => testResult.status)
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
