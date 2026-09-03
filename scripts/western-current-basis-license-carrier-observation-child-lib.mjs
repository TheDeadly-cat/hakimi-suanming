import { createHash } from "node:crypto";
import { Buffer as NodeBuffer } from "node:buffer";
import { lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate,
  loadWesternSourceAndManifestIdentityDriftReceiptCandidate
} from "./western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs";
import {
  isVerifiedWesternIndependentEngineeringManifestV2,
  loadWesternIndependentEngineeringManifestV2
} from "./western-independent-engineering-manifest-v2-lib.mjs";
import {
  runWesternIsolatedBuildLicenseNoticeVerification
} from "./western-isolated-build-license-notice-lib.mjs";

export const WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH =
  "content/system-admission/western-current-basis-license-carrier-observation-child.v1.0.0.json";

const CHILD_ID =
  "hakimi.western.current-basis-license-carrier-observation-child/1.0.0";
const RECORD_TYPE =
  "western_current_basis_and_declared_dependency_license_carrier_observation_child_v1";
const STATUS =
  "current_basis_and_two_external_dependency_carriers_observed_unbound_no_legal_conclusion";
const CREATED_AT = "2026-09-01T13:08:00.000Z";
const DIGEST_DOMAIN =
  "hakimi.western.current-basis-license-carrier-observation-child.v1\0";
const DEFAULT_WORKSPACE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SHA256 = /^[0-9a-f]{64}$/u;
const MAX_DEPTH = 72;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PROTOTYPE = Array.prototype;
const NATIVE_ARRAY = Array;
const NATIVE_BUFFER = NodeBuffer;
const BUFFER_FROM = NodeBuffer.from;
const NATIVE_JSON = JSON;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_MAP = Map;
const MAP_GET = Map.prototype.get;
const MAP_SET = Map.prototype.set;
const NATIVE_OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_SET_PROTOTYPE_OF = Object.setPrototypeOf;
const NUMBER_IS_FINITE = Number.isFinite;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const NATIVE_WEAK_MAP = WeakMap;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const VERIFIED_CONTEXTS = new NATIVE_WEAK_SET();
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const UPSTREAMS = OBJECT_FREEZE({
  driftReceipt: OBJECT_FREEZE({
    path: "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json",
    rawBytes: 12_537,
    rawSha256: "09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26",
    candidateId: "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/1.0.0",
    receiptDigest: "f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097"
  }),
  currentThreePackageManifest: OBJECT_FREEZE({
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v2.json",
    rawBytes: 72_472,
    rawSha256: "a4ba9ca6504e5d386be5302c28a498d95b172a3904c5ddc5f90a8adcc5951f27",
    manifestId: "hakimi.western-astrology.three-package-authored-machine-identity-manifest/2.0.0",
    manifestDigest: "4ed66eeae3d0f7a45dcb850a67dfb6407b695a2f6ecb58eac8b0dd1748db632d"
  }),
  astronomyBuildNotice: OBJECT_FREEZE({
    path: "content/system-admission/western-astronomy-engine-build-notice-evidence.v1.json",
    rawBytes: 8_994,
    rawSha256: "98525929045505831e6f62feaa6a3a9802c5e5680637463464f4f1030e7e45d9",
    evidenceLedgerId: "hakimi.western.astronomy-engine-build-notice-evidence/1.0.0",
    evidenceDigest: "0645b6a4fd6308576346b9efefd9caabfd42684609702e87c6077e724b046a30"
  })
});

const BASIS_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "workspace_dependency_lock",
    path: "package-lock.json",
    rawBytes: 175_812,
    rawSha256: "40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d"
  }),
  OBJECT_FREEZE({
    role: "western_contracts_package_manifest",
    path: "packages/western-astrology-contracts-draft/package.json",
    rawBytes: 381,
    rawSha256: "8e408c8e6b9e28b64000c4b800a822d0c982d49866e72f9a36ab995db306f54b"
  }),
  OBJECT_FREEZE({
    role: "western_astronomy_adapter_package_manifest",
    path: "packages/western-astronomy-engine-adapter-draft/package.json",
    rawBytes: 540,
    rawSha256: "e7639fc309f3d92729ce2084275bad75702cb70df151c663bffd8b35cae15786"
  }),
  OBJECT_FREEZE({
    role: "western_rules_preview_package_manifest",
    path: "packages/western-astrology-rules-preview-draft/package.json",
    rawBytes: 497,
    rawSha256: "42d5a3860d53b3a1cd243341ecc9aee6b7ffc10ec7799d61a4218ff31f99418b"
  }),
  OBJECT_FREEZE({
    role: "western_source_requirements_contract_document",
    path: "docs/西洋星盘契约草案与来源门-v0.1.md",
    rawBytes: 20_999,
    rawSha256: "3a8e38d3f321e3232c0c895476cb4b7be61473c67d7a956444ccb8d4776c6c57"
  }),
  OBJECT_FREEZE({
    role: "current_western_contract_index",
    path: "packages/western-astrology-contracts-draft/src/index.ts",
    rawBytes: 39_756,
    rawSha256: "87bf4fcecc7ec85542eed25c7c06869ba3a084c5e7d7fb305fcd7712ef508416"
  }),
  OBJECT_FREEZE({
    role: "current_split_civil_input_contract",
    path: "packages/western-astrology-contracts-draft/src/civil-input.ts",
    rawBytes: 2_910,
    rawSha256: "e1e9cfa1f8f800e5c1ef61b7fdd134fcf0276664411c0691d64ccba21ed81458"
  }),
  OBJECT_FREEZE({
    role: "current_western_astronomy_adapter_index",
    path: "packages/western-astronomy-engine-adapter-draft/src/index.ts",
    rawBytes: 19_629,
    rawSha256: "ccf29e09dbcd0422da67cdb8c623061f974ff05335a768758254e869b8ac4d83"
  })
]);

