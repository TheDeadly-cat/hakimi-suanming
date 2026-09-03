import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync
} from "node:fs";
import path from "node:path";

import { parse } from "@babel/parser";

export const WESTERN_CIVIL_TIME_FACT_BROWSER_DRAFT =
  "isolated-drafts/western-civil-time-fact-browser-draft";
export const RESTRICTED_APPS_WEB_SOURCE =
  "apps/web/src/lib/local-user-data-cleanup.ts";
export const WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE =
  "content/system-admission/western-civil-time-fact-browser-observation-candidate.v1.0.0.json";

const RESULT_BRAND = new WeakSet();
const CANDIDATE_RESULT_BRAND = new WeakSet();
const CANDIDATE_DIGEST_DOMAIN =
  "hakimi.western.civil-time-fact-browser-observation-candidate.v1";
const DRAFT_PREFIX = `${WESTERN_CIVIL_TIME_FACT_BROWSER_DRAFT}/`;
const PRODUCER_MODULE = `${DRAFT_PREFIX}src/worker-fact-projection.ts`;
const CIVIL_WORKER_MODULE = `${DRAFT_PREFIX}src/civil-worker.ts`;
const MAIN_MODULE = `${DRAFT_PREFIX}src/main.ts`;
const VITE_CONFIG = `${DRAFT_PREFIX}vite.config.mjs`;
const HTML_ENTRY = `${DRAFT_PREFIX}browser-app/index.html`;

const EXPECTED_DRAFT_RUNTIME_SOURCE_FILES = Object.freeze([
  `${DRAFT_PREFIX}src/browser-fact-projection.ts`,
  `${DRAFT_PREFIX}src/civil-client.ts`,
  `${DRAFT_PREFIX}src/civil-time.ts`,
  `${DRAFT_PREFIX}src/civil-worker.ts`,
  `${DRAFT_PREFIX}src/main.ts`,
  `${DRAFT_PREFIX}src/protocol.ts`,
  `${DRAFT_PREFIX}src/ui-format.ts`,
  `${DRAFT_PREFIX}src/worker-fact-projection.ts`
]);

const EXPECTED_RUNTIME_IMPORT_GRAPH = deepFreeze({
  [`${DRAFT_PREFIX}src/browser-fact-projection.ts`]: ["./protocol.ts"],
  [`${DRAFT_PREFIX}src/civil-client.ts`]: [
    "../../../packages/western-astrology-contracts-draft/src/civil-input.ts",
    "./browser-fact-projection.ts",
    "./protocol.ts"
  ],
  [`${DRAFT_PREFIX}src/civil-time.ts`]: [
    "../../../packages/tzdb-core/src/index.ts",
    "../../../packages/western-astrology-contracts-draft/src/civil-input.ts"
  ],
  [`${DRAFT_PREFIX}src/civil-worker.ts`]: [
    "./civil-time.ts",
    "./protocol.ts",
    "./worker-fact-projection.ts"
  ],
  [`${DRAFT_PREFIX}src/main.ts`]: [
    "./civil-client.ts",
    "./styles.css",
    "./ui-format.ts"
  ],
  [`${DRAFT_PREFIX}src/protocol.ts`]: [],
  [`${DRAFT_PREFIX}src/ui-format.ts`]: [],
  [`${DRAFT_PREFIX}src/worker-fact-projection.ts`]: [
    "./browser-fact-projection.ts",
    "./civil-time.ts",
    "./protocol.ts"
  ],
  "packages/tzdb-core/src/artifacts/iana-2025b.ts": [
    "moment-timezone-2025b/data/packed/latest.json"
  ],
  "packages/tzdb-core/src/index.ts": [
    "./artifacts/iana-2025b.ts",
    "./packed-resolver.ts",
    "moment-timezone"
  ],
  "packages/tzdb-core/src/packed-resolver.ts": ["moment-timezone"],
  "packages/western-astrology-contracts-draft/src/civil-input.ts": ["zod"]
});

const EXPECTED_PRODUCER_IMPORTERS = Object.freeze([
  `${DRAFT_PREFIX}src/browser-fact-projection.test.ts`,
  `${DRAFT_PREFIX}src/civil-client.test.ts`,
  CIVIL_WORKER_MODULE
]);

const FORBIDDEN_IMPORT_PATTERNS = Object.freeze([
  { label: "apps/web", pattern: /(?:^|\/)apps\/web(?:\/|$)/u },
  { label: "astronomy", pattern: /astronomy/iu },
  { label: "rules", pattern: /(?:^|[-_/])rules?(?:[-_/]|$)/iu },
  { label: "cross-system", pattern: /cross[-_/]?system/iu },
  { label: "bazi", pattern: /(?:^|[-_/])bazi(?:[-_/]|$)/iu },
  { label: "ziwei", pattern: /(?:^|[-_/])ziwei(?:[-_/]|$)/iu },
  { label: "vedic", pattern: /(?:^|[-_/])vedic(?:[-_/]|$)/iu },
  { label: "other-system-cn", pattern: /八字|紫微|吠陀/u }
]);

