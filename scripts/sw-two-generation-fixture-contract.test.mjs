import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  unlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import swUpgradeConfig from "../apps/web/playwright.sw-upgrade.config.ts";
import {
  validateEffectiveSwTwoGenerationFixtureConfig
} from "../apps/web/playwright.sw-two-generation-fixture-reporter.ts";
import { REQUIRED_RELEASE_BROWSER_RECEIPT_IDS } from
  "../apps/web/playwright.release-browser-result.ts";
import {
  assertStrictSwTwoGenerationFixtureSummary,
  buildSwTwoGenerationFixtureSummary,
  SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
  SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_SCOPE,
  SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT,
  SW_TWO_GENERATION_FIXTURE_NON_CLAIMS,
  SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES,
  SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS
} from "../apps/web/playwright.sw-two-generation-fixture-result.ts";
import {
  assertSwTwoGenerationFixtureCriticalSourceIdentity,
  loadSwTwoGenerationFixtureCriticalSourceIdentity,
  SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_ALGORITHM,
  SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_DOMAIN,
  SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES,
  SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCE_SET_SHA256
} from "../apps/web/sw-two-generation-fixture-source-identity.ts";
import {
  assertSwTwoGenerationArtifactSetIdentity,
  createSwTwoGenerationArtifactSetIdentity,
  createSwTwoGenerationGenerationArtifactIdentity,
  isCanonicalSwTwoGenerationArtifactPath,
  isExactSwTwoGenerationArtifactSetIdentity,
  readSwTwoGenerationArtifactSnapshot,
  snapshotSwTwoGenerationArtifactDirectory,
  snapshotSwTwoGenerationArtifactSetDirectory,
  SW_TWO_GENERATION_ARTIFACT_GENERATIONS,
  SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY
} from "../apps/web/sw-two-generation-artifact-identity.ts";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specSource = await readFile(
  path.join(workspaceRoot, "apps/web/e2e/service-worker-two-generation.spec.ts"),
  "utf8"
);
const reporterSource = await readFile(
  path.join(workspaceRoot, "apps/web/playwright.sw-two-generation-fixture-reporter.ts"),
  "utf8"
);
const runnerSource = await readFile(
  path.join(workspaceRoot, "scripts/run-sw-two-generation-fixture.mjs"),
  "utf8"
);
const decisions = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/web-v1-release-decisions.json"),
  "utf8"
));
const packageJson = JSON.parse(await readFile(
  path.join(workspaceRoot, "package.json"),
  "utf8"
));
const criticalSourceIdentity = loadSwTwoGenerationFixtureCriticalSourceIdentity();
const attemptId = "a".repeat(64);

const syntheticIdentitySeeds = Object.freeze({
  "stable-a": Object.freeze({ build: "1", index: "2", worker: "3", marker: "4", research: "5" }),
  "healthy-b": Object.freeze({ build: "6", index: "7", worker: "8", marker: "9", research: "a" }),
  "broken-b": Object.freeze({ build: "b", index: "c", worker: "d", marker: "e", research: "f" })
});

