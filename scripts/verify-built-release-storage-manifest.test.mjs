import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { verifyBuiltReleaseStorageManifest } from "./verify-built-release-storage-manifest.mjs";

const verifierPath = fileURLToPath(new URL("./verify-built-release-storage-manifest.mjs", import.meta.url));
const defaultDescriptor = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: [null],
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});
const candidateDescriptor = Object.freeze({
  ...defaultDescriptor,
  dbGeneration: "v16-candidate",
  databaseName: "hakimi-bazi-research-v16-candidate",
  targetSchema: 16,
  minReadableSchema: 16,
  maxReadableSchema: 16,
  migrationId: "v13-to-v16",
  acceptedCommittedMigrationIds: ["v13-to-v16"],
  sourceGeneration: "legacy-v13",
  sourceDatabaseName: defaultDescriptor.databaseName,
  sourceSchema: 13
});

function meta(name, value) {
  const escaped = value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return `<meta name="${name}" content="${escaped}">`;
}

async function fixture(t, descriptor, { workerDescriptor = descriptor, bridgeDescriptor = defaultDescriptor } = {}) {
  const temporaryRoot = path.resolve(os.tmpdir());
  const directory = await mkdtemp(path.join(temporaryRoot, "hakimi-built-manifest-"));
  t.after(async () => {
    assert.equal(path.dirname(directory), temporaryRoot);
    assert.ok(path.basename(directory).startsWith("hakimi-built-manifest-"));
    await rm(directory, { recursive: true, force: true });
  });
  const manifest = JSON.stringify({
    manifestVersion: 1,
    database: descriptor,
    requiredStorageTables: ["cases", "revisions"],
    requiredStorageIndexes: []
  });
  const html = [
    meta("hakimi-release-database", JSON.stringify(descriptor)),
    meta("hakimi-release-storage-manifest", manifest),
    meta("hakimi-release-storage-manifest-digest", createHash("sha256").update(manifest).digest("hex")),
    meta("hakimi-build-version", "123456789abc"),
    meta("hakimi-release-evidence-id", "unbound-local-build")
  ].join("\n");
  const worker = [
    `const RELEASE_DATABASE = JSON.parse(${JSON.stringify(JSON.stringify(workerDescriptor))});`,
    `const LEGACY_BRIDGE_DATABASE = Object.freeze(JSON.parse(${JSON.stringify(JSON.stringify(bridgeDescriptor))}));`
  ].join("\n");
  const headers = [
    "Content-Security-Policy-Report-Only:", "Referrer-Policy:", "X-Content-Type-Options:",
    "X-Frame-Options:", "Permissions-Policy:", "Cross-Origin-Opener-Policy:", "Strict-Transport-Security:"
  ].join("\n");
  await Promise.all([
    writeFile(path.join(directory, "index.html"), html),
    writeFile(path.join(directory, "sw.js"), worker),
    writeFile(path.join(directory, "_headers"), headers)
  ]);
  return directory;
}

test("default channel accepts a consistent legacy-v13 / schema 13 / null migration artifact", async (t) => {
  const directory = await fixture(t, defaultDescriptor);
  const result = await verifyBuiltReleaseStorageManifest(directory, { expectedChannel: "default-v13" });
  assert.equal(result.expectedChannel, "default-v13");
  assert.deepEqual(result.descriptor, defaultDescriptor);
});

test("a consistent v16 candidate remains valid in generic and explicit candidate verification", async (t) => {
  const directory = await fixture(t, candidateDescriptor);
  for (const options of [undefined, { expectedChannel: "candidate" }]) {
    const result = await verifyBuiltReleaseStorageManifest(directory, options);
    assert.equal(result.expectedChannel, "candidate");
    assert.deepEqual(result.descriptor, candidateDescriptor);
  }
  await assert.rejects(
    verifyBuiltReleaseStorageManifest(directory, { expectedChannel: "default-v13" }),
    /Default v13 build expected dbGeneration="legacy-v13"/
  );
});

for (const [field, value] of [
  ["dbGeneration", "other-generation"],
  ["targetSchema", 16],
  ["targetSchema", "13"],
  ["migrationId", "v13-to-v16"],
  ["migrationId", undefined]
]) {
  test(`default channel rejects internally consistent ${field}=${String(value)}`, async (t) => {
    const descriptor = { ...defaultDescriptor, [field]: value };
    const directory = await fixture(t, descriptor, { bridgeDescriptor: descriptor });
    await verifyBuiltReleaseStorageManifest(directory);
    await assert.rejects(
      verifyBuiltReleaseStorageManifest(directory, { expectedChannel: "default-v13" }),
      new RegExp(`Default v13 build expected ${field}=`)
    );
  });
}

test("default and candidate channels still reject a disagreeing Service Worker", async (t) => {
  const directory = await fixture(t, defaultDescriptor, { workerDescriptor: candidateDescriptor });
  for (const expectedChannel of ["default-v13", "candidate"]) {
    await assert.rejects(
      verifyBuiltReleaseStorageManifest(directory, { expectedChannel }),
      /Service Worker descriptor and index descriptor disagree/
    );
  }
});

test("default channel still rejects a disagreeing bridge descriptor", async (t) => {
  const directory = await fixture(t, defaultDescriptor, { bridgeDescriptor: candidateDescriptor });
  await assert.rejects(
    verifyBuiltReleaseStorageManifest(directory, { expectedChannel: "default-v13" }),
    /does not share one bridge descriptor/
  );
});

test("unknown expected channels fail before attempting to read an artifact", async () => {
  await assert.rejects(
    verifyBuiltReleaseStorageManifest("not-an-artifact", { expectedChannel: "default-v16" }),
    /Unsupported built release expected channel/
  );
});

test("CLI default channel rejects a consistent candidate and accepts v13", async (t) => {
  const candidateDirectory = await fixture(t, candidateDescriptor);
  const defaultDirectory = await fixture(t, defaultDescriptor);
  const rejected = spawnSync(process.execPath, [verifierPath, candidateDirectory, "--expected-channel", "default-v13"], { encoding: "utf8" });
  assert.equal(rejected.status, 1, rejected.stderr);
  assert.match(rejected.stderr, /Default v13 build expected dbGeneration=/);
  const accepted = spawnSync(process.execPath, [verifierPath, defaultDirectory, "--expected-channel", "default-v13"], { encoding: "utf8" });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).expectedChannel, "default-v13");
});

test("CLI without a channel rejects a consistent candidate; candidate verification requires its explicit flag", async (t) => {
  const directory = await fixture(t, candidateDescriptor);
  const rejected = spawnSync(process.execPath, [verifierPath, directory], { encoding: "utf8" });
  assert.equal(rejected.status, 1, rejected.stderr);
  assert.match(rejected.stderr, /Default v13 build expected dbGeneration=/);
  const accepted = spawnSync(process.execPath, [verifierPath, directory, "--expected-channel", "candidate"], { encoding: "utf8" });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).expectedChannel, "candidate");
});

test("CLI rejects missing, duplicate, unknown, and extra channel arguments", () => {
  for (const args of [
    ["--expected-channel"],
    ["--expected-channel", "default-v13", "--expected-channel", "candidate"],
    ["--expected-channel", "default-v16"],
    ["--expected-channel=default-v13"],
    ["first-directory", "second-directory"]
  ]) {
    const result = spawnSync(process.execPath, [verifierPath, ...args], { encoding: "utf8" });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Expected exactly one|Unsupported built release expected channel|Unexpected built release verification argument/);
  }
});