const FORBIDDEN_IDENTIFIERS = new Set([
  "Cache",
  "CacheStorage",
  "Clipboard",
  "EventSource",
  "Function",
  "IDBDatabase",
  "IDBFactory",
  "ServiceWorker",
  "ServiceWorkerContainer",
  "ServiceWorkerRegistration",
  "SharedWorker",
  "Storage",
  "WebSocket",
  "XMLHttpRequest",
  "caches",
  "console",
  "eval",
  "fetch",
  "indexedDB",
  "localStorage",
  "sessionStorage"
]);

const FORBIDDEN_MEMBER_PROPERTIES = new Set([
  "clipboard",
  "cookie",
  "download",
  "sendBeacon",
  "serviceWorker"
]);

const FORBIDDEN_CALL_NAMES = new Set([
  "importScripts",
  "showDirectoryPicker",
  "showOpenFilePicker",
  "showSaveFilePicker"
]);

const APPS_WEB_SOURCE_EXTENSIONS = new Set([
  ".cjs", ".css", ".html", ".js", ".jsx", ".mjs", ".mts", ".cts", ".ts", ".tsx"
]);
const APPS_WEB_SKIPPED_DIRECTORY_NAMES = new Set([
  ".git", ".vite", "build", "coverage", "dist", "node_modules"
]);

export class WesternCivilTimeFactBrowserObservationError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = "WesternCivilTimeFactBrowserObservationError";
    this.code = code;
  }
}

export function isWesternCivilTimeFactBrowserObservation(value) {
  return value !== null
    && typeof value === "object"
    && RESULT_BRAND.has(value)
    && Object.isFrozen(value);
}

export function isVerifiedWesternCivilTimeFactBrowserObservationCandidate(value) {
  return value !== null
    && typeof value === "object"
    && CANDIDATE_RESULT_BRAND.has(value)
    && Object.isFrozen(value);
}

export function computeWesternCivilTimeFactBrowserObservationCandidateDigest(value) {
  const projection = canonicalJsonValue(value, true);
  return createHash("sha256")
    .update(`${CANDIDATE_DIGEST_DOMAIN}\n${JSON.stringify(projection)}`, "utf8")
    .digest("hex");
}

export function loadWesternCivilTimeFactBrowserObservationCandidate(workspaceRoot) {
  const root = requireWorkspaceRoot(workspaceRoot);
  const source = readWorkspaceText(
    root,
    WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE
  );
  let candidate;
  try {
    candidate = JSON.parse(source);
  } catch {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_JSON_INVALID",
      WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE
    );
  }
  if (`${JSON.stringify(candidate, null, 2)}\n` !== source) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_NOT_CANONICAL",
      "candidate must use canonical two-space JSON with one LF terminator"
    );
  }
  if (!/^[a-f0-9]{64}$/u.test(candidate.observationDigest ?? "")
    || candidate.observationDigest
      !== computeWesternCivilTimeFactBrowserObservationCandidateDigest(candidate)) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_DIGEST_MISMATCH",
      "observationDigest does not match the canonical candidate projection"
    );
  }
  if (candidate.schemaVersion !== "1.0.0"
    || candidate.recordType !== "western_civil_time_fact_only_browser_observation_candidate_v1"
    || candidate.observationId
      !== "hakimi.western.civil-time-fact-only-browser-observation/1.0.0"
    || candidate.activeAdmissionEffect !== "none"
    || candidate.systemIdentity?.contractSystemId !== "western"
    || candidate.systemIdentity?.productSystemId !== "western-astrology"
    || candidate.systemIdentity?.releaseIdentity !== null
    || candidate.systemIdentity?.targetSchema !== null
    || candidate.systemIdentity?.migrationId !== null
    || candidate.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || candidate.projectReleaseGovernanceContext?.targetSchema !== 13
    || candidate.projectReleaseGovernanceContext?.migrationId !== null) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_IDENTITY_MISMATCH",
      "system or project governance identity drifted"
    );
  }
  const falseAuthorityKeys = [
    "formalInputContractAdmitted",
    "civilTimeDomainTruthCertified",
    "astronomicalFactsEstablished",
    "contentTruthEstablished",
    "expertTruthEstablished",
    "expertIdentityCredentialsIndependenceEstablished",
    "sourceFreezeEstablished",
    "rightsLegalConclusionEstablished",
    "domainAuthorityAuthorized",
    "formalAdmissionAuthorized",
    "highRiskClaimsAuthorized",
    "releaseEvidenceComplete",
    "releaseReady",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "expertClaimsAuthorized",
    "crossSystemAuthorityInherited"
  ];
  if (falseAuthorityKeys.some((key) => candidate.authorityBoundary?.[key] !== false)
    || candidate.gateSummary?.bindingRequired !== 28
    || candidate.gateSummary?.bindingFrozenVerified !== 0
    || candidate.gateSummary?.independentExpertsRequired !== 2
    || candidate.gateSummary?.independentExpertReviewsVerified !== 0
    || candidate.gateSummary?.admissionGatesRequired !== 8
    || candidate.gateSummary?.admissionGatesSatisfied !== 0) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_AUTHORITY_ESCALATION",
      "candidate must preserve all zero-admission and false-authority gates"
    );
  }
  if (candidate.browserObservation?.browserProduct !== "Codex In-app Browser"
    || candidate.browserObservation?.browserVersion !== null
    || candidate.browserObservation?.chromeValidated !== false
    || candidate.browserObservation?.edgeValidated !== false
    || candidate.browserObservation?.crossBrowserValidated !== false
    || candidate.browserObservation?.productionBrowserRuntimeEvidenceEstablished !== false
    || candidate.staticBoundaryObservation?.productionReachabilityAudit
      ?.restrictedPathIntentionallySkipped !== RESTRICTED_APPS_WEB_SOURCE
    || candidate.staticBoundaryObservation?.productionReachabilityAudit
      ?.incompleteProductionReachabilityAudit !== true
    || candidate.staticBoundaryObservation?.productionReachabilityAudit
      ?.wholeRepositoryProductionUnreachableEstablished !== false) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_EVIDENCE_BOUNDARY_MISMATCH",
      "browser or incomplete reachability boundary drifted"
    );
  }
  if (!Array.isArray(candidate.artifactBindings) || candidate.artifactBindings.length !== 25) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_ARTIFACT_COUNT_MISMATCH",
      "candidate must bind exactly 25 source and verifier artifacts"
    );
  }
  const seenPaths = new Set();
  for (const binding of candidate.artifactBindings) {
    if (!binding || typeof binding.path !== "string" || seenPaths.has(binding.path)
      || binding.path === WESTERN_CIVIL_TIME_FACT_BROWSER_OBSERVATION_CANDIDATE
      || binding.path === RESTRICTED_APPS_WEB_SOURCE
      || !Number.isSafeInteger(binding.bytes) || binding.bytes < 1
      || !/^[a-f0-9]{64}$/u.test(binding.sha256 ?? "")) {
      throw new WesternCivilTimeFactBrowserObservationError(
        "OBSERVATION_CANDIDATE_ARTIFACT_BINDING_INVALID",
        "artifact binding shape, path, or identity is invalid"
      );
    }
    seenPaths.add(binding.path);
    const bytes = readWorkspaceBytes(root, binding.path);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.byteLength !== binding.bytes || digest !== binding.sha256) {
      throw new WesternCivilTimeFactBrowserObservationError(
        "OBSERVATION_CANDIDATE_ARTIFACT_DRIFT",
        binding.path
      );
    }
  }
  const result = deepFreeze({
    observationId: candidate.observationId,
    observationDigest: candidate.observationDigest,
    artifactBindingCount: candidate.artifactBindings.length,
    bindingRequired: 28,
    bindingFrozenVerified: 0,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    incompleteProductionReachabilityAudit: true,
    wholeRepositoryProductionUnreachableEstablished: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false,
    activeAdmissionEffect: "none"
  });
  CANDIDATE_RESULT_BRAND.add(result);
  return result;
}

