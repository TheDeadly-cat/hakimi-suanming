import { ruleProfileSchema, type RuleProfile } from "@hakimi/contracts";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { z } from "zod";

export const RULE_PACK_FORMAT = "hakimi-bazi-rule-pack" as const;
export const RULE_PACK_FORMAT_VERSION = "1.0.0" as const;
export const RULE_PACK_PROFILE_SCHEMA_VERSION = "1.0.0" as const;
export const RULE_PACK_DIGEST_ALGORITHM = "sha256-canonical-json-v1" as const;

// SemVer 2.0.0, including prerelease and build metadata. Numeric core and
// prerelease identifiers reject leading zeroes; build identifiers may contain
// them because SemVer ignores build metadata for precedence.
const STRICT_SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const FORBIDDEN_EXECUTION_FIELDS = new Set(["code", "script", "function"]);
const PROTOTYPE_POLLUTION_FIELDS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_JSON_DEPTH = 100;
export const RULE_PACK_MAX_INPUT_BYTES = 2 * 1024 * 1024;
export const RULE_PACK_MAX_TOTAL_NODES = 50_000;
export const RULE_PACK_MAX_TOTAL_KEYS = 20_000;
export const RULE_PACK_MAX_TOTAL_STRINGS = 20_000;
export const RULE_PACK_MAX_TOTAL_STRING_BYTES = 1_500_000;

export type RulePackErrorCode =
  | "INVALID_JSON"
  | "NON_JSON_VALUE"
  | "FORBIDDEN_EXECUTION_FIELD"
  | "PROTOTYPE_POLLUTION_KEY"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_FORMAT_VERSION"
  | "UNSUPPORTED_PROFILE_SCHEMA_VERSION"
  | "INVALID_APP_VERSION"
  | "INCOMPATIBLE_APP_VERSION"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "SCHEMA_INVALID"
  | "DIGEST_MISMATCH";

export class RulePackError extends Error {
  constructor(
    readonly code: RulePackErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "RulePackError";
  }
}

function exactText(min: number, max: number) {
  return z
    .string()
    .min(min)
    .max(max)
    .refine((value) => value === value.trim(), "文本不能包含首尾空白");
}

const reviewSchema = z
  .strictObject({
    status: z.enum(["pending_consultant_review", "consultant_reviewed"]),
    reviewedBy: exactText(1, 120).nullable(),
    reviewedAt: z.string().datetime().nullable(),
    notes: exactText(1, 500)
  })
  .superRefine((value, context) => {
    const completed = value.status === "consultant_reviewed";
    if (completed !== (value.reviewedBy !== null && value.reviewedAt !== null)) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "顾问审核状态必须与 reviewedBy/reviewedAt 同步"
      });
    }
  });

export const rulePackMetadataSchema = z.strictObject({
  packId: z.string().regex(/^[a-z0-9-]+$/),
  title: exactText(1, 80),
  description: exactText(1, 500),
  author: exactText(1, 120),
  license: exactText(1, 80),
  sourceRefs: z.array(exactText(1, 500)).max(100),
  review: reviewSchema
});

function hasExactJsonStructure(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => hasExactJsonStructure(value, right[index]))
    );
  }
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) => key === rightKeys[index] && hasExactJsonStructure(leftRecord[key], rightRecord[key])
    )
  );
}

/**
 * The shared RuleProfile schema currently normalizes defaults and strips unknown
 * keys. A distributable rule pack must instead preserve exactly what was signed,
 * so this adapter rejects every such normalization.
 */
export const strictRulePackProfileSchema = z.unknown().transform((input, context): RuleProfile => {
  const result = ruleProfileSchema.safeParse(input);
  if (!result.success) {
    for (const issue of result.error.issues) {
      context.addIssue({ code: "custom", path: issue.path, message: issue.message });
    }
    return z.NEVER;
  }
  if (!hasExactJsonStructure(input, result.data)) {
    context.addIssue({
      code: "custom",
      message: "profile 含未知字段、缺少默认字段，或含会被规范化的值"
    });
    return z.NEVER;
  }
  return result.data;
});