function repeatedSha256(character) {
  return character.repeat(64);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function syntheticGenerationArtifactIdentity(generationName, overrides = {}) {
  const generation = SW_TWO_GENERATION_ARTIFACT_GENERATIONS.find(
    (entry) => entry.generationName === generationName
  );
  const seeds = syntheticIdentitySeeds[generationName];
  assert.ok(generation);
  assert.ok(seeds);
  return createSwTwoGenerationGenerationArtifactIdentity({
    generationName,
    fault: generation.fault,
    buildVersion: repeatedSha256(seeds.build),
    releaseDescriptorSha256: repeatedSha256("0"),
    releaseStorageManifestSha256: repeatedSha256("1"),
    files: [
      {
        path: `assets/research-query-page-${generationName}.js`,
        size: 31,
        sha256: overrides.researchSha256 ?? repeatedSha256(seeds.research)
      },
      {
        path: `e2e-sw-generation-${generationName}.txt`,
        size: generationName.length + 1,
        sha256: repeatedSha256(seeds.marker)
      },
      { path: "index.html", size: 127, sha256: repeatedSha256(seeds.index) },
      {
        path: "sw.js",
        size: 211,
        sha256: overrides.serviceWorkerSha256 ?? repeatedSha256(seeds.worker)
      }
    ]
  });
}

const syntheticGenerationArtifactIdentities = SW_TWO_GENERATION_ARTIFACT_GENERATIONS.map(
  (generation) => syntheticGenerationArtifactIdentity(generation.generationName)
);
const artifactSetIdentity = createSwTwoGenerationArtifactSetIdentity(
  syntheticGenerationArtifactIdentities
);

function escapeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function writeSyntheticArtifactGeneration(sharedRoot, generationName) {
  const generation = SW_TWO_GENERATION_ARTIFACT_GENERATIONS.find(
    (entry) => entry.generationName === generationName
  );
  const seeds = syntheticIdentitySeeds[generationName];
  assert.ok(generation);
  assert.ok(seeds);
  const directory = path.join(sharedRoot, generationName);
  const assetsDirectory = path.join(directory, "assets");
  const buildVersion = repeatedSha256(seeds.build);
  const serializedDescriptor = JSON.stringify(SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY);
  const serializedManifest = JSON.stringify({
    database: SW_TWO_GENERATION_FIXED_RELEASE_IDENTITY
  });
  const manifestDigest = sha256(serializedManifest);
  const entryPath = `/assets/index-${generationName}.js`;
  const index = [
    "<!doctype html>",
    "<html><head>",
    `<meta name="hakimi-build-version" content="${buildVersion}" />`,
    `<meta name="hakimi-release-database" content="${escapeHtmlAttribute(serializedDescriptor)}" />`,
    `<meta name="hakimi-release-storage-manifest" content="${escapeHtmlAttribute(serializedManifest)}" />`,
    `<meta name="hakimi-release-storage-manifest-digest" content="${manifestDigest}" />`,
    '<meta name="hakimi-release-evidence-id" content="unbound-local-build" />',
    `<script type="module" src="${entryPath}"></script>`,
    "</head><body></body></html>"
  ].join("\n");
  const worker = [
    `const CACHE_VERSION = ${JSON.stringify(buildVersion)};`,
    `const RELEASE_DATABASE_DESCRIPTOR = ${JSON.stringify(serializedDescriptor)};`
  ].join("\n");
  const researchRoute = generation.fault === "research-route"
    ? `throw new Error(${JSON.stringify(`synthetic ${generationName} research route boot failure`)});\n`
    : `export const generation = ${JSON.stringify(generationName)};\n`;

  await mkdir(assetsDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "index.html"), index, "utf8"),
    writeFile(path.join(directory, "sw.js"), worker, "utf8"),
    writeFile(path.join(directory, `e2e-sw-generation-${generationName}.txt`), `${generationName}\n`, "utf8"),
    writeFile(path.join(assetsDirectory, `index-${generationName}.js`), `export default ${JSON.stringify(generationName)};\n`, "utf8"),
    writeFile(path.join(assetsDirectory, `research-query-page-${generationName}.js`), researchRoute, "utf8")
  ]);
  return directory;
}

async function writeSyntheticArtifactSet(sharedRoot) {
  for (const generation of SW_TWO_GENERATION_ARTIFACT_GENERATIONS) {
    await writeSyntheticArtifactGeneration(sharedRoot, generation.generationName);
  }
}

function productForProject(projectName) {
  if (projectName === "msedge") return "Edg/140.0.3485.94";
  if (projectName === "chrome") return "Chrome/140.0.7339.82";
  return "Chromium/140.0.0.0";
}

function passingObservations() {
  return SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES.flatMap((projectName) =>
    SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS.map((scenarioId) => ({
      projectName,
      scenarioId,
      runtimeProduct: productForProject(projectName),
      freshProfileVerified: true,
      sourceFileVerified: true,
      expectedStatus: "passed",
      outcome: "expected",
      resultStatuses: ["passed"]
    }))
  );
}

