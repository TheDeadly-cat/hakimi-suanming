import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { toolchainPaths } from "./paths.mjs";

export function inspectToolchain() {
  const locations = toolchainPaths();
  const javaExe = path.join(locations.java, "bin/java.exe");
  let javaVersion = null;
  if (existsSync(javaExe)) {
    try {
      javaVersion = execFileSync(javaExe, ["-version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      javaVersion = String(error.stderr ?? error.message);
    }
    // java -version prints to stderr even on success; javac gives a simple stdout version.
    try { javaVersion = execFileSync(path.join(locations.java, "bin/javac.exe"), ["-version"], { encoding: "utf8" }).trim(); } catch { /* retain diagnostic */ }
  }
  const checks = {
    jdk21: /^javac 21\./.test(javaVersion ?? ""),
    android36: existsSync(path.join(locations.sdk, "platforms/android-36/android.jar")),
    buildTools35: existsSync(path.join(locations.sdk, "build-tools/35.0.0/aapt2.exe")),
    androidSdkLicensePresent: existsSync(path.join(locations.sdk, "licenses/android-sdk-license")),
    adb: existsSync(path.join(locations.sdk, "platform-tools/adb.exe"))
  };
  return { status: Object.values(checks).every(Boolean) ? "TOOLCHAIN_READY" : "TOOLCHAIN_INCOMPLETE", locations, javaVersion, checks, deviceValidation: "NOT_RUN" };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = inspectToolchain();
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "TOOLCHAIN_READY") process.exitCode = 2;
}
