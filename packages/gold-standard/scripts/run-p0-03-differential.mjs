import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const mode = process.argv[2] ?? "--check";
if (mode !== "--check" && mode !== "--write") {
  process.stderr.write("只支持 --check 或显式 --write；普通检查不会改写冻结工程报告。\n");
  process.exit(2);
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(packageRoot, "../..");
const reportPath = path.join(packageRoot, "reports", "p0-03-engineering-diagnostic.v1.json");
const summaryPath = path.join(packageRoot, "reports", "p0-03-engineering-diagnostic-summary.v1.json");
const powershellScript = path.join(packageRoot, "scripts", "run-p0-03-calendar-dotnet.ps1");
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-p003-"));
const externalInputPath = path.join(temporaryRoot, "calendar-input.json");
const externalObservationPath = path.join(temporaryRoot, "calendar-observations.json");
const server = await createServer({
  root: workspaceRoot,
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true }
});

function expectedCalendar(diagnostic) {
  if (diagnostic?.status !== "deterministic" || diagnostic.firstPass.status !== "calculated") return null;
  const calendar = diagnostic.firstPass.coreResult.calendar;
  return {
    lunarDate: `${calendar.lunarYear}-${String(Math.abs(calendar.lunarMonth)).padStart(2, "0")}-${String(calendar.lunarDay).padStart(2, "0")}`,
    lunarLeapMonth: calendar.isLeapMonth
  };
}

function classifyExternalResults(rawObservations, internalDiagnostic) {
  const internalById = new Map(internalDiagnostic.payload.cases.map((item) => [item.caseId, item]));
  return rawObservations.results.map((observation) => {
    if (observation.status === "unsupported") return observation;
    if (observation.status !== "observation") {
      throw new Error(`.NET 返回了未知结果分类：${String(observation.status)}`);
    }
    const expected = expectedCalendar(internalById.get(observation.caseId));
    if (!expected) {
      return {
        caseId: observation.caseId,
        status: "unsupported",
        unsupportedCode: "invalid_input",
        reason: "本项目内部两遍诊断没有得到可比较的确定历法参考；外部观测未被冒充为匹配。"
      };
    }
    const mismatchFields = [];
    if (expected.lunarDate !== observation.observedCalendar.lunarDate) mismatchFields.push("lunar_date");
    if (expected.lunarLeapMonth !== observation.observedCalendar.lunarLeapMonth) mismatchFields.push("lunar_leap_month");
    if (mismatchFields.length === 0) {
      return {
        caseId: observation.caseId,
        status: "matched",
        observedCalendar: observation.observedCalendar
      };
    }
    return {
      caseId: observation.caseId,
      status: "mismatch",
      observedCalendar: observation.observedCalendar,
      mismatchFields,
      differenceClass: "unresolved_calendar_table_difference",
      explanation: `独立 .NET 历法观测与当前适配器在 ${mismatchFields.join(", ")} 字段不同。`
    };
  });
}

