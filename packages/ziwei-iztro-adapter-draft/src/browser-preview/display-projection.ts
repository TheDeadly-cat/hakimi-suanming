import type { ZiweiBrowserEngineeringArtifactDraft } from "./browser-artifact.ts";
import type { BrowserProbeDisplayProjection } from "./browser-protocol.ts";

const ROLE_LABELS = Object.freeze<Record<string, string>>({
  life: "命宫",
  siblings: "兄弟",
  spouse: "夫妻",
  children: "子女",
  wealth: "财帛",
  health: "疾厄",
  travel: "迁移",
  friends: "交友",
  career: "官禄",
  property: "田宅",
  wellbeing: "福德",
  parents: "父母"
});
const BRANCH_LABELS = Object.freeze<Record<string, string>>({
  zi: "子", chou: "丑", yin: "寅", mao: "卯", chen: "辰", si: "巳",
  wu: "午", wei: "未", shen: "申", you: "酉", xu: "戌", hai: "亥"
});
const STEM_LABELS = Object.freeze<Record<string, string>>({
  jia: "甲", yi: "乙", bing: "丙", ding: "丁", wu: "戊",
  ji: "己", geng: "庚", xin: "辛", ren: "壬", gui: "癸"
});
const BRIGHTNESS_LABELS = Object.freeze<Record<string, string>>({
  miao: "庙", wang: "旺", de: "得", li: "利", ping: "平", xian: "陷", bu: "不"
});
const TRANSFORMATION_LABELS = Object.freeze<Record<string, string>>({
  lu: "禄", quan: "权", ke: "科", ji: "忌"
});
const BUREAU_LABELS = Object.freeze<Record<string, string>>({
  water_2: "水二局", wood_3: "木三局", metal_4: "金四局", earth_5: "土五局", fire_6: "火六局"
});

/**
 * Display is derived locally from the already-verified artifact. The main thread never
 * accepts Worker-supplied labels, categories, brightness or transformation projections.
 */
export function createZiweiBrowserDisplayProjection(
  artifact: ZiweiBrowserEngineeringArtifactDraft
): BrowserProbeDisplayProjection {
  const facts = artifact.facts;
  const starLabelById = new Map(
    artifact.ruleSnapshot.rules.starRegistry.entries.map((entry) => [entry.starId, entry.zhCnLabel])
  );
  const lunar = facts.calendarFacts.lunarDate;
  const ganzhi = facts.calendarFacts.ganzhi;
  return {
    displayPalaces: facts.palaces.map((palace) => ({
      earthlyBranchId: palace.earthlyBranchId,
      earthlyBranchLabel: label(BRANCH_LABELS, palace.earthlyBranchId),
      heavenlyStemLabel: label(STEM_LABELS, palace.heavenlyStemId),
      roleId: palace.roleId,
      roleLabel: label(ROLE_LABELS, palace.roleId),
      isBodyPalace: palace.isBodyPalace,
      stars: palace.stars.map((star) => ({
        label: starLabelById.get(star.starId)
          ?? fail(`已验真事实中的星曜 ${star.starId} 缺少冻结显示标签`),
        category: star.category,
        brightnessLabel: star.brightnessId ? label(BRIGHTNESS_LABELS, star.brightnessId) : null,
        transformations: star.transformationIds.map((id) => label(TRANSFORMATION_LABELS, id))
      }))
    })),
    displaySummary: {
      gregorianDate: facts.calendarFacts.gregorianDate,
      lunarDate: `${lunar.year}年${lunar.isLeapMonth ? "闰" : ""}${lunar.month}月${lunar.day}日`,
      shichen: `${label(BRANCH_LABELS, facts.calendarFacts.shichen.branchId)}时 ${facts.calendarFacts.shichen.civilRange}`,
      sex: facts.directionBasis.sexForCalculation === "male" ? "男" : "女",
      lifePalace: label(BRANCH_LABELS, facts.lifePalaceBranchId),
      bodyPalace: label(BRANCH_LABELS, facts.bodyPalaceBranchId),
      fiveElementBureau: label(BUREAU_LABELS, facts.fiveElementBureauId),
      direction: facts.directionBasis.resolvedDirection === "forward" ? "顺行" : "逆行",
      ganzhi: [ganzhi.year, ganzhi.month, ganzhi.day, ganzhi.hour].map(ganzhiLabel).join(" · ")
    }
  };
}

function ganzhiLabel(value: string): string {
  const match = /^(jia|yi|bing|ding|wu|ji|geng|xin|ren|gui)_(zi|chou|yin|mao|chen|si|wu|wei|shen|you|xu|hai)$/u
    .exec(value);
  if (!match) return fail(`已验真事实中的干支 ${value} 不是规范标识`);
  return `${label(STEM_LABELS, match[1]!)}${label(BRANCH_LABELS, match[2]!)}`;
}

function label(dictionary: Readonly<Record<string, string>>, key: string): string {
  return dictionary[key] ?? fail(`已验真事实缺少显示标签 ${key}`);
}

function fail(message: string): never {
  throw new Error(message);
}
