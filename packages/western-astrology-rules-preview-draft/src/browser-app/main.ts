import "./styles.css";
import { runWesternRulesPreviewWorker } from "../browser-client.ts";
import { runWesternRuleLayer } from "../rule-layer-bridge.ts";
import {
  annularSectorPath,
  createWheelSectors,
  midLongitude,
  wheelPoint
} from "./chart-wheel.ts";

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

async function calculate(): Promise<void> {
  clearError();
  const utcInstant = utcInput.value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(utcInstant)
    || !Number.isFinite(Date.parse(utcInstant))) {
    showError("UTC 瞬时必须使用规范毫秒 Z 形式，例如 2025-03-20T09:01:00.000Z。");
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
    return;
  }
  if (ayanamsha !== null && (!Number.isFinite(ayanamsha) || ayanamsha < 0 || ayanamsha >= 360)) {
    showError("恒星岁差值必须是 0–360 之间的数值。");
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
    setStatus(`计算完成并通过工程核对（${outcome.bodies.length} 天体）；未保存任何资料。`);
  } catch (cause) {
    showError(cause instanceof Error ? cause.message : String(cause));
    setStatus("本次计算失败关闭，没有保存任何资料。");
  } finally {
    calculateButton.disabled = false;
  }
}

setStatus("等待一次计算。");
