import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactsRoot, nativeRoot, appId } from "./paths.mjs";
import { assertShellBoundary, verifyPayloadCopy } from "./payload.mjs";
import { inspectToolchain } from "./doctor.mjs";

const expectedConfig = await assertShellBoundary();
const toolchain = inspectToolchain();
if (toolchain.status !== "TOOLCHAIN_READY") throw new Error(`Android tools are incomplete. Run doctor first. Missing: ${Object.entries(toolchain.checks).filter(([, ready]) => !ready).map(([name]) => name).join(", ")}`);
const identity = JSON.parse(await readFile(path.join(artifactsRoot, "prepared-payload.json"), "utf8"));
if (identity.appId !== appId || identity.scope !== "internal-engineering-only") throw new Error("Prepared internal payload identity is invalid.");
const publicAssets = path.join(nativeRoot, "app/src/main/assets/public");
await verifyPayloadCopy(publicAssets, identity.files);
const copiedConfig = JSON.parse(await readFile(path.join(nativeRoot, "app/src/main/assets/capacitor.config.json"), "utf8"));
if (JSON.stringify(copiedConfig) !== JSON.stringify(expectedConfig)) throw new Error("Native config changed after the guarded sync.");
const copiedIdentity = JSON.parse(await readFile(path.join(publicAssets, "android-internal-build.json"), "utf8"));
if (JSON.stringify(copiedIdentity) !== JSON.stringify(identity)) throw new Error("Copied Web identity changed after the guarded sync.");
const versionProperties = await readFile(path.join(nativeRoot, "internal-version.properties"), "utf8");
if (!versionProperties.includes(`webBuildVersion=${identity.web.buildVersion}\n`) || !versionProperties.includes(`versionName=0.1.0-internal.${identity.web.buildVersion}\n`)) throw new Error("Native version no longer identifies the prepared Web build.");
execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "gradlew.bat --no-daemon --max-workers=2 :app:assembleDebug"], {
  cwd: nativeRoot,
  stdio: "inherit",
  env: { ...process.env, JAVA_HOME: toolchain.locations.java, ANDROID_HOME: toolchain.locations.sdk, ANDROID_SDK_ROOT: toolchain.locations.sdk, GRADLE_USER_HOME: toolchain.locations.gradleCache }
});
const source = path.join(nativeRoot, "app/build/outputs/apk/debug/app-debug.apk");
const bytes = await readFile(source);
const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
await mkdir(artifactsRoot, { recursive: true });
const inspected = path.join(artifactsRoot, `apk-inspection-${timestamp}`);
await mkdir(inspected);
execFileSync(path.join(toolchain.locations.java, "bin/jar.exe"), ["xf", source, "assets/public"], { cwd: inspected, stdio: "inherit" });
await verifyPayloadCopy(path.join(inspected, "assets/public"), identity.files);
const packagedIdentity = JSON.parse(await readFile(path.join(inspected, "assets/public/android-internal-build.json"), "utf8"));
if (JSON.stringify(packagedIdentity) !== JSON.stringify(identity)) throw new Error("Compiled APK identity differs from the prepared Web payload.");
const apk = path.join(artifactsRoot, `hakimi-bazi-internal-${identity.web.buildVersion}-${timestamp}.apk`);
await copyFile(source, apk);
const receipt = { status: "APK_COMPILED_NOT_DEVICE_VALIDATED", appId, webBuildVersion: identity.web.buildVersion, apk, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), builtAt: new Date().toISOString(), packagedWebFilesVerified: identity.files.length, deviceValidation: "NOT_RUN", installPerformed: false };
await writeFile(`${apk}.json`, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
