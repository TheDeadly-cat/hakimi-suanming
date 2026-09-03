import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenEnvironmentKeys = ["NODE_OPTIONS", "NODE_PATH"];
const forbiddenPrefixes = ["--experimental-loader", "--import", "--loader", "--require", "-r"];

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function forbidden(argument) {
  return forbiddenPrefixes.some((prefix) => argument === prefix
    || argument.startsWith(prefix + "=") || (prefix === "-r" && argument.startsWith("-r")));
}

function assertInvocation() {
  if (process.argv.length !== 2) fail("ARGUMENTS_FORBIDDEN", "Fixed-path CLI accepts no operands.");
  for (const key of forbiddenEnvironmentKeys) {
    if (typeof process.env[key] === "string") fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI rejects " + key + ".");
  }
  if (process.execArgv.some(forbidden)) {
    fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI rejects visible preload/loader arguments.");
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    fail("WORKSPACE_ROOT_REQUIRED", "CLI must run from the fixed workspace root.");
  }
}

try {
  assertInvocation();
  const {
    isVerifiedWesternRegistryTarballParityChild,
    loadWesternRegistryTarballParityChild
  } = await import("./western-registry-tarball-parity-observation-child-lib.mjs");
  const result = await loadWesternRegistryTarballParityChild();
  if (!isVerifiedWesternRegistryTarballParityChild(result)) {
    fail("PRIVATE_BRAND_MISSING", "Registry-tarball child private brand is missing.");
  }
  process.stdout.write("WESTERN_REGISTRY_TARBALL_PARITY_CHILD_OK " + JSON.stringify({
    childId: result.childId,
    childDigest: result.childDigest,
    packages: Array.prototype.map.call(
      result.child.packages,
      (item) => item.packageName + "@" + item.version
    ),
    tarballBytes: Array.prototype.map.call(
      result.child.packages,
      (item) => item.tarball.rawBytes
    ),
    metadataAndTarballParity: result.child.gateSummary.metadataIntegrityAndShasumParityObserved,
    packageLockParity: result.child.gateSummary.packageLockResolvedAndIntegrityParityObserved,
    astronomyStandaloneTarballLicenseMembers: result.child.gateSummary.astronomyTarballStandaloneLicenseMembersObserved,
    bindings: result.bindingFrozenVerified + "/" + result.bindingRequired,
    partialCandidates: result.currentPartialCandidatesAttached,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    releaseReady: result.releaseReady,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (reason) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: typeof reason?.code === "string" ? reason.code : "VERIFY_FAILED",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message : "Western registry-tarball child verification failed."
  }) + "\n");
  process.exitCode = 1;
}
