import {
  rulePackBindingSchema,
  type InstalledRulePackRecord,
  type RulePackBinding,
  type RuleProfile
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import type { RulePackIntegrityResult } from "@hakimi/rule-packs";
import { ruleRegistryRepository } from "@hakimi/storage";

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
  const [{ verifyRulePackIntegrity, preflightRulePack }, { inspectRuleProfileCompatibility }] = await Promise.all([
    import("@hakimi/rule-packs"),
    import("@hakimi/bazi-core")
  ]);
  const issues: string[] = [];
  let title = `${record.packId}@${record.profileVersion}`;
  let declaredReview: InstalledRulePackAudit["declaredReview"] = "pending_consultant_review";
  let profile: RuleProfile | null = null;

  try {
    const verified = await verifyRulePackIntegrity(record.canonicalJson);
    assertInstalledIndexes(record, verified);
    title = verified.envelope.metadata.title;
    declaredReview = verified.envelope.metadata.review.status;
    profile = verified.envelope.profile;
    try {
      await preflightRulePack(record.canonicalJson, { appVersion });
    } catch (reason) {
      issues.push(reason instanceof Error ? reason.message : "规则包与当前应用版本不兼容。");
    }
    const compatibility = inspectRuleProfileCompatibility(profile);
    issues.push(...compatibility.reasons.map((reason) => `${reason.path}：${reason.message}`));
  } catch (reason) {
    issues.push(reason instanceof Error ? reason.message : "规则包完整性检查失败。");
  }

  return {
    record,
    title,
    declaredReview,
    profile,
    activatable: profile !== null && issues.length === 0,
    issues
  };
}

/**
 * Resolves the singleton selector without a silent fallback. No selector means
 * the built-in profile; a present but invalid selector blocks all new charts.
 */
export async function loadActiveRulePackContext(appVersion: string): Promise<ActiveRulePackContext> {
  let active;
  try {
    active = await ruleRegistryRepository.getActiveRulePack();
  } catch (reason) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      reason instanceof Error ? reason.message : "活动规则包引用损坏；请到设置页明确停用后再排盘。"
    );
  }
  if (!active) {
    return {
      source: "built_in",
      profile: WORKING_DEFAULT_RULE_PROFILE,
      binding: undefined,
      title: "传统子平工作默认",
      packDigest: null
    };
  }

  const installed = await ruleRegistryRepository.getInstalledRulePack(active.activeDigest);
  if (!installed) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_REFERENCE_INVALID",
      `活动规则包 ${active.activeDigest} 已悬空；系统不会静默退回默认规则。`
    );
  }
  const audit = await inspectInstalledRulePackRecord(installed, appVersion);
  if (!audit.activatable || !audit.profile || installed.profileDigest !== active.activeProfileDigest) {
    throw new ActiveRulePackResolutionError(
      "ACTIVE_PACK_NOT_ACTIVATABLE",
      `活动规则包当前不可执行：${audit.issues.join("；") || "活动 profile 摘要与已安装记录不一致"}。请到设置页明确停用或更换。`
    );
  }

  return {
    source: "installed",
    profile: audit.profile,
    binding: rulePackBindingSchema.parse({
      kind: "installed_rule_pack",
      packDigest: installed.packDigest,
      profileDigest: installed.profileDigest,
      packId: installed.packId,
      profileId: installed.profileId,
      profileVersion: installed.profileVersion,
      useMode: "exact"
    }),
    title: audit.title,
    packDigest: installed.packDigest
  };
}
