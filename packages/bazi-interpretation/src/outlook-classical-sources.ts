import type { PreliminarySource } from "./preliminary-assessment-sources";

/** Source material only. No condition in this file has been evaluated for a chart.
 * Public transcriptions were compared on 2026-10-16. A quotation digest freezes
 * our UTF-8 excerpt, not the publisher's page or a facsimile edition. */
export const OUTLOOK_CLASSICAL_SOURCES_VERSION = "hakimi.outlook-classical-sources/0.4.0" as const;

export interface OutlookClassicalSource extends PreliminarySource {
  textLayer: "original";
  reviewedOn: string;
  passages: readonly { id: string; text: string; layer: "original"; quoteSha256: string; facsimilePageOneBased?: number; locator?: string; conditionNote?: string }[];
  crossChecks: readonly { url: string; status: "passages-compared" | "variant-recorded" | "primary-facsimile-checked"; note: string }[];
  textualNotes: readonly string[];
  sourceBoundary: string;
}
export interface OutlookRuleBasis {
  id: string;
  path: string;
  sourceIds: readonly string[];
  necessaryConditions: readonly string[];
  branches: readonly { when: string; support: string; pressure: string }[];
  blockers: readonly string[];
  rescues: readonly string[];
  counterexamples: readonly string[];
  modelingBoundary: readonly string[];
  evaluation: "requires-runtime-evaluation";
}

