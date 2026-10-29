import { transitNodeRefSchema, type TransitNodeRef } from "@hakimi/contracts";
import { ANNUAL_RELATIONSHIP_TIMING_VERSION, type AnnualRelationshipTiming } from "./annual-relationship-timing";

export const ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION = "hakimi.annual-relationship-timing-record/0.1.0" as const;
type Binding = AnnualRelationshipTiming["sourceBinding"];
type SharedKind = "nodeRefs" | "sourceBindings" | "conditions" | "sourceVersions";
type ObjectValue = Record<string, unknown>;
export interface AnnualRelationshipTimingRecordPool {
  format: typeof ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION;
  nodeRefs: TransitNodeRef[];
  sourceBindings: Binding[];
  conditions: string[][];
  sourceVersions: string[][];
}
export interface CompactAnnualRelationshipTiming {
  format: typeof ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION;
  recordId: string;
  value: ObjectValue;
}
const fail = (): never => { throw new Error("关系时机引用记录、共享表或版本无效。"); };
const object = (value: unknown): ObjectValue => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : fail();
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : fail();
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function keys(value: ObjectValue, expected: string[]) {
  if (Object.keys(value).sort().join("|") !== [...expected].sort().join("|")) fail();
}
function validShared(kind: SharedKind, value: unknown): boolean {
  if (kind === "nodeRefs") return transitNodeRefSchema.safeParse(value).success;
  if (kind !== "sourceBindings") return strings(value);
  const v = object(value);
  keys(v, ["revisionId", "chartResultHash", "includeHour", "sex"]);
  return typeof v.revisionId === "string" && Boolean(v.revisionId) && typeof v.chartResultHash === "string" && Boolean(v.chartResultHash)
    && typeof v.includeHour === "boolean" && ["male", "female", "unspecified"].includes(v.sex as string);
}
function validPool(value: unknown): AnnualRelationshipTimingRecordPool {
  const pool = object(value);
  keys(pool, ["format", "nodeRefs", "sourceBindings", "conditions", "sourceVersions"]);
  if (pool.format !== ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION) fail();
  for (const kind of ["nodeRefs", "sourceBindings", "conditions", "sourceVersions"] as const)
    if (!array(pool[kind]).every((entry) => validShared(kind, entry))) fail();
  return pool as unknown as AnnualRelationshipTimingRecordPool;
}
/** Rewrite only the four explicitly declared metadata categories at their
 * known paths. Object.entries keeps the original JSON property order. */
function rewriteTiming(value: unknown, shared: (kind: SharedKind, value: unknown) => unknown): ObjectValue {
  const timing = object(value);
  keys(timing, ["version", "sourceBinding", "scope", "triggered", "coverage", "lenses", "conditions", "sourceIds", "sourceVersions"]);
  if (timing.version !== ANNUAL_RELATIONSHIP_TIMING_VERSION || typeof timing.triggered !== "boolean"
    || !["selected_four_pillars", "hour_excluded"].includes(timing.coverage as string) || !strings(timing.sourceIds)) fail();
  const map = (v: unknown, edit: (key: string, item: unknown) => unknown) => Object.fromEntries(Object.entries(object(v)).map(([key, item]) => [key, edit(key, item)]));
  return map(timing, (key, item) => {
    if (key === "sourceBinding") return shared("sourceBindings", item);
    if (key === "conditions" || key === "sourceVersions") return shared(key, item);
    if (key === "scope") {
      keys(object(item), ["year", "yearGanZhi", "branchId", "segmentId", "targetRef", "backgroundRefs", "startInstant", "endExclusiveInstant"]);
      return map(item, (name, field) => name === "targetRef" ? shared("nodeRefs", field)
        : name === "backgroundRefs" ? array(field).map((ref) => shared("nodeRefs", ref)) : field);
    }
    if (key === "lenses") return array(item).map((lens) => {
      keys(object(lens), ["id", "label", "traditionalRole", "focus", "overlap", "signals", "annualSignalIds", "backgroundSignalIds", "triggerSignalIds", "conditions", "sourceIds"]);
      return map(lens, (name, field) => name === "conditions" ? shared("conditions", field)
        : name === "signals" ? array(field).map((signal) => {
          keys(object(signal), ["id", "kind", "source", "nodeRef", "ganZhi", "relevance", "stem", "tenGod", "natalOccurrenceIds", "natalPositions", "relationType", "factId", "ruleId", "text"]);
          return map(signal, (signalKey, signalValue) => signalKey === "nodeRef" ? shared("nodeRefs", signalValue) : signalValue);
        }) : field);
    });
    return item;
  });
}

