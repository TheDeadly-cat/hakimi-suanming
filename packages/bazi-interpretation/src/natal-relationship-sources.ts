import type { PreliminarySource } from "./preliminary-assessment-sources";

export const NATAL_RELATIONSHIP_SOURCES_VERSION = "hakimi.natal-relationship-sources/0.2.0" as const;
const scan = "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf";
const scanProvenance = (section: string, excerptSha256: string): NonNullable<PreliminarySource["provenance"]> => ({
  kind: "facsimile_page", section, scope: "phase", textVariant: "NLC35296影印沈氏正文；非徐乐吾评注",
  excerptSha256, excerptTransform: "facsimile-transcription-punctuation", paragraphs: [], stemEvidence: [],
  licenseUrl: "https://commons.wikimedia.org/wiki/File:NLC416-11jh010455-35296_子平真詮.pdf",
  rightsNote: "古籍正文影印短摘；页面定位及逐字校核已留证。现代关系情境为本地解释，不冒充原文断语。"
});

/** Verified short source excerpts. Modern interpretations intentionally exclude
 * historical moral judgments, spouse counts and deterministic marital outcomes. */
export const NATAL_RELATIONSHIP_SOURCES: readonly PreliminarySource[] = [
  { id: "relationship-foundation-zq-position", title: "《子平真诠·论宫分用神配六亲》", url: `${scan}#page=52`,
    locator: "NLC35296 PDF52—53，书四十三—四十四，正财为妻及宫位段；沈氏正文",
    excerpt: "正財為妻", interpretation: "男命传统以正财配妻；日位与十神分别记录。偏财仅保留相关资源线索，不与正财无区别地映射现实配偶。此映射不确定现实伴侣身份、性别或婚姻状态。",
    provenance: scanProvenance("论宫分用神配六亲", "474224e7c5ae22afe9de18ce4506b5934a49cbff638b55fe54c65a44b96c2b3c") },
  { id: "relationship-foundation-zq-star-palace", title: "《子平真诠·论妻子》星宫兼看", url: `${scan}#page=54`,
    locator: "NLC35296 PDF54，书四十五，妻宫与干头财星段；沈氏正文", excerpt: "既看妻宮又看妻星",
    interpretation: "日支位置与明透星干是不同观察入口；支藏须如实保留为藏位，不当成已经透出。未见或未透某星不能推出无婚，正偏同见不推出多婚或出轨。",
    provenance: scanProvenance("论妻子·星宫兼看", "4db31f4c98c183c870be75c31fdd0a5b86c8027a4b81c53b3d95b685a3c5b104") },
  { id: "relationship-foundation-zq-counterconditions", title: "《子平真诠·论妻子》相反条件", url: `${scan}#page=53`,
    locator: "NLC35296 PDF53—54，书四十四—四十五，坐下角色随月令取用转义及透财相反条件；沈氏正文", excerpt: "其理不可執一也",
    interpretation: "同一坐下角色、同一透财须按作用条件读；印多用财与印轻财露是不同分支。本层只解释可追溯对象与相处主题，不把事业或扶抑的顺逆直接套成关系吉凶。",
    provenance: scanProvenance("论妻子·相反条件", "67012f7abb3f121549896443d0a676ac983e1474f40a27c935be3b4a749bdd9f") },
  { id: "relationship-foundation-smt-female-mapping", title: "《三命通会》四库全书本卷七·论女命",
    url: "https://zh.wikisource.org/w/index.php?oldid=2082208&title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B707",
    locator: "固定修订2082208，论女命开篇‘或问妇人何利’段；本次核转录，未另核扫描页码", excerpt: "女命以尅我者為夫",
    interpretation: "女性传统视角记录正官与七杀，原文按选用配置细分；多个星不是多个现实丈夫。旧式道德评价、刑克、多婚和缺夫星灾断不转写成现代人物或婚姻结论。",
    provenance: { kind: "wikisource_revision", revisionId: 2082208, section: "论女命", scope: "phase", textVariant: "四库全书本维基文库固定修订转录；非子平真诠正文、非徐注",
      excerptSha256: "0b03dc0a68454fd1450fd0b058d0d8db3c366e73abc626906a754f4460bca30b", excerptTransform: "verbatim", paragraphs: [], stemEvidence: [],
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", rightsNote: "原古籍正文为公版；维基文库转录按其CC BY-SA条款归因。此处未声称完成影印逐字校勘。" } },
  { id: "relationship-foundation-zq-combination-limits", title: "《子平真诠·论刑冲会合解法》", url: `${scan}#page=25`,
    locator: "NLC35296 PDF24—25，书十五—十六，会合能解与不能解并列段；沈氏正文", excerpt: "是會合而不能解刑冲也",
    interpretation: "保留对象和位置不同的合冲，不以一合删除另一冲。本层仅取原关系引擎的二元干合、干冲、支合、支冲；不判合化、解除或具体婚恋事件。",
    provenance: scanProvenance("论刑冲会合解法", "f56dd53dbb43e6350665e594ab4ddd7367caa647d0431d3ab4b081b7e747ac81") },
  { id: "relationship-foundation-zq-family-palaces", title: "《子平真诠·论宫分用神配六亲》宫位层次", url: `${scan}#page=52`,
    locator: "NLC35296 PDF52，书四十三，《论宫分用神配六亲》开篇宫分顺序；沈氏正文，非徐注",
    excerpt: "年月日時，自上而下，祖父妻子亦自上而下。",
    interpretation: "原文以年、月、日、时与祖、父、妻、子顺列，随后另论六亲星的角色与作用。这里只作为按原柱位置组织家庭背景、相处与延续安排的传统方法来源；这些现代生活主题是本地解释，不据位置断定亲属职业、性格、人数或已发生经历。时辰未定时不借时柱补写子女或未来家庭事实。",
    provenance: { ...scanProvenance("论宫分用神配六亲·宫位层次", "08b46c2880a77b33515e143e5cfc072f7b0cbf519dc5b02157478f1ec748c909"),
      facsimile: { pdfSha256: "71402a780b0351b54edf121a51bc4a4a4ce5896496c35b954563ee06f1a6f620", pdfPageOneBased: 52, printedPage: "四十三",
        pageImageSha256: "cdf0af695f77ac94176897c8834846950e80b905a3c05d0b331d817a33c4fac2", edition: "世界圖書館發行本；沈孝瞻編輯；刊年未詳", originalLargeTypeOnly: true,
        variantNote: "逐字依影印正文，现代标点重排；祖、父、妻、子为原文顺列，不将祖父二字合读为单一宫位。",
        clauses: [{ role: "conditional", stem: null, transcription: "年月日時，自上而下，祖父妻子亦自上而下。", sha256: "08b46c2880a77b33515e143e5cfc072f7b0cbf519dc5b02157478f1ec748c909" }] } } },
  { id: "relationship-foundation-zq-family-role-method", title: "《子平真诠·论宫分用神配六亲》角色与作用分读", url: `${scan}#page=53`,
    locator: "NLC35296 PDF52—53，书四十三—四十四；正印、偏财、正财、官煞、比肩配六亲及跨页结句；沈氏正文，非徐注",
    excerpt: "作何喜忌，察而配之，即可以了然矣。",
    interpretation: "正文分别论正印、偏财、正财、官煞与比肩，再要求察四柱中所在及喜忌；同页《论妻子》又保留角色与作用相反的条件。可据此分别记录具体十神、明藏、位置与真实互动，不能把五类角色一律套成亲属吉凶。正偏印的支持方式、正偏财的投入方式、比劫分工及官杀要求的现代区别属于本地解释，不把偏印映射继母、不以正偏同见推多婚或亲属数量。",
    provenance: { ...scanProvenance("论宫分用神配六亲·角色与作用分读", "5a079f29bb9e365e064a6af1bfc1ce356d4ebe6bac34cfeb0fade34b7860491c"),
      facsimile: { pdfSha256: "71402a780b0351b54edf121a51bc4a4a4ce5896496c35b954563ee06f1a6f620", pdfPageOneBased: 53, printedPage: "四十四",
        pageImageSha256: "702674a6300e9ae3cb2d4307e54a03b94a680f722aaabcf5fb744d5d4f026e3f", edition: "世界圖書館發行本；沈孝瞻編輯；刊年未詳", originalLargeTypeOnly: true,
        variantNote: "短摘为承接PDF52的跨页结句；补充现代标点，不冒充现代生活情境的古籍原句。",
        clauses: [{ role: "conditional", stem: null, transcription: "作何喜忌，察而配之，即可以了然矣。", sha256: "5a079f29bb9e365e064a6af1bfc1ce356d4ebe6bac34cfeb0fade34b7860491c" }] } } },
  { id: "relationship-foundation-smt-star-position", title: "《三命通会》四库全书本卷七·论六亲星与宫位",
    url: "https://zh.wikisource.org/w/index.php?oldid=2082208&title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B707",
    locator: "固定修订2082208，《论六亲》〈经云〉年为祖业、月为父母兄弟门户、日为妻妾己身、时为子息之后；本次核转录，未另核扫描页码",
    excerpt: "須看四柱之中父母兄弟妻子星居何地",
    interpretation: "原段要求六亲星与所在宫位一起看，且并列阴阳、正偏的不同取法；例如乙日仍以癸配母时，癸为偏印，不能把偏印一概译成继母。这里只引用星与位置共同观察的方法，不采用其中的寿夭、婚变、亲属优劣或人数断语。家庭支持、责任协商和日常分担的情境是本地现代解释；合冲保持具体对象，不据一合一冲认定关系结局。",
    provenance: { kind: "wikisource_revision", revisionId: 2082208, section: "论六亲·星与宫位", scope: "phase", textVariant: "四库全书本维基文库固定修订转录；万民英书中汇录不同取法，非沈氏正文、非徐注",
      excerptSha256: "e788df4718e96bf78eb1a1d9f10b62f0758eedaf867ddb1b965fbe8d26b9cc8f", excerptTransform: "verbatim", paragraphs: [], stemEvidence: [],
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", rightsNote: "原古籍正文为公版；维基文库转录按其CC BY-SA条款归因。本次已在线核固定修订原段，未声称影印校勘或采用段内确定性人物断语。" } }
];