export const OUTLOOK_CLASSICAL_SOURCES: readonly OutlookClassicalSource[] = Object.freeze([
{
  "id": "outlook-zq-resource-wealth",
  "title": "《子平真诠》·论印与论印取运（印财分用）",
  "url": "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf#page=74",
  "locator": "PDF74，书六十五，印多用财正反段；取运边界PDF75，书六十六。2026-10-16联网打开并视觉核影印。",
  "excerpt": "印重身強，透財以抑太過",
  "interpretation": "沈氏正文在印重身强前提下，以透财约束过多的印；同页另列印轻财重无劫救的相反分支。R4的印月令、月令外自身本气根、两个不同位置的印透根、恰一财透根、无透食伤官杀，是本地保守联合谓词，不是原书给出的计数阈值。身根与印根分读；财印相合或受克不自动判化去、失效或删根。该特定财字的任务不等于该五行全部用法或后续所有财运均吉。 原局任务与行运是否继续助财分别判断，不能仅从本命财用向推未来财运支持。",
  "textLayer": "original",
  "reviewedOn": "2026-10-16",
  "passages": [
    {
      "id": "resource-wealth-moderation",
      "text": "印重身強，透財以抑太過",
      "layer": "original",
      "quoteSha256": "648ceae9622c949b47f95f81d58ef4a4268f3750282f6f55f0191d1d27fe9c7a",
      "facsimilePageOneBased": 74,
      "locator": "NLC35296 PDF74，书六十五",
      "conditionNote": "原局印多用财段；印重身强是必要语境，不仅是财印同现。"
    },
    {
      "id": "resource-wealth-opposite",
      "text": "印輕財重，又無劫財以救",
      "layer": "original",
      "quoteSha256": "6ac7ebc713a4ee2164e37d1a8abd3a85acf2cb18351fc66e2a7ed4dec3da04b1",
      "facsimilePageOneBased": 74,
      "locator": "NLC35296 PDF74，书六十五",
      "conditionNote": "紧接相反分支；不将印轻财重套成财制印之利，也不凭有比劫字就自动认救应有效。"
    },
    {
      "id": "resource-wealth-output-feeding",
      "text": "財與食相生，輕而不輕",
      "layer": "original",
      "quoteSha256": "764735b0bcac882e6f6932e00866553a20ee626167cd5523baadacfb41c40c56",
      "facsimilePageOneBased": 74,
      "locator": "NLC35296 PDF74，书六十五",
      "conditionNote": "上文同时要求印重财轻而兼露伤食；本地无食伤首版不可声称此分支已满足。"
    },
    {
      "id": "resource-wealth-luck-boundary",
      "text": "印多遇財，運喜劫地，官印亦亨，財鄉則忌",
      "layer": "original",
      "quoteSha256": "6af266900e72ecabad089d2186226a4032cbc1e70d8aa53b9e6b69a351df4a52",
      "facsimilePageOneBased": 75,
      "locator": "NLC35296 PDF75，书六十六",
      "conditionNote": "影印PDF75作印多遇财，网页814137作印绶遇财。原句没有给出可直接编码的印财强度阈值；作为不泛喜财的边界，不单句判定所有来财作用。"
    }
  ],
  "crossChecks": [
    {
      "url": "https://www.tianyashuku.com/yijing/9643/814136.html",
      "status": "primary-facsimile-checked",
      "note": "原局印多用财及相反条件以NLC影印为准，网页辅助定位。"
    },
    {
      "url": "https://www.tianyashuku.com/yijing/9643/814137.html",
      "status": "variant-recorded",
      "note": "PDF75的印多遇财在网页为印绶遇财；不把异文静默合并或据此增设强度阈值。"
    }
  ],
  "textualNotes": [
    "根深一句没有明确把根限定为日主坐下本气根，本地身根/印根条件须分别标示。",
    "原汪例辛酉丙申壬申辛亥，壬本气根在时亥、丙财四支无火藏根且有丙辛合，故不声称原例满足R4全部本地准入。",
    "原书人物结果不作历史真值或准确率证据。"
  ],
  "sourceBoundary": "原书正文影印核对；不混入徐注。现代工作生活解释与联合谓词为本地建模。只支持已有明确前提下的任务区分，不建立财印一般吉凶定律。"
},

  {
    "id": "outlook-zq-month-command",
    "title": "《子平真诠》·论用神（月令原则）",
    "url": "https://www.tianyashuku.com/yijing/9643/814109.html",
    "locator": "《论用神》第一正文段",
    "excerpt": "八字用神，專求月令，以日干配月令地支，而生剋不同，格局分焉。",
    "interpretation": "月令地支与日干的关系是格局取用的起点。月令官杀主气未透仍可作为结构背景，与已透配合之神形成候选；未透不能当作自由参与天干合克的透干。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。原文命例仅核四柱与结构说明，不核历史人物身份、生日或事件准确率。",
    "passages": [
      {
        "id": "month-command-1",
        "text": "八字用神，專求月令，以日干配月令地支，而生剋不同，格局分焉。",
        "layer": "original",
        "quoteSha256": "20697bedf5a36cecbd50e7b6b1647ab60a6963443c523dcab990597551350520"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/010/",
        "status": "passages-compared",
        "note": "只比较与沈氏正文对应的短句及命例；繁简字差异保留，徐注、白话和现代导读不并入此引文。"
      }
    ],
    "textualNotes": [
      "引文取天涯第一正文段；古籍典藏对应原文段简体为“生克”，此处保留“生剋”。",
      "古籍典藏本页另含徐注、林注与现代导读；网页的“原文”标签不足以区分所有后加材料，本条仅使用两处转录共有的沈氏开篇句。",
      "“专求月令”不是月令主气一概成格，也不抹去月令藏干取用变化、透藏、轻重及配合；本地新增范围限官杀月令与已透配合候选。"
    ]
  },
  {
    "id": "outlook-zq-official-month-example",
    "title": "《子平真诠》·论正官（薛相公四柱例）",
    "url": "https://www.tianyashuku.com/yijing/9643/814132.html",
    "locator": "《论正官》第二正文段，起“以刑衝破害為忌”，薛相公例",
    "excerpt": "壬印戊財，以乙隔之，水與土不相礙",
    "interpretation": "原文四柱为甲申、壬申、乙巳、戊寅：乙日申月主气庚正官未透，壬印戊财已透，仍置于正官配合段讨论。此例支持保留月令正官的结构作用，不能据此将庚列为透干、自动断财印不相碍或宣告贵格。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。原文命例仅核四柱与结构说明，不核历史人物身份、生日或事件准确率。",
    "passages": [
      {
        "id": "month-official-xue",
        "text": "壬印戊財，以乙隔之，水與土不相礙",
        "layer": "original",
        "quoteSha256": "9e7a70394ec5e728b702e40aed91f092ece4aefe225e2534559f48649a4b976c"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/033/",
        "status": "passages-compared",
        "note": "只比较与沈氏正文对应的短句及命例；繁简字差异保留，徐注、白话和现代导读不并入此引文。"
      }
    ],
    "textualNotes": [
      "所选薛相公例四柱和“壬印戊财，以乙隔之，水与土不相碍”在两处转录一致；只作原文命例标签，不核人物身份。",
      "同页附近别例有“戊甲/戊申”“支会水局/支会木局”等转录差异，本条不引用这些异文，也未静默修订原页面。",
      "财印并透两不相碍是原文所列条件；本地仍须分别保留具体位置、干支作用、根气与承接，不因月令候选出现就视为全部条件已满足。"
    ]
  },
  {
    "id": "outlook-zq-killing-month-example",
    "title": "《子平真诠》·论偏官（乙亥乙酉例）",
    "url": "https://www.tianyashuku.com/yijing/9643/814140.html",
    "locator": "《论偏官》第二正文段，起“七煞之格局亦不一”，乙亥例",
    "excerpt": "煞用食制者，上也，煞旺食強而身健",
    "interpretation": "原文四柱为乙亥、乙酉、乙卯、丁丑：乙日酉月主气辛七杀未透，时干丁食神已透，原文仍按食制讨论。只支持月令七杀与透食的制杀路径候选；杀旺、食强、身健必须另审，不把古籍贵格词转为现实结果保证。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。原文命例仅核四柱与结构说明，不核历史人物身份、生日或事件准确率。",
    "passages": [
      {
        "id": "month-killing-yi",
        "text": "煞用食制者，上也，煞旺食強而身健",
        "layer": "original",
        "quoteSha256": "d0aff194e05a9440d9c1e691f417ee91b8001bfb74f36fb32dae61949f03b193"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/041/",
        "status": "passages-compared",
        "note": "只比较与沈氏正文对应的短句及命例；繁简字差异保留，徐注、白话和现代导读不并入此引文。"
      }
    ],
    "textualNotes": [
      "两处沈氏正文均列乙亥、乙酉、乙卯、丁丑，并以杀旺、食强、身健为条件；“煞/杀”等繁简转录差异保持各来源原貌。",
      "徐注另述亥卯、酉丑及阴阳制化，本条不把后人解释并入沈氏短引，也不据两个地支自动判合化成局。",
      "本地同五行藏根代理若未见丁火根，须保留该限制；不得用原文“食强”覆盖本地实际可计算的透藏与根气事实。"
    ]
  },
  {
    "id": "outlook-zq-success-rescue",
    "title": "《子平真诠》·论用神成败救应",
    "url": "https://www.tianyashuku.com/yijing/9643/814110.html",
    "locator": "论用神成败救应，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "成中有敗，必是帶忌；敗中有成，全憑救應。",
    "interpretation": "成、败、带忌、救应须分别判断；同见某十神不能代替作用链。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "success-rescue-1",
        "text": "成中有敗，必是帶忌；敗中有成，全憑救應。",
        "layer": "original",
        "quoteSha256": "ce6fcf2ad3cb14c09adcfdd51358921b603a316993f395e69f31431ab37efd24"
      },
      {
        "id": "success-rescue-2",
        "text": "官逢傷而透印以解之",
        "layer": "original",
        "quoteSha256": "1c741c64caa70e59f8ffdf6863202043121c052172220caebd7130b7d758c396"
      },
      {
        "id": "success-rescue-3",
        "text": "財逢劫而透食以化之",
        "layer": "original",
        "quoteSha256": "0d9e1c3f8cbbfe745a0d039274e7e6d315a7bf3095ab83daa47699ef03232131"
      },
      {
        "id": "success-rescue-4",
        "text": "印逢財而劫財以解之，或合財而存印",
        "layer": "original",
        "quoteSha256": "2a59de429ca461461ebd323af7fe8d721d0fa40dd1696d77be44c84e22e091ee"
      },
      {
        "id": "success-rescue-5",
        "text": "煞逢食制，印來護煞，而逢財以去印存食",
        "layer": "original",
        "quoteSha256": "8e6bb796aff64ad97b0ff6f6554be952f3c5f2f175346eadb798d5918880bedc"
      },
      {
        "id": "success-rescue-6",
        "text": "傷官生財而財又逢合",
        "layer": "original",
        "quoteSha256": "a771532bbf62b326c3202adea49350a2b28317a0553e3a3869fba2abb84fb9c8"
      },
      {
        "id": "success-rescue-7",
        "text": "食神生財",
        "layer": "original",
        "quoteSha256": "1ff908a775dee1172e25bf6285277068cd474bd36e302c86e6d516d5c0f831fa"
      },
      {
        "id": "success-rescue-8",
        "text": "食神逢梟，或生財露煞，食神格敗也",
        "layer": "original",
        "quoteSha256": "e0aa8d8169051fb436a9077dbecf8bbe6bcbee248816f8790cb0f3dc30cf849b"
      },
      {
        "id": "success-rescue-9",
        "text": "食逢梟而就煞以成格，或生財以護食",
        "layer": "original",
        "quoteSha256": "338cc9e0bdd9a3d906adc6ac9109f0d2c931481688ea68f75aa4b9aa14b35015"
      },
      {
        "id": "success-rescue-10",
        "text": "建祿月劫用官，遇傷而傷被合",
        "layer": "original",
        "quoteSha256": "c66a5a1b616de507aaaed10de1aa68410c2143f712f70c921a96b1106764d961"
      },
      {
        "id": "success-rescue-11",
        "text": "七煞逢食制而又逢印",
        "layer": "original",
        "quoteSha256": "e8261c548984a27fbcb7d29b08c2ad9b5a3a65cb806e91fa33c91dfde4255b6f"
      },
      {
        "id": "success-rescue-12",
        "text": "佩印而印又遭傷",
        "layer": "original",
        "quoteSha256": "93a5efc4305a56e6d6307dcb6855719818dc5b4c92731b88a5b976e854db47b5"
      },
      {
        "id": "success-rescue-13",
        "text": "或傷官佩印而傷官旺，印有根",
        "layer": "original",
        "quoteSha256": "10e7d603dd91b317568f9ede815968ade3b7ad88ef8dabaf06786830164fd637"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/011/",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [
      "天涯的“生財生帶煞”与第二转录“生财而带煞”有异文，该短句不作为本次执行依据。",
      "Mingsage把“财旺生官者，月令星旺…”等徐注段混标“古籍原句”；本条以天涯原文与古籍典藏明确原文层共有短句为准。",
      "本次新增合伤、食制逢印、关键印遭伤与伤旺印有根四条短引，均核对天涯正文及古籍典藏对应沈氏正文；该站网页的原文标签不能代替原文与徐注分层。",
      "“遇伤而伤被合”描述有条件的救应方向，不能把任意五合视为已合去；本地必须区分合住阻碍对象与救应之神被第三字牵连。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-luck",
    "title": "《子平真诠》·论行运",
    "url": "https://www.tianyashuku.com/yijing/9643/814126.html",
    "locator": "论行运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "每運行一字，即必以此一字，配命中干支而統觀之",
    "interpretation": "先确认原局需要保护或帮助的路径，再判断岁运；同五行、同十神不能不分作用位置。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "luck-1",
        "text": "每運行一字，即必以此一字，配命中干支而統觀之",
        "layer": "original",
        "quoteSha256": "f0534ceecd7b662a514d1651c9054115fc94314ba72e23e27710266cd5fe6829"
      },
      {
        "id": "luck-2",
        "text": "官用印以制傷，而運助印",
        "layer": "original",
        "quoteSha256": "8bd7209666d5452c59a608d2594ebf81e1aa83930575c60db90d24172633f9f5"
      },
      {
        "id": "luck-3",
        "text": "月劫用財，而運行傷食",
        "layer": "original",
        "quoteSha256": "6c5ad78ffc9db7fb6bc73bb723918c1e52459494fb95c919d1038ff7affeb114"
      },
      {
        "id": "luck-4",
        "text": "正官無印，而運行傷",
        "layer": "original",
        "quoteSha256": "3be9af45a71000f6eba5274c93e63767062623098a9a1cc41fd7c149db22f8de"
      },
      {
        "id": "luck-5",
        "text": "官逢傷運，而命透印",
        "layer": "original",
        "quoteSha256": "3423f4b77b4c2d23b2404d3a30f3517f14cf027adccec1d722d5cdc44ecba3b7"
      },
      {
        "id": "luck-6",
        "text": "丁生亥月，而年透壬官，逢丙則幫身，逢丁則合官",
        "layer": "original",
        "quoteSha256": "3b5b69a24b702f7c1732dbb7682143b3ecf7a7b1e09b8a6515ef6a73cb846388"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/027/",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [
      "天涯有“運既忌面又衝”讹字；不引用该异文字句。",
      "本章论运的原则移用于逐年/节令月标签，是本产品分层建模，并非原文给出了现代标签算法。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-peer-luck",
    "title": "《子平真诠》·论建禄月劫取运",
    "url": "https://www.tianyashuku.com/yijing/9643/814147.html",
    "locator": "论建禄月劫取运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "祿劫取運，即以祿劫所成之局，分而配之。",
    "interpretation": "禄劫须先取具体财官食煞路径；财食/食煞轻重可使方向反转。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "peer-luck-1",
        "text": "祿劫取運，即以祿劫所成之局，分而配之。",
        "layer": "original",
        "quoteSha256": "2dd43d42176e4de032d1e2be5670556472e77c5edec284708918e9fc70250416"
      },
      {
        "id": "peer-luck-2",
        "text": "財食重則喜印綬",
        "layer": "original",
        "quoteSha256": "6393cc951063f0df77425b87f33a3d8e6458740c62439d7489159e8cf3ff0415"
      },
      {
        "id": "peer-luck-3",
        "text": "財食輕則宜助財，而不喜印比",
        "layer": "original",
        "quoteSha256": "e3ea494573f8a1275b6acb720058537252dbd572b67dead746f41faafe3014a9"
      },
      {
        "id": "peer-luck-4",
        "text": "食重煞輕，則運宜助煞；食輕煞重，則運喜助食",
        "layer": "original",
        "quoteSha256": "344bc0fd8ed07b3b22e796c7a7b785e0cb436dab9a2fa5bd023780ebd69ac8cf"
      },
      {
        "id": "peer-luck-5",
        "text": "若命中傷食太重，則財運固利，而印亦不忌矣",
        "layer": "original",
        "quoteSha256": "3aea1d5c5b0693ef8c329fc787375061f28953170e98f6735067d9ad73b741eb"
      },
      {
        "id": "peer-luck-6",
        "text": "逢煞無傷，遇官非福。",
        "layer": "original",
        "quoteSha256": "2b863526b2c480047649de09b58b282a1f648abff0fe370862b59f9e06ab78b6"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/048/",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      },
      {
        "url": "https://www.mingsage.com/zh/classics/zi-ping-zhen-quan/lun-jian-lu-yue-jie-qu-yun",
        "status": "passages-compared",
        "note": "财食轻重及不忌比肩句与古籍典藏一致。"
      }
    ],
    "textualNotes": [
      "天涯“而不書法比肩”对照古籍典藏及Mingsage均为“而不忌比肩”；保留原转录，摘句避开讹字，不静默修正文。",
      "“财生喜印”三转录同文，承接上段官格；不独立泛化为所有财星都喜印。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-wealth-luck",
    "title": "《子平真诠》·论财取运",
    "url": "https://www.tianyashuku.com/yijing/9643/814135.html",
    "locator": "论财取运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "財用食生，財食重而身輕，則喜助身；財食輕而身重，則仍行財食。",
    "interpretation": "财格食生、佩印、食印及带煞分别取运；财星不是全局固定正向指标。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "wealth-luck-1",
        "text": "財用食生，財食重而身輕，則喜助身；財食輕而身重，則仍行財食。",
        "layer": "original",
        "quoteSha256": "5a6abd11eeec83d052b517a5ce2c3cc1614ea5a77d8ca07f0bd2d25ce767783e"
      },
      {
        "id": "wealth-luck-2",
        "text": "財格佩印，運喜官鄉，身弱逢之，最喜印旺。",
        "layer": "original",
        "quoteSha256": "2af4c59bc3d74411e0618e00e2039862e57d225d8010340056a9382c71b9cd0c"
      },
      {
        "id": "wealth-luck-3",
        "text": "財用食印，財輕則喜財食，身輕則喜比印",
        "layer": "original",
        "quoteSha256": "0e8f2c71bb6e78b74ca5c71dac3b3ca21037521c6ce5f7dc13c6427314c9a3c1"
      },
      {
        "id": "wealth-luck-4",
        "text": "財帶七煞。不論合煞制煞，運喜食傷身旺之方。",
        "layer": "original",
        "quoteSha256": "ea64b7e802046cb378fc132f6563cd4ff294ed973774a84718e6468f440209eb"
      }
    ],
    "crossChecks": [
      {
        "url": "https://www.mingsage.com/zh/classics/zi-ping-zhen-quan/lun-cai-qu-yun",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [
      "天涯首段“印緩”对照另一转录为“印绶”；本次采用无此歧义的原文短句。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-official-luck",
    "title": "《子平真诠》·论正官取运",
    "url": "https://www.tianyashuku.com/yijing/9643/814133.html",
    "locator": "论正官取运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "身稍輕則取助身，官稍輕則助官",
    "interpretation": "官格须分助身、助官及印护官；保护印与削减过重印的适用情形不同。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "official-luck-1",
        "text": "身稍輕則取助身，官稍輕則助官",
        "layer": "original",
        "quoteSha256": "6626fee00670f0f4f7222528e94c4715e342cfddbabaed85a41458f52005d4a4"
      },
      {
        "id": "official-luck-2",
        "text": "若官重身輕而佩印，則身旺為宜，不必財運也。",
        "layer": "original",
        "quoteSha256": "e54b416ada8de1ef8ce0b6ec4acdaa0029231575551de2ba1992809094098894"
      },
      {
        "id": "official-luck-3",
        "text": "正官帶傷食而用印製，運喜官旺印旺之鄉，財運切忌。",
        "layer": "original",
        "quoteSha256": "cbc7473681d4e4bd50696abf208e0c5f48439eed05215865ffec0133c1e303a7"
      },
      {
        "id": "official-luck-4",
        "text": "若印綬疊出，財運亦無害矣。",
        "layer": "original",
        "quoteSha256": "af8f52b5301b56a20552a8ed78a75cb7a89c57eac86cc4195148f76f3299c4cd"
      }
    ],
    "crossChecks": [
      {
        "url": "https://www.mingsage.com/zh/classics/zi-ping-zhen-quan/lun-zheng-guan-qu-yun",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [
      "天涯“運喜印受身旺”对照另一转录为“印绶身旺”；不引用该讹字句。",
      "本次不把章中刑冲概述扩大为任意位置一冲即败，须与论行运的轻重/救应统观。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-resource-luck",
    "title": "《子平真诠》·论印绶取运",
    "url": "https://www.tianyashuku.com/yijing/9643/814137.html",
    "locator": "论印绶取运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "官露印重，財運反吉，傷食之方，亦為最利。",
    "interpretation": "印的多少、是否用印护官或泄秀决定财食作用；不可将印格统一写成喜印忌财。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "resource-luck-1",
        "text": "官露印重，財運反吉，傷食之方，亦為最利。",
        "layer": "original",
        "quoteSha256": "db3b8a27c325515cae10ea629a25ed63c428305c522aa86c5e60119e8c684192"
      },
      {
        "id": "resource-luck-2",
        "text": "若用官而帶傷食，運喜官旺印綬之鄉，傷食為害",
        "layer": "original",
        "quoteSha256": "b0682a6824090aac6f4de59dd559146d5f54332173f43ba2d1f244f3a0a8112c"
      },
      {
        "id": "resource-luck-3",
        "text": "印綬遇財，運喜劫地，官印亦亨，財鄉則忌。",
        "layer": "original",
        "quoteSha256": "6cd05035b7918411af03c7c79f40c42797915b190d4ada77ee10dd5c606922f3"
      },
      {
        "id": "resource-luck-4",
        "text": "印用食傷，印輕者亦不利見財也。",
        "layer": "original",
        "quoteSha256": "b9758df852ed71bfabb40bb5757455761a65ba38679d60644323aff23c236c92"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/038/",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-food-luck",
    "title": "《子平真诠》·论食神取运",
    "url": "https://www.tianyashuku.com/yijing/9643/814139.html",
    "locator": "论食神取运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "食用煞印，運喜印旺，切忌財鄉。",
    "interpretation": "食神生财、食神制杀、弃食用印必须区分；财可助输出，也可能助杀或破印。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "food-luck-1",
        "text": "食用煞印，運喜印旺，切忌財鄉。",
        "layer": "original",
        "quoteSha256": "ba089fc2c7bcc056434e08fb945eb53430c905bf4cb6635ceba6e13830c90801"
      },
      {
        "id": "food-luck-2",
        "text": "若食太重而煞輕，印運最利，逢財反吉矣。",
        "layer": "original",
        "quoteSha256": "c40d78d37ddc0f62555c62e153e959ce8175afe9df0582d92295411bdfaed0e4"
      },
      {
        "id": "food-luck-3",
        "text": "若食神帶印，透財以解，運喜財旺，食傷亦吉，印與官煞皆忌也。",
        "layer": "original",
        "quoteSha256": "2c6b4837637a8f9c66e31ebe1e6001df0c4cebce47597139b84f7c25dd52b099"
      },
      {
        "id": "food-luck-4",
        "text": "官煞之方，俱為不美。",
        "layer": "original",
        "quoteSha256": "0b2e3c171af15ec08b5f971d052b96760df715c7c191a539b6d61848f9da3732"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/040/",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      },
      {
        "url": "https://www.mingsage.com/zh/classics/zi-ping-zhen-quan/lun-shi-shen-qu-yun",
        "status": "variant-recorded",
        "note": "首段财食轻与古籍典藏一致，异于天涯；歧义句未采用。"
      }
    ],
    "textualNotes": [
      "首段天涯“財重食輕”，古籍典藏/Mingsage均作“财食轻”。未作影印校勘，本资料不引用有歧义的轻重分句；同段官煞作用短句经三转录对照一致，单独登记；轻重依据用无歧义的论财取运与禄劫取运条。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-killings-luck",
    "title": "《子平真诠》·论偏官取运",
    "url": "https://www.tianyashuku.com/yijing/9643/814141.html",
    "locator": "论偏官取运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "煞重食輕則助食，煞輕食重則助煞，煞食均而日主根輕則助身。",
    "interpretation": "食制与印化为不同路径；扶助杀、扶助食或扶身须看实际不足，印是否夺食取决于是否真的以食为用。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "killings-luck-1",
        "text": "煞重食輕則助食，煞輕食重則助煞，煞食均而日主根輕則助身。",
        "layer": "original",
        "quoteSha256": "7df10cab7dca39eca9097eb51d3306106f6d3f347357fea394a3f4af845d3794"
      },
      {
        "id": "killings-luck-2",
        "text": "忌正官之混雜，畏印綬之奪食。",
        "layer": "original",
        "quoteSha256": "f68dd72b8aeb76937e7b4c44b22850b32fe42fc7ddd6fd09d5d2ef21e3fb5658"
      },
      {
        "id": "killings-luck-3",
        "text": "煞用印綬，不利財鄉",
        "layer": "original",
        "quoteSha256": "9e1d484df567049e9c4bf482fa3b3048e7112e88f2ff4840594196aceb6fb2f0"
      },
      {
        "id": "killings-luck-4",
        "text": "莫去取清之物，無傷制煞之神。",
        "layer": "original",
        "quoteSha256": "878e9550a9ad4323a5debfd3ed1b5a8aaa1ae26876c05e0c225feb703398f630"
      },
      {
        "id": "killings-luck-5",
        "text": "無食可奪，印運何傷？",
        "layer": "original",
        "quoteSha256": "1ba8dc77b35c394dd2ca66523f6c93d1b5c485b9e53f62df42e7d7f454ddd8fd"
      }
    ],
    "crossChecks": [
      {
        "url": "https://www.mingsage.com/zh/classics/zi-ping-zhen-quan/lun-pian-guan-qu-yun",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-hurting-luck",
    "title": "《子平真诠》·论伤官取运",
    "url": "https://www.tianyashuku.com/yijing/9643/814143.html",
    "locator": "论伤官取运，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "傷官用財，財旺身輕，則利印比；身強財淺，則喜財運，傷官亦宜。",
    "interpretation": "伤官用财与佩印不同；财印轻重与日主承接条件不能被“伤官生财”名称覆盖。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "hurting-luck-1",
        "text": "傷官用財，財旺身輕，則利印比；身強財淺，則喜財運，傷官亦宜。",
        "layer": "original",
        "quoteSha256": "d4392167f9ab13e051ea031a7456a45e5412aed768cc374d3c1e8341e806f797"
      },
      {
        "id": "hurting-luck-2",
        "text": "傷官佩印，運行官煞為宜，印運亦吉，傷食不礙，財地則凶。",
        "layer": "original",
        "quoteSha256": "399c65aef204d1a9ec3a68528236e1f4b5ae40d3e940bff15d6608eeaa7f402b"
      },
      {
        "id": "hurting-luck-3",
        "text": "其財多而帶印者，運喜助印，印多而帶財者，運喜助財。",
        "layer": "original",
        "quoteSha256": "1471083426de9996e93c99f242befa9fca4091826acd2240cb0fb1e91b3a8a18"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/044/",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [
      "天涯“惟七根重”对照古籍典藏为“惟七煞根重”；不采用该含讹字句。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  },
  {
    "id": "outlook-zq-stem-branch",
    "title": "《子平真诠》·论喜忌干支有别",
    "url": "https://www.tianyashuku.com/yijing/9643/814128.html",
    "locator": "论喜忌干支有别，以所列短句定位；2026-10-16公开转录采集",
    "excerpt": "干主一而支藏多",
    "interpretation": "同属一五行的天干、地支及藏干不等价；透出、根地和组合后的作用分别建模。",
    "textLayer": "original",
    "reviewedOn": "2026-10-16",
    "passages": [
      {
        "id": "stem-branch-1",
        "text": "干主一而支藏多",
        "layer": "original",
        "quoteSha256": "4351dde6232b8ddd4a500719801f0d54bc90d3cc907f805ba9b4365b18f2ae0e"
      },
      {
        "id": "stem-branch-2",
        "text": "甲用酉官，逢庚辛則官煞雜，而申酉不作此例。",
        "layer": "original",
        "quoteSha256": "a9bca2b58925ca91cf269dbeff99407b6bd489c807adc55f59b23506b0f6fa95"
      },
      {
        "id": "stem-branch-3",
        "text": "透丁則傷官，而逢午不作此例。",
        "layer": "original",
        "quoteSha256": "8480f9c656f405cf5b980e30d36798ec760006e8e727bcbc5ac098bd55ec5b77"
      }
    ],
    "crossChecks": [
      {
        "url": "https://luckclub.cn/bazi/002/029/",
        "status": "passages-compared",
        "note": "仅核对原文短句；该站评注、白话及现代导读不并入原文。"
      }
    ],
    "textualNotes": [
      "天涯“丁巳並藏”“甲生甲月”分别与另一转录“丁己并藏”“甲生申月”不同；两句均排除，不据此生成规则。"
    ],
    "sourceBoundary": "公开转录之间的交叉核对，不是影印本校勘；网页无固定revision，固定的是本地采集文本和引文摘要。"
  }
]);

/** These are textual rule bases, never a lookup table of settled good/bad outcomes. */
export const OUTLOOK_RULE_BASES: readonly OutlookRuleBasis[] = Object.freeze([
  {
    id: "outlook-basis-resource-wealth", path: "resource_wealth", sourceIds: ["outlook-zq-resource-wealth"],
    necessaryConditions: ["本命已通过印令、重复印透根、自身本气根与单财透根的联合工作规则", "财承担约印任务，印的原有支持仍然保留"],
    branches: [
      { when: "目标财有根、未被具体合克牵制，背景未再出现财食负荷转支", support: "对当前裁印任务提供作用候选", pressure: "不得由财字再现推为普遍吉运" },
      { when: "目标再印或比劫牵制既有财", support: "原局有根财可约束新增印，但财自己的合克须核", pressure: "支持重复或裁印环节被具体牵制" },
      { when: "背景另透财食或目标新透食伤", support: "保留裁印与泄秀的不同任务", pressure: "财食可能增重，不能直接沿本命单财分支" }
    ],
    blockers: ["具体财字与其他透干相合或被比劫所克", "新增食伤生财改变原局无透食伤的条件"],
    rescues: ["实际有根且无另合克牵连的财，可作为约束新增印的候选"],
    counterexamples: ["印轻财重、无自身本气根或多财透出，均不能由财印同现套用本条", "本命用财不等于后续所有财运皆吉"],
    modelingBoundary: ["本地岁运应用以实际作用对象及原局任务作条件判断，不是原文给出的强度阈值", "未由合冲宣告去根、合去或制化已完成"],
    evaluation: "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-whole-chart",
    "path": "all",
    "sourceIds": [
      "outlook-zq-luck",
      "outlook-zq-success-rescue",
      "outlook-zq-stem-branch"
    ],
    "necessaryConditions": [
      "已确认本命取用路径；目标及背景节点真实有效；未知时柱不参与",
      "同一十神的具体干、位置、透藏层次分别记录"
    ],
    "branches": [
      {
        "when": "本命确需某作用且无已知阻碍",
        "support": "帮助该作用的运限才是支持线索",
        "pressure": "牵制所用之干、破坏既有保护路径才是阻碍线索"
      }
    ],
    "blockers": [
      "只凭十神名称或五行同类",
      "未确认合去/合化就删除本命作用",
      "跨段把所有大运合票"
    ],
    "rescues": [
      "逐项识别针对同一阻碍的保护/制约；有救应事实不等于救应有效"
    ],
    "counterexamples": [
      "同为火，丁生亥月见丙帮身，见丁可能合壬官",
      "同为金，透庚混官与申酉得根不是同一判断"
    ],
    "modelingBoundary": [
      "主判断标签、主轴优先级和年/月/运分层是产品规则，不是古籍公式",
      "未求值前提必须保留；不能以没有检测到代替已排除"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-peer-output-wealth",
    "path": "peer_output_wealth",
    "sourceIds": [
      "outlook-zq-peer-luck",
      "outlook-zq-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "月令禄劫背景且另取财用",
      "食伤与财有具体位置及连接，不能只看藏干名称",
      "需判财食相对负荷；中和不自动等于财食轻"
    ],
    "branches": [
      {
        "when": "财食轻且该路径能承接",
        "support": "助财，或按论行运扶助食伤连接",
        "pressure": "不喜继续印比阻碍此路径"
      },
      {
        "when": "财食重",
        "support": "印绶支持；比肩不一概为忌",
        "pressure": "继续扩大财食的泄耗需审慎，不能套轻支"
      }
    ],
    "blockers": [
      "关键财干受牵制",
      "食伤桥接受印制而有效救应未立",
      "财转生杀造成另一条压力路径"
    ],
    "rescues": [
      "财逢劫而透食化之",
      "针对印制食的财去印存食须确认原局用途与位置"
    ],
    "counterexamples": [
      "财食重时印可喜；不是见印一律坏",
      "财食负荷未知不按基线balanced强选轻",
      "同段原文逢煞无伤、遇官非福：不可把正官和七杀合成authority一票；七杀出现本身不作固定压力，正官也不能无条件忽略。"
    ],
    "modelingBoundary": [
      "财食轻重/承接阈值没有古文数值，须另列可审查本地模型及敏感性",
      "结构支持不转写为赚钱或事业事件保证",
      "若七杀的具体干与关键食伤用字发生合克，须另据该互动评估，不把这条压力冒称来自七杀名称；支藏七杀不等同透干。"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-wealth-food",
    "path": "wealth_food",
    "sourceIds": [
      "outlook-zq-wealth-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "本命财格取食生财",
      "可辨财食与日主相对负荷"
    ],
    "branches": [
      {
        "when": "财食重而身轻",
        "support": "助身",
        "pressure": "财食继续增加的承接压力"
      },
      {
        "when": "财食轻而身重",
        "support": "财食路径",
        "pressure": "官印可能晦其输出路径，须核对作用位置"
      }
    ],
    "blockers": [
      "财轻比重且无食化/官制",
      "财引七杀而食制、合杀条件未成立"
    ],
    "rescues": [
      "财逢劫而透食化之或生官制之",
      "食神制杀保财或合杀存财均须实际作用成立"
    ],
    "counterexamples": [
      "同是财运，身轻财重与身重财轻不能同判"
    ],
    "modelingBoundary": [
      "不把整个泄耗克总分直接当财食负荷",
      "不将同现食财自动认定无障碍生财"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-hurting-wealth",
    "path": "hurting_wealth",
    "sourceIds": [
      "outlook-zq-hurting-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "伤官取财路径有本命依据",
      "财旺身轻/身强财浅须分别判断"
    ],
    "branches": [
      {
        "when": "财旺身轻",
        "support": "印比承接",
        "pressure": "继续财旺可能加重负担"
      },
      {
        "when": "身强财浅",
        "support": "财运、适量伤官输出",
        "pressure": "助印制伤或关键财被牵制需检查"
      }
    ],
    "blockers": [
      "所用财干被合的事实及作用条件",
      "财又生杀且无保护"
    ],
    "rescues": [
      "有针对性的制约/救应；不得用任意木或水存在代替"
    ],
    "counterexamples": [
      "伤官名称相同，佩印路径喜官印，与用财路径不同"
    ],
    "modelingBoundary": [
      "官杀轻重、调候例外另判；没有足够事实不称破格"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-official-wealth",
    "path": "official_wealth",
    "sourceIds": [
      "outlook-zq-official-luck",
      "outlook-zq-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "本命正官取财生官",
      "官实际透出/根气和身官轻重可辨"
    ],
    "branches": [
      {
        "when": "身稍轻",
        "support": "助身及支持",
        "pressure": "继续增加官的约束可能承压"
      },
      {
        "when": "官稍轻或身旺财轻官弱",
        "support": "助官或财官",
        "pressure": "伤官作用于所用官且无保护"
      }
    ],
    "blockers": [
      "官被牵制、混杀、重官须按具体干及救应分辨",
      "财生官同时破印的路径冲突"
    ],
    "rescues": [
      "官逢伤而透印解之",
      "伤已被合或有取清之物必须保护其作用"
    ],
    "counterexamples": [
      "官轻需要帮助与官重身轻方向不同",
      "任意位置冲不直接判官格败"
    ],
    "modelingBoundary": [
      "透根和身官轻重由明确本地谓词给出；不以数个官字直接判重"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-official-resource",
    "path": "official_resource",
    "sourceIds": [
      "outlook-zq-official-luck",
      "outlook-zq-success-rescue",
      "outlook-zq-luck"
    ],
    "necessaryConditions": [
      "本命有官与印保护关系，区别仅官印同现",
      "若以印制伤护官，先确认印作用位置及承接"
    ],
    "branches": [
      {
        "when": "官带伤而用印制，印未过重",
        "support": "官印旺的支持",
        "pressure": "财直接损伤关键印"
      },
      {
        "when": "官重身轻而佩印",
        "support": "身旺支持",
        "pressure": "不必再一律增财官"
      },
      {
        "when": "印绶叠出且财不至破保护",
        "support": "财未必有害",
        "pressure": "不能套一般忌财支"
      }
    ],
    "blockers": [
      "关键印被财作用",
      "官被牵制且保护路径无效"
    ],
    "rescues": [
      "已透有效印可缓解伤官对官的作用",
      "印过重分支不将财直接等同破印"
    ],
    "counterexamples": [
      "正官见伤可有印救；不是官伤同现必凶"
    ],
    "modelingBoundary": [
      "保护成立、印叠出的有效程度必须显式建模，单有印不默认救全局"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-resource-output",
    "path": "resource_output",
    "sourceIds": [
      "outlook-zq-resource-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "印格背景取食伤泄气",
      "身印承接与印轻/重先区分"
    ],
    "branches": [
      {
        "when": "官露印重或身印两旺用食伤",
        "support": "食伤、适用条件下财",
        "pressure": "继续印官可能使输出受阻"
      },
      {
        "when": "印轻而取食伤",
        "support": "保护必要印的承接",
        "pressure": "财损轻印，不能套印重喜财"
      }
    ],
    "blockers": [
      "食伤泄气又遇财露伤印",
      "印轻被财损而无保护"
    ],
    "rescues": [
      "比劫制财/合财存印的作用需核验",
      "印多用财与印轻护印保留相反分支"
    ],
    "counterexamples": [
      "同一印格有喜财也有忌财，不能全局固定"
    ],
    "modelingBoundary": [
      "身印两旺与印轻没有古文数字；现有日主band不足以替代两者"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-resource-preservation",
    "path": "resource_preservation",
    "sourceIds": [
      "outlook-zq-resource-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "印被选为必要支持而非过重待损",
      "本命财印位置及冲突路径清楚"
    ],
    "branches": [
      {
        "when": "印遇财且必要印受损",
        "support": "劫制财、官印支持可形成保护",
        "pressure": "再加财并继续损印"
      }
    ],
    "blockers": [
      "财直接作用关键印",
      "制财之物受牵制"
    ],
    "rescues": [
      "劫财解财损印",
      "合财存印须区分合事实与已合去"
    ],
    "counterexamples": [
      "财轻印多以财损印者不适用本条"
    ],
    "modelingBoundary": [
      "这是保护所用印的条件条，不等于所有印格喜印比"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-food-killings",
    "path": "food_killings",
    "sourceIds": [
      "outlook-zq-killings-luck",
      "outlook-zq-food-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "实际选食神制杀路径，不是弃食用杀印",
      "食杀轻重及日主根气需单独判断"
    ],
    "branches": [
      {
        "when": "杀重食轻",
        "support": "助食",
        "pressure": "助杀或印夺关键食"
      },
      {
        "when": "杀轻食重",
        "support": "助杀；适用时财可扶不足之杀",
        "pressure": "继续过制"
      },
      {
        "when": "食杀均而日主根轻",
        "support": "助身",
        "pressure": "继续克泄叠加"
      }
    ],
    "blockers": [
      "印夺关键食而保护杀",
      "混官改变路径",
      "财助杀是否为害随杀不足/过重而变"
    ],
    "rescues": [
      "财去印存食须确认其作用强弱和不造成新的党杀",
      "保护食或补身不可混成同一票"
    ],
    "counterexamples": [
      "杀轻食重，助杀可为支持",
      "无食可夺的刃当杀路径不能把印判作夺食"
    ],
    "modelingBoundary": [
      "食/杀相对量与根轻为独立本地模型，不能以日主强弱直接代替"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-killings-resource",
    "path": "killings_resource",
    "sourceIds": [
      "outlook-zq-killings-luck",
      "outlook-zq-resource-luck",
      "outlook-zq-success-rescue"
    ],
    "necessaryConditions": [
      "实际以印承接杀的路径",
      "关键印未受阻且确有必要"
    ],
    "branches": [
      {
        "when": "杀用印绶",
        "support": "印及身的支持",
        "pressure": "财破关键印并助杀"
      }
    ],
    "blockers": [
      "关键印被财制/牵制",
      "同时用食制与印化可能彼此相碍，不能默认两个都是加分"
    ],
    "rescues": [
      "财被有效制约或合而保印须验证",
      "身强印过重时改用另一分支，不能无限增印"
    ],
    "counterexamples": [
      "杀用食制忌印夺食，杀用印却可喜印"
    ],
    "modelingBoundary": [
      "印化杀不是见杀见印即自动成立"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-hurting-resource",
    "path": "hurting_resource",
    "sourceIds": [
      "outlook-zq-hurting-luck",
      "outlook-zq-success-rescue",
      "outlook-zq-luck"
    ],
    "necessaryConditions": [
      "实际伤官佩印路径，伤旺且印有根/有效",
      "不是身旺伤轻又用重印"
    ],
    "branches": [
      {
        "when": "以印制伤承接",
        "support": "官杀生印、印支持",
        "pressure": "财破关键印"
      },
      {
        "when": "兼财印且财多带印",
        "support": "助印",
        "pressure": "继续财旺"
      },
      {
        "when": "兼财印且印多带财",
        "support": "助财",
        "pressure": "继续印重"
      }
    ],
    "blockers": [
      "印根/透干被损",
      "保护印与生财路径争用同一作用"
    ],
    "rescues": [
      "财被制约、印有有效承接等分别核验"
    ],
    "counterexamples": [
      "伤轻身旺佩印可能本就不适用",
      "不能一看伤官就把官杀都列压力"
    ],
    "modelingBoundary": [
      "佩印用途与轻重必须明确建模，不声称古籍规定了权重阈值"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-stem-branch-identity",
    "path": "all",
    "sourceIds": [
      "outlook-zq-stem-branch",
      "outlook-zq-luck"
    ],
    "necessaryConditions": [
      "精确区分干、支、藏干、位置与目标ref"
    ],
    "branches": [
      {
        "when": "作用指向原局所用之干或根地",
        "support": "补所缺的条件成立时才支持",
        "pressure": "伤所用的条件成立时才承压"
      }
    ],
    "blockers": [
      "同五行替换具体干字",
      "支中含某干即当透干",
      "不完整三合当化局"
    ],
    "rescues": [
      "会合解冲只有形势和作用条件均具备才成立"
    ],
    "counterexamples": [
      "甲用酉官，透庚与见申不同",
      "丁日亥月壬官，丙与丁不同"
    ],
    "modelingBoundary": [
      "只报二元合冲时，不推断三合会局、合化、合去和冲开库成功"
    ],
    "evaluation": "requires-runtime-evaluation"
  },
  {
    "id": "outlook-basis-food-wealth",
    "path": "food_wealth",
    "sourceIds": [
      "outlook-zq-food-luck",
      "outlook-zq-success-rescue",
      "outlook-zq-wealth-luck"
    ],
    "necessaryConditions": [
      "月令食神背景，原局确以食神生财为路径；不能直接以伤官用财条替换",
      "具体食神、财星及其透藏根气已辨；并非弃食而用杀印"
    ],
    "branches": [
      {
        "when": "食神生财路径已确定",
        "support": "原有食财连接与承接满足时保留支持；轻重阈值不得冒称本条原文定量",
        "pressure": "官杀透入、偏印作用于所用食神时核对结构阻碍，不能将支藏直接当透干"
      }
    ],
    "blockers": [
      "偏印夺食须核对所用食神、位置及实际制约；不把所有印同列",
      "生财又露杀时，财党杀与食制杀可能冲突，须显式保留"
    ],
    "rescues": [
      "原文生财护食可作针对偏印的救应依据；仍须核对财是否又去助杀",
      "若已弃食而用杀印，应切到对应本命路径，不同时引用两套互斥用法"
    ],
    "counterexamples": [
      "食神用杀印的取运与食神生财不同，不能因为月令食神就固定全局喜财忌印",
      "食太重而杀轻有印运最利、逢财反吉的另支，不把见杀自动断败"
    ],
    "modelingBoundary": [
      "食神取运轻重分句存在转录异文，本资料不登记该歧义句为执行依据",
      "若复用财用食生的负荷比较，必须标作本地跨路径负荷模型，并保留条件；不是食神专条已给出的机器阈值",
      "官杀/偏印的名称不替代作用是否达成；古籍成败词不转写成现实事件保证"
    ],
    "evaluation": "requires-runtime-evaluation"
  }
]);
