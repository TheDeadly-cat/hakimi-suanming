import type { PreliminarySource } from "./preliminary-assessment-sources";

export const NATAL_AUTHORITY_SOURCES_VERSION = "hakimi.natal-authority-sources/0.1.0" as const;
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
    variantNote: "本条从影印正文连续短句转录，省略句读；网页转录只作定位，不并入徐注、现代译文或其他版本增文。",
    clauses: [{ role: "exception", stem: null, transcription: excerpt, sha256: excerptSha256 }]
  }
});

/** Local citations for authority selection. Consumers attach only the sources
 * actually used by a natal finding; these are not a global outlook catalogue. */
export const NATAL_AUTHORITY_SOURCES: readonly PreliminarySource[] = Object.freeze([
  {
    id: "natal-zq-lujie-authority-clearing",
    title: "《子平真诠·论建禄月劫》官杀并出须取清",
    url: `${scan}#page=91`,
    locator: "NLC35296，PDF91（1-based），书八十二，‘更有禄劫而官煞竞出’段；沈氏正文",
    excerpt: "官煞競出必取清方爲貴格",
    interpretation: "禄劫背景下官杀同时透出，需分别检查合、制及其实际对象，不能把并见当作已经取清或成格。原段分别举合杀留官、制杀留官；‘贵格’只按古籍结构条件记录，不推现实身份、事件或准确率。PDF93的伤食、比肩取运句承接已取清的具体类型，不据此给未取清盘一律喜木水或一律忌财官。此处不凭建禄判全局身强，也不把财同时生官杀写成单向有利。版本为世界图书馆本影印正文，非徐注。",
    provenance: provenance("论建禄月劫·官杀并出", 91, "八十二", "官煞競出必取清方爲貴格",
      "d0397c461a9b8db0778278844f8075380aabf1f5030836bd02848f986d219d76",
      "a13b00552999eeb2b7c688ecc9368d6c36332fcf433bc0f5437cd600af9aad38")
  },
  {
    id: "natal-zq-self-combination-not-removal",
    title: "《子平真诠·论十干合而不合》日主自合不作合去",
    url: `${scan}#page=20`,
    locator: "NLC35296，PDF20（1-based），书十一，‘本身之合’及乙日自合庚官、另位乙先合庚的对照段；沈氏正文",
    excerpt: "惟是本身十干合之不爲合去",
    interpretation: "日主自己与财官相合，原段明确区别于别位同类天干先合走该星。癸日与戊官相合属于本身之合，不能仅凭戊癸二元合删除戊官、宣告合官留杀或官杀取清；相合事实仍保留。另一干相合也须按位置、阻隔及实际作用另审，不能由排除本身之合便自动判其合去。本条不裁定合化、不删根，不由古籍夫妻比喻推出真实婚恋经历。版本为世界图书馆本影印正文，非徐注。",
    provenance: provenance("论十干合而不合·本身之合", 20, "十一", "惟是本身十干合之不爲合去",
      "aede749d6cb3c5d4508bd27d735e7866a1962d18ea9ba4ff069795099285013e",
      "dde484a5a91c8e86e48a491481fbfce40fc9c435deca47da114cd97283501ae5")
  }
]);
