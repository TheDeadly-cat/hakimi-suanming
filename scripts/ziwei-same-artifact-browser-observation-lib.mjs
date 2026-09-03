import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const ZIWEI_SAME_ARTIFACT_CANDIDATE_PATH =
  "content/system-admission/ziwei-same-artifact-browser-observation-child.v1.0.0.json";
export const ZIWEI_SAME_ARTIFACT_SCHEMA_VERSION = "1.0.0";
export const ZIWEI_SAME_ARTIFACT_CHILD_ID =
  "hakimi.ziwei.same-artifact-browser-observation/1.0.0";
export const ZIWEI_SAME_ARTIFACT_RUNTIME_SCHEMA =
  "hakimi.ziwei.same-artifact-browser-runtime-observation/1";
export const ZIWEI_SAME_ARTIFACT_SUMMARY_SCHEMA =
  "hakimi.ziwei.same-artifact-playwright-summary/1";

export const EXPECTED_BROWSER_PROJECTS = Object.freeze(["chrome", "msedge"]);
const compareCodeUnits = (left, right) => left < right ? -1 : left > right ? 1 : 0;
export const EXPECTED_SCENARIOS = Object.freeze([
  Object.freeze({
    scenarioId: "ziwei.workspace.full-flow-save-reopen-clear",
    title: "独立 4218 工作台完成计算、保存、重开、跨标签刷新与唯一清空",
    storageAssertionClass: "test_declared_visible_save_reopen_cross_tab_revision_count_epoch_and_clear_state"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.four-part-readonly",
    title: "当前盘四段式直读按宫切换、空宫失败关闭且零写入",
    storageAssertionClass: "test_declared_visible_revision_count_epoch_and_byte_count_unchanged"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.core-minor-projection-readonly",
    title: "核心十二辅星候选只投影精确命中并保持非核心星失败关闭",
    storageAssertionClass: "test_declared_full_storage_snapshot_equality_and_visible_epoch_unchanged"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.transformation-feedback-readonly",
    title: "四化十二宫审稿模板可下载、只读预检且篡改失败后零写入",
    storageAssertionClass: "test_declared_feedback_visibility_and_visible_revision_count_epoch_bytes_unchanged"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.core-minor-feedback-readonly",
    title: "v0.13 当前盘核心十二辅煞三方四正审稿包保持只读、整盘绑定与切宫稳定",
    storageAssertionClass: "test_declared_feedback_visibility_full_storage_snapshot_equality_and_visible_epoch_unchanged"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.backup-clear-atomic-restore",
    title: "独立紫微档案 8 条完整备份导出、清空与原子恢复",
    storageAssertionClass: "test_declared_visible_revision_count_8_and_epoch_8_9_10"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.stale-tab-write",
    title: "多标签陈旧写入在真实浏览器失败关闭且不产生部分写入",
    storageAssertionClass: "test_declared_conflict_message_and_visible_revision_count_2_epoch_2"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.worker-crash",
    title: "紫微计算 Worker 崩溃时失败关闭且不出现保存表单",
    storageAssertionClass: "test_declared_fail_closed_ui_and_visible_revision_count_zero"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.worker-malformed",
    title: "紫微计算 Worker 畸形回执时失败关闭且不出现保存表单",
    storageAssertionClass: "test_declared_fail_closed_ui_and_visible_revision_count_zero"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.corrupt-backup",
    title: "损坏的紫微完整备份预检失败关闭且零写入",
    storageAssertionClass: "test_declared_restore_disabled_and_visible_revision_count_1_epoch_1"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.backup-content-conflict",
    title: "紫微完整备份内容冲突恢复预检失败关闭且零写入",
    storageAssertionClass: "test_declared_restore_disabled_and_visible_revision_count_1_epoch_3"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.transaction-abort",
    title: "紫微保存事务中止时失败关闭且不产生部分写入",
    storageAssertionClass: "test_declared_abort_message_and_visible_revision_count_1_epoch_1"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.quota-failure",
    title: "紫微保存遇到设备配额不足时失败关闭且不产生部分写入",
    storageAssertionClass: "test_declared_quota_message_and_visible_revision_count_1_epoch_1"
  }),
  Object.freeze({
    scenarioId: "ziwei.workspace.three-party-stale-writes",
    title: "三方并发下两个陈旧标签页的保存均失败关闭且不产生部分写入",
    storageAssertionClass: "test_declared_conflict_messages_and_visible_revision_count_2_epoch_2"
  })
]);

const E2E_REQUIRED_ASSERTION_FRAGMENTS = Object.freeze({
  "ziwei.workspace.full-flow-save-reopen-clear": Object.freeze([
    'await expect(page.locator("#revision-count")).toHaveText("1");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("1");',
    'await expect(page.locator("#revision-count")).toHaveText("0");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("2");'
  ]),
  "ziwei.workspace.four-part-readonly": Object.freeze([
    'await expect(page.locator("#revision-count")).toHaveText("0");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("0");',
    'await expect(page.locator("#total-bytes")).toHaveText("0 B");'
  ]),
  "ziwei.workspace.core-minor-projection-readonly": Object.freeze([
    'const storageBefore = await snapshotWorkspaceStorage(page);',
    'expect(await snapshotWorkspaceStorage(page)).toEqual(storageBefore);',
    'await expect(page.locator("#mutation-epoch")).toHaveText("0");'
  ]),
  "ziwei.workspace.transformation-feedback-readonly": Object.freeze([
    'await expect(page.locator("#review-feedback-items")).not.toContainText("此人必然死亡。");',
    'await expect(page.locator("#revision-count")).toHaveText("0");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("0");',
    'await expect(page.locator("#total-bytes")).toHaveText("0 B");'
  ]),
  "ziwei.workspace.core-minor-feedback-readonly": Object.freeze([
    'const storageBefore = await snapshotWorkspaceStorage(page);',
    'expect(await snapshotWorkspaceStorage(page)).toEqual(storageBefore);',
    'await expect(page.locator("#mutation-epoch")).toHaveText("0");'
  ]),
  "ziwei.workspace.backup-clear-atomic-restore": Object.freeze([
    'await expect(page.locator("#mutation-epoch")).toHaveText("8");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("9");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("10");',
    'await expect(page.locator("#revision-count")).toHaveText("8");'
  ]),
  "ziwei.workspace.stale-tab-write": Object.freeze([
    'await expect(first.locator("#workspace-status")).toContainText("资料库已在另一个页面更新"',
    'await expect(first.locator("#revision-count")).toHaveText("2");',
    'await expect(first.locator("#mutation-epoch")).toHaveText("2");'
  ]),
  "ziwei.workspace.worker-crash": Object.freeze([
    'await installFaultWorker(page, "crash");',
    "await expectCalculationFailClosed(page);"
  ]),
  "ziwei.workspace.worker-malformed": Object.freeze([
    'await installFaultWorker(page, "malformed");',
    "await expectCalculationFailClosed(page);"
  ]),
  "ziwei.workspace.corrupt-backup": Object.freeze([
    'await expect(page.locator("#restore-button")).toBeDisabled();',
    'await expect(page.locator("#revision-count")).toHaveText("1");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("1");'
  ]),
  "ziwei.workspace.backup-content-conflict": Object.freeze([
    'await expect(page.locator("#restore-button")).toBeDisabled();',
    'await expect(page.locator("#revision-count")).toHaveText("1");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("3");'
  ]),
  "ziwei.workspace.transaction-abort": Object.freeze([
    'await expect(page.locator("#workspace-status")).toContainText("事务中止"',
    'await expect(page.locator("#revision-count")).toHaveText("1");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("1");'
  ]),
  "ziwei.workspace.quota-failure": Object.freeze([
    'await expect(page.locator("#workspace-status")).toContainText("容量不足"',
    'await expect(page.locator("#revision-count")).toHaveText("1");',
    'await expect(page.locator("#mutation-epoch")).toHaveText("1");'
  ]),
  "ziwei.workspace.three-party-stale-writes": Object.freeze([
    '"资料库已在另一个页面更新"',
    'await expect(stale.page.locator("#revision-count")).toHaveText("2");',
    'await expect(stale.page.locator("#mutation-epoch")).toHaveText("2");'
  ])
});

