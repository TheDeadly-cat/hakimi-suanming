import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  eventRecordSchema,
  eventTimeMigrationReceiptSchema,
  type EventRecord,
  type EventTimeMigrationEndpoint,
  type EventTimeMigrationInterpretation,
  type EventTimeMigrationSnapshot
} from "@hakimi/contracts";
import { resolveEventTimeContext } from "@hakimi/time-core";
import { EventTimeMigrationPanel, EventTimeMigrationRelations } from "./event-time-migration-panel";

const caseId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const revisionId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function legacyEvent(input: {
  id: string;
  precision: EventRecord["datePrecision"];
  startDate: string | null;
  endDate?: string | null;
}): EventRecord {
  return eventRecordSchema.parse({
    schemaVersion: "1.0.0",
    recordVersion: 2,
    id: input.id,
    caseId,
    revisionId,
    transitNodeRef: {
      namespace: "future-transit-node",
      nodeType: "year",
      nodeId: "legacy-year-node-01",
      timelineVersion: "legacy-fixture"
    },
    datePrecision: input.precision,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    title: `旧版${input.precision}事件`,
    tags: ["旧资料"],
    sourceRefs: [],
    feedback: "unreviewed",
    bodyFormat: "markdown",
    body: "原始记录保持不可改写",
    timeContext: { kind: "legacy_floating" },
    deletedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z"
  });
}

function eventHref(endpoint: EventTimeMigrationEndpoint) {
  return `/cases/${endpoint.snapshot.caseId}/events/${endpoint.recordId}`;
}

function migrationSnapshot(record: EventRecord): EventTimeMigrationSnapshot {
  return {
    formatVersion: "1.0.0",
    eventRecordVersion: 2,
    caseId: record.caseId,
    revisionId: record.revisionId,
    transitNodeRef: record.transitNodeRef,
    datePrecision: record.datePrecision,
    startDate: record.startDate,
    endDate: record.endDate,
    timeContext: record.timeContext
  };
}

function derivedResult(source: EventRecord, interpretation: EventTimeMigrationInterpretation) {
  const targetId = interpretation.kind === "calendar_date"
    ? "33333333-3333-4333-8333-333333333333"
    : interpretation.startDisambiguation === "earlier"
      ? "22222222-2222-4222-8222-222222222222"
      : "11111111-1111-4111-8111-111111111111";
  const target = eventRecordSchema.parse({
    ...source,
    id: targetId,
    timeContext: interpretation.kind === "calendar_date"
      ? resolveEventTimeContext({
          datePrecision: source.datePrecision,
          startDate: source.startDate,
          endDate: source.endDate
        })
      : resolveEventTimeContext({
          datePrecision: source.datePrecision,
          startDate: source.startDate,
          endDate: source.endDate,
          timeZone: interpretation.timeZone,
          startDisambiguation: interpretation.startDisambiguation,
          endDisambiguation: interpretation.endDisambiguation ?? undefined
        })
  });
  const receipt = eventTimeMigrationReceiptSchema.parse({
    schemaVersion: "1.0.0",
    recordVersion: 1,
    id: interpretation.kind === "calendar_date"
      ? "66666666-6666-4666-8666-666666666666"
      : interpretation.startDisambiguation === "earlier"
        ? "77777777-7777-4777-8777-777777777777"
        : "88888888-8888-4888-8888-888888888888",
    operation: "event_time_semantic_derivation",
    authorization: { kind: "explicit_local_user_confirmation" },
    source: {
      kind: "event",
      recordId: source.id,
      snapshot: migrationSnapshot(source),
      snapshotDigest: "a".repeat(64)
    },
    target: {
      kind: "event",
      recordId: target.id,
      snapshot: migrationSnapshot(target),
      snapshotDigest: "b".repeat(64)
    },
    interpretation,
    createdAt: "2026-08-02T10:00:00.000Z"
  });
  return { source, target, receipt };
}

