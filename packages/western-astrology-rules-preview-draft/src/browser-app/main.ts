import "./styles.css";
import { runWesternRulesPreviewWorker } from "../browser-client.ts";
import { runWesternRuleLayer } from "../rule-layer-bridge.ts";
import {
  annularSectorPath,
  createWheelSectors,
  midLongitude,
  wheelPoint
} from "./chart-wheel.ts";
import {
  buildWesternContentProjection,
  type WesternContentProjection
} from "./content-layer.ts";
import {
  WESTERN_CONTENT_REVIEW_FEEDBACK_FILENAME,
  WESTERN_CONTENT_REVIEW_FEEDBACK_MAX_BYTES,
  createWesternContentReviewFeedbackTemplate,
  preflightWesternContentReviewFeedback,
  serializeWesternContentReviewFeedbackTemplate,
  type WesternContentReviewFeedbackPreflight
} from "./content-review-feedback.ts";
import {
  WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_MAX_BYTES,
  createWesternDynamicContentReviewFeedbackTemplate,
  preflightWesternDynamicContentReviewFeedback,
  serializeWesternDynamicContentReviewFeedbackTemplate,
  westernDynamicContentReviewCandidateCount,
  westernDynamicContentReviewFeedbackFilename,
  type WesternDynamicContentReviewFeedbackPreflight
} from "./dynamic-content-review-feedback.ts";

const ALL_BODY_IDS = Object.freeze([
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto"
] as const);

const ASPECT_DEFINITIONS = Object.freeze([
  { aspectId: "conjunction", exactAngleDeg: 0, maxOrbDeg: 8 },
  { aspectId: "sextile", exactAngleDeg: 60, maxOrbDeg: 8 },
  { aspectId: "square", exactAngleDeg: 90, maxOrbDeg: 8 },
  { aspectId: "trine", exactAngleDeg: 120, maxOrbDeg: 8 },
  { aspectId: "opposition", exactAngleDeg: 180, maxOrbDeg: 8 }
] as const);

const SIGN_IDS = Object.freeze([
  "白羊", "金牛", "双子", "巨蟹", "狮子", "处女",
  "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"
] as const);

const HOUSE_LABELS = Object.freeze([
  "一宫", "二宫", "三宫", "四宫", "五宫", "六宫",
  "七宫", "八宫", "九宫", "十宫", "十一宫", "十二宫"
] as const);

const BODY_LABELS = Object.freeze({
  sun: "日",
  moon: "月",
  mercury: "水",
  venus: "金",
  mars: "火",
  jupiter: "木",
  saturn: "土",
  uranus: "天",
  neptune: "海",
  pluto: "冥"
} as const);

const BODY_FULL_LABELS = Object.freeze({
  sun: "太阳",
  moon: "月亮",
  mercury: "水星",
  venus: "金星",
  mars: "火星",
  jupiter: "木星",
  saturn: "土星",
  uranus: "天王星",
  neptune: "海王星",
  pluto: "冥王星"
} as const);

const WHEEL = Object.freeze({
  size: 480,
  center: 240,
  zodiacOuter: 220,
  zodiacInner: 196,
  houseOuter: 190,
  houseInner: 140,
  spokeInner: 118,
  bodyRadius: 112,
  bodyLabelRadius: 128,
  aspectRadius: 112
} as const);

const form = document.querySelector<HTMLFormElement>("#chart-form")!;
const utcInput = document.querySelector<HTMLInputElement>("#utc-instant")!;
const houseSystemInput = document.querySelector<HTMLSelectElement>("#house-system")!;
const ramcInput = document.querySelector<HTMLInputElement>("#ramc-deg")!;
const latitudeInput = document.querySelector<HTMLInputElement>("#latitude-deg")!;
const obliquityInput = document.querySelector<HTMLInputElement>("#obliquity-deg")!;
const ayanamshaInput = document.querySelector<HTMLInputElement>("#ayanamsha-deg")!;
const siderealInput = document.querySelector<HTMLInputElement>("#sidereal-mode")!;
const calculateButton = document.querySelector<HTMLButtonElement>("#calculate-button")!;
const formError = document.querySelector<HTMLParagraphElement>("#form-error")!;
const status = document.querySelector<HTMLParagraphElement>("#workspace-status")!;
const bodiesEmpty = document.querySelector<HTMLParagraphElement>("#bodies-empty")!;
const bodiesList = document.querySelector<HTMLOListElement>("#bodies-list")!;
const housesEmpty = document.querySelector<HTMLParagraphElement>("#houses-empty")!;
const housesList = document.querySelector<HTMLOListElement>("#houses-list")!;
const anglesList = document.querySelector<HTMLDListElement>("#angles-list")!;
const aspectsEmpty = document.querySelector<HTMLParagraphElement>("#aspects-empty")!;
const aspectsList = document.querySelector<HTMLOListElement>("#aspects-list")!;
const chartWheel = document.querySelector<SVGSVGElement>("#chart-wheel")!;
const contentBoundary = document.querySelector<HTMLParagraphElement>("#content-boundary")!;
const firstReadContentEmpty = document.querySelector<HTMLParagraphElement>("#first-read-content-empty")!;
const firstReadContent = document.querySelector<HTMLDivElement>("#first-read-content")!;
const bodySynthesisContentEmpty = document.querySelector<HTMLParagraphElement>("#body-synthesis-content-empty")!;
const bodySynthesisContentList = document.querySelector<HTMLOListElement>("#body-synthesis-content-list")!;
const chartRulerContentEmpty = document.querySelector<HTMLParagraphElement>("#chart-ruler-content-empty")!;
const chartRulerContent = document.querySelector<HTMLDivElement>("#chart-ruler-content")!;
const dispositorContentEmpty = document.querySelector<HTMLParagraphElement>("#dispositor-content-empty")!;
const dispositorContentList = document.querySelector<HTMLOListElement>("#dispositor-content-list")!;
const angleProximityContentEmpty = document.querySelector<HTMLParagraphElement>("#angle-proximity-content-empty")!;
const angleProximityContent = document.querySelector<HTMLDivElement>("#angle-proximity-content")!;
const angleContentEmpty = document.querySelector<HTMLParagraphElement>("#angle-content-empty")!;
const angleContentList = document.querySelector<HTMLOListElement>("#angle-content-list")!;
const distributionContentEmpty = document.querySelector<HTMLParagraphElement>("#distribution-content-empty")!;
const distributionContent = document.querySelector<HTMLDivElement>("#distribution-content")!;
const houseRulerContentEmpty = document.querySelector<HTMLParagraphElement>("#house-ruler-content-empty")!;
const houseRulerContentList = document.querySelector<HTMLOListElement>("#house-ruler-content-list")!;
const placementContentEmpty = document.querySelector<HTMLParagraphElement>("#placement-content-empty")!;
const placementContentList = document.querySelector<HTMLOListElement>("#placement-content-list")!;
const aspectContentEmpty = document.querySelector<HTMLParagraphElement>("#aspect-content-empty")!;
const aspectContentList = document.querySelector<HTMLOListElement>("#aspect-content-list")!;
const contentSources = document.querySelector<HTMLUListElement>("#content-sources")!;
const contentFactsHash = document.querySelector<HTMLElement>("#content-facts-hash")!;
const reviewFeedbackPanel = document.querySelector<HTMLElement>("#review-feedback-panel")!;
const reviewFeedbackDownload = document.querySelector<HTMLButtonElement>("#review-feedback-download")!;
const reviewFeedbackFile = document.querySelector<HTMLInputElement>("#review-feedback-file")!;
const reviewFeedbackTotal = document.querySelector<HTMLElement>("#review-feedback-total")!;
const reviewFeedbackResolved = document.querySelector<HTMLElement>("#review-feedback-resolved")!;
const reviewFeedbackUnresolved = document.querySelector<HTMLElement>("#review-feedback-unresolved")!;
const reviewFeedbackReviewer = document.querySelector<HTMLElement>("#review-feedback-reviewer")!;
const reviewFeedbackMessage = document.querySelector<HTMLParagraphElement>("#review-feedback-message")!;
const reviewFeedbackItems = document.querySelector<HTMLOListElement>("#review-feedback-items")!;
let reviewFeedbackReadToken = 0;
const dynamicReviewFeedbackPanel = document.querySelector<HTMLElement>(
  "#dynamic-review-feedback-panel"
)!;
const dynamicReviewFeedbackDownload = document.querySelector<HTMLButtonElement>(
  "#dynamic-review-feedback-download"
)!;
const dynamicReviewFeedbackFileAction = document.querySelector<HTMLLabelElement>(
  "#dynamic-review-feedback-file-action"
)!;
const dynamicReviewFeedbackFile = document.querySelector<HTMLInputElement>(
  "#dynamic-review-feedback-file"
)!;
const dynamicReviewFeedbackTotal = document.querySelector<HTMLElement>(
  "#dynamic-review-feedback-total"
)!;
const dynamicReviewFeedbackResolved = document.querySelector<HTMLElement>(
  "#dynamic-review-feedback-resolved"
)!;
const dynamicReviewFeedbackUnresolved = document.querySelector<HTMLElement>(
  "#dynamic-review-feedback-unresolved"
)!;
const dynamicReviewFeedbackReviewer = document.querySelector<HTMLElement>(
  "#dynamic-review-feedback-reviewer"
)!;
const dynamicReviewFeedbackMessage = document.querySelector<HTMLParagraphElement>(
  "#dynamic-review-feedback-message"
)!;
const dynamicReviewFeedbackItems = document.querySelector<HTMLOListElement>(
  "#dynamic-review-feedback-items"
)!;
let currentContentProjection: WesternContentProjection | null = null;
let dynamicReviewFeedbackReadToken = 0;
let dynamicProjectionEpoch = 0;

