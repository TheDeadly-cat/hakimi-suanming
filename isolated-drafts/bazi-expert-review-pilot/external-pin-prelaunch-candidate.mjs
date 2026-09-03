import { spawn, spawnSync } from "node:child_process";
import { realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PILOT_REVIEW_CYCLE_ID_PATTERN } from "./contract.js";
import { inspectPilotSeatPackage } from "./return-verifier.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_COORDINATOR_ROOT = await realpath(dirname(MODULE_PATH));
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SOURCE_WRAPPER_MARKER = "powershell-no-profile-node-startup-options-cleared-candidate-v1";
const ALLOWED_OPTIONS = Object.freeze([
  "--package-root",
  "--manifest-sha256",
  "--seat",
  "--review-cycle"
]);
const CHILD_ENV_KEYS = Object.freeze([
  "SystemRoot",
  "WINDIR",
  "ProgramFiles",
  "ProgramFiles(x86)",
  "LOCALAPPDATA",
  "TEMP",
  "TMP"
]);
const NODE_EXECUTABLE = process.execPath;
const INITIAL_NODE_EXEC_ARGV = Object.freeze([...process.execArgv]);
const INITIAL_PLATFORM_ENVIRONMENT = Object.freeze(Object.fromEntries(
  CHILD_ENV_KEYS.flatMap((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.length > 0 ? [[key, value]] : [];
  })
));
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const VERIFIED_PREFLIGHT_CAPABILITIES = new WeakSet();

export class PilotExternalPinPrelaunchCandidateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PilotExternalPinPrelaunchCandidateError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new PilotExternalPinPrelaunchCandidateError(code, message);
}

function assertPrimitiveRequest(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) fail("REQUEST_INVALID", "预启动请求无效。 ");
  const keys = Object.keys(input).sort();
  const expected = ["expectedManifestRawSha256", "expectedReviewCycleId", "expectedSeatId", "packageRoot"].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    fail("REQUEST_INVALID", "预启动请求字段集合无效。 ");
  }
  if (typeof input.packageRoot !== "string" || input.packageRoot.length < 1 || input.packageRoot.length > 2_000
    || input.packageRoot.includes("\0") || !isAbsolute(input.packageRoot)) {
    fail("PACKAGE_ROOT_INVALID", "package root 必须是长度受限的绝对路径。 ");
  }
  if (typeof input.expectedManifestRawSha256 !== "string" || !SHA256_PATTERN.test(input.expectedManifestRawSha256)) {
    fail("MANIFEST_PIN_INVALID", "必须显式提供 64 位小写十六进制 manifest raw SHA-256。 ");
  }
  if (input.expectedSeatId !== "A" && input.expectedSeatId !== "B") fail("SEAT_MISMATCH", "expected seat 无效。 ");
  if (typeof input.expectedReviewCycleId !== "string"
    || !PILOT_REVIEW_CYCLE_ID_PATTERN.test(input.expectedReviewCycleId)) {
    fail("REVIEW_CYCLE_MISMATCH", "expected review cycle 无效。 ");
  }
  return Object.freeze({ ...input });
}

function packageIsOutsideSourceTree(canonicalPackageRoot) {
  const relation = relative(SOURCE_COORDINATOR_ROOT, canonicalPackageRoot);
  return relation !== "" && (relation.startsWith("..") || isAbsolute(relation));
}

function fixedPlatformEnvironment() {
  return { ...INITIAL_PLATFORM_ENVIRONMENT };
}

function assertPackageLauncherSyntaxWithoutExecution(canonicalPackageRoot) {
  let result;
  try {
    result = spawnSync(NODE_EXECUTABLE, ["--check", join(canonicalPackageRoot, "coordinator-launch.mjs")], {
      cwd: canonicalPackageRoot,
      env: fixedPlatformEnvironment(),
      shell: false,
      stdio: "ignore",
      windowsHide: true,
      timeout: 10_000
    });
  } catch {
    fail("PACKAGE_LAUNCHER_SYNTAX_INVALID", "package launcher 语法预检失败。 ");
  }
  if (result.error || result.signal !== null || result.status !== 0) {
    fail("PACKAGE_LAUNCHER_SYNTAX_INVALID", "package launcher 语法预检失败。 ");
  }
}

