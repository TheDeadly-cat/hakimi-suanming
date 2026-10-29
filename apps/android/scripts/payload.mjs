import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { appId, toolingRoot, nativeRoot } from "./paths.mjs";

export async function payloadFiles(root, relative = "") {
  const files = [];
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Web payload cannot contain symbolic links: ${name}`);
    if (entry.isDirectory()) files.push(...await payloadFiles(root, name));
    else if (entry.isFile()) {
      const content = await readFile(path.join(root, name));
      files.push({ path: name, bytes: content.length, sha256: createHash("sha256").update(content).digest("hex") });
    } else throw new Error(`Unsupported web payload entry: ${name}`);
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, "en"));
}

export async function assertShellBoundary() {
  const config = JSON.parse(await readFile(path.join(toolingRoot, "capacitor.config.json"), "utf8"));
  if (config.appId !== appId || config.webDir !== "../www" || config.android?.path !== "../native") {
    throw new Error("Internal app identity or local payload location changed.");
  }
  if (config.server?.url || config.server?.allowNavigation?.length || config.server?.cleartext !== false
    || config.server?.hostname !== "localhost" || config.server?.androidScheme !== "https"
    || config.android?.resolveServiceWorkerRequests !== true || config.android?.allowMixedContent !== false) {
    throw new Error("Android must retain the local HTTPS origin and Service Worker resource interception.");
  }
  if (config.plugins?.CapacitorHttp?.enabled !== false || config.plugins?.CapacitorCookies?.enabled !== false) {
    throw new Error("Native HTTP and cookie overrides are outside this internal shell.");
  }
  const manifest = await readFile(path.join(nativeRoot, "app/src/main/AndroidManifest.xml"), "utf8");
  if (!manifest.includes('android:allowBackup="false"') || !manifest.includes('android:usesCleartextTraffic="false"')) {
    throw new Error("Internal Android backup/cleartext boundary changed.");
  }
  const gradle = await readFile(path.join(nativeRoot, "app/build.gradle"), "utf8");
  if (!gradle.includes(`applicationId "${appId}"`)) throw new Error("Native application ID changed.");
  return config;
}

export async function verifyPayloadCopy(root, expectedFiles) {
  for (const expected of expectedFiles) {
    const bytes = await readFile(path.join(root, expected.path));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== expected.bytes || digest !== expected.sha256) {
      throw new Error(`Packaged web payload changed: ${expected.path}`);
    }
  }
}
