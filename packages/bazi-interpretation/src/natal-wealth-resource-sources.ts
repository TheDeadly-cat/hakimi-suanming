import type { PreliminarySource } from "./preliminary-assessment-sources";

export const NATAL_WEALTH_RESOURCE_SOURCES_VERSION = "hakimi.natal-wealth-resource-sources/0.1.0" as const;
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
    variantNote: "短引从对应影印页正文连续转录并省略句读；命式以影印为准，不混入徐注、现代译文或网络误字。关联页的完整原文和图像身份另存研究回执。",
    clauses: [{ role: "conditional", stem: null, transcription: excerpt, sha256: excerptSha256 }]
  }
});

/** Natal-only citations. Attach only the entries used by the current finding;
 * neither these examples nor their historical outcomes calibrate a score. */
export const NATAL_WEALTH_RESOURCE_SOURCES: readonly PreliminarySource[] = Object.freeze([
  {
    id: "natal-zq-official-wealth-resource-separated",
    title: "《子平真诠·论正官》财印并用而不相碍",
    url: `${scan}#page=65`,
    locator: "NLC35296，PDF65（1-based），书五十六，薛相公例；甲申、壬申、乙巳、戊寅；沈氏正文",
    excerpt: "壬印戊財以乙隔之",
    interpretation: "薛例日柱为乙巳，月令申中庚官未另透；原文分别讨论壬印护官与戊财生官，并以乙隔财印解释两不相碍。当前隔位判断仅用于正官或伤官月令的实际原局财印，且两者之间的每一透干均须为日主或比劫；这是保守本地工作谓词，不是古籍给出的根数公式。不能推广成所有隔干都无作用，也不外推岁运第五柱。原财印、官星、藏干、根气及其他合克事实仍保留；不凭隔位宣告成格、改变 raw 分档或预测准确率。",
    provenance: provenance("论正官·薛相公财印隔位", 65, "五十六", "壬印戊財以乙隔之",
      "1b5c4c8d3bd42be7ca6478f389200248da04d89f5a2db3b38ef92b03cb314262",
      "58be990fae48b90b0241b1753893e00f255fc1cd3d06bf32cb43e7a1be25a668")
  },
  {
    id: "natal-zq-official-wealth-resource-combined",
    title: "《子平真诠·论正官》财印相合的反例",
    url: `${scan}#page=66`,
    locator: "NLC35296，PDF65—66（1-based），书五十六—五十七；壬戌、丁未、戊申、乙卯，短引在PDF66；沈氏正文",
    excerpt: "壬財丁印二者相合",
    interpretation: "原例虽为杂气官透干会支，但丁壬财印相合，正文仍以孤官无辅论，不能只因财印俱透就当作两项自由辅官。四柱以影印的戊申为准，网络转录的戊甲不采用。当前只据实际财印合的对象与位置保留相碍及任务受牵制，不由五合删除原干、根或官星，不宣告合化；相合规则也不能机械覆盖隔位、另一干牵制或日主自合的区别。此反例不提供量化系数，不改 raw 分档，也不把书内官品当作现实身份或命中率。",
    provenance: provenance("论正官·丁壬财印相合反例", 66, "五十七", "壬財丁印二者相合",
      "f4568b07977c1a41d661bfa0ea01351211e25d3adcb1b97c3dd96b3e268b4e7e",
      "c0eb2cab8caafeb8eb5e2fbebd69db2102ccbe39ed3b5dd00fa0f5f98b43685f")
  },
  {
    id: "natal-zq-hurting-wealth-heavy",
    title: "《子平真诠·论伤官》财重带印的配合",
    url: `${scan}#page=84`,
    locator: "NLC35296，PDF83—84（1-based），书七十四—七十五，和都统制例丁酉、己酉、戊子、壬子；短引在PDF84，取运参PDF85；沈氏正文",
    excerpt: "財太重而帶印",
    interpretation: "原文伤官兼用财印，先要求干头两清而不相碍；本例丁壬隔戊己，财重带印，并另有金水多寒、得火融和的语境。PDF85取运将财多带印与印多带财分读，前者喜助印。当前以财有根、印无根且日主无根作为财重带印候选，是保守本地工作谓词，不是古籍给出的根数公式或通用强弱阈值；不改 raw 分档。隔位仅在官或伤官月令、原局财印之间均为日主或比劫时使用，不推广所有隔干或岁运第五柱。它指印字的具体任务，不等于全部印五行一律有利，亦不据此宣告成格、现实成就或预测准确率。",
    provenance: provenance("论伤官·财太重而带印", 84, "七十五", "財太重而帶印",
      "878bca825fecf4d4f3e833f94a0db1f983e18837cc8de899b2b3d82ceb348feb",
      "abe94d8eab0a9332e763ade6f0a456f9cca99f8453762feaeef74f8d849600f1")
  },
  {
    id: "natal-zq-hurting-resource-heavy",
    title: "《子平真诠·论伤官》印重带财的配合",
    url: `${scan}#page=84`,
    locator: "NLC35296，PDF84（1-based），书七十五，都御史例壬戌、己酉、戊午、丁巳；取运参PDF85书七十六；沈氏正文",
    excerpt: "印太重而帶財",
    interpretation: "同为财印俱透，本例原文按印重带财讨论，丁壬隔戊己而不相碍；紧接反是则财印并用而不秀。PDF85取运相应说印多带财者喜助财，与财多带印的取向不同。当前以印有本气根、财无根且日主有本气根作为印重带财候选，是保守本地工作谓词，不是古籍给出的根数公式，不改 raw 分档。财须对应约束过重印的实际任务，不能推财克印一律好、财运全吉或印一律为忌。隔位仅用于官或伤官月令的原局财印之间均为日主或比劫，不推广所有隔干或岁运第五柱；保留合克和根气原事实，不据书中贵格宣称现实预测准确率。",
    provenance: provenance("论伤官·印太重而带财", 84, "七十五", "印太重而帶財",
      "7b64860e9d34bf5ebe6baaf7e6e90d6d39066e0457088cf2f1de809c475d2530",
      "abe94d8eab0a9332e763ade6f0a456f9cca99f8453762feaeef74f8d849600f1")
  }
]);
