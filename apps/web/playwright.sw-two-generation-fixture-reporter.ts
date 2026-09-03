import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult
} from "@playwright/test/reporter";
import {
  buildSwTwoGenerationFixtureSummary,
  SW_TWO_GENERATION_FIXTURE_ANNOTATIONS,
  SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES,
  type SwTwoGenerationFixtureTestObservation
} from "./playwright.sw-two-generation-fixture-result.ts";
import {
  assertSwTwoGenerationFixtureCriticalSourceIdentity,
  loadSwTwoGenerationFixtureCriticalSourceIdentity,
  type SwTwoGenerationFixtureCriticalSourceIdentity
} from "./sw-two-generation-fixture-source-identity.ts";
import {
  snapshotSwTwoGenerationArtifactSetDirectory,
  type SwTwoGenerationArtifactSetIdentity
} from "./sw-two-generation-artifact-identity.ts";

const expectedConfigPath = fileURLToPath(new URL(
  "./playwright.sw-upgrade.config.ts",
  import.meta.url
));
const expectedSpecPath = fileURLToPath(new URL(
  "./e2e/service-worker-two-generation.spec.ts",
  import.meta.url
));
const expectedTestDir = path.dirname(expectedSpecPath);
const expectedOutputDir = path.join(os.tmpdir(), "hakimi-bazi-sw-upgrade-results");

export function isSwTwoGenerationFixtureListOnlyInvocation(
  argv: readonly string[] = process.argv
): boolean {
  return argv.includes("--list");
}

function annotationDescription(result: TestResult | undefined, type: string): string | null {
  const values = result?.annotations
    .filter((annotation) => annotation.type === type)
    .map((annotation) => annotation.description)
    .filter((description): description is string => typeof description === "string") ?? [];
  return values.length === 1 ? values[0] : null;
}

function sourceLocatedAnnotationDescription(
  result: TestResult | undefined,
  type: string,
  expectedFile: string
): string | null {
  const matches = result?.annotations.filter((annotation) => annotation.type === type) ?? [];
  if (matches.length !== 1 || typeof matches[0]?.description !== "string") return null;
  return path.resolve(matches[0].location?.file ?? "") === path.resolve(expectedFile)
    ? matches[0].description
    : null;
}

export function validateEffectiveSwTwoGenerationFixtureConfig(config: FullConfig): string[] {
  const errors: string[] = [];
  if (path.resolve(config.configFile ?? "") !== path.resolve(expectedConfigPath)) {
    errors.push("Effective Playwright config file is not the checked SW fixture config.");
  }
  if (config.workers !== 1) errors.push("Effective SW fixture workers must equal one.");
  if (config.fullyParallel !== false) errors.push("Effective SW fixture fullyParallel must be false.");
  if (config.forbidOnly !== true) errors.push("Effective SW fixture forbidOnly must be true.");
  if (config.failOnFlakyTests !== true) errors.push("Effective SW fixture failOnFlakyTests must be true.");
  if (config.shard !== null) errors.push("SW fixture sharding is not admitted.");
  if (JSON.stringify(config.projects.map((project) => project.name))
    !== JSON.stringify(SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES)) {
    errors.push("Effective SW fixture browser projects must be exactly msedge and chrome.");
  }
  for (const project of config.projects) {
    if (project.retries !== 0) errors.push(`Effective retries must be zero: ${project.name}.`);
    if (project.repeatEach !== 1) errors.push(`Effective repeatEach must be one: ${project.name}.`);
    if (path.resolve(project.outputDir) !== path.resolve(expectedOutputDir)) {
      errors.push(`Effective outputDir is not the checked system temporary directory: ${project.name}.`);
    }
    if (path.resolve(project.testDir) !== path.resolve(expectedTestDir)) {
      errors.push(`Effective testDir is not the checked SW fixture directory: ${project.name}.`);
    }
    if (project.metadata.artifactBinding !== "shared_runner_owned_artifact_set_v1") {
      errors.push(`Effective artifact binding metadata drifted: ${project.name}.`);
    }
  }
  return errors;
}

export default class SwTwoGenerationFixtureReporter implements Reporter {
  private tests: TestCase[] = [];
  private configErrors: string[] = [];
  private criticalSourceIdentity: SwTwoGenerationFixtureCriticalSourceIdentity | null = null;
  private attemptId: string | null = null;
  private outputPath: string | null = null;
  private artifactRoot: string | null = null;
  private artifactSetSha256: string | null = null;

