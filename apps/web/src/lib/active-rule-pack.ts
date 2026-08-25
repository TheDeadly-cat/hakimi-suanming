import {
  rulePackBindingSchema,
  ruleProfileSchema,
  type InstalledRulePackRecord,
  type RulePackBinding,
  type RuleProfile
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import type { RulePackIntegrityResult } from "@hakimi/rule-packs";
import { ruleRegistryRepository } from "@hakimi/storage";

const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const MAX_RULE_PACK_TITLE_CHARACTERS = 240;
const MAX_RULE_PACK_ISSUE_CHARACTERS = 500;
const MAX_RULE_PACK_ISSUES = 24;
const MAX_ACTIVE_RULE_PACK_ERROR_CHARACTERS = 1_600;
const MAX_RULE_PROFILE_FREEZE_NODES = 10_000;

function boundedVisibleText(value: unknown, fallback: string, maximumCharacters: number): string {
  if (typeof value !== "string") return fallback;
  const normalized = value
    .normalize("NFC")
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!normalized) return fallback;
  const characters = Array.from(normalized);
  return characters.length <= maximumCharacters
    ? normalized
    : `${characters.slice(0, maximumCharacters).join("")}…`;
}

function issueMessage(reason: unknown, fallback: string): string {
  try {
    return boundedVisibleText(
      reason instanceof Error ? reason.message : fallback,
      fallback,
      MAX_RULE_PACK_ISSUE_CHARACTERS
    );
  } catch {
    return fallback;
  }
}

function immutableRuleProfile(profile: RuleProfile): RuleProfile {
  const parsed = ruleProfileSchema.parse(profile);
  let traversed = 0;
  const pending: object[] = [parsed as object];
  const seen = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (seen.has(current)) continue;
    seen.add(current);
    traversed += 1;
    if (traversed > MAX_RULE_PROFILE_FREEZE_NODES) {
      throw new Error("规则 profile 结构超过不可变快照安全上限。");
    }
    for (const child of Object.values(current as Record<string, unknown>)) {
      if (child && typeof child === "object") pending.push(child);
    }
    Object.freeze(current);
  }
  return parsed;
}

function requireCanonicalDigest(value: unknown, field: string): string {
  if (typeof value !== "string" || !LOWERCASE_SHA256.test(value)) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      `活动规则包 ${field} 不是规范小写 SHA-256；本次排盘已停止。`
    );
  }
  return value;
}

export type InstalledRulePackAudit = {
  record: InstalledRulePackRecord;
  title: string;
  declaredReview: "pending_consultant_review" | "consultant_reviewed";
  profile: RuleProfile | null;
  activatable: boolean;
  issues: string[];
};

export type ActiveRulePackContext =
  | {
      source: "built_in";
      profile: RuleProfile;
      binding: undefined;
      title: string;
      packDigest: null;
    }
  | {
      source: "installed";
      profile: RuleProfile;
      binding: RulePackBinding;
      title: string;
      packDigest: string;
    };

export class ActiveRulePackResolutionError extends Error {
  constructor(readonly code: "ACTIVE_REFERENCE_INVALID" | "ACTIVE_PACK_NOT_ACTIVATABLE", message: string) {
    super(message);
    this.name = "ActiveRulePackResolutionError";
  }
}

async function readActiveRulePackReference() {
  try {
    return await ruleRegistryRepository.getActiveRulePack();
  } catch (reason) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      issueMessage(reason, "活动规则包引用损坏；请到设置页明确停用后再排盘。")
    );
  }
}

async function readInstalledRulePackRecord(
  digest: string
): Promise<InstalledRulePackRecord | null> {
  try {
    return await ruleRegistryRepository.getInstalledRulePack(digest);
  } catch (reason) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      issueMessage(reason, "活动规则包记录读取失败；本次排盘已停止。")
    );
  }
}

function assertInstalledIndexes(
  record: InstalledRulePackRecord,
  verified: RulePackIntegrityResult
): void {
  const profile = verified.envelope.profile;
  if (
    record.canonicalJson !== verified.canonicalJson ||
    record.id !== verified.digest ||
    record.packDigest !== verified.digest ||
    record.profileDigest !== verified.profileDigest ||
    record.packId !== verified.envelope.metadata.packId ||
    record.profileId !== profile.profileId ||
    record.profileVersion !== profile.profileVersion
  ) {
    throw new Error("规则包仓库索引与规范 JSON 不一致；记录可能损坏，已禁止激活与排盘。");
  }
}