const ADAPTER_BROWSER_SOURCE_PATHS = Object.freeze([
  "browser-artifact.ts",
  "browser-client.ts",
  "browser-protocol.ts",
  "browser-worker.ts",
  "display-projection.ts",
  "high-risk-expression-egress-policy.ts",
  "high-risk-expression-egress-view.ts",
  "major-star-content.ts",
  "major-star-palace-content.ts",
  "core-minor-star-content.ts",
  "core-minor-star-sanfang-review.ts",
  "core-minor-star-sanfang-review-feedback.ts",
  "natal-transformation-content.ts",
  "natal-transformation-palace-content.ts",
  "natal-transformation-palace-review-feedback.ts",
  "major-star-combination-review.ts",
  "major-star-synthesis-review.ts",
  "palace-first-synthesis-review.ts",
  "natal-transformation-review.ts",
  "palace-four-part-synthesis-content.ts",
  "main-response-gate.ts",
  "main.ts",
  "generated-browser-source-identity.ts",
  "generated-rule-snapshot.ts"
].map((leaf) => `packages/ziwei-iztro-adapter-draft/src/browser-preview/${leaf}`));

export const BUILD_SOURCE_PATHS = Object.freeze([
  "package.json",
  "package-lock.json",
  "tsconfig.base.json",
  "packages/ziwei-doushu-contracts-draft/package.json",
  "packages/ziwei-doushu-contracts-draft/tsconfig.json",
  "packages/ziwei-doushu-contracts-draft/src/index.ts",
  "packages/ziwei-iztro-adapter-draft/package.json",
  "packages/ziwei-iztro-adapter-draft/tsconfig.json",
  "packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs",
  "packages/ziwei-iztro-adapter-draft/browser-preview/emit-rule-snapshot.mjs",
  "packages/ziwei-iztro-adapter-draft/licenses/iztro-2.5.8-LICENSE.txt",
  "packages/ziwei-iztro-adapter-draft/src/index.ts",
  "packages/ziwei-iztro-adapter-draft/src/contract-bridge.ts",
  "packages/ziwei-iztro-adapter-draft/src/node-worker-entry.mjs",
  "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json",
  ...ADAPTER_BROWSER_SOURCE_PATHS,
  "packages/ziwei-workspace-artifact-draft/package.json",
  "packages/ziwei-workspace-artifact-draft/tsconfig.json",
  "packages/ziwei-workspace-artifact-draft/browser-app/index.html",
  "packages/ziwei-workspace-artifact-draft/vite.browser-app.config.mjs",
  "packages/ziwei-workspace-artifact-draft/vite.same-artifact-evidence.config.mjs",
  "packages/ziwei-workspace-artifact-draft/src/browser-app/main.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-app/styles.css",
  "packages/ziwei-workspace-artifact-draft/src/browser-persistence.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-artifact-bridge.ts",
  "packages/ziwei-workspace-artifact-draft/src/browser-calculation-bridge.ts",
  "packages/ziwei-workspace-artifact-draft/src/contract-bridge.ts"
]);

export const EVIDENCE_TOOL_PATHS = Object.freeze([
  "scripts/ziwei-same-artifact-browser-observation-lib.mjs",
  "scripts/run-ziwei-same-artifact-browser-observation.mjs",
  "scripts/render-ziwei-same-artifact-browser-observation-candidate.mjs",
  "scripts/verify-ziwei-same-artifact-browser-observation.mjs",
  "scripts/verify-ziwei-same-artifact-browser-observation.test.mjs",
  "scripts/verify-ziwei-same-artifact-config-cwd.test.mjs",
  "packages/ziwei-workspace-artifact-draft/playwright.same-artifact-evidence.config.ts",
  "packages/ziwei-workspace-artifact-draft/e2e/same-artifact-summary-reporter.ts",
  "packages/ziwei-workspace-artifact-draft/e2e/workspace-browser-gate.spec.ts",
  "apps/web/node_modules/vite/package.json",
  "apps/web/node_modules/vite/bin/vite.js",
  "node_modules/@playwright/test/package.json",
  "node_modules/@playwright/test/cli.js",
  "node_modules/playwright-core/package.json"
]);

export const FORMAL_CONTEXT_PATHS = Object.freeze([
  "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
  "content/system-admission/ziwei-high-risk-expression-policy-draft.v0.1.0.json",
  "content/system-admission/ziwei-source-binding-requirements.v1.json",
  "content/system-admission/ziwei-iztro-build-notice-evidence.v1.json"
]);

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_FILE_BYTES = 32 * 1024 * 1024;
const MAX_CANDIDATE_BYTES = 2 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/u;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export class ZiweiSameArtifactObservationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ZiweiSameArtifactObservationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ZiweiSameArtifactObservationError(code, message);
}

export function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalStringify(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("NON_CANONICAL_VALUE", "canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) {
      fail("NON_CANONICAL_VALUE", "canonical JSON rejects sparse or extended arrays");
    }
    return `[${value.map((entry) => canonicalStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`
    );
    return `{${entries.join(",")}}`;
  }
  fail("NON_CANONICAL_VALUE", "canonical JSON accepts plain JSON data only");
}

function assertRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0
      || relativePath.includes("\\") || path.posix.isAbsolute(relativePath)
      || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail("PATH_INVALID", `invalid fixed relative path: ${String(relativePath)}`);
  }
}

function stableReadAbsolute(filePath, maximumBytes) {
  const before = lstatSync(filePath, { bigint: true });
  const beforeRealPath = realpathSync.native(filePath);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) {
    fail("ENDPOINT_INVALID", `expected a single-link regular file: ${filePath}`);
  }
  if (before.size > BigInt(maximumBytes)) fail("FILE_TOO_LARGE", `file exceeds fixed limit: ${filePath}`);
  let handle;
  try {
    handle = openSync(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
    const opened = fstatSync(handle, { bigint: true });
    const bytes = readFileSync(handle);
    const after = fstatSync(handle, { bigint: true });
    const afterPath = lstatSync(filePath, { bigint: true });
    const sameIdentity = (left, right) => left.dev === right.dev && left.ino === right.ino
      && left.mode === right.mode && left.nlink === right.nlink && left.size === right.size
      && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
    if (!opened.isFile() || !sameIdentity(before, opened) || !sameIdentity(opened, after)
        || !sameIdentity(opened, afterPath) || opened.nlink !== 1n
        || beforeRealPath !== realpathSync.native(filePath)
        || BigInt(bytes.byteLength) !== opened.size) {
      fail("ENDPOINT_DRIFT", `file changed during held read: ${filePath}`);
    }
    return Buffer.from(bytes);
  } finally {
    if (handle !== undefined) closeSync(handle);
  }
}

export function readWorkspaceFileStable(workspaceRoot, relativePath, maximumBytes = MAX_SOURCE_BYTES) {
  assertRelativePath(relativePath);
  const root = realpathSync.native(workspaceRoot);
  const resolved = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail("PATH_ESCAPE", relativePath);
  if (realpathSync.native(resolved) !== resolved) {
    fail("ENDPOINT_ALIAS", `fixed endpoint must resolve to itself: ${relativePath}`);
  }
  return stableReadAbsolute(resolved, maximumBytes);
}

export function captureWorkspaceBindings(workspaceRoot, relativePaths) {
  return relativePaths.map((relativePath) => {
    const bytes = readWorkspaceFileStable(workspaceRoot, relativePath);
    return Object.freeze({ path: relativePath, bytes: bytes.byteLength, sha256: sha256Bytes(bytes) });
  });
}

export function inspectWorkspaceE2eAssertionContract(workspaceRoot) {
  const specPath = "packages/ziwei-workspace-artifact-draft/e2e/workspace-browser-gate.spec.ts";
  const source = readWorkspaceFileStable(workspaceRoot, specPath).toString("utf8");
  const starts = EXPECTED_SCENARIOS.map((scenario) => {
    const marker = `test(${JSON.stringify(scenario.title)}`;
    const index = source.indexOf(marker);
    if (index < 0 || source.indexOf(marker, index + marker.length) >= 0) {
      fail("E2E_SCENARIO_DECLARATION_INVALID", scenario.scenarioId);
    }
    return { scenario, index };
  }).sort((left, right) => left.index - right.index);
  if (starts.length !== 14) fail("E2E_SCENARIO_COUNT_INVALID", "expected exact 14 scenarios");
  const observations = starts.map((entry, index) => {
    const end = starts[index + 1]?.index ?? source.length;
    const block = source.slice(entry.index, end);
    const requiredFragments = E2E_REQUIRED_ASSERTION_FRAGMENTS[entry.scenario.scenarioId];
    if (!requiredFragments || !requiredFragments.every((fragment) => block.includes(fragment))) {
      fail("E2E_ASSERTION_CONTRACT_MISSING", entry.scenario.scenarioId);
    }
    return Object.freeze({
      scenarioId: entry.scenario.scenarioId,
      storageAssertionClass: entry.scenario.storageAssertionClass,
      requiredStableAssertionFragmentCount: requiredFragments.length,
      stableAssertionFragmentsObserved: true
    });
  }).sort((left, right) => compareCodeUnits(left.scenarioId, right.scenarioId));
  if (!source.includes('await expect(page.locator("#revision-count")).toHaveText("0");')
      || !source.includes('await expect(page.locator("#save-form")).toBeHidden();')) {
    fail("E2E_FAIL_CLOSED_HELPER_INVALID", "worker failure helper assertions are absent");
  }
  return Object.freeze({
    contractId: "hakimi.ziwei.workspace-e2e-stable-assertion-fragments/1",
    scenarioCount: 14,
    inspectionKind: "fixed_literal_fragments_not_ast_or_general_control_flow_proof",
    observations: Object.freeze(observations),
    generalControlFlowEquivalenceEstablished: false,
    completeStorageValueObservationEstablished: false
  });
}

export function fileTreeDigest(files, identity = "sha256-file-tree-v1") {
  return sha256Bytes(Buffer.from(canonicalStringify({ digestAlgorithm: identity, files }), "utf8"));
}

export function captureOutputTree(outDir) {
  const root = realpathSync.native(outDir);
  const files = [];
  const visit = (directory, prefix) => {
    const before = lstatSync(directory, { bigint: true });
    const realDirectory = realpathSync.native(directory);
    const relativeToRoot = path.relative(root, realDirectory);
    const expectedDirectory = path.resolve(root, ...(prefix ? prefix.split("/") : []));
    if (!before.isDirectory() || before.isSymbolicLink() || realDirectory !== expectedDirectory
        || (relativeToRoot.length > 0 && (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)))) {
      fail("OUTPUT_DIRECTORY_ESCAPE", `output directory escapes the controlled root: ${prefix || "."}`);
    }
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (left, right) => compareCodeUnits(left.name, right.name)
    )) {
      if (entry.isSymbolicLink()) fail("OUTPUT_SYMLINK", `output contains symlink: ${entry.name}`);
      const absolute = path.join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(absolute, relativePath);
      else if (entry.isFile()) {
        const bytes = stableReadAbsolute(absolute, MAX_OUTPUT_FILE_BYTES);
        files.push(Object.freeze({ path: relativePath, bytes: bytes.byteLength, sha256: sha256Bytes(bytes) }));
      } else fail("OUTPUT_ENDPOINT_INVALID", `unsupported output endpoint: ${relativePath}`);
    }
    const after = lstatSync(directory, { bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.mode !== after.mode
        || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
      fail("OUTPUT_DIRECTORY_DRIFT", `output directory changed during traversal: ${prefix || "."}`);
    }
  };
  visit(root, "");
  files.sort((left, right) => compareCodeUnits(left.path, right.path));
  if (!files.some((entry) => entry.path === "index.html")) fail("OUTPUT_EMPTY", "build output lacks index.html");
  return Object.freeze({
    digestAlgorithm: "sha256-file-tree-v1",
    fileCount: files.length,
    files: Object.freeze(files),
    treeDigest: fileTreeDigest(files)
  });
}

