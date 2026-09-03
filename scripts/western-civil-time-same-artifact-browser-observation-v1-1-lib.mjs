import { createHash } from "node:crypto";
import {
  closeSync, fstatSync, lstatSync, openSync, readFileSync, realpathSync
} from "node:fs";
import path from "node:path";

import {
  WESTERN_SAME_ARTIFACT_CANDIDATE_PATH,
  collectWesternAuthoredBuildSourceSnapshot,
  collectWesternLockedBuildInputSnapshot,
  isVerifiedWesternSameArtifactCandidate,
  loadWesternSameArtifactCandidate,
  summarizeWesternSameArtifactCandidate,
  westernSameArtifactTestOnly
} from "./western-civil-time-same-artifact-browser-observation-lib.mjs";

export const WESTERN_SAME_ARTIFACT_V11_CANDIDATE_PATH =
  "content/system-admission/western-civil-time-same-artifact-browser-observation-child.v1.1.0.json";
export const WESTERN_SAME_ARTIFACT_V11_CHILD_ID =
  "hakimi.western.civil-time.same-artifact-edge-chrome-observation/1.1.0";

const DIGEST_DOMAIN = "hakimi.western.civil-time.same-artifact-browser-observation-child.v1.1\0";
const TOOL_GRAPH_DOMAIN = "hakimi.western.civil-time.same-artifact-v1.1-tool-graph\0";
const OUTPUT_TREE_DOMAIN = "hakimi.western.civil-time.same-artifact-output-tree.v1\0";
const SHA256 = /^[a-f0-9]{64}$/u;
const VERSION = /^\d+(?:\.\d+){1,3}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const BRAND = new WeakSet();

export const WESTERN_SAME_ARTIFACT_V11_TOOL_PATHS = Object.freeze([
  "scripts/western-civil-time-same-artifact-browser-observation-v1-1-lib.mjs",
  "scripts/run-western-civil-time-same-artifact-browser-observation-v1-1.mjs",
  "scripts/render-western-civil-time-same-artifact-browser-observation-v1-1-candidate.mjs",
  "scripts/verify-western-civil-time-same-artifact-browser-observation-v1-1.mjs",
  "scripts/verify-western-civil-time-same-artifact-browser-observation-v1-1.test.mjs",
  "scripts/verify-western-civil-time-same-artifact-v1-1-config-cwd.test.mjs",
  "scripts/western-civil-time-same-artifact-browser-observation-lib.mjs",
  "isolated-drafts/western-civil-time-fact-browser-draft/vite.config.mjs",
  "isolated-drafts/western-civil-time-fact-browser-draft/vite.same-artifact-evidence.config.mjs",
  "isolated-drafts/western-civil-time-fact-browser-draft/playwright.same-artifact-evidence-v1-1.config.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/e2e/civil-time-browser-gate.spec.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/e2e/civil-time-browser-gate-v1-1.spec.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/e2e/same-artifact-summary-reporter.ts",
  "isolated-drafts/western-civil-time-fact-browser-draft/e2e/same-artifact-summary-reporter-v1-1.ts",
  "apps/web/node_modules/vite/package.json",
  "apps/web/node_modules/vite/bin/vite.js",
  "node_modules/@playwright/test/package.json",
  "node_modules/@playwright/test/cli.js",
  "node_modules/playwright/package.json",
  "node_modules/playwright/test.js",
  "node_modules/playwright/lib/runner/index.js",
  "node_modules/playwright/lib/worker/workerProcessEntry.js",
  "node_modules/playwright/lib/transform/esmLoader.js",
  "node_modules/playwright-core/package.json",
  "node_modules/playwright-core/browsers.json",
  "node_modules/playwright-core/lib/coreBundle.js",
  "node_modules/playwright-core/lib/serverRegistry.js"
]);

const FALSE_AUTHORITY = Object.freeze({
  contentTruthEstablished: false,
  domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false,
  expertIdentityQualificationIndependenceEstablished: false,
  expertTruthEstablished: false,
  formalAdmissionAuthorized: false,
  highRiskClaimsAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  redistributionAuthorized: false,
  releaseEvidenceComplete: false,
  releaseReady: false,
  rightsLegalConclusionEstablished: false,
  safeToPublish: false
});

export class WesternSameArtifactV11Error extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "WesternSameArtifactV11Error";
    this.code = code;
  }
}

