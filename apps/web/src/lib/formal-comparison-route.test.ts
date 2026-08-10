import { describe, expect, it } from "vitest";
import {
  FormalComparisonRouteError,
  currentFormalComparisonUtcMinuteInstant,
  parseFormalComparisonRoute,
  serializeFormalComparisonRoute
} from "./formal-comparison-route";

const CASE_A = "11111111-1111-4111-8111-111111111111";
const REVISION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const CASE_B = "22222222-2222-4222-8222-222222222222";
const REVISION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const CASE_C = "33333333-3333-4333-8333-333333333333";
const REVISION_C = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
const CASE_D = "44444444-4444-4444-8444-444444444444";
const REVISION_D = "dddddddd-dddd-4ddd-8ddd-ddddddddddd4";
const AT = "2026-08-02T09:15:00.000Z";

describe("formal comparison route", () => {
  it("稳定往返四个确切 Revision、UTC 与人工顺逆", () => {
    const state = {
      slots: [
        { caseId: CASE_A, revisionId: REVISION_A, manualDirection: "forward" as const },
        { caseId: CASE_A, revisionId: REVISION_B, manualDirection: null },
        { caseId: CASE_C, revisionId: REVISION_C, manualDirection: "backward" as const },
        { caseId: CASE_D, revisionId: REVISION_D, manualDirection: null }
      ],
      atInstant: AT,
      focusSlotId: "C" as const
    };
    const route = serializeFormalComparisonRoute(state);
    expect(route).toContain("item=revision%3A11111111-1111-4111-8111-111111111111%3Aaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
    expect(route).toContain("&dir=A%3Aforward&dir=C%3Abackward");
    expect(route).toMatch(/&focus=C$/);
    expect(parseFormalComparisonRoute(new URL(route, "https://local.test").search, AT)).toEqual(state);
  });

  it("允许空白入口和一个确切 Revision，但不猜测 Revision", () => {
    expect(parseFormalComparisonRoute("", AT)).toEqual({
      slots: [{ caseId: null, revisionId: null, manualDirection: null }],
      atInstant: AT,
      focusSlotId: "B"
    });
    expect(parseFormalComparisonRoute(`?item=revision:${CASE_A}:${REVISION_A}`, AT).slots).toEqual([
      { caseId: CASE_A, revisionId: REVISION_A, manualDirection: null }
    ]);
  });

  it("只兼容同时包含合法 case 与 revision 的旧版确切链接", () => {
    expect(parseFormalComparisonRoute(`?case=${CASE_A}&revision=${REVISION_A}&at=${AT}`, AT)).toEqual({
      slots: [{ caseId: CASE_A, revisionId: REVISION_A, manualDirection: null }],
      atInstant: AT,
      focusSlotId: "B"
    });
    expect(() => parseFormalComparisonRoute(`?case=${CASE_A}`, AT)).toThrow(/未回退到最新修订/);
    expect(() => parseFormalComparisonRoute(`?case=${CASE_A}&revision=bad`, AT)).toThrow(/未回退到最新修订/);
  });

  it.each([
    [`?item=revision:${CASE_A}:bad`, /不是确切/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=broken&item=revision:${CASE_B}:${REVISION_B}`, /第 2 个 item/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_B}:${REVISION_B}&item=revision:${CASE_C}:${REVISION_C}&item=revision:${CASE_D}:${REVISION_D}&item=revision:${CASE_A}:${REVISION_B}`, /最多只能包含四个/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_B}:${REVISION_A}`, /不能重复同一个 Revision/],
    [`?item=revision:${CASE_A}:${REVISION_A}&case=${CASE_A}&revision=${REVISION_A}`, /不能混用/],
    [`?item=revision:${CASE_A}:${REVISION_A}&dir=B:forward`, /尚未选择的对照位 B/],
    [`?item=revision:${CASE_A}:${REVISION_A}&dir=A:forward&dir=A:backward`, /重复声明/],
    [`?at=2026-08-02T09:15:30.000Z`, /规范 UTC/],
    [`?at=2026-02-30T09:15:00.000Z`, /规范 UTC/],
    [`?at=${AT}&at=${AT}`, /只能包含一个 at/],
    [`?item=revision:${CASE_A}:${REVISION_A}&focus=B`, /尚未选择的对照位 B/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_B}:${REVISION_B}&focus=C`, /尚未选择的对照位 C/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_B}:${REVISION_B}&focus=b`, /精确大写 B、C 或 D/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_B}:${REVISION_B}&focus=A`, /精确大写 B、C 或 D/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_B}:${REVISION_B}&focus=C&focus=C`, /只能包含一个 focus/],
    ["?unknown=1", /未知参数/]
  ])("非法、超量或含糊链接失败关闭：%s", (search, message) => {
    expect(() => parseFormalComparisonRoute(search, AT)).toThrow(message);
  });

  it("默认瞬时点截断到当前 UTC 分钟", () => {
    expect(currentFormalComparisonUtcMinuteInstant(new Date("2026-08-02T09:15:59.999Z"))).toBe(AT);
  });

  it("序列化时拒绝超量、重复、跳空和无效瞬时点", () => {
    const exact = { caseId: CASE_A, revisionId: REVISION_A, manualDirection: null };
    expect(() => serializeFormalComparisonRoute({
      slots: [exact, exact],
      atInstant: AT,
      focusSlotId: "B"
    })).toThrow(/重复序列化/);
    expect(() => serializeFormalComparisonRoute({
      slots: [
        { caseId: null, revisionId: null, manualDirection: null },
        { caseId: CASE_B, revisionId: REVISION_B, manualDirection: null }
      ],
      atInstant: AT,
      focusSlotId: "B"
    })).toThrow(/空白对照位之后/);
    expect(() => serializeFormalComparisonRoute({
      slots: [exact],
      atInstant: "2026-08-02T09:15:30.000Z",
      focusSlotId: "B"
    })).toThrow(FormalComparisonRouteError);
    expect(() => serializeFormalComparisonRoute({
      slots: [exact, exact, exact, exact, exact],
      atInstant: AT,
      focusSlotId: "B"
    })).toThrow(/最多只能序列化四个/);
    expect(() => serializeFormalComparisonRoute({
      slots: [
        exact,
        { caseId: CASE_B, revisionId: REVISION_B, manualDirection: null }
      ],
      atInstant: AT,
      focusSlotId: "D"
    })).toThrow(/尚未选择的活动比较盘 D/);
  });

  it("缺省和显式 B 均规范化为无 focus，C/D 才持久化显示焦点", () => {
    const items = [
      `item=revision:${CASE_A}:${REVISION_A}`,
      `item=revision:${CASE_B}:${REVISION_B}`,
      `item=revision:${CASE_C}:${REVISION_C}`,
      `item=revision:${CASE_D}:${REVISION_D}`
    ].join("&");
    expect(parseFormalComparisonRoute(`?${items}&at=${AT}`, AT).focusSlotId).toBe("B");
    expect(parseFormalComparisonRoute(`?${items}&at=${AT}&focus=B`, AT).focusSlotId).toBe("B");

    const explicitB = serializeFormalComparisonRoute({
      slots: [
        { caseId: CASE_A, revisionId: REVISION_A, manualDirection: null },
        { caseId: CASE_B, revisionId: REVISION_B, manualDirection: null }
      ],
      atInstant: AT,
      focusSlotId: "B"
    });
    expect(new URL(explicitB, "https://local.test").searchParams.has("focus")).toBe(false);
    expect(parseFormalComparisonRoute(`?${items}&at=${AT}&focus=D`, AT).focusSlotId).toBe("D");
  });
});
