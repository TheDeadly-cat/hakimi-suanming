import { describe, expect, it } from "vitest";
import {
  PairResearchRouteError,
  currentCanonicalUtcMinuteInstant,
  parsePairResearchRoute,
  serializePairResearchRoute
} from "./pair-research-route";

const CASE_A = "11111111-1111-4111-8111-111111111111";
const REVISION_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const CASE_B = "22222222-2222-4222-8222-222222222222";
const REVISION_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const AT = "2026-08-02T09:15:00.000Z";

describe("pair research route", () => {
  it("稳定往返两个不同 Case、确切 Revision、UTC 和人工顺逆", () => {
    const route = serializePairResearchRoute({
      slots: [
        { caseId: CASE_A, revisionId: REVISION_A, manualDirection: "forward" },
        { caseId: CASE_B, revisionId: REVISION_B, manualDirection: "backward" }
      ],
      atInstant: AT
    });
    expect(route).toBe(
      "/compare/pair?item=revision%3A11111111-1111-4111-8111-111111111111%3Aaaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1" +
      "&item=revision%3A22222222-2222-4222-8222-222222222222%3Abbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2" +
      "&at=2026-08-02T09%3A15%3A00.000Z&dir=A%3Aforward&dir=B%3Abackward"
    );
    expect(parsePairResearchRoute(new URL(route, "https://local.test").search, AT)).toEqual({
      slots: [
        { caseId: CASE_A, revisionId: REVISION_A, manualDirection: "forward" },
        { caseId: CASE_B, revisionId: REVISION_B, manualDirection: "backward" }
      ],
      atInstant: AT
    });
  });

  it("允许空白入口或只预填对象 A，但不猜测 Revision", () => {
    expect(parsePairResearchRoute("", AT)).toEqual({
      slots: [
        { caseId: null, revisionId: null, manualDirection: null },
        { caseId: null, revisionId: null, manualDirection: null }
      ],
      atInstant: AT
    });
    expect(parsePairResearchRoute(`?item=revision:${CASE_A}:${REVISION_A}`, AT).slots).toEqual([
      { caseId: CASE_A, revisionId: REVISION_A, manualDirection: null },
      { caseId: null, revisionId: null, manualDirection: null }
    ]);
  });

  it.each([
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_A}:${REVISION_B}`, /两个不同 Case/],
    [`?item=revision:${CASE_A}:${REVISION_A}&item=revision:${CASE_B}:${REVISION_B}&item=revision:${CASE_B}:${REVISION_A}`, /最多只能包含两个/],
    [`?item=revision:${CASE_A}:bad`, /不是确切/],
    [`?item=revision:${CASE_A}:${REVISION_A}&dir=B:forward`, /尚未选择的对象 B/],
    [`?item=revision:${CASE_A}:${REVISION_A}&dir=A:forward&dir=A:backward`, /重复声明/],
    [`?at=2026-08-02T09:15:30.000Z`, /规范 UTC/],
    [`?unknown=1`, /未知参数/]
  ])("非法或不完整链接失败关闭：%s", (search, message) => {
    expect(() => parsePairResearchRoute(search, AT)).toThrow(message);
  });

  it("默认瞬时点截断到当前 UTC 分钟", () => {
    expect(currentCanonicalUtcMinuteInstant(new Date("2026-08-02T09:15:59.999Z"))).toBe(AT);
  });

  it("序列化时拒绝同一 Case 和孤立对象 B", () => {
    expect(() => serializePairResearchRoute({
      slots: [
        { caseId: CASE_A, revisionId: REVISION_A, manualDirection: null },
        { caseId: CASE_A, revisionId: REVISION_B, manualDirection: null }
      ],
      atInstant: AT
    })).toThrow(PairResearchRouteError);
    expect(() => serializePairResearchRoute({
      slots: [
        { caseId: null, revisionId: null, manualDirection: null },
        { caseId: CASE_B, revisionId: REVISION_B, manualDirection: null }
      ],
      atInstant: AT
    })).toThrow(/对象 A 为空/);
  });
});
