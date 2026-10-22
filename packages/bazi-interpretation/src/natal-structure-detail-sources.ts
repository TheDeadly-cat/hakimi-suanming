import type { PreliminarySource } from "./preliminary-assessment-sources";

export const NATAL_STRUCTURE_DETAIL_SOURCES_VERSION = "hakimi.natal-structure-detail-sources/0.1.0" as const;
const scan = "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf";
const licenseUrl = "https://commons.wikimedia.org/wiki/File:NLC416-11jh010455-35296_子平真詮.pdf";
const provenance = (section: string, page: number, printedPage: string, excerpt: string, excerptSha256: string,
  pageImageSha256: string): NonNullable<PreliminarySource["provenance"]> => ({
  kind: "facsimile_page", section, scope: "phase", textVariant: "NLC35296影印沈氏正文；非徐乐吾评注",
  excerptSha256, excerptTransform: "facsimile-transcription-punctuation", paragraphs: [], stemEvidence: [], licenseUrl,
  rightsNote: "Wikimedia Commons 登记为国家图书馆所藏公版原件的机械扫描；本条只取已核影印短句。文件说明页另有美国公版标签补充提示，不将该登记等同所有地区的发布许可。",
  facsimile: {
    pdfSha256: "71402a780b0351b54edf121a51bc4a4a4ce5896496c35b954563ee06f1a6f620",
    pdfPageOneBased: page, printedPage, pageImageSha256,
    edition: "《子平真詮》，沈孝瞻编辑，世界图书馆发行；NLC35296，具体刊年未详（馆藏元数据[19--?]）",
    originalLargeTypeOnly: true,
    variantNote: "短引按本轮视觉核对的影印正文连续转录并省略句读；关联页也已核图，具体图像身份存本轮研究回执。不混入徐注、现代译文或网络校字。",
    clauses: [{ role: "conditional", stem: null, transcription: excerpt, sha256: excerptSha256 }]
  }
});

/** Local natal citations for concrete role choices. Attach only sources used
 * by the current finding; the text does not define numerical strength rules. */
export const NATAL_STRUCTURE_DETAIL_SOURCES: readonly PreliminarySource[] = Object.freeze([
  {
    id: "natal-zq-resource-output-killing-task",
    title: "《子平真诠·论印》用杀兼带伤食与印食轻重",
    url: `${scan}#page=74`,
    locator: "NLC35296，PDF73—75（1-based），书六十四—六十六；短引在PDF74‘有用煞而兼带伤食者’段，兼核PDF73印用伤食与PDF75论印取运；沈氏正文",
    excerpt: "有用煞而兼帶傷食者",
    interpretation: "原段在印格中讨论用杀而兼伤食，杀受制与生身、泄秀须按实际配合分读，不是有杀有食就改成七杀格，也不是把杀生印和食制杀叠算成两份已成功优势。PDF73先区分身强印旺可泄秀，与印浅身轻又叠加伤食的反面；PDF75又分别讨论印旺身旺、印轻及见财的条件。因此印的支持、食伤出口和杀的制约都有具体任务，印不一律阻碍输出，食伤也不一律越多越好。当前以月令、具体透藏、自身根与各角色根、实际合克来建立联合谓词，属于保守本地工作解释，不是原典给出的根数或分数公式。月令藏印不冒作透印，不由同见角色宣告成格、改写原始计分或推现实经历。",
    provenance: provenance("论印·用杀兼带伤食", 74, "六十五", "有用煞而兼帶傷食者",
      "20316a4ffddb77ed499fe2bc56d3ccec437c641dda7cba9ae9162dddcfeba26e",
      "9f43b1bbbd88810a16d692d7660f23762ed0e6580919da59cf79df29c6b796d1")
  },
  {
    id: "natal-zq-food-killing-load-task",
    title: "《子平真诠·论偏官取运》食杀轻重与扶身取舍",
    url: `${scan}#page=81`,
    locator: "NLC35296，PDF79—81（1-based），书七十—七十二；短引在PDF81论偏官取运开段，兼核PDF79食太重用印与杀强食浅露印的相反条件；沈氏正文",
    excerpt: "煞重食輕則助食",
    interpretation: "原文将杀重食轻助食、杀轻食重助杀、杀食相当而日主根轻助身分开，不能仅见一个食神和一个七杀便说制衡已成。PDF79脱脱例壬辰、甲辰、丙戌、戊戌，以食太重而透甲印调节；与杀强食浅时印再制食的条件相反。因此印既能支持日主也会制食，不能把所有印列忌；财去印存食同时仍可能生杀，不能一概判财有利。当前根层级、季令、透藏与受制的比较是本地联合谓词，不把根数、透干数或古籍贵格当作量化系数和准确率。用于非七杀月令的食杀组合时，只借原段说明相对角色取舍，不改称七杀格，不删印、食、杀或原根，也不宣告制化已完成。",
    provenance: provenance("论偏官取运·食杀相对轻重", 81, "七十二", "煞重食輕則助食",
      "e968bc9d74d377ce0ce60e67735718115f1e5e1460810c6c6130e5ede5ae40de",
      "df371d14ab6f9caf315750c2f8196b4af16a2dfde8f96053523efb627101437c")
  },
  {
    id: "natal-zq-mixed-month-resource",
    title: "《子平真诠·论杂气如何取用》甲辰透壬与暗财取舍",
    url: `${scan}#page=42`,
    locator: "NLC35296，PDF41—43（1-based），书三十二—三十四；短引在PDF42末列，甲辰逢壬配丙的条件续见PDF43；兼核透干、会支与辰戌冲土的对照；沈氏正文",
    excerpt: "如甲生辰月逢壬爲印",
    interpretation: "正文既举甲生辰月透癸用印，也明确讨论逢壬或透壬为印，故壬可参与辰月印的结构解释；这不把天干壬改称辰中癸原字透出。原段同时审兼透、申子会印、辰中暗戊、丙火生土以及辰戌冲土对印的影响；甲辰透壬配丙尤其另有印局条件，不能只见壬就宣告杂气印格清。当前只对实际月令藏字、已透角色、根和二元关系给出分层任务，未判会局合化时不得代作已成水局，未判去根时不因辰戌冲删除水根。此段不能推广为所有土月任意同五行透干都等于藏干透清，也不提供根数、分档或预测准确率公式。",
    provenance: provenance("论杂气如何取用·甲辰逢壬为印", 42, "三十三", "如甲生辰月逢壬爲印",
      "7cb3b524dfd710c48aa5db5f8d60b1fdd10e8b0d50ef4d18665315739f332557",
      "43ab2430003efe8a4c527cbcc2aadbfed1f2c7fad74ddb7163a1832757495a3b")
  }
]);
