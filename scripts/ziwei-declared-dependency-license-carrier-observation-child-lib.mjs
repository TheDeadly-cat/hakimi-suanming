import { createHash } from "node:crypto";
import { Buffer as NodeBuffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import { TextDecoder as NodeTextDecoder } from "node:util";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

export const ZIWEI_DECLARED_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH =
  "content/system-admission/ziwei-declared-dependency-license-carrier-observation-child.v1.json";

const CHILD_ID =
  "hakimi.ziwei.declared-dependency-license-carrier-observation-child/1.0.0";
const RECORD_TYPE =
  "ziwei_declared_dependency_license_carrier_observation_child_v1";
const STATUS =
  "seven_declared_local_license_carriers_observed_unbound_no_legal_conclusion";
const CREATED_AT = "2026-09-01T12:22:00.000Z";
const CREATED_AT_UPPER_BOUND = "2026-09-01T12:22:29.817Z";
const DIGEST_DOMAIN =
  "hakimi.ziwei.declared-dependency-license-carrier-observation-child.v1\0";
const MAX_ARTIFACT_BYTES = 256 * 1024;
const DEFAULT_WORKSPACE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SHA256 = /^[0-9a-f]{64}$/u;

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const BUFFER_FROM = NodeBuffer.from;
const NATIVE_JSON = JSON;
const JSON_STRINGIFY = JSON.stringify;
const NATIVE_MAP = Map;
const MAP_GET = Map.prototype.get;
const MAP_HAS = Map.prototype.has;
const MAP_SET = Map.prototype.set;
const NATIVE_OBJECT_PROTOTYPE = Object.prototype;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const NUMBER_IS_FINITE = Number.isFinite;
const NATIVE_DATE = Date;
const DATE_PARSE = Date.parse;
const NATIVE_STRING = String;
const REGEXP_TEST = RegExp.prototype.test;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(createHash("sha256"));
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
const TEXT_DECODER_DECODE = NodeTextDecoder.prototype.decode;
const VERIFIED_RESULTS = new NATIVE_WEAK_SET();

const BASIS_ARTIFACTS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    role: "workspace_dependency_lock",
    path: "package-lock.json",
    rawBytes: 175_812,
    rawSha256: "40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d"
  }),
  OBJECT_FREEZE({
    role: "ziwei_adapter_package_manifest",
    path: "packages/ziwei-iztro-adapter-draft/package.json",
    rawBytes: 500,
    rawSha256: "717b64a0d9a38a98a6f1b567aa060aaeb53f25f03ede5302048180398ffedda1"
  }),
  OBJECT_FREEZE({
    role: "iztro_declared_lock_closure",
    path: "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json",
    rawBytes: 3_846,
    rawSha256: "c372bf14630eee36fa01ac654b8939622900a3e469a8f69db7bd2c7baa1d2724"
  })
]);

