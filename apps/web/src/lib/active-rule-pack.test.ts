import type {
  ActiveRulePackRecord,
  InstalledRulePackRecord,
  RuleProfile
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import type { RulePackIntegrityResult } from "@hakimi/rule-packs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveRulePack: vi.fn(),
  getInstalledRulePack: vi.fn(),
  verifyRulePackIntegrity: vi.fn(),
  preflightRulePack: vi.fn(),
  inspectRuleProfileCompatibility: vi.fn()
}));

vi.mock("@hakimi/storage", () => ({
  ruleRegistryRepository: {
    getActiveRulePack: mocks.getActiveRulePack,
    getInstalledRulePack: mocks.getInstalledRulePack
  }
}));

vi.mock("@hakimi/rule-packs", () => ({
  verifyRulePackIntegrity: mocks.verifyRulePackIntegrity,
  preflightRulePack: mocks.preflightRulePack
}));

vi.mock("@hakimi/bazi-core", () => ({
  inspectRuleProfileCompatibility: mocks.inspectRuleProfileCompatibility
}));

import {
  ActiveRulePackResolutionError,
  inspectInstalledRulePackRecord,
  loadActiveRulePackContext
} from "./active-rule-pack";

const APP_VERSION = "0.2.0-p0";
const PACK_DIGEST = "a".repeat(64);
const PROFILE_DIGEST = "b".repeat(64);
const OTHER_PACK_DIGEST = "c".repeat(64);
const OTHER_PROFILE_DIGEST = "d".repeat(64);
const CANONICAL_JSON = '{"fixture":"active-rule-pack"}';
const TIMESTAMP = "2026-08-24T00:00:00.000Z";

function activeRecord(
  overrides: Partial<ActiveRulePackRecord> = {}
): ActiveRulePackRecord {
  return {
    schemaVersion: "1.0.0",
    recordVersion: 1,
    recordType: "active_rule_pack",
    id: "active-rule-pack",
    activeDigest: PACK_DIGEST,
    activeProfileDigest: PROFILE_DIGEST,
    activatedAt: TIMESTAMP,
    approval: {
      status: "locally_approved_for_activation",
      acknowledgedAt: TIMESTAMP,
      acknowledgementVersion: "rule-pack-local-approval@1",
      appVersion: APP_VERSION,
      engineName: "hakimi-bazi-core",
      engineVersion: "0.4.0"
    },
    ...overrides
  };
}

function installedRecord(
  overrides: Partial<InstalledRulePackRecord> = {}
): InstalledRulePackRecord {
  return {
    schemaVersion: "1.0.0",
    recordVersion: 1,
    recordType: "installed_rule_pack",
    id: PACK_DIGEST,
    packDigest: PACK_DIGEST,
    profileDigest: PROFILE_DIGEST,
    packId: "ziping-working-default",
    profileId: WORKING_DEFAULT_RULE_PROFILE.profileId,
    profileVersion: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
    canonicalJson: CANONICAL_JSON,
    localTrust: "unverified_local_import",
    importedAt: TIMESTAMP,
    ...overrides
  };
}

function integrityResult(
  overrides: Partial<RulePackIntegrityResult> = {}
): RulePackIntegrityResult {
  return {
    envelope: {
      format: "hakimi-bazi-rule-pack",
      formatVersion: "1.0.0",
      minAppVersion: "0.1.0",
      profile: structuredClone(WORKING_DEFAULT_RULE_PROFILE),
      metadata: {
        packId: "ziping-working-default",
        title: "受测规则包",
        description: "纯模块测试夹具。",
        author: "Hakimi test",
        license: "UNLICENSED",
        sourceRefs: [],
        review: {
          status: "pending_consultant_review",
          reviewedBy: null,
          reviewedAt: null,
          notes: "仅用于工程测试。"
        }
      },
      digest: {
        algorithm: "sha256-canonical-json-v1",
        value: PACK_DIGEST
      }
    },
    canonicalJson: CANONICAL_JSON,
    digest: PACK_DIGEST,
    profileDigest: PROFILE_DIGEST,
    ...overrides
  };
}

function setCompatibleInspection(): void {
  mocks.inspectRuleProfileCompatibility.mockReturnValue({
    supported: true,
    compatible: true,
    reasons: []
  });
  mocks.preflightRulePack.mockResolvedValue(undefined);
}

function configureStableInstalledContext(
  active = activeRecord(),
  installed = installedRecord(),
  verified = integrityResult()
): void {
  mocks.getActiveRulePack.mockImplementation(async () => active);
  mocks.getInstalledRulePack.mockImplementation(async () => installed);
  mocks.verifyRulePackIntegrity.mockResolvedValue(verified);
  setCompatibleInspection();
}