function fail(code, detail = "") { throw new WesternSameArtifactV11Error(code, detail); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}
function compact(value) { return JSON.stringify(canonical(value)); }
function freeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freeze(child, seen);
  return Object.freeze(value);
}
function exactKeys(value, keys, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || compact(Object.keys(value).sort()) !== compact([...keys].sort())) fail(code);
}
function allFalse(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).length === 0 || Object.values(value).some((entry) => entry !== false)) fail(code);
}
function workspaceRoot(root) {
  const resolved = path.resolve(root);
  const real = realpathSync.native(resolved);
  if (process.platform === "win32" ? resolved.toLowerCase() !== real.toLowerCase() : resolved !== real) {
    fail("WORKSPACE_ROOT_IDENTITY_INVALID");
  }
  return real;
}
function identity(root, relativePath) {
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) fail("PATH_ESCAPE", relativePath);
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("FILE_TYPE_INVALID", relativePath);
  const real = realpathSync.native(absolute);
  const same = process.platform === "win32"
    ? real.toLowerCase() === absolute.toLowerCase() : real === absolute;
  if (!same) fail("FILE_REALPATH_INVALID", relativePath);
  const fd = openSync(absolute, "r");
  try {
    const before = fstatSync(fd);
    const bytes = readFileSync(fd);
    const after = fstatSync(fd);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
        || before.mtimeMs !== after.mtimeMs || bytes.byteLength !== before.size) {
      fail("FILE_CHANGED_DURING_READ", relativePath);
    }
    return { path: relativePath, bytes: bytes.byteLength, sha256: sha256(bytes), raw: bytes };
  } finally { closeSync(fd); }
}

export function collectWesternSameArtifactV11ToolSnapshot(root = process.cwd()) {
  const resolved = workspaceRoot(root);
  const files = WESTERN_SAME_ARTIFACT_V11_TOOL_PATHS.map((entry) => {
    const item = identity(resolved, entry);
    return { path: item.path, bytes: item.bytes, sha256: item.sha256 };
  });
  return freeze({
    graphId: "hakimi.western.civil-time.same-artifact-v1.1-evidence-tooling/1",
    fileCount: files.length,
    files,
    graphDigest: sha256(Buffer.from(`${TOOL_GRAPH_DOMAIN}${compact({ files })}`, "utf8"))
  });
}