const PACKAGE_SPECS = OBJECT_FREEZE([
  OBJECT_FREEZE({
    relationship: "iztro_declared_lock_closure",
    packageName: "@babel/runtime",
    version: "7.29.7",
    packagePath: "node_modules/@babel/runtime",
    resolved: "https://registry.npmjs.org/@babel/runtime/-/runtime-7.29.7.tgz",
    integrity: "sha512-Nq8OhGWiZIZGV6hLHoyAKLLcJihP/xFeBMGJoUrxTX2psI8dCifzLhZISFb+VWS3wFMRDmCGw5R+dOySCqPLhw==",
    declaredLicense: "MIT",
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/@babel/runtime/package.json",
      rawBytes: 41_106,
      rawSha256: "8c4bf20c55e3f3a93df034b12746bf72185cf2acb0ef52847a3465d6e67c61e7"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/@babel/runtime/LICENSE",
      rawBytes: 1_106,
      rawSha256: "117da2af0d4ce0fe1c8e19b5cff9dcd806adf973d328d27b11d4448c4ff24f76"
    })
  }),
  OBJECT_FREEZE({
    relationship: "iztro_declared_lock_closure",
    packageName: "dayjs",
    version: "1.11.21",
    packagePath: "node_modules/dayjs",
    resolved: "https://registry.npmjs.org/dayjs/-/dayjs-1.11.21.tgz",
    integrity: "sha512-98IT+HOahAisibz/yjKbzuOBwYcjJ7BCLPzARyHiyEBmRz4fatF+KPJszEHXsGYjUG234aH/cOjW1wwTbKUZlA==",
    declaredLicense: "MIT",
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/dayjs/package.json",
      rawBytes: 2_676,
      rawSha256: "dcb46b4045ace466baa3972d8d85d81f9036ac0ca23f48a8fe77d0d786de0400"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/dayjs/LICENSE",
      rawBytes: 1_072,
      rawSha256: "5faab7526d055651be3aab769d58897be6bd91f3d39d137f25f12dba1b31d5dc"
    })
  }),
  OBJECT_FREEZE({
    relationship: "iztro_declared_lock_closure",
    packageName: "i18next",
    version: "23.16.8",
    packagePath: "node_modules/i18next",
    resolved: "https://registry.npmjs.org/i18next/-/i18next-23.16.8.tgz",
    integrity: "sha512-06r/TitrM88Mg5FdUXAKL96dJMzgqLE5dv3ryBAra4KCwD9mJ4ndOTS95ZuymIGoE+2hzfdaMak2X11/es7ZWg==",
    declaredLicense: "MIT",
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/i18next/package.json",
      rawBytes: 4_379,
      rawSha256: "eed0139050cc6d3b62e97a29529bd4d729d1d5f993af8e78fe48564c246648fc"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/i18next/LICENSE",
      rawBytes: 1_074,
      rawSha256: "c83b2035d5a4740f8739869a994acc24559e2946219b15091922b52e7b2a7287"
    })
  }),
  OBJECT_FREEZE({
    relationship: "iztro_declared_lock_closure",
    packageName: "iztro",
    version: "2.5.8",
    packagePath: "node_modules/iztro",
    resolved: "https://registry.npmjs.org/iztro/-/iztro-2.5.8.tgz",
    integrity: "sha512-kgyyvxdSEvgJxi6zvHpvzGbXZLGXCdhTHYK2Pe/sRdBIQ7RfCArvupmg2ChUMQCSQGomW7XCI0gWwUuKJwPENg==",
    declaredLicense: "MIT",
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/iztro/package.json",
      rawBytes: 2_255,
      rawSha256: "a5a85df951d28965caa7bf9a9fe6b44e3df676c8dd938573061257cff681a20f"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/iztro/LICENSE",
      rawBytes: 1_073,
      rawSha256: "e6c7b6e313cbda3135b41bccc66c98be132cb8319d0d465903d17e669e748b36"
    })
  }),
  OBJECT_FREEZE({
    relationship: "iztro_declared_lock_closure",
    packageName: "lunar-lite",
    version: "0.2.8",
    packagePath: "node_modules/lunar-lite",
    resolved: "https://registry.npmjs.org/lunar-lite/-/lunar-lite-0.2.8.tgz",
    integrity: "sha512-Y4tba4RaIFI0ikImJhgoEsyqtDE64lJIM3yFwRX01dbmagCDq7rNmpDQFrSFFy4WXeuywdRVFpIBoT1GGCEizw==",
    declaredLicense: "MIT",
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/lunar-lite/package.json",
      rawBytes: 1_465,
      rawSha256: "be39ac7d686fd9e1eee487e4e1960ff670e368ad6529bd435d2d0222521147dd"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/lunar-lite/LICENSE",
      rawBytes: 1_062,
      rawSha256: "21c79dc1c4df538c682573291f8824be1b1313e309a32f1e2367e3fd4c66d62a"
    })
  }),
  OBJECT_FREEZE({
    relationship: "iztro_declared_lock_closure",
    packageName: "lunar-typescript",
    version: "1.8.6",
    packagePath: "node_modules/lunar-typescript",
    resolved: "https://registry.npmjs.org/lunar-typescript/-/lunar-typescript-1.8.6.tgz",
    integrity: "sha512-5Eo4T/cnuXfrgO4k5LCpOGHIUOuz5hCF/IfNv0T29WY2shR36Hiz+ecN9WjnUuxUKhql9gbOkPaQoqLFKtPRNA==",
    declaredLicense: "MIT",
    packageManifest: OBJECT_FREEZE({
      path: "node_modules/lunar-typescript/package.json",
      rawBytes: 2_188,
      rawSha256: "f66f1217e67e227f77b7a35b3c5b40d3835842856920e99ebd7e10f2d940e21c"
    }),
    licenseCarrier: OBJECT_FREEZE({
      path: "node_modules/lunar-typescript/LICENSE",
      rawBytes: 1_062,
      rawSha256: "097ec7989106eb9a27b6eff71dbaf1cd6bb04a9b35b6c94b54fff0829a041a8c"
    })
  }),
  OBJECT_FREEZE({
    relationship: "ziwei_adapter_direct_dependency_outside_iztro_closure",
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
  })
]);