export function verifyWesternCivilTimeFactBrowserObservation(workspaceRoot) {
  const root = requireWorkspaceRoot(workspaceRoot);
  verifyDraftRuntimeInventory(root);

  const parsedModules = new Map();
  const observedGraph = {};
  for (const [relativePath, expectedSpecifiers] of Object.entries(EXPECTED_RUNTIME_IMPORT_GRAPH)) {
    const source = readWorkspaceText(root, relativePath);
    const ast = parseModule(source, relativePath);
    parsedModules.set(relativePath, ast);
    const observedSpecifiers = collectRuntimeModuleSpecifiers(ast, relativePath);
    assertStringArrayEqual(
      observedSpecifiers,
      expectedSpecifiers,
      "RUNTIME_IMPORT_GRAPH_MISMATCH",
      relativePath
    );
    for (const specifier of observedSpecifiers) {
      verifyRuntimeImportSpecifier(relativePath, specifier);
    }
    observedGraph[relativePath] = observedSpecifiers;
  }

  const capabilityObservations = verifyForbiddenRuntimeCapabilities(parsedModules);
  const workerObservation = verifyWorkerBoundary(root, parsedModules);
  const mainThreadObservation = verifyMainThreadBoundary(observedGraph);
  const producerObservation = verifyProducerImporters(root);
  const buildObservation = verifyViteBuildBoundary(root);
  const htmlObservation = verifyHtmlBoundary(root);
  const productionObservation = scanAppsWebReverseReferences(root);

  const runtimeImportEdgeCount = Object.values(observedGraph)
    .reduce((sum, edges) => sum + edges.length, 0);
  const result = deepFreeze({
    kind: "western_civil_time_fact_browser_static_boundary_observation",
    schemaVersion: "1.0.0",
    draftRoot: WESTERN_CIVIL_TIME_FACT_BROWSER_DRAFT,
    runtimeImportGraph: observedGraph,
    runtimeModuleCount: Object.keys(observedGraph).length,
    runtimeImportEdgeCount,
    forbiddenRuntimeImportCount: 0,
    forbiddenRuntimeCapabilityReferenceCount: capabilityObservations.length,
    worker: workerObservation,
    mainThread: mainThreadObservation,
    producer: producerObservation,
    build: buildObservation,
    html: htmlObservation,
    productionReachability: productionObservation,
    incompleteProductionReachabilityAudit: true,
    wholeRepositoryProductionUnreachableEstablished: false,
    engineeringEvidenceObserved: true,
    browserRuntimeEvidenceEstablished: false,
    contentAuthorityEstablished: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    sourceRightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    formalAdmissionAuthorized: false,
    releaseReadyEstablished: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    expertClaimsAuthorized: false
  });
  RESULT_BRAND.add(result);
  return result;
}