const PACKAGE_ROOTS = OBJECT_FREEZE([
  "packages/western-astrology-contracts-draft",
  "packages/western-astrology-rules-preview-draft",
  "packages/western-astronomy-engine-adapter-draft"
]);

const ASTRONOMY_ENGINE = OBJECT_FREEZE({
  packageName: "astronomy-engine",
  version: "2.1.19",
  packagePath: "node_modules/astronomy-engine",
  resolved: "https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz",
  integrity: "sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==",
  declaredLicense: "MIT",
  packageManifest: OBJECT_FREEZE({
    path: "node_modules/astronomy-engine/package.json",
    rawBytes: 1_078,
    rawSha256: "d035702763839ae11f41600cf4b8210005672658dcb19cea4a09591078af4931"
  }),
  exactInstalledLicensePath: "node_modules/astronomy-engine/LICENSE",
  sourceLock: OBJECT_FREEZE({
    path: "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-source-lock.json",
    rawBytes: 2_547,
    rawSha256: "a0d929d78cff75aa543e78350aece6a35636c4c081f5620c5a7cc9aaaf400975"
  }),
  controlledLicenseCopies: OBJECT_FREEZE([
    OBJECT_FREEZE({
      path: "packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
      rawBytes: 1_095,
      rawSha256: "690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023"
    }),
    OBJECT_FREEZE({
      path: "packages/western-astrology-rules-preview-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
      rawBytes: 1_095,
      rawSha256: "690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023"
    })
  ])
});

const ZOD = OBJECT_FREEZE({
  packageName: "zod",
  version: "4.4.3",
  packagePath: "node_modules/zod",
  resolved: "https://registry.npmjs.org/zod/-/zod-4.4.3.tgz",
  integrity: "sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ==",
  declaredLicense: "MIT",
  packageManifest: OBJECT_FREEZE({
    path: "node_modules/zod/package.json",
    rawBytes: 3_796,
    rawSha256: "c630bd10b52dcf71c112a2bf78dbf2734b9db58d62de663b8d86c2ec2c8cda2e"
  }),
  licenseCarrier: OBJECT_FREEZE({
    path: "node_modules/zod/LICENSE",
    rawBytes: 1_072,
    rawSha256: "3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8"
  })
});

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 14_068,
  rawSha256: "abde812040df2f8589ce20b31ede147253a18e8656332cdc8c17255de1ccbb2d"
});

export class WesternCurrentBasisLicenseCarrierChildError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WesternCurrentBasisLicenseCarrierChildError";
    this.code = code;
    this.safeForCli = true;
  }
}

