import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calculateChart } from "@hakimi/bazi-core";
import type { BirthInput, RevisionRecord } from "@hakimi/contracts";
import {
  createRevisionCalculationReceipt,
  CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
  type RevisionCalculationReceipt
} from "@hakimi/revision-replay";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { caseRepository } from "@hakimi/storage";
import { RevisionCalculationReceiptsPanel } from "./revision-calculation-receipts-panel";

const birth: BirthInput = {
  schemaVersion: "1.0.0",
  calendarType: "gregorian",
  date: "1995-08-18",
  time: "08:26:00",
  timePrecision: "exact_second",
  timeZone: "Asia/Shanghai",
  sex: "male",
  lunarLeapMonth: false,
  location: { label: "上海", latitude: 31.2304, longitude: 121.4737, precision: "coordinates" },
  sourceNote: ""
};

let revision: RevisionRecord;
let receipts: readonly RevisionCalculationReceipt[];

beforeAll(async () => {
  const chart = await calculateChart(birth, WORKING_DEFAULT_RULE_PROFILE);
  revision = {
    schemaVersion: "1.0.0",
    id: "11111111-1111-4111-8111-111111111111",
    caseId: "22222222-2222-4222-8222-222222222222",
    revisionNumber: 1,
    createdAt: "2026-08-03T00:00:00.000Z",
    input: chart.input,
    timeCalibration: chart.timeCalibration,
    ruleProfile: chart.ruleProfile,
    luckCycleRuleSnapshot: chart.luckCycleRuleSnapshot,
    facts: chart.facts,
    manifest: chart.manifest
  };
  receipts = [
    await createRevisionCalculationReceipt(
      revision,
      { profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE },
      {
        id: "33333333-3333-4333-8333-333333333333",
        createdAt: revision.createdAt,
        captureKind: "revision_creation_baseline"
      }
    ),
    await createRevisionCalculationReceipt(
      revision,
      {
        profile: CURRENT_EXPLICIT_DERIVED_REPLAY_PROFILE,
        atInstant: "2026-05-01T00:00:00.000Z"
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        createdAt: "2026-08-03T01:00:00.000Z",
        captureKind: "explicit_calculation_snapshot"
      }
    )
  ];
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RevisionCalculationReceiptsPanel", () => {
  it("shows verified baseline and explicit history, then re-reads both records for exact replay", async () => {
    vi.spyOn(caseRepository, "listRevisionCalculationReceipts").mockResolvedValue([...receipts]);
    const getReceipt = vi.spyOn(caseRepository, "getRevisionCalculationReceipt")
      .mockResolvedValue(receipts[1] ?? null);
    const getRevision = vi.spyOn(caseRepository, "getRevision").mockResolvedValue(revision);
    render(<RevisionCalculationReceiptsPanel revisionId={revision.id} refreshToken={0} />);

    expect(await screen.findAllByText("2 条收据完整性已核对")).toHaveLength(2);
    const list = screen.getByRole("list", { name: /历史计算收据列表/ });
    expect(list.querySelectorAll(":scope > .revision-receipt-card")).toHaveLength(2);
    expect(within(list).getByText("创建基线")).not.toBeNull();
    expect(within(list).getByText("显式计算快照")).not.toBeNull();
    expect(within(list).getAllByText("内容验真通过")).toHaveLength(2);
    expect(within(list).getAllByText("尚未执行")).toHaveLength(2);
    expect(screen.getAllByText(/不是数字签名/)).toHaveLength(2);

    const explicitCard = within(list).getByText("显式计算快照").closest("li");
    expect(explicitCard).not.toBeNull();
    await userEvent.click(within(explicitCard!).getByText("查看绑定与精确复演"));
    await userEvent.click(within(explicitCard!).getByText("完整摘要核对值"));
    expect(within(explicitCard!).getByText(receipts[1]!.receiptDigest)).not.toBeNull();
    expect(within(explicitCard!).getByText(receipts[1]!.sourceRevision.natalResultHash)).not.toBeNull();
    await userEvent.click(within(explicitCard!).getByRole("button", { name: "按收据保存 Profile 精确复演" }));

    expect(await within(explicitCard!).findByText("历史保存输出与保存版本精确复演逐组件一致")).not.toBeNull();
    expect(within(explicitCard!).getByText("保存输出一致")).not.toBeNull();
    expect(getReceipt).toHaveBeenCalledWith(receipts[1]?.id);
    expect(getRevision).toHaveBeenCalledWith(revision.id);
  });

  it("keeps a failed exact replay unconfirmed and retries from fresh repository reads", async () => {
    vi.spyOn(caseRepository, "listRevisionCalculationReceipts").mockResolvedValue([...receipts]);
    const getReceipt = vi.spyOn(caseRepository, "getRevisionCalculationReceipt")
      .mockRejectedValueOnce(new Error("Bearer abc123 C:\\secret\\receipt.json https://example.test/replay"))
      .mockResolvedValue(receipts[1] ?? null);
    vi.spyOn(caseRepository, "getRevision").mockResolvedValue(revision);
    render(<RevisionCalculationReceiptsPanel revisionId={revision.id} refreshToken={0} />);

    const list = await screen.findByRole("list", { name: /历史计算收据列表/ });
    const explicitCard = within(list).getByText("显式计算快照").closest("li");
    expect(explicitCard).not.toBeNull();
    await userEvent.click(within(explicitCard!).getByText("查看绑定与精确复演"));
    await userEvent.click(within(explicitCard!).getByRole("button", { name: "按收据保存 Profile 精确复演" }));

    expect(await within(explicitCard!).findByText("精确复演未完成")).not.toBeNull();
    expect(within(explicitCard!).getByText("失败关闭")).not.toBeNull();
    expect(within(explicitCard!).getByText(/凭据已隐藏/)).not.toBeNull();
    expect(within(explicitCard!).queryByText(/abc123/)).toBeNull();
    const retry = within(explicitCard!).getByRole("button", { name: "重新读取并精确复演" });
    await userEvent.click(retry);

    expect(await within(explicitCard!).findByText("历史保存输出与保存版本精确复演逐组件一致")).not.toBeNull();
    expect(getReceipt).toHaveBeenCalledTimes(2);
  });

  it("states that an older Revision remains empty instead of backfilling outputs", async () => {
    vi.spyOn(caseRepository, "listRevisionCalculationReceipts").mockResolvedValue([]);
    render(<RevisionCalculationReceiptsPanel revisionId={revision.id} refreshToken={0} />);

    expect(await screen.findByText("此 Revision 没有历史计算收据")).not.toBeNull();
    expect(screen.getByText(/不会用今天的算法回填旧输出/)).not.toBeNull();
  });

  it("fails the whole history closed when any receipt cannot be verified", async () => {
    vi.spyOn(caseRepository, "listRevisionCalculationReceipts")
      .mockRejectedValue(new Error("receipt digest mismatch"));
    render(<RevisionCalculationReceiptsPanel revisionId={revision.id} refreshToken={0} />);

    expect(await screen.findByText("历史收据未展示")).not.toBeNull();
    expect(screen.getByText(/任一记录无法完成内部完整性核对时，当前索引都会失败关闭/)).not.toBeNull();
    await waitFor(() => expect(screen.queryByRole("list", { name: "历史计算收据列表" })).toBeNull());
  });
});