try {
  process.stdout.write("[1/5] 生成固定种子 20,000 例并执行两遍内部排盘…\n");
  const differential = await server.ssrLoadModule("/packages/gold-standard/src/p0-03-differential.ts");
  const reportModule = await server.ssrLoadModule("/packages/gold-standard/src/p0-03-report.ts");
  const generatedCases = differential.generateP003DifferentialCases();
  const internalDiagnostic = await differential.runP003DeterminismDiagnostic({
    cases: generatedCases,
    concurrency: 16
  });

  process.stdout.write("[2/5] 生成内容寻址的公历→农历独立差分批次…\n");
  const externalInput = await differential.createP003ExternalDifferentialInputEnvelope({
    cases: generatedCases,
    batchId: "p003-dotnet-calendar-20000-v1"
  });
  await writeFile(
    externalInputPath,
    differential.serializeP003ExternalDifferentialInput(externalInput),
    "utf8"
  );

  process.stdout.write("[3/5] 使用本机 .NET ChineseLunisolarCalendar 逐例观测…\n");
  const powershell = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", powershellScript,
      "-InputPath", externalInputPath,
      "-OutputPath", externalObservationPath
    ],
    { cwd: workspaceRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
  if (powershell.error) throw powershell.error;
  if (powershell.status !== 0) {
    throw new Error(`.NET 历法差分进程失败（exit ${powershell.status}）：${powershell.stderr || powershell.stdout}`);
  }
  const rawObservations = JSON.parse(await readFile(externalObservationPath, "utf8"));
  const classifiedResults = classifyExternalResults(rawObservations, internalDiagnostic);
  const externalResult = await differential.createP003ExternalDifferentialResultEnvelope({
    input: externalInput,
    tool: rawObservations.tool,
    results: classifiedResults
  });

  process.stdout.write("[4/5] 失败关闭预检并生成紧凑、内容寻址报告…\n");
  const report = await reportModule.createP003EngineeringReport({
    internalDiagnostic,
    externalInput,
    externalResult
  });
  await reportModule.preflightP003EngineeringReport(report);
  const serialized = reportModule.serializeP003EngineeringReport(report);
  const differenceExceptions = report.payload.calendarIndependentDifferential.exceptions
    .filter((item) => item.status === "mismatch");
  const summary = {
    format: "hakimi-p0-03-engineering-diagnostic-summary",
    formatVersion: "1.0.0",
    classification: report.payload.classification,
    reportDigest: report.digest,
    internalDeterminism: report.payload.internalDeterminism.counts,
    calendarIndependentDifferential: {
      ...report.payload.calendarIndependentDifferential.counts,
      differenceCaseIds: differenceExceptions.map((item) => item.input.caseId),
      differenceYears: [...new Set(differenceExceptions.map((item) => item.input.date.slice(0, 4)))],
      differenceClass: differenceExceptions.length === 0
        ? null
        : "unresolved_calendar_table_difference"
    },
    releaseBoundary: report.payload.releaseBoundary
  };
  const serializedSummary = `${JSON.stringify(summary, null, 2)}\n`;

  if (mode === "--write") {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, serialized, "utf8");
    await writeFile(summaryPath, serializedSummary, "utf8");
    process.stdout.write(`[5/5] 已写入 ${reportPath}\n`);
  } else {
    let frozen;
    try {
      frozen = await readFile(reportPath, "utf8");
    } catch (error) {
      if (error && error.code === "ENOENT") {
        throw new Error("冻结工程报告不存在；审核实现后显式运行 npm run update:p0-03:differential。 ");
      }
      throw error;
    }
    await reportModule.preflightP003EngineeringReport(frozen);
    if (Buffer.compare(Buffer.from(frozen, "utf8"), Buffer.from(serialized, "utf8")) !== 0) {
      throw new Error("当前 20,000 例复跑结果与冻结工程报告不同；请先调查差异，不能自动覆盖。 ");
    }
    const frozenSummary = await readFile(summaryPath, "utf8");
    if (Buffer.compare(Buffer.from(frozenSummary, "utf8"), Buffer.from(serializedSummary, "utf8")) !== 0) {
      throw new Error("冻结工程报告摘要与当前完整报告不一致；请先调查差异，不能自动覆盖。 ");
    }
    process.stdout.write("[5/5] 当前复跑与冻结工程报告字节级一致。\n");
  }

  process.stdout.write(`${JSON.stringify({
    reportDigest: report.digest,
    internalDeterminism: report.payload.internalDeterminism.counts,
    calendarIndependentDifferential: report.payload.calendarIndependentDifferential.counts,
    countsAsVerifiedGold: false,
    verifiedGoldDelta: 0,
    fullP003GatePassed: false
  })}\n`);
} finally {
  await server.close();
  const resolvedTemporaryRoot = path.resolve(temporaryRoot);
  const resolvedOsTemp = path.resolve(os.tmpdir());
  if (
    resolvedTemporaryRoot.startsWith(`${resolvedOsTemp}${path.sep}`)
    && path.basename(resolvedTemporaryRoot).startsWith("hakimi-p003-")
  ) {
    await rm(resolvedTemporaryRoot, { recursive: true, force: true });
  }
}
