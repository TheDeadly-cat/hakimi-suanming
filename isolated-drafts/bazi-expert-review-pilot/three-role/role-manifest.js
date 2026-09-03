const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
};

const publicEvidence = {
  source: {
    title: "《滴天髓阐微》",
    bindingId: "binding:dtt:month-command",
    evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
    sourceId: "dtt-chanwei-wikisource-r2600158",
    sourceCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
    sourceCandidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
    permanentUrl: "https://zh.wikisource.org/w/index.php?title=%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE&oldid=2600158",
    revisionId: "2600158",
    revisionTimestamp: "2025-09-25T13:22:02Z",
    mediaWikiSha1: "6ac3dc412881525c2c0544b75e51512cc0daa573",
    rawWikitextSha256: "1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d",
    sourceBodyStored: false,
    storagePolicy: "link_only"
  },
  locator: {
    quoteCandidateId: "dtt-yueling-minimal-v1",
    heading: "十五、月令",
    rawRevisionLineStart: 2391,
    rawRevisionLineEnd: 2391,
    rawRevisionLine: "2391",
    rawCharacterStartZeroBased: 38616,
    rawCharacterEndExclusive: 38628,
    rawCharacterRange: "38616–38628（起点从 0 计，终点不含）",
    quoteCharacters: "12",
    quoteUtf8Bytes: "36",
    quoteSha256: "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9",
    occurrence: "固定 revision 内唯一命中",
    quoteTextStored: false
  },
  collation: [
    {
      label: "SSID 扫描候选 · 第 170 页",
      href: "https://commons.wikimedia.org/wiki/File:SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf?page=170",
      descriptionHref: "https://commons.wikimedia.org/wiki/File:SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf",
      pageRefId: "dtt-ssid-11335994-pdf-page-170",
      anchorId: "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
      collationCandidateId: "dtt-yueling-ssid-11335994-page-170-normalized-collation-v1",
      visibleHeading: "月令",
      carrierBytes: 14751242,
      carrierMime: "application/pdf",
      carrierSha256: "d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803",
      collationDigest: "154645461e0b47de7a04c660f7f56a89493e8ce8722fc6041f5baabaff936bc9",
      result: "只观察到规范化对应；不是逐字同一",
      exactGlyphSequenceEqual: false,
      humanCollatorAttestationCount: 0
    },
    {
      label: "CADAL 扫描候选 · 第 178 页",
      href: "https://commons.wikimedia.org/wiki/File:CADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu?page=178",
      descriptionHref: "https://commons.wikimedia.org/wiki/File:CADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu",
      pageRefId: "dtt-cadal-07005210-djvu-page-178",
      anchorId: "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
      collationCandidateId: "dtt-yueling-cadal-07005210-page-178-normalized-collation-v1",
      visibleHeading: "月令",
      carrierBytes: 17912324,
      carrierMime: "image/vnd.djvu",
      carrierSha256: "1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60",
      collationDigest: "b4ef49ed4c0369c12c97137370481059860068d068444a00f8b552a54adbc5d0",
      result: "只观察到规范化对应；不是逐字同一",
      exactGlyphSequenceEqual: false,
      humanCollatorAttestationCount: 0
    }
  ],
  rights: {
    rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
    rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
    workLayer: "候选观察，未作法律裁断",
    transcriptionLayer: "已观察平台条款，未清除复用条件",
    carrierLayer: "已观察两个载体标记，未清除权利层",
    distributionPolicy: "link_only",
    legalConclusion: "not_established",
    workLayerCleared: false,
    editionLayerCleared: false,
    carrierLayerCleared: false,
    policyLinks: [
      {
        label: "Wikimedia 使用条款 · 固定 revision 554823",
        href: "https://foundation.wikimedia.org/w/index.php?title=Policy%3ATerms_of_Use&oldid=554823#7._Licensing_of_Content"
      },
      {
        label: "CC BY-SA 4.0 法律文本",
        href: "https://creativecommons.org/licenses/by-sa/4.0/legalcode"
      },
      {
        label: "Commons 站外复用说明 · 固定 revision 1259943424",
        href: "https://commons.wikimedia.org/w/index.php?title=Commons%3AReusing_content_outside_Wikimedia&oldid=1259943424"
      }
    ]
  }
};

const sourceFacts = [
  { label: "Binding", value: publicEvidence.source.bindingId, mono: true },
  { label: "来源候选", value: publicEvidence.source.sourceCandidateId, mono: true },
  { label: "来源候选摘要", value: publicEvidence.source.sourceCandidateDigest, mono: true },
  { label: "固定 revision", value: publicEvidence.source.revisionId, mono: true },
  { label: "revision 时间", value: publicEvidence.source.revisionTimestamp, mono: true },
  { label: "MediaWiki SHA-1", value: publicEvidence.source.mediaWikiSha1, mono: true },
  { label: "raw wikitext SHA-256", value: publicEvidence.source.rawWikitextSha256, mono: true },
  { label: "章节定位", value: publicEvidence.locator.heading },
  { label: "行定位", value: publicEvidence.locator.rawRevisionLine, mono: true },
  { label: "字符范围", value: publicEvidence.locator.rawCharacterRange, mono: true },
  { label: "引文候选 SHA-256", value: publicEvidence.locator.quoteSha256, mono: true }
];

