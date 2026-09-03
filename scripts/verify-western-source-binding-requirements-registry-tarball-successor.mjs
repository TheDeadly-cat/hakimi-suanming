import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenKeys = ["NODE_OPTIONS", "NODE_PATH"];
const forbiddenPrefixes = ["--experimental-loader", "--import", "--loader", "--require", "-r"];

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function assertInvocation() {
  if (process.argv.length !== 2) fail("ARGUMENTS_FORBIDDEN", "Fixed-path CLI accepts no operands.");
  for (const key of forbiddenKeys) {
    if (typeof process.env[key] === "string") fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI rejects " + key + ".");
  }
  for (const argument of process.execArgv) {
    if (forbiddenPrefixes.some((prefix) => argument === prefix
      || argument.startsWith(prefix + "=") || (prefix === "-r" && argument.startsWith("-r")))) {
      fail("PRELOAD_ENVIRONMENT_FORBIDDEN", "CLI rejects visible preload/loader arguments.");
    }
  }
  if (path.resolve(process.cwd()) !== workspaceRoot) {
    fail("WORKSPACE_ROOT_REQUIRED", "CLI must run from the fixed workspace root.");
  }
}

try {
  assertInvocation();
  const {
    isVerifiedWesternSourceBindingRegistryTarballSuccessor,
    loadWesternSourceBindingRegistryTarballSuccessor
  } = await import("./western-source-binding-requirements-registry-tarball-successor-lib.mjs");
  const result = await loadWesternSourceBindingRegistryTarballSuccessor();
  if (!isVerifiedWesternSourceBindingRegistryTarballSuccessor(result)) {
    fail("PRIVATE_BRAND_MISSING", "v1.4 successor private brand is missing.");
  }
  process.stdout.write("WESTERN_SOURCE_BINDING_REGISTRY_TARBALL_SUCCESSOR_OK " + JSON.stringify({
    ledgerId: result.ledgerId,
    ledgerDigest: result.ledgerDigest,
    parentV13PrivateBrandVerified: result.parentV13PrivateBrandVerified,
    successorIsFormalCurrent: result.successorIsFormalCurrent,
    successorActiveEffect: result.successorActiveEffect,
    partialCandidates: result.currentPartialCandidatesAttached,
    bindings: result.bindingFrozenVerified + "/" + result.bindingRequired,
    subjectFullySatisfied: result.subjectFullySatisfied,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    releaseReady: result.releaseReady,
    publicReleaseAuthorized: result.publicReleaseAuthorized
  }) + "\n");
} catch (reason) {
  process.stderr.write(JSON.stringify({
    ok: false,
    code: typeof reason?.code === "string" ? reason.code : "VERIFY_FAILED",
    message: reason?.safeForCli === true || typeof reason?.code === "string"
      ? reason.message : "Western v1.4 source-binding verification failed."
  }) + "\n");
  process.exitCode = 1;
}