function fail(code, message, cause) {
  throw new WesternCurrentBasisLicenseCarrierChildError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function sha256Bytes(bytes) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

function isArrayIndex(key, length) {
  if (typeof key !== "string" || key === "" || key === "length") return false;
  const numeric = Number(key);
  return Number.isSafeInteger(numeric) && numeric >= 0 && numeric < length
    && String(numeric) === key;
}

function sortStrings(values) {
  const output = [];
  const pending = [...values];
  while (pending.length > 0) {
    let selected = 0;
    for (let index = 1; index < pending.length; index += 1) {
      if (pending[index] < pending[selected]) selected = index;
    }
    output.push(pending[selected]);
    pending.splice(selected, 1);
  }
  return output;
}

function passiveClone(value, seen = new NATIVE_WEAK_MAP(), depth = 0) {
  if (depth > MAX_DEPTH) fail("JSON_DEPTH_EXCEEDED", "JSON nesting exceeds the fixed bound.");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && REFLECT_APPLY(NUMBER_IS_FINITE, Number, [value])) return value;
  if (typeof value !== "object") fail("NON_JSON_VALUE", "Only finite passive JSON values are accepted.");
  if (REFLECT_APPLY(WEAK_MAP_GET, seen, [value]) !== undefined) {
    fail("CYCLIC_JSON", "Cyclic or aliased JSON objects are not accepted.");
  }
  REFLECT_APPLY(WEAK_MAP_SET, seen, [value, true]);
  const prototype = REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
  const descriptors = REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTORS, Object, [value]);
  const ownKeys = REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [descriptors]);
  if (ARRAY_IS_ARRAY(value)) {
    if (prototype !== ARRAY_PROTOTYPE && prototype !== null) {
      fail("NON_PLAIN_ARRAY", "Array prototype drift is rejected.");
    }
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || typeof lengthDescriptor.value !== "number") {
      fail("SPARSE_ARRAY", "Array length descriptor is invalid.");
    }
    const length = lengthDescriptor.value;
    const output = new NATIVE_ARRAY(length);
    REFLECT_APPLY(OBJECT_SET_PROTOTYPE_OF, Object, [output, null]);
    for (let index = 0; index < ownKeys.length; index += 1) {
      const key = ownKeys[index];
      if (key === "length") continue;
      if (typeof key === "symbol" || !isArrayIndex(key, length)) {
        fail("ARRAY_PROPERTY_FORBIDDEN", "Array has a non-index property.");
      }
    }
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)
        || "get" in descriptor || "set" in descriptor) {
        fail("SPARSE_ARRAY", "Array must contain dense enumerable data properties.");
      }
      OBJECT_DEFINE_PROPERTY(output, String(index), {
        value: passiveClone(descriptor.value, seen, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  if (prototype !== NATIVE_OBJECT_PROTOTYPE && prototype !== null) {
    fail("NON_PLAIN_OBJECT", "Only plain JSON objects are accepted.");
  }
  const keys = [];
  for (let index = 0; index < ownKeys.length; index += 1) {
    const key = ownKeys[index];
    if (typeof key === "symbol") fail("SYMBOL_KEY_FORBIDDEN", "Symbol keys are rejected.");
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !("value" in descriptor) || "get" in descriptor || "set" in descriptor) {
      fail("ACCESSOR_OR_HIDDEN_PROPERTY", "Only enumerable data properties are accepted.");
    }
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      fail("DANGEROUS_JSON_KEY", "Dangerous JSON keys are rejected.");
    }
    keys.push(key);
  }
  const output = OBJECT_CREATE(null);
  const sorted = sortStrings(keys);
  for (let index = 0; index < sorted.length; index += 1) {
    const key = sorted[index];
    OBJECT_DEFINE_PROPERTY(output, key, {
      value: passiveClone(descriptors[key].value, seen, depth + 1),
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return output;
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const keys = OBJECT_KEYS(value);
  for (let index = 0; index < keys.length; index += 1) deepFreeze(value[keys[index]], seen);
  return REFLECT_APPLY(OBJECT_FREEZE, Object, [value]);
}

export function canonicalStringifyWesternCurrentBasisLicenseCarrierChild(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [passiveClone(value)]);
}

function prettyStringify(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [passiveClone(value), null, 2]) + "\n";
}

export function computeWesternCurrentBasisLicenseCarrierChildDigest(child) {
  const snapshot = passiveClone(child);
  const unsigned = OBJECT_CREATE(null);
  const keys = OBJECT_KEYS(snapshot);
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] === "childDigest") continue;
    OBJECT_DEFINE_PROPERTY(unsigned, keys[index], {
      value: snapshot[keys[index]],
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return sha256Bytes(REFLECT_APPLY(BUFFER_FROM, NATIVE_BUFFER, [
    DIGEST_DOMAIN + canonicalStringifyWesternCurrentBasisLicenseCarrierChild(unsigned),
    "utf8"
  ]));
}

function assertSnapshot(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("LOCAL_ENDPOINT_IDENTITY_DRIFT", label + " identity drifted.");
  }
}

function strictJson(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail(cause?.code ?? "STRICT_JSON_INVALID", label + " is not strict JSON.", cause);
  }
}

function publicIdentity(snapshot) {
  return {
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  };
}

function exactJson(left, right) {
  return canonicalStringifyWesternCurrentBasisLicenseCarrierChild(left)
    === canonicalStringifyWesternCurrentBasisLicenseCarrierChild(right);
}

function exactKeys(value, expected) {
  return exactJson(sortStrings(OBJECT_KEYS(value ?? {})), sortStrings(expected));
}

async function observeExactAbsence(workspaceRoot, relativePath) {
  const absolute = path.resolve(workspaceRoot, ...relativePath.split("/"));
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      await lstat(absolute);
      fail("EXPECTED_ABSENT_ENDPOINT_PRESENT", relativePath + " unexpectedly exists.");
    } catch (cause) {
      if (cause instanceof WesternCurrentBasisLicenseCarrierChildError) throw cause;
      if (cause?.code !== "ENOENT") {
        fail("ABSENCE_OBSERVATION_FAILED", relativePath + " absence could not be observed.", cause);
      }
    }
  }
  return {
    path: relativePath,
    observation: "exact_path_absent_at_two_point_in_time_checks",
    exactPathOnly: true,
    persistentAbsenceEstablished: false,
    intervalMutationExcluded: false
  };
}

