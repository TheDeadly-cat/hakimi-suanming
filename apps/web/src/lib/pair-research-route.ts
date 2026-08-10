export type PairResearchDirection = "forward" | "backward";

export type PairResearchRouteSlot = {
  caseId: string | null;
  revisionId: string | null;
  manualDirection: PairResearchDirection | null;
};

export type PairResearchRouteState = {
  slots: [PairResearchRouteSlot, PairResearchRouteSlot];
  atInstant: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANONICAL_UTC_MINUTE_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;
const ALLOWED_PARAMS = new Set(["item", "at", "dir"]);

export class PairResearchRouteError extends Error {
  readonly code = "PAIR_RESEARCH_ROUTE_INVALID" as const;

  constructor(message: string) {
    super(message);
    this.name = "PairResearchRouteError";
  }
}

function blankSlot(): PairResearchRouteSlot {
  return { caseId: null, revisionId: null, manualDirection: null };
}

export function currentCanonicalUtcMinuteInstant(now = new Date()): string {
  return `${now.toISOString().slice(0, 16)}:00.000Z`;
}

function parseItem(value: string, index: number): PairResearchRouteSlot {
  const [kind, caseId, revisionId, extra] = value.split(":");
  if (kind !== "revision" || !UUID_PATTERN.test(caseId ?? "") || !UUID_PATTERN.test(revisionId ?? "") || extra !== undefined) {
    throw new PairResearchRouteError(`双案例链接中的第 ${index + 1} 个 item 不是确切 revision:<caseId>:<revisionId>。`);
  }
  return { caseId, revisionId, manualDirection: null };
}

function parseAtInstant(values: string[], fallback: string): string {
  if (values.length === 0) return fallback;
  if (values.length !== 1) throw new PairResearchRouteError("双案例链接只能包含一个 at 瞬时点。");
  const value = values[0];
  if (!CANONICAL_UTC_MINUTE_INSTANT_PATTERN.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new PairResearchRouteError("双案例链接的 at 必须是精确到分钟的规范 UTC 瞬时点。");
  }
  return value;
}

export function parsePairResearchRoute(
  search: string,
  fallbackAtInstant = currentCanonicalUtcMinuteInstant()
): PairResearchRouteState {
  const params = new URLSearchParams(search);
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) throw new PairResearchRouteError(`双案例链接包含未知参数 ${key}。`);
  }

  const itemValues = params.getAll("item");
  if (itemValues.length > 2) throw new PairResearchRouteError("双案例结构研究最多只能包含两个确切 Revision。 ");
  const parsedItems = itemValues.map(parseItem);
  if (parsedItems.length === 2) {
    if (parsedItems[0].caseId === parsedItems[1].caseId) {
      throw new PairResearchRouteError("双案例链接必须指向两个不同 Case；同一案例多修订请使用正式对照台。");
    }
    if (parsedItems[0].revisionId === parsedItems[1].revisionId) {
      throw new PairResearchRouteError("双案例链接不能重复同一个 Revision。");
    }
  }

  const slots: [PairResearchRouteSlot, PairResearchRouteSlot] = [
    parsedItems[0] ?? blankSlot(),
    parsedItems[1] ?? blankSlot()
  ];
  const seenDirections = new Set<string>();
  for (const value of params.getAll("dir")) {
    const [slotId, direction, extra] = value.split(":");
    if ((slotId !== "A" && slotId !== "B") || (direction !== "forward" && direction !== "backward") || extra !== undefined) {
      throw new PairResearchRouteError("双案例链接的 dir 只允许 A:forward、A:backward、B:forward 或 B:backward。");
    }
    if (seenDirections.has(slotId)) throw new PairResearchRouteError(`双案例链接重复声明了 ${slotId} 的人工顺逆。`);
    const index = slotId === "A" ? 0 : 1;
    if (!slots[index].caseId || !slots[index].revisionId) {
      throw new PairResearchRouteError(`双案例链接不能为尚未选择的对象 ${slotId} 声明人工顺逆。`);
    }
    seenDirections.add(slotId);
    slots[index].manualDirection = direction;
  }

  return {
    slots,
    atInstant: parseAtInstant(params.getAll("at"), fallbackAtInstant)
  };
}

export function serializePairResearchRoute(state: PairResearchRouteState): string {
  const [subjectA, subjectB] = state.slots;
  if (!subjectA.caseId && (subjectA.revisionId || subjectA.manualDirection)) {
    throw new PairResearchRouteError("对象 A 的路由状态不完整。");
  }
  if (!subjectA.revisionId && subjectA.caseId) throw new PairResearchRouteError("对象 A 缺少确切 Revision。");
  if (!subjectB.caseId && (subjectB.revisionId || subjectB.manualDirection)) {
    throw new PairResearchRouteError("对象 B 的路由状态不完整。");
  }
  if (!subjectB.revisionId && subjectB.caseId) throw new PairResearchRouteError("对象 B 缺少确切 Revision。");
  if (subjectB.caseId && !subjectA.caseId) throw new PairResearchRouteError("不能在对象 A 为空时单独序列化对象 B。");
  if (subjectA.caseId && subjectB.caseId && subjectA.caseId === subjectB.caseId) {
    throw new PairResearchRouteError("双案例结构研究必须选择两个不同 Case。");
  }
  if (!CANONICAL_UTC_MINUTE_INSTANT_PATTERN.test(state.atInstant) || new Date(state.atInstant).toISOString() !== state.atInstant) {
    throw new PairResearchRouteError("双案例路由只能序列化精确到分钟的规范 UTC 瞬时点。");
  }

  const params = new URLSearchParams();
  for (const slot of state.slots) {
    if (slot.caseId && slot.revisionId) params.append("item", `revision:${slot.caseId}:${slot.revisionId}`);
  }
  params.set("at", state.atInstant);
  state.slots.forEach((slot, index) => {
    if (slot.manualDirection) params.append("dir", `${index === 0 ? "A" : "B"}:${slot.manualDirection}`);
  });
  return `/compare/pair?${params.toString()}`;
}

export function pairResearchUtcMinute(atInstant: string): string {
  if (!CANONICAL_UTC_MINUTE_INSTANT_PATTERN.test(atInstant)) {
    throw new PairResearchRouteError("双案例目标瞬时点不是规范 UTC 分钟。");
  }
  return atInstant.slice(0, 16);
}