/** Expand the documented shallow references, without changing object key order
 * or interpreting any prose. The surrounding snapshot still validates origin. */
export function expandAnnualRelationshipTiming(compact: unknown, sharedPool: unknown): AnnualRelationshipTiming {
  const record = object(compact), pool = validPool(sharedPool);
  keys(record, ["format", "recordId", "value"]);
  if (record.format !== ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION || typeof record.recordId !== "string" || !/^rt-[1-9]\d*$/.test(record.recordId)) fail();
  const expanded = rewriteTiming(record.value, (kind, value) => {
    const ref = object(value);
    keys(ref, ["$ref", "index"]);
    if (ref.$ref !== kind || !Number.isSafeInteger(ref.index) || (ref.index as number) < 0 || (ref.index as number) >= pool[kind].length) fail();
    return pool[kind][ref.index as number];
  });
  // Copy all untouched arrays/text too: callers cannot mutate the pool or a
  // previous result by editing the returned object.
  return clone(expanded) as unknown as AnnualRelationshipTiming;
}

export function createAnnualRelationshipTimingRecordWriter(): {
  describe(timing: AnnualRelationshipTiming): string[];
  appendix(): string[];
} {
  const pool: AnnualRelationshipTimingRecordPool = { format: ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION,
    nodeRefs: [], sourceBindings: [], conditions: [], sourceVersions: [] };
  const indices: Record<SharedKind, Map<string, number>> = { nodeRefs: new Map(), sourceBindings: new Map(), conditions: new Map(), sourceVersions: new Map() };
  const records = new Map<string, string>();
  return {
    describe(timing) {
      const original = JSON.stringify(timing), existing = records.get(original);
      if (existing) return [`关系时机记录：${existing}`];
      // Stage changes so invalid input does not leave a partial shared table.
      const next = clone(pool), nextIndices = Object.fromEntries(Object.entries(indices).map(([key, value]) => [key, new Map(value)])) as typeof indices;
      const compact: CompactAnnualRelationshipTiming = { format: ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION,
        recordId: `rt-${records.size + 1}`, value: rewriteTiming(timing, (kind, value) => {
          if (!validShared(kind, value)) fail();
          const encoded = JSON.stringify(value);
          let index = nextIndices[kind].get(encoded);
          if (index === undefined) {
            index = next[kind].length;
            (next[kind] as unknown[]).push(clone(value)); nextIndices[kind].set(encoded, index);
          }
          return { $ref: kind, index };
        }) };
      if (JSON.stringify(expandAnnualRelationshipTiming(compact, next)) !== original) fail();
      for (const kind of ["nodeRefs", "sourceBindings", "conditions", "sourceVersions"] as const) {
        (pool[kind] as unknown[]) = next[kind]; indices[kind] = nextIndices[kind];
      }
      records.set(original, compact.recordId);
      return [`关系时机记录：${compact.recordId}`, `关系时机紧凑记录：${JSON.stringify(compact)}`];
    },
    appendix() {
      return records.size ? [`关系时机引用格式：${ANNUAL_RELATIONSHIP_TIMING_RECORD_VERSION}`, `关系时机共享表：${JSON.stringify(pool)}`] : [];
    }
  };
}