function verifyDependencyGraph(packageLock, contractsManifest, adapterManifest, rulesManifest) {
  if (!exactKeys(contractsManifest.dependencies, ["zod"])
    || contractsManifest.dependencies.zod !== "4.4.3") {
    fail("CONTRACTS_DEPENDENCY_SCOPE_DRIFT", "Western contracts dependencies drifted.");
  }
  if (!exactKeys(adapterManifest.dependencies, [
    "@hakimi/western-astrology-contracts-draft",
    "astronomy-engine",
    "zod"
  ])
    || adapterManifest.dependencies["@hakimi/western-astrology-contracts-draft"] !== "0.0.0-draft.0"
    || adapterManifest.dependencies["astronomy-engine"] !== "2.1.19"
    || adapterManifest.dependencies.zod !== "4.4.3") {
    fail("ADAPTER_DEPENDENCY_SCOPE_DRIFT", "Western astronomy adapter dependencies drifted.");
  }
  if (!exactKeys(rulesManifest.dependencies, ["@hakimi/western-astronomy-engine-adapter-draft"])
    || rulesManifest.dependencies["@hakimi/western-astronomy-engine-adapter-draft"]
      !== "0.0.0-draft.0") {
    fail("RULES_DEPENDENCY_SCOPE_DRIFT", "Western rules preview dependencies drifted.");
  }
  const expectedRoots = [
    ["packages/western-astrology-contracts-draft", contractsManifest],
    ["packages/western-astronomy-engine-adapter-draft", adapterManifest],
    ["packages/western-astrology-rules-preview-draft", rulesManifest]
  ];
  for (let index = 0; index < expectedRoots.length; index += 1) {
    const [packagePath, manifest] = expectedRoots[index];
    const lockEntry = packageLock?.packages?.[packagePath];
    if (lockEntry?.name !== manifest.name || lockEntry?.version !== manifest.version
      || !exactJson(lockEntry?.dependencies ?? {}, manifest.dependencies ?? {})) {
      fail("PACKAGE_ROOT_LOCK_DRIFT", packagePath + " lock identity drifted.");
    }
  }
}

function verifyExternalLockEntry(packageLock, spec, installedManifest) {
  const entry = packageLock?.packages?.[spec.packagePath];
  if (entry?.version !== spec.version || entry?.resolved !== spec.resolved
    || entry?.integrity !== spec.integrity || entry?.license !== spec.declaredLicense) {
    fail("EXTERNAL_LOCK_ENTRY_DRIFT", spec.packageName + " lock identity drifted.");
  }
  if (installedManifest?.name !== spec.packageName || installedManifest?.version !== spec.version
    || installedManifest?.license !== spec.declaredLicense
    || OBJECT_KEYS(installedManifest.dependencies ?? {}).length !== 0) {
    fail("INSTALLED_PACKAGE_MANIFEST_DRIFT", spec.packageName + " installed manifest drifted.");
  }
}