function exactKeys(record, expected, label) {
  if (!record || typeof record !== "object" || Array.isArray(record)
      || Object.getPrototypeOf(record) !== Object.prototype) fail("SHAPE_INVALID", `${label} must be a plain object`);
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (canonicalStringify(actual) !== canonicalStringify(wanted)) {
    fail("SHAPE_INVALID", `${label} keys do not match the fixed schema`);
  }
}

export function normalizePlaywrightSummary(summary) {
  const byId = new Map(EXPECTED_SCENARIOS.map((scenario) => [scenario.scenarioId, scenario]));
  const projectOrder = new Map(EXPECTED_BROWSER_PROJECTS.map((projectName, index) => [projectName, index]));
  const scenarioOrder = new Map(EXPECTED_SCENARIOS.map((scenario, index) => [scenario.scenarioId, index]));
  const normalizedKeys = [
    "configuredProjectNames", "scenarioCountPerBrowser", "expectedOutcomeCount",
    "passedOutcomeCount", "failedOutcomeCount", "retriedOutcomeCount", "outcomes"
  ];
  const actualKeys = summary && typeof summary === "object" && !Array.isArray(summary)
    ? Object.keys(summary).sort()
    : [];
  const isNormalized = canonicalStringify(actualKeys) === canonicalStringify([...normalizedKeys].sort());
  if (!isNormalized) {
    exactKeys(summary, [
      "schemaVersion", "overallStatus", "configuredProjectNames", "outcomeCount", "outcomes"
    ], "playwright summary");
    if (summary.schemaVersion !== ZIWEI_SAME_ARTIFACT_SUMMARY_SCHEMA
        || summary.overallStatus !== "passed" || summary.outcomeCount !== 28) {
      fail("PLAYWRIGHT_SUMMARY_INVALID", "Playwright summary is not an exact 28/28 pass");
    }
  } else if (summary.scenarioCountPerBrowser !== 14 || summary.expectedOutcomeCount !== 28
      || summary.passedOutcomeCount !== 28 || summary.failedOutcomeCount !== 0
      || summary.retriedOutcomeCount !== 0) {
    fail("PLAYWRIGHT_SUMMARY_INVALID", "normalized Playwright summary is not an exact 28/28 pass");
  }
  if (canonicalStringify(summary.configuredProjectNames) !== canonicalStringify(EXPECTED_BROWSER_PROJECTS)) {
    fail("PLAYWRIGHT_PROJECTS_INVALID", "Playwright browser projects are not exact Edge and Chrome");
  }
  if (!Array.isArray(summary.outcomes) || summary.outcomes.length !== 28) {
    fail("PLAYWRIGHT_OUTCOMES_INVALID", "Playwright outcome count is not exactly 28");
  }
  const seen = new Set();
  const outcomes = summary.outcomes.map((outcome) => {
    exactKeys(outcome, isNormalized
      ? ["projectName", "scenarioId", "scenarioTitle", "storageAssertionClass", "status"]
      : ["projectName", "scenarioId", "expectedStatus", "status", "retry"], "outcome");
    const scenario = byId.get(outcome.scenarioId);
    if (!scenario || !EXPECTED_BROWSER_PROJECTS.includes(outcome.projectName)
        || outcome.status !== "passed"
        || (!isNormalized && (outcome.expectedStatus !== "passed" || outcome.retry !== 0))
        || (isNormalized && (outcome.scenarioTitle !== scenario.title
          || outcome.storageAssertionClass !== scenario.storageAssertionClass))) {
      fail("PLAYWRIGHT_OUTCOME_INVALID", "Playwright outcome is unexpected, retried, or non-passing");
    }
    const key = `${outcome.projectName}\u0000${scenario.scenarioId}`;
    if (seen.has(key)) fail("PLAYWRIGHT_OUTCOME_DUPLICATE", key);
    seen.add(key);
    return Object.freeze({
      projectName: outcome.projectName,
      scenarioId: scenario.scenarioId,
      scenarioTitle: scenario.title,
      storageAssertionClass: scenario.storageAssertionClass,
      status: "passed"
    });
  }).sort((left, right) => (
    projectOrder.get(left.projectName) - projectOrder.get(right.projectName)
    || scenarioOrder.get(left.scenarioId) - scenarioOrder.get(right.scenarioId)
  ));
  for (const projectName of EXPECTED_BROWSER_PROJECTS) {
    for (const scenario of EXPECTED_SCENARIOS) {
      if (!seen.has(`${projectName}\u0000${scenario.scenarioId}`)) {
        fail("PLAYWRIGHT_OUTCOME_MISSING", `${projectName}:${scenario.scenarioId}`);
      }
    }
  }
  const normalized = Object.freeze({
    configuredProjectNames: EXPECTED_BROWSER_PROJECTS,
    scenarioCountPerBrowser: 14,
    expectedOutcomeCount: 28,
    passedOutcomeCount: 28,
    failedOutcomeCount: 0,
    retriedOutcomeCount: 0,
    outcomes: Object.freeze(outcomes)
  });
  if (isNormalized && canonicalStringify(summary) !== canonicalStringify(normalized)) {
    fail("PLAYWRIGHT_SUMMARY_NON_CANONICAL", "normalized Playwright summary is not in fixed registry order");
  }
  return normalized;
}

function validateOutputTree(tree, label) {
  exactKeys(tree, ["digestAlgorithm", "fileCount", "files", "treeDigest"], label);
  if (tree.digestAlgorithm !== "sha256-file-tree-v1" || !Array.isArray(tree.files)
      || tree.fileCount !== tree.files.length || !SHA256.test(tree.treeDigest ?? "")
      || tree.treeDigest !== fileTreeDigest(tree.files)) fail("OUTPUT_TREE_INVALID", label);
  let previousPath = null;
  for (const file of tree.files) {
    exactKeys(file, ["path", "bytes", "sha256"], `${label} file`);
    assertRelativePath(file.path);
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !SHA256.test(file.sha256 ?? "")) {
      fail("OUTPUT_FILE_INVALID", file.path);
    }
    if (previousPath !== null && compareCodeUnits(file.path, previousPath) <= 0) {
      fail("OUTPUT_FILE_ORDER_INVALID", `${label}:${file.path}`);
    }
    previousPath = file.path;
  }
  if (!tree.files.some((entry) => entry.path === "index.html")) fail("OUTPUT_INDEX_MISSING", label);
  return tree;
}

