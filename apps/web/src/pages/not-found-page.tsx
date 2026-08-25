import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  Check,
  CircleHelp,
  ClipboardCopy,
  Columns3,
  Compass,
  FolderOpen,
  Home,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { AppLink, useAppLocation } from "../lib/router";
import "./not-found-page.css";

type RecoveryTarget = {
  href: string;
  label: string;
  detail: string;
  ledgerLabel: string;
  icon: LucideIcon;
};

const INVISIBLE_ADDRESS_CHARACTER_PATTERN =
  /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u180e\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff\ufff9-\ufffb]/gu;

const DASHBOARD_RECOVERY: RecoveryTarget = {
  href: "/",
  label: "返回工作台",
  detail: "从总览重新进入已登记模块",
  ledgerLabel: "返回工作台重新定位",
  icon: Home,
};

const CASES_RECOVERY: RecoveryTarget = {
  href: "/cases",
  label: "打开案例库",
  detail: "查找案例与确切 Revision",
  ledgerLabel: "打开案例库重新定位",
  icon: FolderOpen,
};

const KNOWLEDGE_RECOVERY: RecoveryTarget = {
  href: "/knowledge",
  label: "返回知识库",
  detail: "继续核对文档、引文与来源材料",
  ledgerLabel: "返回知识库重新定位",
  icon: BookOpenText,
};

const COMPARE_RECOVERY: RecoveryTarget = {
  href: "/compare",
  label: "返回对照台",
  detail: "继续处理案例结构与研究对照",
  ledgerLabel: "返回对照台重新定位",
  icon: Columns3,
};

const SETTINGS_RECOVERY: RecoveryTarget = {
  href: "/settings",
  label: "返回设置",
  detail: "继续检查本地配置与运行状态",
  ledgerLabel: "返回设置重新定位",
  icon: Settings,
};

function recoveryTargetForPath(pathname: string): RecoveryTarget {
  if (
    /^\/(?:case|cases|candidate-set|candidate-sets|chart|charts|new|new-chart)(?:\/|$)/iu.test(
      pathname,
    )
  ) {
    return CASES_RECOVERY;
  }
  if (
    /^\/(?:knowledge|source-rights-ledger|evidence-coverage-report)(?:\/|$)/iu.test(
      pathname,
    )
  ) {
    return KNOWLEDGE_RECOVERY;
  }
  if (
    /^\/(?:compare|research-query|pair-research|calendar-divergence-audit|transit-review-inbox)(?:\/|$)/iu.test(
      pathname,
    )
  ) {
    return COMPARE_RECOVERY;
  }
  if (
    /^\/(?:settings|data-management|boot-failure-recovery|orphaned-v13-recovery)(?:\/|$)/iu.test(
      pathname,
    )
  ) {
    return SETTINGS_RECOVERY;
  }
  return DASHBOARD_RECOVERY;
}

type RouteDiagnostic = {
  value: string;
  adjusted: boolean;
  escaped: boolean;
  redacted: boolean;
  pathRedacted: boolean;
  parameterRedacted: boolean;
  truncated: boolean;
  rawLength: number;
};

type AddressCopyState = {
  address: string;
  status: "copying" | "copied" | "failed";
};

function readRequestedHash(): string {
  return typeof window === "undefined" ? "" : window.location.hash;
}

function normalizedAddressKey(rawKey: string): {
  normalizedKey: string;
  collapsedKey: string;
} {
  let decodedKey = rawKey.replace(/\+/gu, " ");
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const nextDecodedKey = decodeURIComponent(decodedKey);
      if (nextDecodedKey === decodedKey) break;
      decodedKey = nextDecodedKey;
    } catch {
      break;
    }
  }

  const normalizedKey = decodedKey
    .normalize("NFKC")
    .replace(INVISIBLE_ADDRESS_CHARACTER_PATTERN, "")
    .trim()
    .toLocaleLowerCase("en-US");
  const collapsedKey = normalizedKey.replace(/[-_.\s\[\]]/gu, "");

  return { normalizedKey, collapsedKey };
}