test("fixture-only summary accepts the exact scenario, product, profile, and source matrix", () => {
  const summary = buildSwTwoGenerationFixtureSummary({
    attemptId,
    fullResultStatus: "passed",
    observations: passingObservations(),
    criticalSourceIdentity,
    artifactSetIdentity
  });
  assert.equal(summary.fixtureContractId, SW_TWO_GENERATION_FIXTURE_CONTRACT_ID);
  assert.equal(SW_TWO_GENERATION_FIXTURE_CONTRACT_ID, "sw_two_generation_fixture_contract_v3");
  assert.equal(summary.schemaVersion, 3);
  assert.equal(summary.evidenceClass, "local_synthetic_fixture_only");
  assert.equal(summary.criticalSourceScope, SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_SCOPE);
  assert.equal(summary.expectedTestsPerProject, SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT);
  assert.equal(summary.strictGatePassed, true);
  assert.deepEqual(summary.expectedProjectNames, ["msedge", "chrome"]);
  assert.deepEqual(summary.expectedScenarioIds, [
    "healthy_b_controlled_takeover_with_research_db_write_fence",
    "old_shell_cache_fallback_under_b_controller",
    "candidate_install_failure_keeps_a_active"
  ]);
  assert.deepEqual(summary.projects.map((project) => project.attempts), [3, 3]);
  assert.deepEqual(summary.projects.map((project) => project.runtimeProducts), [
    ["Edg/140.0.3485.94"],
    ["Chrome/140.0.7339.82"]
  ]);
  assert.deepEqual(summary.projects.map((project) => project.runtimeProductVerified), [3, 3]);
  assert.deepEqual(summary.projects.map((project) => project.artifactSetCanonicalSha256), [
    artifactSetIdentity.canonicalSha256,
    artifactSetIdentity.canonicalSha256
  ]);
  assert.deepEqual(summary.artifactSetIdentity, artifactSetIdentity);
  assert.deepEqual(summary.claims, {
    localSyntheticFixtureVerified: true,
    localFixtureArtifactSetBoundToAttempt: true,
    realHttpsHostVerified: false,
    deployedArtifactVerified: false,
    providerDeploymentVerified: false,
    rollbackVerified: false,
    releaseEvidenceVerified: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    publicReleaseAuthorized: false
  });
  assert.deepEqual(SW_TWO_GENERATION_FIXTURE_NON_CLAIMS, [
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
  ]);
  assert.deepEqual(summary.doesNotEstablish, SW_TWO_GENERATION_FIXTURE_NON_CLAIMS);
  assert.equal(
    summary.criticalSourceIdentity.canonicalSha256,
    SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCE_SET_SHA256
  );
  assert.doesNotThrow(() => assertSwTwoGenerationFixtureCriticalSourceIdentity(
    summary.criticalSourceIdentity
  ));
  assert.doesNotThrow(() => assertSwTwoGenerationArtifactSetIdentity(
    summary.artifactSetIdentity
  ));
  assert.doesNotThrow(() => assertStrictSwTwoGenerationFixtureSummary(summary));
});

test("strict summary rejects an extra false claim instead of silently widening the ledger", () => {
  const summary = structuredClone(buildSwTwoGenerationFixtureSummary({
    attemptId,
    fullResultStatus: "passed",
    observations: passingObservations(),
    criticalSourceIdentity,
    artifactSetIdentity
  }));
  summary.claims.futureAuthorizationClaim = false;
  assert.throws(
    () => assertStrictSwTwoGenerationFixtureSummary(summary),
    /strict local-only gate/u
  );
});

test("fixture summary rejects a missing or malformed runner attempt identity", () => {
  for (const invalidAttemptId of [null, "not-a-sha256-attempt-id", "A".repeat(64)]) {
    const summary = buildSwTwoGenerationFixtureSummary({
      attemptId: invalidAttemptId,
      fullResultStatus: "passed",
      observations: passingObservations(),
      criticalSourceIdentity,
      artifactSetIdentity
    });
    assert.equal(summary.strictGatePassed, false);
    assert.equal(summary.claims.localSyntheticFixtureVerified, false);
    assert.equal(summary.claims.localFixtureArtifactSetBoundToAttempt, false);
    assert.throws(() => assertStrictSwTwoGenerationFixtureSummary(summary));
  }
});

