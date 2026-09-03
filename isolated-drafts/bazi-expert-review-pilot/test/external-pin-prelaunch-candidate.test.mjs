import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import {
  PilotExternalPinPrelaunchCandidateError,
  buildPilotPackageLaunchSpecCandidate,
  preflightPilotPackageWithExplicitPinCandidate,
  runPilotExternalPinPrelaunchCandidateCli
} from "../external-pin-prelaunch-candidate.mjs";
import { buildSeatPackage } from "../package-builder.mjs";

const REVIEW_CYCLE_A = `pilot-review-cycle.${"a".repeat(64)}`;
const REVIEW_CYCLE_B = `pilot-review-cycle.${"b".repeat(64)}`;
const SOURCE_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const POWERSHELL = join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const WRAPPER_PATH = join(SOURCE_ROOT, "external-pin-prelaunch-candidate.ps1");

function wrapperArguments(coreArguments) {
  return [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", WRAPPER_PATH,
    ...coreArguments
  ];
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function makeTemporaryRoot(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(async () => {
    const canonical = resolve(root);
    assert.ok(canonical.startsWith(resolve(tmpdir())));
    await rm(canonical, { recursive: true, force: true });
  });
  return root;
}

function requestFor(packageResult, overrides = {}) {
  return {
    packageRoot: packageResult.outputDirectory,
    expectedManifestRawSha256: packageResult.packageManifestRawSha256,
    expectedSeatId: packageResult.seatId,
    expectedReviewCycleId: packageResult.reviewCycleId,
    ...overrides
  };
}

async function rewritePayloadAndManifest(packageRoot, relativePath, bytes) {
  await writeFile(join(packageRoot, relativePath), bytes);
  const manifestPath = join(packageRoot, "package-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const payload = manifest.payloads.find((entry) => entry.path === relativePath);
  assert.ok(payload, relativePath);
  payload.byteLength = bytes.byteLength;
  payload.sha256 = sha256(bytes);
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(manifestPath, manifestBytes);
  return sha256(manifestBytes);
}

async function assertMarkerMissing(markerPath) {
  await assert.rejects(() => readFile(markerPath), (error) => error?.code === "ENOENT");
}

test("source-tree candidate validates an explicit raw manifest pin and emits only an untrusted launch capability", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-external-pin-success-");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });

  const preflight = await preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult));
  assert.equal(preflight.canonicalPackageRoot, resolve(packageResult.outputDirectory));
  assert.equal(preflight.checks.callerExplicitManifestPinMatched, true);
  assert.equal(preflight.checks.sourceTreeVerifierPayloadSetAndHashesMatched, true);
  assert.equal(preflight.checks.packageLauncherSyntaxCheckedWithoutExecution, true);
  assert.equal(preflight.checks.packageLocalJavaScriptImportedOrEvaluatedByPreflightImplementation, false);
  assert.equal(preflight.boundary.pinProvenanceVerified, false);
  assert.equal(preflight.boundary.signature, false);
  assert.equal(preflight.boundary.sourceCoordinatorAuthenticityEstablished, false);
  assert.equal(preflight.boundary.directNodeCoreStartupPreloadExcluded, false);
  assert.equal(preflight.boundary.samePrivilegeIntervalMutationExcluded, false);
  assert.equal(preflight.boundary.samePackagePinFileIsTrustRoot, false);
  assert.equal(preflight.boundary.realPersonDistributionReady, false);
  assert.equal(preflight.boundary.distributionAuthorized, false);
  assert.equal(preflight.boundary.countsTowardFormal2of2, false);

  const spec = buildPilotPackageLaunchSpecCandidate(preflight);
  assert.equal(spec.executable, process.execPath);
  assert.deepEqual(spec.args, [join(resolve(packageResult.outputDirectory), "coordinator-launch.mjs")]);
  assert.equal(spec.options.cwd, resolve(packageResult.outputDirectory));
  assert.equal(spec.options.shell, false);
  assert.equal(spec.options.stdio, "inherit");
  assert.equal(spec.options.env.HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256, packageResult.packageManifestRawSha256);
  assert.equal(spec.options.env.HAKIMI_PILOT_EXPECTED_SEAT, "A");
  assert.equal(spec.options.env.HAKIMI_PILOT_EXPECTED_REVIEW_CYCLE, REVIEW_CYCLE_A);
  assert.equal(spec.options.env.HAKIMI_PILOT_PIN_PROVENANCE_VERIFIED, "false");
  assert.equal(Object.hasOwn(spec.options.env, "NODE_OPTIONS"), false);
  assert.equal(Object.hasOwn(spec.options.env, "npm_config_node_options"), false);

  const execPathDescriptor = Object.getOwnPropertyDescriptor(process, "execPath");
  assert.ok(execPathDescriptor?.configurable);
  try {
    Object.defineProperty(process, "execPath", {
      ...execPathDescriptor,
      value: join(temporaryRoot, "attacker-selected.exe")
    });
    assert.equal(buildPilotPackageLaunchSpecCandidate(preflight).executable, spec.executable);
  } finally {
    Object.defineProperty(process, "execPath", execPathDescriptor);
  }

  assert.throws(
    () => buildPilotPackageLaunchSpecCandidate(structuredClone(preflight)),
    (error) => error instanceof PilotExternalPinPrelaunchCandidateError
      && error.code === "PREFLIGHT_CAPABILITY_INVALID"
  );
  const weakSetHasDescriptor = Object.getOwnPropertyDescriptor(WeakSet.prototype, "has");
  assert.ok(weakSetHasDescriptor?.configurable);
  try {
    Object.defineProperty(WeakSet.prototype, "has", {
      ...weakSetHasDescriptor,
      value: () => true
    });
    assert.throws(
      () => buildPilotPackageLaunchSpecCandidate(structuredClone(preflight)),
      (error) => error instanceof PilotExternalPinPrelaunchCandidateError
        && error.code === "PREFLIGHT_CAPABILITY_INVALID"
    );
  } finally {
    Object.defineProperty(WeakSet.prototype, "has", weakSetHasDescriptor);
  }
  assert.equal(packageResult.files.includes("external-pin-prelaunch-candidate.mjs"), false);
});

