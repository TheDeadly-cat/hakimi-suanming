import type { PreliminarySeasonalRule } from "./preliminary-assessment";
import type { PreliminarySource } from "./preliminary-assessment-sources";

/** Independent facsimile witness. Never relabel or rewrite Wikisource 2294674,
 * whose corresponding heading is transcribed as eleven, not twelve. */
export const YI_CHOU_FACSIMILE_RULE: PreliminarySeasonalRule = Object.freeze<PreliminarySeasonalRule>({
  id: "qiongtong-yi-chou-nlc48608-p69-v1",
  dayStem: "乙", monthBranch: "丑",
  headline: "乙木丑月：以丙温通，土重时再考察甲",
  summary: "按《穷通宝鉴评注》影印本大字原文的十二月乙木段，先考察丙火温通；只有戊己成片时另参甲木。丙的作用仍受癸水等组合条件影响，不能把一个丙字出现视为调候已经完成。",
  preferredStems: ["丙"],
  conditionalStems: [{ stem: "甲", condition: "原文以一派戊己为前提，才另参甲木；不因月支丑或仅有藏己就自动判定土重。" }],
  cautions: [
    "原文得一丙透仍附无癸出破格条件；不转写其中功名断语为现实保证。",
    "四柱多己且不逢比劫的从才分支另列，不能只凭土多宣告从格。",
    "本条只据影印本十二月大字原文，不借前段十一月的丁甲条件，也不把小字评注冒充原文。",
    "影印本标题为十二月，维基文库固定版本2294674相应段却标十一月；两份证据分别保留。",
    "按节令丑月匹配，不按公历十二月或农历初一切换。"
  ],
  sourceIds: ["preliminary-qiongtong-yi-chou-nlc48608-p69"]
});

export const YI_CHOU_FACSIMILE_SOURCE: PreliminarySource = Object.freeze<PreliminarySource>({
  id: "preliminary-qiongtong-yi-chou-nlc48608-p69",
  title: "《窮通寶鑑評註》影印本·卷二冬乙·十二月大字原文",
  url: "https://upload.wikimedia.org/wikipedia/commons/9/93/NLC416-12jh004238-48608_%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%A9%95%E8%A8%BB.pdf#page=69",
  locator: "PDF第69页（从1开始），书内五九页，卷二·冬乙；中部十二月乙木大字起段及左侧接续大字。右侧十一月段与小字评注不并入本条。",
  excerpt: "十二月乙木，木寒宜丙，有寒谷回春之象。",
  interpretation: "丙为本段主用；一派戊己时才另参甲。保留无癸破丙及无比劫方另论从才等结构条件，不采原文功名保证。本影印本与固定网络转录的月份标题不同，因此单列来源。",
  provenance: {
    kind: "facsimile_page", section: "卷二·冬乙·十二月乙木", scope: "month",
    textVariant: "影印本大字原文的繁体人工转录；保留耑、才等字形，标点为阅读补入，不据OCR宣告核对。",
    excerptSha256: "f386d5cf0f50bf1159d74f97754791434c5c94b2f1112cf89e805e1ebc97451e",
    excerptTransform: "facsimile-transcription-punctuation",
    // Facsimile evidence uses page/region and transcription hashes, not invented HTML block indices.
    paragraphs: [], stemEvidence: [],
    licenseUrl: "https://commons.wikimedia.org/wiki/File:NLC416-12jh004238-48608_%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%A9%95%E8%A8%BB.pdf#Licensing",
    rightsNote: "来源为国图藏本经Wikimedia Commons公开的影印件，页面标注PD-scan/PD-China。本条只摘清代古籍大字原文，不采用小字现代评注，也不声明整个评注本在所有地区均无权利限制。",
    facsimile: {
      pdfSha256: "b7f17fc7fcb7d8faa991efa74d0db391c5066a3793b3fc6787d2612bc6b350a8",
      pdfPageOneBased: 69, printedPage: "五九",
      pageImageSha256: "72ac7737198eebe06d22773c2904982f3c208fed9b696828586fe0735448db06",
      edition: "乾乾書社出版，楚南余春臺原編、東海樂吾氏評註；馆藏目录标民国二十六年1937，本轮未以刊记核年。",
      originalLargeTypeOnly: true,
      variantNote: "本页大字为十二月乙木；Wikisource oldid2294674的块144为十一月。本条是独立版本补充，不回改该转录或其哈希。",
      clauses: [
        { role: "preferred", stem: "丙", transcription: "十二月乙木，木寒宜丙，有寒谷回春之象。", sha256: "f386d5cf0f50bf1159d74f97754791434c5c94b2f1112cf89e805e1ebc97451e" },
        { role: "conditional", stem: "甲", transcription: "或一派戊己，見甲頗有衣祿，耑以丙火為用方妙。", sha256: "ce78b28289b1e55d3d23208fc7a29c2399b005d97ed76a5d5d6c267b45ffaa5e" },
        { role: "exception", stem: "癸", transcription: "得一丙透，無癸出破格", sha256: "c1bf27179ded703d6a76f7a06ed10a789c1614a790a9ce156244ed8cf3495e32" },
        { role: "exception", stem: null, transcription: "或四柱多己，不逢比劫，乃為從才", sha256: "4c647c9fee312d794e993498cebcbb5c1facea6dcf42ba2f1d31f0f4287e0af4" }
      ]
    }
  }
});