function requireWorkspaceRoot(workspaceRoot) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKSPACE_ROOT_INVALID",
      "workspaceRoot must be a non-empty string"
    );
  }
  const root = path.resolve(workspaceRoot);
  const stat = lstatSync(root, { throwIfNoEntry: false });
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKSPACE_ROOT_INVALID",
      "workspaceRoot must be a real directory"
    );
  }
  return root;
}

function verifyDraftRuntimeInventory(root) {
  const sourceDirectory = resolveWorkspacePath(root, `${DRAFT_PREFIX}src`);
  const observed = readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"))
    .map((entry) => `${DRAFT_PREFIX}src/${entry.name}`)
    .sort();
  assertStringArrayEqual(
    observed,
    EXPECTED_DRAFT_RUNTIME_SOURCE_FILES,
    "DRAFT_RUNTIME_INVENTORY_MISMATCH",
    `${DRAFT_PREFIX}src`
  );
}

function verifyRuntimeImportSpecifier(importer, specifier) {
  if (specifier.startsWith("node:")) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "NODE_RUNTIME_IMPORT_FORBIDDEN",
      `${importer} imports ${specifier}`
    );
  }
  const normalized = normalizeSlashes(specifier);
  for (const { label, pattern } of FORBIDDEN_IMPORT_PATTERNS) {
    if (pattern.test(normalized)) {
      throw new WesternCivilTimeFactBrowserObservationError(
        "FORBIDDEN_RUNTIME_IMPORT",
        `${importer} imports ${label}`
      );
    }
  }
}

function verifyForbiddenRuntimeCapabilities(parsedModules) {
  const observations = [];
  for (const [relativePath, ast] of parsedModules) {
    walkAst(ast, (node, ancestors) => {
      if (node.type === "Identifier" && FORBIDDEN_IDENTIFIERS.has(node.name)
        && isRelevantIdentifier(node, ancestors)) {
        observations.push({ relativePath, capability: node.name });
      }
      if ((node.type === "MemberExpression" || node.type === "OptionalMemberExpression")) {
        const propertyName = staticMemberName(node);
        if (propertyName && FORBIDDEN_MEMBER_PROPERTIES.has(propertyName)) {
          observations.push({ relativePath, capability: propertyName });
        }
      }
      if ((node.type === "CallExpression" || node.type === "OptionalCallExpression")
        && node.callee?.type === "Identifier"
        && FORBIDDEN_CALL_NAMES.has(node.callee.name)) {
        observations.push({ relativePath, capability: node.callee.name });
      }
    });
  }
  if (observations.length > 0) {
    const first = observations[0];
    throw new WesternCivilTimeFactBrowserObservationError(
      "FORBIDDEN_RUNTIME_CAPABILITY",
      `${first.relativePath} references ${first.capability}`
    );
  }
  return observations;
}

function isRelevantIdentifier(node, ancestors) {
  const parent = ancestors.at(-1);
  if (!parent) return true;
  if ((parent.type === "ObjectProperty" || parent.type === "ObjectMethod"
      || parent.type === "ClassMethod" || parent.type === "ClassProperty")
    && parent.key === node && !parent.computed) return false;
  if ((parent.type === "MemberExpression" || parent.type === "OptionalMemberExpression")
    && parent.property === node && !parent.computed) return false;
  if (parent.type === "ImportSpecifier" || parent.type === "ImportDefaultSpecifier"
    || parent.type === "ImportNamespaceSpecifier" || parent.type === "ExportSpecifier") return false;
  if (parent.type === "TSPropertySignature" && parent.key === node && !parent.computed) return false;
  return true;
}

