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

export function inspectZoneAndLinkNameSet(artifact) {
  if (!artifact || typeof artifact !== "object" || !Array.isArray(artifact.zones) || !Array.isArray(artifact.links)) {
    fail("synthetic or reviewed artifact is missing Zone/Link arrays");
  }
  const zoneNames = new Set();
  for (const packedZone of artifact.zones) {
    if (typeof packedZone !== "string" || !packedZone.includes("|")) {
      fail(`${artifact.version} contains a malformed packed Zone identity`);
    }
    const name = packedZone.split("|", 1)[0];
    if (!name || /\s/u.test(name)) fail(`${artifact.version} contains a packed Zone without a valid name`);
    if (zoneNames.has(name)) fail(`${artifact.version} contains duplicate Zone name ${name}`);
    zoneNames.add(name);
  }
  const rightAliases = new Set();
  const names = new Set(zoneNames);
  const adjacency = new Map();
  const connect = (left, right) => {
    if (!adjacency.has(left)) adjacency.set(left, new Set());
    if (!adjacency.has(right)) adjacency.set(right, new Set());
    adjacency.get(left).add(right);
    adjacency.get(right).add(left);
  };
  for (const packedLink of artifact.links) {
    if (typeof packedLink !== "string") fail(`${artifact.version} contains a non-string packed Link identity`);
    const parts = packedLink.split("|");
    if (parts.length !== 2 || !parts[0] || !parts[1] || /\s/u.test(parts[0]) || /\s/u.test(parts[1])) {
      fail(`${artifact.version} contains a malformed packed Link identity`);
    }
    const [left, right] = parts;
    if (left === right) fail(`${artifact.version} contains a self-referential Link identity ${left}`);
    if (rightAliases.has(right)) fail(`${artifact.version} contains duplicate Link alias/right identity ${right}`);
    if (zoneNames.has(right)) fail(`${artifact.version} Link alias/right identity duplicates Zone name ${right}`);
    rightAliases.add(right);
    names.add(left);
    names.add(right);
    connect(left, right);
  }
  const reachableNames = new Set(zoneNames);
  const queue = [...zoneNames];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const neighbor of adjacency.get(current) ?? []) {
      if (reachableNames.has(neighbor)) continue;
      reachableNames.add(neighbor);
      queue.push(neighbor);
    }
  }
  const unreachableLinkEndpoints = [...names]
    .filter((name) => !reachableNames.has(name))
    .sort();
  if (unreachableLinkEndpoints.length > 0) {
    fail(
      `${artifact.version} contains Link endpoints unreachable from every Zone: ` +
      JSON.stringify(unreachableLinkEndpoints.slice(0, 12))
    );
  }
  return {
    names: reachableNames,
    zoneNameCount: zoneNames.size,
    linkAliasCount: rightAliases.size
  };
}

export function compareZoneAndLinkNameSets(activeArtifact, retainedArtifact) {
  const activeInspection = inspectZoneAndLinkNameSet(activeArtifact);
  const retainedInspection = inspectZoneAndLinkNameSet(retainedArtifact);
  const activeNames = activeInspection.names;
  const retainedNames = retainedInspection.names;
  const activeOnly = [...activeNames].filter((name) => !retainedNames.has(name)).sort();
  const retainedOnly = [...retainedNames].filter((name) => !activeNames.has(name)).sort();
  if (activeOnly.length > 0 || retainedOnly.length > 0) {
    fail(
      `reviewed ${retainedArtifact.version}/${activeArtifact.version} Zone+Link endpoint name sets differ; ` +
      `active-only=${JSON.stringify(activeOnly.slice(0, 12))}, ` +
      `retained-only=${JSON.stringify(retainedOnly.slice(0, 12))}`
    );
  }
  const sortedNames = [...activeNames].sort();
  return {
    activeIanaVersion: activeArtifact.version,
    retainedIanaVersion: retainedArtifact.version,
    equal: true,
    nameCount: sortedNames.length,
    activeZoneNameCount: activeInspection.zoneNameCount,
    activeLinkAliasCount: activeInspection.linkAliasCount,
    retainedZoneNameCount: retainedInspection.zoneNameCount,
    retainedLinkAliasCount: retainedInspection.linkAliasCount,
    sortedNamesSha256: createHash("sha256").update(sortedNames.join("\n"), "utf8").digest("hex")
  };
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
  const zoneAndLinkNameSet = compareZoneAndLinkNameSets(active.data, retained.data);

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
    },
    zoneAndLinkNameSet
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify(verifyTzdbArtifact(), null, 2));
}