function isSensitiveParameterKey(rawKey: string): boolean {
  const { normalizedKey, collapsedKey } = normalizedAddressKey(rawKey);

  return (
    /^(?:accesstoken|refreshtoken|idtoken|token|apikey|secret|clientsecret|password|passwd|authorization|auth|session|sessionid|credential|credentials|code|oauthcode)$/u.test(
      collapsedKey,
    ) ||
    /(?:accesstoken|refreshtoken|idtoken|apikey|clientsecret|privatekey|secret|password|passwd|authorization|auth|bearer|session|sessionid|credential|credentials|oauthcode|signature)$/u.test(
      collapsedKey,
    ) ||
    /(?:^|[-_.\s])(?:token|secret|password|passwd|auth|session|credential|code)(?:$|[-_.\s])/u.test(
      normalizedKey,
    )
  );
}

function isSensitivePathValueKey(rawKey: string): boolean {
  const { collapsedKey } = normalizedAddressKey(rawKey);
  return /^(?:accesstoken|refreshtoken|idtoken|token|apikey|secret|clientsecret|privatekey|password|passwd|session|sessionid|credential|credentials|oauthcode|resettoken|resetpasswordtoken|passwordresettoken|invitecode|verificationcode|recoverycode|magiclinktoken|signature)$/u.test(
    collapsedKey,
  );
}

function redactPathLikeValue(rawPath: string): { value: string; redacted: boolean } {
  const segments = rawPath.split("/");
  let redacted = false;

  for (let index = 0; index < segments.length - 1; index += 1) {
    if (!segments[index] || !segments[index + 1]) continue;
    if (!isSensitivePathValueKey(segments[index])) continue;
    segments[index + 1] = "<redacted>";
    redacted = true;
    index += 1;
  }

  return { value: segments.join("/"), redacted };
}

function redactSensitivePathValues(raw: string): { value: string; redacted: boolean } {
  const hashIndex = raw.indexOf("#");
  const beforeHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const rawFragment = hashIndex >= 0 ? raw.slice(hashIndex + 1) : "";
  const searchIndex = beforeHash.indexOf("?");
  const pathname = searchIndex >= 0 ? beforeHash.slice(0, searchIndex) : beforeHash;
  const search = searchIndex >= 0 ? beforeHash.slice(searchIndex) : "";
  const pathnameResult = redactPathLikeValue(pathname);

  if (hashIndex < 0) {
    return { value: `${pathnameResult.value}${search}`, redacted: pathnameResult.redacted };
  }

  const fragmentSearchIndex = rawFragment.indexOf("?");
  const fragmentPath = fragmentSearchIndex >= 0 ? rawFragment.slice(0, fragmentSearchIndex) : rawFragment;
  const fragmentSearch = fragmentSearchIndex >= 0 ? rawFragment.slice(fragmentSearchIndex) : "";
  const fragmentResult = redactPathLikeValue(fragmentPath);

  return {
    value: `${pathnameResult.value}${search}#${fragmentResult.value}${fragmentSearch}`,
    redacted: pathnameResult.redacted || fragmentResult.redacted,
  };
}

