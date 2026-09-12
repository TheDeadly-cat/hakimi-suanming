import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import {
  assertSwTwoGenerationFixtureCriticalSourceIdentity,
  loadSwTwoGenerationFixtureCriticalSourceIdentity,
  SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES
} from "../apps/web/sw-two-generation-fixture-source-identity.ts";

// These contracts read configuration, source identities and spec declarations.
// They do not execute application/browser bodies or rebuild an artifact.
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
    ".gitattributes",
    "apps/web/src/bootstrap.ts",
    "apps/web/src/lib/release-controller-takeover-write-fence.test.ts",
    "apps/web/public/sw.js",
    "packages/backup/src/index.ts",
    "packages/storage/src/index.test.ts",
    "scripts/verify-migration-ci-paths.test.mjs",
    ".github/workflows/migration-ci.yml"
  ]) assert(triggersFor(changedPath), changedPath);
});

test("Git Windows checkout preserves raw SW and governance identities plus retained mixed-newline files", async (t) => {
  const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
  const parent = await realpath(os.tmpdir());
  const temporaryRoot = await mkdtemp(path.join(parent, "hakimi-checkout-bytes-"));
  const owned = await lstat(temporaryRoot, { bigint: true });
  t.after(async () => {
    assert.equal(path.dirname(temporaryRoot), parent);
    assert.match(path.basename(temporaryRoot), /^hakimi-checkout-bytes-[a-z0-9]{6}$/iu);
    assert.equal(await realpath(temporaryRoot), temporaryRoot);
    const current = await lstat(temporaryRoot, { bigint: true });
    assert(current.isDirectory() && !current.isSymbolicLink());
    assert.equal(current.dev, owned.dev);
    assert.equal(current.ino, owned.ino);
    await rm(temporaryRoot, { recursive: true, force: true });
  });
  const inputRoot = path.join(temporaryRoot, "input");
  await mkdir(inputRoot);
  const emptyConfig = path.join(temporaryRoot, "empty-config");
  await writeFile(emptyConfig, "", { flag: "wx" });
  const environment = {};
  for (const name of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "ComSpec", "COMSPEC", "TEMP", "TMP", "HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "LANG", "LC_ALL"]) {
    if (process.env[name] !== undefined) environment[name] = process.env[name];
  }
  environment.GIT_CONFIG_NOSYSTEM = "1";
  environment.GIT_CONFIG_GLOBAL = emptyConfig;
  function git(autoCrlf, ...args) {
    const result = spawnSync("git", ["-c", `core.autocrlf=${autoCrlf}`, "-c", "core.safecrlf=false",
      "-c", `core.attributesFile=${emptyConfig}`, ...args], {
      cwd: inputRoot, env: environment, encoding: "utf8", windowsHide: true, timeout: 30_000
    });
    assert.equal(result.status, 0, `${args[0]}: ${result.stderr}`);
  }
  const modulePath = "apps/web/sw-two-generation-fixture-source-identity.ts";
  const retained = ["README.md", "apps/web/e2e/service-worker-same-schema-aba.spec.ts"];
  const rawGovernanceInputs = [
    "apps/web/bundled-knowledge-audit.ts",
    "packages/bazi-interpretation/src/current-chart-review-snapshot.ts",
    "packages/bazi-interpretation/src/index.ts",
    "packages/bazi-interpretation/src/strength-evidence-narrative.ts",
    "packages/research-export/src/golden/single-chart-report.contract.v1.7.json",
    "packages/rule-profiles/src/index.ts",
    "content/bazi-strength-expert-review-packet.current.json",
    "docs/status/current-index-summary.md",
    "content/system-admission/history-checkpoint.v2.json",
    "content/system-admission/current-index.v1.json",
    "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
    "scripts/formal-npm-lifecycle-closure-lib.mjs",
    "docs/release/sw-ab-update-candidate-policy.v1.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-v1.schema.json",
    "docs/release/sw-ab-update-candidate-v1.schema.json",
    "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json",
    "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json",
    "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json",
    "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json",
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
    ".github/workflows/quick-ci.yml",
    "docs/release/storage-v13-matrix-browser-receipt-candidate-v1.schema.json",
    "docs/release/storage-v13-matrix-candidate-policy.v1.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json",
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json",
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json"
  ];
  const paths = [".gitattributes", ...SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCES.map((entry) => entry.path), modulePath, ...rawGovernanceInputs, ...retained];
  const originalBytes = new Map();
  for (const relativePath of paths) {
    const bytes = await readFile(path.join(repositoryRoot, relativePath));
    originalBytes.set(relativePath, bytes);
    const target = path.join(inputRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
  git("false", "init", "--quiet");
  git("false", "add", "--", ...paths);
  async function checkout(label) {
    const outputRoot = path.join(temporaryRoot, label);
    await mkdir(outputRoot);
    git("true", "checkout-index", "--all", `--prefix=${outputRoot.split(path.sep).join("/")}/`);
    return outputRoot;
  }
  const protectedRoot = await checkout("protected");
  const protectedIdentity = loadSwTwoGenerationFixtureCriticalSourceIdentity(protectedRoot);
  assertSwTwoGenerationFixtureCriticalSourceIdentity(protectedIdentity);
  for (const relativePath of [modulePath, ...rawGovernanceInputs, ...retained]) {
    assert.deepEqual(await readFile(path.join(protectedRoot, relativePath)), originalBytes.get(relativePath), relativePath);
  }
  // The same actual Git checkout without attributes must reproduce raw drift.
  await writeFile(path.join(inputRoot, ".gitattributes"), "# intentionally absent policy for the negative control\n");
  git("false", "add", "--", ".gitattributes");
  const unprotected = loadSwTwoGenerationFixtureCriticalSourceIdentity(await checkout("unprotected"));
  assert.throws(() => assertSwTwoGenerationFixtureCriticalSourceIdentity(unprotected), /critical source identity drifted/u);
  assert(unprotected.files.some((file, index) => file.rawSha256 !== protectedIdentity.files[index].rawSha256));
  assert.deepEqual(unprotected.files.map((file) => file.normalizedSha256), protectedIdentity.files.map((file) => file.normalizedSha256));
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
