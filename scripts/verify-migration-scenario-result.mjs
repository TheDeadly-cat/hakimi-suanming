import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const historicalTitles = label => [
  `${label} 当前旧页明确拒绝自动前向接管，源数据与控制记录不变`,
  `${label} 所有旧页关闭后由浏览器自然激活，历史格式物化且源库不变`,
  `${label} 新页面直接启动验证真实容量准入、索引和持久提交`
];
// Reviewed identities, not a count inferred from whatever happened to run.
export const MIGRATION_SCENARIOS = Object.freeze({
  "cross-schema-upgrade": { projects: ["msedge"], titles: historicalTitles("v13-v14") },
  "cross-schema-v13-v15": { projects: ["msedge", "chrome"], titles: historicalTitles("v13-v15") },
  "cross-schema-v14-v15": { projects: ["msedge", "chrome"], titles: historicalTitles("v14-v15") },
  "orphaned-v13-recovery": { projects: ["msedge", "chrome"], titles: [
    "仅遗留精确 v13 数据库且无旧壳时，v15 只读救援并导出可预检 ZIP",
    "仅遗留精确 v13 数据库且无旧壳时，v16 只读救援并导出可预检 ZIP"
  ] },
  "cross-schema-v13-v16": { projects: ["msedge", "chrome"], titles: [
    "双旧 v13 页中一页已确认、另一页仍在万条慢审计时，新 v16 worker 接管后自动收敛",
    "首个 v16 试运行页在源冻结被慢旧页拖过时限后自动重试并完成收敛",
    "全新浏览器直接安装 v16 时从空 v13 建立完整目标并确认 clean epoch",
    "富 v13 数据直升 v16 后，业务写入变 dirty、全审计恢复 clean、再次启动命中 cache",
    "v16 冻结多个 v13 页的真实写入，提交后旧页只收敛到 v16",
    "v16 影子容量不足时保留 v13、目标零创建且不发送 BOOT_OK",
    "v16 目标启动校验失败时隔离影子库并保持 v13 可恢复",
    "v16 目标完整审计摘要不符时删除目标并保留 v13",
    "v16 Dexie 迁移事务中止时回滚 shadow、mutationState 不留下半代",
    "v16 control 已提交但 BOOT_OK 中断时保持写锁，刷新后 clean 收敛",
    "陈旧页面持有 v16 target versionchange 时超时失败关闭且不提交目标",
    "dirty v16 全审计期间并发受支持写入使 CAS 失败，随后全审计恢复并命中 clean cache",
    "v16 隔离受阻后同 migrationId 只清理不续跑，新 migrationId 可长期重发"
  ] }
});
for (const scenario of Object.values(MIGRATION_SCENARIOS)) {
  Object.freeze(scenario.projects);
  Object.freeze(scenario.titles);
  Object.freeze(scenario);
}

export function verifyMigrationScenarioResult(suite, report) {
  assert(Object.hasOwn(MIGRATION_SCENARIOS, suite), "Unknown migration suite");
  const expected = MIGRATION_SCENARIOS[suite];
  const count = expected.projects.length * expected.titles.length;
  assert.deepEqual(report.errors, [], "Run-level errors must be absent");
  assert.equal(report.config.forbidOnly, true, "Focused tests are forbidden");
  assert.deepEqual(report.config.projects.map(p => p.name).sort(), [...expected.projects].sort(), "Configured browsers changed");
  for (const project of report.config.projects) {
    assert.equal(project.retries, 0, "Retries must remain disabled");
    assert.equal(project.repeatEach, 1, "Each identity runs once");
  }
  for (const [key, value] of Object.entries({ expected: count, unexpected: 0, skipped: 0, flaky: 0 })) {
    assert.equal(report.stats[key], value, `Unexpected result count: ${key}`);
  }
  const tests = [];
  function collect(group) {
    for (const spec of group.specs ?? []) {
      for (const test of spec.tests) tests.push({ title: spec.title, test });
    }
    for (const child of group.suites ?? []) collect(child);
  }
  collect(report);
  const identities = tests.map(({ title, test }) => `${test.projectName}\0${title}`);
  const required = expected.projects.flatMap(project => expected.titles.map(title => `${project}\0${title}`));
  assert.deepEqual(identities.sort(), required.sort(), "Missing, duplicate, replaced or unexpected test identities");
  for (const { test } of tests) {
    assert.equal(test.expectedStatus, "passed", "Expected failures cannot satisfy this gate");
    assert.equal(test.status, "expected", "Every test must pass normally");
    assert.equal(test.results.length, 1, "Missing or repeated attempts");
    const result = test.results[0];
    assert.equal(result.status, "passed", "Skipped, interrupted or failed attempt");
    assert.equal(result.retry, 0, "Retried attempt");
    assert.deepEqual(result.errors, [], "Attempt-level errors must be absent");
  }
  return { suite, tests: count, projects: expected.projects, complete: true, formalReleaseEvidence: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [suite, filename, ...extra] = process.argv.slice(2);
    assert(suite && filename && extra.length === 0, "Usage: verify-migration-scenario-result.mjs <suite> <results.json>");
    const metadata = await stat(filename);
    assert(metadata.isFile() && metadata.size > 0 && metadata.size <= 32_000_000, "Invalid result file size");
    console.log("MIGRATION_SCENARIO_RESULT_OK", JSON.stringify(verifyMigrationScenarioResult(suite, JSON.parse(await readFile(filename, "utf8")))));
  } catch (error) {
    console.error("MIGRATION_SCENARIO_RESULT_INCOMPLETE", error.message);
    process.exitCode = 1;
  }
}