const domainFacts = [
  { label: "作品", value: publicEvidence.source.title },
  { label: "章节", value: publicEvidence.locator.heading },
  { label: "普通中文题面", value: "请判断月令在这部作品所述语境中的作用范围；说明需要合看的条件、可能的反例，以及哪些结构会使简单判断失效。" },
  { label: "当前材料", value: "本模板没有经授权的正文或引文正文，因此现在不能形成领域意见。" }
];

const domainMissing = [
  "经授权、可供领域专家阅读的作品正文与本章引文",
  "可靠的版本说明与真人校勘说明",
  "与题面有关的前后文、流派范围与术语说明",
  "权利核对完成后允许领域专家查看的只读材料包",
  "未来正式审阅所需的独立物理包或独立会话"
];

const makeDomainView = (seat) => ({
  id: `domain-${seat.toLowerCase()}`,
  path: `/domain-${seat.toLowerCase()}`,
  roleId: "domain-review",
  seat,
  navLabel: `领域模板 ${seat}`,
  title: `领域审阅模板 ${seat}`,
  summary: "这是同页可浏览的领域审阅模板，不是人员隔开或访问控制。同一人可以查看 A、B 两份模板；当前没有任何意见内容。",
  phaseNote: "当前材料不足以形成领域意见。未来正式 A／B 审阅必须使用独立物理包或独立会话，并另行核验人员独立性。",
  scope: [
    "在获得合规只读材料后，判断月令候选的传统语义范围",
    "列出适用条件、反例与可能使候选失效的结构",
    "把无法从材料确认的部分明确留为待定"
  ],
  exclusions: [
    "不判断作品、版本、转录或载体的法律权利",
    "不做文字校勘，也不抓取或处理来源资料",
    "不把同页 A／B 模板当作独立审阅或访问控制证据",
    "未来正式审阅时不查看、比较、评分、平均或合并另一人的意见",
    "不比较真人专家与 AI 的准确度，不为任何方法排名"
  ],
  facts: domainFacts,
  links: [],
  missing: domainMissing,
  currentOpinionRecords: 0,
  currentCrossTemplateOpinionContentExists: false,
  absenceOfOpinionsEstablishesAccessControl: false,
  opinionEntryEnabled: false
});

