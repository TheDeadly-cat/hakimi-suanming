import type { PairStructureResearchProjection } from "@hakimi/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PairStructureReportExport } from "./pair-structure-report-export";

afterEach(cleanup);

function makeProjection(aliasA = "甲方冻结样本"): PairStructureResearchProjection {
  const caseA = "11111111-1111-4111-8111-111111111111";
  const caseB = "22222222-2222-4222-8222-222222222222";
  const participants = [
    {
      role: "A",
      item: {
        key: `A-${caseA}`,
        slotId: "A",
        caseId: caseA,
        caseAlias: aliasA,
        revision: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
          caseId: caseA,
          revisionNumber: 1,
          manifest: { resultHash: "a".repeat(64) }
        },
        revisionSnapshotDigest: "c".repeat(64),
        manualDirection: null
      },
      observationCount: 1,
      observations: [
        { id: "day_pillar", category: "pillars", label: "日柱", value: "甲子" }
      ],
      transit: {
        itemKey: `A-${caseA}`,
        status: "error",
        reasonCode: "TRANSIT_NOT_AVAILABLE",
        message: "测试夹具不展开运限。"
      }
    },
    {
      role: "B",
      item: {
        key: `B-${caseB}`,
        slotId: "B",
        caseId: caseB,
        caseAlias: "乙方冻结样本",
        revision: {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
          caseId: caseB,
          revisionNumber: 1,
          manifest: { resultHash: "b".repeat(64) }
        },
        revisionSnapshotDigest: "d".repeat(64),
        manualDirection: null
      },
      observationCount: 1,
      observations: [
        { id: "day_pillar", category: "pillars", label: "日柱", value: "乙丑" }
      ],
      transit: {
        itemKey: `B-${caseB}`,
        status: "error",
        reasonCode: "TRANSIT_NOT_AVAILABLE",
        message: "测试夹具不展开运限。"
      }
    }
  ];

  return {
    schemaVersion: "1.0.0",
    kind: "pair_structure_research_projection",
    policy: {
      mode: "parallel_facts_only",
      interpretationIncluded: false,
      scoreIncluded: false,
      crossChartDerivationIncluded: false,
      relationshipConclusionIncluded: false
    },
    targetInstant: "2024-02-04T08:27:07.000Z",
    participants,
    manifest: {
      algorithmId: "hakimi-comparison-core:pair-structure-research:v1",
      hashSchemaVersion: "1.0.0",
      semanticBoundary: "participant_facts_only",
      evidenceStatus: "engineering_projection",
      interpretationIncluded: false,
      scoreIncluded: false,
      compatibilityIncluded: false,
      crossChartDerivationIncluded: false,
      resultHash: "e".repeat(64)
    }
  } as unknown as PairStructureResearchProjection;
}

describe("PairStructureReportExport", () => {
  it("只为合法的 facts-only 双案例绑定展示冻结后交付入口", () => {
    const { container } = render(<PairStructureReportExport projection={makeProjection()} />);

    const participantA = container.querySelector('[data-identity="participant-a"]');
    const participantB = container.querySelector('[data-identity="participant-b"]');
    expect(participantA?.querySelector("dt")?.textContent).toBe("对象甲");
    expect(participantA?.querySelector("dd")?.textContent).toContain("甲方冻结样本 · R1");
    expect(participantB?.querySelector("dt")?.textContent).toBe("对象乙");
    expect(participantB?.querySelector("dd")?.textContent).toContain("乙方冻结样本 · R1");
    expect(screen.getByRole("button", { name: /准备去标识双案例 Markdown/ })).toBeTruthy();

    const fullAuditAction = screen.getByRole("button", {
      name: /准备完整审计 JSON/,
      hidden: true
    }) as HTMLButtonElement;
    expect(fullAuditAction.disabled).toBe(true);
  });

  it("案例别名变化会撤销完整审计确认，即使 manifest hash 没有变化", () => {
    const { rerender } = render(<PairStructureReportExport projection={makeProjection()} />);
    const confirmation = screen.getByRole("checkbox", { hidden: true }) as HTMLInputElement;

    fireEvent.click(confirmation);
    expect(confirmation.checked).toBe(true);

    rerender(<PairStructureReportExport projection={makeProjection("甲方冻结样本（已重命名）")} />);

    expect((screen.getByRole("checkbox", { hidden: true }) as HTMLInputElement).checked).toBe(false);
  });

  it("参与方重复 Case 时 fail-close，不暴露任何报告准备动作", () => {
    const projection = makeProjection();
    const duplicateCaseId = projection.participants[0].item.caseId;
    const invalidProjection = {
      ...projection,
      participants: [
        projection.participants[0],
        {
          ...projection.participants[1],
          item: {
            ...projection.participants[1].item,
            caseId: duplicateCaseId,
            revision: {
              ...projection.participants[1].item.revision,
              caseId: duplicateCaseId
            }
          }
        }
      ]
    } as PairStructureResearchProjection;

    const { container } = render(<PairStructureReportExport projection={invalidProjection} />);

    expect(container.querySelector(".pair-export-binding-error")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /准备去标识双案例 Markdown/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /准备完整审计 JSON/, hidden: true })).toBeNull();
  });
});