const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 14_812,
  rawSha256: "201c5b85cf94bf9467ff18e5391fcbdfee4de54893c5fe997994a39c1f0685e8"
});

export class ZiweiDeclaredDependencyLicenseCarrierChildError extends Error {
  constructor(code, message, options) {
    super(code + ": " + message, options);
    this.name = "ZiweiDeclaredDependencyLicenseCarrierChildError";
    OBJECT_DEFINE_PROPERTY(this, "code", { value: code, enumerable: false });
    OBJECT_DEFINE_PROPERTY(this, "safeForCli", { value: true, enumerable: false });
  }
}

function fail(code, message, cause) {
  throw new ZiweiDeclaredDependencyLicenseCarrierChildError(
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

function sortStrings(values) {
  const output = [];
  for (let index = 0; index < values.length; index += 1) {
    let insertAt = output.length;
    while (insertAt > 0 && values[index] < output[insertAt - 1]) insertAt -= 1;
    for (let move = output.length; move > insertAt; move -= 1) {
      output[move] = output[move - 1];
    }
    output[insertAt] = values[index];
  }
  return output;
}

function passiveClone(value, seen = new NATIVE_WEAK_SET(), depth = 0) {
  if (depth > 100) fail("JSON_LIMIT_EXCEEDED", "JSON nesting 超过限制。");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("NON_CANONICAL_JSON", "JSON number 必须有限且不能为 -0。");
    }
    return value;
  }
  if (typeof value !== "object") fail("NON_CANONICAL_JSON", "只接受被动 JSON 值。");
  if (REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) {
    fail("JSON_ALIAS_FORBIDDEN", "JSON 不能包含循环或对象别名。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const ownKeys = REFLECT_OWN_KEYS(value);
  for (let index = 0; index < ownKeys.length; index += 1) {
    if (typeof ownKeys[index] !== "string" || !("value" in descriptors[ownKeys[index]])) {
      fail("INPUT_NOT_PASSIVE_JSON", "JSON 不能包含 Symbol 或 accessor。");
    }
  }
  if (ARRAY_IS_ARRAY(value)) {
    if (ownKeys.length !== value.length + 1 || descriptors.length?.value !== value.length) {
      fail("SPARSE_ARRAY_FORBIDDEN", "JSON array 必须稠密且没有额外属性。");
    }
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      const indexKey = NATIVE_STRING(index);
      if (!(indexKey in descriptors)) {
        fail("SPARSE_ARRAY_FORBIDDEN", "JSON array 必须稠密。");
      }
      REFLECT_APPLY(ARRAY_PUSH, output, [passiveClone(descriptors[indexKey].value, seen, depth + 1)]);
    }
    return output;
  }
  const prototype = OBJECT_GET_PROTOTYPE_OF(value);
  if (prototype !== NATIVE_OBJECT_PROTOTYPE && prototype !== null) {
    fail("INPUT_NOT_PASSIVE_JSON", "JSON object prototype 不被接受。");
  }
  const output = OBJECT_CREATE(null);
  const keys = sortStrings(OBJECT_KEYS(descriptors));
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      fail("DANGEROUS_JSON_KEY", "JSON key 不被接受。");
    }
    OBJECT_DEFINE_PROPERTY(output, key, {
      value: passiveClone(descriptors[key].value, seen, depth + 1),
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  return output;
}

export function canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [passiveClone(value)]);
}

