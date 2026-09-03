import { RELEASE_BROWSER_MATRIX } from "./playwright.release-browser-matrix.ts";
import {
  isExactSwTwoGenerationFixtureCriticalSourceIdentity,
  type SwTwoGenerationFixtureCriticalSourceIdentity
} from "./sw-two-generation-fixture-source-identity.ts";
import {
  isExactSwTwoGenerationArtifactSetIdentity,
  type SwTwoGenerationArtifactSetIdentity
} from "./sw-two-generation-artifact-identity.ts";

export const SW_TWO_GENERATION_FIXTURE_SCHEMA_VERSION = 3 as const;
export const SW_TWO_GENERATION_FIXTURE_CONTRACT_ID =
  "sw_two_generation_fixture_contract_v3" as const;
export const SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT = 3 as const;
export const SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_SCOPE =
  "bounded_critical_source_set_not_transitive_closure" as const;
export const SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES = Object.freeze(
  RELEASE_BROWSER_MATRIX.map((browser) => browser.projectName)
);
export const SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS = Object.freeze([
  "healthy_b_controlled_takeover_with_research_db_write_fence",
  "old_shell_cache_fallback_under_b_controller",
  "candidate_install_failure_keeps_a_active"
] as const);
export const SW_TWO_GENERATION_FIXTURE_ANNOTATIONS = Object.freeze({
  scenarioId: "sw-two-generation-scenario-id",
  runtimeProduct: "sw-two-generation-runtime-product",
  freshProfileVerified: "sw-two-generation-fresh-profile-verified"
} as const);
export const SW_TWO_GENERATION_FIXTURE_NON_CLAIMS = Object.freeze([
  "complete_transitive_source_closure_verified",
  "browser_consumed_every_artifact_file_verified",
  "real_https_response_bytes_verified",
  "real_https_host_verified",
  "deployed_artifact_verified",
  "provider_deployment_verified",
  "actual_os_pwa_install_verified",
  "real_v13_user_data_verified",
  "a_to_b_to_a_rollback_verified",
  "v13_to_v16_shadow_to_v13_rollback_verified",
  "release_evidence_verified",
  "release_ready",
  "public_deployment_authorized",
  "expert_claims_authorized",
  "public_release_authorized"
] as const);

export type SwTwoGenerationFixtureFullResultStatus =
  "passed" | "failed" | "timedout" | "interrupted";
export type SwTwoGenerationFixtureTestResultStatus =
  "passed" | "failed" | "timedOut" | "skipped" | "interrupted";

export type SwTwoGenerationFixtureTestObservation = Readonly<{
  projectName: string;
  scenarioId: string | null;
  runtimeProduct: string | null;
  freshProfileVerified: boolean;
  sourceFileVerified: boolean;
  expectedStatus: SwTwoGenerationFixtureTestResultStatus;
  outcome: "skipped" | "expected" | "unexpected" | "flaky";
  resultStatuses: readonly SwTwoGenerationFixtureTestResultStatus[];
}>;

type BuildSwTwoGenerationFixtureSummaryInput = Readonly<{
  attemptId: string | null;
  fullResultStatus: SwTwoGenerationFixtureFullResultStatus;
  observations: readonly SwTwoGenerationFixtureTestObservation[];
  criticalSourceIdentity: SwTwoGenerationFixtureCriticalSourceIdentity | null;
  artifactSetIdentity: SwTwoGenerationArtifactSetIdentity | null;
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
  "attempts",
  "scenarioIds",
  "runtimeProducts",
  "runtimeProductVerified",
  "freshProfileVerified",
  "sourceFileVerified",
  "artifactSetCanonicalSha256"
]);
const SUMMARY_KEYS = Object.freeze([
  "schemaVersion",
  "summaryType",
  "fixtureContractId",
  "evidenceClass",
  "attemptId",
  "expectedTestsPerProject",
  "expectedProjectNames",
  "expectedScenarioIds",
  "criticalSourceScope",
  "criticalSourceIdentity",
  "artifactSetIdentity",
  "fullResultStatus",
  "strictGatePassed",
  "unexpectedProjectNames",
  "errors",
  "projects",
  "claims",
  "doesNotEstablish"
]);
const CLAIM_KEYS = Object.freeze([
  "localSyntheticFixtureVerified",
  "localFixtureArtifactSetBoundToAttempt",
  "realHttpsHostVerified",
  "deployedArtifactVerified",
  "providerDeploymentVerified",
  "rollbackVerified",
  "releaseEvidenceVerified",
  "releaseReady",
  "publicDeploymentAuthorized",
  "expertClaimsAuthorized",
  "publicReleaseAuthorized"
]);
const ATTEMPT_ID_PATTERN = /^[a-f0-9]{64}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function expectedProductPattern(projectName: string): RegExp | null {
  if (projectName === "msedge") return /^Edg\/\d+(?:\.\d+)+$/u;
  if (projectName === "chrome") return /^Chrome\/\d+(?:\.\d+)+$/u;
  return null;
}

