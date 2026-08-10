import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import moment from "moment-timezone";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "../../..");
const lockPath = path.resolve(workspaceRoot, "package-lock.json");

const EXPECTED = Object.freeze([
  Object.freeze({
    role: "active",
    packageDirectory: "moment-timezone",
    packageVersion: "0.6.3",
    ianaVersion: "2026c",
    artifactSha256: "43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81",
    packageIntegrity: "sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg==",
    zoneCount: 340,
    linkCount: 257
  }),
  Object.freeze({
    role: "retained",
    packageDirectory: "moment-timezone-2025b",
    packageVersion: "0.5.48",
    ianaVersion: "2025b",
    artifactSha256: "b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425",
    packageIntegrity: "sha512-f22b8LV1gbTO2ms2j2z13MuPogNoh5UzxL3nzNAYKGraILnbGc9NEE6dyiiiLv46DGRb8A4kg8UKWLjPthxBHw==",
    zoneCount: 340,
    linkCount: 257
  })
]);

function fail(message) {
  throw new Error(`TZDB release gate failed: ${message}`);
}

function verifyOneArtifact(expected, lock) {
  const packageRoot = path.resolve(workspaceRoot, "node_modules", expected.packageDirectory);
  const artifactPath = path.resolve(packageRoot, "data/packed/latest.json");
  const packagePath = path.resolve(packageRoot, "package.json");
  const artifactBytes = readFileSync(artifactPath);
  const artifact = JSON.parse(artifactBytes.toString("utf8"));
  const packageManifest = JSON.parse(readFileSync(packagePath, "utf8"));
  const lockEntry = lock.packages?.[`node_modules/${expected.packageDirectory}`];
  const actualSha256 = createHash("sha256").update(artifactBytes).digest("hex");

  if (packageManifest.name !== "moment-timezone" || packageManifest.version !== expected.packageVersion) {
    fail(`${expected.packageDirectory} expected moment-timezone@${expected.packageVersion}, got ${packageManifest.name}@${packageManifest.version}`);
  }
  if (artifact.version !== expected.ianaVersion) {
    fail(`${expected.packageDirectory} IANA release expected ${expected.ianaVersion}, got ${artifact.version}`);
  }
  if (actualSha256 !== expected.artifactSha256) {
    fail(`${expected.packageDirectory} packed data SHA-256 expected ${expected.artifactSha256}, got ${actualSha256}`);
  }
  if (lockEntry?.version !== expected.packageVersion || lockEntry?.integrity !== expected.packageIntegrity) {
    fail(`${expected.packageDirectory} package-lock identity/integrity does not match the reviewed dependency tarball`);
  }
  if (
    !Array.isArray(artifact.zones) || artifact.zones.length !== expected.zoneCount ||
    !Array.isArray(artifact.links) || artifact.links.length !== expected.linkCount
  ) {
    fail(`${expected.packageDirectory} is missing the reviewed full Zone/Link payload`);
  }

  return {
    role: expected.role,
    packageDirectory: expected.packageDirectory,
    package: `moment-timezone@${packageManifest.version}`,
    ianaVersion: artifact.version,
    artifactSha256: actualSha256,
    byteLength: artifactBytes.byteLength,
    zoneCount: artifact.zones.length,
    linkCount: artifact.links.length,
    data: artifact
  };
}

function zoneOffsetSeconds(artifact, zoneName, epochMilliseconds) {
  const packed = artifact.zones.find((entry) => entry.startsWith(`${zoneName}|`));
  if (!packed) fail(`${artifact.version} is missing behavior sentinel zone ${zoneName}`);
  const zone = moment.tz.unpack(packed);
  let index = zone.untils.findIndex((until) => epochMilliseconds < until);
  if (index < 0) index = zone.offsets.length - 1;
  return -zone.offsets[index] * 60;
}

export function verifyTzdbArtifact() {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const verified = EXPECTED.map((expected) => verifyOneArtifact(expected, lock));
  const active = verified.find((entry) => entry.role === "active");
  const retained = verified.find((entry) => entry.role === "retained");
  const behaviorInstant = Date.parse("2026-10-01T00:00:00Z");
  const activeOffsetSeconds = zoneOffsetSeconds(active.data, "Africa/Casablanca", behaviorInstant);
  const retainedOffsetSeconds = zoneOffsetSeconds(retained.data, "Africa/Casablanca", behaviorInstant);
  if (activeOffsetSeconds !== 0 || retainedOffsetSeconds !== 3_600) {
    fail(`reviewed 2025b→2026c behavior sentinel drifted: retained=${retainedOffsetSeconds}, active=${activeOffsetSeconds}`);
  }

  return {
    gate: "hakimi-tzdb-artifact-registry-v2",
    status: "passed",
    artifacts: verified.map(({ data: _data, ...entry }) => entry),
    behaviorDifference: {
      timeZone: "Africa/Casablanca",
      instant: new Date(behaviorInstant).toISOString(),
      retainedIanaVersion: retained.ianaVersion,
      retainedOffsetSeconds,
      activeIanaVersion: active.ianaVersion,
      activeOffsetSeconds
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(verifyTzdbArtifact(), null, 2));
}
