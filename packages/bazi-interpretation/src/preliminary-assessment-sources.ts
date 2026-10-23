/** Short original passages and our interpretation are deliberately separate. */
export interface PreliminarySourceProvenance {
  kind?: "wikisource_revision" | "facsimile_page";
  revisionId?: number;
  section: string;
  scope: "month" | "month_group" | "season" | "phase";
  textVariant: string;
  excerptSha256: string;
  excerptTransform: "verbatim" | "terminal-punctuation-only" | "facsimile-transcription-punctuation";
  paragraphs: readonly { index: number; ordinalInSection: number; sha256: string }[];
  stemEvidence: readonly {
    stem: string;
    role: "preferred" | "conditional";
    paragraphIndexes: readonly number[];
    sourceExpression?: string;
    terminologyExpansion?: string;
  }[];
  licenseUrl: string;
  rightsNote: string;
  facsimile?: {
    pdfSha256: string;
    pdfPageOneBased: number;
    printedPage: string;
    pageImageSha256: string;
    edition: string;
    originalLargeTypeOnly: true;
    variantNote: string;
    clauses: readonly {
      role: "preferred" | "conditional" | "exception";
      stem: string | null;
      transcription: string;
      sha256: string;
    }[];
  };
}

export interface PreliminarySource {
  id: string;
  title: string;
  url: string;
  locator: string;
  excerpt: string;
  interpretation: string;
  provenance?: PreliminarySourceProvenance;
}

export const PRELIMINARY_CLASSIC_SOURCES: readonly PreliminarySource[] = Object.freeze([
  {
    id: "preliminary-ziping-month",
    title: "《子平真诠》· 论用神",
    url: "https://www.tianyashuku.com/yijing/9643/814109.html",
    locator: "论用神第1—3段；公开古籍转录",
    excerpt: "八字用神，专求月令。",
    interpretation: "以日干与月令建立结构背景，再看财官印食等配合；月令取用与按强弱扶抑是不同观察轴。"
  },
  {
    id: "preliminary-ziping-change",
    title: "《子平真诠》· 论用神变化",
    url: "https://www.tianyashuku.com/yijing/9643/814111.html",
    locator: "论用神变化第1—2段；公开古籍转录",
    excerpt: "用神既主月令矣，然月令所藏不一。",
    interpretation: "记录月令藏干的透出情况；透藏和会支可改变取用，不能仅凭主气或两个支就宣告格局、合化成立。"
  },
  {
    id: "preliminary-ziping-peer",
    title: "《子平真诠》· 论建禄月劫",
    url: "https://www.tianyashuku.com/yijing/9643/814146.html",
    locator: "论建禄月劫第1、4段；公开古籍转录",
    excerpt: "禄劫用财，须带食伤。",
    interpretation: "比劫月令须结合透出的财官食伤；食伤与财同时出现可提供生财取向，仍须区分结构存在和成格条件。"
  }
]);
