import { CANDIDATE_SET_ROUTE, CASE_REVISE_ROUTE, CASE_REVISION_ROUTE } from "./app-route-patterns";
import { APP_VERSION } from "./app-version";
import { CURRENT_BUILD_VERSION } from "./current-release";
import { LOCAL_READING_EDITION_VERSION } from "./local-reading-version";
import { parseChartRoute } from "./transit-route";

export const FRIENDLY_READING_VERSION = LOCAL_READING_EDITION_VERSION.split("/").at(-1)!;

const pageNames: Readonly<Record<string, string>> = {
  "/": "首页",
  "/new": "出生资料",
  "/cases": "档案 / 命盘资料",
  "/cases/research": "档案 / 专业研究检索",
  "/reports": "档案 / 已保存报告",
  "/compare": "档案 / 多盘对照",
  "/compare/pair": "档案 / 双案例结构研究",
  "/knowledge": "学习 / 典籍与术语",
  "/settings": "我的 / 设置",
  "/settings/data": "我的 / 本机数据",
  "/settings/calendar-divergence-audit": "我的 / 连续历法差异审计",
  "/settings/transit-review-inbox": "我的 / 审核收件箱",
  "/help": "我的 / 帮助"
};

const chartViewNames = {
  reading: "阅读",
  overview: "概览",
  structure: "专业盘",
  transit: "运限",
  research: "研读"
} as const;

/** Allowlisted page types only: never serialize the URL, birth input, IDs or search text. */
export function feedbackPageName(pathname: string, search: string): string {
  if (CASE_REVISE_ROUTE.test(pathname)) return "档案 / 修订出生资料";
  if (CASE_REVISION_ROUTE.test(pathname)) return `档案 / ${chartViewNames[parseChartRoute(search).view]}`;
  if (CANDIDATE_SET_ROUTE.test(pathname)) return "档案 / 未知时辰候选";
  return pageNames[pathname] ?? "未识别页面";
}

export function createAppFeedbackContext(pathname: string, search: string): string {
  return [
    "哈基米八字 · 本机试用反馈",
    `阅读版本：${FRIENDLY_READING_VERSION}`,
    `应用版本：${APP_VERSION}`,
    `构建标识：${CURRENT_BUILD_VERSION ?? "开发预览（未生成固定构建）"}`,
    `所在页面：${feedbackPageName(pathname, search)}`,
    "",
    "我想完成：",
    "我看到的情况：",
    "是否需要帮助："
  ].join("\n");
}
