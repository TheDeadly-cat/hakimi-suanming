import { mkdir, mkdtemp, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "node:test";
import { verifyNodeTestGroups } from "./verify-node-test-groups.mjs";

function projectError(error, depth = 0) {
  if (!error || typeof error !== "object") return String(error).slice(0, 4096);
  const projected = {};
  for (const key of ["name", "message", "code", "failureType", "exitCode", "signal", "stack"]) {
    const value = error[key];
    if (typeof value === "string") projected[key] = value.slice(0, key === "stack" ? 8192 : 4096);
    else if (value === null || typeof value === "number" || typeof value === "boolean") projected[key] = value;
  }
  if (error.cause !== undefined && depth < 2) projected.cause = projectError(error.cause, depth + 1);
  return projected;
}

// Ordinary test results, not a release receipt. Discovery does not authorize
// reading a restricted graph: callers must first review the selected group's scope.
export function completeGroupReport(report) {
  const missing = report.files.filter((file) => file.summary === null).map((file) => file.path);
  const counts = report.summary?.counts;
  const failed = report.error || report.summary?.success === false
    || report.files.some((file) => file.summary?.success === false);
  const incomplete = missing.length > 0 || !counts || counts.tests === 0
    || counts.skipped > 0 || counts.todo > 0 || counts.cancelled > 0;
  return { ...report, status: failed ? "failed" : incomplete ? "incomplete" : "passed",
    missingFileResults: missing, completedAt: new Date().toISOString() };
}

export async function runNodeTestGroup(workspaceRoot, groupId, { observe = () => {} } = {}) {
  const inventory = await verifyNodeTestGroups(workspaceRoot);
  const group = inventory.groups.find((item) => item.id === groupId);
  if (!group) throw new Error(`Unknown Node test group: ${groupId}`);
  const outputBase = path.resolve(workspaceRoot, "test-results/node-groups");
  await mkdir(outputBase, { recursive: true });
  const outputDirectory = await mkdtemp(path.join(outputBase, `${group.id}-`));
  const resultPath = path.join(outputDirectory, "results.json");
  const eventPath = path.join(outputDirectory, "events.jsonl");
  const relative = (file) => file ? path.relative(workspaceRoot, file).split(path.sep).join("/") : null;
  let report = {
    version: 1, group: group.id, nodeVersion: process.version, status: "running",
    startedAt: new Date().toISOString(), completedAt: null,
    discoveredRepositoryFiles: inventory.discoveredCount,
    selectedFiles: [...group.tests],
    files: group.tests.map((file) => ({ path: file, summary: null })),
    tests: [], summary: null, error: null
  };
  const persist = () => writeFile(resultPath, `${JSON.stringify(report, null, 2)}\n`);
  await persist();
  await writeFile(eventPath, "");
  try {
    const stream = run({
      files: group.tests.map((file) => path.resolve(workspaceRoot, file)),
      cwd: workspaceRoot, isolation: "process", concurrency: 2,
      execArgv: [], argv: [], only: false, watch: false, forceExit: false
    });
    for await (const event of stream) {
      const data = event.data;
      if (event.type === "test:pass" || event.type === "test:fail") {
        const outcome = data.skip ? "skipped" : data.todo ? "todo"
          : event.type === "test:pass" ? "passed" : "failed";
        const item = {
          file: relative(data.file), name: data.name, testId: data.testId,
          line: data.line, column: data.column, nesting: data.nesting,
          testType: data.details?.type, outcome, duration_ms: data.details?.duration_ms,
          ...(data.skip ? { reason: data.skip } : {}),
          ...(data.todo ? { reason: data.todo } : {}),
          ...(data.details?.error ? { error: data.details.error.message,
            failureType: data.details.error.failureType, errorDetails: projectError(data.details.error) } : {})
        };
        report.tests.push(item);
        await appendFile(eventPath, `${JSON.stringify({ type: event.type, ...item })}\n`);
      } else if (event.type === "test:summary") {
        const summary = { counts: data.counts, success: data.success, duration_ms: data.duration_ms };
        if (data.file) {
          const file = report.files.find((item) => item.path === relative(data.file));
          if (!file || file.summary !== null) throw new Error(`Unexpected or duplicate file summary: ${data.file}`);
          file.summary = summary;
          observe({ file: file.path, ...summary });
        } else {
          if (report.summary !== null) throw new Error("Duplicate final test summary.");
          report.summary = summary;
        }
        await appendFile(eventPath, `${JSON.stringify({ type: event.type, file: relative(data.file), ...summary })}\n`);
        await persist();
      } else if (event.type === "test:stdout" || event.type === "test:stderr" || event.type === "test:diagnostic") {
        await appendFile(eventPath, `${JSON.stringify({ type: event.type, file: relative(data.file), message: data.message })}\n`);
      }
    }
  } catch (error) {
    report.error = error.message;
  }
  report = completeGroupReport(report);
  await persist();
  return { report, resultPath, outputDirectory };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error("Usage: node scripts/run-node-test-group.mjs <group>");
    const result = await runNodeTestGroup(process.cwd(), process.argv[2], {
      observe: (file) => console.log(`${file.file}: ${JSON.stringify(file.counts)}`)
    });
    console.log(JSON.stringify({ group: result.report.group, status: result.report.status,
      selectedFiles: result.report.selectedFiles.length, counts: result.report.summary?.counts,
      missingFileResults: result.report.missingFileResults, error: result.report.error,
      resultPath: result.resultPath }, null, 2));
    process.exitCode = result.report.status === "passed" ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