function setStatus(message: string): void {
  status.textContent = message;
}

function showError(message: string): void {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError(): void {
  formError.hidden = true;
  formError.textContent = "";
}

function formatDegree(value: number): string {
  const degrees = Math.floor(value);
  const minutes = Math.floor((value - degrees) * 60);
  const seconds = Math.round(((value - degrees) * 60 - minutes) * 60);
  return `${degrees}°${String(minutes).padStart(2, "0")}′${String(seconds).padStart(2, "0")}″`;
}

function renderBodies(
  bodies: ReadonlyArray<Readonly<{
    bodyId: string;
    zodiac: Readonly<{ signIndex: number; degreeWithinSign: number; longitudeDeg: number }>;
    houseNumber: number | null;
    retrograde: boolean;
  }>>
): void {
  bodiesList.replaceChildren();
  bodiesEmpty.hidden = bodies.length > 0;
  bodiesList.hidden = bodies.length === 0;
  for (const body of bodies) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = body.bodyId;
    const detail = document.createElement("span");
    const sign = SIGN_IDS[body.zodiac.signIndex] ?? String(body.zodiac.signIndex);
    const house = body.houseNumber === null ? "未请求宫位" : HOUSE_LABELS[body.houseNumber - 1] ?? String(body.houseNumber);
    detail.textContent = `${sign} ${formatDegree(body.zodiac.degreeWithinSign)} · ${house}${body.retrograde ? " · 逆行" : ""}`;
    item.append(name, detail);
    bodiesList.append(item);
  }
}

function renderHouses(
  houses: Readonly<{
    systemId: string;
    cusps: ReadonlyArray<Readonly<{ houseNumber: number; longitudeDeg: number }>>;
    angles: Readonly<{
      ascendantDeg: number;
      midheavenDeg: number;
      descendantDeg: number;
      imumCoeliDeg: number;
    }>;
  }>
): void {
  housesList.replaceChildren();
  housesEmpty.hidden = true;
  housesList.hidden = false;
  for (const cusp of houses.cusps) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = HOUSE_LABELS[cusp.houseNumber - 1] ?? String(cusp.houseNumber);
    const value = document.createElement("span");
    value.textContent = formatDegree(cusp.longitudeDeg);
    item.append(name, value);
    housesList.append(item);
  }
  anglesList.replaceChildren();
  const rows = [
    ["上升", houses.angles.ascendantDeg],
    ["天顶", houses.angles.midheavenDeg],
    ["下降", houses.angles.descendantDeg],
    ["天底", houses.angles.imumCoeliDeg]
  ] as const;
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const definition = document.createElement("dd");
    definition.textContent = formatDegree(value);
    row.append(term, definition);
    anglesList.append(row);
  }
  anglesList.hidden = false;
}

function renderAspects(
  aspects: ReadonlyArray<Readonly<{
    bodyA: string;
    bodyB: string;
    aspectId: string;
    orbDeg: number;
    motion: string;
  }>>
): void {
  aspectsList.replaceChildren();
  aspectsEmpty.hidden = aspects.length > 0;
  aspectsList.hidden = aspects.length === 0;
  for (const aspect of aspects) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = `${aspect.bodyA} — ${aspect.bodyB}`;
    const detail = document.createElement("span");
    detail.textContent = `${aspect.aspectId} · orb ${formatDegree(aspect.orbDeg)} · ${aspect.motion}`;
    item.append(name, detail);
    aspectsList.append(item);
  }
}

function clearContentProjection(): void {
  firstReadContent.replaceChildren();
  firstReadContent.hidden = true;
  firstReadContentEmpty.hidden = false;
  bodySynthesisContentList.replaceChildren();
  bodySynthesisContentList.hidden = true;
  bodySynthesisContentEmpty.hidden = false;
  chartRulerContent.replaceChildren();
  chartRulerContent.hidden = true;
  chartRulerContentEmpty.hidden = false;
  dispositorContentList.replaceChildren();
  dispositorContentList.hidden = true;
  dispositorContentEmpty.hidden = false;
  angleProximityContent.replaceChildren();
  angleProximityContent.hidden = true;
  angleProximityContentEmpty.hidden = false;
  angleContentList.replaceChildren();
  angleContentList.hidden = true;
  angleContentEmpty.hidden = false;
  distributionContent.replaceChildren();
  distributionContent.hidden = true;
  distributionContentEmpty.hidden = false;
  houseRulerContentList.replaceChildren();
  houseRulerContentList.hidden = true;
  houseRulerContentEmpty.hidden = false;
  placementContentList.replaceChildren();
  placementContentList.hidden = true;
  placementContentEmpty.hidden = false;
  aspectContentList.replaceChildren();
  aspectContentList.hidden = true;
  aspectContentEmpty.hidden = false;
  contentSources.replaceChildren();
  contentFactsHash.textContent = "尚未生成";
  contentBoundary.textContent = "完成计算后，这里会显示来源绑定的现代西方占星候选内容；专家结论保持为空。";
  contentBoundary.removeAttribute("data-content-version");
}

function clearRenderedFacts(): void {
  bodiesList.replaceChildren();
  bodiesList.hidden = true;
  bodiesEmpty.hidden = false;
  housesList.replaceChildren();
  housesList.hidden = true;
  housesEmpty.hidden = false;
  anglesList.replaceChildren();
  anglesList.hidden = true;
  aspectsList.replaceChildren();
  aspectsList.hidden = true;
  aspectsEmpty.hidden = false;
  chartWheel.replaceChildren();
  const placeholder = document.createElementNS("http://www.w3.org/2000/svg", "g");
  placeholder.id = "wheel-placeholder";
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "240");
  text.setAttribute("y", "240");
  text.setAttribute("text-anchor", "middle");
  text.textContent = "尚未计算";
  placeholder.append(text);
  chartWheel.append(placeholder);
  chartWheel.setAttribute("aria-label", "星盘轮：黄道环、十二宫与天体落点");
}

function createSourceLinks(
  sourceIds: readonly string[],
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "candidate-sources";
  container.setAttribute("aria-label", "候选内容来源");
  for (const sourceId of sourceIds) {
    const source = sourceById.get(sourceId);
    if (!source) throw new Error(`missing rendered western content source ${sourceId}`);
    const anchor = document.createElement("a");
    anchor.href = source.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.textContent = source.title;
    anchor.dataset.sourceId = source.sourceId;
    container.append(anchor);
  }
  return container;
}

interface RenderedExpertReview {
  readonly status: "awaiting_expert_review";
  readonly questions: readonly string[];
  readonly result: null;
}

function setCandidateAuditAttributes(
  element: HTMLElement,
  candidateId: string,
  review: RenderedExpertReview,
  factsSha256: string
): void {
  element.dataset.candidateId = candidateId;
  element.dataset.reviewStatus = review.status;
  element.dataset.reviewResult = "null";
  element.dataset.factsSha256 = factsSha256;
}

function createExpertReview(reviewFact: RenderedExpertReview): HTMLDetailsElement {
  const review = document.createElement("details");
  review.className = "expert-review";
  const summary = document.createElement("summary");
  summary.textContent = "专家复核问题";
  const questions = document.createElement("ul");
  for (const question of reviewFact.questions) {
    const questionItem = document.createElement("li");
    questionItem.textContent = question;
    questions.append(questionItem);
  }
  const result = document.createElement("p");
  result.className = "expert-result-null";
  result.textContent = "专家结论：未生成（result:null）";
  review.append(summary, questions, result);
  return review;
}