test("artifact snapshot keeps the hashed bytes after disk overwrite or deletion and excludes later files", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-sw-artifact-snapshot-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const directory = await writeSyntheticArtifactGeneration(temporaryRoot, "stable-a");
  const snapshot = await snapshotSwTwoGenerationArtifactDirectory({
    directory,
    generationName: "stable-a",
    fault: "none"
  });
  const originalWorker = readSwTwoGenerationArtifactSnapshot(snapshot, "sw.js");
  const originalIndex = readSwTwoGenerationArtifactSnapshot(snapshot, "index.html");
  assert.ok(originalWorker);
  assert.ok(originalIndex);
  assert.equal(sha256(originalWorker), snapshot.identity.serviceWorkerSha256);
  assert.equal(sha256(originalIndex), snapshot.identity.indexHtmlSha256);

  await writeFile(path.join(directory, "sw.js"), "tampered after snapshot\n", "utf8");
  await unlink(path.join(directory, "index.html"));
  await writeFile(path.join(directory, "late-added.js"), "late\n", "utf8");

  assert.deepEqual(readSwTwoGenerationArtifactSnapshot(snapshot, "sw.js"), originalWorker);
  assert.deepEqual(readSwTwoGenerationArtifactSnapshot(snapshot, "index.html"), originalIndex);
  assert.equal(readSwTwoGenerationArtifactSnapshot(snapshot, "late-added.js"), null);
  assert.equal(snapshot.identity.files.some((file) => file.path === "late-added.js"), false);

  const callerCopy = readSwTwoGenerationArtifactSnapshot(snapshot, "sw.js");
  assert.ok(callerCopy);
  callerCopy.fill(0);
  assert.deepEqual(readSwTwoGenerationArtifactSnapshot(snapshot, "sw.js"), originalWorker);
});

test("artifact path and read APIs reject forged snapshots and expose unknown fail paths as absent", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-sw-artifact-read-api-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  const directory = await writeSyntheticArtifactGeneration(temporaryRoot, "healthy-b");
  const snapshot = await snapshotSwTwoGenerationArtifactDirectory({
    directory,
    generationName: "healthy-b",
    fault: "none"
  });
  const forgedSnapshot = Object.freeze({ ...snapshot });

  assert.throws(
    () => readSwTwoGenerationArtifactSnapshot(forgedSnapshot, "sw.js"),
    /unregistered artifact snapshot/u
  );
  assert.equal(isCanonicalSwTwoGenerationArtifactPath("assets/unknown.js"), true);
  assert.equal(readSwTwoGenerationArtifactSnapshot(snapshot, "assets/unknown.js"), null);
  for (const invalidPath of ["/sw.js", "../sw.js", "assets/%73w.js", "assets\\sw.js"]) {
    assert.equal(isCanonicalSwTwoGenerationArtifactPath(invalidPath), false);
    assert.equal(readSwTwoGenerationArtifactSnapshot(snapshot, invalidPath), null);
  }
  assert.ok(readSwTwoGenerationArtifactSnapshot(snapshot, "sw.js"));
});