export async function preflightPilotPackageWithExplicitPinCandidate(input) {
  const request = assertPrimitiveRequest(input);
  let canonicalPackageRoot;
  try {
    canonicalPackageRoot = await realpath(resolve(request.packageRoot));
  } catch {
    fail("PACKAGE_ROOT_INVALID", "package root 不可用。 ");
  }
  if (!packageIsOutsideSourceTree(canonicalPackageRoot)) {
    fail("PACKAGE_ROOT_INVALID", "package root 必须位于源码侧候选协调器之外。 ");
  }
  let inspection;
  try {
    inspection = await inspectPilotSeatPackage(canonicalPackageRoot);
  } catch {
    fail("PACKAGE_INVALID", "源码侧 payload 预检未通过。 ");
  }
  if (inspection.manifestRawSha256 !== request.expectedManifestRawSha256) {
    fail("MANIFEST_PIN_MISMATCH", "显式 manifest pin 与实体单席包不匹配。 ");
  }
  if (inspection.manifest.seatId !== request.expectedSeatId) {
    fail("SEAT_MISMATCH", "实体单席包与 expected seat 不匹配。 ");
  }
  if (inspection.manifest.reviewCycleId !== request.expectedReviewCycleId) {
    fail("REVIEW_CYCLE_MISMATCH", "实体单席包与 expected review cycle 不匹配。 ");
  }
  assertPackageLauncherSyntaxWithoutExecution(canonicalPackageRoot);
  const preflight = Object.freeze({
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_pilot_external_pin_prelaunch_candidate_v1",
    candidateOnly: true,
    authorityEffect: "none",
    canonicalPackageRoot: inspection.canonicalRoot,
    reviewCycleId: inspection.manifest.reviewCycleId,
    seatId: inspection.manifest.seatId,
    packageManifestRawSha256: inspection.manifestRawSha256,
    checks: Object.freeze({
      callerExplicitManifestPinMatched: true,
      sourceTreeVerifierPayloadSetAndHashesMatched: true,
      packageLauncherSyntaxCheckedWithoutExecution: true,
      packageLocalJavaScriptImportedOrEvaluatedByPreflightImplementation: false,
      packageLauncherEligibleForCandidateStart: true
    }),
    boundary: Object.freeze({
      pinProvenanceVerified: false,
      signature: false,
      trustedBootstrapEstablished: false,
      sourceCoordinatorAuthenticityEstablished: false,
      directNodeCoreStartupPreloadExcluded: false,
      packageAuthenticityEstablished: false,
      samePrivilegeIntervalMutationExcluded: false,
      samePackagePinFileIsTrustRoot: false,
      realPersonDistributionReady: false,
      distributionAuthorized: false,
      countsTowardFormal2of2: false,
      countsTowardExpertGate: false,
      formalConversionAllowed: false
    })
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_PREFLIGHT_CAPABILITIES, [preflight]);
  return preflight;
}

function fixedChildEnvironment(preflight) {
  const environment = fixedPlatformEnvironment();
  environment.HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256 = preflight.packageManifestRawSha256;
  environment.HAKIMI_PILOT_EXPECTED_SEAT = preflight.seatId;
  environment.HAKIMI_PILOT_EXPECTED_REVIEW_CYCLE = preflight.reviewCycleId;
  environment.HAKIMI_PILOT_PIN_PROVENANCE_VERIFIED = "false";
  return Object.freeze(environment);
}

export function buildPilotPackageLaunchSpecCandidate(preflight) {
  if (!preflight || !REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_PREFLIGHT_CAPABILITIES, [preflight])
    || preflight.recordType !== "bazi_expert_pilot_external_pin_prelaunch_candidate_v1"
    || preflight.checks?.packageLauncherEligibleForCandidateStart !== true
    || preflight.boundary?.pinProvenanceVerified !== false
    || preflight.boundary?.signature !== false
    || preflight.boundary?.samePrivilegeIntervalMutationExcluded !== false
    || preflight.boundary?.samePackagePinFileIsTrustRoot !== false
    || preflight.boundary?.realPersonDistributionReady !== false) {
    fail("PREFLIGHT_CAPABILITY_INVALID", "预启动候选能力无效。 ");
  }
  return Object.freeze({
    executable: NODE_EXECUTABLE,
    args: Object.freeze([join(preflight.canonicalPackageRoot, "coordinator-launch.mjs")]),
    options: Object.freeze({
      cwd: preflight.canonicalPackageRoot,
      env: fixedChildEnvironment(preflight),
      shell: false,
      stdio: "inherit",
      windowsHide: false
    })
  });
}

