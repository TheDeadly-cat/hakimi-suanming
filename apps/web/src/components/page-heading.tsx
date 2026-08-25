import { Children, useId, type ReactNode } from "react";
import { safeVisibleText } from "../lib/visible-text";
import "./interface-primitives.css";

export type PageHeadingProps = Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  actionsLabel?: string;
}>;

const PAGE_HEADING_SAFETY_ATTRIBUTES = {
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
  "data-heading-authority": "presentation-only",
  "data-action-authority": "inherited-not-granted-by-heading",
  "data-mutation-epoch-bypassed": "false",
  "data-mutation-epoch-state": "not_bypassed",
  "data-result": "null",
} as const;

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  actionsLabel,
}: PageHeadingProps) {
  const headingId = useId();
  const titleId = `${headingId}-title`;
  const descriptionId = `${headingId}-description`;
  const visibleTitle = safeVisibleText(title, "未命名页面", 180);
  const visibleEyebrow = eyebrow ? safeVisibleText(eyebrow, "", 100) : "";
  const visibleDescription = description ? safeVisibleText(description, "", 800) : "";
  const normalizedActions = Children.toArray(actions);
  const hasActions = normalizedActions.length > 0;
  const visibleActionsLabel = hasActions
    ? safeVisibleText(actionsLabel, `${visibleTitle}页面操作`, 180)
    : undefined;
  const actionsLabelBindingState = !hasActions
    ? "not-applicable"
    : actionsLabel
      ? visibleActionsLabel === actionsLabel ? "bound" : "sanitized"
      : "generated";
  const copySanitized = visibleTitle !== title
    || visibleEyebrow !== (eyebrow ?? "")
    || visibleDescription !== (description ?? "")
    || (hasActions && actionsLabel ? visibleActionsLabel !== actionsLabel : false);
  return (
    <header
      className="page-heading"
      data-action-count={normalizedActions.length}
      data-actions-label-state={actionsLabelBindingState}
      data-copy-binding-state={copySanitized ? "sanitized" : "bound"}
      data-has-actions={hasActions ? "true" : "false"}
      data-has-description={visibleDescription ? "true" : "false"}
      data-has-eyebrow={visibleEyebrow ? "true" : "false"}
      aria-labelledby={titleId}
      aria-describedby={visibleDescription ? descriptionId : undefined}
      {...PAGE_HEADING_SAFETY_ATTRIBUTES}
    >
      <div className="page-heading__copy">
        {visibleEyebrow ? <p className="eyebrow" dir="auto">{visibleEyebrow}</p> : null}
        <h1 id={titleId} dir="auto">{visibleTitle}</h1>
        {visibleDescription ? <p id={descriptionId} className="page-description" dir="auto">{visibleDescription}</p> : null}
      </div>
      {hasActions ? (
        <div
          className="page-actions"
          data-action-count={normalizedActions.length}
          data-label-binding-state={actionsLabelBindingState}
          role="group"
          aria-label={visibleActionsLabel}
        >
          {normalizedActions}
        </div>
      ) : null}
      <span className="page-heading__axis" aria-hidden="true"><i /><i /></span>
    </header>
  );
}