test("missing, malformed, and wrong pins fail without launching package code", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-external-pin-invalid-");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  for (const invalidPin of [undefined, "", "A".repeat(64), "0".repeat(64)]) {
    await assert.rejects(
      () => preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult, {
        expectedManifestRawSha256: invalidPin
      })),
      (error) => error instanceof PilotExternalPinPrelaunchCandidateError
        && new Set(["MANIFEST_PIN_INVALID", "MANIFEST_PIN_MISMATCH"]).has(error.code)
    );
  }
});

test("payload drift is rejected by the source verifier before a package-local top-level marker executes", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-external-pin-drift-");
  const markerPath = join(temporaryRoot, "marker.txt");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  await writeFile(
    join(packageResult.outputDirectory, "coordinator-launch.mjs"),
    `import { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(markerPath)}, "executed");\n`,
    "utf8"
  );

  await assert.rejects(
    () => preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult)),
    (error) => error instanceof PilotExternalPinPrelaunchCandidateError && error.code === "PACKAGE_INVALID"
  );
  await assertMarkerMissing(markerPath);
});

test("a recomputed self-consistent manifest still fails against the separately supplied old pin before marker execution", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-external-pin-resigned-");
  const markerPath = join(temporaryRoot, "marker.txt");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  const maliciousLauncher = Buffer.from(
    `import { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(markerPath)}, "executed");\n`,
    "utf8"
  );
  const recomputedManifestPin = await rewritePayloadAndManifest(
    packageResult.outputDirectory,
    "coordinator-launch.mjs",
    maliciousLauncher
  );
  assert.notEqual(recomputedManifestPin, packageResult.packageManifestRawSha256);

  await assert.rejects(
    () => preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult)),
    (error) => error instanceof PilotExternalPinPrelaunchCandidateError && error.code === "MANIFEST_PIN_MISMATCH"
  );
  await assertMarkerMissing(markerPath);
});

test("a pinned but syntactically invalid package launcher is rejected without leaking its source or executing it", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-external-pin-syntax-");
  const markerPath = join(temporaryRoot, "syntax-marker.txt");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  const invalidLauncher = Buffer.from(
    `const PRIVATE_LAUNCHER_SOURCE_SENTINEL = ;\nawait import("node:fs/promises").then(({ writeFile }) => writeFile(${JSON.stringify(markerPath)}, "executed"));\n`,
    "utf8"
  );
  const recomputedManifestPin = await rewritePayloadAndManifest(
    packageResult.outputDirectory,
    "coordinator-launch.mjs",
    invalidLauncher
  );
  let rejection;
  try {
    await preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult, {
      expectedManifestRawSha256: recomputedManifestPin
    }));
  } catch (error) {
    rejection = error;
  }
  assert.ok(rejection instanceof PilotExternalPinPrelaunchCandidateError);
  assert.equal(rejection.code, "PACKAGE_LAUNCHER_SYNTAX_INVALID");
  assert.doesNotMatch(rejection.message, /PRIVATE_LAUNCHER_SOURCE_SENTINEL|syntax-marker|file:\/\//u);
  const cli = spawnSync(POWERSHELL, wrapperArguments([
    "--package-root", packageResult.outputDirectory,
    "--manifest-sha256", recomputedManifestPin,
    "--seat", "A",
    "--review-cycle", REVIEW_CYCLE_A
  ]), {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true
  });
  assert.notEqual(cli.status, 0);
  assert.equal(cli.stderr.trim(), "PILOT_EXTERNAL_PIN_PRELAUNCH_REJECTED PACKAGE_LAUNCHER_SYNTAX_INVALID");
  assert.doesNotMatch(cli.stderr, /PRIVATE_LAUNCHER_SOURCE_SENTINEL|syntax-marker|file:\/\//u);
  await assertMarkerMissing(markerPath);
});