export const rulePackDigestSchema = z.strictObject({
  algorithm: z.literal(RULE_PACK_DIGEST_ALGORITHM),
  value: z.string().regex(/^[a-f0-9]{64}$/)
});

const strictSemverSchema = z.string().regex(STRICT_SEMVER_PATTERN);

export const rulePackUnsignedEnvelopeSchema = z.strictObject({
  format: z.literal(RULE_PACK_FORMAT),
  formatVersion: z.literal(RULE_PACK_FORMAT_VERSION),
  minAppVersion: strictSemverSchema,
  profile: strictRulePackProfileSchema,
  metadata: rulePackMetadataSchema
});

export const rulePackEnvelopeSchema = rulePackUnsignedEnvelopeSchema.extend({
  digest: rulePackDigestSchema
});

export type RulePackMetadata = z.infer<typeof rulePackMetadataSchema>;
export type RulePackDigest = z.infer<typeof rulePackDigestSchema>;
export type RulePackUnsignedEnvelope = z.infer<typeof rulePackUnsignedEnvelopeSchema>;
export type RulePackEnvelope = z.infer<typeof rulePackEnvelopeSchema>;

export type RulePackIntegrityResult = {
  envelope: RulePackEnvelope;
  canonicalJson: string;
  digest: string;
  profileDigest: string;
};

export type RulePackPreflightResult = RulePackIntegrityResult & {
  appVersion: string;
};

export const WORKING_DEFAULT_RULE_PACK_METADATA: RulePackMetadata = rulePackMetadataSchema.parse({
  packId: "ziping-working-default",
  title: "传统子平工作默认规则包",
  description: "工程工作默认配置，仅用于可复现计算与研究对照，不代表唯一正确流派。",
  author: "Hakimi Bazi Workbench",
  license: "UNLICENSED",
  sourceRefs: [],
  review: {
    status: "pending_consultant_review",
    reviewedBy: null,
    reviewedAt: null,
    notes: "待命理顾问逐项审核边界、起运规则、解释层开关与来源证据。"
  }
});

function invalidJsonValue(message: string): never {
  throw new RulePackError("NON_JSON_VALUE", message);
}

function resourceLimit(message: string): never {
  throw new RulePackError("RESOURCE_LIMIT_EXCEEDED", message);
}

function utf8ByteLength(value: string): number {
  // Avoid allocating a multi-megabyte Uint8Array for an already over-limit
  // UTF-16 string. Every UTF-16 code unit contributes at least one UTF-8 byte.
  if (value.length > RULE_PACK_MAX_INPUT_BYTES) return value.length;
  return new TextEncoder().encode(value).byteLength;
}

type JsonResourceBudget = {
  nodes: number;
  keys: number;
  strings: number;
  stringBytes: number;
};

function claimNode(budget: JsonResourceBudget, path: string): void {
  budget.nodes += 1;
  if (budget.nodes > RULE_PACK_MAX_TOTAL_NODES) {
    resourceLimit(`${path} 使规则包超过总节点预算 ${RULE_PACK_MAX_TOTAL_NODES}`);
  }
}

function claimString(budget: JsonResourceBudget, value: string, path: string): void {
  budget.strings += 1;
  budget.stringBytes += utf8ByteLength(value);
  if (budget.strings > RULE_PACK_MAX_TOTAL_STRINGS) {
    resourceLimit(`${path} 使规则包超过总字符串预算 ${RULE_PACK_MAX_TOTAL_STRINGS}`);
  }
  if (budget.stringBytes > RULE_PACK_MAX_TOTAL_STRING_BYTES) {
    resourceLimit(`${path} 使规则包超过字符串字节预算 ${RULE_PACK_MAX_TOTAL_STRING_BYTES}`);
  }
}

/**
 * Security boundary for data supplied as either parsed objects or JSON text.
 * It never invokes accessors and rejects any value JSON cannot represent.
 */
