import { expect, it } from "vitest";
import { splitAnnualDomainObstacles } from "./annual-domain-presentation";

it("moves only the exact known marker, preserving other negative wording and source order without mutation", () => {
  const marker = "尚无可单列的年度关系阻碍；其他领域的总体助阻不直接当作关系结果。";
  const actual = "尚未明确的分工使既有安排难以落实。";
  const original = Object.freeze([actual, marker, `${marker}（个人补充）`, "没有配套时间，新增任务仍会挤占共同安排。"]);
  const result = splitAnnualDomainObstacles(original);
  expect(result.readingScope).toEqual([marker]);
  expect(result.obstacles).toEqual([actual, `${marker}（个人补充）`, "没有配套时间，新增任务仍会挤占共同安排。"]);
  expect(original).toEqual([actual, marker, `${marker}（个人补充）`, "没有配套时间，新增任务仍会挤占共同安排。"]);
  expect(splitAnnualDomainObstacles()).toEqual({ obstacles: [], readingScope: [] });
});