function prettyStringify(value) {
  return REFLECT_APPLY(JSON_STRINGIFY, NATIVE_JSON, [passiveClone(value), null, 2]) + "\n";
}

export function computeZiweiDeclaredDependencyLicenseCarrierChildDigest(child) {
  const snapshot = passiveClone(child);
  const unsigned = OBJECT_CREATE(null);
  const keys = OBJECT_KEYS(snapshot);
  for (let index = 0; index < keys.length; index += 1) {
    if (keys[index] !== "childDigest") {
      OBJECT_DEFINE_PROPERTY(unsigned, keys[index], {
        value: snapshot[keys[index]],
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
  }
  return sha256Bytes(
    REFLECT_APPLY(BUFFER_FROM, NodeBuffer, [
      DIGEST_DOMAIN + canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(unsigned),
      "utf8"
    ])
  );
}

function assertSnapshot(snapshot, expected, label) {
  if (snapshot.path !== expected.path || snapshot.rawBytes !== expected.rawBytes
    || snapshot.rawSha256 !== expected.rawSha256) {
    fail("LOCAL_ENDPOINT_IDENTITY_DRIFT", label + " identity 漂移。");
  }
}

function strictJson(snapshot, label) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    fail(cause?.code ?? "STRICT_JSON_INVALID", label + " 不是严格 JSON。", cause);
  }
}

export function parseZiweiDeclaredDependencyLicenseCarrierChildArtifact(snapshot) {
  return strictJson(snapshot, "carrier child");
}

function decodeUtf8(bytes, label) {
  try {
    const decoder = new NodeTextDecoder("utf-8", { fatal: true });
    return REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [bytes]);
  } catch (cause) {
    fail("UTF8_INVALID", label + " 不是有效 UTF-8。", cause);
  }
}

function publicIdentity(snapshot) {
  return {
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  };
}