describe("EventTimeMigrationPanel", () => {
  it("DST overlap 改选会撤销确认，成功后聚焦结果并展示冻结谱系与互链", async () => {
    const source = legacyEvent({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      precision: "minute",
      startDate: "2025-11-02T01:30"
    });
    const originalSource = structuredClone(source);
    const derive = vi.fn(async (interpretation: EventTimeMigrationInterpretation) => derivedResult(source, interpretation));
    const onDerived = vi.fn();

    render(
      <EventTimeMigrationPanel
        source={source}
        defaultTimeZone="Asia/Shanghai"
        existingReceipts={[]}
        buildEventHref={eventHref}
        derive={derive}
        onDerived={onDerived}
        onCancel={vi.fn()}
      />
    );

    const title = screen.getByRole("heading", { name: "解释旧事件时间" });
    await waitFor(() => expect(document.activeElement).toBe(title));
    const timeZoneInput = screen.getByLabelText(/事件发生地时区/);
    fireEvent.change(timeZoneInput, { target: { value: "America/New_York" } });
    expect(screen.getByRole("group", { name: /起始时间出现 DST 重叠/ })).toBeTruthy();

    const confirmation = screen.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }) as HTMLInputElement;
    const submit = screen.getByRole("button", { name: "生成并列事件" }) as HTMLButtonElement;
    expect(confirmation.disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /较早瞬时点/ }));
    expect(confirmation.disabled).toBe(false);
    fireEvent.click(confirmation);
    expect(confirmation.checked).toBe(true);
    expect(submit.disabled).toBe(false);

    fireEvent.change(timeZoneInput, { target: { value: "Asia/Shanghai" } });
    expect(confirmation.checked).toBe(false);
    fireEvent.change(timeZoneInput, { target: { value: "America/New_York" } });
    fireEvent.click(screen.getByRole("radio", { name: /较早瞬时点/ }));
    fireEvent.click(confirmation);
    expect(confirmation.checked).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: /较晚瞬时点/ }));
    expect(confirmation.checked).toBe(false);
    expect(submit.disabled).toBe(true);
    fireEvent.click(confirmation);
    fireEvent.click(submit);

    const successText = await screen.findByText("新事件和时间迁移凭证已生成，旧事件未改写");
    const success = successText.closest(".event-time-migration-success");
    expect(success).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(success));
    expect(derive).toHaveBeenCalledWith({
      kind: "zoned_minute",
      timeZone: "America/New_York",
      startDisambiguation: "later",
      endDisambiguation: null
    });
    expect(onDerived).toHaveBeenCalledTimes(1);
    expect(screen.getByText("新事件和时间迁移凭证已生成，旧事件未改写")).toBeTruthy();
    expect(screen.getAllByText(caseId).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(revisionId).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("namespace=future-transit-node").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("nodeType=year").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("nodeId=legacy-year-node-01").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: /打开源事件/ }).getAttribute("href")).toBe(eventHref(onDerived.mock.calls[0][0].receipt.source));
    expect(screen.getByRole("link", { name: /打开派生事件 11111111/ }).getAttribute("href")).toBe(eventHref(onDerived.mock.calls[0][0].receipt.target));

    expect(source).toEqual(originalSource);
    expect(onDerived.mock.calls[0][0].target.id).not.toBe(source.id);
    fireEvent.click(screen.getByRole("button", { name: "创建另一种时间解释" }));
    await waitFor(() => expect(document.activeElement).toBe(title));
  });

  it("DST gap 关闭确认与派生按钮，不做自动平移", async () => {
    const source = legacyEvent({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      precision: "minute",
      startDate: "2025-03-09T02:30"
    });
    const derive = vi.fn();

    render(
      <EventTimeMigrationPanel
        source={source}
        defaultTimeZone="America/New_York"
        existingReceipts={[]}
        buildEventHref={eventHref}
        derive={derive}
        onDerived={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(await screen.findByText("起始时间落在 DST 空档")).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "生成并列事件" }) as HTMLButtonElement).disabled).toBe(true);
    expect(derive).not.toHaveBeenCalled();
  });

  it("非分钟旧记录只派生 calendar_date，并保持 IANA、DST、UTC 不适用", async () => {
    const source = legacyEvent({
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      precision: "day",
      startDate: "2022-06-18"
    });
    const derive = vi.fn(async (interpretation: EventTimeMigrationInterpretation) => derivedResult(source, interpretation));

    render(
      <EventTimeMigrationPanel
        source={source}
        defaultTimeZone="Asia/Shanghai"
        existingReceipts={[]}
        buildEventHref={eventHref}
        derive={derive}
        onDerived={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/事件发生地时区/)).toBeNull();
    expect(screen.getByText(/日历日期不适用 IANA 时区、DST、UTC 偏移或标准 UTC/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }));
    fireEvent.click(screen.getByRole("button", { name: "生成并列事件" }));
    await screen.findByText("新事件和时间迁移凭证已生成，旧事件未改写");
    expect(derive).toHaveBeenCalledWith({ kind: "calendar_date" });
    const result = await derive.mock.results[0].value;
    expect(result.target.timeContext).toEqual({ kind: "calendar_date" });
  });

  it("只阻止完全相同解释，已有 earlier 时仍允许选择 later", async () => {
    const source = legacyEvent({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      precision: "minute",
      startDate: "2025-11-02T01:30"
    });
    const existing = derivedResult(source, {
      kind: "zoned_minute",
      timeZone: "America/New_York",
      startDisambiguation: "earlier",
      endDisambiguation: null
    });

    render(
      <EventTimeMigrationPanel
        source={source}
        defaultTimeZone="America/New_York"
        existingReceipts={[existing.receipt]}
        buildEventHref={eventHref}
        derive={vi.fn()}
        onDerived={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("radio", { name: /较早瞬时点/ }));
    expect(screen.getByText("这一时间解释已有并列事件")).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }) as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: /较晚瞬时点/ }));
    expect(screen.queryByText("这一时间解释已有并列事件")).toBeNull();
    expect((screen.getByRole("checkbox", { name: /保留旧事件并生成新 ID/ }) as HTMLInputElement).disabled).toBe(false);
  });

  it("可从事件关系展开完整凭证并复核冻结谱系", () => {
    const source = legacyEvent({
      id: "99999999-9999-4999-8999-999999999999",
      precision: "day",
      startDate: "2022-06-18"
    });
    const result = derivedResult(source, { kind: "calendar_date" });

    render(
      <EventTimeMigrationRelations
        receipts={[result.receipt]}
        currentEventId={source.id}
        buildEventHref={eventHref}
      />
    );

    const disclosure = screen.getByText("展开完整迁移凭证").closest("details");
    expect(disclosure).not.toBeNull();
    fireEvent.click(within(disclosure!).getByText("展开完整迁移凭证"));
    expect(within(disclosure!).getAllByText(caseId)).toHaveLength(2);
    expect(within(disclosure!).getAllByText(revisionId)).toHaveLength(2);
    expect(within(disclosure!).getAllByText("namespace=future-transit-node")).toHaveLength(2);
    expect(within(disclosure!).getAllByText("nodeType=year")).toHaveLength(2);
    expect(within(disclosure!).getAllByText("nodeId=legacy-year-node-01")).toHaveLength(2);
  });
});
