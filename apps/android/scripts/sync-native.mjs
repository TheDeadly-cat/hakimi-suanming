import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { verifyBuiltReleaseStorageManifest } from "../../../scripts/verify-built-release-storage-manifest.mjs";
import { androidRoot, workspaceRoot, toolingRoot, nativeRoot, artifactsRoot, webRoot, appId } from "./paths.mjs";
import { assertShellBoundary, payloadFiles, verifyPayloadCopy } from "./payload.mjs";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--web-build" || !/^[a-f0-9]{12}$/.test(args[1])) {
  throw new Error("Usage: node apps/android/scripts/sync-native.mjs --web-build <verified 12-character Web build identity>");
}
await assertShellBoundary();
const source = path.join(workspaceRoot, "dist/web");
const verified = await verifyBuiltReleaseStorageManifest(source, { expectedChannel: "default-v13" });
if (verified.buildVersion !== args[1]) throw new Error(`Expected Web build ${args[1]}; found ${verified.buildVersion}. Rebuild or explicitly select the intended artifact.`);
const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const files = await payloadFiles(source);
const staging = path.join(androidRoot, `www-staging-${timestamp}`);
await mkdir(artifactsRoot, { recursive: true });
await cp(source, staging, { recursive: true, errorOnExist: true, force: false });
await verifyPayloadCopy(staging, files);
if (existsSync(webRoot)) await rename(webRoot, path.join(artifactsRoot, `previous-web-${timestamp}`));
await rename(staging, webRoot);
const identity = {
  formatVersion: 1,
  appId,
  preparedAt: new Date().toISOString(),
  capacitorVersion: "8.6.0",
  web: verified,
  sourceCommit: null,
  sourceCommitNote: "A Web bundle fingerprint identifies these bytes; preparation does not infer which commit built them.",
  files,
  scope: "internal-engineering-only",
  deviceValidation: "NOT_RUN"
};
await writeFile(path.join(webRoot, "android-internal-build.json"), JSON.stringify(identity, null, 2) + "\n");
await writeFile(path.join(nativeRoot, "internal-version.properties"), `webBuildVersion=${verified.buildVersion}\nversionCode=1\nversionName=0.1.0-internal.${verified.buildVersion}\n`);
execFileSync(process.execPath, [path.join(toolingRoot, "node_modules/@capacitor/cli/bin/capacitor"), "sync", "android"], { cwd: toolingRoot, stdio: "inherit" });
await verifyPayloadCopy(path.join(nativeRoot, "app/src/main/assets/public"), files);
const copiedConfig = JSON.parse(await readFile(path.join(nativeRoot, "app/src/main/assets/capacitor.config.json"), "utf8"));
if (copiedConfig.appId !== appId || copiedConfig.android?.resolveServiceWorkerRequests !== true) throw new Error("Copied native configuration differs from the guarded shell.");
await writeFile(path.join(artifactsRoot, "prepared-payload.json"), JSON.stringify(identity, null, 2) + "\n");
console.log(JSON.stringify({ status: "PREPARED_NOT_COMPILED", appId, webBuildVersion: verified.buildVersion, files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0), deviceValidation: "NOT_RUN" }, null, 2));