async function observeWorkspace(workspaceRoot) {
  const basisSnapshots = [];
  for (let index = 0; index < BASIS_ARTIFACTS.length; index += 1) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      BASIS_ARTIFACTS[index].path
    );
    assertSnapshot(snapshot, BASIS_ARTIFACTS[index], BASIS_ARTIFACTS[index].role);
    REFLECT_APPLY(ARRAY_PUSH, basisSnapshots, [snapshot]);
  }
  const packageLock = strictJson(basisSnapshots[0], "package-lock.json");
  const adapterManifest = strictJson(basisSnapshots[1], "Ziwei adapter package manifest");
  const closure = strictJson(basisSnapshots[2], "iztro declared lock closure");

  if (adapterManifest?.dependencies?.iztro !== "2.5.8"
    || adapterManifest?.dependencies?.zod !== "4.4.3"
    || OBJECT_KEYS(adapterManifest.dependencies).length !== 3
    || adapterManifest.dependencies["@hakimi/ziwei-doushu-contracts-draft"] !== "0.0.0-draft.0") {
    fail("ADAPTER_DEPENDENCY_SCOPE_DRIFT", "Ziwei adapter dependencies 不再是固定三项。");
  }
  if (closure?.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || closure?.entryPackage?.name !== "@hakimi/ziwei-iztro-adapter-draft"
    || closure?.entryPackage?.dependencies?.length !== 1
    || closure.entryPackage.dependencies[0]?.name !== "iztro"
    || closure.entryPackage.dependencies[0]?.resolvedVersion !== "2.5.8"
    || closure?.nodes?.length !== 6) {
    fail("IZTRO_DECLARED_CLOSURE_DRIFT", "iztro 声明 lock closure 语义漂移。");
  }

  const closureByPath = new NATIVE_MAP();
  for (let index = 0; index < closure.nodes.length; index += 1) {
    REFLECT_APPLY(MAP_SET, closureByPath, [
      closure.nodes[index].packagePath,
      closure.nodes[index]
    ]);
  }
  const dependencyCarriers = [];
  const endpointSnapshots = [];
  for (let index = 0; index < PACKAGE_SPECS.length; index += 1) {
    const spec = PACKAGE_SPECS[index];
    const lockEntry = packageLock?.packages?.[spec.packagePath];
    if (lockEntry?.version !== spec.version || lockEntry?.resolved !== spec.resolved
      || lockEntry?.integrity !== spec.integrity || lockEntry?.license !== spec.declaredLicense) {
      fail("PACKAGE_LOCK_ENTRY_DRIFT", spec.packageName + " root lock entry 漂移。");
    }
    if (spec.relationship === "iztro_declared_lock_closure") {
      const closureNode = REFLECT_APPLY(MAP_GET, closureByPath, [spec.packagePath]);
      if (closureNode?.name !== spec.packageName || closureNode?.version !== spec.version
        || closureNode?.resolved !== spec.resolved || closureNode?.integrity !== spec.integrity) {
        fail("IZTRO_DECLARED_CLOSURE_DRIFT", spec.packageName + " closure node 漂移。");
      }
    } else if (REFLECT_APPLY(MAP_HAS, closureByPath, [spec.packagePath])) {
      fail("ZOD_SCOPE_DRIFT", "zod 不得伪装为 iztro 声明 closure 节点。");
    }

    const packageSnapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      spec.packageManifest.path
    );
    const licenseSnapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      spec.licenseCarrier.path
    );
    assertSnapshot(packageSnapshot, spec.packageManifest, spec.packageName + " package manifest");
    assertSnapshot(licenseSnapshot, spec.licenseCarrier, spec.packageName + " LICENSE carrier");
    const packageManifest = strictJson(packageSnapshot, spec.packageName + " package manifest");
    if (packageManifest?.name !== spec.packageName || packageManifest?.version !== spec.version
      || packageManifest?.license !== spec.declaredLicense) {
      fail("PACKAGE_MANIFEST_SEMANTIC_DRIFT", spec.packageName + " package manifest 语义漂移。");
    }
    REFLECT_APPLY(ARRAY_PUSH, endpointSnapshots, [packageSnapshot, licenseSnapshot]);
    REFLECT_APPLY(ARRAY_PUSH, dependencyCarriers, [{
      ordinal: index + 1,
      relationship: spec.relationship,
      packageName: spec.packageName,
      version: spec.version,
      lockEntry: {
        packagePath: spec.packagePath,
        resolved: spec.resolved,
        integrity: spec.integrity,
        declaredLicense: spec.declaredLicense
      },
      packageManifest: {
        ...publicIdentity(packageSnapshot),
        declaredName: spec.packageName,
        declaredVersion: spec.version,
        declaredLicense: spec.declaredLicense
      },
      licenseCarrier: {
        ...publicIdentity(licenseSnapshot),
        locator: "whole_file_exact_bytes",
        bodyCopiedIntoChild: false,
        exactQuoteStoredInChild: false,
        semanticInterpretationReviewed: false
      }
    }]);
  }
  return OBJECT_FREEZE({ basisSnapshots, endpointSnapshots, dependencyCarriers });
}