function validateBrowserProbe(probe) {
  exactKeys(probe, [
    "projectName", "channel", "browserProduct", "versionBefore", "versionAfter",
    "prePostVersionEqual", "pageTitleBefore", "pageTitleAfter", "pageUrlBefore", "pageUrlAfter",
    "outputTreeHeaderBefore", "outputTreeHeaderAfter", "headerMatchedBefore", "headerMatchedAfter",
    "responseBodyBefore", "responseBodyAfter", "responseBodyMatchedOutputTreeBefore",
    "responseBodyMatchedOutputTreeAfter", "consoleWarningOrErrorCountBefore",
    "consoleWarningOrErrorCountAfter"
  ], "browser probe");
  const expectedChannel = probe.projectName === "chrome" ? "chrome" : "msedge";
  const expectedProduct = probe.projectName === "chrome" ? "Google Chrome" : "Microsoft Edge";
  if (!EXPECTED_BROWSER_PROJECTS.includes(probe.projectName) || probe.channel !== expectedChannel
      || probe.browserProduct !== expectedProduct || typeof probe.versionBefore !== "string"
      || !/^\d+(?:\.\d+){2,3}$/u.test(probe.versionBefore)
      || probe.versionAfter !== probe.versionBefore || probe.prePostVersionEqual !== true
      || probe.pageTitleBefore !== "紫微本地研究档案 · 隔离草案"
      || probe.pageTitleAfter !== probe.pageTitleBefore
      || probe.pageUrlAfter !== probe.pageUrlBefore
      || probe.headerMatchedBefore !== true || probe.headerMatchedAfter !== true
      || probe.outputTreeHeaderAfter !== probe.outputTreeHeaderBefore
      || probe.responseBodyMatchedOutputTreeBefore !== true
      || probe.responseBodyMatchedOutputTreeAfter !== true
      || probe.consoleWarningOrErrorCountBefore !== 0
      || probe.consoleWarningOrErrorCountAfter !== 0
      || !SHA256.test(probe.outputTreeHeaderBefore ?? "")) fail("BROWSER_PROBE_INVALID", probe.projectName);
  for (const [label, body] of [["before", probe.responseBodyBefore], ["after", probe.responseBodyAfter]]) {
    exactKeys(body, ["path", "bytes", "sha256"], `browser response body ${label}`);
    if (body.path !== "index.html" || !Number.isSafeInteger(body.bytes) || body.bytes <= 0
        || !SHA256.test(body.sha256 ?? "")) fail("BROWSER_RESPONSE_BODY_INVALID", probe.projectName);
  }
  if (canonicalStringify(probe.responseBodyBefore) !== canonicalStringify(probe.responseBodyAfter)) {
    fail("BROWSER_RESPONSE_BODY_DRIFT", probe.projectName);
  }
  return Object.freeze({ ...probe });
}

function validateServedArtifacts(artifacts, outputTree, label) {
  if (!Array.isArray(artifacts) || artifacts.length < 3) fail("SERVED_ARTIFACTS_INVALID", label);
  let previousPath = null;
  for (const file of artifacts) {
    exactKeys(file, ["path", "bytes", "sha256"], `${label} artifact`);
    assertRelativePath(file.path);
    if (previousPath !== null && compareCodeUnits(file.path, previousPath) <= 0) {
      fail("SERVED_ARTIFACT_ORDER_INVALID", `${label}:${file.path}`);
    }
    previousPath = file.path;
    const output = outputTree.files.find((entry) => entry.path === file.path);
    if (!output || canonicalStringify(output) !== canonicalStringify(file)) {
      fail("SERVED_BODY_MISMATCH", `${label}:${file.path}`);
    }
  }
  return artifacts;
}