export async function inspectInstalledRulePackRecord(
  record: InstalledRulePackRecord,
  appVersion: string
): Promise<InstalledRulePackAudit> {
  const issues: string[] = [];
  let title = boundedVisibleText(
    `${record.packId}@${record.profileVersion}`,
    "未命名规则包",
    MAX_RULE_PACK_TITLE_CHARACTERS
  );
  let declaredReview: InstalledRulePackAudit["declaredReview"] = "pending_consultant_review";
  let profile: RuleProfile | null = null;

  try {
    const [{ verifyRulePackIntegrity, preflightRulePack }, { inspectRuleProfileCompatibility }] = await Promise.all([
      import("@hakimi/rule-packs"),
      import("@hakimi/bazi-core")
    ]);
    const verified = await verifyRulePackIntegrity(record.canonicalJson);
    assertInstalledIndexes(record, verified);
    const verifiedTitle = verified.envelope.metadata.title;
    title = boundedVisibleText(
      verifiedTitle,
      "未命名规则包",
      MAX_RULE_PACK_TITLE_CHARACTERS
    );
    if (title !== verifiedTitle) {
      issues.push("规则包标题包含不可安全展示的字符或超过长度上限。");
    }
    declaredReview = verified.envelope.metadata.review.status;
    profile = immutableRuleProfile(verified.envelope.profile);
    try {
      await preflightRulePack(record.canonicalJson, { appVersion });
    } catch (reason) {
      issues.push(issueMessage(reason, "规则包与当前应用版本不兼容。"));
    }
    const compatibility = inspectRuleProfileCompatibility(profile);
    issues.push(...compatibility.reasons.map((reason) => boundedVisibleText(
      `${reason.path}：${reason.message}`,
      "规则档案兼容性检查失败。",
      MAX_RULE_PACK_ISSUE_CHARACTERS
    )));
  } catch (reason) {
    issues.push(issueMessage(reason, "规则包完整性检查失败。"));
  }

  const uniqueIssues = [...new Set(issues)];
  const displayedIssues = uniqueIssues.slice(0, MAX_RULE_PACK_ISSUES);
  if (uniqueIssues.length > MAX_RULE_PACK_ISSUES) {
    displayedIssues.push(`另有 ${uniqueIssues.length - MAX_RULE_PACK_ISSUES} 项问题未展开。`);
  }

  return Object.freeze({
    record,
    title,
    declaredReview,
    profile,
    activatable: profile !== null && uniqueIssues.length === 0,
    issues: Object.freeze(displayedIssues) as unknown as string[]
  });
}

/**
 * Resolves the singleton selector without a silent fallback. No selector means
 * the built-in profile; a present but invalid selector blocks all new charts.
 */
export async function loadActiveRulePackContext(appVersion: string): Promise<ActiveRulePackContext> {
  const active = await readActiveRulePackReference();
  if (!active) {
    const confirmedActive = await readActiveRulePackReference();
    if (confirmedActive) {
      throw new ActiveRulePackResolutionError(
        "ACTIVE_REFERENCE_INVALID",
        "活动规则包在读取期间发生变化；本次排盘已停止，请重试。"
      );
    }
    try {
      return Object.freeze({
        source: "built_in",
        profile: immutableRuleProfile(WORKING_DEFAULT_RULE_PROFILE),
        binding: undefined,
        title: "传统子平工作默认",
        packDigest: null
      });
    } catch (reason) {
      throw new ActiveRulePackResolutionError(
        "ACTIVE_PACK_NOT_ACTIVATABLE",
        issueMessage(reason, "内置规则 profile 无法形成不可变执行快照；本次排盘已停止。")
      );
    }
  }

  const activeDigest = requireCanonicalDigest(active.activeDigest, "包摘要");
  const activeProfileDigest = requireCanonicalDigest(active.activeProfileDigest, "profile 摘要");

  const installed = await readInstalledRulePackRecord(activeDigest);
  if (!installed) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      `活动规则包 ${activeDigest} 已悬空；系统不会静默退回默认规则。`
    );
  }
  if (installed.id !== activeDigest || installed.packDigest !== activeDigest) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      "活动规则包引用与仓库返回记录不一致；系统不会使用替代规则包。"
    );
  }
  const audit = await inspectInstalledRulePackRecord(installed, appVersion);
  if (!audit.activatable || !audit.profile || installed.profileDigest !== activeProfileDigest) {
    const issueSummary = boundedVisibleText(
      audit.issues.join("；"),
      "活动 profile 摘要与已安装记录不一致",
      MAX_ACTIVE_RULE_PACK_ERROR_CHARACTERS
    );
    throw new ActiveRulePackResolutionError(
      "ACTIVE_PACK_NOT_ACTIVATABLE",
      `活动规则包当前不可执行：${issueSummary}。请到设置页明确停用或更换。`
    );
  }
  const [confirmedActive, confirmedInstalled] = await Promise.all([
    readActiveRulePackReference(),
    readInstalledRulePackRecord(activeDigest)
  ]);
  if (
    !confirmedActive ||
    confirmedActive.activeDigest !== activeDigest ||
    confirmedActive.activeProfileDigest !== activeProfileDigest
  ) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      "活动规则包在完整性检查期间发生变化；本次排盘已停止，请重试。"
    );
  }
  if (
    !confirmedInstalled
    || confirmedInstalled.id !== installed.id
    || confirmedInstalled.packDigest !== installed.packDigest
    || confirmedInstalled.profileDigest !== installed.profileDigest
    || confirmedInstalled.packId !== installed.packId
    || confirmedInstalled.profileId !== installed.profileId
    || confirmedInstalled.profileVersion !== installed.profileVersion
    || confirmedInstalled.canonicalJson !== installed.canonicalJson
  ) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      "已安装规则包在完整性检查期间发生变化；本次排盘已停止，请重试。"
    );
  }

  try {
    const binding = Object.freeze(rulePackBindingSchema.parse({
      kind: "installed_rule_pack",
      packDigest: installed.packDigest,
      profileDigest: installed.profileDigest,
      packId: installed.packId,
      profileId: installed.profileId,
      profileVersion: installed.profileVersion,
      useMode: "exact"
    }));
    return Object.freeze({
      source: "installed",
      profile: audit.profile,
      binding,
      title: audit.title,
      packDigest: installed.packDigest
    });
  } catch (reason) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      issueMessage(reason, "活动规则包绑定无法通过严格契约；本次排盘已停止。")
    );
  }
}