function buildExpectedFromObservation(observation) {
  const basisArtifacts = [];
  for (let index = 0; index < observation.basisSnapshots.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, basisArtifacts, [publicIdentity(observation.basisSnapshots[index])]);
  }
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    childId: CHILD_ID,
    status: STATUS,
    createdAt: CREATED_AT,
    timeBoundary: {
      createdAtClock: "untrusted_local_clock_label",
      createdAtUpperBoundObservedOnSameUntrustedLocalClock: CREATED_AT_UPPER_BOUND,
      trustedTimestampEstablished: false,
      externalTimeAuthorityEstablished: false,
      crossArtifactTemporalOrderEstablished: false
    },
    systemIdentity: {
      systemId: "ziwei",
      productSystemId: "ziwei-doushu",
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      projectDefaultReleaseGovernanceContext: {
        activeLine: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        mutationEpochBoundaryRequired: true,
        mutationEpochAvailableForSchema13: false,
        mutationEpochReceipt: null,
        publicDeploymentAuthorized: false,
        expertClaimsAuthorized: false
      },
      projectDefaultReleaseGovernanceInherited: false
    },
    observationScope: {
      adapterPackage: "@hakimi/ziwei-iztro-adapter-draft@0.0.0-draft.0",
      iztroDeclaredClosureEntry: "iztro@2.5.8",
      iztroDeclaredClosureNodeCount: 6,
      adapterAdditionalDirectDependencyCount: 1,
      observedDependencyCarrierCount: 7,
      exactDeclaredPackageSetObserved: true,
      completeInstalledRuntimeClosureBound: false,
      runtimeExecutionEstablished: false,
      buildToolingDependencyClosureCovered: false,
      fortelCovered: false,
      defaultWebCovered: false
    },
    basisArtifacts,
    dependencyCarriers: observation.dependencyCarriers,
    sourceRequirementsProjectionBoundary: {
      targetSubjectId: "ziwei.rights.engine-code-and-dependency-notices",
      candidateProjectionAllowedOnlyAsPartialUnbound: true,
      subjectFullySatisfied: false,
      formalExactQuoteBound: false,
      sourceBodyBound: false,
      completeDependencyNoticeClosureEstablished: false
    },
    crossSystemIsolationBoundary: {
      baziAuthorityInherited: false,
      westernAuthorityInherited: false,
      vedicAuthorityInherited: false,
      crossSystemLicenseConclusionInherited: false,
      crossSystemExpertConclusionInherited: false
    },
    observationBoundary: {
      fixedLocalEndpointsOnly: true,
      packageManifestAndLicenseHashUseSameHeldFileBuffer: true,
      perFilePathEndpointRevalidated: true,
      sourceBodiesCopiedIntoChild: 0,
      exactQuotesStoredInChild: 0,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      crossFileAtomicSnapshotEstablished: false,
      intervalMutationExcluded: false,
      abaExcluded: false,
      digitalSignatureVerified: false,
      publisherIdentityIndependentlyVerified: false
    },
    rightsBoundary: {
      licenseCarrierIdentityObserved: true,
      licenseAuthenticityEstablished: false,
      licenseApplicabilityEstablished: false,
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
    runtimeTrustBoundary: {
      fixedPathCliRejectsVisiblePreloadEnvironment: true,
      fixedPathCliRejectsVisiblePreloadOrLoaderArguments: true,
      visibleGuardScope: "invocation_visible_inputs_only",
      hiddenPreEvaluationCodeExecutionExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      launcherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      visibleGuardIsSecurityBoundary: false,
      assumesNoArbitraryPreEvaluationCodeExecution: true,
      selectedChildIdentityBindsCliImplementation: false
    },
    expertBoundary: {
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false
    },
    authorityBoundary: {
      formalAdmissionAuthorized: false,
      domainAuthorityAuthorized: false,
      contentTruthEstablished: false,
      rightsBundleComplete: false,
      sourceBundleComplete: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false
    },
    parentBindingBoundary: {
      bindingDirection: "fixed_local_declared_dependency_carriers_to_child_only",
      bindsZiweiSourceRequirementsV1: false,
      bindsZiweiManifest: false,
      bindsFourSystemRegistry: false,
      bindsCentralAdmission: false,
      bindsDefaultWeb: false
    },
    gateSummary: {
      dependenciesExpected: 7,
      dependenciesObserved: 7,
      packageManifestsVerified: 7,
      licenseCarrierEndpointsVerified: 7,
      sourceBodiesCopied: 0,
      exactQuotesStored: 0,
      bindingRequired: 27,
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
      "license_semantic_interpretation_applicability_or_compatibility",
      "work_version_or_carrier_rights",
      "complete_installed_runtime_build_tooling_fortel_or_default_web_dependency_closure",
      "notice_obligation_satisfaction_or_redistribution_authorization",
      "source_body_exact_quote_or_formal_binding",
      "any_of_27_ziwei_subjects_fully_satisfied",
      "content_truth_expert_truth_or_domain_authority",
      "formal_manifest_registry_or_central_admission",
      "release_evidence_release_readiness_or_public_release_authorization",
      "node_runtime_loader_launcher_identity_or_cli_attestation",
      "trusted_time_cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion"
    ]
  };
  return OBJECT_FREEZE({
    ...unsigned,
    childDigest: computeZiweiDeclaredDependencyLicenseCarrierChildDigest(unsigned)
  });
}

