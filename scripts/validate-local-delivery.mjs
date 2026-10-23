import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as packages from "./local-research-package-lib.mjs";
import { requireCompleteChecks, requireCompleteProbeTap, requireSeparateOutput, runRequiredStages } from "./local-delivery-gate-lib.mjs";

const execute = promisify(execFile);
const workspace = fileURLToPath(new URL("../", import.meta.url));
const [selectionFlag, packageFlag, input, outputFlag, destination, ...extra] = process.argv.slice(2);
const selection = { "--candidate": packages.LOCAL_RESEARCH_CANDIDATE,
  "--event-index-candidate": packages.LOCAL_RESEARCH_EVENT_INDEX_CANDIDATE,
  "--convergence-candidate": packages.LOCAL_RESEARCH_CONVERGENCE_CANDIDATE,
  "--trial-candidate": packages.LOCAL_RESEARCH_TRIAL_CANDIDATE,
  "--deep-reading-candidate": packages.LOCAL_RESEARCH_DEEP_READING_CANDIDATE }[selectionFlag];
if (!selection || packageFlag !== "--package-root" || outputFlag !== "--output" || !input || !destination || extra.length) {
  throw Error("Usage: node scripts/validate-local-delivery.mjs --candidate|--event-index-candidate|--convergence-candidate|--trial-candidate|--deep-reading-candidate --package-root REAL_PACKAGE --output NEW_EXTERNAL_DIRECTORY (selected build must be sealed)");
}
if (process.platform !== "win32") throw Error("The mandatory native launcher stage requires Windows; it must not be skipped.");
const packageRoot = path.resolve(input);
const output = path.resolve(destination);
requireSeparateOutput(packageRoot, output);
requireSeparateOutput(workspace, output);
const tools = packages.createLocalPackageTools(selection);
const original = await tools.verifyLocalPackage(packageRoot);
await mkdir(output, { recursive: false });
const commands = [];
async function run(name, arguments_) {
  const started = Date.now();
  let result;
  try { result = { ...(await execute(process.execPath, arguments_, { cwd: workspace, windowsHide: true, timeout: 300_000, maxBuffer: 8 * 1024 * 1024 })), code: 0 }; }
  catch (error) { result = { code: error.code ?? null, stdout: error.stdout ?? "", stderr: error.stderr ?? error.message, signal: error.signal ?? null }; }
  await writeFile(path.join(output, name + ".stdout.log"), result.stdout, { flag: "wx" });
  await writeFile(path.join(output, name + ".stderr.log"), result.stderr, { flag: "wx" });
  commands.push({ name, executable: process.execPath, arguments: arguments_, exitCode: result.code, signal: result.signal ?? null, elapsedMs: Date.now() - started });
  if (result.code !== 0) throw Error(`${name} failed with exit ${result.code}; later stages were blocked.`);
  return result;
}
const readReport = async (name) => JSON.parse((await readFile(path.join(output, name, "results.json"), "utf8")).replace(/^\uFEFF/u, ""));
let error = null;
try {
  await runRequiredStages([
    async () => {
      await run("installation", [path.join(workspace, "scripts/validate-local-installation.mjs"), selectionFlag, "--package-root", packageRoot, "--output", path.join(output, "installation")]);
      requireCompleteChecks(await readReport("installation"), 18, original.manifestSha256, "installation");
    },
    async () => {
      const probe = await run("probe", ["--test", "--test-reporter=tap", path.join(workspace, "scripts/local-research-probe.test.mjs")]);
      requireCompleteProbeTap(probe.stdout);
    },
    async () => {
      await run("launcher", [path.join(workspace, "scripts/validate-local-launcher.mjs"), selectionFlag, "--package-root", packageRoot, "--output", path.join(output, "launcher")]);
      requireCompleteChecks(await readReport("launcher"), 6, original.manifestSha256, "launcher");
    }
  ]);
} catch (caught) { error = caught.stack; }
try {
  const unchanged = await tools.verifyLocalPackage(packageRoot);
  if (unchanged.manifestSha256 !== original.manifestSha256) throw Error("Original package manifest changed during validation.");
} catch (caught) { error = [error, caught.stack].filter(Boolean).join("\n"); }
const report = { version: 1, at: new Date().toISOString(), status: error ? "failed" : "passed", error,
  packageRoot, manifestSha256: original.manifestSha256, selection, commands,
  requiredChecks: { installation: 18, probe: 6, launcher: 6 },
  scope: "Mandatory local package gate. Synthetic isolated paths and random ports only. Passing does not authorize installation, activation or public release." };
await writeFile(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: report.status, output, error }));
process.exitCode = error ? 1 : 0;
