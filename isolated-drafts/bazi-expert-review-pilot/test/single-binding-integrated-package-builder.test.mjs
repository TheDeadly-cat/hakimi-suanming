import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY,
  SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES,
  buildSingleBindingIntegratedPhysicalPairCandidate,
  createSingleBindingIntegratedPhysicalIds
} from "../single-binding-integrated-package-builder.mjs";

const SOURCE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REVIEW_CYCLE_PATTERN = /^single-binding-synthetic-review-cycle\.[a-f0-9]{64}$/u;
const PAIR_RUN_PATTERN = /^single-binding-synthetic-pair-run\.[a-f0-9]{64}$/u;
const SEAT_SESSION_PATTERN = /^single-binding-synthetic-seat-session\.[a-f0-9]{64}$/u;
const IDS = Object.freeze({
  reviewCycleId: `single-binding-synthetic-review-cycle.${"1".repeat(64)}`,
  pairRunId: `single-binding-synthetic-pair-run.${"2".repeat(64)}`,
  seatSessionNonces: Object.freeze({
    A: `single-binding-synthetic-seat-session.${"3".repeat(64)}`,
    B: `single-binding-synthetic-seat-session.${"4".repeat(64)}`
  })
});

const ROOT_ALLOWLIST = Object.freeze([
  "PAIR-START-HERE.txt",
  "coordinator",
  "pair-manifest.json",
  "pair-precommit.json",
  "seat-a",
  "seat-b"
]);
const SHARED_SEAT_ALLOWLIST = Object.freeze([
  "START-HERE.txt",
  "START-PILOT.cmd",
  "package-manifest.json",
  "package.json",
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated.css",
  "single-binding-integrated.js",
  "single-binding-rehearsal-contract.js"
]);
const COORDINATOR_ALLOWLIST = Object.freeze([
  "START-HERE.txt",
  "START-PAIR.cmd",
  "package.json",
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated-pair.css",
  "single-binding-integrated-pair.html",
  "single-binding-integrated-pair.js",
  "single-binding-rehearsal-contract.js"
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createOwnedTemporaryRoot(t, prefix) {
  const canonicalTemp = await realpath(tmpdir());
  const created = await mkdtemp(join(canonicalTemp, prefix));
  const canonicalCreated = await realpath(created);
  assert.equal(dirname(canonicalCreated).toLowerCase(), canonicalTemp.toLowerCase());
  assert.match(basename(canonicalCreated), new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}`, "u"));
  t.after(async () => {
    const metadata = await lstat(canonicalCreated);
    const observed = await realpath(canonicalCreated);
    assert.equal(metadata.isDirectory(), true);
    assert.equal(metadata.isSymbolicLink(), false);
    assert.equal(observed.toLowerCase(), canonicalCreated.toLowerCase());
    assert.equal(dirname(observed).toLowerCase(), canonicalTemp.toLowerCase());
    await rm(observed, { recursive: true, force: false });
  });
  return canonicalCreated;
}

async function sortedEntries(root) {
  return (await readdir(root, { withFileTypes: true }))
    .map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory(), isFile: entry.isFile() }))
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
}

async function sortedFileNames(root) {
  const entries = await sortedEntries(root);
  for (const entry of entries) assert.equal(entry.isFile, true, `${entry.name} 必须是普通文件`);
  return entries.map((entry) => entry.name);
}

async function listFiles(root, current = root) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const target = join(current, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(root, target));
    else if (entry.isFile()) result.push(relative(root, target).replaceAll("\\", "/"));
    else throw new Error(`unexpected package endpoint: ${target}`);
  }
  return result.sort();
}

async function fileIdentityMap(root) {
  const result = {};
  for (const path of await listFiles(root)) {
    const bytes = await readFile(join(root, ...path.split("/")));
    result[path] = { byteLength: bytes.byteLength, sha256: sha256(bytes) };
  }
  return result;
}

async function readJsonArtifact(path) {
  const bytes = await readFile(path);
  return { bytes, rawSha256: sha256(bytes), value: JSON.parse(bytes.toString("utf8")) };
}

async function assertPayloads(root, payloads) {
  const expected = [...payloads].map((entry) => entry.path).sort();
  for (const payload of payloads) {
    const bytes = await readFile(join(root, ...payload.path.split("/")));
    assert.equal(bytes.byteLength, payload.byteLength, payload.path);
    assert.equal(sha256(bytes), payload.sha256, payload.path);
  }
  return expected;
}

function assertPhysicalBoundary(boundary, label) {
  assert.deepEqual(boundary, SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY, label);
  for (const [key, expected] of Object.entries(SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY)) {
    if (expected === false || expected === 0) assert.equal(boundary[key], expected, `${label}.${key}`);
  }
  assert.equal(boundary.physicalExpertSurfaceReady, false, `${label}.physicalExpertSurfaceReady`);
  assert.equal(boundary.distributionAuthorized, false, `${label}.distributionAuthorized`);
  assert.equal(boundary.realPersonDistributionReady, false, `${label}.realPersonDistributionReady`);
  assert.equal(boundary.formalAdmissionAllowed, false, `${label}.formalAdmissionAllowed`);
  assert.equal(boundary.releaseReady, false, `${label}.releaseReady`);
  assert.equal(boundary.publicReleaseAuthorized, false, `${label}.publicReleaseAuthorized`);
  assert.equal(boundary.publicDeploymentAuthorized, false, `${label}.publicDeploymentAuthorized`);
  assert.equal(boundary.expertClaimsAuthorized, false, `${label}.expertClaimsAuthorized`);
  assert.equal(boundary.safeToPublish, false, `${label}.safeToPublish`);
}

function assertNoOwnHash(value, ownHash, forbiddenKeys, label) {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes(ownHash), false, `${label} 不得包含自身 raw hash`);
  for (const key of forbiddenKeys) {
    assert.equal(Object.hasOwn(value, key), false, `${label}.${key} 不得存在`);
  }
}

async function assertNotCreated(path) {
  await assert.rejects(() => access(path), (error) => error?.code === "ENOENT");
}

test("builds an exact isolated A/B physical candidate and binds P/SA/SB/PM without a hash cycle", async (t) => {
  const temporaryRoot = await createOwnedTemporaryRoot(t, "hakimi-single-binding-physical-builder-");
  const firstRoot = join(temporaryRoot, "first");
  const secondRoot = join(temporaryRoot, "second");
  const first = await buildSingleBindingIntegratedPhysicalPairCandidate({ ...IDS, outputDirectory: firstRoot });
  const second = await buildSingleBindingIntegratedPhysicalPairCandidate({ ...IDS, outputDirectory: secondRoot });

  const rootEntries = await sortedEntries(firstRoot);
  assert.deepEqual(rootEntries.map((entry) => entry.name), [...ROOT_ALLOWLIST].sort());
  assert.deepEqual(rootEntries.filter((entry) => entry.isDirectory).map((entry) => entry.name), [
    "coordinator", "seat-a", "seat-b"
  ]);
  assert.deepEqual(
    await sortedFileNames(join(firstRoot, "seat-a")),
    [...SHARED_SEAT_ALLOWLIST, "single-binding-integrated-a.html"].sort()
  );
  assert.deepEqual(
    await sortedFileNames(join(firstRoot, "seat-b")),
    [...SHARED_SEAT_ALLOWLIST, "single-binding-integrated-b.html"].sort()
  );
  assert.deepEqual(await sortedFileNames(join(firstRoot, "coordinator")), [...COORDINATOR_ALLOWLIST].sort());
  assert.equal((await listFiles(firstRoot)).some((path) => path.split("/").includes("payload-root")), false);

  const seatAFiles = await sortedFileNames(join(firstRoot, "seat-a"));
  const seatBFiles = await sortedFileNames(join(firstRoot, "seat-b"));
  assert.equal(seatAFiles.includes("single-binding-integrated-b.html"), false);
  assert.equal(seatBFiles.includes("single-binding-integrated-a.html"), false);
  assert.equal(seatAFiles.includes("single-binding-integrated-pair.html"), false);
  assert.equal(seatBFiles.includes("single-binding-integrated-pair.html"), false);
  const seatAText = (await Promise.all(seatAFiles.map((path) => readFile(join(firstRoot, "seat-a", path), "utf8")))).join("\n");
  const seatBText = (await Promise.all(seatBFiles.map((path) => readFile(join(firstRoot, "seat-b", path), "utf8")))).join("\n");
  assert.doesNotMatch(seatAText, /single-binding-integrated-b\.html/u);
  assert.doesNotMatch(seatBText, /single-binding-integrated-a\.html/u);
  assert.doesNotMatch(seatAText, new RegExp(IDS.seatSessionNonces.B.replace(".", "\\."), "u"));
  assert.doesNotMatch(seatBText, new RegExp(IDS.seatSessionNonces.A.replace(".", "\\."), "u"));

  const pairPrecommit = await readJsonArtifact(join(firstRoot, "pair-precommit.json"));
  const seatAManifest = await readJsonArtifact(join(firstRoot, "seat-a", "package-manifest.json"));
  const seatBManifest = await readJsonArtifact(join(firstRoot, "seat-b", "package-manifest.json"));
  const pairGuideBytes = await readFile(join(firstRoot, "PAIR-START-HERE.txt"));
  const pairManifest = await readJsonArtifact(join(firstRoot, "pair-manifest.json"));
  assert.equal(pairPrecommit.rawSha256, first.pairPrecommitRawSha256);
  assert.equal(seatAManifest.rawSha256, first.seatA.manifestRawSha256);
  assert.equal(seatBManifest.rawSha256, first.seatB.manifestRawSha256);
  assert.equal(pairManifest.rawSha256, first.pairManifestRawSha256);
  assert.deepEqual(pairPrecommit.value, first.pairPrecommit);
  assert.deepEqual(seatAManifest.value, first.seatA.manifest);
  assert.deepEqual(seatBManifest.value, first.seatB.manifest);
  assert.deepEqual(pairManifest.value, first.pairManifest);

  assertNoOwnHash(pairPrecommit.value, pairPrecommit.rawSha256, [
    "pairPrecommitRawSha256", "pairManifestRawSha256", "seatPackageManifestRawSha256"
  ], "pairPrecommit");
  assert.equal(JSON.stringify(pairPrecommit.value).includes(seatAManifest.rawSha256), false);
  assert.equal(JSON.stringify(pairPrecommit.value).includes(seatBManifest.rawSha256), false);
  assert.equal(JSON.stringify(pairPrecommit.value).includes(pairManifest.rawSha256), false);
  for (const [seatId, manifest] of [["A", seatAManifest], ["B", seatBManifest]]) {
    assert.equal(manifest.value.pairPrecommitRawSha256, pairPrecommit.rawSha256, `${seatId}.P`);
    assertNoOwnHash(manifest.value, manifest.rawSha256, [
      "pairManifestRawSha256", "seatPackageManifestRawSha256"
    ], `seat${seatId}Manifest`);
    assert.equal(JSON.stringify(manifest.value).includes(pairManifest.rawSha256), false, `${seatId} 不得预绑定 PM`);
  }
  assert.equal(pairManifest.value.pairPrecommitArtifact.rawSha256, pairPrecommit.rawSha256);
  assert.equal(pairManifest.value.pairGuideArtifact.filename, "PAIR-START-HERE.txt");
  assert.equal(pairManifest.value.pairGuideArtifact.byteLength, pairGuideBytes.byteLength);
  assert.equal(pairManifest.value.pairGuideArtifact.rawSha256, sha256(pairGuideBytes));
  assert.deepEqual(pairManifest.value.seatPackages.map((seat) => [seat.seatId, seat.manifestRawSha256]), [
    ["A", seatAManifest.rawSha256],
    ["B", seatBManifest.rawSha256]
  ]);
  assertNoOwnHash(pairManifest.value, pairManifest.rawSha256, ["pairManifestRawSha256"], "pairManifest");

  assert.deepEqual(await assertPayloads(join(firstRoot, "seat-a"), seatAManifest.value.payloads),
    seatAFiles.filter((path) => path !== "package-manifest.json"));
  assert.deepEqual(await assertPayloads(join(firstRoot, "seat-b"), seatBManifest.value.payloads),
    seatBFiles.filter((path) => path !== "package-manifest.json"));
  assert.deepEqual(await assertPayloads(join(firstRoot, "coordinator"), pairManifest.value.coordinatorPayloads),
    [...COORDINATOR_ALLOWLIST].sort());

  for (const seatId of ["A", "B"]) {
    const seat = seatId === "A" ? first.seatA : first.seatB;
    const binding = first.runtimeSessionBindings[seatId];
    assert.equal(binding.bindingMode, "physical_synthetic_single_binding_pair");
    assert.equal(binding.reviewCycleId, IDS.reviewCycleId);
    assert.equal(binding.pairRunId, IDS.pairRunId);
    assert.equal(binding.seatId, seatId);
    assert.equal(binding.seatSessionNonce, IDS.seatSessionNonces[seatId]);
    assert.equal(binding.pairPrecommitRawSha256, pairPrecommit.rawSha256);
    assert.equal(binding.pairManifestRawSha256, pairManifest.rawSha256);
    assert.equal(binding.seatPackageManifestRawSha256, seat.manifestRawSha256);
    assert.equal(binding.selectedBindingCount, 1);
    assert.equal(Object.isFrozen(binding), true);
  }
  assert.notDeepEqual(first.runtimeSessionBindings.A, first.runtimeSessionBindings.B);

  for (const [label, boundary] of [
    ["exportedBoundary", SINGLE_BINDING_INTEGRATED_PHYSICAL_PACKAGE_BOUNDARY],
    ["resultBoundary", first.boundary],
    ["precommitBoundary", pairPrecommit.value.boundary],
    ["seatABoundary", seatAManifest.value.boundary],
    ["seatBBoundary", seatBManifest.value.boundary],
    ["pairManifestBoundary", pairManifest.value.boundary]
  ]) assertPhysicalBoundary(boundary, label);
  assert.equal(seatAManifest.value.physicalExpertSurfaceReady, false);
  assert.equal(seatBManifest.value.physicalExpertSurfaceReady, false);
  assert.equal(seatAManifest.value.packageLocalExecutionAllowed, false);
  assert.equal(seatBManifest.value.packageLocalExecutionAllowed, false);

  assert.deepEqual(await fileIdentityMap(firstRoot), await fileIdentityMap(secondRoot));
  assert.deepEqual(first.runtimeSessionBindings, second.runtimeSessionBindings);
  assert.equal(first.pairPrecommitRawSha256, second.pairPrecommitRawSha256);
  assert.equal(first.seatA.manifestRawSha256, second.seatA.manifestRawSha256);
  assert.equal(first.seatB.manifestRawSha256, second.seatB.manifestRawSha256);
  assert.equal(first.pairManifestRawSha256, second.pairManifestRawSha256);
});

test("creates fresh nonzero opaque cycle, pair and seat ids", () => {
  const first = createSingleBindingIntegratedPhysicalIds();
  const second = createSingleBindingIntegratedPhysicalIds();
  for (const ids of [first, second]) {
    assert.match(ids.reviewCycleId, REVIEW_CYCLE_PATTERN);
    assert.match(ids.pairRunId, PAIR_RUN_PATTERN);
    assert.match(ids.seatSessionNonces.A, SEAT_SESSION_PATTERN);
    assert.match(ids.seatSessionNonces.B, SEAT_SESSION_PATTERN);
    assert.doesNotMatch(ids.reviewCycleId, /\.0{64}$/u);
    assert.doesNotMatch(ids.pairRunId, /\.0{64}$/u);
    assert.doesNotMatch(ids.seatSessionNonces.A, /\.0{64}$/u);
    assert.doesNotMatch(ids.seatSessionNonces.B, /\.0{64}$/u);
    assert.notEqual(ids.seatSessionNonces.A, ids.seatSessionNonces.B);
    assert.equal(Object.isFrozen(ids), true);
    assert.equal(Object.isFrozen(ids.seatSessionNonces), true);
  }
  assert.equal(new Set([
    first.reviewCycleId,
    first.pairRunId,
    first.seatSessionNonces.A,
    first.seatSessionNonces.B,
    second.reviewCycleId,
    second.pairRunId,
    second.seatSessionNonces.A,
    second.seatSessionNonces.B
  ]).size, 8);
});

test("rejects existing output and every invalid identity before creating an output", async (t) => {
  const temporaryRoot = await createOwnedTemporaryRoot(t, "hakimi-single-binding-physical-reject-");
  const existing = join(temporaryRoot, "existing");
  await mkdir(existing);
  await assert.rejects(
    () => buildSingleBindingIntegratedPhysicalPairCandidate({ ...IDS, outputDirectory: existing }),
    (error) => error?.code === "EEXIST"
  );
  assert.deepEqual(await readdir(existing), []);

  const cases = [
    ["unknown", { ...IDS, unexpected: true }, /未知字段/u],
    ["zero-cycle", { ...IDS, reviewCycleId: `single-binding-synthetic-review-cycle.${"0".repeat(64)}` }, /reviewCycleId/u],
    ["zero-pair", { ...IDS, pairRunId: `single-binding-synthetic-pair-run.${"0".repeat(64)}` }, /pairRunId/u],
    ["zero-seat", { ...IDS, seatSessionNonces: { ...IDS.seatSessionNonces, A: `single-binding-synthetic-seat-session.${"0".repeat(64)}` } }, /seatSessionNonce/u],
    ["duplicate-seat", { ...IDS, seatSessionNonces: { A: IDS.seatSessionNonces.A, B: IDS.seatSessionNonces.A } }, /必须不同/u]
  ];
  for (const [name, input, pattern] of cases) {
    const outputDirectory = join(temporaryRoot, name);
    await assert.rejects(
      () => buildSingleBindingIntegratedPhysicalPairCandidate({ ...input, outputDirectory }),
      pattern,
      name
    );
    await assertNotCreated(outputDirectory);
  }
});

test("rejects an output parent that resolves into the source tree", async (t) => {
  const temporaryRoot = await createOwnedTemporaryRoot(t, "hakimi-single-binding-physical-source-link-");
  const sourceLink = join(temporaryRoot, "source-link");
  await symlink(SOURCE_ROOT, sourceLink, "junction");
  const outputDirectory = join(sourceLink, "must-not-exist-physical-package");
  await assert.rejects(
    () => buildSingleBindingIntegratedPhysicalPairCandidate({ ...IDS, outputDirectory }),
    /仓库树之外/u
  );
  await assertNotCreated(outputDirectory);
});

test("rejects direct repository output and accessor, symbol or hidden input fields before writes", async (t) => {
  const repositoryRoot = resolve(SOURCE_ROOT, "../..");
  const forbiddenRepositoryOutput = join(
    repositoryRoot,
    `.single-binding-integrated-physical-forbidden-${process.pid}`
  );
  await assertNotCreated(forbiddenRepositoryOutput);
  await assert.rejects(
    () => buildSingleBindingIntegratedPhysicalPairCandidate({
      ...IDS,
      outputDirectory: forbiddenRepositoryOutput
    }),
    /仓库树之外/u
  );
  await assertNotCreated(forbiddenRepositoryOutput);

  const temporaryRoot = await createOwnedTemporaryRoot(t, "hakimi-single-binding-physical-data-fields-");
  const cases = [];
  const accessorInput = { ...IDS, outputDirectory: join(temporaryRoot, "accessor") };
  Object.defineProperty(accessorInput, "reviewCycleId", {
    enumerable: true,
    get() { return IDS.reviewCycleId; }
  });
  cases.push(["accessor", accessorInput, /数据属性/u]);
  cases.push(["symbol", {
    ...IDS,
    outputDirectory: join(temporaryRoot, "symbol"),
    [Symbol("hidden")]: true
  }, /未知字段/u]);
  const hiddenInput = { ...IDS, outputDirectory: join(temporaryRoot, "hidden") };
  Object.defineProperty(hiddenInput, "hidden", { value: true, enumerable: false });
  cases.push(["hidden", hiddenInput, /数据属性/u]);
  const nonceAccessorInput = {
    ...IDS,
    outputDirectory: join(temporaryRoot, "nonce-accessor"),
    seatSessionNonces: {}
  };
  Object.defineProperties(nonceAccessorInput.seatSessionNonces, {
    A: { enumerable: true, get() { return IDS.seatSessionNonces.A; } },
    B: { enumerable: true, value: IDS.seatSessionNonces.B }
  });
  cases.push(["nonce-accessor", nonceAccessorInput, /数据属性/u]);
  cases.push(["control-character-path", {
    ...IDS,
    outputDirectory: join(temporaryRoot, "bad\nPIN-CANDIDATE PM forged")
  }, /outputDirectory/u]);

  for (const [name, input, pattern] of cases) {
    await assert.rejects(
      () => buildSingleBindingIntegratedPhysicalPairCandidate(input),
      pattern,
      name
    );
    await assertNotCreated(input.outputDirectory);
  }
});

test("CLI emits one parseable JSON envelope with escaped path and inseparable pin boundary", async (t) => {
  const temporaryRoot = await createOwnedTemporaryRoot(t, "hakimi-single-binding-physical-cli-");
  const outputDirectory = join(temporaryRoot, "cli-pair");
  const run = spawnSync(process.execPath, [
    join(SOURCE_ROOT, "single-binding-integrated-package-builder.mjs"),
    "--output", outputDirectory,
    "--review-cycle", IDS.reviewCycleId,
    "--pair-run", IDS.pairRunId,
    "--seat-a-nonce", IDS.seatSessionNonces.A,
    "--seat-b-nonce", IDS.seatSessionNonces.B
  ], {
    cwd: temporaryRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  const lines = run.stdout.trim().split(/\r?\n/u);
  assert.equal(lines.length, 1);
  const envelope = JSON.parse(lines[0]);
  assert.deepEqual(Object.keys(envelope).sort(), [
    "boundary", "kind", "outputDirectory", "pairRunId", "pins", "reviewCycleId"
  ]);
  assert.equal(envelope.kind, "single_binding_integrated_physical_build_output_candidate");
  assert.equal(envelope.outputDirectory.toLowerCase(), outputDirectory.toLowerCase());
  assert.equal(envelope.reviewCycleId, IDS.reviewCycleId);
  assert.equal(envelope.pairRunId, IDS.pairRunId);
  for (const pin of Object.values(envelope.pins)) assert.match(pin, /^[a-f0-9]{64}$/u);
  assert.deepEqual(Object.values(envelope.boundary), [false, false, false, false, false]);
});

test("ships only inert refusing launchers and no package-local server", async (t) => {
  const temporaryRoot = await createOwnedTemporaryRoot(t, "hakimi-single-binding-physical-refuse-");
  const outputDirectory = join(temporaryRoot, "pair");
  await buildSingleBindingIntegratedPhysicalPairCandidate({ ...IDS, outputDirectory });
  const launchers = [
    [join(outputDirectory, "seat-a"), "START-PILOT.cmd"],
    [join(outputDirectory, "seat-b"), "START-PILOT.cmd"],
    [join(outputDirectory, "coordinator"), "START-PAIR.cmd"]
  ];
  for (const [cwd, filename] of launchers) {
    const source = await readFile(join(cwd, filename), "utf8");
    assert.match(source, /禁止包内直启/u);
    assert.match(source, /exit \/b 1/iu);
    assert.doesNotMatch(source, /\bnode(?:\.exe)?\b|coordinator-launch|server\.mjs/iu);
    if (process.platform === "win32") {
      const run = spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", filename], {
        cwd,
        encoding: "utf8",
        windowsHide: true
      });
      assert.equal(run.status, 1, `${filename} 必须拒绝启动`);
    }
    assert.deepEqual(JSON.parse(await readFile(join(cwd, "package.json"), "utf8")).scripts, {});
    const files = await sortedFileNames(cwd);
    for (const forbidden of ["coordinator-launch.mjs", "server.mjs", "return-verifier.mjs"]) {
      assert.equal(files.includes(forbidden), false, `${cwd} 不得包含 ${forbidden}`);
    }
  }
});

test("publishes only the three new physical record types", () => {
  assert.deepEqual(SINGLE_BINDING_INTEGRATED_PHYSICAL_RECORD_TYPES, {
    pairPrecommit: "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_precommit_v1",
    seatManifest: "bazi_expert_single_binding_nocode_synthetic_pilot_physical_seat_package_manifest_v1",
    pairManifest: "bazi_expert_single_binding_nocode_synthetic_pilot_physical_pair_manifest_v1"
  });
});
