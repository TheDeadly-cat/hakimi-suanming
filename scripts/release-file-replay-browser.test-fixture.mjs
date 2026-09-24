import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Shared only by synthetic file-consumer tests and their explicit --import
// children. Git, npm, Node and file readers still execute normally.
export function syntheticReplayBrowserSpawn(realSpawnSync, recordProbe = () => {}) {
 return (executable, args, options) => {
  const windowsMetadataProbe = executable === "powershell.exe"
    && typeof options?.env?.HAKIMI_BROWSER_VERSION_PATH === "string";
  const browserAlias = ["microsoft-edge", "msedge", "google-chrome", "chrome"].includes(executable);
  if (!windowsMetadataProbe && !browserAlias) return realSpawnSync(executable, args, options);
  let browser;
  if (windowsMetadataProbe) {
    assert.deepEqual(args, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
      "(Get-Item -LiteralPath $env:HAKIMI_BROWSER_VERSION_PATH).VersionInfo.ProductVersion"]);
    const binary = path.basename(options?.env?.HAKIMI_BROWSER_VERSION_PATH ?? "");
    browser = binary === "msedge.exe" ? "edge" : binary === "chrome.exe" ? "chrome" : null;
  } else {
    assert.deepEqual(args, ["--version"]);
    browser = ["microsoft-edge", "msedge"].includes(executable) ? "edge"
      : ["google-chrome", "chrome"].includes(executable) ? "chrome" : null;
  }
  assert.ok(browser, "Unexpected process in synthetic browser probe fixture");
  assert.equal(options?.timeout, 5_000);
  const product = browser === "edge" ? "Microsoft Edge" : "Google Chrome";
  const stdout = `${windowsMetadataProbe ? "" : product + " "}SYNTHETIC-file-replay\n`;
  recordProbe({ browser, executable, windowsMetadataProbe });
  return { status: 0, signal: null, stdout, stderr: "", output: [null, stdout, ""] };
 };
}

// An ordinary import only exposes the helper. Activation requires the exact
// explicit preload used by replayCommand, plus its owned synthetic source.
const preloadIndex = process.execArgv.indexOf("--import");
if (preloadIndex !== -1 && process.execArgv[preloadIndex + 1] === import.meta.url) {
  const entry = path.resolve(process.argv[1] ?? "");
  const generator = fileURLToPath(new URL("./generate-release-evidence.mjs", import.meta.url));
  const verifier = fileURLToPath(new URL("./verify-release-evidence.mjs", import.meta.url));
  assert.ok(entry === generator || entry === verifier,
    "Synthetic replay browser fixture requires a replay entry point");
  if (entry === generator) {
    assert.deepEqual(process.argv.slice(2).filter((value) => value !== "--allow-dirty"),
      ["--release-label", "SYNTHETIC-file-consumer-contract"],
      "Synthetic replay browser fixture requires the synthetic release label");
  } else {
    assert.equal(process.argv[2], "--output");
    assert.equal(process.argv.length, 4);
    assert.ok(["tmp/synthetic-formal.json", "dist/web/formal.json"].includes(process.argv[3]));
  }
  const sourceRoot = realpathSync(process.cwd());
  const ownedRoot = path.dirname(sourceRoot);
  assert.equal(path.dirname(ownedRoot), realpathSync(os.tmpdir()),
    "Synthetic replay browser fixture requires its owned test source root");
  assert.ok(path.basename(ownedRoot).startsWith("hfr-"));
  assert.equal(path.basename(sourceRoot), "source");
  assert.match(readFileSync(path.join(sourceRoot, "SYNTHETIC.txt"), "utf8"),
    /^SYNTHETIC (?:file replay contract\. No release commands or browsers ran\.|dirty diagnostic fixture\.)\n$/u);
  const probes = [];
  childProcess.spawnSync = syntheticReplayBrowserSpawn(childProcess.spawnSync, (probe) => probes.push(probe));
  syncBuiltinESMExports();
  if (entry === generator) process.once("exit", () => {
    writeFileSync(path.join(sourceRoot, "tmp/synthetic-browser-probes.json"),
      JSON.stringify(probes) + "\n", { flag: "wx" });
  });
}