function createCandidateCard(
  candidate: Readonly<{
    candidateId: string;
    factSummary: string;
    directStatement: string;
    resourceStatement: string;
    tensionStatement: string;
    sourceIds: readonly string[];
    review: Readonly<RenderedExpertReview>;
  }>,
  scopeNote: string | null,
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "content-candidate-card";
  setCandidateAuditAttributes(item, candidate.candidateId, candidate.review, factsSha256);

  const heading = document.createElement("h4");
  heading.textContent = candidate.factSummary;

  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;

  const polarity = document.createElement("div");
  polarity.className = "candidate-polarity";
  const resource = document.createElement("p");
  resource.className = "candidate-resource";
  resource.textContent = candidate.resourceStatement;
  const tension = document.createElement("p");
  tension.className = "candidate-tension";
  tension.textContent = candidate.tensionStatement;
  polarity.append(resource, tension);

  item.append(heading, direct, polarity);
  if (scopeNote !== null) {
    const note = document.createElement("p");
    note.className = "candidate-scope";
    note.textContent = scopeNote;
    item.append(note);
  }

  item.append(createExpertReview(candidate.review), createSourceLinks(candidate.sourceIds, sourceById));
  return item;
}

function createFirstReadCard(
  candidate: WesternContentProjection["firstRead"],
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLElement {
  const article = document.createElement("article");
  article.className = "content-candidate-card first-read-card";
  setCandidateAuditAttributes(article, candidate.candidateId, candidate.review, factsSha256);
  article.dataset.evidenceClass = candidate.evidenceClass;
  article.dataset.availableCount = String(candidate.availableCount);
  article.dataset.missingKeys = candidate.missingKeys.length === 0
    ? "none"
    : candidate.missingKeys.join(",");
  article.dataset.selectedPrimaryFactor = "null";
  article.dataset.overallResult = "null";
  article.dataset.goodBadOrientation = "null";

  const heading = document.createElement("header");
  const title = document.createElement("h4");
  title.textContent = candidate.factSummary;
  const badges = document.createElement("div");
  badges.className = "first-read-badges";
  for (const value of [
    `${candidate.availableCount}/4 可用`,
    "导航 · 非排名",
    "overall:null"
  ]) {
    const badge = document.createElement("span");
    badge.textContent = value;
    badges.append(badge);
  }
  heading.append(title, badges);

  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;

  const entries = document.createElement("ol");
  entries.className = "first-read-entry-list";
  entries.setAttribute("aria-label", "太阳月亮上升命主星四步首读");
  for (const entry of candidate.entries) {
    const item = document.createElement("li");
    item.dataset.firstReadKey = entry.key;
    item.dataset.sequence = String(entry.sequence);
    item.dataset.availability = entry.availability;
    item.dataset.referencedCandidateIds = entry.referencedCandidateIds.join(",");

    const itemHeading = document.createElement("header");
    const sequence = document.createElement("small");
    sequence.textContent = `0${entry.sequence}`;
    const label = document.createElement("h5");
    label.textContent = entry.label;
    const availability = document.createElement("span");
    availability.textContent = entry.availability === "available" ? "事实可用" : "保持关闭";
    itemHeading.append(sequence, label, availability);

    const fact = document.createElement("strong");
    fact.textContent = entry.factSummary;
    const statement = document.createElement("p");
    statement.textContent = entry.directStatement;
    const correction = document.createElement("p");
    correction.className = "first-read-correction";
    correction.textContent = entry.correctionStatement;
    item.append(itemHeading, fact, statement, correction);
    entries.append(item);
  }

  const order = document.createElement("p");
  order.className = "structural-use";
  order.textContent = candidate.readingOrderStatement;
  const note = document.createElement("p");
  note.className = "candidate-scope";
  note.textContent = candidate.scopeNote;
  const boundary = document.createElement("p");
  boundary.className = "structural-limit";
  boundary.textContent =
    "主项选择：null；综合方向：null；吉凶方向：null。四步顺序不转换为权重、强弱、人格定型或事件结果。";
  article.append(
    heading,
    direct,
    entries,
    order,
    note,
    boundary,
    createExpertReview(candidate.review),
    createSourceLinks(candidate.sourceIds, sourceById)
  );
  return article;
}

function createBodySynthesisCard(
  candidate: WesternContentProjection["bodySyntheses"][number],
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "content-candidate-card body-synthesis-card";
  setCandidateAuditAttributes(item, candidate.candidateId, candidate.review, factsSha256);
  item.dataset.bodyId = candidate.bodyId;
  item.dataset.evidenceClass = candidate.evidenceClass;
  item.dataset.overallResult = "null";
  item.dataset.goodBadOrientation = "null";
  item.dataset.slowBodyHouseFirst = String(candidate.slowBodyHouseFirst);
  item.dataset.aspectCount = String(candidate.aspectLinks.length);

  const heading = document.createElement("header");
  const title = document.createElement("h4");
  title.textContent = candidate.factSummary;
  const badges = document.createElement("div");
  badges.className = "body-synthesis-badges";
  if (candidate.chartRulerProfiles.length > 0) {
    const chartRuler = document.createElement("span");
    chartRuler.textContent = `命主星路径 · ${candidate.chartRulerProfiles.join(" / ")}`;
    badges.append(chartRuler);
  }
  if (candidate.slowBodyHouseFirst) {
    const slowBody = document.createElement("span");
    slowBody.textContent = "慢行星 · 先看落宫";
    badges.append(slowBody);
  }
  const result = document.createElement("span");
  result.textContent = "overall:null";
  badges.append(result);
  heading.append(title, badges);

  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;

  const placement = document.createElement("section");
  placement.className = "body-synthesis-placement";
  const placementTitle = document.createElement("h5");
  placementTitle.textContent = "落位主线";
  const placementText = document.createElement("p");
  placementText.textContent = candidate.placement.directStatement;
  const polarity = document.createElement("div");
  polarity.className = "candidate-polarity";
  const resource = document.createElement("p");
  resource.className = "candidate-resource";
  resource.textContent = candidate.placement.resourceStatement;
  const tension = document.createElement("p");
  tension.className = "candidate-tension";
  tension.textContent = candidate.placement.tensionStatement;
  polarity.append(resource, tension);
  placement.append(placementTitle, placementText, polarity);

  const aspects = document.createElement("section");
  aspects.className = "body-synthesis-aspects";
  const aspectsTitle = document.createElement("h5");
  aspectsTitle.textContent = `主要相位 · ${candidate.aspectLinks.length}`;
  const aspectList = document.createElement("ul");
  if (candidate.aspectLinks.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "当前五类主要相位中无命中；这不等于该天体没有其他关系或不重要。";
    aspectList.append(empty);
  } else {
    for (const link of candidate.aspectLinks) {
      const row = document.createElement("li");
      row.dataset.counterpartBodyId = link.counterpartBodyId;
      row.dataset.aspectId = link.candidate.aspectId;
      const label = document.createElement("strong");
      label.textContent = `与${link.counterpartBodyLabel} · ${link.candidate.aspectLabel}`;
      const detail = document.createElement("span");
      detail.textContent =
        `容许度 ${formatDegree(link.candidate.orbDeg)} · ${link.candidate.motion}`;
      const statement = document.createElement("p");
      statement.textContent = link.candidate.directStatement;
      row.append(label, detail, statement);
      aspectList.append(row);
    }
  }
  aspects.append(aspectsTitle, aspectList);

  const structure = document.createElement("dl");
  structure.className = "body-synthesis-structure";
  for (const [label, value] of [
    ["传统定位链", candidate.dispositor.traditional.statement],
    ["现代定位链", candidate.dispositor.modern.statement],
    [
      "最近四轴",
      candidate.nearestAngle === null
        ? "当前输入没有可用四轴。"
        : `${candidate.nearestAngle.angleLabel}（${candidate.nearestAngle.angleAbbreviation}） · ${formatDegree(candidate.nearestAngle.separationDeg)}；未自动判定合轴。`
    ]
  ] as const) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const definition = document.createElement("dd");
    definition.textContent = value;
    row.append(term, definition);
    structure.append(row);
  }

  const order = document.createElement("p");
  order.className = "structural-use";
  order.textContent = candidate.readingOrderStatement;
  const note = document.createElement("p");
  note.className = "candidate-scope";
  note.textContent = candidate.scopeNote;
  const boundary = document.createElement("p");
  boundary.className = "structural-limit";
  boundary.textContent =
    "综合方向：null；吉凶方向：null。条目数量、相位名称、命主星身份与四轴距离均不自动转成强弱或事件结论。";

  const details = document.createElement("details");
  details.className = "body-synthesis-detail";
  const summary = document.createElement("summary");
  summary.textContent =
    `展开落位、${candidate.aspectLinks.length} 条相位与定位链`;
  details.append(
    summary,
    placement,
    aspects,
    structure,
    order,
    note,
    boundary,
    createExpertReview(candidate.review),
    createSourceLinks(candidate.sourceIds, sourceById)
  );
  item.append(heading, direct, details);
  return item;
}

