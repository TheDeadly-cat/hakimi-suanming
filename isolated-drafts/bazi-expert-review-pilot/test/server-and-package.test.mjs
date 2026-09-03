import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { buildPairedSeatPackages, buildSeatPackage } from "../package-builder.mjs";
import { createPilotServer } from "../server.mjs";

const ORDER_A = ["P01", "P03", "P05", "P02", "P04"];
const ORDER_B = ["P04", "P02", "P05", "P03", "P01"];
const REVIEW_CYCLE_ID = `pilot-review-cycle.${"a".repeat(64)}`;
const PILOT_SOURCE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function packageLauncherEnv(packageResult, overrides = {}) {
  const env = {};
  for (const key of ["SystemRoot", "WINDIR", "ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA", "TEMP", "TMP"]) {
    if (typeof process.env[key] === "string" && process.env[key].length > 0) env[key] = process.env[key];
  }
  return {
    ...env,
    HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256: packageResult.packageManifestRawSha256,
    HAKIMI_PILOT_EXPECTED_SEAT: packageResult.seatId,
    HAKIMI_PILOT_EXPECTED_REVIEW_CYCLE: packageResult.reviewCycleId,
    HAKIMI_PILOT_PIN_PROVENANCE_VERIFIED: "false",
    ...overrides
  };
}

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return address.port;
}

async function close(server) {
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
}