function inspectDeclarativeJson(
  value: unknown,
  path = "envelope",
  depth = 0,
  ancestors = new WeakSet<object>(),
  budget: JsonResourceBudget = { nodes: 0, keys: 0, strings: 0, stringBytes: 0 }
): void {
  if (depth > MAX_JSON_DEPTH) invalidJsonValue(`规则包超过最大 JSON 深度 ${MAX_JSON_DEPTH}`);
  claimNode(budget, path);
  if (typeof value === "string") {
    claimString(budget, value, path);
    return;
  }
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalidJsonValue(`${path} 包含非有限数字`);
    return;
  }
  if (typeof value !== "object") invalidJsonValue(`${path} 包含非 JSON 值：${typeof value}`);

  const objectValue = value as object;
  if (ancestors.has(objectValue)) invalidJsonValue(`${path} 包含循环引用`);
  ancestors.add(objectValue);

  if (!Array.isArray(objectValue)) {
    const prototype = Object.getPrototypeOf(objectValue);
    if (prototype !== Object.prototype && prototype !== null) {
      ancestors.delete(objectValue);
      throw new RulePackError("PROTOTYPE_POLLUTION_KEY", `${path} 不是普通 JSON 对象`);
    }
  } else {
    for (let index = 0; index < objectValue.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(objectValue, index)) {
        ancestors.delete(objectValue);
        invalidJsonValue(`${path} 包含稀疏数组空位`);
      }
    }
  }

  for (const key of Object.getOwnPropertyNames(objectValue)) {
    if (Array.isArray(objectValue) && key === "length") continue;
    const normalizedKey = key.toLowerCase();
    const childPath = Array.isArray(objectValue) ? `${path}[${key}]` : `${path}.${key}`;
    if (!Array.isArray(objectValue)) {
      budget.keys += 1;
      if (budget.keys > RULE_PACK_MAX_TOTAL_KEYS) {
        ancestors.delete(objectValue);
        resourceLimit(`${childPath} 使规则包超过总键预算 ${RULE_PACK_MAX_TOTAL_KEYS}`);
      }
      budget.stringBytes += utf8ByteLength(key);
      if (budget.stringBytes > RULE_PACK_MAX_TOTAL_STRING_BYTES) {
        ancestors.delete(objectValue);
        resourceLimit(`${childPath} 使规则包超过字符串字节预算 ${RULE_PACK_MAX_TOTAL_STRING_BYTES}`);
      }
    }
    if (PROTOTYPE_POLLUTION_FIELDS.has(normalizedKey)) {
      ancestors.delete(objectValue);
      throw new RulePackError("PROTOTYPE_POLLUTION_KEY", `规则包禁止原型污染键：${childPath}`);
    }
    if (FORBIDDEN_EXECUTION_FIELDS.has(normalizedKey)) {
      ancestors.delete(objectValue);
      throw new RulePackError("FORBIDDEN_EXECUTION_FIELD", `规则包禁止可执行字段：${childPath}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (!descriptor || !("value" in descriptor)) {
      ancestors.delete(objectValue);
      invalidJsonValue(`${childPath} 是访问器而不是声明式数据`);
    }
    if (!descriptor.enumerable) {
      ancestors.delete(objectValue);
      invalidJsonValue(`${childPath} 是 JSON 不可见的非枚举字段`);
    }
    if (Array.isArray(objectValue) && !/^(?:0|[1-9]\d*)$/.test(key)) {
      ancestors.delete(objectValue);
      invalidJsonValue(`${childPath} 是数组上的自定义字段`);
    }
    inspectDeclarativeJson(descriptor.value, childPath, depth + 1, ancestors, budget);
  }
  if (Object.getOwnPropertySymbols(objectValue).length > 0) {
    ancestors.delete(objectValue);
    invalidJsonValue(`${path} 包含 Symbol 键`);
  }
  ancestors.delete(objectValue);
}

function assertDeclarativeJson(value: unknown): void {
  inspectDeclarativeJson(value);
  const serialized = JSON.stringify(value);
  if (serialized === undefined) invalidJsonValue("规则包不是可序列化的 JSON 值");
  if (utf8ByteLength(serialized) > RULE_PACK_MAX_INPUT_BYTES) {
    resourceLimit(`规则包超过最大输入字节 ${RULE_PACK_MAX_INPUT_BYTES}`);
  }
}

function parseRawInput(rawInput: unknown): unknown {
  if (typeof rawInput !== "string") return rawInput;
  if (utf8ByteLength(rawInput) > RULE_PACK_MAX_INPUT_BYTES) {
    resourceLimit(`规则包超过最大输入字节 ${RULE_PACK_MAX_INPUT_BYTES}`);
  }
  if (/^\s*(?:https?|data|javascript):/i.test(rawInput)) {
    throw new RulePackError("INVALID_JSON", "规则包导入只接受 JSON 内容，不读取或导入 URL");
  }
  try {
    return JSON.parse(rawInput) as unknown;
  } catch (cause) {
    throw new RulePackError("INVALID_JSON", "规则包不是有效 JSON", { cause });
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RulePackError("SCHEMA_INVALID", `${label} 必须是 JSON 对象`);
  }
  return value as Record<string, unknown>;
}

type ParsedSemver = {
  core: readonly [bigint, bigint, bigint];
  prerelease: readonly string[];
};

function parseSemverParts(value: string): ParsedSemver | null {
  const match = STRICT_SEMVER_PATTERN.exec(value);
  if (!match) return null;
  return {
    core: [BigInt(match[1]), BigInt(match[2]), BigInt(match[3])],
    prerelease: match[4] ? match[4].split(".") : []
  };
}

function comparePrereleaseIdentifier(left: string, right: string): -1 | 0 | 1 {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const leftValue = BigInt(left);
    const rightValue = BigInt(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  }
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Standard SemVer 2.0.0 precedence; build metadata is deliberately ignored. */
export function compareStrictSemver(left: string, right: string): -1 | 0 | 1 {
  const leftParts = parseSemverParts(left);
  const rightParts = parseSemverParts(right);
  if (!leftParts || !rightParts) {
    throw new RulePackError(
      "INVALID_APP_VERSION",
      `应用版本必须是标准 SemVer 2.0.0：${left} / ${right}`
    );
  }
  for (let index = 0; index < 3; index += 1) {
    if (leftParts.core[index] < rightParts.core[index]) return -1;
    if (leftParts.core[index] > rightParts.core[index]) return 1;
  }
  if (leftParts.prerelease.length === 0 || rightParts.prerelease.length === 0) {
    if (leftParts.prerelease.length === rightParts.prerelease.length) return 0;
    return leftParts.prerelease.length === 0 ? 1 : -1;
  }
  const length = Math.max(leftParts.prerelease.length, rightParts.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = leftParts.prerelease[index];
    const rightIdentifier = rightParts.prerelease[index];
    if (leftIdentifier === undefined || rightIdentifier === undefined) {
      return leftIdentifier === undefined ? -1 : 1;
    }
    const comparison = comparePrereleaseIdentifier(leftIdentifier, rightIdentifier);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function assertSupportedHeaders(raw: unknown): void {
  const envelope = requireRecord(raw, "规则包 envelope");
  if (envelope.format !== RULE_PACK_FORMAT) {
    throw new RulePackError("UNSUPPORTED_FORMAT", `不支持的规则包格式：${String(envelope.format)}`);
  }
  if (envelope.formatVersion !== RULE_PACK_FORMAT_VERSION) {
    throw new RulePackError(
      "UNSUPPORTED_FORMAT_VERSION",
      `不支持的规则包格式版本：${String(envelope.formatVersion)}`
    );
  }
  const profile = requireRecord(envelope.profile, "profile");
  if (profile.schemaVersion !== RULE_PACK_PROFILE_SCHEMA_VERSION) {
    throw new RulePackError(
      "UNSUPPORTED_PROFILE_SCHEMA_VERSION",
      `不支持的 RuleProfile schema 版本：${String(profile.schemaVersion)}`
    );
  }
  if (typeof envelope.minAppVersion !== "string" || !parseSemverParts(envelope.minAppVersion)) {
    throw new RulePackError("SCHEMA_INVALID", "minAppVersion 必须是标准 SemVer 2.0.0");
  }
}

function assertCompatibleAppVersion(envelope: RulePackEnvelope, appVersion: string): void {
  if (!parseSemverParts(appVersion)) {
    throw new RulePackError("INVALID_APP_VERSION", `当前应用版本不是标准 SemVer 2.0.0：${appVersion}`);
  }
  if (compareStrictSemver(appVersion, envelope.minAppVersion) < 0) {
    throw new RulePackError(
      "INCOMPATIBLE_APP_VERSION",
      `规则包至少需要应用 ${envelope.minAppVersion}，当前为 ${appVersion}`
    );
  }
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 6)
    .map((issue) => `${issue.path.join(".") || "envelope"}: ${issue.message}`)
    .join("；");
}

function parseStrictUnsignedEnvelope(raw: unknown): RulePackUnsignedEnvelope {
  const result = rulePackUnsignedEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    throw new RulePackError("SCHEMA_INVALID", `规则包 Schema 校验失败：${formatZodIssues(result.error)}`);
  }
  return result.data;
}

function parseStrictEnvelope(raw: unknown): RulePackEnvelope {
  const result = rulePackEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    throw new RulePackError("SCHEMA_INVALID", `规则包 Schema 校验失败：${formatZodIssues(result.error)}`);
  }
  return result.data;
}

function unsignedFromEnvelope(envelope: RulePackEnvelope): RulePackUnsignedEnvelope {
  return {
    format: envelope.format,
    formatVersion: envelope.formatVersion,
    minAppVersion: envelope.minAppVersion,
    profile: envelope.profile,
    metadata: envelope.metadata
  };
}

export async function recomputeRulePackDigest(input: RulePackUnsignedEnvelope): Promise<string> {
  assertDeclarativeJson(input);
  const unsigned = parseStrictUnsignedEnvelope(input);
  return sha256Hex(canonicalStringify(unsigned));
}

export async function createRulePackEnvelope(input: RulePackUnsignedEnvelope): Promise<RulePackEnvelope> {
  assertDeclarativeJson(input);
  const unsigned = parseStrictUnsignedEnvelope(input);
  const value = await recomputeRulePackDigest(unsigned);
  return rulePackEnvelopeSchema.parse({
    ...unsigned,
    digest: { algorithm: RULE_PACK_DIGEST_ALGORITHM, value }
  });
}

export async function createWorkingDefaultRulePackEnvelope(options?: {
  minAppVersion?: string;
}): Promise<RulePackEnvelope> {
  return createRulePackEnvelope({
    format: RULE_PACK_FORMAT,
    formatVersion: RULE_PACK_FORMAT_VERSION,
    minAppVersion: options?.minAppVersion ?? "0.1.0",
    profile: WORKING_DEFAULT_RULE_PROFILE,
    metadata: WORKING_DEFAULT_RULE_PACK_METADATA
  });
}

async function assertDigest(envelope: RulePackEnvelope): Promise<void> {
  const actual = await recomputeRulePackDigest(unsignedFromEnvelope(envelope));
  if (actual !== envelope.digest.value) {
    throw new RulePackError("DIGEST_MISMATCH", "规则包摘要不匹配，内容可能损坏或被修改");
  }
}

/**
 * Public integrity-only import boundary. It validates the declarative shape,
 * supported envelope/profile formats and both content digests, but deliberately
 * does not decide whether a particular app version may activate the pack.
 */
export async function verifyRulePackIntegrity(rawInput: unknown): Promise<RulePackIntegrityResult> {
  const raw = parseRawInput(rawInput);
  assertDeclarativeJson(raw);
  assertSupportedHeaders(raw);
  const envelope = parseStrictEnvelope(raw);
  await assertDigest(envelope);
  return {
    envelope,
    canonicalJson: canonicalStringify(envelope),
    digest: envelope.digest.value,
    profileDigest: await sha256Hex(envelope.profile)
  };
}

/**
 * Import preflight builds on integrity verification and then applies standard
 * SemVer compatibility. It contains no eval, dynamic import, URL or fetch path.
 */
export async function preflightRulePack(
  rawInput: unknown,
  options: { appVersion: string }
): Promise<RulePackPreflightResult> {
  const verified = await verifyRulePackIntegrity(rawInput);
  assertCompatibleAppVersion(verified.envelope, options.appVersion);
  return {
    ...verified,
    appVersion: options.appVersion
  };
}

/** Canonical JSON export with an integrity check; this function never writes to disk or a URL. */
export async function serializeRulePackEnvelope(envelope: RulePackEnvelope): Promise<string> {
  return (await verifyRulePackIntegrity(envelope)).canonicalJson;
}
