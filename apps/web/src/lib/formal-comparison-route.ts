export type FormalComparisonDirection = "forward" | "backward";
export type FormalComparisonFocusSlotId = "B" | "C" | "D";

export type FormalComparisonRouteSlot = {
  caseId: string | null;
  revisionId: string | null;
  manualDirection: FormalComparisonDirection | null;
};

export type FormalComparisonRouteState = {
  slots: FormalComparisonRouteSlot[];
  atInstant: string;
  focusSlotId: FormalComparisonFocusSlotId;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CANONICAL_UTC_MINUTE_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;
const ALLOWED_PARAMS = new Set(["item", "at", "dir", "focus", "case", "revision"]);
const SLOT_IDS = ["A", "B", "C", "D"] as const;
const FOCUS_SLOT_IDS = ["B", "C", "D"] as const;

export class FormalComparisonRouteError extends Error {
  readonly code = "FORMAL_COMPARISON_ROUTE_INVALID" as const;

  constructor(message: string) {
    super(message);
    this.name = "FormalComparisonRouteError";
  }
}

function blankSlot(): FormalComparisonRouteSlot {
  return { caseId: null, revisionId: null, manualDirection: null };
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

function isCanonicalUtcMinuteInstant(value: string): boolean {
  return CANONICAL_UTC_MINUTE_INSTANT_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

export function currentFormalComparisonUtcMinuteInstant(now = new Date()): string {
  return `${now.toISOString().slice(0, 16)}:00.000Z`;
}

function parseItem(value: string, index: number): FormalComparisonRouteSlot {
  const [kind, caseId, revisionId, extra] = value.split(":");
  if (kind !== "revision" || !isUuid(caseId) || !isUuid(revisionId) || extra !== undefined) {
    throw new FormalComparisonRouteError(
      `正式对照链接中的第 ${index + 1} 个 item 不是确切 revision:<caseId>:<revisionId>。`
    );
  }
  return { caseId, revisionId, manualDirection: null };
}

function parseAtInstant(values: string[], fallback: string): string {
  if (values.length === 0) return fallback;
  if (values.length !== 1) {
    throw new FormalComparisonRouteError("正式对照链接只能包含一个 at 瞬时点。");
  }
  const value = values[0];
  if (!isCanonicalUtcMinuteInstant(value)) {
    throw new FormalComparisonRouteError("正式对照链接的 at 必须是精确到分钟的规范 UTC 瞬时点。");
  }
  return value;
}

function parseLegacySlot(params: URLSearchParams): FormalComparisonRouteSlot[] {
  const caseValues = params.getAll("case");
  const revisionValues = params.getAll("revision");
  if (caseValues.length === 0 && revisionValues.length === 0) return [blankSlot()];
  if (
    caseValues.length !== 1 ||
    revisionValues.length !== 1 ||
    !isUuid(caseValues[0]) ||
    !isUuid(revisionValues[0])
  ) {
    throw new FormalComparisonRouteError(
      "旧版正式对照链接必须同时提供一个合法的 case 与 revision UUID；未回退到最新修订。"
    );
  }
  return [{ caseId: caseValues[0], revisionId: revisionValues[0], manualDirection: null }];
}

function parseFocusSlot(values: string[], slots: readonly FormalComparisonRouteSlot[]): FormalComparisonFocusSlotId {
  if (values.length === 0) return "B";
  if (values.length !== 1) {
    throw new FormalComparisonRouteError("正式对照链接只能包含一个 focus 活动比较盘。");
  }
  const value = values[0];
  if (!FOCUS_SLOT_IDS.includes(value as FormalComparisonFocusSlotId)) {
    throw new FormalComparisonRouteError("正式对照链接的 focus 只允许精确大写 B、C 或 D。");
  }
  const index = SLOT_IDS.indexOf(value as (typeof SLOT_IDS)[number]);
  if (!slots[index]?.caseId || !slots[index]?.revisionId) {
    throw new FormalComparisonRouteError(`正式对照链接不能把尚未选择的对照位 ${value} 设为活动比较盘。`);
  }
  return value as FormalComparisonFocusSlotId;
}

export function parseFormalComparisonRoute(
  search: string,
  fallbackAtInstant = currentFormalComparisonUtcMinuteInstant()
): FormalComparisonRouteState {
  const params = new URLSearchParams(search);
  for (const key of params.keys()) {
    if (!ALLOWED_PARAMS.has(key)) {
      throw new FormalComparisonRouteError(`正式对照链接包含未知参数 ${key}。`);
    }
  }

  const itemValues = params.getAll("item");
  const hasLegacyParams = params.has("case") || params.has("revision");
  if (itemValues.length > 0 && hasLegacyParams) {
    throw new FormalComparisonRouteError("正式对照链接不能混用 item 与旧版 case/revision 参数。");
  }
  if (itemValues.length > 4) {
    throw new FormalComparisonRouteError("正式对照链接最多只能包含四个确切 Revision；未静默截断多余项目。");
  }

  const slots = itemValues.length > 0
    ? itemValues.map(parseItem)
    : parseLegacySlot(params);
  const revisionIds = slots.flatMap((slot) => slot.revisionId ? [slot.revisionId] : []);
  if (new Set(revisionIds).size !== revisionIds.length) {
    throw new FormalComparisonRouteError("正式对照链接不能重复同一个 Revision。");
  }

  const seenDirections = new Set<string>();
  for (const value of params.getAll("dir")) {
    const [slotId, direction, extra] = value.split(":");
    const index = SLOT_IDS.indexOf(slotId as (typeof SLOT_IDS)[number]);
    if (index < 0 || (direction !== "forward" && direction !== "backward") || extra !== undefined) {
      throw new FormalComparisonRouteError(
        "正式对照链接的 dir 只允许 A～D 与 forward/backward 的明确组合。"
      );
    }
    if (seenDirections.has(slotId)) {
      throw new FormalComparisonRouteError(`正式对照链接重复声明了 ${slotId} 的人工顺逆。`);
    }
    if (!slots[index]?.caseId || !slots[index]?.revisionId) {
      throw new FormalComparisonRouteError(`正式对照链接不能为尚未选择的对照位 ${slotId} 声明人工顺逆。`);
    }
    seenDirections.add(slotId);
    slots[index].manualDirection = direction;
  }

  return {
    slots,
    atInstant: parseAtInstant(params.getAll("at"), fallbackAtInstant),
    focusSlotId: parseFocusSlot(params.getAll("focus"), slots)
  };
}

export function serializeFormalComparisonRoute(state: FormalComparisonRouteState): string {
  if (state.slots.length > 4) {
    throw new FormalComparisonRouteError("正式对照路由最多只能序列化四个 Revision。");
  }
  if (!isCanonicalUtcMinuteInstant(state.atInstant)) {
    throw new FormalComparisonRouteError("正式对照路由只能序列化精确到分钟的规范 UTC 瞬时点。");
  }

  let encounteredBlank = false;
  const revisionIds: string[] = [];
  for (const [index, slot] of state.slots.entries()) {
    const complete = isUuid(slot.caseId) && isUuid(slot.revisionId);
    const entirelyBlank = !slot.caseId && !slot.revisionId && !slot.manualDirection;
    if (!complete && !entirelyBlank) {
      throw new FormalComparisonRouteError(`对照位 ${SLOT_IDS[index] ?? index + 1} 的路由状态不完整。`);
    }
    if (entirelyBlank) {
      encounteredBlank = true;
      continue;
    }
    if (encounteredBlank) {
      throw new FormalComparisonRouteError("正式对照路由不能在空白对照位之后序列化其他 Revision。");
    }
    if (slot.manualDirection !== null && slot.manualDirection !== "forward" && slot.manualDirection !== "backward") {
      throw new FormalComparisonRouteError(`对照位 ${SLOT_IDS[index] ?? index + 1} 的人工顺逆无效。`);
    }
    revisionIds.push(slot.revisionId!);
  }
  if (new Set(revisionIds).size !== revisionIds.length) {
    throw new FormalComparisonRouteError("正式对照路由不能重复序列化同一个 Revision。");
  }

  const params = new URLSearchParams();
  for (const slot of state.slots) {
    if (slot.caseId && slot.revisionId) {
      params.append("item", `revision:${slot.caseId}:${slot.revisionId}`);
    }
  }
  params.set("at", state.atInstant);
  state.slots.forEach((slot, index) => {
    if (slot.manualDirection) params.append("dir", `${SLOT_IDS[index]}:${slot.manualDirection}`);
  });
  if (!FOCUS_SLOT_IDS.includes(state.focusSlotId)) {
    throw new FormalComparisonRouteError("正式对照路由的活动比较盘只允许 B、C 或 D。");
  }
  if (state.focusSlotId !== "B") {
    const focusIndex = SLOT_IDS.indexOf(state.focusSlotId);
    const focusSlot = state.slots[focusIndex];
    if (!focusSlot?.caseId || !focusSlot.revisionId) {
      throw new FormalComparisonRouteError(`正式对照路由不能序列化尚未选择的活动比较盘 ${state.focusSlotId}。`);
    }
    params.set("focus", state.focusSlotId);
  }
  return `/compare?${params.toString()}`;
}

export function formalComparisonUtcMinute(atInstant: string): string {
  if (!isCanonicalUtcMinuteInstant(atInstant)) {
    throw new FormalComparisonRouteError("正式对照目标瞬时点不是规范 UTC 分钟。");
  }
  return atInstant.slice(0, 16);
}
