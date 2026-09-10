import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { TextDecoder, types as utilTypes } from "node:util";

import { parseExpression } from "@babel/parser";

import {
  FORMAL_NPM_STATIC_TERMINAL_COMMAND_COUNT,
  resolveFormalNpmLifecycleClosure
} from "./formal-npm-lifecycle-closure-lib.mjs";

export const ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH =
  "content/system-admission/ziwei-hko-restricted-source-pre-release-policy.v1.json";

export const ZIWEI_HKO_LIVE_CHECK_COMMAND =
  "npm run check:ziwei-iztro-isolated-build-license-notices";
export const ZIWEI_HKO_LIVE_TEST_COMMAND =
  "npm run test:ziwei-iztro-isolated-build-license-notices";
export const ZIWEI_HKO_QUICK_CI_JOB_BLOCK_BYTES = 2435;
export const ZIWEI_HKO_QUICK_CI_JOB_BLOCK_SHA256 =
  "a7391001d65519721671dbd53d241468571e32905ddcc3246c3ec19f48cd0fe0";

const POLICY_DIGEST_DOMAIN =
  "hakimi.ziwei.hko-restricted-source-pre-release-policy/1\0";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const MAX_POLICY_JSON_BYTES = 1024 * 1024;
const MAX_JSON_SNAPSHOT_NODES = 100000;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const JSON_PARSE = JSON.parse;
const MAP_ENTRIES = Map.prototype.entries;
const EXECUTION_BYPASS_KEYS = new Set([
  "if",
  "continue-on-error",
  "defaults",
  "shell",
  "working-directory",
  "env",
  "container",
  "<<"
]);

export const ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS = Object.freeze([
  Object.freeze({
    role: "live_gate_library",
    path: "scripts/ziwei-iztro-isolated-build-license-notice-lib.mjs",
    bytes: 65072,
    sha256: "d6f2f1e91e4ea0b4dcf5319df49d216be7920c9262028869c4eeacba9683a577"
  }),
  Object.freeze({
    role: "live_gate_cli",
    path: "scripts/verify-ziwei-iztro-isolated-build-license-notices.mjs",
    bytes: 2260,
    sha256: "b05e8a989d6bd565f7f10033dfd1acfb226ce8b3e09448df20962fdb2a0318c1"
  }),
  Object.freeze({
    role: "live_gate_rejection_tests",
    path: "scripts/verify-ziwei-iztro-isolated-build-license-notices.test.mjs",
    bytes: 37382,
    sha256: "fb9ca02f96370198383cf3bf6c4e77262e8064de5952c85d9a94957b54e0f603"
  }),
  Object.freeze({
    role: "formal_npm_lifecycle_closure_resolver",
    path: "scripts/formal-npm-lifecycle-closure-lib.mjs",
    bytes: 19013,
    sha256: "7a2cbdc59357b4c84cc866384f7df67eeab67e089bb1527b43cf061dcbccbfd8"
  })
]);

const REPRESENTATION_CLASSES = Object.freeze([
  "source_evidence_exact_json",
  "raw_snapshot_fixture_exact_json",
  "restricted_artifact_path_reference_utf8",
  "gzip_base64_payload_utf8",
  "gzip_payload_bytes",
  "decompressed_raw_csv_bytes"
]);

const LIFECYCLE_BINDINGS = Object.freeze([
  Object.freeze({
    surfaceId: "browser-preview",
    buildScript: "build:ziwei-browser-preview",
    buildCommand:
      "node apps/web/node_modules/vite/bin/vite.js build --config packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs --configLoader runner",
    prebuildScript: "prebuild:ziwei-browser-preview",
    prebuildCommand:
      `${ZIWEI_HKO_LIVE_CHECK_COMMAND} && npm run check:system-contract-draft-boundaries`,
    previewScript: "preview:ziwei-browser-preview",
    previewCommand:
      "node apps/web/node_modules/vite/bin/vite.js preview --config packages/ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs --configLoader runner --host 127.0.0.1 --port 4216 --strictPort",
    prepreviewScript: "prepreview:ziwei-browser-preview",
    prepreviewCommand: "npm run build:ziwei-browser-preview"
  }),
  Object.freeze({
    surfaceId: "browser-workspace",
    buildScript: "build:ziwei-browser-workspace",
    buildCommand:
      "node apps/web/node_modules/vite/bin/vite.js build --config packages/ziwei-workspace-artifact-draft/vite.browser-app.config.mjs --configLoader runner",
    prebuildScript: "prebuild:ziwei-browser-workspace",
    prebuildCommand:
      `${ZIWEI_HKO_LIVE_CHECK_COMMAND} && npm run check:system-contract-draft-boundaries`,
    previewScript: "preview:ziwei-browser-workspace",
    previewCommand:
      "node apps/web/node_modules/vite/bin/vite.js preview --config packages/ziwei-workspace-artifact-draft/vite.browser-app.config.mjs --configLoader runner --host 127.0.0.1 --port 4218 --strictPort",
    prepreviewScript: "prepreview:ziwei-browser-workspace",
    prepreviewCommand: "npm run build:ziwei-browser-workspace"
  })
]);

