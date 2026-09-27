import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError } from "@playwright/test/reporter";

export const DELIVERY_PROJECTS = ["msedge-headless", "msedge-headed", "chrome-headless", "chrome-headed"] as const;
export const DELIVERY_TESTS = [
  ["persistent-file-delivery.spec.ts", "minimal fixed ZIP download verifies completion and survival across profile reuse"],
  ["persistent-file-delivery.spec.ts", "locked v13 thousand-case backup survives full browser reopen and repeated verified delivery"],
  ["chosen-location-delivery.spec.ts", "chosen-location receipt shows native handle rename, validates written ZIP, and treats cancellation separately"]
] as const;
const expected = new Set(DELIVERY_PROJECTS.flatMap(project => DELIVERY_TESTS.map(([file, title]) =>
  JSON.stringify([project, file, title]))));
export const DELIVERY_TEST_DIRECTORY = fileURLToPath(new URL("./e2e/", import.meta.url));

/** Local 3 x 4 completion check; never a formal release-admission receipt. */
export default class PersistentFileDeliveryReporter implements Reporter {
  private tests: TestCase[] = [];
  private errors: string[] = [];
  private readonly options: { outputFile?: string };
  constructor(options: { outputFile?: string } = {}) { this.options = options; }

  onBegin(config: FullConfig, suite: Suite) {
    this.tests = suite.allTests();
    if (process.env.HAKIMI_DOWNLOAD_REPRO_PIPE === "1") this.errors.push("Pipe diagnosis is not candidate acceptance.");
    if (config.workers !== 1 || config.fullyParallel || !config.forbidOnly || !config.failOnFlakyTests
      || config.shard !== null || config.maxFailures !== 0) this.errors.push("Incomplete serial acceptance policy.");
    if (JSON.stringify(config.projects.map(p => p.name)) !== JSON.stringify(DELIVERY_PROJECTS)) {
      this.errors.push("Acceptance requires exactly four browser/mode projects.");
    }
    for (const project of config.projects) {
      const [channel, mode] = project.name.split("-");
      if (project.use.channel !== channel || project.use.headless !== (mode === "headless")
        || project.retries !== 0 || project.repeatEach !== 1) this.errors.push("Changed browser or attempt policy: " + project.name);
    }
  }
  onError(error: TestError) { this.errors.push(error.message ?? error.value ?? "Playwright error"); }

  async onEnd(result: FullResult): Promise<{ status: FullResult["status"] }> {
    // Discovery is not an acceptance result and must not create a success receipt.
    if (process.argv.includes("--list")) return { status: result.status };
    const errors = [...this.errors];
    const seen = new Set<string>();
    const observations = this.tests.map(test => {
      const project = test.parent.project()?.name ?? "unknown";
      const file = path.relative(DELIVERY_TEST_DIRECTORY, test.location.file).replaceAll("\\", "/");
      const identity = JSON.stringify([project, file, test.title]);
      if (!expected.has(identity) || seen.has(identity)) errors.push("Unexpected or duplicate test identity: " + identity);
      seen.add(identity);
      if (test.expectedStatus !== "passed" || test.outcome() !== "expected" || test.retries !== 0
        || test.repeatEachIndex !== 0 || test.results.length !== 1
        || test.results.some(r => r.status !== "passed" || r.retry !== 0 || r.errors.length > 0)) {
        errors.push("Skipped, retried, failed or incomplete test: " + identity);
      }
      return { project, file, title: test.title, expectedStatus: test.expectedStatus,
        results: test.results.map(r => ({ status: r.status, retry: r.retry })) };
    });
    for (const identity of expected) if (!seen.has(identity)) errors.push("Missing test identity: " + identity);
    if (result.status !== "passed") errors.push("Runner did not pass: " + result.status);
    const summary = { scope: "local-persistent-file-delivery", formalReleaseEvidenceReceipt: false,
      expected: expected.size, actual: this.tests.length, complete: errors.length === 0, errors, observations };
    if (this.options.outputFile) {
      await fs.mkdir(path.dirname(this.options.outputFile), { recursive: true });
      await fs.writeFile(this.options.outputFile, JSON.stringify(summary, null, 2) + "\n");
    }
    process.stdout.write("HAKIMI_PERSISTENT_DELIVERY_RESULT " + JSON.stringify(summary) + "\n");
    return { status: summary.complete ? "passed" : "failed" };
  }
}
