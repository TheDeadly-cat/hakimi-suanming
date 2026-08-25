import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode
} from "react";
import { safeVisibleText } from "../lib/visible-text";
import "./interface-primitives.css";

export type StatusPillTone = "neutral" | "jade" | "cinnabar" | "info" | "warning";
export type StatusPillAnnouncement = "off" | "polite" | "assertive";

export type StatusPillProps = Readonly<{
  tone?: StatusPillTone;
  children: ReactNode;
  announcement?: StatusPillAnnouncement;
  ariaLabel?: string;
}>;

const STATUS_PILL_TONES = new Set<StatusPillTone>(["neutral", "jade", "cinnabar", "info", "warning"]);
const STATUS_PILL_ANNOUNCEMENTS = new Set<StatusPillAnnouncement>(["off", "polite", "assertive"]);
const MAX_STATUS_PILL_NODES = 16;
const MAX_STATUS_PILL_FRAGMENT_DEPTH = 6;
const MAX_STATUS_PILL_TEXT_LENGTH = 180;
const STATUS_PILL_FALLBACK_LABEL = "状态未提供";

const STATUS_PILL_SAFETY_ATTRIBUTES = {
  "data-release-identity": "legacy-v13",
  "data-release-family": "legacy-v13",
  "data-schema-family": "legacy-v13",
  "data-db-generation": "13",
  "data-target-schema": "13",
  "data-migration-id": "null",
  "data-engineering-evidence-only": "true",
  "data-formal-truth-established": "false",
  "data-expert-conclusion-established": "false",
  "data-expert-truth-claimed": "false",
  "data-scientific-validity-claimed": "false",
  "data-public-release-authorized": "false",
  "data-formal-activation-allowed": "false",
  "data-tone-conveys-authority": "false",
  "data-color-only-status": "false",
  "data-expert-authority-conveyed": "false",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed"
} as const;

type StatusPillLabelState = "bound" | "sanitized" | "structured" | "recovered";

type StatusPillNormalizationState = {
  nodeCount: number;
  remainingTextLength: number;
  sanitized: boolean;
  structured: boolean;
  rejected: boolean;
};

type NormalizedStatusPillContent = {
  content: ReactNode;
  labelState: StatusPillLabelState;
  nodeCount: number;
};

function normalizeStatusPillNodes(
  value: ReactNode,
  depth: number,
  state: StatusPillNormalizationState
): ReactNode[] {
  if (depth > MAX_STATUS_PILL_FRAGMENT_DEPTH) {
    state.rejected = true;
    return [];
  }

  let nodes: ReactNode[];
  try {
    nodes = Children.toArray(value);
  } catch {
    state.rejected = true;
    return [];
  }

  const normalized: ReactNode[] = [];
  for (const node of nodes) {
    if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment) {
      const fragment = node as ReactElement<{ children?: ReactNode }>;
      const fragmentChildren = normalizeStatusPillNodes(fragment.props.children, depth + 1, state);
      if (state.rejected) return [];
      if (fragmentChildren.length) normalized.push(cloneElement(fragment, undefined, fragmentChildren));
      continue;
    }

    if (state.nodeCount >= MAX_STATUS_PILL_NODES) {
      state.rejected = true;
      return [];
    }
    state.nodeCount += 1;

    if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
      const rawText = String(node);
      const visibleText = state.remainingTextLength > 0
        ? safeVisibleText(rawText, "", state.remainingTextLength)
        : "";
      if (visibleText !== rawText) state.sanitized = true;
      if (visibleText) {
        normalized.push(visibleText);
        state.remainingTextLength = Math.max(
          0,
          state.remainingTextLength - Array.from(visibleText).length
        );
      }
      continue;
    }

    if (isValidElement(node)) {
      state.structured = true;
      normalized.push(node);
      continue;
    }

    state.rejected = true;
    return [];
  }
  return normalized;
}

function normalizeStatusPillContent(value: ReactNode): NormalizedStatusPillContent {
  const state: StatusPillNormalizationState = {
    nodeCount: 0,
    remainingTextLength: MAX_STATUS_PILL_TEXT_LENGTH,
    sanitized: false,
    structured: false,
    rejected: false
  };
  const content = normalizeStatusPillNodes(value, 0, state);
  if (state.rejected || content.length === 0) {
    return {
      content: STATUS_PILL_FALLBACK_LABEL,
      labelState: "recovered",
      nodeCount: state.nodeCount
    };
  }
  return {
    content,
    labelState: state.sanitized ? "sanitized" : state.structured ? "structured" : "bound",
    nodeCount: state.nodeCount
  };
}

export function StatusPill({
  tone = "neutral",
  children,
  announcement = "off",
  ariaLabel,
}: StatusPillProps) {
  const toneIsKnown = STATUS_PILL_TONES.has(tone);
  const announcementIsKnown = STATUS_PILL_ANNOUNCEMENTS.has(announcement);
  const resolvedTone: StatusPillTone = toneIsKnown ? tone : "neutral";
  const resolvedAnnouncement: StatusPillAnnouncement = announcementIsKnown ? announcement : "off";
  const normalizedContent = normalizeStatusPillContent(children);
  const ariaLabelProvided = ariaLabel !== undefined;
  const sanitizedAriaLabel = ariaLabelProvided
    ? safeVisibleText(ariaLabel, "", MAX_STATUS_PILL_TEXT_LENGTH)
    : "";
  const visibleAriaLabel = sanitizedAriaLabel || undefined;
  const ariaLabelState = !ariaLabelProvided
    ? "not-provided"
    : !visibleAriaLabel
      ? "rejected"
      : visibleAriaLabel === ariaLabel
        ? "bound"
        : "sanitized";
  const bindingState = !toneIsKnown
    || !announcementIsKnown
    || normalizedContent.labelState === "recovered"
    || ariaLabelState === "rejected"
    ? "recovered"
    : normalizedContent.labelState === "sanitized" || ariaLabelState === "sanitized"
      ? "sanitized"
      : normalizedContent.labelState;
  const liveRole =
    resolvedAnnouncement === "assertive"
      ? "alert"
      : resolvedAnnouncement === "polite"
        ? "status"
        : undefined;

  return (
    <span
      className={`status-pill status-pill--${resolvedTone}`}
      data-tone={resolvedTone}
      data-announcement={resolvedAnnouncement}
      data-binding-state={bindingState}
      data-label-state={normalizedContent.labelState}
      data-label-node-count={normalizedContent.nodeCount}
      data-aria-label-state={ariaLabelState}
      {...STATUS_PILL_SAFETY_ATTRIBUTES}
      role={liveRole}
      aria-label={visibleAriaLabel}
      aria-live={resolvedAnnouncement === "off" ? undefined : resolvedAnnouncement}
      aria-atomic={liveRole ? true : undefined}
    >
      <span className="status-pill__dot" aria-hidden="true" />
      <span className="status-pill__label" dir="auto">{normalizedContent.content}</span>
    </span>
  );
}