export async function buildCurrentZiweiDeclaredDependencyLicenseCarrierChild() {
  return buildExpectedFromObservation(await observeWorkspace(DEFAULT_WORKSPACE_ROOT));
}

export function serializeZiweiDeclaredDependencyLicenseCarrierChild(child) {
  const snapshot = passiveClone(child);
  if (snapshot.childDigest !== computeZiweiDeclaredDependencyLicenseCarrierChildDigest(snapshot)) {
    fail("CHILD_DIGEST_MISMATCH", "carrier child self digest 不匹配。");
  }
  return prettyStringify(snapshot);
}

function validateTimeBoundary(child) {
  const created = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [child?.createdAt]);
  const upper = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [
    child?.timeBoundary?.createdAtUpperBoundObservedOnSameUntrustedLocalClock
  ]);
  if (!NUMBER_IS_FINITE(created) || !NUMBER_IS_FINITE(upper) || created > upper) {
    fail("FUTURE_CREATED_AT_FORBIDDEN", "createdAt 晚于其固定未认证本机时钟上界。");
  }
  if (child.timeBoundary.trustedTimestampEstablished !== false
    || child.timeBoundary.externalTimeAuthorityEstablished !== false
    || child.timeBoundary.crossArtifactTemporalOrderEstablished !== false) {
    fail("TIME_AUTHORITY_ELEVATION_FORBIDDEN", "未认证本机时间标签不得抬为时间权威。");
  }
}

export async function verifyZiweiDeclaredDependencyLicenseCarrierChildLedger(
  child,
  workspaceRoot = DEFAULT_WORKSPACE_ROOT
) {
  validateTimeBoundary(child);
  const observation = await observeWorkspace(workspaceRoot);
  const expected = buildExpectedFromObservation(observation);
  if (canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(child)
      !== canonicalStringifyZiweiDeclaredDependencyLicenseCarrierChild(expected)) {
    fail("CHILD_CONTRACT_MISMATCH", "carrier child 与固定七依赖观察不一致。");
  }
  return expected;
}