function expectDeeplyFrozen(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if ("value" in descriptor) expectDeeplyFrozen(descriptor.value, seen);
  }
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

async function captureResolutionError(
  promise: Promise<unknown>,
  code: ActiveRulePackResolutionError["code"]
): Promise<ActiveRulePackResolutionError> {
  try {
    await promise;
  } catch (reason) {
    expect(reason).toBeInstanceOf(ActiveRulePackResolutionError);
    const error = reason as ActiveRulePackResolutionError;
    expect(error.code).toBe(code);
    return error;
  }
  throw new Error("Expected active rule-pack resolution to reject.");
}

describe("active rule-pack pure module resolver", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    setCompatibleInspection();
  });

  it("二次确认仍无 active 后返回与默认常量隔离的深冻结内置快照", async () => {
    mocks.getActiveRulePack.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const context = await loadActiveRulePackContext(APP_VERSION);

    expect(mocks.getActiveRulePack).toHaveBeenCalledTimes(2);
    expect(mocks.getInstalledRulePack).not.toHaveBeenCalled();
    expect(context).toMatchObject({
      source: "built_in",
      binding: undefined,
      title: "传统子平工作默认",
      packDigest: null
    });
    expect(context.profile).toEqual(WORKING_DEFAULT_RULE_PROFILE);
    expect(context.profile).not.toBe(WORKING_DEFAULT_RULE_PROFILE);
    expectDeeplyFrozen(context);
    expect(Reflect.set(context.profile.calendar, "dayBoundary", "midnight")).toBe(false);
  });

  it("无 active 的二次确认观察到新引用时拒绝静默回退", async () => {
    mocks.getActiveRulePack.mockResolvedValueOnce(null).mockResolvedValueOnce(activeRecord());

    const error = await captureResolutionError(
      loadActiveRulePackContext(APP_VERSION),
      "ACTIVE_REFERENCE_INVALID"
    );

    expect(error.message).toContain("读取期间发生变化");
    expect(mocks.getInstalledRulePack).not.toHaveBeenCalled();
  });

  it("归一化 active/installed 仓储异常，且失控 getter 或长控制文本不会外泄", async () => {
    const inaccessibleMessage = new Error("placeholder");
    Object.defineProperty(inaccessibleMessage, "message", {
      configurable: true,
      get() {
        throw new Error("MESSAGE_GETTER_SECRET");
      }
    });
    mocks.getActiveRulePack.mockRejectedValueOnce(inaccessibleMessage);

    const activeError = await captureResolutionError(
      loadActiveRulePackContext(APP_VERSION),
      "ACTIVE_REFERENCE_INVALID"
    );
    expect(activeError.message).toBe("活动规则包引用损坏；请到设置页明确停用后再排盘。");
    expect(activeError.message).not.toContain("MESSAGE_GETTER_SECRET");

    mocks.getActiveRulePack.mockResolvedValueOnce(activeRecord());
    const oversizedMessage = `仓储\u0000错误 ${"长".repeat(700)} PRIVATE_TAIL_SENTINEL`;
    mocks.getInstalledRulePack.mockRejectedValueOnce(new Error(oversizedMessage));

    const installedError = await captureResolutionError(
      loadActiveRulePackContext(APP_VERSION),
      "ACTIVE_REFERENCE_INVALID"
    );
    expect(installedError.message).toMatch(/^仓储 错误/u);
    expect(installedError.message).not.toMatch(/[\p{Cc}\p{Cf}]/u);
    expect(installedError.message).not.toContain("PRIVATE_TAIL_SENTINEL");
    expect(Array.from(installedError.message)).toHaveLength(501);
    expect(installedError.message.endsWith("…")).toBe(true);
  });

  it.each([
    ["包摘要", { activeDigest: "A".repeat(64) }],
    ["profile 摘要", { activeProfileDigest: "g".repeat(64) }]
  ])("拒绝非规范小写 SHA-256：%s", async (field, override) => {
    mocks.getActiveRulePack.mockResolvedValueOnce(activeRecord(override));

    const error = await captureResolutionError(
      loadActiveRulePackContext(APP_VERSION),
      "ACTIVE_REFERENCE_INVALID"
    );

    expect(error.message).toContain(String(field));
    expect(error.message).toContain("规范小写 SHA-256");
    expect(mocks.getInstalledRulePack).not.toHaveBeenCalled();
  });

  it("完整性检查 await 期间 active 改变时拒绝旧快照", async () => {
    let currentActive = activeRecord();
    const installed = installedRecord();
    const verification = deferred<RulePackIntegrityResult>();
    mocks.getActiveRulePack.mockImplementation(async () => currentActive);
    mocks.getInstalledRulePack.mockImplementation(async () => installed);
    mocks.verifyRulePackIntegrity.mockImplementation(async () => verification.promise);

    const pending = loadActiveRulePackContext(APP_VERSION);
    await vi.waitFor(() => expect(mocks.verifyRulePackIntegrity).toHaveBeenCalledTimes(1));
    currentActive = activeRecord({ activeProfileDigest: OTHER_PROFILE_DIGEST });
    verification.resolve(integrityResult());

    const error = await captureResolutionError(pending, "ACTIVE_REFERENCE_INVALID");
    expect(error.message).toContain("完整性检查期间发生变化");
  });

  it("完整性检查 await 期间 installed 改变时拒绝旧快照", async () => {
    const active = activeRecord();
    let currentInstalled = installedRecord();
    const verification = deferred<RulePackIntegrityResult>();
    mocks.getActiveRulePack.mockImplementation(async () => active);
    mocks.getInstalledRulePack.mockImplementation(async () => currentInstalled);
    mocks.verifyRulePackIntegrity.mockImplementation(async () => verification.promise);

    const pending = loadActiveRulePackContext(APP_VERSION);
    await vi.waitFor(() => expect(mocks.verifyRulePackIntegrity).toHaveBeenCalledTimes(1));
    currentInstalled = installedRecord({ canonicalJson: '{"fixture":"changed-during-await"}' });
    verification.resolve(integrityResult());

    const error = await captureResolutionError(pending, "ACTIVE_REFERENCE_INVALID");
    expect(error.message).toContain("已安装规则包在完整性检查期间发生变化");
  });

  it("完整有效 installed 返回深冻结 context、binding 与 profile", async () => {
    configureStableInstalledContext();

    const context = await loadActiveRulePackContext(APP_VERSION);

    expect(context.source).toBe("installed");
    if (context.source !== "installed") throw new Error("Expected installed context.");
    expect(context.title).toBe("受测规则包");
    expect(context.packDigest).toBe(PACK_DIGEST);
    expect(context.binding).toEqual({
      kind: "installed_rule_pack",
      packDigest: PACK_DIGEST,
      profileDigest: PROFILE_DIGEST,
      packId: "ziping-working-default",
      profileId: WORKING_DEFAULT_RULE_PROFILE.profileId,
      profileVersion: WORKING_DEFAULT_RULE_PROFILE.profileVersion,
      useMode: "exact"
    });
    expectDeeplyFrozen(context);
    expect(Reflect.set(context.binding, "packId", "replacement")).toBe(false);
    expect(Reflect.set(context.profile.calendar, "dayBoundary", "midnight")).toBe(false);
    expect(mocks.getActiveRulePack).toHaveBeenCalledTimes(2);
    expect(mocks.getInstalledRulePack).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["canonical JSON", { canonicalJson: '{"fixture":"verified-other"}' }],
    ["verified profile index", { profileDigest: OTHER_PROFILE_DIGEST }],
    ["verified pack index", { digest: OTHER_PACK_DIGEST }]
  ])("拒绝 verified %s 与仓储索引不一致", async (_label, override) => {
    configureStableInstalledContext(
      activeRecord(),
      installedRecord(),
      integrityResult(override)
    );

    const error = await captureResolutionError(
      loadActiveRulePackContext(APP_VERSION),
      "ACTIVE_PACK_NOT_ACTIVATABLE"
    );

    expect(error.message).toContain("仓库索引与规范 JSON 不一致");
  });

  it("把大量兼容性错误去控制字符、逐项截断、限项并聚合为有界摘要", async () => {
    configureStableInstalledContext();
    mocks.inspectRuleProfileCompatibility.mockReturnValue({
      supported: false,
      compatible: false,
      reasons: Array.from({ length: 30 }, (_, index) => ({
        code: "UNSUPPORTED_SEMANTIC_VALUE",
        path: `layers.issue-${index}`,
        actual: index,
        supportedValues: [],
        message: `不支持\u0000${"详".repeat(700)} PRIVATE_TAIL_${index}`
      }))
    });

    const audit = await inspectInstalledRulePackRecord(installedRecord(), APP_VERSION);
    expect(audit.issues).toHaveLength(25);
    expect(audit.issues.at(-1)).toBe("另有 6 项问题未展开。");
    expect(Object.isFrozen(audit)).toBe(true);
    expect(Object.isFrozen(audit.issues)).toBe(true);

    const error = await captureResolutionError(
      loadActiveRulePackContext(APP_VERSION),
      "ACTIVE_PACK_NOT_ACTIVATABLE"
    );

    expect(error.message).not.toMatch(/[\p{Cc}\p{Cf}]/u);
    expect(error.message).not.toContain("PRIVATE_TAIL_29");
    expect(error.message).toContain("…");
    expect(Array.from(error.message).length).toBeLessThanOrEqual(1_700);
  });
});