export const REVIEW_PREVIEW_MANIFEST = deepFreeze({
  manifestVersion: "dtt-month-command-three-role-preview/1.0.0",
  previewId: "hakimi.bazi.dtt-month-command.three-role.synthetic-preview.v1",
  title: "DTT 月令候选 · 三角色四视图模板预览",
  lifecycle: "synthetic",
  admissionState: "candidate-only",
  authorization: false,
  machinePacketBasis: {
    path: "content/system-admission/bazi-dtt-month-command-three-role-review-packet.v1.json",
    rawBytes: 30854,
    rawSha256: "252370b6a03e799321544948182351a96d42d148fe8e3039eacdb43385a4b5ca",
    packetId: "hakimi.bazi.dtt-month-command-three-role-review-packet/1.0.0",
    packetDigest: "c1f92bbb836875b50458e1a3c81bf1f2c1aa4a654fa8a9a9f66a7198f71a7d8e",
    browserStaticProjectionOnly: true,
    runtimePrivateBrand: false,
    runtimePrivateBrandEstablished: false,
    crossFileAtomicSnapshot: false
  },
  bindingGate: { verified: 0, total: 12, label: "0/12" },
  expertGate: { verified: 0, total: 2, label: "0/2" },
  templateBoundary: {
    samePageFourRouteNavigation: true,
    sameHumanMayBrowseAllTemplates: true,
    roleAccessControlEstablished: false,
    physicalSeatSeparationEstablished: false,
    sameHumanMultiSeatExcluded: false,
    currentOpinionRecords: 0,
    currentOpinionContentToLeakExists: false,
    absenceOfOpinionsEstablishesAccessControl: false,
    futureFormalDomainAAndBRequireIndependentPhysicalPackagesOrSessions: true,
    browserStaticProjectionOnly: true,
    runtimePrivateBrand: false,
    runtimePrivateBrandEstablished: false,
    crossFileAtomicSnapshot: false,
    applicationInitiatedExternalFetch: false,
    externalLinkNavigationMayUseNetwork: true
  },
  authorizations: {
    sourceBodyAccessAuthorized: false,
    quoteTextAccessAuthorized: false,
    identityCollectionAuthorized: false,
    contactCollectionAuthorized: false,
    realChartCollectionAuthorized: false,
    opinionCollectionAuthorized: false,
    submissionAuthorized: false,
    uploadAuthorized: false,
    persistentStorageAuthorized: false,
    networkFetchAuthorized: false,
    contentTruthEstablished: false,
    expertTruthEstablished: false,
    rightsLegalConclusionEstablished: false,
    expertClaimsAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  },
  dataBoundary: {
    sourceBodyStored: false,
    quoteTextStored: false,
    identityFields: 0,
    contactFields: 0,
    realChartFields: 0,
    opinionFields: 0,
    storagePolicy: "none",
    transmissionPolicy: "none"
  },
  publicEvidence,
  viewOrder: ["source-collation", "rights", "domain-a", "domain-b"],
  views: {
    "source-collation": {
      id: "source-collation",
      path: "/source-collation",
      roleId: "source-collation",
      seat: null,
      navLabel: "来源／校勘",
      title: "来源／校勘模板",
      summary: "只核对公开载体、固定 revision、章节／行／字符定位与 hash 是否足以支持后续人工校勘。",
      phaseNote: "已有两个扫描锚点的规范化对应观察；没有逐字同一结论，也没有真人校勘证明。",
      scope: [
        "核对公开链接是否指向登记的固定载体",
        "核对 revision、定位、字符范围与 hash 元数据是否自洽",
        "列明需要真人校勘或版本辨识的缺口"
      ],
      exclusions: [
        "不作作品、转录或载体权利的法律结论",
        "不判断月令候选的命理语义、适用性或准确度",
        "不接收、保存或展示来源正文与引文正文"
      ],
      facts: sourceFacts,
      links: [
        { label: "固定 Wikisource revision 2600158", href: publicEvidence.source.permanentUrl, note: "公开只读链接" },
        ...publicEvidence.collation.map(({ label, href }) => ({ label, href, note: "公开扫描页锚点" }))
      ],
      collation: publicEvidence.collation,
      showMachinePacketBasis: true,
      missing: [
        "固定转录与两份扫描之间的逐字、标点、异体字校勘记录",
        "真人校勘者证明（当前 0 份）",
        "版本／版次关系的独立证明",
        "经授权的正文与引文正文只读包",
        "可复核的当前采集执行回执"
      ]
    },
    rights: {
      id: "rights",
      path: "/rights",
      roleId: "rights",
      seat: null,
      navLabel: "权利核对",
      title: "权利核对模板",
      summary: "只把作品层、整理／转录层和扫描载体层分开核对；页面标记与平台条款都不等于法律结论。",
      phaseNote: "当前只能维持 link_only；三层均未清除，legalConclusion = not_established。",
      scope: [
        "分别核对作品、版本／转录与扫描载体的权利依据",
        "核对平台条款、署名路径、ShareAlike 与文件级标记的适用缺口",
        "列明司法辖区、来源链与独立法律复核所缺材料"
      ],
      exclusions: [
        "不做正文逐字校勘或版本语文学判断",
        "不判断月令候选的命理语义、适用性或准确度",
        "不把 Public domain 页面标记自动当作复用许可"
      ],
      facts: [
        { label: "权利候选", value: publicEvidence.rights.rightsCandidateId, mono: true },
        { label: "权利候选摘要", value: publicEvidence.rights.rightsCandidateDigest, mono: true },
        { label: "作品层", value: publicEvidence.rights.workLayer },
        { label: "整理／转录层", value: publicEvidence.rights.transcriptionLayer },
        { label: "扫描载体层", value: publicEvidence.rights.carrierLayer },
        { label: "分发策略", value: publicEvidence.rights.distributionPolicy, mono: true },
        { label: "法律结论", value: publicEvidence.rights.legalConclusion, mono: true }
      ],
      links: [
        { label: "DTT 固定来源页", href: publicEvidence.source.permanentUrl, note: "页面标记观察对象" },
        ...publicEvidence.rights.policyLinks.map(({ label, href }) => ({ label, href, note: "公开政策链接；适用性未裁断" })),
        ...publicEvidence.collation.map(({ label, descriptionHref }) => ({ label: `${label} · 文件说明页`, href: descriptionHref, note: "文件级标记观察对象" }))
      ],
      showMachinePacketBasis: true,
      missing: [
        "现实作者／注释者／整理者身份与时间事实的可靠证明",
        "作品、具体版本、社区转录和两个扫描载体的完整权利链",
        "目标分发地域、冲突法与适用例外分析",
        "Wikisource 导入／贡献 provenance 与 Commons 文件逐层适用核验",
        "署名、修改标记、ShareAlike 等产品履约方案",
        "独立法律审阅者的明确结论"
      ]
    },
    "domain-a": makeDomainView("A"),
    "domain-b": makeDomainView("B")
  }
});

export function resolveViewId(pathname = "/", hash = "") {
  const byPath = Object.values(REVIEW_PREVIEW_MANIFEST.views)
    .find((view) => view.path === pathname)?.id;
  if (byPath) return byPath;

  const hashId = hash.replace(/^#/, "");
  if (Object.hasOwn(REVIEW_PREVIEW_MANIFEST.views, hashId)) return hashId;

  return REVIEW_PREVIEW_MANIFEST.viewOrder[0];
}