test("the supported no-profile wrapper clears hostile Node preload options before the candidate core starts", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-wrapper-preload-");
  const markerPath = join(temporaryRoot, "preload-marker.txt");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  const returnedRoot = join(packageResult.outputDirectory, "returned-materials");
  await mkdir(returnedRoot);
  const preloadPath = join(returnedRoot, "package-local-preload.mjs");
  await writeFile(
    preloadPath,
    `import { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(markerPath)}, "executed-before-preflight");\n`,
    "utf8"
  );
  const run = spawnSync(POWERSHELL, wrapperArguments([
    "--package-root", packageResult.outputDirectory,
    "--manifest-sha256", "0".repeat(64),
    "--seat", "A",
    "--review-cycle", REVIEW_CYCLE_A
  ]), {
    cwd: SOURCE_ROOT,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import=${pathToFileURL(preloadPath).href}`,
      NODE_PATH: packageResult.outputDirectory,
      npm_config_node_options: `--import=${pathToFileURL(preloadPath).href}`
    },
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true
  });
  assert.notEqual(run.status, 0);
  assert.equal(run.stderr.trim(), "PILOT_EXTERNAL_PIN_PRELAUNCH_REJECTED MANIFEST_PIN_MISMATCH");
  assert.doesNotMatch(run.stderr, /package-local-preload|preload-marker|file:\/\//u);
  await assertMarkerMissing(markerPath);
});

test("direct Node execution of the candidate core is refused because startup preload exclusion cannot be proven there", () => {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  delete env.npm_config_node_options;
  delete env.NPM_CONFIG_NODE_OPTIONS;
  delete env.HAKIMI_PILOT_SOURCE_WRAPPER_CANDIDATE;
  const run = spawnSync(process.execPath, [join(SOURCE_ROOT, "external-pin-prelaunch-candidate.mjs")], {
    cwd: SOURCE_ROOT,
    env,
    encoding: "utf8",
    timeout: 10_000,
    windowsHide: true
  });
  assert.notEqual(run.status, 0);
  assert.equal(run.stderr.trim(), "PILOT_EXTERNAL_PIN_PRELAUNCH_REJECTED SOURCE_WRAPPER_REQUIRED");
});

test("seat and review-cycle expectations cannot be crossed even when the manifest pin is correct", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-external-pin-binding-");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  await assert.rejects(
    () => preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult, { expectedSeatId: "B" })),
    (error) => error instanceof PilotExternalPinPrelaunchCandidateError && error.code === "SEAT_MISMATCH"
  );
  await assert.rejects(
    () => preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult, { expectedReviewCycleId: REVIEW_CYCLE_B })),
    (error) => error instanceof PilotExternalPinPrelaunchCandidateError && error.code === "REVIEW_CYCLE_MISMATCH"
  );
});

test("strict CLI rejects unknown, duplicate, extra, and option-shaped parameter injection before launch", async () => {
  const valid = [
    "--package-root", "C:\\outside-package",
    "--manifest-sha256", "a".repeat(64),
    "--seat", "A",
    "--review-cycle", REVIEW_CYCLE_A
  ];
  const cases = [
    [...valid, "--unknown", "value"],
    ["--package-root", "C:\\outside-package", "--manifest-sha256", "a".repeat(64), "--seat", "A", "--seat", "A"],
    ["--package-root", "--seat", "--manifest-sha256", "a".repeat(64), "--seat", "A", "--review-cycle", REVIEW_CYCLE_A],
    ["--package-root", "C:\\outside-package", "--manifest-sha256", "a".repeat(64), "--seat", "A", "--unknown", REVIEW_CYCLE_A]
  ];
  for (const args of cases) {
    await assert.rejects(
      () => runPilotExternalPinPrelaunchCandidateCli(args),
      (error) => error instanceof PilotExternalPinPrelaunchCandidateError && error.code === "REQUEST_INVALID"
    );
  }
});

test("a pin file stored inside the seat package is rejected as an unapproved endpoint, not accepted as a trust root", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-external-pin-same-package-");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  await writeFile(
    join(packageResult.outputDirectory, "manifest-pin.txt"),
    `${packageResult.packageManifestRawSha256}\n`,
    "utf8"
  );
  await assert.rejects(
    () => preflightPilotPackageWithExplicitPinCandidate(requestFor(packageResult)),
    (error) => error instanceof PilotExternalPinPrelaunchCandidateError && error.code === "PACKAGE_INVALID"
  );
});

test("package launcher rejects missing or wrong external pin environment before dynamically importing a marked payload", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-package-pin-env-");
  const markerPath = join(temporaryRoot, "server-marker.txt");
  const packageResult = await buildSeatPackage({
    seatId: "A",
    reviewCycleId: REVIEW_CYCLE_A,
    outputDirectory: join(temporaryRoot, "seat-a")
  });
  const markedServer = Buffer.from(
    `import { writeFile } from "node:fs/promises";\nawait writeFile(${JSON.stringify(markerPath)}, "executed");\nexport const createPilotServer = () => { throw new Error("marker"); };\n`,
    "utf8"
  );
  const recomputedPin = await rewritePayloadAndManifest(packageResult.outputDirectory, "server.mjs", markedServer);
  const baseEnv = {
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256: recomputedPin,
    HAKIMI_PILOT_EXPECTED_SEAT: "A",
    HAKIMI_PILOT_EXPECTED_REVIEW_CYCLE: REVIEW_CYCLE_A,
    HAKIMI_PILOT_PIN_PROVENANCE_VERIFIED: "false"
  };
  for (const env of [
    { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR },
    { ...baseEnv, HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256: "0".repeat(64) },
    { ...baseEnv, HAKIMI_PILOT_EXPECTED_SEAT: "B" },
    { ...baseEnv, HAKIMI_PILOT_EXPECTED_REVIEW_CYCLE: REVIEW_CYCLE_B }
  ]) {
    const run = spawnSync(process.execPath, [join(packageResult.outputDirectory, "coordinator-launch.mjs")], {
      cwd: packageResult.outputDirectory,
      env,
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true
    });
    assert.notEqual(run.status, 0);
    assert.equal(run.stderr.trim(), "PILOT_LAUNCH_REJECTED；现场保留。");
    assert.doesNotMatch(run.stderr, /server-marker|file:\/\//u);
    await assertMarkerMissing(markerPath);
  }
});

test("pair builder CLI prints distinct A/B manifest pin candidates while keeping every trust claim false", async (t) => {
  const temporaryRoot = await makeTemporaryRoot(t, "hakimi-bazi-pair-pin-output-");
  const pairRoot = join(temporaryRoot, "pair");
  const run = spawnSync(process.execPath, [
    join(SOURCE_ROOT, "package-builder.mjs"),
    "--pair",
    "--review-cycle", REVIEW_CYCLE_A,
    "--output", pairRoot
  ], {
    cwd: SOURCE_ROOT,
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true
  });
  assert.equal(run.status, 0, run.stderr);
  const pairManifest = JSON.parse(await readFile(join(pairRoot, "PAIR-MANIFEST.json"), "utf8"));
  const [seatA, seatB] = pairManifest.manifestPinCandidatesForExternalRecording;
  assert.match(run.stdout, new RegExp(`PIN-CANDIDATE A ${seatA.packageManifestRawSha256}`, "u"));
  assert.match(run.stdout, new RegExp(`PIN-CANDIDATE B ${seatB.packageManifestRawSha256}`, "u"));
  assert.match(run.stdout, /pinProvenanceVerified=false signature=false samePrivilegeIntervalMutationExcluded=false samePackagePinFileIsTrustRoot=false realPersonDistributionReady=false/u);
  assert.notEqual(seatA.packageManifestRawSha256, seatB.packageManifestRawSha256);
  assert.equal(pairManifest.pinProvenanceVerified, false);
  assert.equal(pairManifest.signature, false);
  assert.equal(pairManifest.samePrivilegeIntervalMutationExcluded, false);
  assert.equal(pairManifest.samePackagePinFileIsTrustRoot, false);
  assert.equal(pairManifest.realPersonDistributionReady, false);
  for (const candidate of pairManifest.manifestPinCandidatesForExternalRecording) {
    assert.equal(candidate.pinProvenanceVerified, false);
    assert.equal(candidate.signature, false);
    assert.equal(candidate.samePrivilegeIntervalMutationExcluded, false);
    assert.equal(candidate.samePackagePinFileIsTrustRoot, false);
    assert.equal(candidate.realPersonDistributionReady, false);
  }
});
