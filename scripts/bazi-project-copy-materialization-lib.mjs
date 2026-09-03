import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  SOURCE_CARRIER_SCHEMA_VERSION,
  sourceCarrierRecordSchema
} from "@hakimi/contracts";
import {
  verifyBaziSourceBindingCandidateLedger
} from "./bazi-source-binding-candidate-lib.mjs";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";
import { verifyBaziBindingFreezeRequirements } from "./bazi-binding-freeze-requirements-lib.mjs";

export const BAZI_PROJECT_COPY_MATERIALIZATION_REQUIREMENTS_RELATIVE_PATH =
  "content/system-admission/bazi-project-copy-materialization-requirements.v1.json";
export const BAZI_PROJECT_COPY_MATERIALIZATION_CANDIDATE_SCHEMA_VERSION = "1.0.0";
export const BAZI_PROJECT_COPY_MATERIALIZATION_RECEIPT_SCHEMA_VERSION = "1.0.0";
export const BAZI_PROJECT_COPY_NORMALIZATION_PROFILE = Object.freeze({
  implementationPath: "packages/knowledge-core/src/index.ts",
  implementationSha256: "9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0",
  profileId: "hakimi.knowledge.utf8-text-normalization/1.0.0",
  operations: Object.freeze([
    "strict_utf8_decode",
    "single_leading_bom_removal",
    "crlf_and_cr_to_lf",
    "nul_rejection",
    "nonempty_content_requirement"
  ])
});

const LEDGER_CREATED_AT = "2026-08-29T00:00:00.000Z";
const LEDGER_DIGEST_DOMAIN = "hakimi.bazi.project-copy-materialization-requirements.v1";
const CANDIDATE_DIGEST_DOMAIN = "hakimi.bazi.project-copy-materialization-candidate.v1";
const RECEIPT_DIGEST_DOMAIN = "hakimi.bazi.project-copy-materialization-preflight-receipt.v1";
const SOURCE_CARRIER_DIGEST_DOMAIN = "hakimi.knowledge.source-carrier-record.canonical.v1";
const MAX_LEDGER_BYTES = 1_000_000;
export const MAX_BAZI_PROJECT_COPY_BYTES = 2 * 1024 * 1024;
const MAX_PROJECT_COPY_CONTENT_CHARACTERS = 2_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 5_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const ID_PATTERN = /^[a-z0-9][a-z0-9._:/-]{0,159}$/u;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const PROJECT_COPY_PREFIX = "content/knowledge/documents/";
const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset")?.get;

const EXPECTED_BASIS_ARTIFACTS = Object.freeze([
  Object.freeze({
    path: "content/knowledge/manifest.v2.json",
    role: "current_empty_bundled_knowledge_manifest",
    bytes: 48,
    sha256: "92e4d2c92aeb7f1e7898014be429f0fab92885dd52c36aee8eb1523941c55122"
  }),
  Object.freeze({
    path: "packages/contracts/src/index.ts",
    role: "formal_source_carrier_schema_basis",
    bytes: 244_747,
    sha256: "674a3fe1e2b3cd4fc99e481a758966a320ddc3c1113a9471eba190851d15e041"
  }),
  Object.freeze({
    path: "packages/knowledge-core/src/index.ts",
    role: "knowledge_text_normalization_and_materialization_basis",
    bytes: 39_595,
    sha256: "9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0"
  }),
  Object.freeze({
    path: "content/bazi-strength-source-binding-candidates.v1.json",
    role: "phase_c_source_candidate_parent_ledger",
    bytes: 47_753,
    sha256: "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7"
  }),
  Object.freeze({
    path: "content/bazi-strength-source-rights-candidates.v1.json",
    role: "phase_c_rights_candidate_parent_ledger",
    bytes: 20_806,
    sha256: "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179"
  }),
  Object.freeze({
    path: "content/system-admission/bazi-binding-freeze-requirements.v1.json",
    role: "phase_c_binding_freeze_parent_ledger",
    bytes: 26_038,
    sha256: "662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201"
  })
]);

const RELEASE_GOVERNANCE = Object.freeze({
  activeLine: "legacy-v13",
  expertClaimsAuthorized: false,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  targetSchema: 13
});

const AUTHORITY_BOUNDARY = Object.freeze({
  bindingFreezeEffect: "none",
  contentTruthEstablished: false,
  expertClaimsAuthorized: false,
  expertTruthEstablished: false,
  legalConclusion: "not_established",
  publicDeploymentAuthorized: false,
  releaseReady: false,
  rightsEffect: "none"
});

const TRANSFORMATION_BOUNDARY = Object.freeze({
  collationPerformed: false,
  exactSourceToTextAccuracyEstablished: false,
  humanAccuracyReviewed: false,
  ocrPerformed: false,
  transcriptionPerformed: false,
  transformationClass: "utf8_bom_and_line_ending_normalization_only"
});

const DOES_NOT_ESTABLISH = Object.freeze([
  "lawful_material_access",
  "source_carrier_record_authenticity_or_custody",
  "work_edition_or_carrier_rights_legal_conclusion",
  "ocr_transcription_or_collation_accuracy",
  "source_to_text_semantic_equivalence_beyond_fixed_normalization",
  "content_truth",
  "expert_identity_credentials_independence_opinion_or_truth",
  "binding_freeze",
  "cross_file_atomic_snapshot",
  "mutation_epoch",
  "interval_mutation_or_aba_exclusion",
  "release_readiness",
  "public_release_authorization"
]);

export class BaziProjectCopyMaterializationError extends Error {
  constructor(code, message, _options) {
    super(message);
    this.name = "BaziProjectCopyMaterializationError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziProjectCopyMaterializationError(code, message, cause === undefined ? undefined : { cause });
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > 64) fail("INPUT_DEPTH_EXCEEDED", "声明式输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > 200_000) fail("INPUT_NODE_LIMIT_EXCEEDED", "声明式输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("INPUT_VALUE_INVALID", "声明式输入含非有限数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > 2_000_000) fail("INPUT_TEXT_LIMIT_EXCEEDED", "声明式输入超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "声明式输入只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "声明式输入不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "声明式输入不接受循环引用。");
  state.active.add(value);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = Array.isArray(value);
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "声明式输入无法安全捕获对象描述符。", cause);
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "声明式输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "声明式数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > 200_000) {
        fail("INPUT_ARRAY_INVALID", "声明式数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "声明式数组含额外属性。");
      }
      const result = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "声明式输入不接受稀疏数组或访问器元素。");
        }
        result.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return result;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "声明式输入只接受普通对象。");
    const entries = [];
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "声明式输入不接受访问器或不可枚举字段。");
      }
      entries.push([key, capturePassiveJsonValue(descriptor.value, state, depth + 1)]);
    }
    return Object.fromEntries(entries);
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    active: new WeakSet(),
    nodes: 0,
    textCharacters: 0
  }, 0);
}