  onBegin(config: FullConfig, suite: Suite): void {
    this.configErrors = validateEffectiveSwTwoGenerationFixtureConfig(config);
    const attemptId = process.env.HAKIMI_SW_TWO_GENERATION_FIXTURE_ATTEMPT_ID ?? null;
    if (attemptId === null || !/^[a-f0-9]{64}$/u.test(attemptId)) {
      this.configErrors.push("Canonical fixture runner did not provide a valid attempt id.");
    } else {
      this.attemptId = attemptId;
    }
    const outputPath = process.env.HAKIMI_SW_TWO_GENERATION_FIXTURE_RESULT_OUTPUT ?? null;
    if (outputPath === null || !path.isAbsolute(outputPath)) {
      this.configErrors.push("Canonical fixture runner did not provide an absolute result output path.");
    } else {
      this.outputPath = path.resolve(outputPath);
    }
    const artifactRoot = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT ?? null;
    const expectedArtifactRoot = this.outputPath === null
      ? null
      : path.join(path.dirname(this.outputPath), "artifact-builds");
    if (
      artifactRoot === null
      || !path.isAbsolute(artifactRoot)
      || expectedArtifactRoot === null
      || path.resolve(artifactRoot) !== path.resolve(expectedArtifactRoot)
    ) {
      this.configErrors.push("Shared SW fixture artifact root is not the runner-owned sibling directory.");
    } else {
      this.artifactRoot = path.resolve(artifactRoot);
    }
    const artifactSetSha256 = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256 ?? null;
    if (artifactSetSha256 === null || !/^[a-f0-9]{64}$/u.test(artifactSetSha256)) {
      this.configErrors.push("Canonical fixture runner did not provide a valid artifact set digest.");
    } else {
      this.artifactSetSha256 = artifactSetSha256;
    }
    try {
      const identity = loadSwTwoGenerationFixtureCriticalSourceIdentity();
      assertSwTwoGenerationFixtureCriticalSourceIdentity(identity);
      this.criticalSourceIdentity = identity;
    } catch (error) {
      this.criticalSourceIdentity = null;
      this.configErrors.push(
        `SW fixture critical source identity failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    this.tests = suite.allTests();
    if (this.tests.some((test) => path.resolve(test.location.file) !== path.resolve(expectedSpecPath))) {
      this.configErrors.push("Discovered SW fixture test source is not the checked spec file.");
    }
  }

  async onEnd(result: FullResult): Promise<{ status?: FullResult["status"] }> {
    if (isSwTwoGenerationFixtureListOnlyInvocation()) {
      return { status: result.status };
    }

    try {
      const closingIdentity = loadSwTwoGenerationFixtureCriticalSourceIdentity();
      assertSwTwoGenerationFixtureCriticalSourceIdentity(closingIdentity);
      if (JSON.stringify(closingIdentity) !== JSON.stringify(this.criticalSourceIdentity)) {
        this.configErrors.push("SW fixture critical source identity changed during execution.");
      }
    } catch (error) {
      this.configErrors.push(
        `SW fixture closing critical source identity failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (process.env.HAKIMI_SW_TWO_GENERATION_FIXTURE_ATTEMPT_ID !== this.attemptId) {
      this.configErrors.push("SW fixture attempt id changed during execution.");
    }
    if (
      process.env.HAKIMI_SW_TWO_GENERATION_FIXTURE_RESULT_OUTPUT !== this.outputPath
      || process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT !== this.artifactRoot
      || process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256 !== this.artifactSetSha256
    ) {
      this.configErrors.push("SW fixture runner-owned output or artifact binding changed during execution.");
    }

    let artifactSetIdentity: SwTwoGenerationArtifactSetIdentity | null = null;
    if (this.artifactRoot !== null && this.artifactSetSha256 !== null) {
      try {
        const closingArtifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(this.artifactRoot);
        if (closingArtifactSet.identity.canonicalSha256 !== this.artifactSetSha256) {
          this.configErrors.push("SW fixture artifact bytes changed during browser execution.");
        } else {
          artifactSetIdentity = closingArtifactSet.identity;
        }
      } catch (error) {
        this.configErrors.push(
          `SW fixture artifact identity failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const observations: SwTwoGenerationFixtureTestObservation[] = this.tests.map((test) => {
      const latestResult = test.results.at(-1);
      const allowedReservedAnnotations = new Set<string>(
        Object.values(SW_TWO_GENERATION_FIXTURE_ANNOTATIONS)
      );
      const unknownReservedAnnotations = latestResult?.annotations.filter((annotation) =>
        annotation.type.startsWith("sw-two-generation-")
        && !allowedReservedAnnotations.has(annotation.type)
      ) ?? [];
      if (unknownReservedAnnotations.length > 0) {
        this.configErrors.push(`SW fixture test used an unknown reserved annotation: ${test.id}.`);
      }
      return {
        projectName: test.parent.project()?.name ?? "unknown-project",
        scenarioId: sourceLocatedAnnotationDescription(
          latestResult,
          SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.scenarioId,
          expectedSpecPath
        ),
        runtimeProduct: annotationDescription(
          latestResult,
          SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.runtimeProduct
        ),
        freshProfileVerified: annotationDescription(
          latestResult,
          SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.freshProfileVerified
        ) === "true",
        sourceFileVerified: path.resolve(test.location.file) === path.resolve(expectedSpecPath),
        expectedStatus: test.expectedStatus,
        outcome: test.outcome(),
        resultStatuses: test.results.map((testResult) => testResult.status)
      };
    });

    const outputPath = this.outputPath;
    const outputErrors = [...this.configErrors];

    let summary = buildSwTwoGenerationFixtureSummary({
      attemptId: this.attemptId,
      fullResultStatus: result.status,
      observations,
      criticalSourceIdentity: this.criticalSourceIdentity,
      artifactSetIdentity,
      errors: outputErrors
    });
    let writeFailed = false;
    if (outputPath && outputErrors.length === 0) {
      try {
        await mkdir(path.dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, {
          encoding: "utf8",
          flag: "wx"
        });
      } catch (error) {
        writeFailed = true;
        summary = buildSwTwoGenerationFixtureSummary({
          attemptId: this.attemptId,
          fullResultStatus: result.status,
          observations,
          criticalSourceIdentity: this.criticalSourceIdentity,
          artifactSetIdentity,
          errors: [
            ...outputErrors,
            `Exclusive fixture summary write failed: ${error instanceof Error ? error.message : String(error)}`
          ]
        });
      }
    }

    process.stdout.write(`HAKIMI_SW_TWO_GENERATION_FIXTURE_RESULT ${JSON.stringify(summary)}\n`);
    return {
      status: summary.strictGatePassed && !writeFailed ? result.status : "failed"
    };
  }
}
