import { createHash } from "node:crypto";
import { constants as fsConstants, lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

const NODE_UTIL_TYPES = process.getBuiltinModule("node:util")?.types;

const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_PUSH = Array.prototype.push;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_PROTOTYPE = Array.prototype;
const NATIVE_BUFFER = Buffer;
const BUFFER_ALLOC_UNSAFE = Buffer.allocUnsafe;
const BUFFER_PROTOTYPE = Buffer.prototype;
const NATIVE_BIGINT = BigInt;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const OBJECT_DEFINE_PROPERTIES = Object.defineProperties;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_CREATE = Object.create;
const OBJECT_ENTRIES = Object.entries;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTORS = Object.getOwnPropertyDescriptors;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_IS_FROZEN = Object.isFrozen;
const OBJECT_KEYS = Object.keys;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const REGEXP_TEST = RegExp.prototype.test;
const STRING_CHAR_CODE_AT = String.prototype.charCodeAt;
const STRING_INCLUDES = String.prototype.includes;
const STRING_LOCALE_COMPARE = String.prototype.localeCompare;
const STRING_SLICE = String.prototype.slice;
const STRING_SPLIT = String.prototype.split;
const STRING_STARTS_WITH = String.prototype.startsWith;
const STRING_TO_LOWER_CASE = String.prototype.toLowerCase;
const NATIVE_TEXT_DECODER = TextDecoder;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const NATIVE_UINT8_ARRAY = Uint8Array;
const UINT8_ARRAY_PROTOTYPE = Uint8Array.prototype;
const UTIL_IS_ARRAY_BUFFER = NODE_UTIL_TYPES?.isArrayBuffer;
const UTIL_IS_PROXY = NODE_UTIL_TYPES?.isProxy;
const UTIL_IS_SHARED_ARRAY_BUFFER = NODE_UTIL_TYPES?.isSharedArrayBuffer;
const UTIL_IS_UINT8_ARRAY = NODE_UTIL_TYPES?.isUint8Array;
const PATH_IS_ABSOLUTE = path.isAbsolute;
const PATH_JOIN = path.join;
const PATH_RELATIVE = path.relative;
const PATH_RESOLVE = path.resolve;
const PATH_SEPARATOR = path.sep;
const MAX_MANIFEST_BYTES = 1_000_000;
const MAX_COMPONENT_FILE_BYTES = 5_000_000;
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_NODES = 200_000;
const MAX_INPUT_TEXT_CODE_UNITS = 2_000_000;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const CANONICAL_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const REFLECT_APPLY = Reflect.apply;
const HASH_SAMPLE = createHash("sha256");
const HASH_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(HASH_SAMPLE);
const HASH_UPDATE = HASH_PROTOTYPE.update;
const HASH_DIGEST = HASH_PROTOTYPE.digest;
REFLECT_APPLY(HASH_DIGEST, HASH_SAMPLE, []);
const NATIVE_DATE = Date;
const DATE_PARSE = Date.parse;
const DATE_TO_ISO_STRING = Date.prototype.toISOString;
const NATIVE_SET = Set;
const SET_ADD = Set.prototype.add;
const SET_HAS = Set.prototype.has;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const WEAK_SET_HAS = WeakSet.prototype.has;
const COMPONENT_ORDER = OBJECT_FREEZE([
  "execution_rules",
  "interpretation_rules",
  "input_policy",
  "fact_contract",
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle",
  "high_risk_policy",
  "report_contract"
]);

function definition(input) {
  const components = [];
  for (let componentIndex = 0; componentIndex < input.components.length; componentIndex += 1) {
    const component = input.components[componentIndex];
    const files = [];
    for (let fileIndex = 0; fileIndex < component.files.length; fileIndex += 1) {
      REFLECT_APPLY(ARRAY_PUSH, files, [component.files[fileIndex]]);
    }
    REFLECT_APPLY(ARRAY_PUSH, components, [OBJECT_FREEZE({
      ...component,
      files: OBJECT_FREEZE(files)
    })]);
  }
  return OBJECT_FREEZE({
    ...input,
    components: OBJECT_FREEZE(components)
  });
}

export const INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS = OBJECT_FREEZE([
  definition({
    productSystemId: "ziwei-doushu",
    systemId: "ziwei",
    bindingRequired: 27,
    manifestPath: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json",
    manifestSchemaVersion: "2.0.0",
    manifestRecordType: "system_domain_release_manifest_current_machine_identity",
    manifestId: "hakimi.ziwei-doushu.isolated-engineering-domain-release-manifest/2.0.0",
    predecessor: OBJECT_FREEZE({
      path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json",
      rawBytes: 11591,
      rawSha256: "4a09928188c659152383824dca7630a251a3b384b82a81344ea3d3a4b812d5f7",
      manifestDigest: "ac8d05dbfe45846e1edbb277ce2e34f076a8e2c7e6adb8c57b75366d04c8eed7"
    }),
    persistedRawIdentity: OBJECT_FREEZE({
      rawBytes: 17968,
      rawSha256: "f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867",
      manifestDigest: "f16f4e023248d4362fe42b28e34fd054a3451980d437ca9c83b6bdfb053fb34e"
    }),
    surfaceId: "ziwei-isolated-workspace-draft",
    surfaceVersion: "0.1.0",
    releaseIdentity: null,
    projectDefaultReleaseGovernance: OBJECT_FREEZE({
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      inheritedByThisSystem: false
    }),
    gateStateExtensions: OBJECT_FREEZE({
      formalKnowledgeDocuments: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      hkoRawSourceBodiesStoredPendingRightsReview: 6,
      freshRestrictedSourcePreReleaseCheckRequired: true,
      historicalRestrictedSourcePassMaySatisfy: false,
      restrictedSourcePointInTimePassPersisted: false,
      highRiskPolicySourceIdentityBound: true,
      registeredHighRiskEgressSurfaces: 16,
      candidateCallSitesWiredToGate: false,
      semanticCoverageComplete: false,
      formalAdmissionPromotionBlocked: true
    }),
    components: [
      {
        componentId: "execution_rules",
        version: "iztro@2.5.8+hakimi-fresh-worker-draft/0.1.0",
        status: "bound",
        files: [
          "packages/ziwei-doushu-contracts-draft/src/index.ts",
          "packages/ziwei-iztro-adapter-draft/src/index.ts",
          "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json",
          "packages/ziwei-iztro-adapter-draft/src/node-worker-entry.mjs",
          "packages/ziwei-workspace-artifact-draft/src/browser-calculation-bridge.ts"
        ]
      },
      {
        componentId: "interpretation_rules",
        version: "hakimi.ziwei.interpretation-engineering-draft/0.1.0",
        status: "bound",
        files: [
          "packages/ziwei-doushu-contracts-draft/src/index.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/core-minor-star-content.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/major-star-content.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/major-star-palace-content.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/natal-transformation-content.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/natal-transformation-palace-content.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/palace-four-part-synthesis-content.ts"
        ]
      },
      {
        componentId: "input_policy",
        version: "hakimi.ziwei.input-contract-draft/0.1.0",
        status: "bound",
        files: [
          "packages/ziwei-doushu-contracts-draft/src/index.ts"
        ]
      },
      {
        componentId: "fact_contract",
        version: "hakimi.ziwei.natal-facts-draft/0.1.0",
        status: "bound",
        files: [
          "packages/ziwei-doushu-contracts-draft/src/index.ts",
          "packages/ziwei-iztro-adapter-draft/src/cross-system-engineering-fact-projection.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-artifact.ts",
          "packages/ziwei-iztro-adapter-draft/src/index.ts"
        ]
      },
      {
        componentId: "source_bundle",
        version: "source-binding-requirements-plus-hko-calendar-candidate/1.1.0",
        status: "incomplete",
        files: [
          "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json",
          "content/system-admission/ziwei-hko-calendar-public-endpoint-observation.v1.json",
          "content/system-admission/ziwei-hko-restricted-source-pre-release-policy.v1.json",
          "content/system-admission/ziwei-source-binding-requirements.v1.json",
          "packages/ziwei-doushu-contracts-draft/README.md",
          "packages/ziwei-iztro-adapter-draft/README.md",
          "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json",
          "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
          "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.ts",
          "scripts/independent-source-binding-requirements-lib.mjs",
          "scripts/verify-ziwei-hko-calendar-public-endpoint-observation.mjs",
          "scripts/verify-ziwei-hko-calendar-source-evidence.mjs",
          "scripts/ziwei-hko-calendar-public-endpoint-observation-lib.mjs",
          "scripts/ziwei-hko-calendar-source-evidence-lib.mjs",
          "scripts/ziwei-hko-restricted-source-pre-release-policy-lib.mjs",
          "scripts/verify-independent-source-binding-requirements.mjs"
        ]
      },
      {
        componentId: "rights_bundle",
        version: "dependency-observations-not-product-clearance/0.1.0",
        status: "incomplete",
        files: [
          "content/system-admission/ziwei-hko-calendar-public-endpoint-observation.v1.json",
          "content/system-admission/ziwei-hko-restricted-source-pre-release-policy.v1.json",
          "content/system-admission/ziwei-iztro-build-notice-evidence.v1.json",
          "packages/ziwei-doushu-contracts-draft/README.md",
          "packages/ziwei-doushu-contracts-draft/package.json",
          "packages/ziwei-fortel-differential-draft/README.md",
          "packages/ziwei-fortel-differential-draft/package.json",
          "packages/ziwei-fortel-differential-draft/src/fortel-ziweidoushu-1.3.4-lock-closure.json",
          "packages/ziwei-iztro-adapter-draft/README.md",
          "packages/ziwei-iztro-adapter-draft/package.json",
          "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json"
        ]
      },
      {
        componentId: "expert_review_bundle",
        version: "absent/0",
        status: "absent",
        files: []
      },
      {
        componentId: "high_risk_policy",
        version: "draft-boundary-only/0.1.0",
        status: "incomplete",
        files: [
          "content/system-admission/ziwei-high-risk-expression-policy-draft.v0.1.0.json",
          "packages/ziwei-doushu-contracts-draft/README.md",
          "packages/ziwei-doushu-contracts-draft/src/index.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/browser-client.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-policy.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-view.ts",
          "packages/ziwei-iztro-adapter-draft/src/browser-preview/main-response-gate.ts",
          "packages/ziwei-workspace-artifact-draft/src/browser-app/main.ts",
          "scripts/verify-ziwei-high-risk-expression-policy-draft.mjs",
          "scripts/ziwei-high-risk-expression-policy-draft-lib.mjs"
        ]
      },
      {
        componentId: "report_contract",
        version: "isolated-workspace-preview-not-formal-report/0.1.0",
        status: "incomplete",
        files: [
          "packages/ziwei-workspace-artifact-draft/README.md",
          "packages/ziwei-workspace-artifact-draft/src/browser-artifact-bridge.ts",
          "packages/ziwei-workspace-artifact-draft/src/browser-calculation-bridge.ts",
          "packages/ziwei-workspace-artifact-draft/src/browser-app/main.ts",
          "packages/ziwei-workspace-artifact-draft/src/index.ts"
        ]
      }
    ]
  }),
  definition({
    productSystemId: "western-astrology",
    systemId: "western",
    bindingRequired: 28,
    manifestPath: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    surfaceId: "western-isolated-rules-preview-draft",
    surfaceVersion: "0.1.0",
    releaseIdentity: "isolated-western-draft-no-main-schema",
    components: [
      {
        componentId: "execution_rules",
        version: "astronomy-engine@2.1.19+hakimi-fresh-worker-draft/0.1.0",
        status: "bound",
        files: [
          "packages/western-astrology-contracts-draft/src/index.ts",
          "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json",
          "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-source-lock.json",
          "packages/western-astronomy-engine-adapter-draft/src/astronomy-worker-entry.mjs",
          "packages/western-astronomy-engine-adapter-draft/src/delta-t-model-lock.json",
          "packages/western-astronomy-engine-adapter-draft/src/index.ts"
        ]
      },
      {
        componentId: "interpretation_rules",
        version: "hakimi.western.geometry-rules-engineering-draft/0.1.0",
        status: "bound",
        files: [
          "packages/western-astrology-contracts-draft/src/index.ts",
          "packages/western-astronomy-engine-adapter-draft/src/rule-layer/aspects.ts",
          "packages/western-astronomy-engine-adapter-draft/src/rule-layer/canonical.ts",
          "packages/western-astronomy-engine-adapter-draft/src/rule-layer/houses.ts",
          "packages/western-astronomy-engine-adapter-draft/src/rule-layer/index.ts",
          "packages/western-astronomy-engine-adapter-draft/src/rule-layer/zodiac.ts"
        ]
      },
      {
        componentId: "input_policy",
        version: "hakimi.western.input-contract-draft/0.1.0",
        status: "bound",
        files: [
          "packages/western-astrology-contracts-draft/src/index.ts"
        ]
      },
      {
        componentId: "fact_contract",
        version: "hakimi.western.astronomy-facts-draft/0.1.0",
        status: "bound",
        files: [
          "packages/western-astrology-contracts-draft/src/index.ts",
          "packages/western-astronomy-engine-adapter-draft/src/contract-bridge.ts",
          "packages/western-astronomy-engine-adapter-draft/src/cross-system-engineering-fact-projection.ts",
          "packages/western-astronomy-engine-adapter-draft/src/index.ts"
        ]
      },
      {
        componentId: "source_bundle",
        version: "source-binding-requirements-inventory/1.0.0",
        status: "incomplete",
        files: [
          "content/system-admission/western-source-binding-requirements.v1.json",
          "packages/western-astrology-contracts-draft/README.md",
          "packages/western-astronomy-engine-adapter-draft/README.md",
          "scripts/independent-source-binding-requirements-lib.mjs",
          "scripts/verify-independent-source-binding-requirements.mjs"
        ]
      },
      {
        componentId: "rights_bundle",
        version: "dependency-observations-not-product-clearance/0.1.0",
        status: "incomplete",
        files: [
          "packages/western-astrology-contracts-draft/README.md",
          "packages/western-astrology-contracts-draft/package.json",
          "packages/western-astronomy-engine-adapter-draft/README.md",
          "packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
          "packages/western-astronomy-engine-adapter-draft/package.json",
          "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json",
          "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-source-lock.json"
        ]
      },
      {
        componentId: "expert_review_bundle",
        version: "absent/0",
        status: "absent",
        files: []
      },
      {
        componentId: "high_risk_policy",
        version: "draft-boundary-only/0.1.0",
        status: "incomplete",
        files: [
          "packages/western-astrology-contracts-draft/README.md",
          "packages/western-astrology-contracts-draft/src/index.ts",
          "packages/western-astronomy-engine-adapter-draft/src/strict-receipt-draft.ts"
        ]
      },
      {
        componentId: "report_contract",
        version: "isolated-rules-preview-not-formal-report/0.1.0",
        status: "incomplete",
        files: [
          "packages/western-astrology-rules-preview-draft/README.md",
          "packages/western-astrology-rules-preview-draft/src/browser-app/content-layer.ts",
          "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts",
          "packages/western-astrology-rules-preview-draft/src/rule-layer-bridge.ts"
        ]
      }
    ]
  })
]);

const APPROVED_DEFINITIONS = new NATIVE_WEAK_SET();
for (let index = 0; index < INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.length; index += 1) {
  REFLECT_APPLY(WEAK_SET_ADD, APPROVED_DEFINITIONS, [
    INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[index]
  ]);
}
const FULL_LOAD_RESULTS = new NATIVE_WEAK_SET();
const TYPED_ARRAY_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(UINT8_ARRAY_PROTOTYPE);
const TYPED_ARRAY_BUFFER_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "buffer"
)?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "byteOffset"
)?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "byteLength"
)?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  ArrayBuffer.prototype,
  "resizable"
)?.get;
const UINT8_ARRAY_SET = UINT8_ARRAY_PROTOTYPE.set;
const MODULE_FILE_URL = new URL(import.meta.url);
const INTRINSIC_STATS_SAMPLE = await lstat(MODULE_FILE_URL, { bigint: true });
const STATS_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(INTRINSIC_STATS_SAMPLE);
const STATS_IS_DIRECTORY = STATS_PROTOTYPE.isDirectory;
const STATS_IS_FILE = STATS_PROTOTYPE.isFile;
const STATS_IS_SYMBOLIC_LINK = STATS_PROTOTYPE.isSymbolicLink;
const INTRINSIC_FILE_HANDLE = await open(MODULE_FILE_URL, "r");
const FILE_HANDLE_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(INTRINSIC_FILE_HANDLE);
const INTRINSIC_FILE_HANDLE_CLOSE = INTRINSIC_FILE_HANDLE.close;
const FILE_HANDLE_READ = FILE_HANDLE_PROTOTYPE.read;
const FILE_HANDLE_STAT = FILE_HANDLE_PROTOTYPE.stat;
await REFLECT_APPLY(INTRINSIC_FILE_HANDLE_CLOSE, INTRINSIC_FILE_HANDLE, []);