async function collectCurrentInputs(workspaceRoot = DEFAULT_WORKSPACE_ROOT) {
  const resolvedRoot = path.resolve(workspaceRoot);
  if (resolvedRoot !== path.resolve(DEFAULT_WORKSPACE_ROOT)) {
    fail("FIXED_WORKSPACE_REQUIRED", "The build-notice observation is fixed to this workspace.");
  }

  const [driftReceipt, currentManifest] = await Promise.all([
    loadWesternSourceAndManifestIdentityDriftReceiptCandidate(resolvedRoot),
    loadWesternIndependentEngineeringManifestV2(resolvedRoot)
  ]);
  if (!isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(driftReceipt)) {
    fail("DRIFT_RECEIPT_PRIVATE_BRAND_REQUIRED", "Current drift receipt private brand is required.");
  }
  if (!isVerifiedWesternIndependentEngineeringManifestV2(currentManifest)) {
    fail("CURRENT_MANIFEST_PRIVATE_BRAND_REQUIRED", "Current three-package manifest private brand is required.");
  }

  const buildVerification = runWesternIsolatedBuildLicenseNoticeVerification({ evidenceMode: "verify" });
  const buildEvidenceSummary = buildVerification?.evidenceChild;
  if (buildVerification?.status !== "isolated_build_notice_bytes_observed_without_legal_clearance"
    || buildEvidenceSummary?.evidenceDigest !== UPSTREAMS.astronomyBuildNotice.evidenceDigest
    || buildEvidenceSummary?.bindsWesternRequirements !== false
    || buildEvidenceSummary?.rightsLegalConclusionEstablished !== false
    || buildEvidenceSummary?.noticeObligationSatisfied !== false) {
    fail("BUILD_NOTICE_REVERIFICATION_FAILED", "Astronomy build notice did not preserve its red boundary.");
  }

  const upstreamSnapshots = [];
  for (const spec of OBJECT_KEYS(UPSTREAMS).map((key) => UPSTREAMS[key])) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(resolvedRoot, spec.path);
    assertSnapshot(snapshot, spec, spec.path);
    upstreamSnapshots.push(snapshot);
  }
  const driftArtifact = strictJson(upstreamSnapshots[0], "Western drift receipt");
  const manifestArtifact = strictJson(upstreamSnapshots[1], "Western current manifest");
  const buildArtifact = strictJson(upstreamSnapshots[2], "Western build notice evidence");
  if (driftArtifact.candidateId !== UPSTREAMS.driftReceipt.candidateId
    || driftArtifact.receiptDigest !== UPSTREAMS.driftReceipt.receiptDigest
    || manifestArtifact.manifestId !== UPSTREAMS.currentThreePackageManifest.manifestId
    || manifestArtifact.manifestDigest !== UPSTREAMS.currentThreePackageManifest.manifestDigest
    || buildArtifact.evidenceLedgerId !== UPSTREAMS.astronomyBuildNotice.evidenceLedgerId
    || buildArtifact.evidenceDigest !== UPSTREAMS.astronomyBuildNotice.evidenceDigest) {
    fail("UPSTREAM_SEMANTIC_IDENTITY_DRIFT", "An upstream semantic identity drifted.");
  }
  if (driftReceipt.receiptDigest !== driftArtifact.receiptDigest
    || currentManifest.manifest?.manifestDigest !== manifestArtifact.manifestDigest
    || currentManifest.artifact?.rawSha256 !== upstreamSnapshots[1].rawSha256) {
    fail("UPSTREAM_PRIVATE_BRAND_IDENTITY_MISMATCH", "Upstream brand and fixed artifact disagree.");
  }

  const basisSnapshots = [];
  for (let index = 0; index < BASIS_ARTIFACTS.length; index += 1) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(
      resolvedRoot,
      BASIS_ARTIFACTS[index].path
    );
    assertSnapshot(snapshot, BASIS_ARTIFACTS[index], BASIS_ARTIFACTS[index].role);
    basisSnapshots.push(snapshot);
  }
  const packageLock = strictJson(basisSnapshots[0], "package-lock.json");
  const contractsManifest = strictJson(basisSnapshots[1], "Western contracts package manifest");
  const adapterManifest = strictJson(basisSnapshots[2], "Western adapter package manifest");
  const rulesManifest = strictJson(basisSnapshots[3], "Western rules package manifest");
  verifyDependencyGraph(packageLock, contractsManifest, adapterManifest, rulesManifest);

  const currentSourceBindings = driftReceipt.currentEndpointBindings?.currentSourceSnapshots;
  const currentByPath = new NATIVE_MAP();
  for (let index = 0; index < (currentSourceBindings?.length ?? 0); index += 1) {
    REFLECT_APPLY(MAP_SET, currentByPath, [currentSourceBindings[index].path, currentSourceBindings[index]]);
  }
  for (const basisIndex of [5, 6]) {
    const snapshot = basisSnapshots[basisIndex];
    const receiptBinding = REFLECT_APPLY(MAP_GET, currentByPath, [snapshot.path]);
    if (receiptBinding?.rawBytes !== snapshot.rawBytes
      || receiptBinding?.rawSha256 !== snapshot.rawSha256) {
      fail("CURRENT_SOURCE_RECEIPT_MISMATCH", snapshot.path + " disagrees with the drift receipt.");
    }
  }
  const manifestClosure = currentManifest.manifest?.threePackageAuthoredFileClosure;
  if (manifestClosure?.packageRootCount !== 3
    || manifestClosure?.observedUniquePhysicalPaths !== 70
    || manifestClosure?.threeSelectedPackageRootsExact !== true
    || !exactJson(manifestClosure.packageRoots, PACKAGE_ROOTS)) {
    fail("THREE_PACKAGE_MANIFEST_SCOPE_DRIFT", "Current three-package manifest scope drifted.");
  }

  const astronomySnapshots = [];
  for (const spec of [
    ASTRONOMY_ENGINE.packageManifest,
    ASTRONOMY_ENGINE.sourceLock,
    ...ASTRONOMY_ENGINE.controlledLicenseCopies
  ]) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(resolvedRoot, spec.path);
    assertSnapshot(snapshot, spec, spec.path);
    astronomySnapshots.push(snapshot);
  }
  const zodSnapshots = [];
  for (const spec of [ZOD.packageManifest, ZOD.licenseCarrier]) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(resolvedRoot, spec.path);
    assertSnapshot(snapshot, spec, spec.path);
    zodSnapshots.push(snapshot);
  }
  const astronomyManifest = strictJson(astronomySnapshots[0], "installed astronomy-engine manifest");
  const astronomySourceLock = strictJson(astronomySnapshots[1], "Astronomy Engine source lock");
  const zodManifest = strictJson(zodSnapshots[0], "installed zod manifest");
  verifyExternalLockEntry(packageLock, ASTRONOMY_ENGINE, astronomyManifest);
  verifyExternalLockEntry(packageLock, ZOD, zodManifest);
  if (astronomySourceLock?.package?.name !== ASTRONOMY_ENGINE.packageName
    || astronomySourceLock?.package?.version !== ASTRONOMY_ENGINE.version
    || astronomySourceLock?.license?.spdx !== "MIT"
    || astronomySourceLock?.license?.standaloneFilePresentInNpmTarball !== false
    || astronomySourceLock?.license?.bytes !== 1_095
    || astronomySourceLock?.license?.sha256
      !== ASTRONOMY_ENGINE.controlledLicenseCopies[0].rawSha256) {
    fail("ASTRONOMY_SOURCE_LOCK_DRIFT", "Astronomy Engine source-lock license boundary drifted.");
  }
  const exactAbsence = await observeExactAbsence(
    resolvedRoot,
    ASTRONOMY_ENGINE.exactInstalledLicensePath
  );

  const context = OBJECT_FREEZE({
    upstreamSnapshots: OBJECT_FREEZE(upstreamSnapshots),
    basisSnapshots: OBJECT_FREEZE(basisSnapshots),
    astronomySnapshots: OBJECT_FREEZE(astronomySnapshots),
    zodSnapshots: OBJECT_FREEZE(zodSnapshots),
    exactAbsence: OBJECT_FREEZE(exactAbsence),
    driftReceipt,
    currentManifest,
    buildEvidenceSummary
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_CONTEXTS, [context]);
  return context;
}

