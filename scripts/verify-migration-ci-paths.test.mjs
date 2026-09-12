import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

// These contracts read configuration and spec declarations only. They do not
// load application modules, execute browser bodies, or rebuild an artifact.
const workflow = await readFile(new URL("../.github/workflows/migration-ci.yml", import.meta.url), "utf8");
const lines = workflow.split(/\r?\n/u);
const start = lines.findIndex((line) => line === "  pull_request:");
assert.notEqual(start, -1, "Migration CI must have a pull_request trigger");
let end = lines.findIndex((line, index) => index > start && /^  \S/u.test(line));
if (end === -1) end = lines.length;
const pullRequest = lines.slice(start + 1, end);
assert(pullRequest.includes("    paths:"), "Migration CI must have pull_request.paths");
const filters = pullRequest
  .filter((line) => /^      - /u.test(line))
  .map((line) => {
    assert.match(line, /^      - "[^"\r\n]+"$/u, "Use explicit quoted path filters");
    return JSON.parse(line.slice(8));
  });
assert(filters.length > 0, "Migration CI path filters must not be empty");
assert(filters.every((filter) => !filter.startsWith("!")), "Negative filters need an explicit trigger-contract review");
const triggersFor = (changedPath) => filters.some((filter) => path.posix.matchesGlob(changedPath, filter));

test("SW takeover retry implementation or test independently triggers Migration CI", () => {
  for (const changedPath of [
    "apps/web/src/lib/service-worker-takeover-retry.ts",
    "apps/web/src/lib/service-worker-takeover-retry.test.ts",
    "apps/web/src/lib/service-worker-boot-ack.ts",
    "apps/web/src/lib/service-worker-boot-ack.test.ts"
  ]) assert(triggersFor(changedPath), changedPath);
});

test("SW safety responsibility is covered without enumerating every new module", () => {
  assert(filters.includes("apps/web/src/lib/service-worker-*"));
  assert(triggersFor("apps/web/src/lib/service-worker-new-safety-contract.ts"));
  assert(triggersFor("apps/web/src/lib/service-worker-new-safety-contract.test.ts"));
});

test("existing migration responsibilities and their path-contract test remain triggers", () => {
  for (const changedPath of [
    "apps/web/src/bootstrap.ts",
    "apps/web/src/lib/release-controller-takeover-write-fence.test.ts",
    "apps/web/public/sw.js",
    "packages/backup/src/index.ts",
    "packages/storage/src/index.test.ts",
    "scripts/verify-migration-ci-paths.test.mjs",
    ".github/workflows/migration-ci.yml"
  ]) assert(triggersFor(changedPath), changedPath);
});

test("application boot responsibility and build identity tests independently trigger Migration CI", () => {
  assert(filters.includes("apps/web/src/lib/app-boot-*"));
  for (const changedPath of [
    "apps/web/src/lib/app-boot-ready.ts",
    "apps/web/src/lib/app-boot-ready.test.ts",
    "apps/web/src/lib/app-boot-failure.ts",
    "apps/web/src/lib/app-boot-failure-latch.ts",
    "apps/web/src/lib/app-boot-failure-latch.test.ts",
    "apps/web/src/lib/app-boot-readiness.ts",
    "apps/web/src/lib/app-boot-readiness.test.ts",
    "apps/web/src/lib/app-boot-new-safety-contract.ts",
    "apps/web/src/lib/app-boot-new-safety-contract.test.ts",
    "apps/web/pwa-build.ts",
    "apps/web/src/pwa-build.test.ts"
  ]) assert(triggersFor(changedPath), changedPath);
});

test("release browser completion responsibility independently triggers Migration CI", () => {
  assert(filters.includes("apps/web/playwright.release-browser-*.ts"));
  for (const changedPath of [
    "apps/web/playwright.release-browser-matrix.ts",
    "apps/web/playwright.release-browser-result.ts",
    "apps/web/playwright.release-browser-strict-reporter.ts",
    "apps/web/playwright.release-browser-future-contract.ts"
  ]) assert(triggersFor(changedPath), changedPath);
});