function verifyWorkerBoundary(root, parsedModules) {
  const workerConstructions = [];
  for (const [relativePath, ast] of parsedModules) {
    walkAst(ast, (node, ancestors) => {
      if (node.type === "NewExpression" && node.callee?.type === "Identifier"
        && node.callee.name === "Worker") {
        workerConstructions.push({ relativePath, node, ancestors: [...ancestors] });
      }
    });
  }
  if (workerConstructions.length !== 1) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKER_BOUNDARY_INVALID",
      `expected one Worker construction, observed ${workerConstructions.length}`
    );
  }
  const construction = workerConstructions[0];
  if (construction.relativePath !== `${DRAFT_PREFIX}src/civil-client.ts`) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKER_BOUNDARY_INVALID",
      `Worker construction escaped civil-client.ts`
    );
  }
  const [workerUrl, workerOptions] = construction.node.arguments;
  if (!isStaticFreshWorkerUrl(workerUrl, "./civil-worker.ts")) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKER_BOUNDARY_INVALID",
      "Worker URL must be new URL(\"./civil-worker.ts\", import.meta.url)"
    );
  }
  if (workerOptions?.type !== "ObjectExpression"
    || readSingleStaticObjectProperty(workerOptions, "type")?.value !== "module") {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKER_BOUNDARY_INVALID",
      "Worker options must statically require type=module"
    );
  }
  const containingFunction = construction.ancestors
    .slice()
    .reverse()
    .find((node) => node.type === "FunctionDeclaration" || node.type === "FunctionExpression"
      || node.type === "ArrowFunctionExpression");
  if (containingFunction?.type !== "FunctionDeclaration"
    || containingFunction.id?.name !== "runWesternCivilFactWorker") {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKER_BOUNDARY_INVALID",
      "Worker must be freshly constructed inside runWesternCivilFactWorker"
    );
  }

  const clientSource = readWorkspaceText(root, `${DRAFT_PREFIX}src/civil-client.ts`);
  const workerSource = readWorkspaceText(root, CIVIL_WORKER_MODULE);
  if (countMatches(clientSource, /\bworker\.terminate\s*\(/gu) !== 1
    || countMatches(workerSource, /\bworkerScope\.close\s*\(/gu) !== 1
    || countMatches(workerSource, /\bworkerScope\.addEventListener\s*\(\s*["']message["']/gu) !== 1) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKER_LIFECYCLE_INVALID",
      "fresh worker termination, single message listener, and worker close must each be explicit"
    );
  }
  return {
    constructorCount: 1,
    staticUrl: "./civil-worker.ts",
    moduleType: "module",
    freshPerRequestStaticallyRequired: true,
    clientTerminationStaticallyRequired: true,
    workerCloseStaticallyRequired: true
  };
}

function verifyMainThreadBoundary(observedGraph) {
  const reachable = new Set();
  const pending = [MAIN_MODULE];
  while (pending.length > 0) {
    const current = pending.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    const specifiers = observedGraph[current] ?? [];
    for (const specifier of specifiers) {
      const resolved = resolveRelativeModule(current, specifier);
      if (resolved && Object.hasOwn(observedGraph, resolved)) pending.push(resolved);
    }
  }
  const violations = [...reachable].filter((relativePath) =>
    relativePath === CIVIL_WORKER_MODULE
      || /(?:^|\/)civil-time\.ts$/u.test(relativePath)
      || /(?:^|\/)packages\/tzdb-core(?:\/|$)/u.test(relativePath)
      || /resolver/iu.test(relativePath));
  if (violations.length > 0) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "MAIN_THREAD_RUNTIME_BOUNDARY_INVALID",
      `main thread reaches ${violations[0]}`
    );
  }
  return {
    entry: MAIN_MODULE,
    reachableRuntimeModules: [...reachable].sort(),
    civilWorkerRuntimeImportObserved: false,
    civilTimeRuntimeImportObserved: false,
    tzdbOrResolverRuntimeImportObserved: false
  };
}

function verifyProducerImporters(root) {
  const files = listDraftModuleFiles(root);
  const importers = [];
  for (const relativePath of files) {
    const ast = parseModule(readWorkspaceText(root, relativePath), relativePath);
    const references = collectAllModuleSpecifiers(ast, relativePath);
    if (references.some((specifier) => resolveRelativeModule(relativePath, specifier) === PRODUCER_MODULE)) {
      importers.push(relativePath);
    }
  }
  importers.sort();
  assertStringArrayEqual(
    importers,
    EXPECTED_PRODUCER_IMPORTERS,
    "PRODUCER_IMPORTER_BOUNDARY_INVALID",
    PRODUCER_MODULE
  );
  const productionImporters = importers.filter((relativePath) => !relativePath.endsWith(".test.ts"));
  if (productionImporters.length !== 1 || productionImporters[0] !== CIVIL_WORKER_MODULE) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "PRODUCER_IMPORTER_BOUNDARY_INVALID",
      "producer builder may be imported only by civil-worker and tests"
    );
  }
  return {
    module: PRODUCER_MODULE,
    importers,
    productionImporter: CIVIL_WORKER_MODULE,
    nonWorkerProductionImporterCount: 0
  };
}

function verifyViteBuildBoundary(root) {
  const source = readWorkspaceText(root, VITE_CONFIG);
  const ast = parseModule(source, VITE_CONFIG);
  const exportedObject = findDefaultExportObject(ast);
  const buildObject = readSingleStaticObjectProperty(exportedObject, "build");
  const workerObject = readSingleStaticObjectProperty(exportedObject, "worker");
  if (buildObject?.type !== "ObjectExpression"
    || readSingleStaticObjectProperty(buildObject, "emptyOutDir")?.value !== false) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "VITE_BUILD_BOUNDARY_INVALID",
      "build.emptyOutDir must be statically false"
    );
  }
  if (workerObject?.type !== "ObjectExpression"
    || readSingleStaticObjectProperty(workerObject, "format")?.value !== "es") {
    throw new WesternCivilTimeFactBrowserObservationError(
      "VITE_WORKER_FORMAT_INVALID",
      "worker.format must be statically es"
    );
  }
  const requiredMarkers = [
    "const defaultOutDir = path.join(packageRoot, \"dist\", \"browser-app\");",
    "process.env.HAKIMI_WESTERN_FACT_ONLY_OUT_DIR",
    "path.resolve(process.env.HAKIMI_WESTERN_FACT_ONLY_OUT_DIR)",
    "const temporaryRoot = path.resolve(os.tmpdir());",
    "isStrictDescendant(temporaryRoot, outDir)",
    "/^hakimi-western-facts-[a-f0-9]{32}$/u.test(leaf)",
    "isStrictDescendant(path.join(packageRoot, \"dist\"), outDir)"
  ];
  for (const marker of requiredMarkers) {
    if (!source.includes(marker)) {
      throw new WesternCivilTimeFactBrowserObservationError(
        "VITE_OUTDIR_GUARD_INVALID",
        `missing static guard marker ${marker}`
      );
    }
  }
  if (countMatches(source, /\bemptyOutDir\s*:/gu) !== 1
    || countMatches(source, /\bworker\s*:\s*\{/gu) !== 1
    || countMatches(source, /HAKIMI_WESTERN_FACT_ONLY_OUT_DIR/gu) < 4) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "VITE_BUILD_BOUNDARY_INVALID",
      "build boundary properties or temp override guard are ambiguous"
    );
  }
  return {
    workerFormat: "es",
    emptyOutDir: false,
    defaultOutDirConfinedToDraftDist: true,
    temporaryOutDirRequiresOsTempStrictDescendant: true,
    temporaryOutDirLeafPattern: "hakimi-western-facts-[a-f0-9]{32}"
  };
}

