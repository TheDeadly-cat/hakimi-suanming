import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as packages from "./local-research-package-lib.mjs";
import { requireSeparateOutput } from "./local-delivery-gate-lib.mjs";

const execute = promisify(execFile);
const [flag, packageFlag, input, outputFlag, destination, ...extra] = process.argv.slice(2);
const definition = {
  "--candidate": ["LOCAL_RESEARCH_CANDIDATE", "launch-local-candidate.ps1", "local-research-candidate.mjs"],
  "--event-index-candidate": ["LOCAL_RESEARCH_EVENT_INDEX_CANDIDATE", "launch-local-event-index-candidate.ps1", "local-research-event-index-candidate.mjs"],
  "--convergence-candidate": ["LOCAL_RESEARCH_CONVERGENCE_CANDIDATE", "launch-local-convergence-candidate.ps1", "local-research-convergence-candidate.mjs"],
  "--trial-candidate": ["LOCAL_RESEARCH_TRIAL_CANDIDATE", "launch-local-trial-candidate.ps1", "local-research-trial-candidate.mjs"],
  "--deep-reading-candidate": ["LOCAL_RESEARCH_DEEP_READING_CANDIDATE", "launch-local-deep-reading-candidate.ps1", "local-research-deep-reading-candidate.mjs"]
}[flag];
if (!definition || !packages[definition[0]] || packageFlag !== "--package-root" || outputFlag !== "--output" || !input || !destination || extra.length) {
  throw Error("Usage: node scripts/validate-local-launcher.mjs --candidate|--event-index-candidate|--convergence-candidate|--trial-candidate|--deep-reading-candidate --package-root REAL_PACKAGE --output NEW_EXTERNAL_DIRECTORY");
}
if (process.platform !== "win32") throw Error("Native launcher verification requires Windows.");
const originalRoot = path.resolve(input);
const output = path.resolve(destination);
requireSeparateOutput(originalRoot, output);
requireSeparateOutput(fileURLToPath(new URL("../", import.meta.url)), output);
const release = packages[definition[0]];
const originalTools = packages.createLocalPackageTools(release);
const original = await originalTools.verifyLocalPackage(originalRoot);
await mkdir(output, { recursive: false });
const fixture = path.join(output, "port-mapped-package");
const logRoot = path.join(output, "launcher-logs");
const browserLog = path.join(output, "intercepted-browser-requests.jsonl");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const reservation = createServer();
await new Promise((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
const port = reservation.address().port;
assert.ok(![5188, 5189, 5197, 5199, 5201].includes(port), "Native validation must use an isolated random port.");
await new Promise((resolve) => reservation.close(resolve));
await cp(originalRoot, fixture, { recursive: true, force: false, errorOnExist: true });
const origin = `http://127.0.0.1:${port}/`;
const adaptations = [];
const libraryPath = "scripts/local-research-package-lib.mjs";
const source = await readFile(path.join(fixture, libraryPath), "utf8");
const begin = source.indexOf(`export const ${definition[0]} = Object.freeze({`);
assert.notEqual(begin, -1);
const end = source.indexOf("});", begin) + 3;
const block = source.slice(begin, end);
assert.equal(block.split(release.origin).length - 1, 1);
const mapped = source.slice(0, begin) + block.replace(release.origin, origin) + source.slice(end);
await writeFile(path.join(fixture, libraryPath), mapped);
adaptations.push({ path: libraryPath, originalSha256: sha(Buffer.from(source)), fixtureSha256: sha(Buffer.from(mapped)) });
const trial = flag === "--trial-candidate";
const deepReading = flag === "--deep-reading-candidate";
const serviceOnly = flag === "--convergence-candidate" || trial || deepReading;
if (!serviceOnly) {
  const relative = "scripts/" + definition[1];
  const old = await readFile(path.join(fixture, relative), "utf8");
  assert.ok(old.includes("5189"));
  const mappedLauncher = old.replaceAll("5189", String(port));
  await writeFile(path.join(fixture, relative), mappedLauncher);
  adaptations.push({ path: relative, originalSha256: sha(Buffer.from(old)), fixtureSha256: sha(Buffer.from(mappedLauncher)) });
}
// Only this disposable transport fixture is re-manifested. Application, lock,
// original receipts and original package are never rewritten or re-signed.
const manifest = structuredClone(original.manifest);
manifest.release.origin = origin;
for (const entry of manifest.files) {
  const bytes = await readFile(path.join(fixture, entry.path));
  entry.size = bytes.length; entry.sha256 = sha(bytes);
}
await writeFile(path.join(fixture, "local-package-files.json"), JSON.stringify(manifest, null, 2) + "\n");
// The fixed CLI imports its own port-mapped release constant. Keep the factory's
// fixed-identity guard intact and avoid loading an arbitrary module in this process.
const fixtureCli = path.join(fixture, "scripts", definition[2]);
await execute(process.execPath, [fixtureCli, "verify", "--package-root", fixture], {
  windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024
});
const wrapper = path.join(output, "capture-browser.ps1");
// Intercept URL opens in the test process only. Real hidden Node child startup
// still uses the native cmdlet; no browser profile or actual browser is opened.
await writeFile(wrapper, `param([string]$Launcher,[string]$PackageRoot,[string]$LogRoot,[string]$BrowserLog,[switch]$OpenRequested,[switch]$Legacy)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
function Start-Process {
  param([string]$FilePath,[string[]]$ArgumentList,[string]$WorkingDirectory,[string]$WindowStyle,[switch]$PassThru)
  if ($FilePath -match '^https?://') {
    @{url=$FilePath} | ConvertTo-Json -Compress | Add-Content -LiteralPath $BrowserLog -Encoding UTF8
    return
  }
  if ($WindowStyle -ne "Hidden") { throw "The local background service must be started hidden." }
  Microsoft.PowerShell.Management\\Start-Process @PSBoundParameters
}
$launchArgs = @{PackageRoot=$PackageRoot;LogRoot=$LogRoot;NoDialogs=$true}
if ($Legacy) { if (-not $OpenRequested) { $launchArgs.NoBrowser=$true } }
elseif ($OpenRequested) { $launchArgs.OpenSystemBrowser=$true }
& $Launcher @launchArgs
if ($LASTEXITCODE) { exit $LASTEXITCODE }
`, { flag: "wx" });
const checks = [];
const commands = [];
let ownedPid = null;
let foreign = null;
let failure = null;
const browserRequests = async () => {
  try { return (await readFile(browserLog, "utf8")).replace(/^\uFEFF/u, "").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line.replace(/^\uFEFF/u, ""))); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
};
async function launch(name, open = false) {
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", wrapper,
    "-Launcher", path.join(fixture, "scripts", definition[1]), "-PackageRoot", fixture,
    "-LogRoot", logRoot, "-BrowserLog", browserLog, ...(serviceOnly ? [] : ["-Legacy"]), ...(open ? ["-OpenRequested"] : [])];
  const start = Date.now();
  let result;
  try { result = { ...(await execute("powershell.exe", args, { windowsHide: true, timeout: 90_000, maxBuffer: 1024 * 1024 })), code: 0 }; }
  catch (error) { result = { code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? error.message }; }
  await writeFile(path.join(output, name + ".stdout.log"), result.stdout, { flag: "wx" });
  await writeFile(path.join(output, name + ".stderr.log"), result.stderr, { flag: "wx" });
  commands.push({ name, executable: "powershell.exe", arguments: args, exitCode: result.code, elapsedMs: Date.now() - start });
  return result;
}
async function stopOwned() {
  if (ownedPid === null) return;
  assert.ok(Number.isSafeInteger(ownedPid) && ownedPid > 0);
  const result = await execute("powershell.exe", ["-NoProfile", "-Command",
    `Get-CimInstance Win32_Process -Filter "ProcessId = ${ownedPid}" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress`], { windowsHide: true });
  const info = JSON.parse(result.stdout);
  assert.equal(info.ProcessId, ownedPid);
  assert.ok(info.CommandLine.toLowerCase().includes(fixture.toLowerCase()), "Only the owned fixture server may be stopped.");
  process.kill(ownedPid); ownedPid = null;
  for (let i = 0; i < 50; i++) {
    try { await fetch(origin, { signal: AbortSignal.timeout(1000) }); }
    catch (error) { if (error.cause?.code === "ECONNREFUSED") return; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error("Owned isolated server did not stop.");
}
const record = (result) => JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1));
const passed = (name, evidence = null) => checks.push({ name, status: "passed", evidence });
try {
  const first = await launch("cold");
  assert.equal(first.code, 0, first.stderr);
  const start = record(first); ownedPid = start.listenerPid;
  assert.equal(start.started, true); assert.equal(start.origin, origin);
  assert.deepEqual(await browserRequests(), []);
  if (serviceOnly) {
    assert.equal(start.browserOpened, false); assert.equal(start.systemBrowserRequested, false);
    assert.equal(start.dataEntry, deepReading ? "independent-deep-reading-browser" : trial ? "independent-trial-browser" : "codex-in-app-browser"); assert.equal(start.browserDataShared, false);
    assert.match(start.guidance, /Codex/u); assert.match(start.guidance, /独立资料空间/u);
  }
  passed("isolated cold start preserves the selected browser data entry", { pid: ownedPid, defaultDoesNotOpenBrowser: true, legacyNoBrowser: !serviceOnly });
  const second = await launch("repeat");
  assert.equal(second.code, 0, second.stderr);
  assert.equal(record(second).started, false); assert.equal(record(second).listenerPid, ownedPid);
  assert.deepEqual(await browserRequests(), []);
  const probe = await execute(process.execPath, [fixtureCli, "probe", "--package-root", fixture], {
    windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024
  });
  assert.equal(JSON.parse(probe.stdout).state, "matching");
  passed("repeated launch verifies and reuses the same native service", { pid: ownedPid });
  const explicit = await launch("explicit-browser", true);
  assert.equal(explicit.code, 0, explicit.stderr);
  assert.deepEqual(await browserRequests(), [{ url: origin }]);
  if (serviceOnly) {
    assert.equal(record(explicit).systemBrowserRequested, true);
    assert.equal(record(explicit).browserOpened, true);
    assert.equal(record(explicit).browserDataShared, false);
  }
  passed("explicit system browser action is intercepted without opening a profile", { actualBrowserOpened: false });
  await stopOwned();
  foreign = createServer((_request, response) => response.end("synthetic foreign listener"));
  await new Promise((resolve, reject) => { foreign.once("error", reject); foreign.listen(port, "127.0.0.1", resolve); });
  const refused = await launch("foreign");
  assert.equal(refused.code, 1); assert.match(refused.stderr, /different or unverified service/u);
  assert.equal(await (await fetch(origin)).text(), "synthetic foreign listener");
  passed("unknown listener is refused and preserved without port fallback");
  foreign.closeAllConnections(); await new Promise((resolve) => foreign.close(resolve)); foreign = null;
  await writeFile(path.join(fixture, release.artifactRoot ?? "dist/web", "index.html"), "deliberate invalid fixture shell");
  const invalid = await launch("invalid");
  assert.equal(invalid.code, 1); assert.match(invalid.stderr, /verification|metadata|package did not pass/iu);
  await assert.rejects(fetch(origin, { signal: AbortSignal.timeout(3000) }), (error) => error.cause?.code === "ECONNREFUSED");
  passed("invalid package is refused before a listener starts");
} catch (error) { failure = error.stack; }
finally {
  try { await stopOwned(); } catch (error) { failure = [failure, error.stack].filter(Boolean).join("\n"); }
  if (foreign) { foreign.closeAllConnections(); await new Promise((resolve) => foreign.close(resolve)); }
}
let originalPackageUnchanged = false;
try {
  assert.equal((await originalTools.verifyLocalPackage(originalRoot)).manifestSha256, original.manifestSha256);
  originalPackageUnchanged = true;
  passed("original package remains byte-identical");
} catch (error) { failure = [failure, error.stack].filter(Boolean).join("\n"); }
const report = { at: new Date().toISOString(), port, adaptations, commands, checks, error: failure,
  passed: checks.length, failed: failure ? 1 : 0, complete: !failure && checks.length === 6,
  manifestSha256: original.manifestSha256, applicationBuild: release.buildVersion,
  originalPackageUnchanged, production5188Or5189Started: false, shortcutsChanged: false, browserDataTouched: false,
  scope: "Native Windows PowerShell on a disposable port-mapped package; URL launch intercepted; no production activation." };
await writeFile(path.join(output, "results.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ complete: report.complete, passed: report.passed, failed: report.failed, output, error: failure }));
process.exitCode = report.complete ? 0 : 1;