const QUICK_CI_BEFORE_COMMANDS = Object.freeze([
  "npm run check:system-contract-draft-boundaries",
  "npm run check:independent-source-inventory",
  "npm run check:independent-domain-inventory",
  "npm run check:release-governance"
]);
export const ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS = Object.freeze([
  "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json",
  "content/system-admission/four-system-admission.v1.json",
  "content/system-admission/ziwei-iztro-build-notice-evidence.v1.json"
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function snapshotJson(
  value,
  label = "value",
  state = { seen: new WeakSet(), nodeCount: 0 },
  depth = 0
) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("POLICY_VALUE_INVALID", `${label} has a non-canonical number`);
    return value;
  }
  if (typeof value !== "object") fail("POLICY_VALUE_INVALID", `${label} is not JSON data`);
  if (utilTypes.isProxy(value)) fail("POLICY_VALUE_INVALID", `${label} must not be a Proxy`);
  state.nodeCount += 1;
  if (state.nodeCount > MAX_JSON_SNAPSHOT_NODES || depth > 256) {
    fail("POLICY_VALUE_INVALID", `${label} exceeds the JSON snapshot limit`);
  }
  if (state.seen.has(value)) fail("POLICY_VALUE_INVALID", `${label} contains a cycle`);
  state.seen.add(value);
  if (Object.getOwnPropertySymbols(value).length !== 0) {
    fail("POLICY_VALUE_INVALID", `${label} contains symbol keys`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      fail("POLICY_VALUE_INVALID", `${label} is not an exact Array`);
    }
    const keys = Object.keys(descriptors).filter((key) => key !== "length");
    if (keys.length !== value.length || keys.some((key, index) => key !== String(index))) {
      fail("POLICY_VALUE_INVALID", `${label} is sparse or has non-index keys`);
    }
    const result = keys.map((key) => {
      const descriptor = descriptors[key];
      if (!("value" in descriptor) || !descriptor.enumerable) {
        fail("POLICY_VALUE_INVALID", `${label}[${key}] is not an enumerable data property`);
      }
      return snapshotJson(descriptor.value, `${label}[${key}]`, state, depth + 1);
    });
    state.seen.delete(value);
    return result;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("POLICY_VALUE_INVALID", `${label} is not a plain object`);
  }
  const result = Object.create(null);
  for (const key of Object.keys(descriptors).sort()) {
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || !descriptor.enumerable) {
      fail("POLICY_VALUE_INVALID", `${label}.${key} is not an enumerable data property`);
    }
    result[key] = snapshotJson(descriptor.value, `${label}.${key}`, state, depth + 1);
  }
  state.seen.delete(value);
  return result;
}

function walkAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visit);
    } else if (value && typeof value === "object") {
      walkAst(value, visit);
    }
  }
}

function decodeStrictPolicyJson(bytes, label) {
  if (utilTypes.isProxy(bytes)) {
    fail("POLICY_JSON_BYTES_INVALID", `${label} must not be a Proxy`);
  }
  if (!Buffer.isBuffer(bytes)) {
    fail("POLICY_JSON_BYTES_INVALID", `${label} must be a Buffer`);
  }
  const captured = Buffer.from(bytes);
  if (captured.byteLength === 0 || captured.byteLength > MAX_POLICY_JSON_BYTES) {
    fail("POLICY_JSON_SIZE_INVALID", `${label} has an invalid byte length`);
  }
  if (captured.byteLength >= 3
    && captured[0] === 0xef
    && captured[1] === 0xbb
    && captured[2] === 0xbf) {
    fail("POLICY_JSON_BOM_FORBIDDEN", `${label} must not contain a UTF-8 BOM`);
  }
  try {
    return Reflect.apply(TEXT_DECODER_DECODE, new TextDecoder("utf-8", { fatal: true }), [captured]);
  } catch (error) {
    fail("POLICY_JSON_UTF8_INVALID", `${label} is not strict UTF-8: ${error.message}`);
  }
}