function createDistributionFamily(
  titleText: string,
  buckets: WesternContentProjection["distribution"]["scopes"][number]["elements"]
): HTMLDivElement {
  const family = document.createElement("div");
  family.className = "distribution-family";
  const title = document.createElement("h6");
  title.textContent = titleText;
  const counts = document.createElement("dl");
  counts.className = "distribution-counts";
  for (const bucket of buckets) {
    const row = document.createElement("div");
    row.className = "distribution-count";
    row.dataset.distributionId = bucket.id;
    const term = document.createElement("dt");
    term.textContent = bucket.label;
    const value = document.createElement("dd");
    const bodyLabels = bucket.bodyIds.map((bodyId) => BODY_FULL_LABELS[bodyId]);
    value.textContent = `${bucket.count} · ${bodyLabels.length > 0 ? bodyLabels.join("、") : "无"}`;
    row.append(term, value);
    counts.append(row);
  }
  family.append(title, counts);
  return family;
}

function createDistributionCard(
  candidate: WesternContentProjection["distribution"],
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLElement {
  const card = document.createElement("article");
  card.className = "content-candidate-card distribution-card";
  setCandidateAuditAttributes(card, candidate.candidateId, candidate.review, factsSha256);

  const heading = document.createElement("h4");
  heading.textContent = candidate.factSummary;
  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;
  const grid = document.createElement("div");
  grid.className = "distribution-grid";
  for (const scope of candidate.scopes) {
    const scopePanel = document.createElement("section");
    scopePanel.className = "distribution-scope";
    scopePanel.dataset.distributionScope = scope.scopeId;
    const scopeTitle = document.createElement("h5");
    scopeTitle.textContent = scope.label;
    scopePanel.append(
      scopeTitle,
      createDistributionFamily("元素", scope.elements),
      createDistributionFamily("模式", scope.modalities)
    );
    grid.append(scopePanel);
  }
  const use = document.createElement("p");
  use.className = "structural-use";
  use.textContent = candidate.useStatement;
  const limit = document.createElement("p");
  limit.className = "structural-limit";
  limit.textContent = candidate.limitStatement;
  const note = document.createElement("p");
  note.className = "candidate-scope";
  note.textContent = candidate.scopeNote;
  card.append(
    heading,
    direct,
    grid,
    use,
    limit,
    note,
    createExpertReview(candidate.review),
    createSourceLinks(candidate.sourceIds, sourceById)
  );
  return card;
}

function createRulerProfileGrid(
  candidate: Pick<WesternContentProjection["houseRulers"][number], "traditional" | "modern">
): HTMLDivElement {
  const profiles = document.createElement("div");
  profiles.className = "ruler-profile-grid";
  for (const [label, path] of [
    ["传统守护星", candidate.traditional],
    ["现代守护星", candidate.modern]
  ] as const) {
    const profile = document.createElement("section");
    profile.className = "ruler-profile";
    profile.dataset.rulerProfile = path.profile;
    profile.dataset.rulerBodyId = path.rulerBodyId;
    profile.dataset.placementAvailable = String(path.placementAvailable);
    const profileTitle = document.createElement("h5");
    profileTitle.textContent = label;
    const statement = document.createElement("p");
    statement.textContent = path.statement;
    profile.append(profileTitle, statement);
    profiles.append(profile);
  }
  return profiles;
}

function createChartRulerCard(
  candidate: NonNullable<WesternContentProjection["chartRuler"]>,
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLElement {
  const card = document.createElement("article");
  card.className = "content-candidate-card chart-ruler-card";
  setCandidateAuditAttributes(card, candidate.candidateId, candidate.review, factsSha256);
  card.dataset.ascendantSignId = candidate.ascendantSignId;

  const heading = document.createElement("h4");
  heading.textContent = candidate.factSummary;
  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;
  const note = document.createElement("p");
  note.className = "candidate-scope";
  note.textContent = candidate.scopeNote;
  card.append(
    heading,
    direct,
    createRulerProfileGrid(candidate),
    note,
    createExpertReview(candidate.review),
    createSourceLinks(candidate.sourceIds, sourceById)
  );
  return card;
}

function createDispositorCard(
  candidate: WesternContentProjection["dispositorChains"][number],
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "content-candidate-card dispositor-card";
  setCandidateAuditAttributes(item, candidate.candidateId, candidate.review, factsSha256);
  item.dataset.startBodyId = candidate.startBodyId;
  item.dataset.profilesEqual = String(candidate.profilesEqual);

  const heading = document.createElement("h4");
  heading.textContent = candidate.factSummary;
  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;
  const profiles = document.createElement("div");
  profiles.className = "chain-profile-grid";
  for (const [label, chain] of [
    ["传统定位链", candidate.traditional],
    ["现代定位链", candidate.modern]
  ] as const) {
    const profile = document.createElement("section");
    profile.className = "chain-profile";
    profile.dataset.chainProfile = chain.profile;
    profile.dataset.chainTermination = chain.termination;
    profile.dataset.twoBodySignExchange = String(chain.twoBodySignExchange);
    if (chain.missingBodyId !== null) profile.dataset.missingBodyId = chain.missingBodyId;
    const title = document.createElement("h5");
    title.textContent = label;
    const termination = document.createElement("span");
    termination.className = "chain-termination";
    termination.textContent = chain.termination === "domicile"
      ? "自守终点"
      : chain.termination === "cycle"
        ? "循环候选"
        : "缺天体 · 停止";
    const statement = document.createElement("p");
    statement.textContent = chain.statement;
    profile.append(title, termination, statement);
    profiles.append(profile);
  }
  const note = document.createElement("p");
  note.className = "candidate-scope";
  note.textContent = candidate.scopeNote;
  item.append(
    heading,
    direct,
    profiles,
    note,
    createExpertReview(candidate.review),
    createSourceLinks(candidate.sourceIds, sourceById)
  );
  return item;
}

function createAngleProximityCard(
  candidate: NonNullable<WesternContentProjection["angleProximity"]>,
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLElement {
  const card = document.createElement("article");
  card.className = "content-candidate-card angle-proximity-card";
  setCandidateAuditAttributes(card, candidate.candidateId, candidate.review, factsSha256);
  const heading = document.createElement("h4");
  heading.textContent = candidate.factSummary;
  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;
  const entries = document.createElement("ol");
  entries.className = "angle-proximity-list";
  entries.setAttribute("aria-label", "天体到最近四轴的精确距离排序");
  for (const entry of candidate.entries) {
    const row = document.createElement("li");
    row.dataset.bodyId = entry.bodyId;
    row.dataset.angleId = entry.angleId;
    row.dataset.separationDeg = String(entry.separationDeg);
    row.dataset.withinOneDegreeReviewBand = String(entry.withinOneDegreeReviewBand);
    const pair = document.createElement("strong");
    pair.textContent = `${entry.rank}. ${entry.bodyLabel} → ${entry.angleLabel}（${entry.angleAbbreviation}）`;
    const separation = document.createElement("span");
    separation.className = "angle-proximity-separation";
    separation.textContent = `最近距离 ${formatDegree(entry.separationDeg)}`;
    const house = document.createElement("span");
    house.className = "angle-proximity-house";
    house.textContent = entry.houseLabel ?? "未计算宫位";
    row.append(pair, separation, house);
    if (entry.withinOneDegreeReviewBand) {
      const reviewBand = document.createElement("span");
      reviewBand.className = "review-band-badge";
      reviewBand.textContent = "≤1° 同度复核带";
      row.append(reviewBand);
    }
    entries.append(row);
  }
  const use = document.createElement("p");
  use.className = "structural-use";
  use.textContent = candidate.useStatement;
  const limit = document.createElement("p");
  limit.className = "structural-limit";
  limit.textContent = candidate.limitStatement;
  const note = document.createElement("p");
  note.className = "candidate-scope";
  note.textContent = candidate.scopeNote;
  card.append(
    heading,
    direct,
    entries,
    use,
    limit,
    note,
    createExpertReview(candidate.review),
    createSourceLinks(candidate.sourceIds, sourceById)
  );
  return card;
}

function createHouseRulerCard(
  candidate: WesternContentProjection["houseRulers"][number],
  factsSha256: string,
  sourceById: ReadonlyMap<string, WesternContentProjection["sources"][number]>
): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "content-candidate-card house-ruler-card";
  setCandidateAuditAttributes(item, candidate.candidateId, candidate.review, factsSha256);
  item.dataset.cuspSignId = candidate.cuspSignId;

  const heading = document.createElement("h4");
  heading.textContent = candidate.factSummary;
  const direct = document.createElement("p");
  direct.className = "candidate-direct";
  direct.textContent = candidate.directStatement;
  const profiles = createRulerProfileGrid(candidate);
  const note = document.createElement("p");
  note.className = "candidate-scope";
  note.textContent = candidate.scopeNote;
  item.append(
    heading,
    direct,
    profiles,
    note,
    createExpertReview(candidate.review),
    createSourceLinks(candidate.sourceIds, sourceById)
  );
  return item;
}

function renderContentProjection(projection: WesternContentProjection): void {
  const sourceById = new Map(projection.sources.map((source) => [source.sourceId, source]));

  firstReadContent.replaceChildren(createFirstReadCard(
    projection.firstRead,
    projection.factsSha256,
    sourceById
  ));
  firstReadContentEmpty.hidden = true;
  firstReadContent.hidden = false;

  bodySynthesisContentList.replaceChildren();
  for (const candidate of projection.bodySyntheses) {
    bodySynthesisContentList.append(createBodySynthesisCard(
      candidate,
      projection.factsSha256,
      sourceById
    ));
  }
  bodySynthesisContentEmpty.hidden = projection.bodySyntheses.length > 0;
  bodySynthesisContentList.hidden = projection.bodySyntheses.length === 0;

  chartRulerContent.replaceChildren();
  if (projection.chartRuler !== null) {
    chartRulerContent.append(createChartRulerCard(
      projection.chartRuler,
      projection.factsSha256,
      sourceById
    ));
  }
  chartRulerContentEmpty.hidden = projection.chartRuler !== null;
  chartRulerContent.hidden = projection.chartRuler === null;

  dispositorContentList.replaceChildren();
  for (const candidate of projection.dispositorChains) {
    dispositorContentList.append(createDispositorCard(
      candidate,
      projection.factsSha256,
      sourceById
    ));
  }
  dispositorContentEmpty.hidden = projection.dispositorChains.length > 0;
  dispositorContentList.hidden = projection.dispositorChains.length === 0;

  angleProximityContent.replaceChildren();
  if (projection.angleProximity !== null) {
    angleProximityContent.append(createAngleProximityCard(
      projection.angleProximity,
      projection.factsSha256,
      sourceById
    ));
  }
  angleProximityContentEmpty.hidden = projection.angleProximity !== null;
  angleProximityContent.hidden = projection.angleProximity === null;

  angleContentList.replaceChildren();
  for (const candidate of projection.angles) {
    angleContentList.append(createCandidateCard(
      candidate,
      candidate.scopeNote,
      projection.factsSha256,
      sourceById
    ));
  }
  angleContentEmpty.hidden = projection.angles.length > 0;
  angleContentList.hidden = projection.angles.length === 0;

  distributionContent.replaceChildren(createDistributionCard(
    projection.distribution,
    projection.factsSha256,
    sourceById
  ));
  distributionContentEmpty.hidden = true;
  distributionContent.hidden = false;

  houseRulerContentList.replaceChildren();
  for (const candidate of projection.houseRulers) {
    houseRulerContentList.append(createHouseRulerCard(
      candidate,
      projection.factsSha256,
      sourceById
    ));
  }
  houseRulerContentEmpty.hidden = projection.houseRulers.length > 0;
  houseRulerContentList.hidden = projection.houseRulers.length === 0;

  placementContentList.replaceChildren();
  for (const candidate of projection.placements) {
    placementContentList.append(createCandidateCard(
      candidate,
      candidate.scopeNote,
      projection.factsSha256,
      sourceById
    ));
  }
  placementContentEmpty.hidden = projection.placements.length > 0;
  placementContentList.hidden = projection.placements.length === 0;

  aspectContentList.replaceChildren();
  for (const candidate of projection.aspects) {
    aspectContentList.append(createCandidateCard(
      candidate,
      null,
      projection.factsSha256,
      sourceById
    ));
  }
  aspectContentEmpty.hidden = projection.aspects.length > 0;
  aspectContentList.hidden = projection.aspects.length === 0;

  contentSources.replaceChildren();
  for (const source of projection.sources) {
    const item = document.createElement("li");
    item.dataset.sourceRole = source.role;
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.title;
    const role = document.createElement("span");
    role.textContent = source.role === "practitioner_reference"
      ? "术语／流派参考"
      : source.role === "interpretation_boundary"
        ? "解读边界"
        : "科学证据边界";
    item.append(link, role);
    contentSources.append(item);
  }
  contentFactsHash.textContent = projection.factsSha256;
  contentBoundary.textContent = projection.boundary.note;
  contentBoundary.dataset.contentVersion = projection.projectionVersion;
}

function startTextDownload(contents: string, filename: string): void {
  const href = URL.createObjectURL(new Blob([contents], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(href), 0);
}

function reviewSummaryPair(label: string, value: string): HTMLDivElement {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  row.append(term, description);
  return row;
}

function reviewDecisionLabel(
  decision: WesternContentReviewFeedbackPreflight["envelope"]["items"][number]["decision"]
): string {
  return ({
    unresolved: "尚未裁决",
    approve: "建议保留",
    revise: "建议退修",
    reject: "建议驳回"
  } as const)[decision];
}

function reviewOrientationLabel(
  orientation:
    WesternContentReviewFeedbackPreflight["envelope"]["items"][number]["orientationProposal"]
): string {
  return ({
    unresolved: "尚未提出",
    potentially_supportive: "条件满足时可能偏支持",
    potentially_challenging: "条件满足时可能偏挑战",
    mixed_conditional: "正反并见，取决于条件",
    not_assessable: "现有证据不足以提出方向"
  } as const)[orientation];
}

function reviewCategoryLabel(
  category: WesternContentReviewFeedbackPreflight["envelope"]["items"][number]["category"]
): string {
  return ({ planet: "天体", sign: "星座", house: "宫位", aspect: "相位", angle: "轴点" } as const)[category];
}

function setReviewFeedbackMessage(
  message: string,
  state: "idle" | "loading" | "success" | "error"
): void {
  reviewFeedbackMessage.textContent = message;
  reviewFeedbackMessage.dataset.state = state;
}

function setReviewFeedbackBoundary(
  preflight: WesternContentReviewFeedbackPreflight | null
): void {
  reviewFeedbackPanel.dataset.identityVerified = String(preflight?.identityVerified ?? false);
  reviewFeedbackPanel.dataset.digitalSignatureVerified = String(
    preflight?.digitalSignatureVerified ?? false
  );
  reviewFeedbackPanel.dataset.scientificValidityEstablished = String(
    preflight?.scientificValidityEstablished ?? false
  );
  reviewFeedbackPanel.dataset.eligibleForFormalActivation = String(
    preflight?.eligibleForFormalActivation ?? false
  );
  reviewFeedbackPanel.dataset.autoIntegrationAllowed = String(
    preflight?.autoIntegrationAllowed ?? false
  );
  reviewFeedbackPanel.dataset.ruleArtifactOrStorageMutationPerformed = String(
    preflight?.ruleArtifactOrStorageMutationPerformed ?? false
  );
  reviewFeedbackPanel.dataset.dynamicCompositionReviewed = String(
    preflight?.dynamicCompositionReviewed ?? false
  );
  reviewFeedbackPanel.dataset.goodBadOrientation = "null";
  reviewFeedbackPanel.dataset.eventOutcome = "null";
  reviewFeedbackPanel.dataset.result = "null";
}

function clearReviewFeedbackPreview(
  message: string,
  state: "idle" | "loading" | "success" | "error"
): void {
  reviewFeedbackTotal.textContent = "43";
  reviewFeedbackResolved.textContent = "0";
  reviewFeedbackUnresolved.textContent = "43";
  reviewFeedbackReviewer.textContent = "尚未提供";
  reviewFeedbackItems.replaceChildren();
  reviewFeedbackItems.hidden = true;
  setReviewFeedbackBoundary(null);
  setReviewFeedbackMessage(message, state);
}

function renderReviewFeedbackPreflight(
  preflight: WesternContentReviewFeedbackPreflight,
  fileName: string
): void {
  reviewFeedbackTotal.textContent = String(preflight.counts.total);
  reviewFeedbackResolved.textContent = String(preflight.resolvedCount);
  reviewFeedbackUnresolved.textContent = String(preflight.unresolvedCount);
  reviewFeedbackReviewer.textContent = preflight.reviewerAttributionComplete
    ? `${preflight.envelope.reviewer.displayName}（自述，未核验）`
    : "尚未提供";
  setReviewFeedbackBoundary(preflight);

  reviewFeedbackItems.replaceChildren();
  const resolvedItems = preflight.envelope.items.filter((item) => item.decision !== "unresolved");
  for (const item of resolvedItems) {
    const card = document.createElement("li");
    card.className = "review-feedback-item";
    card.dataset.contentId = item.contentId;
    card.dataset.category = item.category;
    card.dataset.decision = item.decision;
    card.dataset.orientationProposal = item.orientationProposal;
    card.dataset.expertTruthClaimed = "false";
    card.dataset.scientificValidityClaimed = "false";
    card.dataset.formalActivationAllowed = "false";
    card.dataset.goodBadOrientation = "null";
    card.dataset.eventOutcome = "null";
    card.dataset.result = "null";

    const heading = document.createElement("div");
    heading.className = "review-feedback-item-heading";
    const title = document.createElement("strong");
    title.textContent = `${reviewCategoryLabel(item.category)} · ${item.label}`;
    const decision = document.createElement("span");
    decision.textContent = reviewDecisionLabel(item.decision);
    heading.append(title, decision);

    const details = document.createElement("dl");
    details.className = "review-feedback-item-details";
    details.append(
      reviewSummaryPair("方向提案", reviewOrientationLabel(item.orientationProposal)),
      reviewSummaryPair("传统口径", item.selectedTradition),
      reviewSummaryPair("审稿理由", item.decisionReason),
      reviewSummaryPair("成立条件", item.applicabilityConditions),
      reviewSummaryPair("反例提醒", item.counterexamples)
    );
    if (item.revisionRequest) {
      details.append(reviewSummaryPair("退修要求", item.revisionRequest));
    }
    if (item.additionalSourceUrls.length > 0) {
      const sourceRow = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = "补充来源";
      const description = document.createElement("dd");
      item.additionalSourceUrls.forEach((sourceUrl, index) => {
        const link = document.createElement("a");
        link.href = sourceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `来源 ${index + 1}`;
        if (index > 0) description.append("、");
        description.append(link);
      });
      sourceRow.append(term, description);
      details.append(sourceRow);
    }
    card.append(heading, details);
    reviewFeedbackItems.append(card);
  }
  reviewFeedbackItems.hidden = resolvedItems.length === 0;
  setReviewFeedbackMessage(
    `预检通过：${fileName} 覆盖 43 项基础内容，已裁决 ${preflight.resolvedCount} 项、未裁决 ${preflight.unresolvedCount} 项。身份仅自述且文件无签名；不覆盖数量随命盘变化的动态组合卡，也没有写入规则、存储或正式入口。`,
    "success"
  );
}

async function downloadReviewFeedbackTemplate(): Promise<void> {
  reviewFeedbackDownload.disabled = true;
  setReviewFeedbackMessage("正在生成与当前 43 项基础内容及 31 条来源账严格绑定的模板…", "loading");
  try {
    const template = await createWesternContentReviewFeedbackTemplate();
    startTextDownload(
      serializeWesternContentReviewFeedbackTemplate(template),
      WESTERN_CONTENT_REVIEW_FEEDBACK_FILENAME
    );
    setReviewFeedbackMessage(
      `已生成 ${WESTERN_CONTENT_REVIEW_FEEDBACK_FILENAME}；请在外部编辑后重新导入。`,
      "success"
    );
  } catch (cause) {
    setReviewFeedbackMessage(
      cause instanceof Error && cause.message ? cause.message : "审稿模板没有生成。",
      "error"
    );
  } finally {
    reviewFeedbackDownload.disabled = false;
  }
}

async function inspectSelectedReviewFeedback(): Promise<void> {
  const token = ++reviewFeedbackReadToken;
  clearReviewFeedbackPreview("正在只读检查审稿反馈；不会写入规则、缓存或资料…", "loading");
  const file = reviewFeedbackFile.files?.[0];
  if (!file) {
    clearReviewFeedbackPreview("请选择一个已填写的 JSON 审稿反馈文件。", "error");
    return;
  }
  try {
    if (!file.name.toLowerCase().endsWith(".json")) {
      throw new Error("审稿反馈文件必须使用 .json 扩展名");
    }
    if (file.size < 1 || file.size > WESTERN_CONTENT_REVIEW_FEEDBACK_MAX_BYTES) {
      throw new Error("审稿反馈文件必须是 1 字节至 2 MiB 的 UTF-8 JSON");
    }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    if (token !== reviewFeedbackReadToken) return;
    const preflight = await preflightWesternContentReviewFeedback(raw);
    if (token !== reviewFeedbackReadToken) return;
    renderReviewFeedbackPreflight(preflight, file.name);
  } catch (cause) {
    if (token !== reviewFeedbackReadToken) return;
    clearReviewFeedbackPreview(
      cause instanceof Error && cause.message
        ? `预检失败：${cause.message}`
        : "预检失败：这不是可读取的 UTF-8 审稿反馈。",
      "error"
    );
  } finally {
    if (token === reviewFeedbackReadToken) reviewFeedbackFile.value = "";
  }
}

function dynamicReviewCategoryLabel(
  category: WesternDynamicContentReviewFeedbackPreflight["envelope"]["items"][number]["category"]
): string {
  return ({
    first_read: "四步首读",
    body_synthesis: "逐星综合",
    chart_ruler: "命主星",
    dispositor_chain: "定位星链",
    angle_proximity: "四轴距离",
    angle: "轴点",
    distribution: "结构分布",
    house_ruler: "宫主星",
    placement: "落位",
    aspect: "相位"
  } as const)[category];
}

function setDynamicReviewFeedbackMessage(
  message: string,
  state: "idle" | "loading" | "success" | "error"
): void {
  dynamicReviewFeedbackMessage.textContent = message;
  dynamicReviewFeedbackMessage.dataset.state = state;
}

function setDynamicReviewFeedbackControls(available: boolean): void {
  dynamicReviewFeedbackDownload.disabled = !available;
  dynamicReviewFeedbackFile.disabled = !available;
  dynamicReviewFeedbackFileAction.classList.toggle("is-disabled", !available);
  dynamicReviewFeedbackFileAction.setAttribute("aria-disabled", String(!available));
}

function setDynamicReviewFeedbackBoundary(
  preflight: WesternDynamicContentReviewFeedbackPreflight | null
): void {
  dynamicReviewFeedbackPanel.dataset.currentProjectionBound = String(
    preflight?.currentProjectionBound ?? false
  );
  dynamicReviewFeedbackPanel.dataset.identityVerified = "false";
  dynamicReviewFeedbackPanel.dataset.digitalSignatureVerified = "false";
  dynamicReviewFeedbackPanel.dataset.scientificValidityEstablished = "false";
  dynamicReviewFeedbackPanel.dataset.eligibleForFormalActivation = "false";
  dynamicReviewFeedbackPanel.dataset.autoIntegrationAllowed = "false";
  dynamicReviewFeedbackPanel.dataset.networkTransmissionPerformed = "false";
  dynamicReviewFeedbackPanel.dataset.ruleArtifactOrStorageMutationPerformed = "false";
  dynamicReviewFeedbackPanel.dataset.primitiveCatalogReviewApplied = "false";
  dynamicReviewFeedbackPanel.dataset.deterministicOutcomeEstablished = "false";
  dynamicReviewFeedbackPanel.dataset.goodBadOrientation = "null";
  dynamicReviewFeedbackPanel.dataset.eventOutcome = "null";
  dynamicReviewFeedbackPanel.dataset.result = "null";
}

function clearDynamicReviewFeedbackPreview(
  message: string,
  state: "idle" | "loading" | "success" | "error",
  projection: WesternContentProjection | null
): void {
  const count = projection === null
    ? null
    : westernDynamicContentReviewCandidateCount(projection);
  dynamicReviewFeedbackTotal.textContent = count === null ? "—" : String(count);
  dynamicReviewFeedbackResolved.textContent = count === null ? "—" : "0";
  dynamicReviewFeedbackUnresolved.textContent = count === null ? "—" : String(count);
  dynamicReviewFeedbackReviewer.textContent = projection === null ? "尚无当前盘" : "尚未提供";
  dynamicReviewFeedbackItems.replaceChildren();
  dynamicReviewFeedbackItems.hidden = true;
  setDynamicReviewFeedbackBoundary(null);
  setDynamicReviewFeedbackControls(projection !== null);
  setDynamicReviewFeedbackMessage(message, state);
}

function activateDynamicReviewFeedback(projection: WesternContentProjection): void {
  currentContentProjection = projection;
  const count = westernDynamicContentReviewCandidateCount(projection);
  clearDynamicReviewFeedbackPreview(
    `当前已显示命盘包含 ${count} 张动态候选卡，可主动下载去直接标识的审稿模板。模板仍含精确派生盘面，不是匿名数据。`,
    "idle",
    projection
  );
}

function invalidateDynamicReviewFeedback(message: string): void {
  dynamicProjectionEpoch += 1;
  dynamicReviewFeedbackReadToken += 1;
  currentContentProjection = null;
  dynamicReviewFeedbackFile.value = "";
  clearDynamicReviewFeedbackPreview(message, "idle", null);
}

function renderDynamicReviewFeedbackPreflight(
  preflight: WesternDynamicContentReviewFeedbackPreflight,
  fileName: string
): void {
  dynamicReviewFeedbackTotal.textContent = String(preflight.counts.total);
  dynamicReviewFeedbackResolved.textContent = String(preflight.resolvedCount);
  dynamicReviewFeedbackUnresolved.textContent = String(preflight.unresolvedCount);
  dynamicReviewFeedbackReviewer.textContent = preflight.reviewerAttributionComplete
    ? `${preflight.envelope.reviewer.displayName}（自述，未核验）`
    : "尚未提供";
  setDynamicReviewFeedbackBoundary(preflight);

  dynamicReviewFeedbackItems.replaceChildren();
  const resolvedItems = preflight.envelope.items.filter((item) => item.decision !== "unresolved");
  for (const item of resolvedItems) {
    const card = document.createElement("li");
    card.className = "review-feedback-item";
    card.dataset.candidateId = item.candidateId;
    card.dataset.category = item.category;
    card.dataset.decision = item.decision;
    card.dataset.orientationProposal = item.orientationProposal;
    card.dataset.expertTruthClaimed = "false";
    card.dataset.scientificValidityClaimed = "false";
    card.dataset.formalActivationAllowed = "false";
    card.dataset.goodBadOrientation = "null";
    card.dataset.eventOutcome = "null";
    card.dataset.result = "null";

    const heading = document.createElement("div");
    heading.className = "review-feedback-item-heading";
    const title = document.createElement("strong");
    title.textContent = `${dynamicReviewCategoryLabel(item.category)} · ${item.title}`;
    const decision = document.createElement("span");
    decision.textContent = reviewDecisionLabel(item.decision);
    heading.append(title, decision);

    const details = document.createElement("dl");
    details.className = "review-feedback-item-details";
    details.append(
      reviewSummaryPair("方向提案", reviewOrientationLabel(item.orientationProposal)),
      reviewSummaryPair("传统口径", item.selectedTradition),
      reviewSummaryPair("审稿理由", item.decisionReason),
      reviewSummaryPair("成立条件", item.applicabilityConditions),
      reviewSummaryPair("反例提醒", item.counterexamples)
    );
    if (item.revisionRequest) details.append(reviewSummaryPair("退修要求", item.revisionRequest));
    if (item.additionalSourceUrls.length > 0) {
      const sourceRow = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = "补充来源";
      const description = document.createElement("dd");
      item.additionalSourceUrls.forEach((sourceUrl, index) => {
        const link = document.createElement("a");
        link.href = sourceUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = `来源 ${index + 1}`;
        if (index > 0) description.append("、");
        description.append(link);
      });
      sourceRow.append(term, description);
      details.append(sourceRow);
    }
    card.append(heading, details);
    dynamicReviewFeedbackItems.append(card);
  }
  dynamicReviewFeedbackItems.hidden = resolvedItems.length === 0;
  setDynamicReviewFeedbackMessage(
    `预检通过：${fileName} 严格绑定当前命盘的 ${preflight.counts.total} 张动态候选卡，已裁决 ${preflight.resolvedCount} 项、未裁决 ${preflight.unresolvedCount} 项。没有继承 43 项基础审稿，也没有写入、上传、正式激活或生成吉凶结果。`,
    "success"
  );
}

async function downloadDynamicReviewFeedbackTemplate(): Promise<void> {
  const projection = currentContentProjection;
  const epoch = dynamicProjectionEpoch;
  if (projection === null) {
    clearDynamicReviewFeedbackPreview("请先完成一次成功计算，再下载当前盘审稿模板。", "error", null);
    return;
  }
  dynamicReviewFeedbackDownload.disabled = true;
  setDynamicReviewFeedbackMessage(
    "正在生成与当前命盘、动态候选顺序和来源账严格绑定的去直接标识模板…",
    "loading"
  );
  try {
    const template = await createWesternDynamicContentReviewFeedbackTemplate(projection);
    if (epoch !== dynamicProjectionEpoch || currentContentProjection !== projection) return;
    const filename = westernDynamicContentReviewFeedbackFilename();
    startTextDownload(serializeWesternDynamicContentReviewFeedbackTemplate(template), filename);
    setDynamicReviewFeedbackMessage(
      `已生成 ${filename}；文件含精确派生盘面，请按敏感文件保管并自行决定是否外发。`,
      "success"
    );
  } catch (cause) {
    if (epoch !== dynamicProjectionEpoch || currentContentProjection !== projection) return;
    setDynamicReviewFeedbackMessage(
      cause instanceof Error && cause.message ? cause.message : "当前盘审稿模板没有生成。",
      "error"
    );
  } finally {
    if (epoch === dynamicProjectionEpoch && currentContentProjection === projection) {
      dynamicReviewFeedbackDownload.disabled = false;
    }
  }
}

async function inspectSelectedDynamicReviewFeedback(): Promise<void> {
  const projection = currentContentProjection;
  const epoch = dynamicProjectionEpoch;
  const token = ++dynamicReviewFeedbackReadToken;
  if (projection === null) {
    clearDynamicReviewFeedbackPreview("请先完成一次成功计算，再导入当前盘反馈。", "error", null);
    return;
  }
  clearDynamicReviewFeedbackPreview(
    "正在对当前已显示命盘做只读绑定检查；不会写入规则、缓存或资料…",
    "loading",
    projection
  );
  const file = dynamicReviewFeedbackFile.files?.[0];
  if (!file) {
    clearDynamicReviewFeedbackPreview("请选择一个已填写的当前盘 JSON 审稿反馈文件。", "error", projection);
    return;
  }
  try {
    if (!file.name.toLowerCase().endsWith(".json")) {
      throw new Error("当前盘审稿反馈必须使用 .json 扩展名");
    }
    if (file.size < 1 || file.size > WESTERN_DYNAMIC_CONTENT_REVIEW_FEEDBACK_MAX_BYTES) {
      throw new Error("当前盘审稿反馈必须是 1 字节至 2 MiB 的 UTF-8 JSON");
    }
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    if (token !== dynamicReviewFeedbackReadToken
      || epoch !== dynamicProjectionEpoch
      || currentContentProjection !== projection) return;
    const preflight = await preflightWesternDynamicContentReviewFeedback(raw, projection);
    if (token !== dynamicReviewFeedbackReadToken
      || epoch !== dynamicProjectionEpoch
      || currentContentProjection !== projection) return;
    renderDynamicReviewFeedbackPreflight(preflight, file.name);
  } catch (cause) {
    if (token !== dynamicReviewFeedbackReadToken
      || epoch !== dynamicProjectionEpoch
      || currentContentProjection !== projection) return;
    clearDynamicReviewFeedbackPreview(
      cause instanceof Error && cause.message
        ? `预检失败：${cause.message}`
        : "预检失败：这不是可读取的 UTF-8 当前盘审稿反馈。",
      "error",
      projection
    );
  } finally {
    if (token === dynamicReviewFeedbackReadToken) dynamicReviewFeedbackFile.value = "";
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Readonly<Record<string, string>>
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  return element;
}

function renderWheel(
  bodies: ReadonlyArray<Readonly<{
    bodyId: string;
    zodiac: Readonly<{ longitudeDeg: number; signIndex: number }>;
  }>>,
  houses: ReadonlyArray<Readonly<{ houseNumber: number; longitudeDeg: number }>>,
  aspects: ReadonlyArray<Readonly<{ bodyA: string; bodyB: string }>>,
  sidereal: boolean,
  ayanamshaDeg: number
): void {
  chartWheel.replaceChildren();
  const displayLongitude = (longitudeDeg: number): number =>
    sidereal ? (longitudeDeg - ayanamshaDeg + 360) % 360 : longitudeDeg;

  const bodyByLongitude = new Map(bodies.map((body) => [
    body.bodyId,
    {
      ...body,
      point: wheelPoint(WHEEL.center, WHEEL.bodyRadius, body.zodiac.longitudeDeg)
    }
  ]));

  for (const sector of createWheelSectors()) {
    const path = svgElement("path", {
      d: annularSectorPath(
        WHEEL.center,
        WHEEL.zodiacInner,
        WHEEL.zodiacOuter,
        sector.startLongitudeDeg,
        sector.endLongitudeDeg
      ),
      fill: (sector.label === "1" || sector.label === "5" || sector.label === "9")
        ? "#eef2f7"
        : "#f8fafc",
      stroke: "#c7ced8",
      "stroke-width": "1"
    });
    chartWheel.append(path);
    const labelPoint = wheelPoint(WHEEL.center, 208, midLongitude(
      sector.startLongitudeDeg,
      sector.endLongitudeDeg
    ));
    const label = svgElement("text", {
      x: String(labelPoint.x),
      y: String(labelPoint.y + 4),
      "text-anchor": "middle",
      "font-size": "11",
      fill: "#5b6572"
    });
    label.textContent = SIGN_IDS[Number(sector.label) - 1] ?? sector.label;
    chartWheel.append(label);
  }

  for (let index = 0; index < houses.length; index += 1) {
    const cusp = houses[index]!;
    const next = houses[(index + 1) % houses.length]!;
    const start = displayLongitude(cusp.longitudeDeg);
    const end = displayLongitude(next.longitudeDeg);
    const span = (end - start + 360) % 360 || 360;
    const path = svgElement("path", {
      d: annularSectorPath(WHEEL.center, WHEEL.houseInner, WHEEL.houseOuter, start, end),
      fill: cusp.houseNumber % 2 === 1 ? "#f0f4f9" : "#ffffff",
      stroke: "#9fb0c4",
      "stroke-width": "1"
    });
    chartWheel.append(path);
    const labelPoint = wheelPoint(WHEEL.center, 165, (start + span / 2) % 360);
    const label = svgElement("text", {
      x: String(labelPoint.x),
      y: String(labelPoint.y + 4),
      "text-anchor": "middle",
      "font-size": "12",
      "font-weight": "600",
      fill: "#2f3e5c"
    });
    label.textContent = String(cusp.houseNumber);
    chartWheel.append(label);
  }

  for (const cusp of houses) {
    const point = wheelPoint(WHEEL.center, WHEEL.houseOuter, displayLongitude(cusp.longitudeDeg));
    chartWheel.append(svgElement("line", {
      x1: String(point.x),
      y1: String(point.y),
      x2: String(wheelPoint(WHEEL.center, WHEEL.spokeInner, displayLongitude(cusp.longitudeDeg)).x),
      y2: String(wheelPoint(WHEEL.center, WHEEL.spokeInner, displayLongitude(cusp.longitudeDeg)).y),
      stroke: "#7c8ba0",
      "stroke-width": "1"
    }));
  }

  for (const aspect of aspects) {
    const bodyA = bodyByLongitude.get(aspect.bodyA);
    const bodyB = bodyByLongitude.get(aspect.bodyB);
    if (!bodyA || !bodyB) continue;
    chartWheel.append(svgElement("line", {
      x1: String(bodyA.point.x),
      y1: String(bodyA.point.y),
      x2: String(bodyB.point.x),
      y2: String(bodyB.point.y),
      stroke: "#c2410c",
      "stroke-width": "1",
      opacity: "0.55"
    }));
  }

  for (const body of bodies) {
    const point = wheelPoint(WHEEL.center, WHEEL.bodyRadius, body.zodiac.longitudeDeg);
    chartWheel.append(svgElement("circle", {
      cx: String(point.x),
      cy: String(point.y),
      r: "5",
      fill: "#2f3e5c",
      stroke: "#ffffff",
      "stroke-width": "1.5"
    }));
    const labelPoint = wheelPoint(WHEEL.center, WHEEL.bodyLabelRadius, body.zodiac.longitudeDeg);
    const label = svgElement("text", {
      x: String(labelPoint.x),
      y: String(labelPoint.y + 4),
      "text-anchor": "middle",
      "font-size": "13",
      "font-weight": "700",
      fill: "#1e2530"
    });
    label.textContent = BODY_LABELS[body.bodyId as keyof typeof BODY_LABELS] ?? body.bodyId;
    chartWheel.append(label);
  }

  chartWheel.setAttribute(
    "aria-label",
    `星盘轮：${bodies.length} 个天体、12 宫、${aspects.length} 条相位`
  );
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void calculate();
});
reviewFeedbackDownload.addEventListener("click", () => void downloadReviewFeedbackTemplate());
reviewFeedbackFile.addEventListener("change", () => void inspectSelectedReviewFeedback());
dynamicReviewFeedbackDownload.addEventListener(
  "click",
  () => void downloadDynamicReviewFeedbackTemplate()
);
dynamicReviewFeedbackFile.addEventListener(
  "change",
  () => void inspectSelectedDynamicReviewFeedback()
);

async function calculate(): Promise<void> {
  invalidateDynamicReviewFeedback(
    "正在重新计算；旧命盘的动态审稿上下文已失效，成功生成新盘后才能重新下载或导入。"
  );
  clearError();
  clearRenderedFacts();
  clearContentProjection();
  const utcInstant = utcInput.value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(utcInstant)
    || !Number.isFinite(Date.parse(utcInstant))) {
    showError("UTC 瞬时必须使用规范毫秒 Z 形式，例如 2025-03-20T09:01:00.000Z。");
    setStatus("输入未通过校验；未启动 Worker，也未保留旧结果。");
    return;
  }
  const ramcDeg = Number(ramcInput.value);
  const latitude = Number(latitudeInput.value);
  const obliquity = Number(obliquityInput.value);
  const ayanamsha = siderealInput.checked ? Number(ayanamshaInput.value) : null;
  const houseSystem = houseSystemInput.value;
  if (!["whole_sign_v1", "equal_asc_v1", "porphyry_v1", "placidus_v1"].includes(houseSystem)
    || !Number.isFinite(ramcDeg) || ramcDeg < 0 || ramcDeg >= 360
    || !Number.isFinite(latitude) || Math.abs(latitude) > 60
    || !Number.isFinite(obliquity) || obliquity <= 0 || obliquity > 90) {
    showError("宫制或演示几何参数无效；纬度暂限 ±60° 内以保持宫位可定义。");
    setStatus("输入未通过校验；未启动 Worker，也未保留旧结果。");
    return;
  }
  if (ayanamsha !== null && (!Number.isFinite(ayanamsha) || ayanamsha < 0 || ayanamsha >= 360)) {
    showError("恒星岁差值必须是 0–360 之间的数值。");
    setStatus("输入未通过校验；未启动 Worker，也未保留旧结果。");
    return;
  }

  calculateButton.disabled = true;
  setStatus("正在启动一次性 Worker 计算天体位置…");
  try {
    const outcome = await runWesternRulesPreviewWorker(utcInstant, ALL_BODY_IDS);
    setStatus("天文位置已验真；正在生成规则层几何…");
    const artifact = runWesternRuleLayer({
      protocolVersion: "western-astrology-rules-request/0.1-draft",
      inputLabel: `rules preview ${utcInstant}`,
      bodies: outcome.bodies.map((body) => ({
        bodyId: body.bodyId,
        eclipticLongitudeDeg: body.trueEclipticOfDate.longitudeDeg,
        longitudeSpeedDegPerDay: body.finiteDifference.longitudeSpeedDegPerDay
      })),
      zodiac: ayanamsha === null
        ? { kind: "tropical", ayanamshaDeg: null }
        : { kind: "sidereal", ayanamshaDeg: ayanamsha },
      houses: {
        systemId: houseSystem,
        ramcDeg,
        geographicLatitudeDeg: latitude,
        obliquityTrueOfDateDeg: obliquity
      },
      aspects: { definitions: ASPECT_DEFINITIONS }
    });
    if (artifact.outcome !== "computed") {
      throw new Error(artifact.failure?.message ?? "rule layer failed closed");
    }
    const contentProjection = buildWesternContentProjection(artifact);
    renderBodies(artifact.result.bodies);
    if (artifact.result.houses !== null) renderHouses(artifact.result.houses);
    renderAspects(artifact.result.aspects);
    if (artifact.result.houses !== null) {
      renderWheel(
        artifact.result.bodies,
        artifact.result.houses.cusps,
        artifact.result.aspects,
        ayanamsha !== null,
        ayanamsha ?? 0
      );
    }
    renderContentProjection(contentProjection);
    activateDynamicReviewFeedback(contentProjection);
    setStatus(`计算完成并通过工程核对（${outcome.bodies.length} 天体）；已生成日月上升首读、逐星综合、命主星、定位星链、四轴距离账、结构分布与落位相位候选，未保存任何资料。`);
  } catch (cause) {
    showError(cause instanceof Error ? cause.message : String(cause));
    setStatus("本次计算失败关闭，没有保存任何资料。");
  } finally {
    calculateButton.disabled = false;
  }
}

clearRenderedFacts();
clearContentProjection();
clearReviewFeedbackPreview(
  "尚未导入反馈。下载模板并在外部编辑；任何方向都只是待人工核验的条件化提案。",
  "idle"
);
invalidateDynamicReviewFeedback(
  "先完成一次计算。模板只绑定当前已显示命盘；重算、错误文件或错盘反馈都会清空旧预检结果。"
);
setStatus("等待一次计算。");