async function httpCall({ port, path = "/", method = "GET", hostHeader = `127.0.0.1:${port}` }) {
  return new Promise((resolveCall, reject) => {
    const outgoing = request({
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: { Host: hostHeader }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveCall({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}

async function listFiles(root, current = root) {
  const result = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) result.push(...await listFiles(root, path));
    else if (entry.isFile()) result.push(relative(root, path).replaceAll("\\", "/"));
    else throw new Error(`unexpected package endpoint: ${path}`);
  }
  return result.sort();
}

async function fileIdentityMap(root) {
  const result = {};
  for (const path of await listFiles(root)) {
    const bytes = await readFile(join(root, path));
    result[path] = { byteLength: bytes.byteLength, sha256: sha256(bytes) };
  }
  return result;
}

test("rejects every non-exact Host before serving the selected entry", async (t) => {
  const server = createPilotServer({ entry: "seat-a.html" });
  const port = await listen(server);
  t.after(() => close(server));

  const valid = await httpCall({ port });
  assert.equal(valid.status, 200);
  assert.match(valid.body, /data-seat="A"/u);
  assert.match(valid.headers["content-security-policy"], /connect-src 'none'/u);

  for (const hostHeader of [
    "127.0.0.1",
    `localhost:${port}`,
    `127.0.0.1:${port}.attacker.invalid`,
    `attacker.invalid:${port}`,
    `[::1]:${port}`
  ]) {
    const rejected = await httpCall({ port, hostHeader });
    assert.equal(rejected.status, 421, hostHeader);
    assert.equal(rejected.body, "Misdirected request");
  }
  const badHostPost = await httpCall({ port, method: "POST", hostHeader: `attacker.invalid:${port}` });
  assert.equal(badHostPost.status, 421);
});

test("uses an exact per-entry file allowlist and rejects traversal or the opposite seat", async (t) => {
  const server = createPilotServer({ entry: "seat-a.html" });
  const port = await listen(server);
  t.after(() => close(server));

  for (const path of ["/", "/seat-a.html", "/app.js", "/contract.js", "/styles.css", "/data/questions.js", "/data/scenarios.js"]) {
    assert.equal((await httpCall({ port, path })).status, 200, path);
  }
  for (const path of [
    "/seat-b.html",
    "/server.mjs",
    "/package.json",
    "/design/desktop-concept.png",
    "/data/%2e%2e/seat-a.html",
    "/%2e%2e/server.mjs",
    "/data%5cscenarios.js",
    "//seat-a.html",
    "/.hidden"
  ]) {
    assert.equal((await httpCall({ port, path })).status, 404, path);
  }
  const head = await httpCall({ port, path: "/data/scenarios.js", method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.body, "");
  const post = await httpCall({ port, method: "POST" });
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, "GET, HEAD");
});

test("builds deterministic physical A/B packages with one entry and one order each", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-pilot-package-test-"));
  t.after(async () => {
    const resolved = resolve(temporaryRoot);
    assert.ok(resolved.startsWith(resolve(tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const a1Root = join(temporaryRoot, "a1");
  const a2Root = join(temporaryRoot, "a2");
  const bRoot = join(temporaryRoot, "b");
  const a1 = await buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: a1Root });
  const a2 = await buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: a2Root });
  const b = await buildSeatPackage({ seatId: "B", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: bRoot });

  const expectedA = [
    "app.js", "contract.js", "coordinator-launch.mjs", "data/questions.js", "data/scenarios.js",
    "package-manifest.json", "package.json", "return-verifier.mjs", "seat-a.html", "server.mjs", "START-HERE.txt",
    "START-PILOT.cmd", "styles.css"
  ];
  const expectedB = expectedA.map((path) => path === "seat-a.html" ? "seat-b.html" : path).sort();
  assert.deepEqual(await listFiles(a1Root), expectedA.sort());
  assert.deepEqual(await listFiles(bRoot), expectedB);
  assert.deepEqual(await fileIdentityMap(a1Root), await fileIdentityMap(a2Root));
  assert.deepEqual(a1.manifest.selectedOrder, ORDER_A);
  assert.deepEqual(b.manifest.selectedOrder, ORDER_B);
  assert.equal(a1.manifest.containsOppositeSeatEntry, false);
  assert.equal(a1.manifest.containsMultipleSeatOrders, false);
  assert.equal(a1.manifest.isolatedBrowserProfileLauncherIncluded, true);
  assert.equal(a1.manifest.defaultBrowserProfileUsedByLauncher, false);
  assert.equal(a1.manifest.packageLocalReturnDirectoryConfigured, true);
  assert.equal(a1.manifest.endToEndOpinionIndependenceEstablished, false);
  assert.equal(a1.manifest.distributionAuthorized, false);
  assert.equal(a1.manifest.countsTowardFormal2of2, false);
  assert.equal(a1.manifest.countsTowardExpertGate, false);
  assert.equal(a1.manifest.formalConversionAllowed, false);
  assert.equal(a1.manifest.trustedBootstrapEstablished, false);
  assert.equal(a1.manifest.packageAuthenticityEstablished, false);
  assert.equal(a1.manifest.pinProvenanceVerified, false);
  assert.equal(a1.manifest.signature, false);
  assert.equal(a1.manifest.samePrivilegeIntervalMutationExcluded, false);
  assert.equal(a1.manifest.samePackagePinFileIsTrustRoot, false);
  assert.equal(a1.manifest.packageLocalDirectStartAllowed, false);
  assert.equal(a1.manifest.realPersonDistributionReady, false);
  assert.equal(a1.manifest.sameCycleReplayExcluded, false);
  assert.equal(a1.manifest.alternateDataStreamsEnumerated, false);
  assert.equal(a1.manifest.alternateDataStreamsExcluded, false);
  assert.equal(a1.manifest.samePrivilegeConcurrentMutationExcluded, false);
  assert.equal(a1.manifest.atomicSessionCleanupEstablished, false);
  assert.equal(a1.manifest.atomicObservationWriteEstablished, false);
  assert.equal(a1.manifest.reviewCycleId, REVIEW_CYCLE_ID);
  assert.equal(b.manifest.reviewCycleId, REVIEW_CYCLE_ID);
  assert.equal(a1.manifest.returnVerifierIncluded, true);

  const aCombined = (await Promise.all((await listFiles(a1Root)).map(async (path) => {
    const extension = path.split(".").at(-1);
    return new Set(["js", "mjs", "json", "html", "css", "cmd", "txt"]).has(extension)
      ? readFile(join(a1Root, path), "utf8")
      : "";
  }))).join("\n");
  const bCombined = (await Promise.all((await listFiles(bRoot)).map(async (path) => readFile(join(bRoot, path), "utf8")))).join("\n");
  assert.doesNotMatch(aCombined, /seat-b\.html/u);
  assert.doesNotMatch(aCombined, new RegExp(JSON.stringify(ORDER_B).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.doesNotMatch(bCombined, /seat-a\.html/u);
  assert.doesNotMatch(bCombined, new RegExp(JSON.stringify(ORDER_A).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.doesNotMatch(aCombined, /package-builder|desktop-concept|mobile-concept|pilot\.spec|contract\.test/u);
  assert.match(aCombined, /专家不需要运行命令，也不需要理解 AI 或代码/u);
  assert.match(aCombined, /distributionAuthorized=false/u);
  assert.match(aCombined, /下载完整提交资料（一个文件）/u);
  assert.match(aCombined, /--user-data-dir/u);
  assert.match(aCombined, /--disable-sync/u);
  assert.match(aCombined, /server\.listen\(0, "127\.0\.0\.1", resolveListen\)/u);
  assert.match(aCombined, /mkdtemp\(join\(canonicalTempRoot, `hakimi-bazi-seat-/u);
  assert.match(aCombined, /const profileRoot = join\(canonicalSessionRoot, "browser-profile"\)/u);
  assert.match(aCombined, /returned-materials/u);
  assert.match(aCombined, /verifyPilotReturnDirectory/u);
  assert.match(aCombined, new RegExp(REVIEW_CYCLE_ID, "u"));
  assert.match(aCombined, /找不到可隔离启动的 Chrome 或 Edge/u);
  assert.doesNotMatch(aCombined, /\["\/d", "\/c", "start"/u);

  const launcherA = await readFile(join(a1Root, "coordinator-launch.mjs"), "utf8");
  const verificationIndex = launcherA.indexOf("await verifyPilotReturnDirectory");
  const verifiedIndex = launcherA.indexOf("returnVerified = true", verificationIndex);
  const cleanupIndex = launcherA.indexOf("await stop(0)", verifiedIndex);
  assert.ok(verificationIndex > 0 && verifiedIndex > verificationIndex && cleanupIndex > verifiedIndex);
  assert.match(launcherA, /new URLSearchParams\(\{ reviewCycleId, packageManifestRawSha256 \}\)/u);
  assert.match(launcherA, /现场已保留，不得晋级。修正后可再次按 Enter/u);
  assert.doesNotMatch(launcherA, /^import\s+.*\.\/server\.mjs/mu);
  assert.doesNotMatch(launcherA, /^import\s+.*\.\/return-verifier\.mjs/mu);
  assert.match(launcherA, /bootstrapPackagePayloads/u);
  assert.ok(launcherA.indexOf("HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256") < launcherA.indexOf("bootstrapPackagePayloads"));
  assert.ok(launcherA.indexOf("bootstrapPackagePayloads") < launcherA.indexOf('import(".\/server.mjs")'));
  assert.match(launcherA, /await Promise\.all\(\[import\("\.\/server\.mjs"\), import\("\.\/return-verifier\.mjs"\)\]\)/u);
  assert.match(launcherA, /initialSessionIdentity = Object\.freeze\(\{ dev: sessionMetadata\.dev, ino: sessionMetadata\.ino \}\)/u);
  assert.match(launcherA, /!preserveSession && browserClosed && serverClosed/u);
  assert.doesNotMatch(await readFile(join(a1Root, "START-PILOT.cmd"), "utf8"), /node coordinator-launch\.mjs/u);
  assert.match(await readFile(join(a1Root, "START-PILOT.cmd"), "utf8"), /包内直启已关闭/u);

  for (const root of [a1Root, bRoot]) {
    const check = spawnSync(process.execPath, ["--check", join(root, "coordinator-launch.mjs")], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true
    });
    assert.equal(check.status, 0, check.stderr);
  }

  const aScenarioModule = await import(`${pathToFileURL(join(a1Root, "data/scenarios.js")).href}?test=a`);
  const bScenarioModule = await import(`${pathToFileURL(join(bRoot, "data/scenarios.js")).href}?test=b`);
  assert.deepEqual(Object.keys(aScenarioModule.SEAT_ORDERS), ["A"]);
  assert.deepEqual(Object.keys(bScenarioModule.SEAT_ORDERS), ["B"]);
  assert.deepEqual([...aScenarioModule.SEAT_ORDERS.A], ORDER_A);
  assert.deepEqual([...bScenarioModule.SEAT_ORDERS.B], ORDER_B);

  for (const payload of a1.manifest.payloads) {
    const bytes = await readFile(join(a1Root, payload.path));
    assert.equal(bytes.byteLength, payload.byteLength, payload.path);
    assert.equal(sha256(bytes), payload.sha256, payload.path);
  }
});

test("defaults physical package output to system temp and leaves cleanup to the caller", async () => {
  const result = await buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID });
  const resolvedOutput = resolve(result.outputDirectory);
  const resolvedTemp = resolve(tmpdir());
  try {
    assert.ok(resolvedOutput.startsWith(resolvedTemp));
    assert.equal(relative(resolvedTemp, resolvedOutput).startsWith(".."), false);
    assert.deepEqual(Object.keys((await import(`${pathToFileURL(join(resolvedOutput, "data/scenarios.js")).href}?test=temp`)).SEAT_ORDERS), ["A"]);
  } finally {
    assert.ok(resolvedOutput.startsWith(resolvedTemp));
    await rm(resolvedOutput, { recursive: true, force: true });
  }
});

test("rejects an explicit output whose parent junction resolves inside the pilot source tree", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-pilot-junction-test-"));
  t.after(async () => {
    const resolved = resolve(temporaryRoot);
    assert.ok(resolved.startsWith(resolve(tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const junctionPath = join(temporaryRoot, "pilot-source-link");
  await symlink(PILOT_SOURCE_ROOT, junctionPath, "junction");
  await assert.rejects(
    () => buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: join(junctionPath, "should-not-exist") }),
    /必须位于 pilot 源码树之外/u
  );
});

test("generated launcher rejects a returned-materials junction before opening a browser", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-pilot-return-junction-test-"));
  t.after(async () => {
    const resolved = resolve(temporaryRoot);
    assert.ok(resolved.startsWith(resolve(tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const packageRoot = join(temporaryRoot, "seat-a-package");
  const externalSink = join(temporaryRoot, "external-sink");
  const packageResult = await buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: packageRoot });
  await mkdir(externalSink);
  await symlink(externalSink, join(packageRoot, "returned-materials"), "junction");
  const run = spawnSync(process.execPath, [join(packageRoot, "coordinator-launch.mjs")], {
    cwd: packageRoot,
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
    env: packageLauncherEnv(packageResult)
  });
  assert.notEqual(run.status, 0);
  assert.equal(run.stderr.trim(), "PILOT_LAUNCH_REJECTED；现场保留。");
  assert.doesNotMatch(run.stderr, new RegExp(temporaryRoot.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  assert.deepEqual(await readdir(externalSink), []);
});

test("generated launcher checks known package payload drift before dynamically importing package-local code", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-pilot-bootstrap-test-"));
  t.after(async () => {
    const resolved = resolve(temporaryRoot);
    assert.ok(resolved.startsWith(resolve(tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const packageRoot = join(temporaryRoot, "seat-a-package");
  const markerPath = join(temporaryRoot, "package-code-executed.txt");
  const packageResult = await buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: packageRoot });
  await writeFile(
    join(packageRoot, "server.mjs"),
    `import { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(markerPath)}, "executed", "utf8");\nexport const createPilotServer = () => { throw new Error("marker"); };\n`,
    "utf8"
  );
  const run = spawnSync(process.execPath, [join(packageRoot, "coordinator-launch.mjs")], {
    cwd: packageRoot,
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
    env: packageLauncherEnv(packageResult)
  });
  assert.notEqual(run.status, 0);
  assert.equal(run.stderr.trim(), "PILOT_LAUNCH_REJECTED；现场保留。");
  await assert.rejects(() => readFile(markerPath), (error) => error?.code === "ENOENT");
});

test("generated launcher generalizes a package-local dynamic import failure without echoing source or paths", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-pilot-import-failure-test-"));
  t.after(async () => {
    const resolved = resolve(temporaryRoot);
    assert.ok(resolved.startsWith(resolve(tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const packageRoot = join(temporaryRoot, "seat-a-package");
  const packageResult = await buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: packageRoot });
  const invalidSource = Buffer.from("PRIVATE_IMPORT_SENTINEL should not parse\n", "utf8");
  await writeFile(join(packageRoot, "server.mjs"), invalidSource);
  const manifestPath = join(packageRoot, "package-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const serverPayload = manifest.payloads.find((payload) => payload.path === "server.mjs");
  serverPayload.byteLength = invalidSource.byteLength;
  serverPayload.sha256 = sha256(invalidSource);
  const rewrittenManifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(manifestPath, rewrittenManifestBytes);
  const run = spawnSync(process.execPath, [join(packageRoot, "coordinator-launch.mjs")], {
    cwd: packageRoot,
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
    env: packageLauncherEnv(packageResult, {
      HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256: sha256(rewrittenManifestBytes)
    })
  });
  assert.notEqual(run.status, 0);
  assert.equal(run.stderr.trim(), "PILOT_LAUNCH_REJECTED；现场保留。");
  assert.doesNotMatch(run.stderr, /PRIVATE_IMPORT_SENTINEL|file:\/\//u);
  assert.doesNotMatch(run.stderr, new RegExp(temporaryRoot.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
});

test("a physical A package server cannot serve a B entry", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-pilot-server-package-test-"));
  t.after(async () => {
    const resolved = resolve(temporaryRoot);
    assert.ok(resolved.startsWith(resolve(tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const outputRoot = join(temporaryRoot, "seat-a");
  await buildSeatPackage({ seatId: "A", reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: outputRoot });
  const server = createPilotServer({ entry: "seat-a.html", sourceRoot: outputRoot });
  const port = await listen(server);
  t.after(() => close(server));
  assert.equal((await httpCall({ port, path: "/seat-a.html" })).status, 200);
  assert.equal((await httpCall({ port, path: "/seat-b.html" })).status, 404);
});

test("builds one paired cycle whose physical A/B subpackages remain mutually separate", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-pilot-pair-test-"));
  t.after(async () => {
    const resolved = resolve(temporaryRoot);
    assert.ok(resolved.startsWith(resolve(tmpdir())));
    await rm(resolved, { recursive: true, force: true });
  });
  const pairRoot = join(temporaryRoot, "pair");
  const pair = await buildPairedSeatPackages({ reviewCycleId: REVIEW_CYCLE_ID, outputDirectory: pairRoot });
  assert.equal(pair.pairManifest.reviewCycleId, REVIEW_CYCLE_ID);
  assert.equal(pair.pairManifest.distributionAuthorized, false);
  assert.equal(pair.pairManifest.formalConversionAllowed, false);
  assert.equal(pair.pairManifest.trustedBootstrapEstablished, false);
  assert.equal(pair.pairManifest.packageAuthenticityEstablished, false);
  assert.equal(pair.pairManifest.pinProvenanceVerified, false);
  assert.equal(pair.pairManifest.signature, false);
  assert.equal(pair.pairManifest.samePrivilegeIntervalMutationExcluded, false);
  assert.equal(pair.pairManifest.samePackagePinFileIsTrustRoot, false);
  assert.equal(pair.pairManifest.realPersonDistributionReady, false);
  assert.equal(pair.pairManifest.sameCycleReplayExcluded, false);
  assert.equal(pair.pairManifest.alternateDataStreamsEnumerated, false);
  assert.equal(pair.pairManifest.alternateDataStreamsExcluded, false);
  assert.equal(pair.pairManifest.samePrivilegeConcurrentMutationExcluded, false);
  assert.equal(pair.pairManifest.atomicSessionCleanupEstablished, false);
  assert.equal(pair.pairManifest.atomicObservationWriteEstablished, false);
  assert.deepEqual(pair.pairManifest.manifestPinCandidatesForExternalRecording.map((entry) => ({
    seatId: entry.seatId,
    pin: entry.packageManifestRawSha256,
    provenance: entry.pinProvenanceVerified,
    signature: entry.signature,
    intervalMutation: entry.samePrivilegeIntervalMutationExcluded,
    distributionReady: entry.realPersonDistributionReady,
    samePackageTrust: entry.samePackagePinFileIsTrustRoot
  })), [
    { seatId: "A", pin: pair.seatA.packageManifestRawSha256, provenance: false, signature: false, intervalMutation: false, distributionReady: false, samePackageTrust: false },
    { seatId: "B", pin: pair.seatB.packageManifestRawSha256, provenance: false, signature: false, intervalMutation: false, distributionReady: false, samePackageTrust: false }
  ]);
  assert.deepEqual(pair.pairManifest.seatPackages.map((entry) => entry.seatId), ["A", "B"]);
  assert.equal(pair.seatA.manifest.reviewCycleId, pair.seatB.manifest.reviewCycleId);
  assert.notEqual(pair.seatA.packageManifestRawSha256, pair.seatB.packageManifestRawSha256);
  assert.equal((await listFiles(join(pairRoot, "seat-a"))).includes("seat-b.html"), false);
  assert.equal((await listFiles(join(pairRoot, "seat-b"))).includes("seat-a.html"), false);
});

test("refuses every physical package build without a legal opaque review cycle", async () => {
  await assert.rejects(() => buildSeatPackage({ seatId: "A" }), /reviewCycleId/u);
  await assert.rejects(() => buildSeatPackage({ seatId: "A", reviewCycleId: "pilot-review-cycle.unassigned" }), /reviewCycleId/u);
  await assert.rejects(() => buildPairedSeatPackages({ reviewCycleId: `pilot-review-cycle.${"G".repeat(64)}` }), /reviewCycleId/u);
});