async function loadFromWorkspaceRoot(workspaceRoot, enforcePersistedIdentity) {
  if (enforcePersistedIdentity && (EXPECTED_PERSISTED.rawBytes <= 0
    || !REFLECT_APPLY(REGEXP_TEST, SHA256, [EXPECTED_PERSISTED.rawSha256])
    || EXPECTED_PERSISTED.rawSha256
      === "0000000000000000000000000000000000000000000000000000000000000000")) {
    fail("PERSISTED_IDENTITY_UNSET", "carrier child raw identity 尚未冻结。");
  }
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    ZIWEI_DECLARED_DEPENDENCY_LICENSE_CARRIER_CHILD_RELATIVE_PATH
  );
  if (snapshot.rawBytes <= 0 || snapshot.rawBytes > MAX_ARTIFACT_BYTES) {
    fail("CHILD_SIZE_INVALID", "carrier child bytes 超出范围。");
  }
  if (enforcePersistedIdentity && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256)) {
    fail("CHILD_RAW_IDENTITY_DRIFT", "carrier child raw identity 漂移。");
  }
  const parsed = parseZiweiDeclaredDependencyLicenseCarrierChildArtifact(snapshot);
  const child = await verifyZiweiDeclaredDependencyLicenseCarrierChildLedger(parsed, workspaceRoot);
  if (decodeUtf8(snapshot.bytes, "carrier child")
      !== serializeZiweiDeclaredDependencyLicenseCarrierChild(child)) {
    fail("CHILD_CANONICAL_BYTES_DRIFT", "carrier child 必须是唯一 pretty JSON 与 LF 终止。");
  }
  const result = deepFreeze({
    ok: true,
    childId: child.childId,
    childDigest: child.childDigest,
    status: child.status,
    createdAt: child.createdAt,
    dependencyCarrierCount: child.gateSummary.dependenciesObserved,
    bindingRequired: child.gateSummary.bindingRequired,
    bindingFrozenVerified: child.gateSummary.bindingFrozenVerified,
    rightsLegalConclusionEstablished: child.rightsBoundary.rightsLegalConclusionEstablished,
    redistributionAuthorized: child.rightsBoundary.redistributionAuthorized,
    artifact: {
      path: snapshot.path,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    },
    child
  });
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RESULTS, [result]);
  return result;
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) {
    return value;
  }
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const keys = OBJECT_KEYS(descriptors);
  for (let index = 0; index < keys.length; index += 1) {
    if ("value" in descriptors[keys[index]]) deepFreeze(descriptors[keys[index]].value, seen);
  }
  return OBJECT_FREEZE(value);
}

export async function loadZiweiDeclaredDependencyLicenseCarrierChild() {
  return loadFromWorkspaceRoot(DEFAULT_WORKSPACE_ROOT, true);
}

export function isVerifiedZiweiDeclaredDependencyLicenseCarrierChild(value) {
  return value !== null && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RESULTS, [value])
    && OBJECT_IS_FROZEN(value);
}

export function getZiweiDeclaredDependencyLicenseCarrierChildSummary(result) {
  if (!isVerifiedZiweiDeclaredDependencyLicenseCarrierChild(result)) {
    fail("PRIVATE_BRAND_MISSING", "carrier child full-loader private brand 缺失。");
  }
  return OBJECT_FREEZE({
    childId: result.childId,
    childDigest: result.childDigest,
    status: result.status,
    createdAt: result.createdAt,
    dependencyCarrierCount: result.dependencyCarrierCount,
    bindingFrozenVerified: result.bindingFrozenVerified,
    bindingRequired: result.bindingRequired,
    rightsLegalConclusionEstablished: result.rightsLegalConclusionEstablished,
    redistributionAuthorized: result.redistributionAuthorized,
    rawBytes: result.artifact.rawBytes,
    rawSha256: result.artifact.rawSha256
  });
}

export const ziweiDeclaredDependencyLicenseCarrierChildTestOnly = OBJECT_FREEZE({
  BASIS_ARTIFACTS,
  PACKAGE_SPECS,
  CHILD_ID,
  CREATED_AT,
  CREATED_AT_UPPER_BOUND,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED,
  DEFAULT_WORKSPACE_ROOT,
  decodeUtf8,
  validateTimeBoundary,
  buildExpectedFromObservation,
  loadFromWorkspaceRoot
});
