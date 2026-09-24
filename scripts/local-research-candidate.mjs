import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { LOCAL_RESEARCH_CANDIDATE as LOCAL_RESEARCH_RELEASE, createLocalPackageTools } from "./local-research-package-lib.mjs";
const { installLocalPackage, packageFixedLocalArtifact, probeLocalPackage,
  startLocalPackageServer, verifyLocalPackage } = createLocalPackageTools(LOCAL_RESEARCH_RELEASE);

let failureLogPath = null;
async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const allowed = {
    package: ["--artifact-workspace", "--output"], verify: ["--package-root"],
    install: ["--package-root", "--destination"], probe: ["--package-root"],
    serve: ["--package-root", "--log-root"]
  }[command];
  if (!allowed || rest.length !== allowed.length * 2) throw new Error("Usage: package --artifact-workspace ROOT --output NEW_DIR | verify/probe/serve --package-root ROOT | install --package-root ROOT --destination NEW_DIR");
  const values = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!allowed.includes(rest[i]) || values[rest[i]] !== undefined || !rest[i + 1]) throw new Error("Unexpected or duplicate argument.");
    values[rest[i]] = path.resolve(rest[i + 1]);
  }
  if (process.versions.node !== LOCAL_RESEARCH_RELEASE.nodeVersion) throw new Error(`Use the documented Node.js ${LOCAL_RESEARCH_RELEASE.nodeVersion} runtime; no runtime is installed automatically.`);
  let result;
  if (command === "package") result = await packageFixedLocalArtifact({ artifactWorkspace: values["--artifact-workspace"], outputDirectory: values["--output"] });
  if (command === "verify") {
    const verified = await verifyLocalPackage(values["--package-root"]);
    result = { packageRoot: verified.packageRoot, manifestSha256: verified.manifestSha256, release: LOCAL_RESEARCH_RELEASE };
  }
  if (command === "install") result = await installLocalPackage({ packageRoot: values["--package-root"], destination: values["--destination"] });
  if (command === "probe") { result = await probeLocalPackage(values["--package-root"]); process.exitCode = result.state === "matching" ? 0 : result.state === "stopped" ? 2 : 1; }
  if (command === "serve") {
    const verified = await verifyLocalPackage(values["--package-root"]);
    const logRoot = await realpath(values["--log-root"]);
    const relative = path.relative(verified.packageRoot, logRoot);
    if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) throw new Error("Server logs must be outside the package.");
    failureLogPath = path.join(logRoot, "server-failure.json");
    const running = await startLocalPackageServer(values["--package-root"]);
    result = { origin: running.origin, pid: process.pid, release: running.release, rebuilt: false };
    // The server owns its log files instead of inheriting redirected launcher
    // streams, so a long-lived preview cannot hold a caller's output pipe open.
    try {
      writeFileSync(path.join(logRoot, "server-startup.json"), `${JSON.stringify(result)}\n`, { flag: "wx" });
    } catch (error) {
      await new Promise((resolve) => running.server.close(resolve));
      throw error;
    }
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (failureLogPath) {
      try { writeFileSync(failureLogPath, `${JSON.stringify({ error: error.message })}\n`, { flag: "wx" }); } catch { /* Keep the first failure log. */ }
    }
    process.stderr.write(`${error.message}\n`); process.exitCode = 1;
  });
}