export class IndependentDomainManifestError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "IndependentDomainManifestError";
    OBJECT_DEFINE_PROPERTIES(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new IndependentDomainManifestError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isCanonicalUtc(value) {
  if (typeof value !== "string" || !REFLECT_APPLY(REGEXP_TEST, CANONICAL_UTC, [value])) return false;
  let timestamp;
  let normalized;
  try {
    timestamp = REFLECT_APPLY(DATE_PARSE, NATIVE_DATE, [value]);
    normalized = REFLECT_APPLY(DATE_TO_ISO_STRING, new NATIVE_DATE(timestamp), []);
  } catch {
    return false;
  }
  return normalized === value;
}

function captureUint8Array(bytes, label, maxBytes) {
  if (UTIL_IS_PROXY(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  let prototype;
  try {
    prototype = OBJECT_GET_PROTOTYPE_OF(bytes);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 的字节原型不可读。`, cause);
  }
  if (!UTIL_IS_UINT8_ARRAY(bytes)
    || (prototype !== UINT8_ARRAY_PROTOTYPE && prototype !== BUFFER_PROTOTYPE)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 的内部字节槽不可读。`, cause);
  }
  if (!NUMBER_IS_SAFE_INTEGER(byteOffset) || byteOffset < 0
    || !NUMBER_IS_SAFE_INTEGER(byteLength) || byteLength < 0
    || !NUMBER_IS_SAFE_INTEGER(maxBytes) || maxBytes <= 0) {
    fail("JSON_BYTES_INVALID", `${label} 的字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (typeof UTIL_IS_SHARED_ARRAY_BUFFER === "function"
    && UTIL_IS_SHARED_ARRAY_BUFFER(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!UTIL_IS_ARRAY_BUFFER(backingBuffer)) {
    fail("JSON_BYTES_INVALID", `${label} backing buffer 无效。`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = REFLECT_APPLY(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      fail("JSON_BYTES_INVALID", `${label} backing buffer 状态不可读。`, cause);
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new NATIVE_UINT8_ARRAY(byteLength);
  try {
    REFLECT_APPLY(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 无法复制到私有固定缓冲区。`, cause);
  }
  return captured;
}

function scanStrictJsonForDuplicateKeys(source, label) {
  let index = 0;
  let nodes = 0;

  function invalid() {
    fail("JSON_INVALID", `${label} 不是严格 JSON。`);
  }

  function skipWhitespace() {
    while (index < source.length) {
      const current = source[index];
      if (current !== " " && current !== "\t" && current !== "\n" && current !== "\r") break;
      index += 1;
    }
  }

  function isDigit(current) {
    return current >= "0" && current <= "9";
  }

  function isHex(current) {
    return isDigit(current)
      || (current >= "a" && current <= "f")
      || (current >= "A" && current <= "F");
  }

  function parseStringToken() {
    if (source[index] !== '"') invalid();
    const start = index;
    index += 1;
    while (index < source.length) {
      const current = source[index];
      if (current === '"') {
        index += 1;
        try {
          return JSON_PARSE(REFLECT_APPLY(STRING_SLICE, source, [start, index]));
        } catch (cause) {
          fail("JSON_INVALID", `${label} 含无效 JSON 字符串。`, cause);
        }
      }
      if (current === "\\") {
        index += 1;
        const escaped = source[index];
        if (escaped === "u") {
          for (let offset = 1; offset <= 4; offset += 1) {
            if (!isHex(source[index + offset])) invalid();
          }
          index += 5;
          continue;
        }
        if (escaped !== '"' && escaped !== "\\" && escaped !== "/"
          && escaped !== "b" && escaped !== "f" && escaped !== "n"
          && escaped !== "r" && escaped !== "t") invalid();
        index += 1;
        continue;
      }
      if (REFLECT_APPLY(STRING_CHAR_CODE_AT, source, [index]) < 0x20) invalid();
      index += 1;
    }
    invalid();
  }

  function parseNumberToken() {
    if (source[index] === "-") index += 1;
    if (source[index] === "0") {
      index += 1;
      if (isDigit(source[index])) invalid();
    } else {
      if (source[index] < "1" || source[index] > "9") invalid();
      while (isDigit(source[index])) index += 1;
    }
    if (source[index] === ".") {
      index += 1;
      if (!isDigit(source[index])) invalid();
      while (isDigit(source[index])) index += 1;
    }
    if (source[index] === "e" || source[index] === "E") {
      index += 1;
      if (source[index] === "+" || source[index] === "-") index += 1;
      if (!isDigit(source[index])) invalid();
      while (isDigit(source[index])) index += 1;
    }
  }

  function consumeLiteral(literal) {
    for (let offset = 0; offset < literal.length; offset += 1) {
      if (source[index + offset] !== literal[offset]) invalid();
    }
    index += literal.length;
  }

  function parseValue(depth) {
    if (depth > MAX_INPUT_DEPTH) fail("JSON_TOO_COMPLEX", `${label} 超过 JSON 深度上限。`);
    nodes += 1;
    if (nodes > MAX_INPUT_NODES) fail("JSON_TOO_COMPLEX", `${label} 超过 JSON 节点上限。`);
    skipWhitespace();
    const current = source[index];
    if (current === "{") {
      index += 1;
      skipWhitespace();
      const keys = new NATIVE_SET();
      if (source[index] === "}") {
        index += 1;
        return;
      }
      while (index < source.length) {
        const key = parseStringToken();
        if (REFLECT_APPLY(SET_HAS, keys, [key])) {
          fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
        }
        REFLECT_APPLY(SET_ADD, keys, [key]);
        skipWhitespace();
        if (source[index] !== ":") invalid();
        index += 1;
        parseValue(depth + 1);
        skipWhitespace();
        if (source[index] === "}") {
          index += 1;
          return;
        }
        if (source[index] !== ",") invalid();
        index += 1;
        skipWhitespace();
      }
      invalid();
    }
    if (current === "[") {
      index += 1;
      skipWhitespace();
      if (source[index] === "]") {
        index += 1;
        return;
      }
      while (index < source.length) {
        parseValue(depth + 1);
        skipWhitespace();
        if (source[index] === "]") {
          index += 1;
          return;
        }
        if (source[index] !== ",") invalid();
        index += 1;
      }
      invalid();
    }
    if (current === '"') {
      parseStringToken();
      return;
    }
    if (current === "t") return consumeLiteral("true");
    if (current === "f") return consumeLiteral("false");
    if (current === "n") return consumeLiteral("null");
    if (current === "-" || isDigit(current)) {
      parseNumberToken();
      return;
    }
    invalid();
  }

  skipWhitespace();
  if (index >= source.length) fail("JSON_INVALID", `${label} 为空。`);
  parseValue(0);
  skipWhitespace();
  if (index !== source.length) invalid();
}

function parseCapturedManifestJson(captured, label) {
  const capturedByteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, captured, []);
  if (capturedByteLength >= 3
    && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    const decoder = new NATIVE_TEXT_DECODER("utf-8", { fatal: true });
    source = REFLECT_APPLY(TEXT_DECODER_DECODE, decoder, [captured]);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
  scanStrictJsonForDuplicateKeys(source, label);
  try {
    const parsed = JSON_PARSE(source);
    if (!parsed || typeof parsed !== "object" || ARRAY_IS_ARRAY(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof IndependentDomainManifestError) throw cause;
    fail("JSON_INVALID", `${label} 不是合法 JSON。`, cause);
  }
}

export function parseIndependentDomainManifestJsonBytes(
  bytes,
  label = "独立体系 manifest",
  maxBytes = MAX_MANIFEST_BYTES
) {
  const parsed = parseCapturedManifestJson(captureUint8Array(bytes, label, maxBytes), label);
  return deepFreezeJson(requireManifestSnapshot(parsed));
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > MAX_INPUT_DEPTH) fail("INPUT_DEPTH_EXCEEDED", "独立体系 manifest 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) fail("INPUT_NODE_LIMIT_EXCEEDED", "独立体系 manifest 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!NUMBER_IS_FINITE(value) || OBJECT_IS(value, -0)) {
      fail("INPUT_VALUE_INVALID", "独立体系 manifest 输入含无效数值。");
    }
    return value;
  }
  if (typeof value === "string") {
    state.textCodeUnits += value.length;
    if (state.textCodeUnits > MAX_INPUT_TEXT_CODE_UNITS) {
      fail("INPUT_TEXT_LIMIT_EXCEEDED", "独立体系 manifest 输入超过文本上限。");
    }
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "独立体系 manifest 只接受 JSON 数据值。");
  if (UTIL_IS_PROXY(value)) fail("INPUT_PROXY_FORBIDDEN", "独立体系 manifest 输入不接受 Proxy。");
  if (REFLECT_APPLY(WEAK_SET_HAS, state.active, [value])) {
    fail("INPUT_CYCLE_FORBIDDEN", "独立体系 manifest 输入不接受循环引用。");
  }
  if (REFLECT_APPLY(WEAK_SET_HAS, state.seen, [value])) {
    fail("INPUT_ALIAS_FORBIDDEN", "独立体系 manifest 输入不接受对象别名。");
  }
  REFLECT_APPLY(WEAK_SET_ADD, state.active, [value]);
  REFLECT_APPLY(WEAK_SET_ADD, state.seen, [value]);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = ARRAY_IS_ARRAY(value);
      prototype = OBJECT_GET_PROTOTYPE_OF(value);
      descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "独立体系 manifest 输入不能被安全捕获。", cause);
    }
    const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      const key = descriptorKeys[keyIndex];
      if (typeof key === "symbol") {
        fail("INPUT_SYMBOL_FORBIDDEN", "独立体系 manifest 输入不接受 Symbol 属性。");
      }
    }
    if (array) {
      if (prototype !== ARRAY_PROTOTYPE) fail("INPUT_PROTOTYPE_INVALID", "独立体系 manifest 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !NUMBER_IS_SAFE_INTEGER(length) || length < 0 || length > MAX_INPUT_NODES) {
        fail("INPUT_ARRAY_INVALID", "独立体系 manifest 数组长度无效。");
      }
      const allowedKeys = new NATIVE_SET();
      REFLECT_APPLY(SET_ADD, allowedKeys, ["length"]);
      for (let index = 0; index < length; index += 1) {
        REFLECT_APPLY(SET_ADD, allowedKeys, [String(index)]);
      }
      for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
        const key = descriptorKeys[keyIndex];
        if (!REFLECT_APPLY(SET_HAS, allowedKeys, [key])) {
          fail("INPUT_ARRAY_INVALID", "独立体系 manifest 数组含额外属性。");
        }
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "独立体系 manifest 不接受稀疏数组或访问器元素。");
        }
        REFLECT_APPLY(ARRAY_PUSH, output, [
          capturePassiveJsonValue(descriptor.value, state, depth + 1)
        ]);
      }
      return output;
    }
    if (prototype !== OBJECT_PROTOTYPE) {
      fail("INPUT_PROTOTYPE_INVALID", "独立体系 manifest 只接受普通对象。");
    }
    const output = {};
    for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
      const key = descriptorKeys[keyIndex];
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "独立体系 manifest 不接受访问器或不可枚举字段。");
      }
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: capturePassiveJsonValue(descriptor.value, state, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    REFLECT_APPLY(WEAK_SET_DELETE, state.active, [value]);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    active: new NATIVE_WEAK_SET(),
    seen: new NATIVE_WEAK_SET(),
    nodes: 0,
    textCodeUnits: 0
  }, 0);
}