function normalizeTree(value) {
  exactKeys(value, ["digestAlgorithm", "fileCount", "files", "treeDigest"], "TREE_INVALID");
  if (value.digestAlgorithm !== "sha256-file-tree-v1" || !SHA256.test(value.treeDigest)
      || !Array.isArray(value.files) || value.fileCount !== value.files.length || value.fileCount !== 12) {
    fail("TREE_INVALID");
  }
  const seen = new Set();
  const files = value.files.map((entry) => {
    exactKeys(entry, ["bytes", "path", "sha256"], "TREE_FILE_INVALID");
    if (typeof entry.path !== "string" || entry.path.includes("\\") || entry.path.includes("..")
        || seen.has(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1
        || !SHA256.test(entry.sha256)) fail("TREE_FILE_INVALID");
    seen.add(entry.path);
    return { ...entry };
  });
  const paths = files.map((entry) => entry.path).sort();
  const one = (pattern) => {
    const matches = paths.filter((entry) => pattern.test(entry));
    if (matches.length !== 1) fail("TREE_PATH_SET_INVALID");
    return matches[0];
  };
  const main = one(/^assets\/index-[A-Za-z0-9_-]+\.js$/u);
  const css = one(/^assets\/index-[A-Za-z0-9_-]+\.css$/u);
  const worker = one(/^assets\/civil-worker-[A-Za-z0-9_-]+\.js$/u);
  const iana = one(/^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u);
  const expectedPaths = [
    main, `${main}.map`, css, worker, `${worker}.map`, iana, `${iana}.map`,
    "hakimi-western-fact-only-build-manifest.v1.json", "index.html",
    "licenses/moment-2.30.1-LICENSE.txt",
    "licenses/moment-timezone-0.5.48-retained-LICENSE.txt",
    "licenses/moment-timezone-0.6.3-LICENSE.txt"
  ].sort();
  if (compact(paths) !== compact(expectedPaths)
      || value.treeDigest !== sha256(Buffer.from(`${OUTPUT_TREE_DOMAIN}${compact({ files })}`, "utf8"))) {
    fail("TREE_PATH_OR_DIGEST_INVALID");
  }
  return { digestAlgorithm: value.digestAlgorithm, fileCount: 12, files, treeDigest: value.treeDigest };
}

function normalizeIdentity(entry, projectName, nonceCommitment) {
  exactKeys(entry, [
    "cdpUserAgent", "navigatorUserAgent", "navigatorUserAgentEqualsCdpUserAgent",
    "observationCount", "product", "projectName",
    "projectTokenSha256",
    "protocolVersion", "runNonceCommitment", "schemaVersion"
  ], "MATRIX_IDENTITY_INVALID");
  const product = projectName === "chrome" ? /^Chrome\/(\d+(?:\.\d+){1,3})$/u
    : /^Edg\/(\d+(?:\.\d+){1,3})$/u;
  const match = typeof entry.product === "string" ? entry.product.match(product) : null;
  if (entry.schemaVersion !== "hakimi.western.same-artifact.matrix-browser-identity/1"
      || entry.projectName !== projectName || entry.runNonceCommitment !== nonceCommitment
      || !SHA256.test(entry.projectTokenSha256)
      || entry.observationCount !== 5 || !match
      || typeof entry.protocolVersion !== "string" || !VERSION.test(entry.protocolVersion)
      || typeof entry.cdpUserAgent !== "string" || typeof entry.navigatorUserAgent !== "string"
      || entry.navigatorUserAgentEqualsCdpUserAgent !== (entry.cdpUserAgent === entry.navigatorUserAgent)
      || !entry.cdpUserAgent.includes("HeadlessChrome/")
      || (projectName === "chrome" && (entry.cdpUserAgent.includes(" Edg/")
        || !entry.navigatorUserAgent.includes(" Chrome/")))
      || (projectName === "msedge" && (!entry.cdpUserAgent.includes(" Edg/")
        || !entry.navigatorUserAgent.includes(" Edg/")))) {
    fail("MATRIX_IDENTITY_INVALID", projectName);
  }
  return { ...entry };
}

function normalizeSummary(value, nonceCommitment) {
  exactKeys(value, [
    "configuredProjectNames", "matrixBrowserIdentities", "outcomeCount", "outcomes",
    "overallStatus", "runNonceCommitment", "schemaVersion"
  ], "SUMMARY_INVALID");
  if (value.schemaVersion !== "hakimi.western.same-artifact-playwright-summary/1.1"
      || value.overallStatus !== "passed" || value.runNonceCommitment !== nonceCommitment
      || compact(value.configuredProjectNames) !== compact(["chrome", "msedge"])
      || value.outcomeCount !== 10 || !Array.isArray(value.outcomes) || value.outcomes.length !== 10
      || !Array.isArray(value.matrixBrowserIdentities) || value.matrixBrowserIdentities.length !== 2) {
    fail("SUMMARY_INVALID");
  }
  const expected = new Set();
  for (const projectName of ["chrome", "msedge"])
    for (const scenarioId of ["unique", "gap", "overlap_reject", "overlap_earlier", "overlap_later"])
      expected.add(`${projectName}\0${scenarioId}`);
  for (const outcome of value.outcomes) {
    exactKeys(outcome, ["projectName", "retry", "scenarioId", "status"], "OUTCOME_INVALID");
    const key = `${outcome.projectName}\0${outcome.scenarioId}`;
    if (!expected.delete(key) || outcome.retry !== 0 || outcome.status !== "passed") fail("OUTCOME_INVALID");
  }
  if (expected.size !== 0) fail("OUTCOME_SET_INVALID");
  const identities = ["chrome", "msedge"].map((projectName) => normalizeIdentity(
    value.matrixBrowserIdentities.find((entry) => entry.projectName === projectName),
    projectName,
    nonceCommitment
  ));
  return clone({ ...value, matrixBrowserIdentities: identities });
}

function normalizeProbes(value, identities) {
  if (!Array.isArray(value) || value.length !== 2) fail("PROBES_INVALID");
  return ["chrome", "msedge"].map((projectName) => {
    const entry = value.find((item) => item.projectName === projectName);
    exactKeys(entry, ["channel", "projectName", "versionAfter", "versionBefore"], "PROBE_INVALID");
    const expectedChannel = projectName === "chrome" ? "chrome" : "msedge";
    const matrixIdentity = identities.find((item) => item.projectName === projectName);
    const matrixVersion = matrixIdentity.product.slice(matrixIdentity.product.indexOf("/") + 1);
    if (entry.channel !== expectedChannel || !VERSION.test(entry.versionBefore)
        || entry.versionAfter !== entry.versionBefore || matrixVersion !== entry.versionBefore) {
      fail("PROBE_MATRIX_IDENTITY_MISMATCH", projectName);
    }
    return { ...entry };
  });
}

function normalizeServer(value, tree, nonceCommitment) {
  exactKeys(value, [
    "allServedBodiesMatchedOutputTree", "bodyMismatchResponseCount", "crossProjectTokenRejectedCount",
    "evidenceOnlyOutputBodyProbePaths", "host", "invalidProjectResponseCount",
    "missingCredentialResponseCount", "origin", "outputTreeDigest", "perBrowserServedBodyManifestsEqual",
    "projectHeaderName", "projectTokenCommitments", "rawNoncePersisted", "replayedOrStaleTokenRejectedCount",
    "requiredRuntimePaths", "runNonceCommitment", "scenarioRuntimePaths", "servedArtifactsByProject",
    "servedResponseCount", "singleHeldOutputTreeServedWithoutRebuild", "tokenDerivation",
    "tokenHeaderName", "unexpectedResponseCount"
  ], "SERVER_INVALID");
  if (value.host !== "127.0.0.1" || !/^http:\/\/127\.0\.0\.1:[1-9]\d{0,4}$/u.test(value.origin)
      || value.outputTreeDigest !== tree.treeDigest || value.runNonceCommitment !== nonceCommitment
      || value.projectHeaderName !== "x-hakimi-western-evidence-project"
      || value.tokenHeaderName !== "x-hakimi-western-evidence-run-token"
      || value.tokenDerivation !== "hmac-sha256-256-bit-run-nonce-domain-plus-project-v1"
      || value.rawNoncePersisted !== false || value.missingCredentialResponseCount !== 0
      || value.invalidProjectResponseCount !== 0 || value.crossProjectTokenRejectedCount !== 0
      || value.replayedOrStaleTokenRejectedCount !== 0 || value.unexpectedResponseCount !== 0
      || value.bodyMismatchResponseCount !== 0 || value.allServedBodiesMatchedOutputTree !== true
      || value.singleHeldOutputTreeServedWithoutRebuild !== true
      || value.perBrowserServedBodyManifestsEqual !== true
      || !Array.isArray(value.projectTokenCommitments) || value.projectTokenCommitments.length !== 2
      || !Array.isArray(value.servedArtifactsByProject) || value.servedArtifactsByProject.length !== 2) {
    fail("SERVER_INVALID");
  }
  const output = new Map(tree.files.map((entry) => [entry.path, entry]));
  const runtimePaths = [
    "index.html",
    tree.files.find((entry) => /^assets\/index-[A-Za-z0-9_-]+\.js$/u.test(entry.path)).path,
    tree.files.find((entry) => /^assets\/index-[A-Za-z0-9_-]+\.css$/u.test(entry.path)).path,
    tree.files.find((entry) => /^assets\/civil-worker-[A-Za-z0-9_-]+\.js$/u.test(entry.path)).path
  ].sort();
  const probePaths = [tree.files.find((entry) => /^assets\/iana-2025b-[A-Za-z0-9_-]+\.js$/u.test(entry.path)).path];
  if (compact(value.requiredRuntimePaths) !== compact(runtimePaths)
      || compact(value.scenarioRuntimePaths) !== compact(runtimePaths)
      || compact(value.evidenceOnlyOutputBodyProbePaths) !== compact(probePaths)) fail("SERVER_PATH_SET_INVALID");
  const expectedBodyPaths = [...runtimePaths, ...probePaths].sort();
  const manifests = [];
  let total = 0;
  for (const projectName of ["chrome", "msedge"]) {
    const commitment = value.projectTokenCommitments.find((entry) => entry.projectName === projectName);
    exactKeys(commitment, ["projectName", "tokenSha256"], "TOKEN_COMMITMENT_INVALID");
    if (!SHA256.test(commitment.tokenSha256)) fail("TOKEN_COMMITMENT_INVALID");
    const project = value.servedArtifactsByProject.find((entry) => entry.projectName === projectName);
    exactKeys(project, ["bodyManifestDigest", "files", "projectName", "servedResponseCount"], "LEDGER_INVALID");
    if (!Array.isArray(project.files) || project.files.length !== 5 || project.projectName !== projectName) {
      fail("LEDGER_INVALID");
    }
    let count = 0;
    const identityOnly = [];
    const seenPaths = new Set();
    for (const file of project.files) {
      exactKeys(file, ["bytes", "path", "responseCount", "sha256"], "LEDGER_FILE_INVALID");
      const expected = output.get(file.path);
      if (!expected || !expectedBodyPaths.includes(file.path) || seenPaths.has(file.path)
          || expected.bytes !== file.bytes || expected.sha256 !== file.sha256
          || !Number.isSafeInteger(file.responseCount) || file.responseCount < 1) fail("LEDGER_FILE_INVALID");
      seenPaths.add(file.path);
      count += file.responseCount;
      identityOnly.push({ path: file.path, bytes: file.bytes, sha256: file.sha256 });
    }
    if (compact([...seenPaths].sort()) !== compact(expectedBodyPaths)) fail("LEDGER_PATH_SET_INVALID");
    const digest = sha256(Buffer.from(`hakimi.western.same-artifact-v1.1-served-bodies\0${compact(identityOnly)}`, "utf8"));
    if (project.servedResponseCount !== count || project.bodyManifestDigest !== digest) fail("LEDGER_DIGEST_INVALID");
    manifests.push(digest);
    total += count;
  }
  if (manifests[0] !== manifests[1] || value.servedResponseCount !== total) fail("LEDGER_CROSS_PROJECT_INVALID");
  return clone(value);
}

export function normalizeWesternSameArtifactV11RuntimeObservation(value) {
  exactKeys(value, [
    "browserProbes", "buildExecutionCount", "buildExitCode", "cleanup", "evidenceToolGraphDigestAfter",
    "evidenceToolGraphDigestBefore", "lockedBuildInputGraphDigestAfter", "lockedBuildInputGraphDigestBefore",
    "nodeVersion", "nonceGeneration", "observedAt", "outputTreeAfter", "outputTreeBefore",
    "playwrightSummary", "playwrightVersion", "runNonceCommitment", "server",
    "sourceGraphDigestAfter", "sourceGraphDigestBefore", "transformedModuleCount", "viteVersion"
  ], "RUNTIME_SHAPE_INVALID");
  if (!ISO.test(value.observedAt) || new Date(value.observedAt).toISOString() !== value.observedAt
      || value.nodeVersion !== "24.16.0" || value.viteVersion !== "7.3.6"
      || value.playwrightVersion !== "1.62.1" || value.buildExecutionCount !== 1
      || value.buildExitCode !== 0 || value.transformedModuleCount !== 88
      || !SHA256.test(value.runNonceCommitment)
      || value.sourceGraphDigestAfter !== value.sourceGraphDigestBefore
      || value.lockedBuildInputGraphDigestAfter !== value.lockedBuildInputGraphDigestBefore
      || value.evidenceToolGraphDigestAfter !== value.evidenceToolGraphDigestBefore) fail("RUNTIME_BOUNDARY_INVALID");
  exactKeys(value.nonceGeneration, ["generator", "randomQualityAttested", "rawNoncePersisted"], "NONCE_BOUNDARY_INVALID");
  if (value.nonceGeneration.generator !== "node_crypto_randomBytes_32"
      || value.nonceGeneration.randomQualityAttested !== false
      || value.nonceGeneration.rawNoncePersisted !== false) fail("NONCE_BOUNDARY_INVALID");
  const before = normalizeTree(value.outputTreeBefore);
  const after = normalizeTree(value.outputTreeAfter);
  if (compact(before) !== compact(after)) fail("OUTPUT_TREE_DRIFT");
  const summary = normalizeSummary(value.playwrightSummary, value.runNonceCommitment);
  const probes = normalizeProbes(value.browserProbes, summary.matrixBrowserIdentities);
  const server = normalizeServer(value.server, before, value.runNonceCommitment);
  for (const matrixIdentity of summary.matrixBrowserIdentities) {
    const token = server.projectTokenCommitments.find(
      (entry) => entry.projectName === matrixIdentity.projectName
    );
    if (!token || token.tokenSha256 !== matrixIdentity.projectTokenSha256) {
      fail("MATRIX_IDENTITY_TOKEN_COMMITMENT_MISMATCH", matrixIdentity.projectName);
    }
  }
  exactKeys(value.cleanup, [
    "browserVersionProbeHandlesClosed", "playwrightCliExited", "portReleased",
    "runnerControlledChildProcessesStopped", "serverStopped", "temporaryRootRemoved", "viteCliExited"
  ], "CLEANUP_INVALID");
  if (Object.values(value.cleanup).some((entry) => entry !== true)) fail("CLEANUP_INVALID");
  return freeze(clone({ ...value, outputTreeBefore: before, outputTreeAfter: after,
    playwrightSummary: summary, browserProbes: probes, server }));
}

export function computeWesternSameArtifactV11Digest(value) {
  const unsigned = clone(value);
  delete unsigned.observationDigest;
  return sha256(Buffer.from(`${DIGEST_DOMAIN}${compact(unsigned)}`, "utf8"));
}

export function serializeWesternSameArtifactV11Candidate(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function buildExpectedWesternSameArtifactV11Candidate(rootOrObservation, maybeObservation) {
  const root = workspaceRoot(maybeObservation === undefined ? process.cwd() : rootOrObservation);
  const observation = normalizeWesternSameArtifactV11RuntimeObservation(
    maybeObservation === undefined ? rootOrObservation : maybeObservation
  );
  const predecessor = loadWesternSameArtifactCandidate(root);
  if (!isVerifiedWesternSameArtifactCandidate(predecessor)) fail("PREDECESSOR_PRIVATE_BRAND_REQUIRED");
  const predecessorSummary = summarizeWesternSameArtifactCandidate(predecessor);
  const predecessorFile = identity(root, WESTERN_SAME_ARTIFACT_CANDIDATE_PATH);
  const source = collectWesternAuthoredBuildSourceSnapshot(root);
  const locked = collectWesternLockedBuildInputSnapshot(root);
  const tools = collectWesternSameArtifactV11ToolSnapshot(root);
  if (observation.sourceGraphDigestBefore !== source.graphDigest
      || observation.lockedBuildInputGraphDigestBefore !== locked.graphDigest
      || observation.evidenceToolGraphDigestBefore !== tools.graphDigest) fail("CURRENT_GRAPH_BINDING_INVALID");
  const unsigned = {
    schemaVersion: "1.1.0",
    recordType: "western_civil_time_nonce_bound_matrix_identity_browser_observation_successor_child",
    childId: WESTERN_SAME_ARTIFACT_V11_CHILD_ID,
    status: "append_only_nonce_bound_in_matrix_chrome_edge_observation_not_admitted",
    createdAt: observation.observedAt,
    activeAdmissionEffect: "none",
    predecessorBinding: {
      path: predecessorFile.path,
      rawBytes: predecessorFile.bytes,
      rawSha256: predecessorFile.sha256,
      semanticDigest: predecessorSummary.observationDigest,
      semanticDigestField: "observationDigest",
      privateBrandConsumed: true
    },
    currentInputBindings: { authoredBuildSource: source, lockedBuildInputs: locked, evidenceTooling: tools },
    runtimeObservation: observation,
    browserEvidenceBoundary: {
      exactSingleBuildExecuted: true,
      sameHeldOutputTreeServedToBothProjects: true,
      perRunNonceCommitmentBound: true,
      perProjectNonceDerivedHeaderChecked: true,
      missingStaleReplayAndCrossProjectCredentialsRejectedByClassifier: true,
      inMatrixCdpAndNavigatorIdentityObservedFiveTimesPerProject: true,
      prePostProbeVersionEqualsInMatrixProductVersion: true,
      chromeScenarioOutcomes: 5,
      edgeScenarioOutcomes: 5,
      totalPassedScenarioOutcomes: 10,
      isolatedLoopbackBrowserRuntimeObservationEstablished: true,
      browserExecutablePathOrHashEstablished: false,
      formalBrowserReceiptIssued: false,
      productionBrowserRuntimeEvidenceEstablished: false,
      fullApplicationRuntimeValidated: false,
      publicHostValidated: false,
      pwaOrServiceWorkerValidated: false
    },
    gateSummary: {
      admissionGatesRequired: 8, admissionGatesSatisfied: 0,
      bindingRequired: 28, bindingFrozenVerified: 0,
      independentExpertsRequired: 2, independentExpertReviewsVerified: 0
    },
    authorityBoundary: FALSE_AUTHORITY,
    observationBoundary: {
      historicalRuntimeCanBeReverifiedFromCandidateAlone: false,
      rawNoncePersisted: false,
      nonceRandomnessAttested: false,
      headerTokenIsBrowserAuthentication: false,
      browserExecutableIdentityEstablished: false,
      browserOsProcessIdentityEstablished: false,
      networkPeerToBrowserProcessBindingEstablished: false,
      browserVendorSignatureEstablished: false,
      completeNodePlaywrightViteRuntimeClosureBound: false,
      toolAttestationEstablished: false,
      digestIsDigitalSignature: false,
      signerIdentityEstablished: false,
      trustedTimestampEstablished: false,
      repositoryCrossFileAtomicSnapshot: false,
      repositoryIntervalMutationExcluded: false,
      repositoryAbaExcluded: false,
      mutationEpochClaimed: false,
      mutationEpochReceipt: null,
      cleanupObservedAtIssuanceOnly: true
    },
    doesNotEstablish: [
      "browser_executable_path_hash_signature_trusted_time_or_tool_attestation",
      "formal_product_identity_admission_or_full_application_runtime",
      "pwa_service_worker_public_host_fixed_device_or_production_runtime",
      "content_truth_expert_truth_source_freeze_or_rights_legal_judgment",
      "release_readiness_deployment_rollback_or_public_release_authorization",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion"
    ]
  };
  return freeze({ ...unsigned, observationDigest: computeWesternSameArtifactV11Digest(unsigned) });
}

export function verifyWesternSameArtifactV11CandidateObject(root, value) {
  const captured = westernSameArtifactTestOnly.captureJsonData(value, "Western v1.1 candidate");
  const expected = buildExpectedWesternSameArtifactV11Candidate(root, captured.runtimeObservation);
  if (compact(captured) !== compact(expected)) fail("CANDIDATE_CURRENT_REBUILD_MISMATCH");
  allFalse(expected.authorityBoundary, "AUTHORITY_BOUNDARY_INVALID");
  BRAND.add(expected);
  return expected;
}

export function loadWesternSameArtifactV11Candidate(root = process.cwd()) {
  const resolved = workspaceRoot(root);
  const artifact = identity(resolved, WESTERN_SAME_ARTIFACT_V11_CANDIDATE_PATH);
  const parsed = westernSameArtifactTestOnly.parseStrictJsonBytes(artifact.raw, WESTERN_SAME_ARTIFACT_V11_CANDIDATE_PATH);
  const verified = verifyWesternSameArtifactV11CandidateObject(resolved, parsed);
  if (!artifact.raw.equals(Buffer.from(serializeWesternSameArtifactV11Candidate(verified), "utf8"))) {
    fail("CANDIDATE_CANONICAL_BYTES_INVALID");
  }
  return verified;
}

export function isVerifiedWesternSameArtifactV11Candidate(value) {
  return value !== null && typeof value === "object" && Object.isFrozen(value) && BRAND.has(value);
}

export function summarizeWesternSameArtifactV11Candidate(value) {
  if (!isVerifiedWesternSameArtifactV11Candidate(value)) fail("CANDIDATE_PRIVATE_BRAND_REQUIRED");
  return freeze({
    childId: value.childId,
    observationDigest: value.observationDigest,
    createdAt: value.createdAt,
    outputTreeDigest: value.runtimeObservation.outputTreeAfter.treeDigest,
    chromeVersion: value.runtimeObservation.browserProbes.find((entry) => entry.projectName === "chrome").versionAfter,
    edgeVersion: value.runtimeObservation.browserProbes.find((entry) => entry.projectName === "msedge").versionAfter,
    passedScenarioOutcomes: 10,
    runNonceCommitment: value.runtimeObservation.runNonceCommitment,
    gateSummary: value.gateSummary,
    authorityBoundary: value.authorityBoundary
  });
}

export const westernSameArtifactV11TestOnly = freeze({ compact, normalizeSummary, normalizeProbes,
  normalizeServer });