function scenarioIdsInContractOrder(
  observations: readonly SwTwoGenerationFixtureTestObservation[]
) {
  return SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS.filter((scenarioId) =>
    observations.some((observation) => observation.scenarioId === scenarioId)
  );
}

export function buildSwTwoGenerationFixtureSummary({
  attemptId,
  fullResultStatus,
  observations,
  criticalSourceIdentity,
  artifactSetIdentity,
  errors = []
}: BuildSwTwoGenerationFixtureSummaryInput) {
  const expectedProjectNames = [...SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES];
  const expectedScenarioIds = [...SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS];
  const unexpectedProjectNames = [...new Set(
    observations
      .map((observation) => observation.projectName)
      .filter((projectName) => !expectedProjectNames.includes(projectName as never))
  )].sort();
  const validatedArtifactSetIdentity = isExactSwTwoGenerationArtifactSetIdentity(
    artifactSetIdentity
  ) ? artifactSetIdentity : null;

  const projects = expectedProjectNames.map((projectName) => {
    const projectObservations = observations.filter(
      (observation) => observation.projectName === projectName
    );
    const productPattern = expectedProductPattern(projectName);
    const runtimeProducts = [...new Set(
      projectObservations
        .map((observation) => observation.runtimeProduct)
        .filter((product): product is string => typeof product === "string")
    )].sort();
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
      ),
      scenarioIds: Object.freeze(scenarioIdsInContractOrder(projectObservations)),
      runtimeProducts: Object.freeze(runtimeProducts),
      runtimeProductVerified: projectObservations.filter((observation) =>
        typeof observation.runtimeProduct === "string"
        && productPattern?.test(observation.runtimeProduct) === true
      ).length,
      freshProfileVerified: projectObservations.filter(
        (observation) => observation.freshProfileVerified
      ).length,
      sourceFileVerified: projectObservations.filter(
        (observation) => observation.sourceFileVerified
      ).length,
      artifactSetCanonicalSha256: validatedArtifactSetIdentity?.canonicalSha256 ?? null
    });
  });

  const strictProjectCounts = projects.every((project) => {
    const productPattern = expectedProductPattern(project.projectName);
    return project.discovered === SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      && project.passed === SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      && project.skipped === 0
      && project.failed === 0
      && project.timedOut === 0
      && project.interrupted === 0
      && project.unexpected === 0
      && project.flaky === 0
      && project.nonPassedExpectedStatus === 0
      && project.attempts === SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      && JSON.stringify(project.scenarioIds) === JSON.stringify(expectedScenarioIds)
      && project.runtimeProducts.length === 1
      && productPattern?.test(project.runtimeProducts[0] ?? "") === true
      && project.runtimeProductVerified === SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      && project.freshProfileVerified === SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      && project.sourceFileVerified === SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      && project.artifactSetCanonicalSha256 === validatedArtifactSetIdentity?.canonicalSha256;
  });
  const strictGatePassed = fullResultStatus === "passed"
    && typeof attemptId === "string"
    && ATTEMPT_ID_PATTERN.test(attemptId)
    && unexpectedProjectNames.length === 0
    && errors.length === 0
    && isExactSwTwoGenerationFixtureCriticalSourceIdentity(criticalSourceIdentity)
    && validatedArtifactSetIdentity !== null
    && strictProjectCounts;

  return Object.freeze({
    schemaVersion: SW_TWO_GENERATION_FIXTURE_SCHEMA_VERSION,
    summaryType: "sw_two_generation_fixture_summary" as const,
    fixtureContractId: SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
    evidenceClass: "local_synthetic_fixture_only" as const,
    attemptId,
    expectedTestsPerProject: SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT,
    expectedProjectNames: Object.freeze(expectedProjectNames),
    expectedScenarioIds: Object.freeze(expectedScenarioIds),
    criticalSourceScope: SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_SCOPE,
    criticalSourceIdentity,
    artifactSetIdentity: validatedArtifactSetIdentity,
    fullResultStatus,
    strictGatePassed,
    unexpectedProjectNames: Object.freeze(unexpectedProjectNames),
    errors: Object.freeze([...errors]),
    projects: Object.freeze(projects),
    claims: Object.freeze({
      localSyntheticFixtureVerified: strictGatePassed,
      localFixtureArtifactSetBoundToAttempt: strictGatePassed,
      realHttpsHostVerified: false,
      deployedArtifactVerified: false,
      providerDeploymentVerified: false,
      rollbackVerified: false,
      releaseEvidenceVerified: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      publicReleaseAuthorized: false
    }),
    doesNotEstablish: SW_TWO_GENERATION_FIXTURE_NON_CLAIMS
  });
}