function redactSensitiveAddressValues(raw: string): {
  value: string;
  redacted: boolean;
  pathRedacted: boolean;
  parameterRedacted: boolean;
} {
  const pathResult = redactSensitivePathValues(raw);
  let parameterRedacted = false;
  const value = pathResult.value.replace(
    /([?&#;])([^=?&#;]+)=([^&#;]*)/gu,
    (match, delimiter: string, rawKey: string) => {
      if (!isSensitiveParameterKey(rawKey)) {
        return match;
      }
      parameterRedacted = true;
      return `${delimiter}${rawKey}=<redacted>`;
    },
  );

  return {
    value,
    redacted: pathResult.redacted || parameterRedacted,
    pathRedacted: pathResult.redacted,
    parameterRedacted,
  };
}

function visibleRouteDiagnostic(
  raw: string,
  rawLength: number,
  redaction: { pathRedacted: boolean; parameterRedacted: boolean },
): RouteDiagnostic {
  const redacted = redaction.pathRedacted || redaction.parameterRedacted;
  const escapedValue = raw.replace(
    INVISIBLE_ADDRESS_CHARACTER_PATTERN,
    (character) =>
      `\\u{${character.codePointAt(0)!.toString(16).padStart(4, "0")}}`,
  );
  const maximumLength = 1200;
  const escapedCharacters = Array.from(escapedValue);
  const truncated = escapedCharacters.length > maximumLength;
  const value =
    truncated
      ? `${escapedCharacters.slice(0, maximumLength).join("")}... [${rawLength} original chars]`
      : escapedValue;

  return {
    value,
    adjusted: escapedValue !== raw || redacted || truncated,
    escaped: escapedValue !== raw,
    redacted,
    pathRedacted: redaction.pathRedacted,
    parameterRedacted: redaction.parameterRedacted,
    truncated,
    rawLength,
  };
}

function routeDiagnosticSummary(diagnostic: RouteDiagnostic): string {
  const adjustments = [
    diagnostic.pathRedacted ? "已隐藏敏感路径值" : "",
    diagnostic.parameterRedacted ? "已隐藏敏感参数值" : "",
    diagnostic.escaped ? "已转义不可见字符" : "",
    diagnostic.truncated ? "已截断超长地址" : "",
  ].filter(Boolean);

  return adjustments.length > 0
    ? `${adjustments.join(" · ")} · 原始 ${diagnostic.rawLength} 字符`
    : "可安全原样显示";
}

export function NotFoundPage() {
  const location = useAppLocation();
  const [requestedHash, setRequestedHash] = useState(readRequestedHash);
  const [addressCopyState, setAddressCopyState] =
    useState<AddressCopyState | null>(null);
  const addressCopyOperationRef = useRef(false);
  const addressCopyEpochRef = useRef(0);
  const requestedPath = location.pathname || "/";
  const rawRequestedAddress = `${requestedPath}${location.search}${requestedHash}`;
  const redactedAddress = redactSensitiveAddressValues(rawRequestedAddress);
  const addressDiagnostic = visibleRouteDiagnostic(
    redactedAddress.value,
    Array.from(rawRequestedAddress).length,
    redactedAddress,
  );
  const requestedAddress = addressDiagnostic.value;
  const addressCopyTargetsCurrentAddress = addressCopyState?.address === requestedAddress;
  const addressCopyInFlight = addressCopyState?.status === "copying";
  const addressCopyStatus =
    addressCopyTargetsCurrentAddress
      ? addressCopyState.status
      : "idle";
  const addressCopyVisualState =
    addressCopyInFlight && !addressCopyTargetsCurrentAddress
      ? "copying_previous"
      : addressCopyStatus;
  const AddressCopyIcon =
    addressCopyStatus === "copied" ? Check : ClipboardCopy;
  const addressCopyLabel =
    addressCopyVisualState === "copying_previous"
      ? "正在完成上一地址复制"
      : addressCopyStatus === "copying"
      ? "正在复制处理后地址"
      : addressCopyStatus === "copied"
      ? "已复制处理后地址"
      : addressCopyStatus === "failed"
        ? "复制失败，点击重试"
        : "复制处理后地址";
  const addressCopyAnnouncement =
    addressCopyVisualState === "copying_previous"
      ? "上一地址的复制操作仍在完成，请稍候。"
      : addressCopyStatus === "copied"
      ? "处理后地址已复制到剪贴板。"
      : addressCopyStatus === "failed"
        ? "未能复制处理后地址，请重试或手动选择上方文本。"
        : "";
  const hasQuery = location.search.length > 0;
  const hasFragment = requestedHash.length > 0;
  const primaryRecovery = recoveryTargetForPath(requestedPath);
  const secondaryRecovery =
    primaryRecovery.href === "/" ? CASES_RECOVERY : DASHBOARD_RECOVERY;
  const PrimaryRecoveryIcon = primaryRecovery.icon;
  const SecondaryRecoveryIcon = secondaryRecovery.icon;

  useEffect(() => {
    const refreshHash = () => setRequestedHash(readRequestedHash());
    refreshHash();
    window.addEventListener("hashchange", refreshHash);
    return () => window.removeEventListener("hashchange", refreshHash);
  }, [location.pathname, location.search]);

  useEffect(() => () => {
    addressCopyEpochRef.current += 1;
    addressCopyOperationRef.current = false;
  }, []);

  async function copyVisibleAddress() {
    if (addressCopyOperationRef.current) return;
    addressCopyOperationRef.current = true;
    const copyEpoch = addressCopyEpochRef.current + 1;
    addressCopyEpochRef.current = copyEpoch;
    const addressToCopy = requestedAddress;
    setAddressCopyState({ address: addressToCopy, status: "copying" });

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(addressToCopy);
      if (addressCopyEpochRef.current === copyEpoch) {
        setAddressCopyState({ address: addressToCopy, status: "copied" });
      }
    } catch {
      if (addressCopyEpochRef.current === copyEpoch) {
        setAddressCopyState({ address: addressToCopy, status: "failed" });
      }
    } finally {
      if (addressCopyEpochRef.current === copyEpoch) {
        addressCopyOperationRef.current = false;
      }
    }
  }

  return (
    <section
      className="not-found not-found-page"
      data-has-query={hasQuery ? "true" : "false"}
      data-has-fragment={hasFragment ? "true" : "false"}
      data-address-adjusted={addressDiagnostic.adjusted ? "true" : "false"}
      data-address-redacted={addressDiagnostic.redacted ? "true" : "false"}
      data-address-path-redacted={addressDiagnostic.pathRedacted ? "true" : "false"}
      data-address-parameter-redacted={addressDiagnostic.parameterRedacted ? "true" : "false"}
      data-address-escaped={addressDiagnostic.escaped ? "true" : "false"}
      data-address-truncated={addressDiagnostic.truncated ? "true" : "false"}
      data-address-copy-state={addressCopyVisualState}
      data-recovery-target={primaryRecovery.href}
      data-release-identity="legacy-v13"
      data-db-generation="13"
      data-target-schema="13"
      data-migration-id="null"
      data-engineering-evidence-only="true"
      data-formal-validation="false"
      data-scientific-validation="false"
      data-write-reconciliation-required="false"
      data-mutation-epoch-bypassed="false"
      data-public-release-authorized="false"
      data-expert-truth-claimed="false"
      aria-labelledby="not-found-title"
      aria-describedby="not-found-description not-found-footnote"
    >
      <div className="not-found-page__copy">
        <p className="not-found-page__kicker">
          <span>404</span>
          {hasQuery || hasFragment ? "Address unresolved" : "Route unresolved"}
        </p>
        <h1 id="not-found-title">这条研究路径不存在</h1>
        <p id="not-found-description" className="not-found-page__lead">
          链接路径或查询参数可能已经变化，但本地案例不会因此被删除。这个页面不读取或改写研究资料，请从已登记入口重新定位。
        </p>
        <div className="not-found-page__boundary" role="note">
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>仅提供只读恢复导航</strong>
            <span>不自动重定向，不解释执行参数，不触碰本地研究资料。</span>
          </div>
        </div>

        <nav className="not-found-page__actions-nav" aria-labelledby="not-found-actions-title">
          <p id="not-found-actions-title" className="not-found-page__actions-label">重新定位</p>
          <p className="not-found-page__recovery-context">
            <Compass aria-hidden="true" />
            <span>
              根据请求路径，优先返回：<strong>{primaryRecovery.label}</strong>
            </span>
          </p>
          <div className="not-found-page__actions">
            <AppLink
              href={primaryRecovery.href}
              className="primary-action not-found-page__action not-found-page__action--primary"
            >
              <span className="not-found-page__action-icon"><PrimaryRecoveryIcon aria-hidden="true" /></span>
              <span className="not-found-page__action-copy">
                <strong>{primaryRecovery.label}</strong>
                <small>{primaryRecovery.detail}</small>
              </span>
              <ArrowRight className="not-found-page__action-arrow" aria-hidden="true" />
            </AppLink>
            <AppLink
              href={secondaryRecovery.href}
              className="secondary-action not-found-page__action"
            >
              <span className="not-found-page__action-icon"><SecondaryRecoveryIcon aria-hidden="true" /></span>
              <span className="not-found-page__action-copy">
                <strong>{secondaryRecovery.label}</strong>
                <small>{secondaryRecovery.detail}</small>
              </span>
              <ArrowRight className="not-found-page__action-arrow" aria-hidden="true" />
            </AppLink>
            <AppLink
              href="/help"
              className="secondary-action not-found-page__action"
            >
              <span className="not-found-page__action-icon"><CircleHelp aria-hidden="true" /></span>
              <span className="not-found-page__action-copy">
                <strong>查看使用帮助</strong>
                <small>核对入口、术语与操作边界</small>
              </span>
              <ArrowRight className="not-found-page__action-arrow" aria-hidden="true" />
            </AppLink>
          </div>
        </nav>

        <p id="not-found-footnote" className="not-found-page__footnote">
          如果地址来自旧书签，可保留上方经过安全显示处理的地址用于排查；敏感路径值与参数值会按当前规则默认隐藏，但脱敏结果不能证明原地址适合公开分享。
        </p>
      </div>

      <aside className="not-found-page__status" aria-labelledby="not-found-ledger-title">
        <div className="not-found-page__orbit" aria-hidden="true">
          <span className="not-found-page__orbit-code">404</span>
          <span className="not-found-page__orbit-ring not-found-page__orbit-ring--outer" />
          <span className="not-found-page__orbit-ring not-found-page__orbit-ring--inner" />
          <span className="not-found-page__orbit-point not-found-page__orbit-point--one" />
          <span className="not-found-page__orbit-point not-found-page__orbit-point--two" />
          <Compass />
          <span className="not-found-page__orbit-caption">Local route / unresolved</span>
        </div>

        <div className="not-found-page__ledger">
          <div className="not-found-page__ledger-heading">
            <h2 id="not-found-ledger-title">Path ledger</h2>
            <span>{addressDiagnostic.adjusted ? "只读 · 已安全显示" : hasQuery ? "只读 · 含查询" : "只读恢复"}</span>
          </div>
          <dl>
            <div data-ledger="path">
              <dt>请求地址</dt>
              <dd>
                <div className="not-found-page__address-readout">
                  <code
                    title={requestedAddress}
                    tabIndex={0}
                    role="region"
                    aria-label="经过安全处理的未命中地址"
                  >
                    {requestedAddress}
                  </code>
                  <button
                    type="button"
                    className="not-found-page__copy-address"
                    data-copy-state={addressCopyVisualState}
                    aria-label={addressCopyLabel}
                    aria-busy={addressCopyInFlight}
                    aria-describedby="not-found-address-copy-feedback"
                    disabled={addressCopyInFlight}
                    title="仅复制上方已经脱敏、转义和长度限制的显示文本"
                    onClick={() => void copyVisibleAddress()}
                  >
                    <AddressCopyIcon aria-hidden="true" />
                    <span aria-hidden="true">{addressCopyLabel}</span>
                  </button>
                  <span
                    id="not-found-address-copy-feedback"
                    className="not-found-page__copy-feedback"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {addressCopyAnnouncement}
                  </span>
                </div>
              </dd>
            </div>
            <div>
              <dt>诊断显示</dt>
              <dd>{routeDiagnosticSummary(addressDiagnostic)}</dd>
            </div>
            <div>
              <dt>地址校验</dt>
              <dd>未命中已登记页面</dd>
            </div>
            <div data-ledger="redaction" data-state={addressDiagnostic.pathRedacted ? "adjusted" : "unchanged"}>
              <dt>路径敏感值</dt>
              <dd>{addressDiagnostic.pathRedacted ? "已隐藏 · 仅保留键名与路由结构" : "未按当前规则检测到需隐藏的路径值"}</dd>
            </div>
            <div>
              <dt>查询参数</dt>
              <dd>
                {hasQuery
                  ? addressDiagnostic.parameterRedacted
                    ? "已保留参数名 · 敏感值已隐藏 · 未解释执行"
                    : "已保留 · 未解释执行"
                  : "无"}
              </dd>
            </div>
            <div>
              <dt>片段标识</dt>
              <dd>{hasFragment ? "已保留 · 未解释执行" : "无"}</dd>
            </div>
            <div>
              <dt>资料状态</dt>
              <dd>未读取或写入研究资料</dd>
            </div>
            <div>
              <dt>路由动作</dt>
              <dd>未自动重定向 · 未改写 URL</dd>
            </div>
            <div>
              <dt>发布基线</dt>
              <dd>legacy-v13 · Schema 13 · migration null</dd>
            </div>
            <div>
              <dt>证据边界</dt>
              <dd>工程证据不等于专家真值或公开发布授权</dd>
            </div>
            <div>
              <dt>恢复动作</dt>
              <dd>仅在用户选择入口后导航</dd>
            </div>
            <div>
              <dt>建议动作</dt>
              <dd>{primaryRecovery.ledgerLabel}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </section>
  );
}