function deepFreezeJson(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeJson(child);
  return Object.freeze(value);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.keys(value).sort(compareCodeUnits).map((key) => [key, canonicalValue(value[key])])
    );
  }
  fail("NON_CANONICAL_JSON", "只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziProjectCopyMaterialization(value) {
  return JSON.stringify(canonicalValue(value));
}

export function canonicalPrettyStringifyBaziProjectCopyMaterialization(value) {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringifyBaziProjectCopyMaterialization(value), "utf8")
    .digest("hex");
}

export function computeBaziProjectCopyMaterializationRequirementsDigest(ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return domainSeparatedDigest(LEDGER_DIGEST_DOMAIN, unsigned);
}

export function computeBaziProjectCopyMaterializationCandidateDigest(candidateInput) {
  const candidate = capturePassiveJsonSnapshot(candidateInput);
  const { candidateDigest: _candidateDigest, ...unsigned } = candidate;
  return domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned);
}

export function computeBaziProjectCopyMaterializationReceiptDigest(receiptInput) {
  const receipt = capturePassiveJsonSnapshot(receiptInput);
  const { receiptDigest: _receiptDigest, ...unsigned } = receipt;
  return domainSeparatedDigest(RECEIPT_DIGEST_DOMAIN, unsigned);
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
      } else if (value !== null && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}

function copyExactNativeBytes(input, { allowEmpty, code, maxBytes }) {
  if (utilTypes.isProxy(input) || typeof input !== "object" || input === null) {
    fail(code, "字节输入必须是精确原生 Buffer 或 Uint8Array。 ");
  }
  let prototype;
  try {
    prototype = Object.getPrototypeOf(input);
  } catch {
    fail(code, "字节输入原型无法安全检查。 ");
  }
  if (prototype !== Buffer.prototype && prototype !== Uint8Array.prototype) {
    fail(code, "字节输入必须是精确原生 Buffer 或 Uint8Array。 ");
  }
  if (typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function") {
    fail(code, "运行时无法安全捕获 TypedArray 内建槽。 ");
  }
  let backingStore;
  let byteLength;
  let byteOffset;
  try {
    backingStore = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, input, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, input, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, input, []);
  } catch {
    fail(code, "字节输入内建槽无法安全捕获。 ");
  }
  if (!Number.isSafeInteger(byteLength) || !Number.isSafeInteger(byteOffset)
    || byteLength < 0 || byteOffset < 0 || (!allowEmpty && byteLength === 0)
    || byteLength > maxBytes) {
    fail(code, "字节输入为空、无效或超过上限。 ");
  }
  try {
    const view = new Uint8Array(backingStore, byteOffset, byteLength);
    const copied = Buffer.allocUnsafe(byteLength);
    copied.set(view);
    return copied;
  } catch {
    fail(code, "字节输入无法安全复制。 ");
  }
}

export function parseBaziProjectCopyMaterializationJsonBytes(
  bytes,
  _label = "C-M1 JSON",
  maxBytes = MAX_LEDGER_BYTES
) {
  const safeLabel = "C-M1 JSON";
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    fail("JSON_TOO_LARGE", `${safeLabel} 超过输入上限。`);
  }
  const safeBytes = copyExactNativeBytes(bytes, {
    allowEmpty: true,
    code: "JSON_TOO_LARGE",
    maxBytes
  });
  if (safeBytes.length >= 3 && safeBytes[0] === 0xef && safeBytes[1] === 0xbb && safeBytes[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${safeLabel} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(safeBytes);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", `${safeLabel} 不是严格 UTF-8。`, cause);
  }
  if (!source.trim()) fail("JSON_INVALID", `${safeLabel} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "bazi-project-copy-materialization.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch (cause) {
    fail("JSON_INVALID", `${safeLabel} 不能按严格 JSON 检查。`, cause);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${safeLabel} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${safeLabel} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("JSON_INVALID", `${safeLabel} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof BaziProjectCopyMaterializationError) throw cause;
    fail("JSON_INVALID", `${safeLabel} 不是有效 JSON。`, cause);
  }
}

function isSafeFailure(error) {
  return error instanceof BaziProjectCopyMaterializationError;
}

function normalizeResolvedPath(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isSameResolvedPath(left, right) {
  return normalizeResolvedPath(left) === normalizeResolvedPath(right);
}

function isSameOrWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (
    relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function validateSafeRelativePath(relativePath, { projectCopy = false } = {}) {
  if (typeof relativePath !== "string" || relativePath.length < 1 || relativePath.length > 300
    || relativePath.includes("\0") || relativePath.includes("\\") || relativePath.includes(":")
    || path.posix.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("UNSAFE_RELATIVE_PATH", projectCopy ? "项目副本相对路径不安全。" : "依据文件相对路径不安全。");
  }
  if (projectCopy) {
    const extension = path.posix.extname(relativePath).toLowerCase();
    if (!relativePath.startsWith(PROJECT_COPY_PREFIX)
      || (extension !== ".md" && extension !== ".markdown" && extension !== ".txt")) {
      fail("UNSAFE_PROJECT_COPY_PATH", "项目副本必须是 content/knowledge/documents 下的 Markdown/TXT 文件。");
    }
  }
  return relativePath;
}

function assertDirectoryStat(metadata, code, label) {
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    fail(code, `${label} 目录链必须全部是普通目录。`);
  }
  for (const field of ["dev", "ino", "nlink", "mtimeNs", "ctimeNs"]) {
    if (typeof metadata[field] !== "bigint") fail(code, `${label} 目录链元数据不可核验。`);
  }
  if (metadata.ino <= 0n || metadata.nlink <= 0n) fail(code, `${label} 目录链身份不可核验。`);
}

function directoryEndpoint(absolutePath, resolvedPath, metadata) {
  return Object.freeze({
    absolutePath,
    ctimeNs: metadata.ctimeNs,
    dev: metadata.dev,
    ino: metadata.ino,
    mtimeNs: metadata.mtimeNs,
    nlink: metadata.nlink,
    resolvedPath
  });
}

async function capturePlainDirectoryChain(rootReal, absolutePath, code, label) {
  try {
    const targetDirectory = path.dirname(path.resolve(absolutePath));
    if (!isSameOrWithin(rootReal, targetDirectory)) fail("PATH_ESCAPE", `${label} 目录链越界。`);
    const relative = path.relative(rootReal, targetDirectory);
    const segments = relative === "" ? [] : relative.split(path.sep);
    const endpoints = [];
    let cursor = rootReal;
    for (const segment of [null, ...segments]) {
      if (segment !== null) cursor = path.join(cursor, segment);
      const metadata = await lstat(cursor, { bigint: true });
      assertDirectoryStat(metadata, code, label);
      const resolvedPath = await realpath(cursor);
      if (endpoints.length === 0) {
        if (!isSameResolvedPath(resolvedPath, rootReal)) fail(code, `${label} 根目录身份已变化。`);
      } else if (!isSameOrWithin(endpoints[0].resolvedPath, resolvedPath)) {
        fail("PATH_ESCAPE", `${label} 目录链 realpath 越界。`);
      }
      endpoints.push(directoryEndpoint(cursor, resolvedPath, metadata));
    }
    return Object.freeze(endpoints);
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail(code, `${label} 目录链无法安全核验。`, error);
  }
}

function sameDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && isSameResolvedPath(entry.absolutePath, other.absolutePath)
      && isSameResolvedPath(entry.resolvedPath, other.resolvedPath)
      && entry.dev === other.dev
      && entry.ino === other.ino
      && entry.nlink === other.nlink
      && entry.mtimeNs === other.mtimeNs
      && entry.ctimeNs === other.ctimeNs;
  });
}