export function normalizeRuntimeObservation(observation) {
  exactKeys(observation, [
    "schemaVersion", "observedAt", "nodeVersion", "viteVersion", "playwrightVersion",
    "buildExecutionCount", "buildExitCode", "transformedModuleCount", "sourceGraphDigestBefore",
    "sourceGraphDigestAfter", "sourceGraphPrePostDigestEqual", "evidenceToolGraphDigestBefore",
    "evidenceToolGraphDigestAfter", "evidenceToolGraphPrePostDigestEqual", "outputTreeBefore", "outputTreeAfter",
    "outputTreePrePostDigestEqual", "server", "browserProbes", "playwrightSummary", "dataHandling"
  ], "runtime observation");
  if (observation.schemaVersion !== ZIWEI_SAME_ARTIFACT_RUNTIME_SCHEMA
      || !ISO_UTC.test(observation.observedAt ?? "") || observation.nodeVersion !== "24.16.0"
      || observation.viteVersion !== "7.3.6" || observation.playwrightVersion !== "1.62.1"
      || observation.buildExecutionCount !== 1 || observation.buildExitCode !== 0
      || !Number.isSafeInteger(observation.transformedModuleCount) || observation.transformedModuleCount <= 0
      || !SHA256.test(observation.sourceGraphDigestBefore ?? "")
      || observation.sourceGraphDigestAfter !== observation.sourceGraphDigestBefore
      || observation.sourceGraphPrePostDigestEqual !== true
      || !SHA256.test(observation.evidenceToolGraphDigestBefore ?? "")
      || observation.evidenceToolGraphDigestAfter !== observation.evidenceToolGraphDigestBefore
      || observation.evidenceToolGraphPrePostDigestEqual !== true
      || observation.outputTreePrePostDigestEqual !== true) {
    fail("RUNTIME_OBSERVATION_INVALID", "runtime identity or single-build boundary is invalid");
  }
  const before = validateOutputTree(observation.outputTreeBefore, "outputTreeBefore");
  const after = validateOutputTree(observation.outputTreeAfter, "outputTreeAfter");
  if (canonicalStringify(before) !== canonicalStringify(after)) fail("OUTPUT_TREE_DRIFT", "output changed during matrix");
  exactKeys(observation.server, [
    "origin", "host", "scheme", "projectHeaderName", "responseHeaderName", "responseHeaderValue",
    "requiredRuntimePaths", "requiredRuntimePathsServedByBothBrowsers", "servedResponseCount",
    "unattributedResponseCount", "servedArtifactCount", "servedArtifacts", "servedArtifactsByProject",
    "perBrowserServedBodyManifestsEqual", "servedBodyManifestDigest",
    "allServedBodiesMatchedOutputTree", "singleOutputTreeServedWithoutRebuild"
  ], "server observation");
  if (observation.server.host !== "127.0.0.1" || observation.server.scheme !== "http"
      || observation.server.origin !== "http://127.0.0.1:4218"
      || observation.server.projectHeaderName !== "x-hakimi-ziwei-evidence-project"
      || observation.server.responseHeaderName !== "x-hakimi-ziwei-output-tree-sha256"
      || observation.server.responseHeaderValue !== before.treeDigest
      || observation.server.requiredRuntimePathsServedByBothBrowsers !== true
      || observation.server.perBrowserServedBodyManifestsEqual !== true
      || observation.server.allServedBodiesMatchedOutputTree !== true
      || observation.server.singleOutputTreeServedWithoutRebuild !== true
      || !Number.isSafeInteger(observation.server.servedResponseCount)
      || observation.server.servedResponseCount < 32
      || observation.server.unattributedResponseCount !== 0
      || !Array.isArray(observation.server.servedArtifacts)
      || observation.server.servedArtifactCount !== observation.server.servedArtifacts.length
      || observation.server.servedArtifactCount < 3) fail("SERVER_OBSERVATION_INVALID", "server boundary invalid");
  const servedArtifacts = validateServedArtifacts(observation.server.servedArtifacts, before, "aggregate");
  if (!Array.isArray(observation.server.requiredRuntimePaths)
      || observation.server.requiredRuntimePaths.length < 3) {
    fail("REQUIRED_RUNTIME_SHAPE_INVALID", "required runtime paths must be a non-empty fixed subset");
  }
  let previousRequiredPath = null;
  for (const requiredPath of observation.server.requiredRuntimePaths) {
    assertRelativePath(requiredPath);
    if (previousRequiredPath !== null && compareCodeUnits(requiredPath, previousRequiredPath) <= 0) {
      fail("REQUIRED_RUNTIME_ORDER_INVALID", "required runtime paths must be unique and sorted");
    }
    previousRequiredPath = requiredPath;
    if (!servedArtifacts.some((entry) => entry.path === requiredPath)
        || !before.files.some((entry) => entry.path === requiredPath)) {
      fail("REQUIRED_RUNTIME_SUBSET_INVALID", "required runtime path was not observed from the output tree");
    }
  }
  if (!observation.server.requiredRuntimePaths.includes("index.html")
      || !observation.server.requiredRuntimePaths.some((entry) => entry.endsWith(".css"))
      || !observation.server.requiredRuntimePaths.some((entry) => entry.endsWith(".js"))
      || !observation.server.requiredRuntimePaths.some((entry) => /browser-worker/u.test(entry))) {
    fail("REQUIRED_RUNTIME_COVERAGE_INVALID", "required runtime set lacks HTML, CSS, main script, or worker");
  }
  if (observation.server.servedBodyManifestDigest
      !== fileTreeDigest(servedArtifacts, "sha256-served-body-manifest-v1")) {
    fail("SERVED_BODY_DIGEST_INVALID", "served response ledger digest mismatch");
  }
  if (!Array.isArray(observation.server.servedArtifactsByProject)
      || observation.server.servedArtifactsByProject.length !== 2) {
    fail("SERVED_PROJECT_LEDGER_INVALID", "exact Chrome and Edge ledgers required");
  }
  let perProjectResponseCount = 0;
  observation.server.servedArtifactsByProject.forEach((projectLedger, index) => {
    exactKeys(projectLedger, [
      "projectName", "servedResponseCount", "servedArtifactCount", "servedArtifacts",
      "servedBodyManifestDigest"
    ], "served project ledger");
    if (projectLedger.projectName !== EXPECTED_BROWSER_PROJECTS[index]
        || !Number.isSafeInteger(projectLedger.servedResponseCount)
        || projectLedger.servedResponseCount < 16
        || projectLedger.servedArtifactCount !== projectLedger.servedArtifacts.length) {
      fail("SERVED_PROJECT_LEDGER_INVALID", String(projectLedger.projectName));
    }
    const projectArtifacts = validateServedArtifacts(
      projectLedger.servedArtifacts,
      before,
      `project ${projectLedger.projectName}`
    );
    if (canonicalStringify(projectArtifacts) !== canonicalStringify(servedArtifacts)
        || projectLedger.servedBodyManifestDigest
          !== fileTreeDigest(projectArtifacts, "sha256-served-body-manifest-v1")) {
      fail("SERVED_PROJECT_MANIFEST_MISMATCH", projectLedger.projectName);
    }
    perProjectResponseCount += projectLedger.servedResponseCount;
  });
  if (perProjectResponseCount !== observation.server.servedResponseCount) {
    fail("SERVED_RESPONSE_COUNT_MISMATCH", "aggregate count must equal exact per-browser counts");
  }
  if (!Array.isArray(observation.browserProbes) || observation.browserProbes.length !== 2) {
    fail("BROWSER_PROBES_INVALID", "exactly two browser probes required");
  }
  const browserProbes = observation.browserProbes.map(validateBrowserProbe).sort(
    (left, right) => EXPECTED_BROWSER_PROJECTS.indexOf(left.projectName)
      - EXPECTED_BROWSER_PROJECTS.indexOf(right.projectName)
  );
  if (canonicalStringify(browserProbes.map((entry) => entry.projectName))
      !== canonicalStringify(EXPECTED_BROWSER_PROJECTS)) fail("BROWSER_PROJECTS_INVALID", "browser probes incomplete");
  for (const probe of browserProbes) {
    if (probe.outputTreeHeaderBefore !== before.treeDigest
        || probe.pageUrlBefore !== `${observation.server.origin}/`
        || canonicalStringify(probe.responseBodyBefore)
          !== canonicalStringify(before.files.find((entry) => entry.path === "index.html"))) {
      fail("BROWSER_BUILD_BINDING_INVALID", probe.projectName);
    }
  }
  const playwrightSummary = normalizePlaywrightSummary(observation.playwrightSummary);
  exactKeys(observation.dataHandling, [
    "syntheticInputsOnly", "actualPersonDataEntered", "candidateAnonymous", "rawBirthInputIncluded",
    "derivedChartDigestIncluded", "feedbackNarrativeIncluded", "backupBodyOrDigestIncluded",
    "revisionOrStudyIdentifiersIncluded", "screenshotTraceVideoOrDownloadIncluded",
    "rawPlaywrightReportIncluded", "safeToLog", "safeToPublish"
  ], "data handling");
  const expectedDataHandling = {
    syntheticInputsOnly: true,
    actualPersonDataEntered: false,
    candidateAnonymous: false,
    rawBirthInputIncluded: false,
    derivedChartDigestIncluded: false,
    feedbackNarrativeIncluded: false,
    backupBodyOrDigestIncluded: false,
    revisionOrStudyIdentifiersIncluded: false,
    screenshotTraceVideoOrDownloadIncluded: false,
    rawPlaywrightReportIncluded: false,
    safeToLog: false,
    safeToPublish: false
  };
  if (canonicalStringify(observation.dataHandling) !== canonicalStringify(expectedDataHandling)) {
    fail("DATA_HANDLING_INVALID", "runtime evidence contains or authorizes sensitive material");
  }
  return Object.freeze({
    ...observation,
    outputTreeBefore: before,
    outputTreeAfter: after,
    browserProbes: Object.freeze(browserProbes),
    playwrightSummary,
    dataHandling: Object.freeze(expectedDataHandling)
  });
}