test("artifact-set identity rejects worker aliasing, missing fault differentiation, role swaps, and digest tampering", () => {
  const [stable, healthy, broken] = syntheticGenerationArtifactIdentities;
  assert.ok(stable);
  assert.ok(healthy);
  assert.ok(broken);

  const healthyWithStableWorker = syntheticGenerationArtifactIdentity("healthy-b", {
    serviceWorkerSha256: stable.serviceWorkerSha256
  });
  assert.throws(
    () => createSwTwoGenerationArtifactSetIdentity([stable, healthyWithStableWorker, broken]),
    /invalid or generations are not distinct/u
  );

  const healthyResearch = healthy.files.find((file) =>
    /^assets\/research-query-page-.*\.js$/u.test(file.path)
  );
  assert.ok(healthyResearch);
  const brokenWithHealthyResearch = syntheticGenerationArtifactIdentity("broken-b", {
    researchSha256: healthyResearch.sha256
  });
  assert.throws(
    () => createSwTwoGenerationArtifactSetIdentity([stable, healthy, brokenWithHealthyResearch]),
    /invalid or generations are not distinct/u
  );
  assert.throws(
    () => createSwTwoGenerationArtifactSetIdentity([healthy, stable, broken]),
    /invalid or generations are not distinct/u
  );

  const tamperedIdentity = structuredClone(artifactSetIdentity);
  tamperedIdentity.canonicalSha256 = "0".repeat(64);
  assert.equal(isExactSwTwoGenerationArtifactSetIdentity(tamperedIdentity), false);
  assert.throws(
    () => assertSwTwoGenerationArtifactSetIdentity(tamperedIdentity),
    /artifact set identity is invalid/u
  );

  const reboundSummary = structuredClone(buildSwTwoGenerationFixtureSummary({
    attemptId,
    fullResultStatus: "passed",
    observations: passingObservations(),
    criticalSourceIdentity,
    artifactSetIdentity
  }));
  reboundSummary.artifactSetIdentity.canonicalSha256 = "0".repeat(64);
  assert.throws(
    () => assertStrictSwTwoGenerationFixtureSummary(reboundSummary),
    /strict local-only gate/u
  );
});

test("shared artifact root rejects extra and missing generation directories", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-sw-artifact-set-"));
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));
  await writeSyntheticArtifactSet(temporaryRoot);

  const snapshot = await snapshotSwTwoGenerationArtifactSetDirectory(temporaryRoot);
  assert.equal(isExactSwTwoGenerationArtifactSetIdentity(snapshot.identity), true);
  assert.deepEqual(
    snapshot.generations.map((generation) => generation.name),
    ["stable-a", "healthy-b", "broken-b"]
  );

  const extraDirectory = path.join(temporaryRoot, "unexpected-generation");
  await mkdir(extraDirectory);
  await assert.rejects(
    snapshotSwTwoGenerationArtifactSetDirectory(temporaryRoot),
    /missing a generation or contains extras/u
  );
  await rm(extraDirectory, { recursive: true, force: true });
  await rm(path.join(temporaryRoot, "broken-b"), { recursive: true, force: true });
  await assert.rejects(
    snapshotSwTwoGenerationArtifactSetDirectory(temporaryRoot),
    /missing a generation or contains extras/u
  );
});

test("critical-source policy is canonical, collision-free, and spans harness plus product roles", () => {
  const paths = SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES.map((entry) => entry.path);
  assert.deepEqual(paths, [...paths].sort());
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(new Set(paths.map((entry) => entry.toLocaleLowerCase("en-US"))).size, paths.length);
  assert.equal(criticalSourceIdentity.algorithm, SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_ALGORITHM);
  assert.equal(criticalSourceIdentity.domain, SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_DOMAIN);
  assert.equal(criticalSourceIdentity.files.length, 21);
  assert.equal(
    criticalSourceIdentity.files.some((entry) =>
      entry.path === "apps/web/sw-two-generation-artifact-identity.ts"
      && entry.role.startsWith("harness_")
    ),
    true
  );
  assert.equal(
    criticalSourceIdentity.files.filter((entry) => entry.role.startsWith("product_")).length,
    9
  );
  assert.deepEqual(
    criticalSourceIdentity.files
      .filter((entry) => entry.role.startsWith("product_"))
      .map((entry) => entry.path),
    [
      "apps/web/public/sw.js",
      "apps/web/release-protocol.ts",
      "apps/web/src/lib/release-controller-takeover-write-fence.ts",
      "apps/web/src/lib/release-database-coordinator.ts",
      "apps/web/src/lib/service-worker-takeover-retry.ts",
      "apps/web/src/main.tsx",
      "apps/web/src/pages/case-library-page.tsx",
      "apps/web/vite.config.ts",
      "packages/storage/src/index.ts"
    ]
  );
});

