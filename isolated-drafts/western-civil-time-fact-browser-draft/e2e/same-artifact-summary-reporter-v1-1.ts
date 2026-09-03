import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from
  "@playwright/test/reporter";
import BaseReporter from "./same-artifact-summary-reporter";

type Options = Readonly<{ summaryPath?: unknown; nonceCommitment?: unknown; configProbe?: unknown }>;
type Identity = Readonly<{
  schemaVersion: string;
  projectName: string;
  runNonceCommitment: string;
  projectTokenSha256: string;
  product: string;
  protocolVersion: string;
  cdpUserAgent: string;
  navigatorUserAgent: string;
  navigatorUserAgentEqualsCdpUserAgent: boolean;
}>;

const ATTACHMENT_NAME = "hakimi-western-matrix-browser-identity-v1";
const SHA256 = /^[a-f0-9]{64}$/u;

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function normalizeIdentity(value: unknown, expectedProject: string, nonceCommitment: string): Identity {
  const keys = [
    "cdpUserAgent", "navigatorUserAgent", "navigatorUserAgentEqualsCdpUserAgent", "product",
    "projectName", "projectTokenSha256",
    "protocolVersion", "runNonceCommitment", "schemaVersion"
  ];
  if (!exactKeys(value, keys)
      || value.schemaVersion !== "hakimi.western.same-artifact.matrix-browser-identity/1"
      || value.projectName !== expectedProject || value.runNonceCommitment !== nonceCommitment
      || typeof value.projectTokenSha256 !== "string" || !SHA256.test(value.projectTokenSha256)
      || typeof value.product !== "string" || typeof value.protocolVersion !== "string"
      || typeof value.cdpUserAgent !== "string" || typeof value.navigatorUserAgent !== "string"
      || value.navigatorUserAgentEqualsCdpUserAgent !== (value.cdpUserAgent === value.navigatorUserAgent)
      || !/^\d+(?:\.\d+){1,3}$/u.test(value.protocolVersion)) {
    throw new Error("matrix browser identity attachment invalid");
  }
  const productPattern = expectedProject === "chrome"
    ? /^Chrome\/\d+(?:\.\d+){1,3}$/u
    : expectedProject === "msedge" ? /^Edg\/\d+(?:\.\d+){1,3}$/u : /(?!) /u;
  if (!productPattern.test(value.product)
      || !value.cdpUserAgent.includes("HeadlessChrome/")
      || (expectedProject === "chrome" && (value.cdpUserAgent.includes(" Edg/")
        || !value.navigatorUserAgent.includes(" Chrome/")))
      || (expectedProject === "msedge" && (!value.cdpUserAgent.includes(" Edg/")
        || !value.navigatorUserAgent.includes(" Edg/")))) {
    throw new Error("matrix browser product identity invalid");
  }
  return Object.freeze(value as unknown as Identity);
}

export default class WesternSameArtifactSummaryReporterV11 implements Reporter {
  private readonly summaryPath: string;
  private readonly nonceCommitment: string;
  private readonly baseSummaryPath: string;
  private readonly base: BaseReporter;
  private readonly configProbe: boolean;
  private readonly identities = new Map<string, { identity: Identity; observationCount: number }>();

  constructor(options: Options = {}) {
    if (typeof options.summaryPath !== "string" || !path.isAbsolute(options.summaryPath)
        || typeof options.nonceCommitment !== "string" || !SHA256.test(options.nonceCommitment)
        || typeof options.configProbe !== "boolean") {
      throw new Error("v1.1 reporter options invalid");
    }
    this.summaryPath = path.resolve(options.summaryPath);
    this.nonceCommitment = options.nonceCommitment;
    this.configProbe = options.configProbe;
    this.baseSummaryPath = path.join(path.dirname(this.summaryPath), "base-summary.json");
    this.base = new BaseReporter({ summaryPath: this.baseSummaryPath, configProbe: this.configProbe });
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.base.onBegin?.(config, suite);
  }

  onTestEnd(currentTest: TestCase, result: TestResult): void {
    this.base.onTestEnd?.(currentTest, result);
    if (this.configProbe) return;
    const projectName = currentTest.parent.project()?.name ?? "";
    const matches = result.attachments.filter((entry) => entry.name === ATTACHMENT_NAME);
    if (matches.length !== 1 || !matches[0].body || matches[0].path !== undefined
        || matches[0].contentType !== "application/json") {
      throw new Error("exactly one in-memory matrix browser identity attachment required");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(matches[0].body.toString("utf8"));
    } catch {
      throw new Error("matrix browser identity attachment JSON invalid");
    }
    const identity = normalizeIdentity(parsed, projectName, this.nonceCommitment);
    const previous = this.identities.get(projectName);
    const canonical = JSON.stringify(identity);
    if (previous && JSON.stringify(previous.identity) !== canonical) {
      throw new Error("matrix browser identity changed within one project");
    }
    this.identities.set(projectName, {
      identity,
      observationCount: (previous?.observationCount ?? 0) + 1
    });
  }

  onEnd(result: FullResult): void {
    this.base.onEnd?.(result);
    const base = JSON.parse(readFileSync(this.baseSummaryPath, "utf8"));
    if (this.configProbe) {
      writeFileSync(this.summaryPath, `${JSON.stringify({
        schemaVersion: "hakimi.western.same-artifact-config-path-probe/1.1",
        configuredProjectNames: base.configuredProjectNames,
        declaredOutcomeCount: base.declaredOutcomeCount,
        reporterLoadedFromConfig: true,
        runNonceCommitment: this.nonceCommitment
      })}\n`, { encoding: "utf8", flag: "wx" });
      return;
    }
    const projects = ["chrome", "msedge"].map((projectName) => {
      const entry = this.identities.get(projectName);
      if (!entry || entry.observationCount !== 5) {
        throw new Error("five stable in-matrix browser identities required per project");
      }
      return { ...entry.identity, observationCount: 5 };
    });
    if (result.status !== "passed" || base.overallStatus !== "passed" || base.outcomeCount !== 10) {
      throw new Error("v1.1 exact matrix did not pass");
    }
    writeFileSync(this.summaryPath, `${JSON.stringify({
      schemaVersion: "hakimi.western.same-artifact-playwright-summary/1.1",
      overallStatus: "passed",
      configuredProjectNames: base.configuredProjectNames,
      outcomeCount: base.outcomeCount,
      outcomes: base.outcomes,
      runNonceCommitment: this.nonceCommitment,
      matrixBrowserIdentities: projects
    })}\n`, { encoding: "utf8", flag: "wx" });
  }

  printsToStdio(): boolean {
    return false;
  }
}