function requireContext(value) {
  if (!value || !REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_CONTEXTS, [value])
    || !REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value])) {
    fail("VERIFIED_CONTEXT_REQUIRED", "A fixed-path verified observation context is required.");
  }
  return value;
}

function buildProjection(contextInput) {
  const context = requireContext(contextInput);
  const upstreamArtifacts = context.upstreamSnapshots.map(publicIdentity);
  const sourceBasis = context.basisSnapshots.slice(4).map((snapshot, index) => ({
    role: BASIS_ARTIFACTS[index + 4].role,
    ...publicIdentity(snapshot)
  }));
  const dependencyBasis = context.basisSnapshots.slice(0, 4).map((snapshot, index) => ({
    role: BASIS_ARTIFACTS[index].role,
    ...publicIdentity(snapshot)
  }));
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    timeBoundary: {
      createdAtIsUntrustedOperatorLabel: true,
      trustedClockOrTimestampAuthorityEstablished: false,
      verificationIntervalBoundToCreatedAt: false
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByWesternProductIdentity: false,
      mutationEpochBoundaryRequired: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    upstreamBindings: {
      currentSourceAndManifestDriftReceipt: {
        ...publicIdentity(context.upstreamSnapshots[0]),
        candidateId: UPSTREAMS.driftReceipt.candidateId,
        receiptDigest: UPSTREAMS.driftReceipt.receiptDigest,
        privateBrandVerified: true
      },
      currentThreePackageMachineIdentityManifest: {
        ...publicIdentity(context.upstreamSnapshots[1]),
        manifestId: UPSTREAMS.currentThreePackageManifest.manifestId,
        manifestDigest: UPSTREAMS.currentThreePackageManifest.manifestDigest,
        privateBrandVerified: true,
        packageRootCount: 3,
        observedUniquePhysicalPaths: 70,
        entireWesternEngineeringClosureEstablished: false
      },
      astronomyEngineBuildNoticeEvidence: {
        ...publicIdentity(context.upstreamSnapshots[2]),
        evidenceLedgerId: UPSTREAMS.astronomyBuildNotice.evidenceLedgerId,
        evidenceDigest: UPSTREAMS.astronomyBuildNotice.evidenceDigest,
        controlledDualBuildReverifiedThisLoad: true,
        buildOutputPersisted: false,
        bindsWesternRequirementsBeforeSuccessor: false,
        rightsLegalConclusionEstablished: false,
        noticeObligationSatisfied: false
      }
    },
    currentSourceBasisObservation: {
      scope: "current_source_requirements_basis_plus_split_civil_input_endpoint_only",
      artifacts: sourceBasis,
      splitCivilInputExplicitlyIncluded: true,
      formalV1DeclaredCurrent: true,
      formalV1MechanicallyCurrent: false,
      formalV1FailureClass: "LEDGER_MISMATCH",
      historicalV11AndV12MechanicallyCurrent: false,
      currentBasisEndpointCount: 4,
      sourceBodyOrDomainTruthEstablished: false
    },
    threePackageDeclaredDependencyObservation: {
      scope: "three_selected_package_roots_declared_runtime_dependency_closure_only",
      packageRoots: PACKAGE_ROOTS,
      dependencyBasisArtifacts: dependencyBasis,
      packageRootCount: 3,
      externalPackageNodesExpected: 2,
      externalPackageNodesObserved: 2,
      externalPackageNodeIds: ["astronomy-engine@2.1.19", "zod@4.4.3"],
      declaredEdges: [
        {
          from: "@hakimi/western-astrology-contracts-draft@0.0.0-draft.0",
          to: "zod@4.4.3"
        },
        {
          from: "@hakimi/western-astronomy-engine-adapter-draft@0.0.0-draft.0",
          to: "@hakimi/western-astrology-contracts-draft@0.0.0-draft.0"
        },
        {
          from: "@hakimi/western-astronomy-engine-adapter-draft@0.0.0-draft.0",
          to: "astronomy-engine@2.1.19"
        },
        {
          from: "@hakimi/western-astronomy-engine-adapter-draft@0.0.0-draft.0",
          to: "zod@4.4.3"
        },
        {
          from: "@hakimi/western-astrology-rules-preview-draft@0.0.0-draft.0",
          to: "@hakimi/western-astronomy-engine-adapter-draft@0.0.0-draft.0"
        }
      ],
      civilTimeTzdbMomentTimezoneClosureIncluded: false,
      devBuildToolingClosureIncluded: false,
      entireWesternProductClosureEstablished: false
    },
    dependencyLicenseCarrierObservations: [
      {
        packageName: ASTRONOMY_ENGINE.packageName,
        version: ASTRONOMY_ENGINE.version,
        relationship: "western_astronomy_adapter_direct_external_dependency",
        declaredLicenseFieldObserved: "MIT",
        packageManifest: publicIdentity(context.astronomySnapshots[0]),
        packageLockIdentity: {
          resolved: ASTRONOMY_ENGINE.resolved,
          integrity: ASTRONOMY_ENGINE.integrity
        },
        installedExactLicenseEndpoint: context.exactAbsence,
        sourceLock: publicIdentity(context.astronomySnapshots[1]),
        controlledProjectLicenseCopies: [
          publicIdentity(context.astronomySnapshots[2]),
          publicIdentity(context.astronomySnapshots[3])
        ],
        controlledBuildNoticeObserved: true,
        publisherAuthenticityEstablished: false,
        licenseApplicabilityEstablished: false,
        carrierRightsEstablished: false
      },
      {
        packageName: ZOD.packageName,
        version: ZOD.version,
        relationship: "western_contracts_and_adapter_direct_external_dependency",
        declaredLicenseFieldObserved: "MIT",
        packageManifest: publicIdentity(context.zodSnapshots[0]),
        packageLockIdentity: {
          resolved: ZOD.resolved,
          integrity: ZOD.integrity
        },
        installedLicenseCarrier: publicIdentity(context.zodSnapshots[1]),
        publisherAuthenticityEstablished: false,
        licenseApplicabilityEstablished: false,
        carrierRightsEstablished: false
      }
    ],
    formalStateBoundary: {
      formalSourceRequirementsV1RemainsDeclaredCurrent: true,
      formalSourceRequirementsV1MechanicallyCurrent: false,
      historicalV11IsFormalCurrent: false,
      historicalV12IsFormalCurrent: false,
      childIsFormalCurrent: false,
      childActiveEffect: "none",
      formalManifestIntegrated: false,
      formalRegistryIntegrated: false,
      ownerAdmissionAccepted: false,
      existingArtifactMutated: false
    },
    rightsBoundary: {
      observedLicenseStringsAreLegalConclusions: false,
      observedLicenseCarrierBytesAreAuthenticityProof: false,
      licenseSemanticInterpretationReviewed: false,
      licenseApplicabilityOrCompatibilityEstablished: false,
      workRightsEstablished: false,
      versionRightsEstablished: false,
      carrierRightsEstablished: false,
      rightsLegalConclusionEstablished: false,
      redistributionAuthorized: false,
      noticeObligationSatisfied: false,
      selectedLicenseModel: null,
      independentRightsReviewIds: [],
      ownerDecisionRefs: []
    },
    expertAndAuthorityBoundary: {
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      expertTruthEstablished: false,
      expertClaimsAuthorized: false,
      contentTruthEstablished: false,
      domainAuthorityAuthorized: false,
      formalAdmissionAuthorized: false,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    runtimeTrustBoundary: {
      fixedPathCliRejectsVisiblePreloadEnvironment: true,
      fixedPathCliRejectsVisiblePreloadOrLoaderArguments: true,
      visibleGuardScope: "invocation_visible_inputs_only",
      visibleGuardIsSecurityBoundary: false,
      hiddenPreEvaluationCodeExecutionExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      launcherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      assumesNoArbitraryPreEvaluationCodeExecution: true
    },
    observationBoundary: {
      endpointObservationOnly: true,
      perFileHeldHandleStableReadsUsed: true,
      strictDuplicateKeyRejectingJsonUsed: true,
      crossFileAtomicSnapshotEstablished: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      digestIsDigitalSignature: false
    },
    gateSummary: {
      currentSourceBasisEndpointsObserved: 4,
      packageRootsObserved: 3,
      externalDependenciesExpected: 2,
      externalDependenciesObserved: 2,
      installedPackageManifestsVerified: 2,
      installedLicenseCarrierEndpointsPresent: 1,
      installedExactLicenseEndpointsAbsent: 1,
      controlledProjectLicenseCopiesObserved: 2,
      controlledBuildNoticeSurfacesReverified: 2,
      sourceBodiesCopied: 0,
      exactQuotesStored: 0,
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      subjectFullySatisfied: 0,
      workRightsEstablished: 0,
      versionRightsEstablished: 0,
      carrierRightsEstablished: 0,
      redistributionAuthorizations: 0,
      expertReviewsVerified: 0
    },
    doesNotEstablish: [
      "publisher_or_license_authenticity",
      "license_semantic_interpretation_applicability_compatibility_or_notice_satisfaction",
      "work_version_or_carrier_rights_or_redistribution_authorization",
      "astronomy_engine_installed_license_absence_beyond_the_exact_checked_path_and_observation",
      "civil_time_tzdb_moment_timezone_dev_tooling_or_entire_western_dependency_closure",
      "source_body_exact_quote_frozen_binding_or_any_subject_full_satisfaction",
      "content_truth_expert_truth_scientific_validity_or_domain_authority",
      "formal_current_replacement_manifest_registry_or_owner_admission",
      "browser_runtime_pwa_service_worker_public_host_deployment_or_rollback_evidence",
      "release_evidence_release_readiness_or_public_release_authorization",
      "trusted_time_node_runtime_loader_launcher_identity_or_cli_attestation",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion"
    ]
  };
  return deepFreeze({
    ...unsigned,
    childDigest: computeWesternCurrentBasisLicenseCarrierChildDigest(unsigned)
  });
}

export async function buildCurrentWesternCurrentBasisLicenseCarrierChild(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  return buildProjection(await collectCurrentInputs(workspaceRoot));
}

export function serializeWesternCurrentBasisLicenseCarrierChild(child) {
  const snapshot = passiveClone(child);
  if (snapshot.childDigest !== computeWesternCurrentBasisLicenseCarrierChildDigest(snapshot)) {
    fail("CHILD_DIGEST_MISMATCH", "Carrier child digest does not match.");
  }
  return prettyStringify(snapshot);
}

export function parseWesternCurrentBasisLicenseCarrierChildArtifact(snapshot) {
  return strictJson(snapshot, "Western current-basis carrier child");
}

export function verifyWesternCurrentBasisLicenseCarrierChildLedger(input, contextInput) {
  const context = requireContext(contextInput);
  const child = passiveClone(input);
  if (child.schemaVersion !== "1.0.0" || child.recordType !== RECORD_TYPE
    || child.childId !== CHILD_ID || child.status !== STATUS || child.createdAt !== CREATED_AT) {
    fail("CHILD_IDENTITY_MISMATCH", "Carrier child identity fields drifted.");
  }
  if (typeof child.childDigest !== "string" || !SHA256.test(child.childDigest)
    || child.childDigest !== computeWesternCurrentBasisLicenseCarrierChildDigest(child)) {
    fail("CHILD_DIGEST_MISMATCH", "Carrier child digest does not match.");
  }
  const expected = buildProjection(context);
  if (!exactJson(child, expected)) {
    fail("CHILD_CONTRACT_MISMATCH", "Carrier child differs from fixed current observations.");
  }
  return deepFreeze(child);
}

function assertPersistedIdentity(snapshot) {
  if (!Number.isSafeInteger(EXPECTED_PERSISTED.rawBytes) || EXPECTED_PERSISTED.rawBytes <= 0
    || !SHA256.test(EXPECTED_PERSISTED.rawSha256)) {
    fail("PERSISTED_IDENTITY_UNSET", "Carrier child persisted identity is not frozen.");
  }
  if (snapshot.path !== WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256) {
    fail("PERSISTED_IDENTITY_DRIFT", "Carrier child persisted raw identity drifted.");
  }
}

export async function loadWesternCurrentBasisLicenseCarrierChild(
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  const context = await collectCurrentInputs(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH
  );
  assertPersistedIdentity(snapshot);
  const parsed = parseWesternCurrentBasisLicenseCarrierChildArtifact(snapshot);
  const child = verifyWesternCurrentBasisLicenseCarrierChildLedger(parsed, context);
  if (NodeBuffer.prototype.toString.call(snapshot.bytes, "utf8")
    !== serializeWesternCurrentBasisLicenseCarrierChild(child)) {
    fail("PERSISTED_MATERIALIZATION_DRIFT", "Carrier child is not canonical LF JSON.");
  }
  const result = deepFreeze({
    ok: true,
    childId: child.childId,
    childDigest: child.childDigest,
    status: child.status,
    currentSourceBasisEndpointsObserved: child.gateSummary.currentSourceBasisEndpointsObserved,
    externalDependenciesObserved: child.gateSummary.externalDependenciesObserved,
    installedLicenseCarrierEndpointsPresent:
      child.gateSummary.installedLicenseCarrierEndpointsPresent,
    installedExactLicenseEndpointsAbsent:
      child.gateSummary.installedExactLicenseEndpointsAbsent,
    controlledProjectLicenseCopiesObserved:
      child.gateSummary.controlledProjectLicenseCopiesObserved,
    bindingRequired: child.gateSummary.bindingRequired,
    bindingFrozenVerified: child.gateSummary.bindingFrozenVerified,
    childActiveEffect: child.formalStateBoundary.childActiveEffect,
    rightsLegalConclusionEstablished: child.rightsBoundary.rightsLegalConclusionEstablished,
    releaseReady: child.expertAndAuthorityBoundary.releaseReady,
    publicDeploymentAuthorized: child.expertAndAuthorityBoundary.publicDeploymentAuthorized,
    artifact: publicIdentity(snapshot),
    child
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

export function isVerifiedWesternCurrentBasisLicenseCarrierChild(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && REFLECT_APPLY(OBJECT_IS_FROZEN, Object, [value]);
}

export const westernCurrentBasisLicenseCarrierChildTestOnly = OBJECT_FREEZE({
  CHILD_ID,
  RECORD_TYPE,
  STATUS,
  CREATED_AT,
  DIGEST_DOMAIN,
  UPSTREAMS,
  BASIS_ARTIFACTS,
  PACKAGE_ROOTS,
  ASTRONOMY_ENGINE,
  ZOD,
  EXPECTED_PERSISTED,
  collectCurrentInputs,
  buildProjection,
  passiveClone
});