function parseJsonBinding(workspaceRoot, relativePath) {
  const bytes = readWorkspaceFileStable(workspaceRoot, relativePath);
  let value;
  try { value = JSON.parse(bytes.toString("utf8")); }
  catch { fail("FORMAL_CONTEXT_INVALID", `invalid JSON: ${relativePath}`); }
  return { bytes, value };
}

function currentFormalContext(workspaceRoot) {
  return FORMAL_CONTEXT_PATHS.map((relativePath) => {
    const { bytes, value } = parseJsonBinding(workspaceRoot, relativePath);
    const semanticDigest = value.manifestDigest ?? value.childDigest ?? value.ledgerDigest ?? value.evidenceDigest;
    if (!SHA256.test(semanticDigest ?? "")) fail("FORMAL_CONTEXT_DIGEST_INVALID", relativePath);
    return Object.freeze({
      path: relativePath,
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      semanticDigest
    });
  });
}

function projectCandidateForDigest(candidate) {
  const { observationDigest: _omitted, ...projected } = candidate;
  return projected;
}

export function computeCandidateDigest(candidate) {
  return sha256Bytes(Buffer.from(canonicalStringify(projectCandidateForDigest(candidate)), "utf8"));
}

export function buildCurrentZiweiSameArtifactCandidate(workspaceRoot, runtimeObservation, createdAt) {
  const runtime = normalizeRuntimeObservation(runtimeObservation);
  if (!ISO_UTC.test(createdAt ?? "") || createdAt !== runtime.observedAt) {
    fail("CREATED_AT_INVALID", "candidate time must equal the runtime observation time");
  }
  const buildSourceFiles = captureWorkspaceBindings(workspaceRoot, BUILD_SOURCE_PATHS);
  const buildSourceGraphDigest = fileTreeDigest(buildSourceFiles, "sha256-authored-build-source-graph-v1");
  if (runtime.sourceGraphDigestBefore !== buildSourceGraphDigest) {
    fail("SOURCE_GRAPH_MISMATCH", "runtime observation does not bind the current authored build source graph");
  }
  const evidenceToolFiles = captureWorkspaceBindings(workspaceRoot, EVIDENCE_TOOL_PATHS);
  const evidenceToolGraphDigest = fileTreeDigest(evidenceToolFiles);
  if (runtime.evidenceToolGraphDigestBefore !== evidenceToolGraphDigest) {
    fail("EVIDENCE_TOOL_GRAPH_MISMATCH", "runtime observation does not bind the current evidence tooling graph");
  }
  const candidate = {
    schemaVersion: ZIWEI_SAME_ARTIFACT_SCHEMA_VERSION,
    recordType: "ziwei_same_artifact_edge_chrome_browser_observation_child",
    childId: ZIWEI_SAME_ARTIFACT_CHILD_ID,
    status: "isolated_engineering_browser_observation_only_not_admitted",
    createdAt,
    systemIdentity: {
      systemId: "ziwei",
      productSurface: "ziwei-isolated-workspace-draft@0.1.0",
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      projectDefaultReleaseGovernanceContext: {
        releaseIdentity: "legacy-v13",
        targetSchema: 13,
        migrationId: null
      },
      projectDefaultReleaseGovernanceInherited: false
    },
    buildSourceSnapshot: {
      graphId: "hakimi.ziwei.authored-build-source-graph/1",
      digestAlgorithm: "sha256-authored-build-source-graph-v1",
      fileCount: buildSourceFiles.length,
      files: buildSourceFiles,
      graphDigest: buildSourceGraphDigest,
      prePostEndpointDigestEqual: true,
      completeInstalledDependencyRuntimeClosureBound: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    evidenceToolingSnapshot: {
      graphId: "hakimi.ziwei.same-artifact-evidence-tooling/1",
      digestAlgorithm: "sha256-file-tree-v1",
      fileCount: evidenceToolFiles.length,
      files: evidenceToolFiles,
      graphDigest: evidenceToolGraphDigest,
      prePostEndpointDigestEqual: true,
      completeNodePlaywrightViteRuntimeClosureBound: false,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    },
    e2eAssertionContract: inspectWorkspaceE2eAssertionContract(workspaceRoot),
    formalContext: {
      bindings: currentFormalContext(workspaceRoot),
      centralAdmissionModifiedByThisChild: false,
      domainManifestModifiedByThisChild: false,
      parentAuthorityRaisedByThisChild: false
    },
    runtimeObservation: runtime,
    browserEvidenceBoundary: {
      exactSingleBuildExecuted: true,
      sameOutputTreeServedToBothBrowsers: true,
      exactBrowserVersionsObservedBeforeAndAfterMatrix: true,
      edgeScenarioOutcomes: 14,
      chromeScenarioOutcomes: 14,
      totalPassedScenarioOutcomes: 28,
      isolatedLoopbackBrowserRuntimeObservationEstablished: true,
      productionBrowserRuntimeEvidenceEstablished: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false,
      fixedPhysicalDeviceValidated: false
    },
    storageBackupRecoveryBoundary: {
      isolatedDatabaseName: "hakimi-ziwei-browser-workspace-draft",
      isolatedDatabaseVersion: 1,
      scenarioAssertionsPassedPerBrowser: 14,
      fullStorageSnapshotComparisonScenariosPerBrowser: 2,
      visibleOrScenarioSpecificAssertionsPerBrowser: 12,
      completeStorageValueCoverageAcrossAllScenarios: false,
      fullStorageValuesIncludedInChild: false,
      recordIdentifiersIncludedInChild: false,
      personalOrDerivedDigestsIncludedInChild: false,
      projectSchema13MutationEpochAvailable: false,
      projectSchema13MutationEpochReceipt: null,
      isolatedWorkspaceMutationEpochScenariosObserved: true,
      externalMonotonicAnchorEstablished: false,
      completeAbaResistanceEstablished: false,
      productionBackupRecoveryCertified: false
    },
    highRiskBoundary: {
      registeredSurfaceCount: 16,
      enumeratedFeedbackAndProjectionBrowserScenariosPassed: true,
      rawTemplateOrDownloadEgressClosureEstablished: false,
      candidateCallSitesWiredToGate: false,
      semanticCoverageComplete: false,
      generalCallGraphClosureEstablished: false,
      highRiskPolicyGateSatisfied: false
    },
    sourceRightsExpertBoundary: {
      bindingsRequired: 27,
      bindingFrozenVerified: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false
    },
    formalReceiptCounts: {
      releaseEvidenceReceipts: 0,
      productionBrowserReceipts: 0,
      deploymentReceipts: 0,
      rollbackReceipts: 0,
      expertReviewReceipts: 0,
      rightsLegalDecisionReceipts: 0
    },
    evidenceAccounts: [
      { accountId: "engineering_evidence", state: "current_single_build_dual_browser_matrix_mechanically_observed" },
      { accountId: "browser_runtime_evidence", state: "isolated_loopback_current_output_tree_only" },
      { accountId: "content_truth", state: "not_established" },
      { accountId: "expert_truth", state: "not_established" },
      { accountId: "rights_legal_judgment", state: "not_established" },
      { accountId: "release_readiness", state: "not_ready" },
      { accountId: "public_release_authorization", state: "not_authorized" }
    ],
    authorityBoundary: {
      formalAdmissionAuthorized: false,
      domainAuthorityAuthorized: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      expertClaimsAuthorized: false
    },
    observationBoundary: {
      outputTreePrePostDigestEqual: true,
      repositoryCrossFileAtomicSnapshot: false,
      repositoryIntervalMutationExcluded: false,
      repositoryAbaExcluded: false,
      digestIsDigitalSignature: false,
      signerIdentityEstablished: false,
      toolAttestationEstablished: false,
      historicalRuntimeCanBeReverifiedFromCandidateAlone: false
    },
    doesNotEstablish: [
      "domain_or_content_truth",
      "expert_identity_qualification_independence_or_truth",
      "source_binding_freeze_or_source_bundle_completion",
      "work_edition_carrier_rights_or_redistribution_authorization",
      "raw_template_or_download_high_risk_egress_closure",
      "semantic_or_general_callgraph_high_risk_coverage",
      "repository_cross_file_atomicity_interval_integrity_or_aba_exclusion",
      "project_schema13_mutation_epoch_availability",
      "pwa_service_worker_public_host_or_fixed_physical_device_validation",
      "production_backup_recovery_certification",
      "release_evidence_completion_release_readiness_or_public_release_authorization"
    ]
  };
  return Object.freeze({ ...candidate, observationDigest: computeCandidateDigest(candidate) });
}

export function verifyZiweiSameArtifactCandidateObject(candidate) {
  exactKeys(candidate, [
    "schemaVersion", "recordType", "childId", "status", "createdAt", "systemIdentity",
    "buildSourceSnapshot", "evidenceToolingSnapshot", "formalContext", "runtimeObservation",
    "e2eAssertionContract",
    "browserEvidenceBoundary", "storageBackupRecoveryBoundary", "highRiskBoundary",
    "sourceRightsExpertBoundary", "formalReceiptCounts", "evidenceAccounts", "authorityBoundary",
    "observationBoundary", "doesNotEstablish", "observationDigest"
  ], "candidate");
  if (candidate.schemaVersion !== ZIWEI_SAME_ARTIFACT_SCHEMA_VERSION
      || candidate.recordType !== "ziwei_same_artifact_edge_chrome_browser_observation_child"
      || candidate.childId !== ZIWEI_SAME_ARTIFACT_CHILD_ID
      || candidate.status !== "isolated_engineering_browser_observation_only_not_admitted"
      || candidate.observationDigest !== computeCandidateDigest(candidate)) {
    fail("CANDIDATE_IDENTITY_INVALID", "candidate identity or digest invalid");
  }
  if (!Object.values(candidate.authorityBoundary).every((value) => value === false)
      || !Object.values(candidate.formalReceiptCounts).every((value) => value === 0)
      || candidate.formalContext.centralAdmissionModifiedByThisChild !== false
      || candidate.formalContext.domainManifestModifiedByThisChild !== false
      || candidate.formalContext.parentAuthorityRaisedByThisChild !== false) {
    fail("AUTHORITY_PROMOTION", "candidate raises authority");
  }
  normalizeRuntimeObservation(candidate.runtimeObservation);
  if (candidate.browserEvidenceBoundary.totalPassedScenarioOutcomes !== 28
      || candidate.browserEvidenceBoundary.productionBrowserRuntimeEvidenceEstablished !== false
      || candidate.storageBackupRecoveryBoundary.projectSchema13MutationEpochAvailable !== false
      || candidate.storageBackupRecoveryBoundary.projectSchema13MutationEpochReceipt !== null
      || candidate.storageBackupRecoveryBoundary.fullStorageSnapshotComparisonScenariosPerBrowser !== 2
      || candidate.storageBackupRecoveryBoundary.visibleOrScenarioSpecificAssertionsPerBrowser !== 12
      || candidate.storageBackupRecoveryBoundary.completeStorageValueCoverageAcrossAllScenarios !== false
      || candidate.highRiskBoundary.candidateCallSitesWiredToGate !== false
      || candidate.highRiskBoundary.semanticCoverageComplete !== false
      || candidate.sourceRightsExpertBoundary.bindingFrozenVerified !== 0
      || candidate.sourceRightsExpertBoundary.independentExpertReviewsVerified !== 0) {
    fail("BOUNDARY_PROMOTION", "candidate crosses a fixed red boundary");
  }
  return candidate;
}

export function serializeZiweiSameArtifactCandidate(candidate) {
  verifyZiweiSameArtifactCandidateObject(candidate);
  return `${JSON.stringify(candidate, null, 2)}\n`;
}

export function loadZiweiSameArtifactCandidate(workspaceRoot) {
  const bytes = readWorkspaceFileStable(workspaceRoot, ZIWEI_SAME_ARTIFACT_CANDIDATE_PATH, MAX_CANDIDATE_BYTES);
  let candidate;
  try { candidate = JSON.parse(bytes.toString("utf8")); }
  catch { fail("CANDIDATE_JSON_INVALID", "candidate is not valid JSON"); }
  verifyZiweiSameArtifactCandidateObject(candidate);
  const current = buildCurrentZiweiSameArtifactCandidate(
    workspaceRoot,
    candidate.runtimeObservation,
    candidate.createdAt
  );
  if (canonicalStringify(candidate) !== canonicalStringify(current)) {
    fail("CANDIDATE_CURRENT_MISMATCH", "candidate no longer matches current source/tool/context endpoints");
  }
  return Object.freeze({
    candidate,
    rawBytes: bytes.byteLength,
    rawSha256: sha256Bytes(bytes),
    observationDigest: candidate.observationDigest
  });
}

export const ziweiSameArtifactObservationTestOnly = Object.freeze({
  BUILD_SOURCE_PATHS,
  EVIDENCE_TOOL_PATHS,
  FORMAL_CONTEXT_PATHS,
  computeCandidateDigest,
  normalizeRuntimeObservation,
  normalizePlaywrightSummary,
  inspectWorkspaceE2eAssertionContract,
  verifyZiweiSameArtifactCandidateObject
});