test("unrelated documentation alone does not trigger the expensive migration matrix", () => {
  for (const changedPath of [
    "README.md",
    "docs/research/notes.md",
    "docs/release/unrelated-editorial-note.md",
    "docs/app-boot-ready.md",
    "docs/pwa-build.md",
    "docs/playwright.release-browser-result.md",
    "docs/service-worker-takeover-retry.md"
  ]) assert.equal(triggersFor(changedPath), false, changedPath);
});

test("the local data diagnostic selects all eighteen branded targets without npm hooks or formal receipts", async () => {
  const [packageText, config, boundary, readonly, product, resilience, capacity, matrix, base] = await Promise.all([
    "../package.json",
    "../apps/web/playwright.local-data-boundaries.config.ts",
    "../apps/web/e2e/local-data-recovery-boundaries.spec.ts",
    "../apps/web/e2e/local-data-readonly-recovery.spec.ts",
    "../apps/web/e2e/local-product-flows.spec.ts",
    "../apps/web/e2e/local-ai-source-resilience.spec.ts",
    "../apps/web/e2e/full-backup-worker-capacity.spec.ts",
    "../apps/web/playwright.release-browser-matrix.ts",
    "../apps/web/playwright.pwa-cross-browser.config.ts"
  ].map((relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8")));
  const scripts = JSON.parse(packageText).scripts;
  const command = "diagnose:e2e:local-data-boundaries";
  assert.equal(scripts[command], "playwright test --config apps/web/playwright.local-data-boundaries.config.ts");
  for (const prefix of ["pre", "post"]) assert.equal(Object.hasOwn(scripts, `${prefix}${command}`), false);
  const testMatch = config.match(/testMatch:\s*\[([^\]]+)\]/u);
  assert(testMatch, "The supplement must use an explicit spec list");
  assert.deepEqual(JSON.parse(`[${testMatch[1]}]`), [
    "local-data-recovery-boundaries.spec.ts", "local-data-readonly-recovery.spec.ts",
    "local-product-flows.spec.ts", "local-ai-source-resilience.spec.ts", "full-backup-worker-capacity.spec.ts"
  ]);
  for (const fragment of [
    'import baseConfig from "./playwright.pwa-cross-browser.config.ts"',
    "projects: baseConfig.projects?.map", "fullyParallel: false", "forbidOnly: true",
    "failOnFlakyTests: true", "retries: 0", "repeatEach: 1", "workers: 1",
    'reporter: "line"', 'trace: "on"', "formalReleaseEvidenceReceipt: false",
    'command: "npm run preview:release-artifact --workspace @hakimi/web"',
    "reuseExistingServer: false"
  ]) assert(config.includes(fragment), fragment);
  assert.doesNotMatch(config, /\b(?:grep|grepInvert|testIgnore|shard)\s*:|release-browser-strict-reporter|npm run build/u);
  assert(base.includes("projects: RELEASE_BROWSER_MATRIX.map"));
  const projects = [...matrix.matchAll(/projectName:\s*"([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(projects, ["msedge", "chrome"]);
  const declarations = (source) => [...source.matchAll(/^test\("([^"]+)"/gmu)].map((match) => match[1]);
  assert.equal(declarations(boundary).length, 2);
  assert.equal(declarations(readonly).length, 1);
  assert.equal(declarations(product).length, 3);
  assert.equal(declarations(resilience).length, 2);
  assert.equal(declarations(capacity).length, 1);
  const selectedSources = [boundary, readonly, product, resilience, capacity];
  const titles = selectedSources.flatMap(declarations);
  assert.equal(new Set(titles).size, 9);
  assert.equal(titles.length * projects.length, 18);
  for (const source of selectedSources) assert.doesNotMatch(source, /\btest\.(?:only|skip|fixme|fail)\s*\(/u);
  for (const changedPath of [
    "apps/web/playwright.local-data-boundaries.config.ts",
    "apps/web/e2e/local-data-recovery-boundaries.spec.ts",
    "apps/web/e2e/local-data-readonly-recovery.spec.ts",
    "apps/web/e2e/local-product-flows.spec.ts",
    "apps/web/e2e/local-ai-source-resilience.spec.ts",
    "apps/web/e2e/full-backup-worker-capacity.spec.ts",
    "apps/web/e2e/locked-default-v13-artifact.ts"
  ]) assert(triggersFor(changedPath), changedPath);
});

test("nightly local data diagnostics preserve the existing heavy suite and require locked single-attempt JSON evidence", async () => {
  const nightly = (await readFile(new URL("../.github/workflows/nightly-heavy.yml", import.meta.url), "utf8"))
    .replace(/\r\n?/gu, "\n");
  const marker = "  local-data-boundaries-diagnostic:\n";
  assert.equal(nightly.split(marker).length, 2);
  const [existing, diagnostic] = nightly.split(marker);
  assert.deepEqual([...existing.matchAll(/^      - run: (.+)$/gmu)].map((match) => match[1]), [
    "npm install --global npm@11.13.0", "npm ci", "npx playwright install chrome msedge",
    "npm run test:e2e:backup", "npm run test:e2e:pwa", "npm run test:e2e:a11y",
    "npm run test:e2e:capacity", "npm run test:e2e:p2-05-heavy-browser-gate",
    "npm run test:e2e:schema-v16-clean-start-capacity"
  ]);
  assert(diagnostic.includes("runs-on: windows-latest"));
  assert.doesNotMatch(diagnostic, /continue-on-error|run-release-evidence-command|generate-release-evidence|--grep|--project|--shard/u);
  const ordered = [
    "node scripts/compute-release-evidence-id.mjs --channel default-v13",
    "npm run diagnose:build",
    "node scripts/verify-built-release-storage-manifest.mjs dist/web --expected-channel default-v13",
    "node scripts/release-artifact-identity.mjs --write --dist dist/web --lock tmp/release-artifact-identity.json",
    "npm.cmd run diagnose:e2e:local-data-boundaries -- --reporter=line,json",
    "node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json"
  ];
  let previous = -1;
  for (const command of ordered) {
    assert.equal(diagnostic.split(command).length, 2, command);
    const position = diagnostic.indexOf(command);
    assert(position > previous, command);
    previous = position;
  }
  assert.equal(diagnostic.split("if: ${{ always() && steps.artifact_lock.outcome == 'success' }}").length - 1, 2);
  for (const fragment of [
    "id: artifact_lock", '"HAKIMI_RELEASE_EVIDENCE_ID=$taskEvidenceId" >> $env:GITHUB_ENV',
    "PLAYWRIGHT_JSON_OUTPUT_NAME: ${{ runner.temp }}/hakimi-local-data-boundaries/results.json",
    '--output "$taskOutput/test-results"', "if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }",
    "$ErrorActionPreference = 'Stop'", "Get-Content -LiteralPath $taskReportPath -Raw | ConvertFrom-Json -Depth 100",
    "@($taskReport.errors).Count -ne 0", "$taskReport.stats.expected -ne 18", "$taskReport.stats.skipped -ne 0",
    "$taskReport.stats.unexpected -ne 0", "$taskReport.stats.flaky -ne 0", "$taskTests.Count -ne 18",
    "-cne 'chrome,msedge'", "@('msedge', 'chrome')"
  ]) assert(diagnostic.includes(fragment), fragment);
  for (const fragment of [
    "@($taskTests | Where-Object { $_.projectName -ceq $projectName }).Count -ne 9",
    "$project.retries -ne 0", "$project.repeatEach -ne 1", "$testCase.expectedStatus -cne 'passed'",
    "$testCase.status -cne 'expected'", "@($testCase.results).Count -ne 1",
    "$testCase.results[0].status -cne 'passed'", "$testCase.results[0].retry -ne 0",
    "@($testCase.results[0].errors).Count -ne 0", "if: ${{ always() }}", "uses: actions/upload-artifact@v4",
    "${{ runner.temp }}/hakimi-local-data-boundaries", "if-no-files-found: error"
  ]) assert(diagnostic.includes(fragment), fragment);
});

test("the diagnostic does not replace or reduce formal backup and boot matrices", async () => {
  const [packageText, backup, boot, result] = await Promise.all([
    "../package.json", "../apps/web/playwright.release-backup-artifact.config.ts",
    "../apps/web/playwright.release-boot-artifact.config.ts", "../apps/web/playwright.release-browser-result.ts"
  ].map((relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8")));
  const scripts = JSON.parse(packageText).scripts;
  assert.equal(scripts["test:release:backup-artifact"], "playwright test --config apps/web/playwright.release-backup-artifact.config.ts");
  assert.equal(scripts["test:release:boot-artifact"], "playwright test --config apps/web/playwright.release-boot-artifact.config.ts");
  const selectedSpecs = (source) => JSON.parse(`[${source.match(/testMatch:\s*\[([^\]]+)\]/u)?.[1]}]`);
  assert.deepEqual(selectedSpecs(backup), ["database-v9-v10-upgrade.spec.ts", "database-v10-v11-upgrade.spec.ts", "offline-full-backup.spec.ts", "full-backup-worker-capacity.spec.ts"]);
  assert.deepEqual(selectedSpecs(boot), ["boot-fail-closed.spec.ts", "database-v8-v9-upgrade.spec.ts"]);
  assert.match(backup, /receiptId: "backup", expectedTestsPerProject: 4/u);
  assert.match(boot, /receiptId: "boot", expectedTestsPerProject: 6/u);
  assert.match(result, /backup: 4,/u);
  assert.match(result, /boot: 6,/u);
  for (const source of [backup, boot, result]) assert.doesNotMatch(source, /local-data-boundaries|local-data-recovery|local-data-readonly/u);
});

test("the standalone ABA supplement preserves the canonical three-scenario gate", async () => {
  const [packageText, config, spec, canonicalConfig, canonicalResult, runner] = await Promise.all([
    "../package.json", "../apps/web/playwright.sw-aba.config.ts",
    "../apps/web/e2e/service-worker-same-schema-aba.spec.ts",
    "../apps/web/playwright.sw-upgrade.config.ts",
    "../apps/web/playwright.sw-two-generation-fixture-result.ts",
    "./run-sw-same-schema-aba-fixture.mjs"
  ].map((relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8")));
  const scripts = JSON.parse(packageText).scripts;
  const command = "diagnose:e2e:sw-aba";
  assert.equal(scripts[command], "node scripts/run-sw-same-schema-aba-fixture.mjs");
  for (const prefix of ["pre", "post"]) assert.equal(Object.hasOwn(scripts, `${prefix}${command}`), false);
  assert.match(config, /testMatch: "service-worker-same-schema-aba\.spec\.ts"/u);
  assert.match(config, /projects: RELEASE_BROWSER_MATRIX\.map/u);
  for (const fragment of ["forbidOnly: true", "retries: 0", "repeatEach: 1", "formalReleaseEvidence: false"]) assert(config.includes(fragment), fragment);
  assert.equal([...spec.matchAll(/^test\("/gmu)].length, 1);
  assert.doesNotMatch(spec, /\btest\.(?:only|skip|fixme|fail)\s*\(/u);
  assert.match(canonicalConfig, /testMatch: "service-worker-two-generation\.spec\.ts"/u);
  assert.match(canonicalResult, /SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT = 3 as const/u);
  assert.match(canonicalResult, /rollbackVerified: false/u);
  assert.doesNotMatch(canonicalConfig, /same-schema-aba/u);
  for (const fragment of ["resolveDiagnosticProgram(DIAGNOSTIC_STAGES.build, root)", "verifyReleaseArtifactIdentityLock", "snapshotSwTwoGenerationArtifactSetDirectory", "canonicalThreeScenarioGateAssessed: false", "formalReleaseEvidence: false"]) assert(runner.includes(fragment), fragment);
  for (const changedPath of ["apps/web/playwright.sw-aba.config.ts", "apps/web/e2e/service-worker-same-schema-aba.spec.ts", "scripts/run-sw-same-schema-aba-fixture.mjs"]) assert(triggersFor(changedPath), changedPath);
});
