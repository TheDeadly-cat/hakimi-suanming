/** In-memory diagnostics only: no record/input identifiers, text, dates or error messages. */
export const READING_SAVE_TIMING_VERSION = "hakimi.reading-save-timing/1";
export const READING_SAVE_STAGES = ["preconditions", "month_preparation", "report_generation", "evidence_index",
  "encoding_compression", "repository_write", "post_save_validation", "page_refresh"] as const;
export type ReadingSaveStage = typeof READING_SAVE_STAGES[number];
export type ReadingSaveStatus = "running" | "succeeded" | "failed" | "cancelled";
export type ReadingSaveOverlapWork = "brief_render" | "explanation_render";
export type ReadingSaveCounts = Partial<Record<"plannedYears" | "readyYearsBefore" | "preparedYears" | "preparedMonths"
  | "readingCharacters" | "archiveCharacters" | "storedCharacters" | "recordsRead", number>>;
export interface ReadingSaveTimingSnapshot {
  version: typeof READING_SAVE_TIMING_VERSION;
  clock: "performance.now";
  sequence: number;
  status: ReadingSaveStatus;
  totalMs: number;
  unattributedMs: number;
  counts: ReadingSaveCounts;
  stages: { stage: ReadingSaveStage; status: "not_started" | ReadingSaveStatus; elapsedMs: number; spans: number }[];
  verification: "repository_readback_schema_and_exact_body";
  refresh: "react_commit_with_current_personal_context_and_explanation";
  overlappingRender: { withinStage: "encoding_compression"; briefMs: number; explanationMs: number;
    accounting: "already_in_stage_wall_time_do_not_add" };
}
export interface ReadingReportTiming {
  measure<T>(stage: "report_generation" | "evidence_index", task: () => T): T;
}

/** One exclusive span at a time. Awaited wall time includes scheduling and shared in-flight work;
 * parallel month calculations are measured around all(), never summed as CPU time. */
export function createReadingSaveTiming(sequence: number, now: () => number = () => performance.now()) {
  const started = now();
  let status: ReadingSaveStatus = "running", ended: number | null = null;
  let current: { stage: ReadingSaveStage; started: number } | null = null;
  const counts: ReadingSaveCounts = {};
  const overlappingRender = { briefMs: 0, explanationMs: 0 };
  const stages = READING_SAVE_STAGES.map(stage => ({ stage, status: "not_started" as "not_started" | ReadingSaveStatus, elapsedMs: 0, spans: 0 }));
  const end = (outcome: Exclude<ReadingSaveStatus, "running"> = "succeeded") => {
    if (!current) return;
    const item = stages.find(item => item.stage === current!.stage)!;
    item.elapsedMs += Math.max(0, now() - current.started);
    item.status = outcome;
    current = null;
  };
  const start = (stage: ReadingSaveStage) => {
    if (status !== "running") return;
    if (current) throw new Error("Save timing spans must not overlap.");
    const item = stages.find(item => item.stage === stage)!;
    item.status = "running"; item.spans += 1;
    current = { stage, started: now() };
  };
  const measure = <T>(stage: ReadingSaveStage, task: () => T): T => {
    start(stage);
    try { const value = task(); end(); return value; }
    catch (error) { end("failed"); throw error; }
  };
  const measureAsync = async <T>(stage: ReadingSaveStage, task: () => Promise<T>): Promise<T> => {
    start(stage);
    try { const value = await task(); end(); return value; }
    catch (error) { end("failed"); throw error; }
  };
  const finish = (outcome: Exclude<ReadingSaveStatus, "running">) => {
    if (status !== "running") return;
    end(outcome); status = outcome; ended = now();
  };
  return {
    start, end, measure, measureAsync, finish,
    measureOverlappingRender<T>(work: ReadingSaveOverlapWork, task: () => T): T {
      if (current?.stage !== "encoding_compression" || status !== "running") return task();
      const before = now();
      try { return task(); }
      finally { overlappingRender[work === "brief_render" ? "briefMs" : "explanationMs"] += Math.max(0, now() - before); }
    },
    count(values: ReadingSaveCounts) {
      // Explicit allowlist prevents caller-supplied text or identifiers from entering diagnostics.
      for (const key of ["plannedYears", "readyYearsBefore", "preparedYears", "preparedMonths", "readingCharacters",
        "archiveCharacters", "storedCharacters", "recordsRead"] as const) {
        const value = values[key];
        if (Number.isSafeInteger(value) && value! >= 0) counts[key] = value;
      }
    },
    snapshot(): ReadingSaveTimingSnapshot {
      const at = ended ?? now();
      const items = stages.map(item => ({ ...item, elapsedMs: item.elapsedMs + (current?.stage === item.stage ? Math.max(0, at - current.started) : 0) }));
      const totalMs = Math.max(0, at - started);
      return { version: READING_SAVE_TIMING_VERSION, clock: "performance.now", sequence, status, totalMs,
        unattributedMs: Math.max(0, totalMs - items.reduce((sum, item) => sum + item.elapsedMs, 0)), counts: { ...counts }, stages: items,
        verification: "repository_readback_schema_and_exact_body", refresh: "react_commit_with_current_personal_context_and_explanation",
        overlappingRender: { withinStage: "encoding_compression", ...overlappingRender, accounting: "already_in_stage_wall_time_do_not_add" } };
    }
  };
}
export type ReadingSaveTiming = ReturnType<typeof createReadingSaveTiming>;

export const READING_SAVE_TIMING_PREFIX = "[reading-save-timing]";
/** Explicit local diagnostics; caller gates this behind VITE_READING_SAVE_DIAGNOSTICS=1. */
export function publishReadingSaveTiming(timing: ReadingSaveTiming) {
  console.info(READING_SAVE_TIMING_PREFIX, JSON.stringify(timing.snapshot()));
}
