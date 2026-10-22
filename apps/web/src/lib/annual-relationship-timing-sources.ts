import type { PreliminarySource } from "../../../../packages/bazi-interpretation/src/preliminary-assessment";
import { NATAL_RELATIONSHIP_SOURCES } from "../../../../packages/bazi-interpretation/src/natal-relationship-sources";

export const ANNUAL_RELATIONSHIP_TIMING_SOURCES_VERSION = "hakimi.annual-relationship-timing-sources/0.1.0" as const;
/** Sources establish traditional observation principles. Annual entry,
 * same-character emergence and combined-window selection are local rules. */
export const ANNUAL_RELATIONSHIP_TIMING_SOURCES: readonly PreliminarySource[] = [
  ...NATAL_RELATIONSHIP_SOURCES,
  { id: "relationship-timing-zq-luck-objects", title: "《子平真诠·论行运》具体运字与原局作用",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=56",
    locator: "NLC35296 PDF56—57，书四十七—四十八；配命中八字统观及丁日亥月年透壬官例，沈氏正文",
    excerpt: "配命中八字而統觀之",
    interpretation: "行运要对照原局具体对象；原例区分丙帮身与丁合官。此处支持按实际透字、对象与关系分开记录，不是结婚应期专条。星在流年出现、原藏同字转为明透以及多线索交叠，均是本地年度候选解释规则，不代表古籍证明了事件概率。",
    provenance: { kind: "facsimile_page", section: "论行运", scope: "phase", textVariant: "NLC35296影印沈氏正文；非徐乐吾评注；影印作命中八字",
      excerptSha256: "71c8212c8d65abf972aff1011306c666ec32de1098447f17f6e23051bcd19ab4", excerptTransform: "facsimile-transcription-punctuation", paragraphs: [], stemEvidence: [],
      licenseUrl: "https://commons.wikimedia.org/wiki/File:NLC416-11jh010455-35296_子平真詮.pdf",
      rightsNote: "古籍正文影印短摘；本轮已核页图，现代年度关系说明为本地解释。" } },
  { id: "relationship-timing-smt-female-luck", title: "《三命通会》四库卷七·论女命岁运参看",
    url: "https://zh.wikisource.org/w/index.php?oldid=2082208&title=%E4%B8%89%E5%91%BD%E9%80%9A%E6%9C%83_(%E5%9B%9B%E5%BA%AB%E5%85%A8%E6%9B%B8%E6%9C%AC)/%E5%8D%B707",
    locator: "固定修订2082208，论女命开篇‘女命以尅我者为夫’所在段末；本轮核转录，未另核该卷影印页码",
    excerpt: "歲運亦然",
    interpretation: "女性传统官杀视角有独立来源，该段也提及岁运参看。段末承接原文配置评价，不是星到即婚的独立规则；旧式婚制、性道德与灾断不转写为现代个人经历，也不由官杀同见推婚姻次数。",
    provenance: { kind: "wikisource_revision", revisionId: 2082208, section: "论女命", scope: "phase", textVariant: "四库全书本固定转录；未另核影印",
      excerptSha256: "a9554fc824b0b531115ec5d72709b1c7594c8b94397e4296397b88a78b109605", excerptTransform: "verbatim", paragraphs: [], stemEvidence: [],
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", rightsNote: "原古籍正文为公版；维基文库转录按CC BY-SA归因。未声称完成影印逐字校勘。" } }
];