function verifyHtmlBoundary(root) {
  const html = readWorkspaceText(root, HTML_ENTRY);
  const withoutComments = html.replace(/<!--[\s\S]*?-->/gu, "");
  const cspMetaTags = [...withoutComments.matchAll(/<meta\b[^>]*>/giu)]
    .map((match) => match[0])
    .filter((tag) => readHtmlAttribute(tag, "http-equiv")?.toLowerCase()
      === "content-security-policy");
  const csp = cspMetaTags.length === 1 ? readHtmlAttribute(cspMetaTags[0], "content") : undefined;
  if (!csp || !/(?:^|;)\s*form-action\s+'none'\s*(?:;|$)/iu.test(csp)) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "HTML_CSP_BOUNDARY_INVALID",
      "HTML CSP must include form-action 'none'"
    );
  }
  const formAssociatedTags = [
    ...withoutComments.matchAll(/<(?:button|fieldset|form|input|output|select|textarea)\b[^>]*>/giu)
  ].map((match) => match[0]);
  const namedFormAssociatedTags = formAssociatedTags.filter((tag) =>
    /\sname(?:\s*=|\s|\/?\s*>)/iu.test(tag));
  if (namedFormAssociatedTags.length > 0) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "HTML_NAME_ATTRIBUTE_FORBIDDEN",
      "HTML must not declare name attributes"
    );
  }
  if (/<form\b[^>]*\baction\s*=/iu.test(withoutComments)
    || /<base\b/iu.test(withoutComments)) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "HTML_FORM_BOUNDARY_INVALID",
      "form action and base elements are forbidden"
    );
  }
  const runButton = withoutComments.match(/<button\b[^>]*\bid\s*=\s*["']run-chain["'][^>]*>/iu)?.[0];
  if (!runButton || !/\btype\s*=\s*["']button["']/iu.test(runButton)) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "HTML_RUN_BUTTON_INVALID",
      "run-chain button must explicitly use type=button"
    );
  }
  const moduleScripts = [...withoutComments.matchAll(/<script\b[^>]*\btype\s*=\s*["']module["'][^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/giu)]
    .map((match) => match[1]);
  assertStringArrayEqual(
    moduleScripts,
    ["../src/main.ts"],
    "HTML_ENTRY_BOUNDARY_INVALID",
    HTML_ENTRY
  );
  if (/\b(?:https?:)?\/\//iu.test(withoutComments)) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "HTML_EXTERNAL_RESOURCE_FORBIDDEN",
      "HTML must not reference external network resources"
    );
  }
  return {
    cspFormActionNone: true,
    formAssociatedNameAttributeCount: 0,
    formActionAttributeCount: 0,
    runButtonType: "button",
    moduleEntry: "../src/main.ts"
  };
}

function scanAppsWebReverseReferences(root) {
  const appsWebRoot = resolveWorkspacePath(root, "apps/web");
  const appsWebStat = lstatSync(appsWebRoot, { throwIfNoEntry: false });
  if (!appsWebStat || !appsWebStat.isDirectory() || appsWebStat.isSymbolicLink()) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "APPS_WEB_SCAN_ROOT_INVALID",
      "apps/web must be a real directory"
    );
  }
  const scannedFiles = [];
  const references = [];
  const excludedDirectories = [];
  walkAppsWebDirectory("apps/web");
  if (references.length > 0) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "PRODUCTION_REVERSE_REFERENCE_OBSERVED",
      `${references[0]} references the isolated Western fact-only draft`
    );
  }
  return {
    appsWebReadableSourceFilesScanned: scannedFiles.length,
    appsWebReverseReferenceCount: 0,
    excludedGeneratedOrDependencyDirectories: [...new Set(excludedDirectories)].sort(),
    explicitlySkippedRestrictedPaths: [RESTRICTED_APPS_WEB_SOURCE],
    incompleteProductionReachabilityAudit: true,
    wholeRepositoryProductionUnreachableEstablished: false
  };

  function walkAppsWebDirectory(directoryRelativePath) {
    const directory = resolveWorkspacePath(root, directoryRelativePath);
    const entries = readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = normalizeSlashes(`${directoryRelativePath}/${entry.name}`);
      if (relativePath === RESTRICTED_APPS_WEB_SOURCE) {
        continue;
      }
      if (entry.isSymbolicLink()) {
        throw new WesternCivilTimeFactBrowserObservationError(
          "APPS_WEB_SCAN_SYMLINK_FORBIDDEN",
          relativePath
        );
      }
      if (entry.isDirectory()) {
        if (APPS_WEB_SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
          excludedDirectories.push(relativePath);
          continue;
        }
        walkAppsWebDirectory(relativePath);
        continue;
      }
      if (!entry.isFile() || !APPS_WEB_SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      const source = readWorkspaceText(root, relativePath);
      scannedFiles.push(relativePath);
      if (source.includes("western-civil-time-fact-browser-draft")
        || source.includes("@hakimi/western-civil-time-fact-browser-draft")) {
        references.push(relativePath);
      }
    }
  }
}