function waitForChild(child) {
  return new Promise((resolveChild, rejectChild) => {
    child.once("error", () => rejectChild(new PilotExternalPinPrelaunchCandidateError(
      "PACKAGE_LAUNCH_FAILED",
      "package launcher 启动失败。 "
    )));
    child.once("exit", (code, signal) => resolveChild({ code, signal }));
  });
}

export async function launchPilotPackageWithExplicitPinCandidate(input) {
  const preflight = await preflightPilotPackageWithExplicitPinCandidate(input);
  const spec = buildPilotPackageLaunchSpecCandidate(preflight);
  const child = spawn(spec.executable, spec.args, spec.options);
  const outcome = await waitForChild(child);
  if (outcome.signal !== null || outcome.code !== 0) {
    fail("PACKAGE_LAUNCH_FAILED", "package launcher 未正常完成。 ");
  }
  return Object.freeze({
    completed: true,
    preflight,
    boundary: preflight.boundary
  });
}

function parseCliRequest(args) {
  if (!Array.isArray(args) || args.length !== ALLOWED_OPTIONS.length * 2) {
    fail("REQUEST_INVALID", "必须精确提供 package root、manifest pin、seat 与 review cycle。 ");
  }
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.includes(option) || Object.hasOwn(values, option)
      || typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      fail("REQUEST_INVALID", "预启动参数含未知、重复、缺失或注入形态。 ");
    }
    values[option] = value;
  }
  if (Object.keys(values).length !== ALLOWED_OPTIONS.length) fail("REQUEST_INVALID", "预启动参数不完整。 ");
  return {
    packageRoot: values["--package-root"],
    expectedManifestRawSha256: values["--manifest-sha256"],
    expectedSeatId: values["--seat"],
    expectedReviewCycleId: values["--review-cycle"]
  };
}

export async function runPilotExternalPinPrelaunchCandidateCli(args = process.argv.slice(2)) {
  return launchPilotPackageWithExplicitPinCandidate(parseCliRequest(args));
}

function assertSupportedSourceWrapperCandidate() {
  if (process.env.HAKIMI_PILOT_SOURCE_WRAPPER_CANDIDATE !== SOURCE_WRAPPER_MARKER
    || process.env.NODE_OPTIONS !== undefined
    || process.env.NODE_PATH !== undefined
    || process.env.npm_config_node_options !== undefined
    || process.env.NPM_CONFIG_NODE_OPTIONS !== undefined
    || INITIAL_NODE_EXEC_ARGV.length !== 0) {
    fail("SOURCE_WRAPPER_REQUIRED", "必须由清除 Node 启动预载环境的源码侧 PowerShell 候选入口启动。 ");
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    assertSupportedSourceWrapperCandidate();
    await runPilotExternalPinPrelaunchCandidateCli();
  } catch (error) {
    const code = error instanceof PilotExternalPinPrelaunchCandidateError
      ? error.code
      : "EXTERNAL_PIN_PRELAUNCH_FAILED";
    process.stderr.write(`PILOT_EXTERNAL_PIN_PRELAUNCH_REJECTED ${code}\n`);
    process.exitCode = 1;
  }
}