export function parseZiweiHkoRestrictedSourcePreReleasePolicyJsonBytes(
  bytes,
  label = "Ziwei HKO restricted-source pre-release policy"
) {
  const source = decodeStrictPolicyJson(bytes, label);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: label,
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (error) {
    fail("POLICY_JSON_SYNTAX_INVALID", `${label} cannot be inspected as strict JSON: ${error.message}`);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty"
        || property.computed !== false
        || property.key?.type !== "StringLiteral") {
        fail("POLICY_JSON_PROPERTY_INVALID", `${label} contains a non-JSON object property`);
      }
      if (keys.has(property.key.value)) {
        fail(
          "POLICY_JSON_DUPLICATE_KEY",
          `${label} contains duplicate key ${JSON.stringify(property.key.value)}`
        );
      }
      keys.add(property.key.value);
    }
  });
  try {
    return JSON_PARSE(source);
  } catch (error) {
    fail("POLICY_JSON_INVALID", `${label} is not valid JSON: ${error.message}`);
  }
}

function canonicalJson(value) {
  const snapshot = snapshotJson(value);
  if (snapshot === null || typeof snapshot !== "object") return JSON.stringify(snapshot);
  if (Array.isArray(snapshot)) return `[${snapshot.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(snapshot).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(snapshot[key])}`).join(",")}}`;
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function expectedPolicyWithoutDigest() {
  return {
    schemaVersion: "1.0.0",
    recordType: "ziwei_hko_restricted_source_pre_release_policy",
    policyId: "hakimi.ziwei.hko-restricted-source-pre-release/1.0.0",
    status: "mandatory_live_check_policy_no_persisted_pass_receipt",
    systemIdentity: {
      productSystemId: "ziwei-doushu",
      contractSystemId: "ziwei",
      releaseIdentity: "isolated-ziwei-draft-no-main-schema",
      targetSchema: null,
      migrationId: null
    },
    sourceMaterialScope: {
      candidateId: "hakimi.ziwei.source-candidate/hko-calendar-boundary-replay-2023-2028/1.0.0",
      sourceBodySetDigest: "580108d977a4a4586115921e03502306ea8b5f8efe4558f76f37d072e8e8a445",
      annualBodyCount: 6,
      years: [2023, 2024, 2025, 2026, 2027, 2028],
      sourceEvidenceArtifact: {
        path: "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json",
        bytes: 8316,
        sha256: "61a9607aaa9b1133501fb9194f7be97e01f42e360b069fe38aa34d6eb8e2fd0e"
      },
      rawSnapshotFixtureArtifact: {
        path: "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
        bytes: 15501,
        sha256: "32dfd1a9ed204c5b96a100a082d1d02f0b9391ddcc867f32c2c06d39f2972fe2"
      },
      storagePolicy: "existing_workspace_snapshot_pending_independent_rights_review"
    },
    requiredLiveCheck: {
      command: ZIWEI_HKO_LIVE_CHECK_COMMAND,
      directEntrypoint: "node scripts/verify-ziwei-iztro-isolated-build-license-notices.mjs",
      testCommand: ZIWEI_HKO_LIVE_TEST_COMMAND,
      surfaces: ["browser-preview", "browser-workspace"],
      representationClasses: [...REPRESENTATION_CLASSES],
      mustExecuteFresh: true,
      historicalPassMaySatisfy: false,
      gateFailureModeWhenExecuted: "fail_closed",
      preLifecycleCannotBeSkippedEstablished: false,
      lifecycleBindings: LIFECYCLE_BINDINGS.map((entry) => ({ ...entry })),
      quickCi: {
        workflowPath: ".github/workflows/quick-ci.yml",
        jobId: "toolchain-and-boundaries",
        jobBlockBytes: ZIWEI_HKO_QUICK_CI_JOB_BLOCK_BYTES,
        jobBlockSha256: ZIWEI_HKO_QUICK_CI_JOB_BLOCK_SHA256,
        checkCommand: ZIWEI_HKO_LIVE_CHECK_COMMAND,
        testCommand: ZIWEI_HKO_LIVE_TEST_COMMAND,
        checkExactCount: 1,
        testExactCount: 1,
        checkBeforeTest: true,
        bothBeforeCommands: [...QUICK_CI_BEFORE_COMMANDS]
      },
      futureRootPackageZiweiNamedBuildOrPreviewScriptsRequireExplicitPolicyRegistration: true,
      currentRootPackageProtectedCommandAliasRegistrationRequired: true
    },
    implementationBindings: ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS.map((entry) => ({ ...entry })),
    persistenceBoundary: {
      policyPersisted: true,
      pointInTimeExecutionReceiptPersisted: false,
      outputAbsenceProofPersisted: false,
      latestPassPersisted: false,
      formalReleaseEvidenceReceipt: false,
      fourSystemRegistryAdmissionClaimed: false,
      independentDomainManifestAdmissionClaimed: false
    },
    observationBoundary: {
      exactCurrentRepresentationsOnly: true,
      universalTranscodingAbsenceEstablished: false,
      workspaceRawBodiesRemovedOrVaulted: false,
      linkOnlyStorageEstablished: false,
      crossFileAtomicityEstablished: false,
      intervalIntegrityEstablished: false,
      abaResistanceEstablished: false,
      mutationEpochEstablished: false
    },
    authorityBoundary: {
      sourceBindingFrozen: false,
      sourceBundleComplete: false,
      workRightsEstablished: false,
      editionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      expertClaimsAuthorized: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicBuildInclusionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    parentBindingBoundary: {
      bindsPersistedIztroNoticeEvidence: false,
      bindsIndependentZiweiManifest: false,
      bindsFourSystemRegistry: false,
      bindsDefaultV13FormalReceiptAllowlist: false,
      defaultV13FormalNpmClosureIsolation: {
        scope: "static_modeled_command_and_npm_lifecycle_reference_graph_only",
        independentlyRecomputedFromReceiptAndPackageInputs: true,
        exactParentClosureIdentityPersisted: false,
        terminalCommandGrammar: "exact_static_release_terminal_allowlist_v1",
        allowedTerminalCommandCount: FORMAL_NPM_STATIC_TERMINAL_COMMAND_COUNT,
        opaqueOrDynamicTerminalCommandsAcceptedByStaticModel: false,
        modeledStaticHkoReferenceCount: 0,
        effectiveNpmRuntimeClosureEstablished: false,
        ambientNpmConfigNeutralized: false,
        preLifecycleCannotBeSkippedEstablished: false,
        transitiveModuleConfigOrWrapperExecutionAbsenceEstablished: false
      },
      isolationArtifactPaths: [...ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS],
      parentArtifactReferenceCount: 0
    },
    integrityBoundary: {
      digestAlgorithm: "SHA-256",
      digestDomain: "hakimi.ziwei.hko-restricted-source-pre-release-policy/1",
      digestIsDigitalSignature: false,
      signerIdentity: null,
      digitalSignature: null
    },
    doesNotEstablish: [
      "point_in_time_output_absence_without_a_fresh_live_run",
      "unknown_transcoding_fragmentation_reordering_or_other_encoding_absence",
      "link_only_storage_or_workspace_raw_body_removal_or_private_vaulting",
      "work_edition_carrier_rights_or_legal_conclusion",
      "source_binding_freeze_source_bundle_or_content_truth",
      "expert_identity_independence_opinion_or_expert_truth",
      "browser_runtime_public_host_pwa_or_cross_browser_evidence",
      "release_evidence_release_readiness_or_public_authorization",
      "cross_file_atomicity_interval_integrity_aba_resistance_or_mutation_epoch",
      "effective_npm_runtime_closure_or_effective_npm_config_neutralization",
      "pre_or_post_lifecycle_execution_cannot_be_skipped",
      "transitive_module_config_or_wrapper_execution_absence"
    ]
  };
}

export function computeZiweiHkoRestrictedSourcePreReleasePolicyDigest(policy) {
  const snapshot = snapshotJson(policy, "policy");
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    fail("POLICY_INVALID", "policy must be a plain object");
  }
  const { policyDigest: _ignored, ...withoutDigest } = snapshot;
  return sha256(Buffer.from(`${POLICY_DIGEST_DOMAIN}${canonicalJson(withoutDigest)}`, "utf8"));
}

export function buildZiweiHkoRestrictedSourcePreReleasePolicy() {
  const policy = expectedPolicyWithoutDigest();
  return Object.freeze({
    ...policy,
    policyDigest: computeZiweiHkoRestrictedSourcePreReleasePolicyDigest(policy)
  });
}

function workflowJobKey(line) {
  const match = line.match(/^  (?:(?:"([A-Za-z0-9_-]+)")|(?:'([A-Za-z0-9_-]+)')|([A-Za-z0-9_-]+)):\s*(?:#.*)?$/u);
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

function leadingYamlKey(line) {
  const match = line.match(/^\s*(?:-\s*)?(?:(?:"([A-Za-z0-9_-]+|<<)")|(?:'([A-Za-z0-9_-]+|<<)')|([A-Za-z0-9_-]+|<<))\s*:/u);
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

function workflowJobBlock(workflow, jobId) {
  if (typeof workflow !== "string" || workflow.includes("\0")) {
    fail("QUICK_CI_INVALID", "Quick CI workflow must be text without NUL bytes");
  }
  const lines = workflow.split(/\r?\n/u);
  const starts = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (workflowJobKey(lines[index]) === jobId) starts.push(index);
  }
  if (starts.length === 0) fail("QUICK_CI_JOB_MISSING", `Quick CI job ${jobId} is missing`);
  if (starts.length !== 1) fail("QUICK_CI_JOB_DUPLICATE", `Quick CI job ${jobId} is duplicated`);
  const [start] = starts;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (workflowJobKey(lines[index]) !== null) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end);
}

function workflowCommandIndexes(block, command) {
  const indexes = [];
  for (let index = 0; index < block.length; index += 1) {
    const trimmed = block[index].trim();
    if (trimmed === `run: ${command}` || trimmed === `- run: ${command}`) indexes.push(index);
  }
  return indexes;
}

function normalizedReferenceForms(value) {
  const normalized = value.toLowerCase().replaceAll("\\", "/");
  return {
    normalized,
    compact: normalized.replace(/[^a-z0-9]/gu, "")
  };
}

function containsReference(value, needles) {
  if (typeof value !== "string") return false;
  const candidate = normalizedReferenceForms(value);
  return needles.some((needle) => {
    const expected = normalizedReferenceForms(needle);
    return candidate.normalized.includes(expected.normalized)
      || candidate.compact.includes(expected.compact);
  });
}

function verifyPackageLifecycle(packageJson, policy) {
  const packageSnapshot = snapshotJson(packageJson, "packageJson");
  const scripts = packageSnapshot?.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    fail("PACKAGE_SCRIPTS_INVALID", "package scripts are missing");
  }
  if (scripts["check:ziwei-iztro-isolated-build-license-notices"]
      !== policy.requiredLiveCheck.directEntrypoint
    || scripts["test:ziwei-iztro-isolated-build-license-notices"]
      !== "node --test scripts/verify-ziwei-iztro-isolated-build-license-notices.test.mjs") {
    fail("LIVE_SCRIPT_DRIFT", "Ziwei live check or test script drifted");
  }
  for (const binding of policy.requiredLiveCheck.lifecycleBindings) {
    if (scripts[binding.buildScript] !== binding.buildCommand
      || scripts[binding.prebuildScript] !== binding.prebuildCommand
      || scripts[binding.previewScript] !== binding.previewCommand
      || scripts[binding.prepreviewScript] !== binding.prepreviewCommand
    ) {
      fail("LIFECYCLE_BINDING_DRIFT", `Ziwei lifecycle binding drifted for ${binding.surfaceId}`);
    }
  }
  const expectedLifecycleScripts = policy.requiredLiveCheck.lifecycleBindings
    .flatMap((entry) => [
      entry.buildScript,
      entry.prebuildScript,
      entry.previewScript,
      entry.prepreviewScript
    ]).sort();
  const nonLifecycleGateScripts = new Set([
    "check:ziwei-iztro-isolated-build-license-notices",
    "test:ziwei-iztro-isolated-build-license-notices"
  ]);
  const actualLifecycleScripts = Object.keys(scripts).filter((key) => {
    if (nonLifecycleGateScripts.has(key)) return false;
    const normalized = key.toLowerCase();
    return normalized.includes("ziwei")
      && (normalized.includes("build") || normalized.includes("preview"));
  }).sort();
  if (!sameJson(actualLifecycleScripts, expectedLifecycleScripts)) {
    fail("UNREGISTERED_ZIWEI_LIFECYCLE", "Ziwei build or preview script is not registered by policy");
  }
  const lifecycleScriptSet = new Set(expectedLifecycleScripts);
  const protectedCommandNeedles = policy.requiredLiveCheck.lifecycleBindings.flatMap((entry) => [
    entry.buildScript,
    entry.previewScript,
    entry.buildCommand.match(/packages\/[^ ]+\.config\.mjs/u)?.[0],
    entry.previewCommand.match(/packages\/[^ ]+\.config\.mjs/u)?.[0]
  ]).filter(Boolean);
  for (const [scriptName, command] of Object.entries(scripts)) {
    if (containsReference(command, protectedCommandNeedles)
      && !lifecycleScriptSet.has(scriptName)) {
      fail(
        "UNREGISTERED_ZIWEI_LIFECYCLE",
        `Ziwei build or preview command is aliased by unregistered script ${scriptName}`
      );
    }
  }
}

function verifyQuickCi(quickWorkflow, policy) {
  const quick = policy.requiredLiveCheck.quickCi;
  const workflowLines = quickWorkflow.split(/\r?\n/u);
  if (workflowLines.some((line) => !/^\s/u.test(line)
    && ["defaults", "env"].includes(leadingYamlKey(line)))) {
    fail("QUICK_CI_EXECUTION_BYPASS", "Quick CI cannot define global defaults or env for this gate");
  }
  const block = workflowJobBlock(quickWorkflow, quick.jobId);
  const bypassKey = block.map(leadingYamlKey).find((key) => EXECUTION_BYPASS_KEYS.has(key));
  if (bypassKey !== undefined) {
    fail(
      "QUICK_CI_EXECUTION_BYPASS",
      `Ziwei Quick CI job cannot use execution-control key ${bypassKey}`
    );
  }
  const checkIndexes = workflowCommandIndexes(block, quick.checkCommand);
  const testIndexes = workflowCommandIndexes(block, quick.testCommand);
  if (checkIndexes.length !== quick.checkExactCount || testIndexes.length !== quick.testExactCount) {
    fail("QUICK_CI_COMMAND_COUNT", "Ziwei live check and test must each run exactly once");
  }
  if (quick.checkBeforeTest && checkIndexes[0] >= testIndexes[0]) {
    fail("QUICK_CI_COMMAND_ORDER", "Ziwei live check must run before its rejection tests");
  }
  for (const command of quick.bothBeforeCommands) {
    const indexes = workflowCommandIndexes(block, command);
    if (indexes.length !== 1 || checkIndexes[0] >= indexes[0] || testIndexes[0] >= indexes[0]) {
      fail("QUICK_CI_COMMAND_ORDER", `Ziwei live check and test must precede ${command}`);
    }
  }
  const jobBlockBytes = Buffer.from(block.join("\n"), "utf8");
  if (jobBlockBytes.byteLength !== quick.jobBlockBytes
    || sha256(jobBlockBytes) !== quick.jobBlockSha256) {
    fail(
      "QUICK_CI_WORKFLOW_IDENTITY_DRIFT",
      "Quick CI target-job identity drifted from the reviewed step structure"
    );
  }
}

function verifyImplementationArtifacts(artifacts) {
  if (!artifacts || typeof artifacts !== "object") {
    fail("IMPLEMENTATION_ARTIFACTS_INVALID", "implementation artifacts are missing");
  }
  if (utilTypes.isProxy(artifacts)) {
    fail("IMPLEMENTATION_ARTIFACTS_INVALID", "implementation artifacts must not be a Proxy");
  }
  const expectedPaths = ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS
    .map((entry) => entry.path).sort();
  let entries;
  if (Object.getPrototypeOf(artifacts) === Map.prototype) {
    entries = [...Reflect.apply(MAP_ENTRIES, artifacts, [])];
  } else {
    const prototype = Object.getPrototypeOf(artifacts);
    if (prototype !== Object.prototype && prototype !== null) {
      fail("IMPLEMENTATION_ARTIFACTS_INVALID", "implementation artifacts must be a plain object or exact Map");
    }
    const descriptors = Object.getOwnPropertyDescriptors(artifacts);
    const ownKeys = Reflect.ownKeys(descriptors);
    if (ownKeys.some((key) => typeof key !== "string")) {
      fail("IMPLEMENTATION_ARTIFACTS_INVALID", "implementation artifacts contain symbol keys");
    }
    entries = ownKeys.map((key) => {
      const descriptor = descriptors[key];
      if (!("value" in descriptor) || !descriptor.enumerable) {
        fail("IMPLEMENTATION_ARTIFACTS_INVALID", `implementation artifact ${key} is not an enumerable data property`);
      }
      return [key, descriptor.value];
    });
  }
  const entryMap = new Map(entries);
  if (entryMap.size !== entries.length
    || !sameJson([...entryMap.keys()].sort(), expectedPaths)) {
    fail("IMPLEMENTATION_ARTIFACTS_INVALID", "implementation artifact paths are missing, duplicated or extra");
  }
  for (const spec of ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS) {
    const bytes = entryMap.get(spec.path);
    if (utilTypes.isProxy(bytes) || !Buffer.isBuffer(bytes)) {
      fail("IMPLEMENTATION_IDENTITY_DRIFT", `implementation identity drifted for ${spec.path}`);
    }
    const captured = Buffer.from(bytes);
    if (captured.byteLength !== spec.bytes || sha256(captured) !== spec.sha256) {
      fail("IMPLEMENTATION_IDENTITY_DRIFT", `implementation identity drifted for ${spec.path}`);
    }
  }
}

function verifyDefaultV13Isolation(defaultV13RequiredReceiptCommands) {
  const snapshot = snapshotJson(defaultV13RequiredReceiptCommands, "defaultV13RequiredReceiptCommands");
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    fail("DEFAULT_V13_RECEIPTS_INVALID", "default v13 receipt commands are invalid");
  }
  const forbidden = [
    ZIWEI_HKO_LIVE_CHECK_COMMAND,
    ZIWEI_HKO_LIVE_TEST_COMMAND,
    "node scripts/verify-ziwei-iztro-isolated-build-license-notices.mjs"
  ];
  for (const [receiptId, command] of Object.entries(snapshot)) {
    const commandText = Array.isArray(command) ? command.join(" ") : String(command);
    if (forbidden.some((value) => commandText.includes(value))) {
      fail("DEFAULT_V13_SCOPE_VIOLATION", `default v13 receipt ${receiptId} contains a Ziwei-only gate`);
    }
  }
}

function forbiddenPolicyReferences(policy) {
  return [
    policy.policyId,
    ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH,
    policy.policyDigest,
    "scripts/ziwei-hko-restricted-source-pre-release-policy-lib.mjs"
  ];
}

function forbiddenHkoExecutionReferences(policy) {
  return [
    ...forbiddenPolicyReferences(policy),
    ZIWEI_HKO_LIVE_CHECK_COMMAND,
    ZIWEI_HKO_LIVE_TEST_COMMAND,
    policy.requiredLiveCheck.directEntrypoint,
    "check:ziwei-iztro-isolated-build-license-notices",
    "test:ziwei-iztro-isolated-build-license-notices",
    "verify-ziwei-iztro-isolated-build-license-notices.mjs"
  ];
}

function jsonContainsForbiddenReference(value, forbidden) {
  if (typeof value === "string") return containsReference(value, forbidden);
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((entry) => jsonContainsForbiddenReference(entry, forbidden));
  }
  return Object.entries(value).some(([key, entry]) =>
    containsReference(key, forbidden)
      || jsonContainsForbiddenReference(entry, forbidden));
}

function verifyFormalNpmClosureIsolation({
  defaultV13RequiredReceiptCommands,
  packageJson,
  webPackageJson,
  formalNpmEmbeddedCommands,
  policy
}) {
  const receipts = snapshotJson(
    defaultV13RequiredReceiptCommands,
    "defaultV13RequiredReceiptCommands"
  );
  const rootPackage = snapshotJson(packageJson, "packageJson");
  const webPackage = snapshotJson(webPackageJson, "webPackageJson");
  const embeddedCommands = snapshotJson(formalNpmEmbeddedCommands, "formalNpmEmbeddedCommands");
  let resolved;
  try {
    resolved = resolveFormalNpmLifecycleClosure(receipts, {
      root: { path: "package.json", packageJson: rootPackage },
      web: { path: "apps/web/package.json", packageJson: webPackage },
      embeddedCommands
    });
  } catch (error) {
    if (error?.code === "FORMAL_NPM_OPAQUE_TERMINAL_COMMAND") {
      fail(
        "DEFAULT_V13_SCOPE_VIOLATION",
        "default-v13 formal closure contains an opaque or dynamic terminal command"
      );
    }
    throw error;
  }
  const forbidden = forbiddenHkoExecutionReferences(policy);
  for (const reference of resolved.observedReferences) {
    if (containsReference(reference.value, forbidden)) {
      fail(
        "DEFAULT_V13_SCOPE_VIOLATION",
        `${reference.label} reaches a Ziwei-only gate`
      );
    }
  }
  if (resolved.unmodeledTerminalCommands.length > 0) {
    fail(
      "DEFAULT_V13_SCOPE_VIOLATION",
      "default-v13 formal closure contains an opaque or dynamic terminal command"
    );
  }
}

function verifyParentIsolationArtifacts(parentIsolationArtifacts, policy) {
  if (!parentIsolationArtifacts || typeof parentIsolationArtifacts !== "object"
    || utilTypes.isProxy(parentIsolationArtifacts)) {
    fail("PARENT_ISOLATION_ARTIFACTS_INVALID", "parent isolation artifacts are missing or proxied");
  }
  const prototype = Object.getPrototypeOf(parentIsolationArtifacts);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("PARENT_ISOLATION_ARTIFACTS_INVALID", "parent isolation artifacts must be a plain object");
  }
  const descriptors = Object.getOwnPropertyDescriptors(parentIsolationArtifacts);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")
    || !sameJson([...ownKeys].sort(), [...ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS].sort())) {
    fail("PARENT_ISOLATION_ARTIFACTS_INVALID", "parent isolation artifact paths drifted");
  }
  const forbidden = forbiddenPolicyReferences(policy);
  for (const artifactPath of ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS) {
    const descriptor = descriptors[artifactPath];
    if (!("value" in descriptor) || !descriptor.enumerable
      || utilTypes.isProxy(descriptor.value) || !Buffer.isBuffer(descriptor.value)) {
      fail("PARENT_ISOLATION_ARTIFACTS_INVALID", `parent isolation artifact ${artifactPath} is not passive bytes`);
    }
    const parsed = parseZiweiHkoRestrictedSourcePreReleasePolicyJsonBytes(
      Buffer.from(descriptor.value),
      artifactPath
    );
    const snapshot = snapshotJson(parsed, artifactPath);
    if (jsonContainsForbiddenReference(snapshot, forbidden)) {
      fail("PARENT_SCOPE_VIOLATION", `${artifactPath} references the independent HKO policy`);
    }
  }
}

export function verifyZiweiHkoRestrictedSourcePreReleasePolicy({
  policy,
  packageJson,
  quickWorkflow,
  implementationArtifacts,
  defaultV13RequiredReceiptCommands,
  webPackageJson,
  formalNpmEmbeddedCommands,
  parentIsolationArtifacts
}) {
  const snapshot = snapshotJson(policy, "policy");
  if (typeof snapshot.policyDigest !== "string" || !SHA256_PATTERN.test(snapshot.policyDigest)
    || snapshot.policyDigest !== computeZiweiHkoRestrictedSourcePreReleasePolicyDigest(snapshot)) {
    fail("POLICY_DIGEST_MISMATCH", "policy digest is invalid");
  }
  const expected = buildZiweiHkoRestrictedSourcePreReleasePolicy();
  if (!sameJson(snapshot, expected)) {
    fail("POLICY_SEMANTIC_DRIFT", "policy no longer matches the exact fail-closed contract");
  }
  verifyImplementationArtifacts(implementationArtifacts);
  verifyPackageLifecycle(packageJson, snapshot);
  verifyQuickCi(quickWorkflow, snapshot);
  verifyDefaultV13Isolation(defaultV13RequiredReceiptCommands);
  verifyFormalNpmClosureIsolation({
    defaultV13RequiredReceiptCommands,
    packageJson,
    webPackageJson,
    formalNpmEmbeddedCommands,
    policy: snapshot
  });
  verifyParentIsolationArtifacts(parentIsolationArtifacts, snapshot);
  return Object.freeze({
    policyId: snapshot.policyId,
    status: snapshot.status,
    staticMandatoryLiveCheckPolicyBound: true,
    modeledStaticNpmLifecycleIsolationBound: true,
    effectiveNpmRuntimeClosureEstablished: false,
    ambientNpmConfigNeutralized: false,
    preLifecycleCannotBeSkippedEstablished: false,
    transitiveModuleConfigOrWrapperExecutionAbsenceEstablished: false,
    liveExecutionPerformedByGovernance: false,
    pointInTimePassPersisted: false,
    outputAbsenceEstablishedByGovernance: false,
    formalReleaseEvidenceReceipt: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicBuildInclusionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  });
}

export const ziweiHkoRestrictedSourcePreReleasePolicyTestOnly = Object.freeze({
  canonicalJson,
  expectedPolicyWithoutDigest,
  workflowJobBlock
});