function listDraftModuleFiles(root) {
  const result = [];
  walk(WESTERN_CIVIL_TIME_FACT_BROWSER_DRAFT);
  return result.sort();

  function walk(directoryRelativePath) {
    const directory = resolveWorkspacePath(root, directoryRelativePath);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = normalizeSlashes(`${directoryRelativePath}/${entry.name}`);
      if (entry.isSymbolicLink()) {
        throw new WesternCivilTimeFactBrowserObservationError(
          "DRAFT_SYMLINK_FORBIDDEN",
          relativePath
        );
      }
      if (entry.isDirectory()) {
        if (APPS_WEB_SKIPPED_DIRECTORY_NAMES.has(entry.name)) continue;
        walk(relativePath);
      } else if (entry.isFile() && /\.(?:[cm]?[jt]sx?)$/u.test(entry.name)) {
        result.push(relativePath);
      }
    }
  }
}

function parseModule(source, relativePath) {
  try {
    return parse(source, {
      sourceType: "module",
      allowAwaitOutsideFunction: false,
      errorRecovery: false,
      plugins: ["typescript", "jsx", "importAttributes"]
    });
  } catch (error) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "MODULE_PARSE_FAILED",
      `${relativePath}: ${error instanceof Error ? error.message : "unknown parse error"}`
    );
  }
}

function collectRuntimeModuleSpecifiers(ast, relativePath) {
  const specifiers = new Set();
  walkAst(ast, (node) => {
    if (node.type === "ImportDeclaration") {
      if (isRuntimeImportDeclaration(node)) specifiers.add(requireStringLiteralSource(node.source, relativePath));
      return;
    }
    if (node.type === "ExportAllDeclaration" || node.type === "ExportNamedDeclaration") {
      if (node.source && isRuntimeExportDeclaration(node)) {
        specifiers.add(requireStringLiteralSource(node.source, relativePath));
      }
      return;
    }
    if (node.type === "ImportExpression") {
      specifiers.add(requireStaticDynamicImport(node.source, relativePath));
      return;
    }
    if (node.type === "CallExpression" && node.callee?.type === "Import") {
      if (node.arguments.length !== 1) {
        throw new WesternCivilTimeFactBrowserObservationError(
          "DYNAMIC_IMPORT_NOT_STATIC",
          relativePath
        );
      }
      specifiers.add(requireStaticDynamicImport(node.arguments[0], relativePath));
    }
  });
  return [...specifiers].sort();
}

function collectAllModuleSpecifiers(ast, relativePath) {
  const specifiers = new Set();
  walkAst(ast, (node) => {
    if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration"
      || node.type === "ExportNamedDeclaration") {
      if (node.source) specifiers.add(requireStringLiteralSource(node.source, relativePath));
    } else if (node.type === "ImportExpression") {
      specifiers.add(requireStaticDynamicImport(node.source, relativePath));
    } else if (node.type === "CallExpression" && node.callee?.type === "Import") {
      if (node.arguments.length !== 1) {
        throw new WesternCivilTimeFactBrowserObservationError("DYNAMIC_IMPORT_NOT_STATIC", relativePath);
      }
      specifiers.add(requireStaticDynamicImport(node.arguments[0], relativePath));
    }
  });
  return [...specifiers].sort();
}

function isRuntimeImportDeclaration(node) {
  if (node.importKind === "type" || node.importKind === "typeof") return false;
  if (node.specifiers.length === 0) return true;
  return node.specifiers.some((specifier) =>
    specifier.type !== "ImportSpecifier"
      || (specifier.importKind !== "type" && specifier.importKind !== "typeof"));
}

function isRuntimeExportDeclaration(node) {
  if (node.exportKind === "type") return false;
  if (node.type === "ExportAllDeclaration" || node.specifiers.length === 0) return true;
  return node.specifiers.some((specifier) => specifier.exportKind !== "type");
}

function requireStringLiteralSource(node, relativePath) {
  if (node?.type !== "StringLiteral") {
    throw new WesternCivilTimeFactBrowserObservationError(
      "MODULE_SPECIFIER_NOT_STATIC",
      relativePath
    );
  }
  return node.value;
}

function requireStaticDynamicImport(node, relativePath) {
  if (node?.type !== "StringLiteral") {
    throw new WesternCivilTimeFactBrowserObservationError(
      "DYNAMIC_IMPORT_NOT_STATIC",
      relativePath
    );
  }
  return node.value;
}