test("fixture summary rejects spec-byte or product critical-source rebinding", () => {
  const driftedIdentity = structuredClone(criticalSourceIdentity);
  const spec = driftedIdentity.files.find((file) =>
    file.path === "apps/web/e2e/service-worker-two-generation.spec.ts"
  );
  assert.ok(spec);
  spec.rawSha256 = "0".repeat(64);

  const driftedAtBuild = buildSwTwoGenerationFixtureSummary({
    attemptId,
    fullResultStatus: "passed",
    observations: passingObservations(),
    criticalSourceIdentity: driftedIdentity,
    artifactSetIdentity
  });
  assert.equal(driftedAtBuild.strictGatePassed, false);
  assert.equal(driftedAtBuild.claims.localSyntheticFixtureVerified, false);
  assert.equal(driftedAtBuild.claims.localFixtureArtifactSetBoundToAttempt, false);
  assert.throws(
    () => assertStrictSwTwoGenerationFixtureSummary(driftedAtBuild),
    /strict local-only gate/u
  );

  const reboundSummary = structuredClone(buildSwTwoGenerationFixtureSummary({
    attemptId,
    fullResultStatus: "passed",
    observations: passingObservations(),
    criticalSourceIdentity,
    artifactSetIdentity
  }));
  reboundSummary.criticalSourceIdentity.files[0].normalizedSha256 = "f".repeat(64);
  assert.throws(
    () => assertStrictSwTwoGenerationFixtureSummary(reboundSummary),
    /strict local-only gate/u
  );
});

test("fixture-only summary rejects count, scenario, product, profile, source, and result weakening", () => {
  const variants = [
    passingObservations().filter((observation) => observation.projectName !== "chrome"),
    passingObservations().map((observation, index) => index === 0
      ? { ...observation, scenarioId: SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS[1] }
      : observation),
    passingObservations().map((observation, index) => index === 0
      ? { ...observation, runtimeProduct: "Chrome/140.0.7339.82" }
      : observation),
    passingObservations().map((observation, index) => index === 0
      ? { ...observation, runtimeProduct: null }
      : observation),
    passingObservations().map((observation, index) => index === 0
      ? { ...observation, freshProfileVerified: false }
      : observation),
    passingObservations().map((observation, index) => index === 0
      ? { ...observation, sourceFileVerified: false }
      : observation),
    passingObservations().map((observation, index) => index === 0
      ? { ...observation, resultStatuses: ["failed", "passed"], outcome: "flaky" }
      : observation),
    passingObservations().map((observation, index) => index === 0
      ? { ...observation, expectedStatus: "skipped", outcome: "skipped", resultStatuses: ["skipped"] }
      : observation),
    [...passingObservations(), {
      projectName: "chromium",
      scenarioId: SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS[0],
      runtimeProduct: "Chromium/140.0.0.0",
      freshProfileVerified: true,
      sourceFileVerified: true,
      expectedStatus: "passed",
      outcome: "expected",
      resultStatuses: ["passed"]
    }]
  ];
  for (const observations of variants) {
    const summary = buildSwTwoGenerationFixtureSummary({
      attemptId,
      fullResultStatus: "passed",
      observations,
      criticalSourceIdentity,
      artifactSetIdentity
    });
    assert.equal(summary.strictGatePassed, false);
    assert.equal(summary.claims.localSyntheticFixtureVerified, false);
    assert.equal(summary.claims.localFixtureArtifactSetBoundToAttempt, false);
    assert.equal(summary.claims.rollbackVerified, false);
    assert.equal(summary.claims.releaseReady, false);
    assert.throws(() => assertStrictSwTwoGenerationFixtureSummary(summary));
  }
});

