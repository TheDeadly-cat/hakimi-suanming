import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function readMeta(html, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = html.match(new RegExp(
    `<meta\\s+name=["']${escapedName}["']\\s+content=(["'])(.*?)\\1\\s*\\/?>`,
    "iu"
  ));
  if (!match?.[2]) throw new Error(`Built index is missing ${name} metadata.`);
  return decodeHtmlAttribute(match[2]);
}

function readWorkerJsonConstant(worker, constantName) {
  const escapedName = constantName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = worker.match(new RegExp(
    `const\\s+${escapedName}\\s*=\\s*(?:Object\\.freeze\\()?JSON\\.parse\\(("(?:\\\\.|[^"\\\\])*")\\)\\)?;`,
    "u"
  ));
  if (!match?.[1]) throw new Error(`Built worker is missing ${constantName}.`);
  return JSON.parse(JSON.parse(match[1]));
}

export async function verifyBuiltReleaseStorageManifest(outputDirectory) {
  const [html, worker, hostingHeaders] = await Promise.all([
    readFile(path.resolve(outputDirectory, "index.html"), "utf8"),
    readFile(path.resolve(outputDirectory, "sw.js"), "utf8"),
    readFile(path.resolve(outputDirectory, "_headers"), "utf8")
  ]);
  const descriptor = JSON.parse(readMeta(html, "hakimi-release-database"));
  const serializedManifest = readMeta(html, "hakimi-release-storage-manifest");
  const manifest = JSON.parse(serializedManifest);
  const injectedDigest = readMeta(html, "hakimi-release-storage-manifest-digest");
  const actualDigest = createHash("sha256").update(serializedManifest).digest("hex");
  const buildVersion = readMeta(html, "hakimi-build-version");
  const evidenceId = readMeta(html, "hakimi-release-evidence-id");
  const workerDescriptor = readWorkerJsonConstant(worker, "RELEASE_DATABASE");
  const workerBridgeDescriptor = readWorkerJsonConstant(worker, "LEGACY_BRIDGE_DATABASE");

  if (manifest.manifestVersion !== 1) throw new Error("Built storage manifest version is not 1.");
  if (JSON.stringify(manifest.database) !== JSON.stringify(descriptor)) {
    throw new Error("Built index descriptor and storage manifest disagree.");
  }
  if (JSON.stringify(workerDescriptor) !== JSON.stringify(descriptor)) {
    throw new Error("Built Service Worker descriptor and index descriptor disagree.");
  }
  if (descriptor.dbGeneration === "legacy-v13" && JSON.stringify(workerBridgeDescriptor) !== JSON.stringify(descriptor)) {
    throw new Error("Default v13 build does not share one bridge descriptor across index and worker.");
  }
  if (!Array.isArray(manifest.requiredStorageTables) || manifest.requiredStorageTables.length === 0) {
    throw new Error("Built storage manifest has no required storage tables.");
  }
  if (!Array.isArray(manifest.requiredStorageIndexes)) {
    throw new Error("Built storage manifest indexes are malformed.");
  }
  if (injectedDigest !== actualDigest) {
    throw new Error("Built storage manifest SHA-256 does not match its canonical bytes.");
  }
  if (!/^[a-f0-9]{12}$/u.test(buildVersion)) {
    throw new Error("Built cache generation is not a canonical 12-character digest.");
  }
  if (evidenceId !== "unbound-local-build" && !/^hre1-[a-f0-9]{32}$/u.test(evidenceId)) {
    throw new Error("Built release evidence ID is neither bound nor explicitly local-only.");
  }
  if (
    worker.includes("__RELEASE_DATABASE_DESCRIPTOR__") ||
    worker.includes("__BRIDGE_RELEASE_DATABASE_DESCRIPTOR__")
  ) {
    throw new Error("Built Service Worker retains a release descriptor placeholder.");
  }
  const requiredHostingHeaders = [
    "Content-Security-Policy-Report-Only:",
    "Referrer-Policy:",
    "X-Content-Type-Options:",
    "X-Frame-Options:",
    "Permissions-Policy:",
    "Cross-Origin-Opener-Policy:",
    "Strict-Transport-Security:"
  ];
  for (const header of requiredHostingHeaders) {
    if (!hostingHeaders.includes(header)) throw new Error(`Built hosting policy is missing ${header}`);
  }

  return Object.freeze({
    descriptor,
    manifestVersion: manifest.manifestVersion,
    requiredTableCount: manifest.requiredStorageTables.length,
    requiredIndexCount: manifest.requiredStorageIndexes.length,
    manifestDigest: actualDigest,
    buildVersion,
    evidenceId,
    evidenceBound: /^hre1-[a-f0-9]{32}$/u.test(evidenceId),
    hostingHeaderCount: requiredHostingHeaders.length
  });
}

const outputDirectory = path.resolve(process.argv[2] ?? "dist/web");
const result = await verifyBuiltReleaseStorageManifest(outputDirectory);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