function findDefaultExportObject(ast) {
  const declarations = ast.program.body.filter((node) => node.type === "ExportDefaultDeclaration");
  if (declarations.length !== 1 || declarations[0].declaration?.type !== "ObjectExpression") {
    throw new WesternCivilTimeFactBrowserObservationError(
      "VITE_CONFIG_EXPORT_INVALID",
      "vite config must have one static default object export"
    );
  }
  return declarations[0].declaration;
}

function readSingleStaticObjectProperty(objectExpression, propertyName) {
  if (objectExpression?.type !== "ObjectExpression") return undefined;
  const properties = objectExpression.properties.filter((property) =>
    property.type === "ObjectProperty"
      && !property.computed
      && staticPropertyKey(property.key) === propertyName);
  if (properties.length !== 1) return undefined;
  return properties[0].value;
}

function staticPropertyKey(key) {
  if (key?.type === "Identifier") return key.name;
  if (key?.type === "StringLiteral") return key.value;
  return undefined;
}

function isStaticFreshWorkerUrl(node, expectedPath) {
  if (node?.type !== "NewExpression" || node.callee?.type !== "Identifier"
    || node.callee.name !== "URL" || node.arguments.length !== 2) return false;
  const [urlPath, base] = node.arguments;
  return urlPath?.type === "StringLiteral"
    && urlPath.value === expectedPath
    && base?.type === "MemberExpression"
    && base.computed === false
    && base.property?.type === "Identifier"
    && base.property.name === "url"
    && base.object?.type === "MetaProperty"
    && base.object.meta?.name === "import"
    && base.object.property?.name === "meta";
}

function staticMemberName(node) {
  if (!node.computed && node.property?.type === "Identifier") return node.property.name;
  if (node.computed && node.property?.type === "StringLiteral") return node.property.value;
  return undefined;
}

function readHtmlAttribute(tag, attributeName) {
  const escapedName = attributeName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = tag.match(new RegExp(
    `\\b${escapedName}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`,
    "iu"
  ));
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

function resolveRelativeModule(importer, specifier) {
  if (!specifier.startsWith(".")) return null;
  const withoutQuery = specifier.split(/[?#]/u, 1)[0];
  return normalizeSlashes(path.posix.normalize(path.posix.join(path.posix.dirname(importer), withoutQuery)));
}

function walkAst(node, visitor, ancestors = []) {
  if (node === null || typeof node !== "object") return;
  if (typeof node.type === "string") visitor(node, ancestors);
  const nextAncestors = typeof node.type === "string" ? [...ancestors, node] : ancestors;
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visitor, nextAncestors);
    } else if (value && typeof value === "object") {
      walkAst(value, visitor, nextAncestors);
    }
  }
}

function readWorkspaceText(root, relativePath) {
  return readWorkspaceBytes(root, relativePath).toString("utf8");
}

function readWorkspaceBytes(root, relativePath) {
  if (normalizeSlashes(relativePath) === RESTRICTED_APPS_WEB_SOURCE) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "RESTRICTED_SOURCE_READ_FORBIDDEN",
      RESTRICTED_APPS_WEB_SOURCE
    );
  }
  const absolutePath = resolveWorkspacePath(root, relativePath);
  const stat = lstatSync(absolutePath, { throwIfNoEntry: false });
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "SOURCE_FILE_INVALID",
      relativePath
    );
  }
  return readFileSync(absolutePath);
}

function resolveWorkspacePath(root, relativePath) {
  const normalized = normalizeSlashes(relativePath);
  if (path.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")
    || normalized.includes("/../")) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKSPACE_PATH_INVALID",
      relativePath
    );
  }
  const absolutePath = path.resolve(root, ...normalized.split("/"));
  const relative = path.relative(root, absolutePath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "WORKSPACE_PATH_ESCAPED",
      relativePath
    );
  }
  return absolutePath;
}

function assertStringArrayEqual(observed, expected, code, label) {
  const left = [...observed].sort();
  const right = [...expected].sort();
  if (left.length !== right.length || left.some((value, index) => value !== right[index])) {
    throw new WesternCivilTimeFactBrowserObservationError(
      code,
      `${label}; expected ${JSON.stringify(right)}, observed ${JSON.stringify(left)}`
    );
  }
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function canonicalJsonValue(value, omitObservationDigest = false) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalJsonValue(entry, false));
  }
  if (typeof value !== "object") {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_VALUE_INVALID",
      "candidate digest projection must contain JSON values only"
    );
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_VALUE_INVALID",
      "candidate digest projection contains a non-plain object"
    );
  }
  const keys = Object.keys(value).sort();
  if (Reflect.ownKeys(value).length !== keys.length) {
    throw new WesternCivilTimeFactBrowserObservationError(
      "OBSERVATION_CANDIDATE_VALUE_INVALID",
      "candidate digest projection contains a symbol or non-enumerable key"
    );
  }
  const result = {};
  for (const key of keys) {
    if (omitObservationDigest && key === "observationDigest") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new WesternCivilTimeFactBrowserObservationError(
        "OBSERVATION_CANDIDATE_VALUE_INVALID",
        "candidate digest projection contains an accessor"
      );
    }
    result[key] = canonicalJsonValue(descriptor.value, false);
  }
  return result;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}