test("fixture config is serial, retry-free, fail-on-flaky, and exact Edge plus Chrome", () => {
  assert.equal(swUpgradeConfig.testDir, "./e2e");
  assert.equal(swUpgradeConfig.testMatch, "service-worker-two-generation.spec.ts");
  assert.equal(swUpgradeConfig.fullyParallel, false);
  assert.equal(swUpgradeConfig.forbidOnly, true);
  assert.equal(swUpgradeConfig.failOnFlakyTests, true);
  assert.equal(swUpgradeConfig.retries, 0);
  assert.equal(swUpgradeConfig.repeatEach, 1);
  assert.equal(swUpgradeConfig.workers, 1);
  assert.equal(
    swUpgradeConfig.outputDir,
    path.join(os.tmpdir(), "hakimi-bazi-sw-upgrade-results")
  );
  assert.equal(swUpgradeConfig.timeout, 300_000);
  assert.deepEqual(swUpgradeConfig.expect, { timeout: 20_000 });
  assert.deepEqual(swUpgradeConfig.use, {
    serviceWorkers: "allow",
    video: "off"
  });
  assert.deepEqual(swUpgradeConfig.projects?.map((project) => project.name), ["msedge", "chrome"]);
  assert.deepEqual(
    swUpgradeConfig.projects?.map((project) => project.metadata),
    [
      {
        fixtureContractId: SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
        evidenceClass: "local_synthetic_fixture_only",
        artifactBinding: "shared_runner_owned_artifact_set_v1",
        browserChannel: "msedge"
      },
      {
        fixtureContractId: SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
        evidenceClass: "local_synthetic_fixture_only",
        artifactBinding: "shared_runner_owned_artifact_set_v1",
        browserChannel: "chrome"
      }
    ]
  );
  assert.equal(Array.isArray(swUpgradeConfig.reporter), true);
  assert.equal(swUpgradeConfig.reporter?.length, 2);
  assert.deepEqual(swUpgradeConfig.reporter?.[1]?.[1], {});
});

