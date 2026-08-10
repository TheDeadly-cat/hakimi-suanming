export const RESEARCH_SYSTEM_IDS = Object.freeze([
  "bazi",
  "ziwei-doushu",
  "western-astrology"
] as const);

export type ResearchSystemId = (typeof RESEARCH_SYSTEM_IDS)[number];

export type ResearchSystemDeliveryStatus =
  | "research_preview"
  | "isolated_engineering_preview"
  | "diagnostic_preview";

type ResearchSystemBase = Readonly<{
  systemId: ResearchSystemId;
  label: string;
  internationalLabel: string;
  summary: string;
  boundary: string;
}>;

export type ActiveResearchSystemRoadmapItem = ResearchSystemBase & Readonly<{
  status: "active";
  deliveryStatus: "research_preview";
  entryHref: string;
  entryLabel: string;
  deliveredScope: readonly [string, ...string[]];
}>;

export type PlannedResearchSystemRoadmapItem = ResearchSystemBase & Readonly<{
  status: "planned";
  deliveryStatus: Exclude<ResearchSystemDeliveryStatus, "research_preview">;
  entryHref: null;
  progressNote: string;
  independentRequirements: readonly [string, ...string[]];
}>;

export type ResearchSystemRoadmapItem =
  | ActiveResearchSystemRoadmapItem
  | PlannedResearchSystemRoadmapItem;

export const BAZI_RESEARCH_SYSTEM: ActiveResearchSystemRoadmapItem = Object.freeze({
  systemId: "bazi",
  label: "八字",
  internationalLabel: "Bazi",
  status: "active",
  deliveryStatus: "research_preview",
  entryHref: "/",
  entryLabel: "进入八字研究工作台",
  summary: "当前 Web/PWA 构建唯一启用的研究体系，沿用现有无前缀路由和本地八字资料库。",
  boundary: "当前仍是工程研究预览；可复算不等于已经取得专家真值。",
  deliveredScope: Object.freeze([
    "排盘与不可变 Revision",
    "本地检索、同体系对照与研究笔记",
    "八字 full 1.2 完整备份"
  ] as const)
});

const ZIWEI_DOUSHU_RESEARCH_SYSTEM: PlannedResearchSystemRoadmapItem = Object.freeze({
  systemId: "ziwei-doushu",
  label: "紫微斗数",
  internationalLabel: "Ziwei Doushu",
  status: "planned",
  deliveryStatus: "isolated_engineering_preview",
  entryHref: null,
  summary: "隔离契约、双引擎差分和独立工程资料库已建立；当前主应用仍没有紫微斗数入口。",
  progressNote: "隔离工程预览：可在独立 4218 地址完成计算、显式保存、重开验真、单 Revision 导出与完整独立备份；主应用无入口，尚未取得专家真值或发布资格。",
  boundary: "不会把宫位、星曜或限运伪装成八字四柱字段，也不会复用八字验收结论。",
  independentRequirements: Object.freeze([
    "独立输入、计算契约与版本",
    "独立来源、fixture 与专家真值门",
    "独立保存、重开与备份模块"
  ] as const)
});

const WESTERN_ASTROLOGY_RESEARCH_SYSTEM: PlannedResearchSystemRoadmapItem = Object.freeze({
  systemId: "western-astrology",
  label: "西洋星盘",
  internationalLabel: "Western Astrology",
  status: "planned",
  deliveryStatus: "diagnostic_preview",
  entryHref: null,
  summary: "隔离契约、天文诊断和无存储规则预览已建立；严格星历回执与持久化尚未完成，主应用仍没有星盘入口。",
  progressNote: "诊断/规则预览：4219 无存储规则预览与 Astronomy Engine 诊断可复算；尚无严格成功回执、独立保存或发布资格，主应用无入口。",
  boundary: "星历、黄道、宫制、相位和坐标必须使用独立事实模型，不能借用八字规则 Profile。",
  independentRequirements: Object.freeze([
    "独立星历、坐标与宫制契约",
    "独立来源、fixture 与专家真值门",
    "独立保存、重开与备份模块"
  ] as const)
});

export const RESEARCH_SYSTEM_ROADMAP = Object.freeze([
  BAZI_RESEARCH_SYSTEM,
  ZIWEI_DOUSHU_RESEARCH_SYSTEM,
  WESTERN_ASTROLOGY_RESEARCH_SYSTEM
] as const satisfies readonly ResearchSystemRoadmapItem[]);

export function getResearchSystemRoadmapItem(systemId: string): ResearchSystemRoadmapItem | null {
  return RESEARCH_SYSTEM_ROADMAP.find((item) => item.systemId === systemId) ?? null;
}

export function getResearchSystemEntryHref(systemId: string): string | null {
  const item = getResearchSystemRoadmapItem(systemId);
  return item?.status === "active" ? item.entryHref : null;
}