function sameFileIdentity(left, right) {
  return left.isFile()
    && right.isFile()
    && typeof left.dev === "bigint"
    && typeof left.ino === "bigint"
    && left.ino > 0n
    && left.dev === right.dev
    && left.ino === right.ino;
}

function sameStableFileMetadata(left, right) {
  return sameFileIdentity(left, right)
    && left.size === right.size
    && left.nlink === right.nlink
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function assertRegularIndependentFile(metadata, maxBytes, code, label) {
  if (metadata.isSymbolicLink() || !metadata.isFile()) fail(code, `${label} 必须是普通文件。`);
  if (metadata.nlink !== 1n) fail("HARD_LINK_FORBIDDEN", `${label} 不能是 hard-link alias。`);
  if (metadata.size <= 0n || metadata.size > BigInt(maxBytes)) fail("FILE_SIZE_INVALID", `${label} 为空或超过上限。`);
}

async function readBoundedHandle(handle, maxBytes, label) {
  const buffer = Buffer.allocUnsafe(maxBytes + 1);
  let total = 0;
  while (total < buffer.length) {
    const { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
    if (bytesRead === 0) break;
    total += bytesRead;
  }
  if (total <= 0 || total > maxBytes) fail("FILE_SIZE_INVALID", `${label} 为空或超过上限。`);
  return Buffer.from(buffer.subarray(0, total));
}

async function callTestHook(testHooks, phase) {
  const hook = testHooks?.[phase];
  if (hook === undefined) return;
  if (typeof hook !== "function") fail("TEST_HOOK_INVALID", "测试 hook 无效。");
  await hook();
}

async function resolveOrdinaryRoot(root, label) {
  if (typeof root !== "string" || !path.isAbsolute(root)) fail("ROOT_INVALID", `${label} 必须是显式绝对路径。`);
  try {
    const unresolved = path.resolve(root);
    const metadata = await lstat(unresolved, { bigint: true });
    assertDirectoryStat(metadata, "ROOT_INVALID", label);
    const resolved = await realpath(unresolved);
    if (!isSameResolvedPath(unresolved, resolved)) fail("ROOT_INVALID", `${label} 不能是 symlink 或 junction alias。`);
    return resolved;
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail("ROOT_INVALID", `${label} 无法安全解析。`, error);
  }
}

async function readStableFile(
  root,
  relativePath,
  maxBytes,
  { label, projectCopy = false, testHooks = undefined } = {}
) {
  validateSafeRelativePath(relativePath, { projectCopy });
  const rootReal = await resolveOrdinaryRoot(root, projectCopy ? "项目工作区" : "依据工作区");
  const unresolved = path.resolve(rootReal, ...relativePath.split("/"));
  if (!isSameOrWithin(rootReal, unresolved)) fail("PATH_ESCAPE", `${label} 路径越界。`);
  let handle = null;
  try {
    const chainBeforeOpen = await capturePlainDirectoryChain(rootReal, unresolved, "DIRECTORY_CHAIN_INVALID", label);
    await callTestHook(testHooks, "afterDirectoryChainBeforeOpen");
    const linkBefore = await lstat(unresolved, { bigint: true });
    assertRegularIndependentFile(linkBefore, maxBytes, "FILE_ENDPOINT_INVALID", label);
    const resolvedBefore = await realpath(unresolved);
    if (!isSameOrWithin(rootReal, resolvedBefore)) fail("PATH_ESCAPE", `${label} realpath 越界。`);
    const pathBefore = await lstat(resolvedBefore, { bigint: true });
    assertRegularIndependentFile(pathBefore, maxBytes, "FILE_ENDPOINT_INVALID", label);
    if (!sameFileIdentity(linkBefore, pathBefore)) fail("FILE_CHANGED_DURING_OPEN", `${label} 打开期间身份换绑。`);

    const noFollowFlag = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
    handle = await open(unresolved, fsConstants.O_RDONLY | noFollowFlag);
    const handleBefore = await handle.stat({ bigint: true });
    assertRegularIndependentFile(handleBefore, maxBytes, "FILE_ENDPOINT_INVALID", label);
    if (!sameFileIdentity(pathBefore, handleBefore)) fail("FILE_CHANGED_DURING_OPEN", `${label} 打开期间身份换绑。`);

    const chainAfterOpen = await capturePlainDirectoryChain(rootReal, unresolved, "DIRECTORY_CHAIN_CHANGED", label);
    const linkAfterOpen = await lstat(unresolved, { bigint: true });
    const resolvedAfterOpen = await realpath(unresolved);
    const pathAfterOpen = await lstat(resolvedAfterOpen, { bigint: true });
    assertRegularIndependentFile(linkAfterOpen, maxBytes, "FILE_ENDPOINT_INVALID", label);
    assertRegularIndependentFile(pathAfterOpen, maxBytes, "FILE_ENDPOINT_INVALID", label);
    if (!sameDirectoryChain(chainBeforeOpen, chainAfterOpen)
      || !isSameResolvedPath(resolvedBefore, resolvedAfterOpen)
      || !sameFileIdentity(handleBefore, linkAfterOpen)
      || !sameFileIdentity(handleBefore, pathAfterOpen)) {
      fail("FILE_CHANGED_DURING_OPEN", `${label} 打开期间端点或目录链变化。`);
    }

    const bytes = await readBoundedHandle(handle, maxBytes, label);
    await callTestHook(testHooks, "afterHeldHandleRead");
    const handleAfter = await handle.stat({ bigint: true });
    const chainAfterRead = await capturePlainDirectoryChain(rootReal, unresolved, "DIRECTORY_CHAIN_CHANGED", label);
    const linkAfterRead = await lstat(unresolved, { bigint: true });
    const resolvedAfterRead = await realpath(unresolved);
    const pathAfterRead = await lstat(resolvedAfterRead, { bigint: true });
    assertRegularIndependentFile(linkAfterRead, maxBytes, "FILE_ENDPOINT_INVALID", label);
    assertRegularIndependentFile(pathAfterRead, maxBytes, "FILE_ENDPOINT_INVALID", label);
    if (!sameStableFileMetadata(handleBefore, handleAfter)
      || BigInt(bytes.byteLength) !== handleAfter.size
      || !sameDirectoryChain(chainBeforeOpen, chainAfterRead)
      || !isSameResolvedPath(resolvedBefore, resolvedAfterRead)
      || !sameFileIdentity(handleAfter, linkAfterRead)
      || !sameFileIdentity(handleAfter, pathAfterRead)) {
      fail("FILE_CHANGED_DURING_READ", `${label} held-handle 读取期间端点或目录链变化。`);
    }
    await handle.close();
    handle = null;
    return Object.freeze({
      bytes,
      rawBytes: bytes.byteLength,
      rawSha256: createHash("sha256").update(bytes).digest("hex")
    });
  } catch (error) {
    if (handle !== null) {
      try {
        await handle.close();
      } catch {
        // The original failure remains authoritative and path-redacted.
      }
    }
    if (isSafeFailure(error)) throw error;
    fail("FILE_READ_FAILED", `${label} 无法安全读取。`, error);
  }
}

function requireExactKeys(value, expectedKeys, label, code = "SCHEMA_INVALID") {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, `${label} 必须是对象。`);
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${label} 字段集合不匹配。`);
}

function requireCanonicalUtc(value, label) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) fail("UTC_INVALID", `${label} 必须是 canonical UTC。`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) fail("UTC_INVALID", `${label} 必须是 canonical UTC。`);
}

function parseFormalSourceCarrierRecord(input) {
  const snapshot = capturePassiveJsonSnapshot(input);
  const parsed = sourceCarrierRecordSchema.safeParse(snapshot);
  if (!parsed.success) fail("SOURCE_CARRIER_RECORD_INVALID", "SourceCarrierRecord 未通过当前正式 schema。 ");
  return deepFreezeJson(parsed.data);
}

export function computeCanonicalSourceCarrierRecordDigest(sourceCarrierRecordInput) {
  const record = parseFormalSourceCarrierRecord(sourceCarrierRecordInput);
  return domainSeparatedDigest(SOURCE_CARRIER_DIGEST_DOMAIN, record);
}

function inferredFormat(relativePath) {
  return path.posix.extname(relativePath).toLowerCase() === ".txt" ? "text" : "markdown";
}

function strictUtf8Text(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("PROJECT_COPY_UTF8_INVALID", "项目副本不是严格 UTF-8。", cause);
  }
}

function buildFixedKnowledgeContentSnapshot(rawContent) {
  const content = rawContent.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n");
  if (content.includes("\0")) fail("PROJECT_COPY_NORMALIZATION_FAILED", "项目副本包含 NUL。 ");
  if (!content.trim()) fail("PROJECT_COPY_NORMALIZATION_FAILED", "项目副本规范化后为空。 ");
  if (content.length > MAX_PROJECT_COPY_CONTENT_CHARACTERS) {
    fail("PROJECT_COPY_NORMALIZATION_FAILED", "项目副本规范化后超过字符上限。 ");
  }
  return Object.freeze({
    content,
    contentHash: createHash("sha256").update(content, "utf8").digest("hex")
  });
}

function assertByteInput(bytes) {
  return copyExactNativeBytes(bytes, {
    allowEmpty: false,
    code: "FILE_SIZE_INVALID",
    maxBytes: MAX_BAZI_PROJECT_COPY_BYTES
  });
}

function exactAuthorityBoundary(value, label) {
  requireExactKeys(value, Object.keys(AUTHORITY_BOUNDARY), label);
  if (canonicalStringifyBaziProjectCopyMaterialization(value)
    !== canonicalStringifyBaziProjectCopyMaterialization(AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTION_FORBIDDEN", `${label} 不得产生权利、法律、内容、专家、冻结或发布晋级。`);
  }
}

function exactTransformationBoundary(value, label) {
  requireExactKeys(value, Object.keys(TRANSFORMATION_BOUNDARY), label);
  if (canonicalStringifyBaziProjectCopyMaterialization(value)
    !== canonicalStringifyBaziProjectCopyMaterialization(TRANSFORMATION_BOUNDARY)) {
    fail("TRANSFORMATION_PROMOTION_FORBIDDEN", `${label} 不得声称 OCR、转录、校勘或准确性审定。`);
  }
}

function exactReleaseGovernance(value, label) {
  requireExactKeys(value, Object.keys(RELEASE_GOVERNANCE), label);
  if (canonicalStringifyBaziProjectCopyMaterialization(value)
    !== canonicalStringifyBaziProjectCopyMaterialization(RELEASE_GOVERNANCE)) {
    fail("RELEASE_GOVERNANCE_DRIFT", `${label} 必须保持 legacy-v13 / Schema 13 / migration null。`);
  }
}

function exactNormalizationProfile(value, label) {
  requireExactKeys(value, Object.keys(BAZI_PROJECT_COPY_NORMALIZATION_PROFILE), label);
  if (canonicalStringifyBaziProjectCopyMaterialization(value)
    !== canonicalStringifyBaziProjectCopyMaterialization(BAZI_PROJECT_COPY_NORMALIZATION_PROFILE)) {
    fail("NORMALIZATION_PROFILE_DRIFT", `${label} 与固定 UTF-8 normalization profile 不一致。`);
  }
}

function validateCandidate(candidateInput) {
  const candidate = capturePassiveJsonSnapshot(candidateInput);
  requireExactKeys(candidate, [
    "authorityBoundary", "candidateDigest", "documentId", "materializationId", "normalizationProfile",
    "projectCopy", "recordType", "releaseGovernance", "schemaVersion", "sourceCarrierRef",
    "transformationBoundary", "verificationScope"
  ], "项目副本物化 candidate");
  if (candidate.schemaVersion !== BAZI_PROJECT_COPY_MATERIALIZATION_CANDIDATE_SCHEMA_VERSION
    || candidate.recordType !== "bazi_project_copy_materialization_candidate_v1"
    || candidate.verificationScope !== "candidate_only_no_persisted_materialization_record"
    || typeof candidate.materializationId !== "string" || !ID_PATTERN.test(candidate.materializationId)
    || typeof candidate.documentId !== "string" || candidate.documentId.length < 1) {
    fail("CANDIDATE_IDENTITY_INVALID", "项目副本物化 candidate 身份无效。");
  }
  requireExactKeys(candidate.sourceCarrierRef, [
    "canonicalRecordSha256", "carrierId", "contentDigest", "editVersion"
  ], "candidate.sourceCarrierRef");
  if (typeof candidate.sourceCarrierRef.carrierId !== "string"
    || !Number.isSafeInteger(candidate.sourceCarrierRef.editVersion) || candidate.sourceCarrierRef.editVersion <= 0
    || !SHA256_PATTERN.test(candidate.sourceCarrierRef.canonicalRecordSha256)
    || !SHA256_PATTERN.test(candidate.sourceCarrierRef.contentDigest)) {
    fail("SOURCE_CARRIER_REF_INVALID", "candidate SourceCarrierRecord 引用无效。");
  }
  requireExactKeys(candidate.projectCopy, [
    "format", "normalizedContentSha256", "rawBytes", "rawSha256", "relativePath"
  ], "candidate.projectCopy");
  validateSafeRelativePath(candidate.projectCopy.relativePath, { projectCopy: true });
  if ((candidate.projectCopy.format !== "markdown" && candidate.projectCopy.format !== "text")
    || candidate.projectCopy.format !== inferredFormat(candidate.projectCopy.relativePath)
    || !Number.isSafeInteger(candidate.projectCopy.rawBytes) || candidate.projectCopy.rawBytes <= 0
    || candidate.projectCopy.rawBytes > MAX_BAZI_PROJECT_COPY_BYTES
    || !SHA256_PATTERN.test(candidate.projectCopy.rawSha256)
    || !SHA256_PATTERN.test(candidate.projectCopy.normalizedContentSha256)) {
    fail("PROJECT_COPY_IDENTITY_INVALID", "candidate 项目副本身份无效。");
  }
  exactNormalizationProfile(candidate.normalizationProfile, "candidate.normalizationProfile");
  exactTransformationBoundary(candidate.transformationBoundary, "candidate.transformationBoundary");
  exactAuthorityBoundary(candidate.authorityBoundary, "candidate.authorityBoundary");
  exactReleaseGovernance(candidate.releaseGovernance, "candidate.releaseGovernance");
  if (!SHA256_PATTERN.test(candidate.candidateDigest)
    || candidate.candidateDigest !== computeBaziProjectCopyMaterializationCandidateDigest(candidate)) {
    fail("CANDIDATE_DIGEST_MISMATCH", "项目副本物化 candidate digest 无效。");
  }
  return deepFreezeJson(candidate);
}

export async function buildSyntheticBaziProjectCopyMaterializationCandidate({
  materializationId,
  projectCopyBytes,
  projectCopyRelativePath,
  sourceCarrierRecord
}) {
  validateSafeRelativePath(projectCopyRelativePath, { projectCopy: true });
  if (typeof materializationId !== "string" || !ID_PATTERN.test(materializationId)) {
    fail("CANDIDATE_IDENTITY_INVALID", "materializationId 无效。");
  }
  const carrier = parseFormalSourceCarrierRecord(sourceCarrierRecord);
  if (carrier.storagePolicy !== "public_repo" || carrier.contentDigest === null
    || carrier.documentContentHash !== carrier.contentDigest) {
    fail("SOURCE_CARRIER_NOT_PROJECT_COPY_ELIGIBLE", "SourceCarrierRecord 不能作为公开项目副本的结构候选依据。");
  }
  const bytes = assertByteInput(projectCopyBytes);
  const format = inferredFormat(projectCopyRelativePath);
  const snapshot = buildFixedKnowledgeContentSnapshot(strictUtf8Text(bytes));
  if (snapshot.contentHash !== carrier.contentDigest) {
    fail("SOURCE_CARRIER_CONTENT_MISMATCH", "项目副本规范化正文与 SourceCarrierRecord contentDigest 不一致。");
  }
  const unsigned = {
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    documentId: carrier.documentId,
    materializationId,
    normalizationProfile: {
      ...BAZI_PROJECT_COPY_NORMALIZATION_PROFILE,
      operations: [...BAZI_PROJECT_COPY_NORMALIZATION_PROFILE.operations]
    },
    projectCopy: {
      format,
      normalizedContentSha256: snapshot.contentHash,
      rawBytes: bytes.byteLength,
      rawSha256: createHash("sha256").update(bytes).digest("hex"),
      relativePath: projectCopyRelativePath
    },
    recordType: "bazi_project_copy_materialization_candidate_v1",
    releaseGovernance: { ...RELEASE_GOVERNANCE },
    schemaVersion: BAZI_PROJECT_COPY_MATERIALIZATION_CANDIDATE_SCHEMA_VERSION,
    sourceCarrierRef: {
      canonicalRecordSha256: computeCanonicalSourceCarrierRecordDigest(carrier),
      carrierId: carrier.carrierId,
      contentDigest: carrier.contentDigest,
      editVersion: carrier.editVersion
    },
    transformationBoundary: { ...TRANSFORMATION_BOUNDARY },
    verificationScope: "candidate_only_no_persisted_materialization_record"
  };
  return deepFreezeJson({
    ...unsigned,
    candidateDigest: domainSeparatedDigest(CANDIDATE_DIGEST_DOMAIN, unsigned)
  });
}

function validateCandidateAgainstCarrier(candidate, carrier) {
  const expectedCarrierDigest = computeCanonicalSourceCarrierRecordDigest(carrier);
  if (carrier.storagePolicy !== "public_repo" || carrier.contentDigest === null
    || carrier.documentContentHash !== carrier.contentDigest
    || candidate.sourceCarrierRef.carrierId !== carrier.carrierId
    || candidate.sourceCarrierRef.editVersion !== carrier.editVersion
    || candidate.sourceCarrierRef.canonicalRecordSha256 !== expectedCarrierDigest
    || candidate.sourceCarrierRef.contentDigest !== carrier.contentDigest
    || candidate.documentId !== carrier.documentId
    || candidate.projectCopy.normalizedContentSha256 !== carrier.documentContentHash) {
    fail("CARRIER_PROJECT_COPY_BINDING_MISMATCH", "candidate、SourceCarrierRecord 与 document 身份未形成精确链。 ");
  }
}

function buildPreflightReceipt(candidate, verifiedAt) {
  const unsigned = {
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    candidateDigest: candidate.candidateDigest,
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    documentId: candidate.documentId,
    gateSummary: {
      candidateMaterializationPreflightVerified: true,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      formalMaterializationVerified: false,
      formalSourceCarrierRecordCreated: false,
      legalConclusionEstablished: false,
      materializationsVerifiedEffect: 0,
      persistedMaterializationRecordCreated: false,
      publicDeploymentAuthorized: false,
      releaseReady: false,
      rightsEstablished: false
    },
    materializationId: candidate.materializationId,
    normalizationProfile: {
      ...BAZI_PROJECT_COPY_NORMALIZATION_PROFILE,
      operations: [...BAZI_PROJECT_COPY_NORMALIZATION_PROFILE.operations]
    },
    observationBoundary: {
      abaExcluded: false,
      crossFileAtomicSnapshot: false,
      directoryChainRevalidated: true,
      endpointSnapshotOnly: true,
      heldFileHandleRead: true,
      intervalMutationExcluded: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      rawHashUtf8DecodeAndNormalizationUseSameBuffer: true
    },
    projectCopyIdentity: { ...candidate.projectCopy },
    receiptId: `${candidate.materializationId}/preflight`,
    recordType: "bazi_project_copy_materialization_preflight_receipt_v1",
    redactionBoundary: {
      absolutePathStored: false,
      normalizedContentStored: false,
      projectCopyBytesStored: false,
      sourceCarrierBytesStored: false
    },
    releaseGovernance: { ...RELEASE_GOVERNANCE },
    schemaVersion: BAZI_PROJECT_COPY_MATERIALIZATION_RECEIPT_SCHEMA_VERSION,
    sourceCarrierRef: { ...candidate.sourceCarrierRef },
    transformationBoundary: { ...TRANSFORMATION_BOUNDARY },
    verificationScope: "candidate_project_copy_endpoint_preflight_only",
    verifiedAt
  };
  return deepFreezeJson({
    ...unsigned,
    receiptDigest: domainSeparatedDigest(RECEIPT_DIGEST_DOMAIN, unsigned)
  });
}

export async function verifySyntheticBaziProjectCopyMaterializationFromFile({
  candidate,
  sourceCarrierRecord,
  testHooks,
  verifiedAt,
  workspaceRoot
}) {
  requireCanonicalUtc(verifiedAt, "verifiedAt");
  const safeCandidate = validateCandidate(candidate);
  const carrier = parseFormalSourceCarrierRecord(sourceCarrierRecord);
  validateCandidateAgainstCarrier(safeCandidate, carrier);
  const snapshot = await readStableFile(
    workspaceRoot,
    safeCandidate.projectCopy.relativePath,
    MAX_BAZI_PROJECT_COPY_BYTES,
    { label: "项目副本", projectCopy: true, testHooks }
  );
  if (snapshot.rawSha256 !== safeCandidate.projectCopy.rawSha256
    || snapshot.rawBytes !== safeCandidate.projectCopy.rawBytes) {
    fail("PROJECT_COPY_RAW_IDENTITY_MISMATCH", "项目副本 raw SHA-256 或字节数与 candidate 不一致。");
  }
  const content = strictUtf8Text(snapshot.bytes);
  let normalized;
  try {
    normalized = buildFixedKnowledgeContentSnapshot(content);
  } catch (cause) {
    fail("PROJECT_COPY_NORMALIZATION_FAILED", "项目副本不能按固定 normalization profile 处理。", cause);
  }
  if (normalized.contentHash !== safeCandidate.projectCopy.normalizedContentSha256
    || normalized.contentHash !== carrier.contentDigest
    || normalized.contentHash !== carrier.documentContentHash) {
    fail("PROJECT_COPY_NORMALIZED_IDENTITY_MISMATCH", "项目副本 normalized content SHA-256 未绑定 SourceCarrierRecord 与 document。 ");
  }
  return buildPreflightReceipt(safeCandidate, verifiedAt);
}

function requireExactRawIdentity(snapshot, spec) {
  if (snapshot.rawBytes !== spec.bytes || snapshot.rawSha256 !== spec.sha256) {
    fail("BASIS_ARTIFACT_IDENTITY_MISMATCH", "C-M1 依据文件字节身份已变化。");
  }
}

function requireCurrentParentBoundaries(sourceLedger, rightsLedger, freezeLedger, manifest) {
  try {
    verifyBaziSourceBindingCandidateLedger(sourceLedger);
    verifyBaziSourceRightsCandidateLedger(rightsLedger, sourceLedger);
  } catch (cause) {
    fail("PARENT_LEDGER_INVALID", "C-M1 来源或权利父账未通过当前完整 verifier。", cause);
  }
  if (manifest.schemaVersion !== "2.0.0" || !Array.isArray(manifest.entries) || manifest.entries.length !== 0
    || Object.keys(manifest).sort(compareCodeUnits).join("|") !== "entries|schemaVersion") {
    fail("BUNDLED_MANIFEST_NOT_EMPTY", "C-M1 只允许绑定当前空 manifest.v2，不能冒充公开 materialization 实例。 ");
  }
  const sourceGate = sourceLedger.gateSummary ?? {};
  const rightsGate = rightsLedger.gateSummary ?? {};
  const freezeGate = freezeLedger.gateSummary ?? {};
  if (sourceGate.candidateBindingCount !== 4 || sourceGate.bindingFrozenVerified !== 0
    || rightsGate.formalSourceRightsRecordsCreated !== 0
    || rightsGate.formalSourceCarrierRecordsCreated !== 0
    || rightsGate.redistributableSources !== 0
    || !Array.isArray(rightsLedger.candidates)
    || rightsLedger.candidates.some((candidate) => candidate.decision?.legalConclusion !== "not_established")
    || freezeGate.bindingRequired !== 12 || freezeGate.bindingFrozenVerified !== 0
    || freezeGate.sourceBundleComplete !== false || freezeGate.rightsBundleComplete !== false) {
    fail("PARENT_BOUNDARY_PROMOTED", "C-M1 父账不再保持来源候选、正式载体 0、Binding 0/12 的失败关闭边界。 ");
  }
}

async function readBasisArtifacts(workspaceRoot) {
  return Promise.all(EXPECTED_BASIS_ARTIFACTS.map(async (spec) => {
    const snapshot = await readStableFile(workspaceRoot, spec.path, MAX_BOUND_ARTIFACT_BYTES, {
      label: "C-M1 依据文件"
    });
    requireExactRawIdentity(snapshot, spec);
    return { spec, snapshot };
  }));
}

export async function buildCurrentBaziProjectCopyMaterializationRequirementsLedger(workspaceRoot) {
  const artifacts = await readBasisArtifacts(workspaceRoot);
  const byPath = new Map(artifacts.map((entry) => [entry.spec.path, entry.snapshot]));
  const manifest = parseBaziProjectCopyMaterializationJsonBytes(
    byPath.get("content/knowledge/manifest.v2.json").bytes,
    "空 manifest.v2"
  );
  const sourceLedger = parseBaziProjectCopyMaterializationJsonBytes(
    byPath.get("content/bazi-strength-source-binding-candidates.v1.json").bytes,
    "来源候选父账"
  );
  const rightsLedger = parseBaziProjectCopyMaterializationJsonBytes(
    byPath.get("content/bazi-strength-source-rights-candidates.v1.json").bytes,
    "权利候选父账"
  );
  const freezeLedger = parseBaziProjectCopyMaterializationJsonBytes(
    byPath.get("content/system-admission/bazi-binding-freeze-requirements.v1.json").bytes,
    "Binding freeze 父账"
  );
  requireCurrentParentBoundaries(sourceLedger, rightsLedger, freezeLedger, manifest);
  const contractsBasisText = new TextDecoder("utf-8", { fatal: true }).decode(
    byPath.get("packages/contracts/src/index.ts").bytes
  );
  for (const marker of [
    "export const SOURCE_CARRIER_SCHEMA_VERSION = \"1.0.0\" as const",
    "export const sourceCarrierRecordSchema = z.strictObject({",
    "recordType: z.literal(\"knowledge_source_carrier\")",
    "storagePolicy: z.enum([\"public_repo\", \"private_vault\", \"link_only\", \"do_not_store\"])",
    "公开仓库存储必须绑定实际正文摘要、逐项允许复制、引用和再分发并完成双人复核"
  ]) {
    if (!contractsBasisText.includes(marker)) {
      fail("SOURCE_CARRIER_SCHEMA_DRIFT", "contracts source 缺少 C-M1 固定 SourceCarrierRecord 语义标记。 ");
    }
  }
  if (SOURCE_CARRIER_SCHEMA_VERSION !== "1.0.0") {
    fail("SOURCE_CARRIER_SCHEMA_DRIFT", "C-M1 只绑定当前 SourceCarrierRecord v1 schema。 ");
  }
  try {
    await verifyBaziBindingFreezeRequirements(workspaceRoot, freezeLedger);
  } catch (cause) {
    fail("PARENT_FREEZE_LEDGER_INVALID", "C-M1 Binding freeze 父账未通过当前完整 verifier。", cause);
  }
  const knowledgeBasisText = new TextDecoder("utf-8", { fatal: true }).decode(
    byPath.get("packages/knowledge-core/src/index.ts").bytes
  );
  for (const marker of [
    "export function normalizeKnowledgeContent(rawContent: string): string",
    "rawContent.replace(/^\\uFEFF/, \"\").replace(/\\r\\n?/g, \"\\n\")",
    "content.includes(\"\\0\")",
    "MAX_KNOWLEDGE_CONTENT_CHARACTERS = 2_000_000"
  ]) {
    if (!knowledgeBasisText.includes(marker)) {
      fail("NORMALIZATION_PROFILE_DRIFT", "knowledge-core 缺少 C-M1 固定 normalization 语义标记。 ");
    }
  }
  const normalizationProbe = buildFixedKnowledgeContentSnapshot("\uFEFF甲\r\n乙\r丙");
  if (normalizationProbe.content !== "甲\n乙\n丙") {
    fail("NORMALIZATION_PROFILE_DRIFT", "当前 knowledge-core normalization 行为与 C-M1 固定 profile 不一致。 ");
  }

  const unsigned = {
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    basisArtifacts: EXPECTED_BASIS_ARTIFACTS.map((spec) => ({
      bytes: spec.bytes,
      hashAndInspectionUseSameBuffer: true,
      path: spec.path,
      role: spec.role,
      sha256: spec.sha256
    })),
    contractBoundary: {
      allowedTransformationClass: TRANSFORMATION_BOUNDARY.transformationClass,
      carrierCanonicalRecordDigestRequired: true,
      carrierIdAndEditVersionRequired: true,
      carrierRole: "upstream_source_carrier_not_project_copy",
      collationCanBePromotedByReceipt: false,
      fixedNormalizationProfileRequired: true,
      ocrCanBePromotedByReceipt: false,
      projectCopyRawBytesAndSha256Required: true,
      projectCopyRole: "technical_materialization_provenance_only",
      sourceCarrierContentDigestMustEqualNormalizedContentSha256: true,
      transcriptionCanBePromotedByReceipt: false
    },
    createdAt: LEDGER_CREATED_AT,
    currentInventory: {
      bundledManifestEntries: 0,
      formalSourceCarrierRecords: 0,
      formalSourceRightsRecords: 0,
      materializationsVerified: 0,
      projectCopyMaterializationRecords: 0,
      redistributableSources: 0,
      sourceBindingsFrozen: 0,
      sourceBindingsRequired: 12
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    gateSummary: {
      bindingFrozenVerified: 0,
      formalSourceCarrierRecords: 0,
      formalSourceRightsRecords: 0,
      ledgerRequirementsDefined: true,
      materializationsVerified: 0,
      projectCopyMaterializationRecords: 0,
      publicDeploymentAuthorized: false,
      releaseReady: false,
      rightsLegalConclusionEstablished: false
    },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: LEDGER_DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    ledgerId: "hakimi.bazi.project-copy-materialization-requirements/1.0.0",
    normalizationProfile: {
      ...BAZI_PROJECT_COPY_NORMALIZATION_PROFILE,
      operations: [...BAZI_PROJECT_COPY_NORMALIZATION_PROFILE.operations]
    },
    observationBoundary: {
      abaExcluded: false,
      basisArtifactHashAndParseUseSameBuffer: true,
      crossFileAtomicSnapshot: false,
      endpointSnapshotOnly: true,
      heldFileHandleReads: true,
      intervalMutationExcluded: false,
      ledgerHashAndParseUseSameBuffer: true,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      nestedVerifierReadsReuseDirectBuffers: false,
      pathAndDirectoryChainRevalidated: true
    },
    receiptRequirements: {
      candidateSchemaVersion: BAZI_PROJECT_COPY_MATERIALIZATION_CANDIDATE_SCHEMA_VERSION,
      currentPersistedReceiptIds: [],
      projectPathPrefix: PROJECT_COPY_PREFIX,
      rawIdentityRequired: true,
      receiptSchemaVersion: BAZI_PROJECT_COPY_MATERIALIZATION_RECEIPT_SCHEMA_VERSION,
      resultStoresAbsolutePath: false,
      resultStoresContentOrBytes: false,
      sourceCarrierCanonicalDigestDomain: SOURCE_CARRIER_DIGEST_DOMAIN,
      sourceCarrierSchemaVersion: SOURCE_CARRIER_SCHEMA_VERSION
    },
    recordType: "bazi_project_copy_materialization_requirements_v1",
    releaseGovernance: { ...RELEASE_GOVERNANCE },
    schemaVersion: "1.0.0",
    status: "zero_instance_materialization_requirements_defined"
  };
  return deepFreezeJson({
    ...unsigned,
    ledgerDigest: domainSeparatedDigest(LEDGER_DIGEST_DOMAIN, unsigned)
  });
}

function requireStaticLedgerBoundary(ledger) {
  requireExactKeys(ledger, [
    "authorityBoundary", "basisArtifacts", "contractBoundary", "createdAt", "currentInventory",
    "doesNotEstablish", "gateSummary", "integrityBoundary", "ledgerDigest", "ledgerId",
    "normalizationProfile", "observationBoundary", "receiptRequirements", "recordType",
    "releaseGovernance", "schemaVersion", "status"
  ], "C-M1 requirements ledger", "LEDGER_INVALID");
  if (ledger.schemaVersion !== "1.0.0"
    || ledger.recordType !== "bazi_project_copy_materialization_requirements_v1"
    || ledger.ledgerId !== "hakimi.bazi.project-copy-materialization-requirements/1.0.0"
    || ledger.status !== "zero_instance_materialization_requirements_defined") {
    fail("LEDGER_IDENTITY_INVALID", "C-M1 requirements ledger 身份或状态无效。");
  }
  requireCanonicalUtc(ledger.createdAt, "ledger.createdAt");
  if (ledger.createdAt !== LEDGER_CREATED_AT) fail("LEDGER_IDENTITY_INVALID", "C-M1 ledger createdAt 已漂移。");
  exactReleaseGovernance(ledger.releaseGovernance, "ledger.releaseGovernance");
  exactAuthorityBoundary(ledger.authorityBoundary, "ledger.authorityBoundary");
  exactNormalizationProfile(ledger.normalizationProfile, "ledger.normalizationProfile");
  if (ledger.currentInventory.formalSourceCarrierRecords !== 0
    || ledger.currentInventory.formalSourceRightsRecords !== 0
    || ledger.currentInventory.projectCopyMaterializationRecords !== 0
    || ledger.currentInventory.materializationsVerified !== 0
    || ledger.gateSummary.formalSourceCarrierRecords !== 0
    || ledger.gateSummary.formalSourceRightsRecords !== 0
    || ledger.gateSummary.projectCopyMaterializationRecords !== 0
    || ledger.gateSummary.materializationsVerified !== 0
    || ledger.gateSummary.bindingFrozenVerified !== 0) {
    fail("ZERO_INSTANCE_BOUNDARY_PROMOTED", "C-M1 formal carrier、项目副本记录、验证和 Binding 必须全部保持 0。 ");
  }
  if (!Array.isArray(ledger.receiptRequirements.currentPersistedReceiptIds)
    || ledger.receiptRequirements.currentPersistedReceiptIds.length !== 0
    || ledger.contractBoundary.ocrCanBePromotedByReceipt !== false
    || ledger.contractBoundary.transcriptionCanBePromotedByReceipt !== false
    || ledger.contractBoundary.collationCanBePromotedByReceipt !== false) {
    fail("MATERIALIZATION_AUTHORITY_PROMOTED", "C-M1 不得保存实例或晋级 OCR、转录、校勘。 ");
  }
  if (ledger.observationBoundary.crossFileAtomicSnapshot !== false
    || ledger.observationBoundary.mutationEpochAvailableForSchema13 !== false
    || ledger.observationBoundary.mutationEpochReceipt !== null
    || ledger.observationBoundary.intervalMutationExcluded !== false
    || ledger.observationBoundary.abaExcluded !== false) {
    fail("OBSERVATION_BOUNDARY_PROMOTED", "C-M1 不得声称跨文件原子、epoch、区间 mutation 或 ABA 排除。 ");
  }
  if (ledger.integrityBoundary.digestAlgorithm !== "SHA-256"
    || ledger.integrityBoundary.digestDomain !== LEDGER_DIGEST_DOMAIN
    || ledger.integrityBoundary.digestIsDigitalSignature !== false
    || ledger.integrityBoundary.authenticityEstablished !== false
    || ledger.integrityBoundary.digitalSignature !== null
    || ledger.integrityBoundary.signerIdentity !== null) {
    fail("INTEGRITY_BOUNDARY_PROMOTED", "C-M1 SHA-256 digest 不能冒充签名或真实性。 ");
  }
  if (!SHA256_PATTERN.test(ledger.ledgerDigest)
    || ledger.ledgerDigest !== computeBaziProjectCopyMaterializationRequirementsDigest(ledger)) {
    fail("LEDGER_DIGEST_MISMATCH", "C-M1 requirements ledger digest 无效。 ");
  }
}

export async function readBaziProjectCopyMaterializationRequirementsLedger(workspaceRoot) {
  const snapshot = await readStableFile(
    workspaceRoot,
    BAZI_PROJECT_COPY_MATERIALIZATION_REQUIREMENTS_RELATIVE_PATH,
    MAX_LEDGER_BYTES,
    { label: "C-M1 requirements ledger" }
  );
  const ledger = parseBaziProjectCopyMaterializationJsonBytes(snapshot.bytes, "C-M1 requirements ledger");
  const source = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  if (source !== canonicalPrettyStringifyBaziProjectCopyMaterialization(ledger)) {
    fail("JSON_NON_CANONICAL", "C-M1 requirements ledger 必须是固定排序、两空格缩进和单一结尾换行。 ");
  }
  return ledger;
}

export async function verifyBaziProjectCopyMaterializationRequirementsLedger(workspaceRoot, ledgerInput) {
  const ledger = capturePassiveJsonSnapshot(ledgerInput);
  requireStaticLedgerBoundary(ledger);
  const expected = await buildCurrentBaziProjectCopyMaterializationRequirementsLedger(workspaceRoot);
  if (canonicalStringifyBaziProjectCopyMaterialization(ledger)
    !== canonicalStringifyBaziProjectCopyMaterialization(expected)) {
    fail("LEDGER_MISMATCH", "C-M1 requirements ledger 与当前空 manifest、正式 schema、knowledge basis 或 C 父账不一致。 ");
  }
  const frozen = deepFreezeJson(ledger);
  return Object.freeze({
    formalSourceCarrierRecords: 0,
    ledger: frozen,
    ledgerDigest: frozen.ledgerDigest,
    materializationsVerified: 0,
    projectCopyMaterializationRecords: 0,
    publicDeploymentAuthorized: false,
    releaseReady: false,
    status: "zero_instance_materialization_requirements_defined"
  });
}