function canonicalValue(snapshot) {
  if (snapshot === null || typeof snapshot === "boolean" || typeof snapshot === "string") return snapshot;
  if (typeof snapshot === "number" && NUMBER_IS_FINITE(snapshot) && !OBJECT_IS(snapshot, -0)) return snapshot;
  if (ARRAY_IS_ARRAY(snapshot)) {
    const output = [];
    OBJECT_DEFINE_PROPERTY(output, "toJSON", {
      value: null,
      enumerable: false,
      configurable: false,
      writable: false
    });
    for (let index = 0; index < snapshot.length; index += 1) {
      REFLECT_APPLY(ARRAY_PUSH, output, [canonicalValue(snapshot[index])]);
    }
    return output;
  }
  if (snapshot && typeof snapshot === "object" && OBJECT_GET_PROTOTYPE_OF(snapshot) === OBJECT_PROTOTYPE) {
    const output = OBJECT_CREATE(null);
    const keys = OBJECT_KEYS(snapshot);
    REFLECT_APPLY(ARRAY_SORT, keys, [compareCodeUnits]);
    for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      OBJECT_DEFINE_PROPERTY(output, key, {
        value: canonicalValue(snapshot[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "独立体系 manifest 只接受有限规范 JSON 值。");
}

export function canonicalStringifyIndependentDomainManifest(value) {
  return JSON_STRINGIFY(canonicalValue(capturePassiveJsonSnapshot(value)));
}

function deepFreezeJson(value, seen = new NATIVE_SET()) {
  if (!value || typeof value !== "object" || REFLECT_APPLY(SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(SET_ADD, seen, [value]);
  const descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
  const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
  for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
    const key = descriptorKeys[keyIndex];
    const descriptor = descriptors[key];
    if (descriptor && OBJECT_HAS_OWN(descriptor, "value")) deepFreezeJson(descriptor.value, seen);
  }
  return OBJECT_FREEZE(value);
}

function assertRecursivelyFrozenJson(value, seen = new NATIVE_SET()) {
  if (!value || typeof value !== "object" || REFLECT_APPLY(SET_HAS, seen, [value])) return;
  if (UTIL_IS_PROXY(value)) {
    fail("FULL_LOAD_INVARIANT_FAILED", "独立体系 full-load 结果不得包含 Proxy。");
  }
  REFLECT_APPLY(SET_ADD, seen, [value]);
  let descriptors;
  let frozen;
  try {
    descriptors = OBJECT_GET_OWN_PROPERTY_DESCRIPTORS(value);
    frozen = OBJECT_IS_FROZEN(value);
  } catch (cause) {
    fail("FULL_LOAD_INVARIANT_FAILED", "独立体系 full-load 冻结不变量不可检查。", cause);
  }
  if (!frozen) {
    fail("FULL_LOAD_INVARIANT_FAILED", "独立体系 full-load 结果未递归冻结。");
  }
  const descriptorKeys = REFLECT_OWN_KEYS(descriptors);
  for (let keyIndex = 0; keyIndex < descriptorKeys.length; keyIndex += 1) {
    const key = descriptorKeys[keyIndex];
    const descriptor = descriptors[key];
    if (!descriptor || !OBJECT_HAS_OWN(descriptor, "value")
      || descriptor.configurable !== false || descriptor.writable !== false) {
      fail("FULL_LOAD_INVARIANT_FAILED", "独立体系 full-load 结果含可变或访问器字段。");
    }
    assertRecursivelyFrozenJson(descriptor.value, seen);
  }
}

function sha256Value(value) {
  const hash = createHash("sha256");
  REFLECT_APPLY(HASH_UPDATE, hash, [
    canonicalStringifyIndependentDomainManifest(value),
    "utf8"
  ]);
  return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
}

export function computeIndependentDomainComponentDigest(componentInput) {
  const component = capturePassiveJsonSnapshot(componentInput);
  return sha256Value({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  });
}

export function computeIndependentDomainManifestDigest(manifestInput) {
  const manifest = capturePassiveJsonSnapshot(manifestInput);
  if (!manifest || typeof manifest !== "object" || ARRAY_IS_ARRAY(manifest)) {
    fail("MANIFEST_INVALID", "独立体系 manifest 必须是 JSON 对象。");
  }
  const { manifestDigest: _manifestDigest, ...unsigned } = manifest;
  return sha256Value(unsigned);
}

export function serializeIndependentDomainManifest(manifestInput) {
  const manifest = capturePassiveJsonSnapshot(manifestInput);
  if (!manifest || typeof manifest !== "object" || ARRAY_IS_ARRAY(manifest)) {
    fail("MANIFEST_INVALID", "独立体系 manifest 必须是 JSON 对象。");
  }
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [manifest, null, 2])}\n`;
}

function normalizePathIdentity(value) {
  const normalized = PATH_RESOLVE(value);
  return process.platform === "win32"
    ? REFLECT_APPLY(STRING_TO_LOWER_CASE, normalized, [])
    : normalized;
}

function insideRoot(root, candidate) {
  const relative = PATH_RELATIVE(root, candidate);
  return relative === ""
    || (relative !== ".."
      && !REFLECT_APPLY(STRING_STARTS_WITH, relative, [`..${PATH_SEPARATOR}`])
      && !PATH_IS_ABSOLUTE(relative));
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath
    || relativePath.length > 300
    || !REFLECT_APPLY(REGEXP_TEST, /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u, [relativePath])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\\"])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, ["\0"])
    || REFLECT_APPLY(STRING_INCLUDES, relativePath, [":"])) {
    fail("UNSAFE_COMPONENT_PATH", "独立体系组件路径必须是仓内规范相对路径。");
  }
  const parts = REFLECT_APPLY(STRING_SPLIT, relativePath, ["/"]);
  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const part = parts[partIndex];
    if (!part || part === "." || part === "..") {
      fail("UNSAFE_COMPONENT_PATH", "独立体系组件路径不得为空、绝对或逃逸。");
    }
  }
  return parts;
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryChain(root, directoryParts) {
  const snapshots = [];
  let cursor = root;
  for (let partIndex = -1; partIndex < directoryParts.length; partIndex += 1) {
    const part = partIndex < 0 ? null : directoryParts[partIndex];
    if (part !== null) cursor = PATH_JOIN(cursor, part);
    let metadata;
    let resolved;
    try {
      metadata = await lstat(cursor, { bigint: true });
      resolved = await realpath(cursor);
    } catch (cause) {
      fail("DIRECTORY_CHAIN_INVALID", "独立体系组件目录链不可安全读取。", cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, metadata, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, metadata, [])
      || normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("DIRECTORY_CHAIN_INVALID", "独立体系组件目录链包含链接、别名或非目录端点。");
    }
    REFLECT_APPLY(ARRAY_PUSH, snapshots, [OBJECT_FREEZE({ path: cursor, resolved, metadata })]);
  }
  return snapshots;
}

async function revalidateDirectoryChain(snapshots) {
  for (let snapshotIndex = 0; snapshotIndex < snapshots.length; snapshotIndex += 1) {
    const snapshot = snapshots[snapshotIndex];
    let metadata;
    let resolved;
    try {
      metadata = await lstat(snapshot.path, { bigint: true });
      resolved = await realpath(snapshot.path);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "独立体系组件读取期间目录链发生变化。", cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, metadata, [])
      || !REFLECT_APPLY(STATS_IS_DIRECTORY, metadata, [])
      || !sameEndpoint(snapshot.metadata, metadata)
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("ENDPOINT_CHANGED", "独立体系组件读取期间目录链发生变化。");
    }
  }
}

async function readBoundedHandle(handle, maxBytes) {
  const buffer = REFLECT_APPLY(BUFFER_ALLOC_UNSAFE, NATIVE_BUFFER, [maxBytes + 1]);
  const bufferByteLength = REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, buffer, []);
  let offset = 0;
  while (offset < bufferByteLength) {
    const { bytesRead } = await REFLECT_APPLY(FILE_HANDLE_READ, handle, [
      buffer,
      offset,
      bufferByteLength - offset,
      offset
    ]);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxBytes) fail("FILE_SIZE_INVALID", "独立体系组件文件在读取时超过上限。");
  const backingBuffer = REFLECT_APPLY(TYPED_ARRAY_BUFFER_GETTER, buffer, []);
  const byteOffset = REFLECT_APPLY(TYPED_ARRAY_BYTE_OFFSET_GETTER, buffer, []);
  return new NATIVE_UINT8_ARRAY(backingBuffer, byteOffset, offset);
}

async function callTestHook(testHooks, phase, payload) {
  if (typeof testHooks?.[phase] === "function") await testHooks[phase](payload);
}

async function readStableWorkspaceFile(
  workspaceRootInput,
  relativePath,
  maxBytes,
  testHooks = undefined
) {
  if (typeof workspaceRootInput !== "string" || !workspaceRootInput) {
    fail("WORKSPACE_ROOT_INVALID", "独立体系 manifest 工作区 root 必须是非空字符串。");
  }
  if (!NUMBER_IS_SAFE_INTEGER(maxBytes) || maxBytes <= 0) {
    fail("FILE_SIZE_INVALID", "独立体系组件文件上限无效。");
  }
  const parts = validateRelativePath(relativePath);
  const requestedRoot = PATH_RESOLVE(workspaceRootInput);
  const directoryParts = [];
  for (let index = 0; index < parts.length - 1; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, directoryParts, [parts[index]]);
  }
  const directoryChain = await captureDirectoryChain(requestedRoot, directoryParts);
  const root = directoryChain[0].resolved;
  const resolveArguments = [root];
  for (let index = 0; index < parts.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, resolveArguments, [parts[index]]);
  }
  const absolutePath = REFLECT_APPLY(PATH_RESOLVE, undefined, resolveArguments);
  if (!insideRoot(root, absolutePath)
    || normalizePathIdentity(root) !== normalizePathIdentity(requestedRoot)) {
    fail("UNSAFE_COMPONENT_PATH", "独立体系组件路径越出工作区或 root 为别名。");
  }
  let beforePath;
  let resolved;
  try {
    beforePath = await lstat(absolutePath, { bigint: true });
    resolved = await realpath(absolutePath);
  } catch (cause) {
    fail("COMPONENT_FILE_MISSING", `独立体系组件文件不存在：${relativePath}`, cause);
  }
  if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, beforePath, [])
    || !REFLECT_APPLY(STATS_IS_FILE, beforePath, [])
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
    fail("SYMLINK_REJECTED", `独立体系组件拒绝链接或路径别名：${relativePath}`);
  }
  if (beforePath.nlink !== 1n) {
    fail("HARDLINK_REJECTED", `独立体系组件必须是单链接普通文件：${relativePath}`);
  }
  if (beforePath.size <= 0n || beforePath.size > NATIVE_BIGINT(maxBytes)) {
    fail("FILE_SIZE_INVALID", `独立体系组件文件为空或超过输入上限：${relativePath}`);
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
  } catch (cause) {
    fail("COMPONENT_FILE_MISSING", `独立体系组件 held handle 打开失败：${relativePath}`, cause);
  }
  const handleClose = handle.close;
  if (typeof handleClose !== "function") {
    fail("ENDPOINT_CHANGED", `独立体系组件 held handle close 不可用：${relativePath}`);
  }
  try {
    const before = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    if (!REFLECT_APPLY(STATS_IS_FILE, before, [])
      || before.nlink !== 1n || !sameEndpoint(beforePath, before)) {
      fail("ENDPOINT_CHANGED", `独立体系组件在 held handle 打开前变化：${relativePath}`);
    }
    await callTestHook(testHooks, "afterOpenBeforeRead", OBJECT_FREEZE({
      absolutePath,
      handle,
      relativePath
    }));
    const readBytes = await readBoundedHandle(handle, maxBytes);
    await callTestHook(testHooks, "afterBytesRead", OBJECT_FREEZE({
      absolutePath,
      handle,
      relativePath,
      readBytes
    }));
    const after = await REFLECT_APPLY(FILE_HANDLE_STAT, handle, [{ bigint: true }]);
    let afterPath;
    let afterResolved;
    try {
      afterPath = await lstat(absolutePath, { bigint: true });
      afterResolved = await realpath(absolutePath);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", `独立体系组件读取期间路径端点变化：${relativePath}`, cause);
    }
    if (REFLECT_APPLY(STATS_IS_SYMBOLIC_LINK, afterPath, [])
      || !REFLECT_APPLY(STATS_IS_FILE, afterPath, []) || afterPath.nlink !== 1n
      || !sameEndpoint(before, after) || !sameEndpoint(after, afterPath)
      || NATIVE_BIGINT(REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, readBytes, [])) !== after.size
      || normalizePathIdentity(afterResolved) !== normalizePathIdentity(absolutePath)) {
      fail("ENDPOINT_CHANGED", `独立体系组件读取期间端点变化：${relativePath}`);
    }
    await revalidateDirectoryChain(directoryChain);
    const bytes = captureUint8Array(readBytes, relativePath, maxBytes);
    return OBJECT_FREEZE({
      path: relativePath,
      rawBytes: REFLECT_APPLY(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []),
      rawSha256: (() => {
        const hash = createHash("sha256");
        REFLECT_APPLY(HASH_UPDATE, hash, [bytes]);
        return REFLECT_APPLY(HASH_DIGEST, hash, ["hex"]);
      })(),
      bytes
    });
  } finally {
    try {
      await REFLECT_APPLY(handleClose, handle, []);
    } catch {
      // The primary verification failure remains authoritative.
    }
  }
}

async function fileEvidence(workspaceRoot, relativePath) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    relativePath,
    MAX_COMPONENT_FILE_BYTES
  );
  return deepFreezeJson({
    path: relativePath,
    sha256: snapshot.rawSha256
  });
}

function assertDefinition(definitionInput) {
  if (!definitionInput || typeof definitionInput !== "object"
    || UTIL_IS_PROXY(definitionInput)
    || !REFLECT_APPLY(WEAK_SET_HAS, APPROVED_DEFINITIONS, [definitionInput])) {
    fail("DEFINITION_INVALID", "独立体系 manifest 只接受固定批准的体系定义。");
  }
  const componentIds = [];
  for (let index = 0; index < definitionInput.components.length; index += 1) {
    REFLECT_APPLY(ARRAY_PUSH, componentIds, [definitionInput.components[index].componentId]);
  }
  if (componentIds.length !== COMPONENT_ORDER.length) {
    fail("DEFINITION_INVALID", `${definitionInput.productSystemId} 组件顺序不完整。`);
  }
  for (let index = 0; index < COMPONENT_ORDER.length; index += 1) {
    if (componentIds[index] !== COMPONENT_ORDER[index]) {
      fail("DEFINITION_INVALID", `${definitionInput.productSystemId} 组件顺序不完整。`);
    }
  }
}

function captureBuildOptions(optionsInput) {
  const options = capturePassiveJsonSnapshot(optionsInput);
  if (!options || typeof options !== "object" || ARRAY_IS_ARRAY(options)) {
    fail("BUILD_OPTIONS_INVALID", "独立体系 manifest build options 必须是普通对象。");
  }
  const keys = OBJECT_KEYS(options);
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex];
    if (key !== "createdAt") {
      fail("BUILD_OPTIONS_INVALID", "独立体系 manifest build options 字段不精确。");
    }
  }
  if (keys.length > 1) {
    fail("BUILD_OPTIONS_INVALID", "独立体系 manifest build options 字段不精确。");
  }
  if (OBJECT_HAS_OWN(options, "createdAt") && !isCanonicalUtc(options.createdAt)) {
    fail("BUILD_OPTIONS_INVALID", "独立体系 manifest createdAt 必须是规范 UTC。");
  }
  return options;
}

export async function buildCurrentIndependentDomainManifest(
  workspaceRoot,
  definitionInput,
  optionsInput = {}
) {
  assertDefinition(definitionInput);
  const options = captureBuildOptions(optionsInput);
  let lineage;
  if (definitionInput.predecessor !== undefined) {
    const predecessor = definitionInput.predecessor;
    const predecessorSnapshot = await readStableWorkspaceFile(
      workspaceRoot,
      predecessor.path,
      MAX_MANIFEST_BYTES
    );
    const predecessorManifest = parseIndependentDomainManifestJsonBytes(
      predecessorSnapshot.bytes,
      `${definitionInput.productSystemId} predecessor manifest`,
      MAX_MANIFEST_BYTES
    );
    if (predecessorSnapshot.rawBytes !== predecessor.rawBytes
      || predecessorSnapshot.rawSha256 !== predecessor.rawSha256
      || predecessorManifest.manifestDigest !== predecessor.manifestDigest
      || computeIndependentDomainManifestDigest(predecessorManifest) !== predecessor.manifestDigest) {
      fail(
        "PREDECESSOR_DRIFT",
        `${definitionInput.productSystemId} predecessor manifest 原始或语义身份漂移。`
      );
    }
    lineage = {
      predecessor: {
        path: predecessor.path,
        rawBytes: predecessor.rawBytes,
        rawSha256: predecessor.rawSha256,
        manifestDigest: predecessor.manifestDigest
      },
      predecessorPreservedUnmodified: true,
      predecessorCurrent: false,
      centralSystemAdmissionRegistryIntegrated: false,
      crossSystemEngineeringReceiptRegistryIntegrated: false,
      mainApplicationIntegrated: false,
      ownerAcceptanceForFormalAdmissionEstablished: false
    };
  }
  const components = [];
  for (let componentIndex = 0;
    componentIndex < definitionInput.components.length;
    componentIndex += 1) {
    const spec = definitionInput.components[componentIndex];
    const filePaths = [];
    for (let fileIndex = 0; fileIndex < spec.files.length; fileIndex += 1) {
      REFLECT_APPLY(ARRAY_PUSH, filePaths, [spec.files[fileIndex]]);
    }
    REFLECT_APPLY(ARRAY_SORT, filePaths, [
      (left, right) => REFLECT_APPLY(STRING_LOCALE_COMPARE, left, [right, "en"])
    ]);
    const files = [];
    for (let fileIndex = 0; fileIndex < filePaths.length; fileIndex += 1) {
      REFLECT_APPLY(ARRAY_PUSH, files, [
        await fileEvidence(workspaceRoot, filePaths[fileIndex])
      ]);
    }
    const unsignedComponent = {
      componentId: spec.componentId,
      version: spec.version,
      status: spec.status,
      files
    };
    REFLECT_APPLY(ARRAY_PUSH, components, [{
      ...unsignedComponent,
      digest: computeIndependentDomainComponentDigest(unsignedComponent)
    }]);
  }

  const unsigned = {
    schemaVersion: definitionInput.manifestSchemaVersion ?? "1.0.0",
    recordType: definitionInput.manifestRecordType ?? "system_domain_release_manifest",
    ...(definitionInput.manifestId === undefined
      ? {}
      : { manifestId: definitionInput.manifestId }),
    systemId: definitionInput.systemId,
    surface: {
      surfaceId: definitionInput.surfaceId,
      surfaceVersion: definitionInput.surfaceVersion,
      versionMeaning: "product_surface_contract_not_database_schema_or_domain_authority"
    },
    releaseGovernance: {
      releaseIdentity: definitionInput.releaseIdentity,
      targetSchema: null,
      migrationId: null,
      mutationEpochBoundary: "preserved",
      ...(definitionInput.manifestSchemaVersion === "2.0.0"
        ? {
            mutationEpochAvailable: false,
            mutationEpochReceipt: null
          }
        : {}),
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    ...(definitionInput.projectDefaultReleaseGovernance === undefined
      ? {}
      : { projectDefaultReleaseGovernance: definitionInput.projectDefaultReleaseGovernance }),
    components,
    gateState: {
      bindingRequired: definitionInput.bindingRequired,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      releaseEvidenceComplete: false,
      ...(definitionInput.gateStateExtensions ?? {})
    },
    evidenceLedger: {
      engineeringIdentity: "component_digests_verified",
      browserRuntimeEvidence: "not_assessed_in_domain_manifest",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    ...(lineage === undefined ? {} : { lineage }),
    ...(definitionInput.manifestSchemaVersion === "2.0.0"
      ? {
          snapshotBoundary: {
            heldHandleEndpointSnapshots: true,
            crossFileAtomicSnapshot: false,
            mutationEpochAvailable: false,
            mutationEpochReceipt: null,
            intervalMutationExcludedAcrossFiles: false,
            abaExcluded: false
          },
          authorityBoundary: {
            formalAdmissionAuthorized: false,
            domainAuthorityAuthorized: false,
            contentTruthEstablished: false,
            expertTruthEstablished: false,
            rightsLegalConclusionEstablished: false,
            releaseReady: false,
            publicDeploymentAuthorized: false,
            publicReleaseAuthorized: false,
            expertClaimsAuthorized: false
          },
          doesNotEstablish: [
            "publisher_or_network_authenticity",
            "source_binding_freeze_or_complete_source_bundle",
            "work_edition_carrier_rights_or_redistribution_authorization",
            "content_truth_or_domain_authority",
            "real_expert_identity_qualification_independence_or_opinion",
            "complete_high_risk_semantic_or_sink_closure",
            "browser_pwa_service_worker_or_public_host_release_evidence",
            "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
            "formal_admission_release_readiness_or_public_release_authorization",
            "bazi_authority_or_legacy_v13_schema_inheritance"
          ]
        }
      : {}),
    releaseStatus: "draft",
    createdAt: options.createdAt
      ?? REFLECT_APPLY(DATE_TO_ISO_STRING, new NATIVE_DATE(), [])
  };
  return deepFreezeJson({
    ...unsigned,
    manifestDigest: computeIndependentDomainManifestDigest(unsigned)
  });
}

function requireManifestSnapshot(value) {
  const snapshot = capturePassiveJsonSnapshot(value);
  if (!snapshot || typeof snapshot !== "object" || ARRAY_IS_ARRAY(snapshot)) {
    fail("MANIFEST_INVALID", "独立体系 manifest 必须是 JSON 对象。");
  }
  return snapshot;
}

export async function readIndependentDomainManifest(workspaceRoot, definitionInput) {
  assertDefinition(definitionInput);
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    definitionInput.manifestPath,
    MAX_MANIFEST_BYTES
  );
  const parsed = parseIndependentDomainManifestJsonBytes(
    snapshot.bytes,
    `${definitionInput.productSystemId} manifest`,
    MAX_MANIFEST_BYTES
  );
  if (definitionInput.persistedRawIdentity !== undefined) {
    const expected = definitionInput.persistedRawIdentity;
    if (!NUMBER_IS_SAFE_INTEGER(expected.rawBytes)
      || expected.rawBytes <= 0
      || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [expected.rawSha256 ?? ""])
      || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [expected.manifestDigest ?? ""])) {
      fail("PERSISTED_RAW_IDENTITY_NOT_FROZEN", `${definitionInput.productSystemId} manifest 原始身份尚未冻结。`);
    }
    if (snapshot.rawBytes !== expected.rawBytes
      || snapshot.rawSha256 !== expected.rawSha256
      || parsed.manifestDigest !== expected.manifestDigest) {
      fail("PERSISTED_RAW_DRIFT", `${definitionInput.productSystemId} manifest 原始身份漂移。`);
    }
  }
  return deepFreezeJson(requireManifestSnapshot(parsed));
}

function unbrandedVerifiedResult(definitionInput, manifest) {
  return deepFreezeJson({
    productSystemId: definitionInput.productSystemId,
    artifact: definitionInput.persistedRawIdentity === undefined
      ? {
          path: definitionInput.manifestPath,
          rawBytes: null,
          rawSha256: null
        }
      : {
          path: definitionInput.manifestPath,
          rawBytes: definitionInput.persistedRawIdentity.rawBytes,
          rawSha256: definitionInput.persistedRawIdentity.rawSha256
        },
    manifest,
    manifestDigest: manifest.manifestDigest,
    authorityBoundary: {
      formalAdmissionAuthorized: false,
      domainAuthorityAuthorized: false,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false,
      releaseReady: false,
      publicReleaseAuthorized: false
    },
    observationBoundary: {
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      crossFileAtomicSnapshot: false,
      intervalMutationExcluded: false,
      abaExcluded: false
    }
  });
}

export async function verifyIndependentDomainManifest(
  workspaceRoot,
  definitionInput,
  manifestInput
) {
  assertDefinition(definitionInput);
  const manifest = requireManifestSnapshot(manifestInput);
  if (!isCanonicalUtc(manifest.createdAt)
    || !REFLECT_APPLY(REGEXP_TEST, LOWERCASE_SHA256, [manifest.manifestDigest ?? ""])) {
    fail("MANIFEST_INVALID", `${definitionInput.productSystemId} manifest 时间或摘要字段无效。`);
  }
  const expected = await buildCurrentIndependentDomainManifest(workspaceRoot, definitionInput, {
    createdAt: manifest.createdAt
  });
  if (canonicalStringifyIndependentDomainManifest(manifest)
    !== canonicalStringifyIndependentDomainManifest(expected)) {
    fail(
      "MANIFEST_MISMATCH",
      `${definitionInput.productSystemId} manifest 与当前隔离工程闭包或失败关闭账不一致。`
    );
  }
  return unbrandedVerifiedResult(definitionInput, deepFreezeJson(manifest));
}

export async function loadIndependentDomainManifest(workspaceRoot, definitionInput) {
  assertDefinition(definitionInput);
  const persisted = await readIndependentDomainManifest(workspaceRoot, definitionInput);
  const verified = await verifyIndependentDomainManifest(
    workspaceRoot,
    definitionInput,
    persisted
  );
  const result = deepFreezeJson({
    ...verified,
    offlineIndependentDraftClosureMechanicallyVerified: true
  });
  assertRecursivelyFrozenJson(result);
  REFLECT_APPLY(WEAK_SET_ADD, FULL_LOAD_RESULTS, [result]);
  return result;
}

export function isVerifiedIndependentDomainManifestFullLoad(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, FULL_LOAD_RESULTS, [value]) === true;
}

export async function verifyAllIndependentDomainManifests(workspaceRoot) {
  const results = [];
  for (let index = 0; index < INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.length; index += 1) {
    const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[index];
    REFLECT_APPLY(ARRAY_PUSH, results, [
      await loadIndependentDomainManifest(workspaceRoot, definitionInput)
    ]);
  }
  return deepFreezeJson(results);
}

export const independentDomainManifestTestOnly = OBJECT_FREEZE({
  MAX_MANIFEST_BYTES,
  MAX_COMPONENT_FILE_BYTES,
  capturePassiveJsonSnapshot,
  readBoundedHandle,
  readStableWorkspaceFile
});
