import { describe, expect, it } from "vitest";
import { formalComparisonRequestSchema } from "./index";

const CASE_IDS = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555"
] as const;

const REVISION_IDS = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
] as const;

function request(count: number) {
  const slotIds = ["A", "B", "C", "D"] as const;
  return {
    schemaVersion: "1.0.0",
    baselineSlotId: "A",
    slots: Array.from({ length: count }, (_, index) => ({
      slotId: slotIds[index] ?? "D",
      caseId: CASE_IDS[index],
      revisionId: REVISION_IDS[index],
      manualDirection: null
    })),
    transit: { mode: "same_instant", atInstant: "2024-02-04T08:27:07.000Z" }
  };
}

describe("formalComparisonRequestSchema", () => {
  it.each([2, 3, 4])("接受 %s 个稳定正式修订槽位", (count) => {
    expect(formalComparisonRequestSchema.parse(request(count)).slots).toHaveLength(count);
  });

  it("拒绝 1/5 个槽位、重复修订和缺失基准位", () => {
    expect(() => formalComparisonRequestSchema.parse(request(1))).toThrow();
    expect(() => formalComparisonRequestSchema.parse(request(5))).toThrow();

    const duplicate = request(2);
    duplicate.slots[1].revisionId = duplicate.slots[0].revisionId;
    expect(() => formalComparisonRequestSchema.parse(duplicate)).toThrow(/不能重复加入/);

    const missingBaseline = { ...request(2), baselineSlotId: "D" };
    expect(() => formalComparisonRequestSchema.parse(missingBaseline)).toThrow(/基准位/);
  });

  it("拒绝未知字段和不带偏移的本地钟表时间", () => {
    expect(() => formalComparisonRequestSchema.parse({ ...request(2), scoreMode: "缘分" })).toThrow();
    expect(() => formalComparisonRequestSchema.parse({
      ...request(2),
      transit: { mode: "same_instant", atInstant: "2024-02-04T08:27:07" }
    })).toThrow();
  });
});
