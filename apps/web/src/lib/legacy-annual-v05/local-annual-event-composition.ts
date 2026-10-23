/** Frozen compatibility-only implementation. Original SHA-256: d818a070b5ed74176632eb4b2a050f989334be2cf35e044caadec3d630643888.
 * Never use this module for current automatic reading output. Import paths only are relocated. */
import { ANNUAL_EVENT_READING_VERSION, type AnnualEventBranch, type AnnualEventItem, type AnnualEventSegment, type LocalAnnualEventReading } from "./local-annual-event-reading";

export const ANNUAL_EVENT_COMPOSITION_VERSION = "hakimi.local-annual-event-composition/0.2.0" as const;
export type AnnualEventCompositionItem =
  | { kind: "single"; id: string; members: [AnnualEventItem] }
  | { kind: "settlement"; id: "settlement-closeout"; title: string; summary: string; members: [AnnualEventItem, AnnualEventItem] };
export interface AnnualEventCompositionSegment extends Omit<AnnualEventSegment, "items"> { items: AnnualEventCompositionItem[] }
export interface AnnualEventCompositionBranch extends Omit<AnnualEventBranch, "segments"> { segments: AnnualEventCompositionSegment[] }
export interface LocalAnnualEventComposition extends Omit<LocalAnnualEventReading, "version" | "branches"> {
  version: typeof ANNUAL_EVENT_COMPOSITION_VERSION;
  sourceReadingVersion: string;
  branches: AnnualEventCompositionBranch[];
}

export function annualEventCompositionSubjectId(year: number, segment: { id: string }, group: { id: string }): string {
  const value = `annual-event-composed-${year}-${segment.id}-${group.id}`;
  if (value.length > 500) throw new Error("组合情境的反馈标识超过可保存长度。");
  return value;
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value, index) => value === b[index]);
const sameSet = (a: readonly string[], b: readonly string[]) => sameList([...new Set(a)].sort(), [...new Set(b)].sort());
const sameInstant = (a: string, b: string) => Number.isFinite(Date.parse(a)) && Date.parse(a) === Date.parse(b);

function sameContext(reading: LocalAnnualEventReading, segment: AnnualEventSegment, career: AnnualEventItem, wealth: AnnualEventItem): boolean {
  const left = career.origin.contextSubjectId, right = wealth.origin.contextSubjectId;
  if (left === null || right === null) return left === null && right === null;
  const ref = reading.contextRef;
  return ref !== null
    && reading.sourceVersions.includes(`context-record/${ref.noteId}/${ref.editVersion}/${ref.bodySha256}`)
    && left === `contextual-annual-${reading.year}-${segment.id}-career`
    && right === `contextual-annual-${reading.year}-${segment.id}-wealth`;
}

function settlementMembers(reading: LocalAnnualEventReading, branch: AnnualEventBranch, segment: AnnualEventSegment): [AnnualEventItem, AnnualEventItem] | null {
  // Composition is a presentation rule over one already-validated original scope.
  // Never discover an identity by comparing prose or borrowing another segment.
  if (reading.version !== ANNUAL_EVENT_READING_VERSION || !["ready", "partial"].includes(reading.status)
    || segment.branchId !== branch.id || segment.ageStage !== "adult" || segment.age.stage !== "adult"
    || segment.age.label !== segment.ageLabel || !sameInstant(segment.age.personalStartInstant, segment.personalStartInstant)
    || !sameInstant(segment.startInstant, segment.personalStartInstant)
    || segment.age.segments.length !== 1 || segment.age.segments[0]!.stage !== "adult"
    || !sameInstant(segment.age.segments[0]!.startInstant, segment.startInstant)
    || !sameInstant(segment.age.segments[0]!.endExclusiveInstant, segment.endExclusiveInstant)
    || !reading.startInstant || !reading.endExclusiveInstant
    || !(Date.parse(segment.startInstant) >= Date.parse(reading.startInstant)
      && Date.parse(segment.endExclusiveInstant) <= Date.parse(reading.endExclusiveInstant)
      && Date.parse(segment.startInstant) < Date.parse(segment.endExclusiveInstant))
    || new Set(segment.items.map((item) => item.id)).size !== segment.items.length) return null;
  const candidates = segment.items.filter((item) => item.id === "career-settlement" || item.id === "wealth-settlement");
  const career = candidates.find((item) => item.id === "career-settlement"), wealth = candidates.find((item) => item.id === "wealth-settlement");
  // The same annual wealth role can moderate excess resource rather than
  // close a delivery. Keep its two domain readings without a false closeout.
  if (candidates.some((item) => item.origin.judgmentAxisIds.includes("pattern:resource-wealth"))) return null;
  if (candidates.length !== 2 || !career || !wealth
    || career.domain !== "career" || career.origin.sourceDomainId !== "career" || career.origin.ruleId !== "annual-event/career/settlement"
    || wealth.domain !== "wealth" || wealth.origin.sourceDomainId !== "wealth" || wealth.origin.ruleId !== "annual-event/wealth/settlement"
    || !sameContext(reading, segment, career, wealth)
    || !sameSet(career.origin.judgmentAxisIds, wealth.origin.judgmentAxisIds)
    || !sameSet(career.origin.relationFactIds, wealth.origin.relationFactIds)
    || !sameList(career.applicability, wealth.applicability) || !sameList(career.notApplicableWhen, wealth.notApplicableWhen)) return null;
  return [career, wealth];
}

/** A versioned, exact-whitelist composition. Original members remain complete;
 * this groups two readings of a candidate matter, not two proved life events. */
export function composeAnnualEvents(input: LocalAnnualEventReading): LocalAnnualEventComposition {
  const reading = structuredClone(input);
  const branches = reading.branches.map((branch): AnnualEventCompositionBranch => ({ ...branch,
    segments: branch.segments.map((segment): AnnualEventCompositionSegment => {
      const pair = settlementMembers(reading, branch, segment);
      const first = pair ? Math.min(...pair.map((item) => segment.items.indexOf(item))) : -1;
      const items = segment.items.flatMap((item, index): AnnualEventCompositionItem[] => {
        if (pair?.includes(item)) return index === first ? [{ kind: "settlement", id: "settlement-closeout",
          title: pair[0].title,
          summary: "完成确认与已约定的费用、回报或后续安排，是同一件事的两侧，可以一起对照；完成本身不等于回报已经兑现。",
          members: pair }] : [];
        return [{ kind: "single", id: item.id, members: [item] }];
      });
      return { ...segment, items };
    }) }));
  const only = branches.length === 1 && branches[0]!.segments.length === 1 ? branches[0]!.segments[0]! : null;
  return { ...reading, version: ANNUAL_EVENT_COMPOSITION_VERSION, sourceReadingVersion: reading.version,
    sourceVersions: [...new Set([ANNUAL_EVENT_COMPOSITION_VERSION, reading.version, ...reading.sourceVersions])], branches,
    summary: only?.items.some((item) => item.kind === "settlement")
      ? `本段先对照：${only.items.map((item) => item.kind === "settlement" ? item.title : item.members[0].title).join("；")}。`
      : reading.summary };
}