export function assertStrictSwTwoGenerationFixtureSummary(
  value: unknown
): asserts value is ReturnType<typeof buildSwTwoGenerationFixtureSummary> {
  if (!isRecord(value) || !hasExactKeys(value, SUMMARY_KEYS)) {
    throw new Error("SW two-generation fixture summary shape is invalid.");
  }
  if (
    value.schemaVersion !== SW_TWO_GENERATION_FIXTURE_SCHEMA_VERSION
    || value.summaryType !== "sw_two_generation_fixture_summary"
    || value.fixtureContractId !== SW_TWO_GENERATION_FIXTURE_CONTRACT_ID
    || value.evidenceClass !== "local_synthetic_fixture_only"
    || typeof value.attemptId !== "string"
    || !ATTEMPT_ID_PATTERN.test(value.attemptId)
    || value.expectedTestsPerProject !== SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
    || JSON.stringify(value.expectedProjectNames) !== JSON.stringify(SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES)
    || JSON.stringify(value.expectedScenarioIds) !== JSON.stringify(SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS)
    || value.criticalSourceScope !== SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_SCOPE
    || !isExactSwTwoGenerationFixtureCriticalSourceIdentity(value.criticalSourceIdentity)
    || !isExactSwTwoGenerationArtifactSetIdentity(value.artifactSetIdentity)
    || value.fullResultStatus !== "passed"
    || value.strictGatePassed !== true
    || !Array.isArray(value.unexpectedProjectNames)
    || value.unexpectedProjectNames.length !== 0
    || !Array.isArray(value.errors)
    || value.errors.length !== 0
    || !Array.isArray(value.projects)
    || value.projects.length !== SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES.length
    || !isRecord(value.claims)
    || !hasExactKeys(value.claims, CLAIM_KEYS)
    || value.claims.localSyntheticFixtureVerified !== true
    || value.claims.localFixtureArtifactSetBoundToAttempt !== true
    || Object.entries(value.claims).some(([name, claim]) =>
      name !== "localSyntheticFixtureVerified"
      && name !== "localFixtureArtifactSetBoundToAttempt"
      && claim !== false
    )
    || JSON.stringify(value.doesNotEstablish) !== JSON.stringify(SW_TWO_GENERATION_FIXTURE_NON_CLAIMS)
  ) {
    throw new Error("SW two-generation fixture summary did not satisfy its strict local-only gate.");
  }
  for (let index = 0; index < value.projects.length; index += 1) {
    const project = value.projects[index];
    const projectName = SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES[index];
    const productPattern = expectedProductPattern(projectName);
    if (
      !isRecord(project)
      || !hasExactKeys(project, PROJECT_SUMMARY_KEYS)
      || project.projectName !== projectName
      || project.discovered !== SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      || project.passed !== SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      || project.skipped !== 0
      || project.failed !== 0
      || project.timedOut !== 0
      || project.interrupted !== 0
      || project.unexpected !== 0
      || project.flaky !== 0
      || project.nonPassedExpectedStatus !== 0
      || project.attempts !== SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      || JSON.stringify(project.scenarioIds) !== JSON.stringify(SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS)
      || !Array.isArray(project.runtimeProducts)
      || project.runtimeProducts.length !== 1
      || productPattern?.test(String(project.runtimeProducts[0])) !== true
      || project.runtimeProductVerified !== SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      || project.freshProfileVerified !== SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      || project.sourceFileVerified !== SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT
      || project.artifactSetCanonicalSha256 !== value.artifactSetIdentity.canonicalSha256
    ) {
      throw new Error(`SW two-generation fixture project is not an exact pass: ${projectName}.`);
    }
  }
}