test("fixture spec binds scenarios, project-selected persistent browsers, fresh profiles, and CDP products", () => {
  assert.match(specSource, /const projectName = testInfo\.project\.name;/u);
  assert.match(specSource, /releasePersistentContextOptionsForProject\(projectName\)/u);
  assert.match(specSource, /Browser\.getVersion/u);
  assert.match(specSource, /requireReleaseBrowserRuntimeProduct\(projectName, version\.product\)/u);
  assert.match(specSource, /requireFixtureProfileAbsent\(profilePath\)/u);
  assert.match(specSource, /SW_TWO_GENERATION_FIXTURE_ANNOTATIONS\.runtimeProduct/u);
  assert.match(specSource, /SW_TWO_GENERATION_FIXTURE_ANNOTATIONS\.freshProfileVerified/u);
  assert.match(specSource, /snapshotSwTwoGenerationArtifactSetDirectory\(artifactRoot\)/u);
  assert.match(specSource, /readSwTwoGenerationArtifactSnapshot\(generation, artifactPath\)/u);
  assert.match(specSource, /artifactSet\.identity\.canonicalSha256/u);
  assert.match(specSource, /rejected a non-canonical or unknown failure path/u);
  for (const scenarioId of SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS) {
    assert.equal(specSource.includes(scenarioId), false, "scenario ids must be referenced from the frozen constant");
  }
  assert.equal(
    (specSource.match(/SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS\[[0-2]\]/gu) ?? []).length,
    3
  );
  assert.doesNotMatch(specSource, /channel:\s*["']msedge["']/u);
  assert.doesNotMatch(specSource, /runtime-rollback-profile|broken-b-rollback-a/u);
  assert.match(specSource, /controller 仍为 B，非 worker 回滚/u);
});

test("fixture reporter validates effective config and writes an exclusive failure-aware summary", () => {
  assert.match(reporterSource, /config\.workers !== 1/u);
  assert.match(reporterSource, /project\.retries !== 0/u);
  assert.match(reporterSource, /project\.repeatEach !== 1/u);
  assert.match(reporterSource, /path\.resolve\(project\.outputDir\)/u);
  assert.match(reporterSource, /hakimi-bazi-sw-upgrade-results/u);
  assert.match(reporterSource, /path\.resolve\(project\.testDir\)/u);
  assert.match(reporterSource, /path\.resolve\(test\.location\.file\)/u);
  assert.match(reporterSource, /loadSwTwoGenerationFixtureCriticalSourceIdentity/u);
  assert.match(reporterSource, /critical source identity changed during execution/u);
  assert.match(reporterSource, /snapshotSwTwoGenerationArtifactSetDirectory/u);
  assert.match(reporterSource, /artifact bytes changed during browser execution/u);
  assert.match(reporterSource, /artifactSetIdentity/u);
  assert.match(reporterSource, /flag: "wx"/u);
  assert.match(reporterSource, /Exclusive fixture summary write failed/u);

  const effectiveConfig = {
    configFile: path.join(workspaceRoot, "apps/web/playwright.sw-upgrade.config.ts"),
    workers: 1,
    fullyParallel: false,
    forbidOnly: true,
    failOnFlakyTests: true,
    shard: null,
    projects: SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES.map((name) => ({
      name,
      retries: 0,
      repeatEach: 1,
      outputDir: path.join(os.tmpdir(), "hakimi-bazi-sw-upgrade-results"),
      testDir: path.join(workspaceRoot, "apps/web/e2e"),
      metadata: {
        artifactBinding: "shared_runner_owned_artifact_set_v1"
      }
    }))
  };
  assert.deepEqual(
    validateEffectiveSwTwoGenerationFixtureConfig(effectiveConfig),
    []
  );
  const unsafeOutputConfig = structuredClone(effectiveConfig);
  unsafeOutputConfig.projects[0].outputDir = workspaceRoot;
  assert.deepEqual(
    validateEffectiveSwTwoGenerationFixtureConfig(unsafeOutputConfig),
    ["Effective outputDir is not the checked system temporary directory: msedge."]
  );
});

test("canonical wrapper owns Playwright arguments and independently validates the summary", () => {
  assert.match(runnerSource, /process\.argv\.length !== 2/u);
  assert.match(runnerSource, /assertCanonicalPlaywrightOutputDir\(\)/u);
  assert.match(runnerSource, /swUpgradeConfig\.outputDir/u);
  assert.match(runnerSource, /\[playwrightCli, "test", "--config", fixtureConfig\]/u);
  assert.match(runnerSource, /HAKIMI_SW_TWO_GENERATION_FIXTURE_RESULT_OUTPUT: resultPath/u);
  assert.match(runnerSource, /assertStrictSwTwoGenerationFixtureSummary\(summary\)/u);
  assert.match(runnerSource, /startingCriticalSourceIdentity/u);
  assert.match(runnerSource, /endingCriticalSourceIdentity/u);
  assert.match(runnerSource, /buildSharedArtifactSet\(artifactRoot\)/u);
  assert.match(runnerSource, /HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT: artifactRoot/u);
  assert.match(runnerSource, /HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256: artifactSetSha256/u);
  assert.match(runnerSource, /startingArtifactSet/u);
  assert.match(runnerSource, /endingArtifactSet/u);
});

test("fixture contract remains outside formal browser receipts and default v13 Release Evidence", () => {
  assert.deepEqual(REQUIRED_RELEASE_BROWSER_RECEIPT_IDS, [
    "backup", "boot", "pwa", "web-v1-flow"
  ]);
  const releaseReceipts = decisions.releaseEvidence.defaultV13RequiredReceiptCommands;
  const serializedReceipts = JSON.stringify(releaseReceipts).toLowerCase();
  assert.equal(serializedReceipts.includes("sw-upgrade"), false);
  assert.equal(serializedReceipts.includes("two-generation"), false);
  assert.equal(serializedReceipts.includes("fixture-contract"), false);
  assert.equal(
    packageJson.scripts["test:sw-two-generation-fixture-contract"],
    "node --test scripts/sw-two-generation-fixture-contract.test.mjs"
  );
  assert.equal(
    packageJson.scripts["test:e2e:sw-upgrade"],
    "node scripts/run-sw-two-generation-fixture.mjs"
  );
});
