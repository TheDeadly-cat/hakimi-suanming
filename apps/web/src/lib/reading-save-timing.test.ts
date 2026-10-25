import { describe, expect, it, vi } from "vitest";
import { createReadingMonthPreparation } from "./reading-month-preparation";
import type { PreparedKeyMonthYear } from "./key-month-event-source";
import { createReadingSaveTiming, publishReadingSaveTiming, READING_SAVE_TIMING_PREFIX } from "./reading-save-timing";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("private complete-save phase timing", () => {
  it("attributes disjoint report work separately from its index and preserves unmeasured overhead", () => {
    let ms = 100; const timing = createReadingSaveTiming(1, () => ms);
    ms += 2;
    const result = timing.measure("report_generation", () => { ms += 8; return { text: "private output" }; });
    timing.measure("evidence_index", () => { ms += 5; });
    timing.measure("report_generation", () => { ms += 3; });
    ms += 1; timing.finish("succeeded");
    const snapshot = timing.snapshot();
    expect(result).toEqual({ text: "private output" });
    expect(snapshot).toMatchObject({ totalMs: 19, unattributedMs: 3, status: "succeeded", clock: "performance.now" });
    expect(snapshot.stages.find(item => item.stage === "report_generation")).toMatchObject({ elapsedMs: 11, spans: 2 });
    expect(snapshot.stages.find(item => item.stage === "evidence_index")).toMatchObject({ elapsedMs: 5, spans: 1 });
    expect(JSON.stringify(snapshot)).not.toContain("private output");
  });

  it("measures the complete shared month wait as wall time, never sums parallel work, and distinguishes repeat readiness", async () => {
    let ms = 0; const a = deferred<PreparedKeyMonthYear>(), b = deferred<PreparedKeyMonthYear>();
    const prepare = vi.fn((year: number) => year === 2026 ? a.promise : b.promise);
    const months = createReadingMonthPreparation([2026, 2027], prepare);
    const first = createReadingSaveTiming(1, () => ms);
    first.count({ plannedYears: 2, readyYearsBefore: months.ready().length });
    const pending = first.measureAsync("month_preparation", () => months.all());
    await Promise.resolve(); ms = 7; a.resolve({ year: 2026 } as PreparedKeyMonthYear);
    await Promise.resolve(); expect(first.snapshot().status).toBe("running");
    ms = 12; b.resolve({ year: 2027 } as PreparedKeyMonthYear); await pending; first.finish("succeeded");
    expect(first.snapshot().stages.find(item => item.stage === "month_preparation")?.elapsedMs).toBe(12);
    const second = createReadingSaveTiming(2, () => ms);
    second.count({ plannedYears: 2, readyYearsBefore: months.ready().length });
    await second.measureAsync("month_preparation", () => months.all()); second.finish("succeeded");
    expect(second.snapshot()).toMatchObject({ sequence: 2, counts: { readyYearsBefore: 2 }, totalMs: 0 });
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it("retains awaited failure and unreached stages without retaining exception text", async () => {
    let ms = 0; const timing = createReadingSaveTiming(1, () => ms), gate = deferred<never>();
    const pending = timing.measureAsync("repository_write", () => gate.promise);
    ms = 9; gate.reject(new Error("private case id and report body"));
    await expect(pending).rejects.toThrow("private case"); timing.finish("failed");
    expect(timing.snapshot()).toMatchObject({ status: "failed", totalMs: 9 });
    expect(timing.snapshot().stages.find(item => item.stage === "repository_write")).toMatchObject({ status: "failed", elapsedMs: 9 });
    expect(timing.snapshot().stages.find(item => item.stage === "page_refresh")?.status).toBe("not_started");
    expect(JSON.stringify(timing.snapshot())).not.toContain("private");
  });

  it("keeps refresh pending beyond repository completion until the actual derived React commit is observed", () => {
    let ms = 0; const timing = createReadingSaveTiming(1, () => ms);
    timing.measure("repository_write", () => { ms = 5; });
    timing.measure("post_save_validation", () => { ms = 8; });
    timing.start("page_refresh"); ms = 19;
    expect(timing.snapshot()).toMatchObject({ status: "running", totalMs: 19 });
    timing.finish("succeeded"); ms = 1000;
    expect(timing.snapshot().totalMs).toBe(19);
    expect(timing.snapshot().stages.find(item => item.stage === "page_refresh")?.elapsedMs).toBe(11);
    timing.finish("failed"); expect(timing.snapshot().status).toBe("succeeded");
  });

  it("preserves cancellation and rejects overlapping spans rather than double-counting elapsed time", () => {
    let ms = 0; const timing = createReadingSaveTiming(1, () => ms);
    timing.start("month_preparation"); ms = 4;
    expect(() => timing.start("report_generation")).toThrow("overlap");
    timing.finish("cancelled"); ms = 9;
    expect(timing.snapshot()).toMatchObject({ status: "cancelled", totalMs: 4 });
    expect(timing.snapshot().stages.find(item => item.stage === "month_preparation")?.status).toBe("cancelled");
  });

  it("reports synchronous render work inside the encoding wait without adding it twice to elapsed time", async () => {
    let ms = 0; const timing = createReadingSaveTiming(1, () => ms), gate = deferred<void>();
    timing.measureOverlappingRender("brief_render", () => { ms += 3; });
    const pending = timing.measureAsync("encoding_compression", () => gate.promise);
    ms += 5;
    const value = timing.measureOverlappingRender("brief_render", () => { ms += 7; return "private rendered report"; });
    timing.measureOverlappingRender("explanation_render", () => { ms += 2; });
    ms += 4; gate.resolve(); await pending; timing.finish("succeeded");
    expect(value).toBe("private rendered report");
    expect(timing.snapshot()).toMatchObject({ totalMs: 21, unattributedMs: 3,
      overlappingRender: { withinStage: "encoding_compression", briefMs: 7, explanationMs: 2,
        accounting: "already_in_stage_wall_time_do_not_add" } });
    expect(timing.snapshot().stages.find(item => item.stage === "encoding_compression")?.elapsedMs).toBe(18);
    expect(JSON.stringify(timing.snapshot())).not.toContain("private rendered report");
  });

  it("exports only allowed numeric counts and snapshot copies, with no arbitrary diagnostic payload", () => {
    const timing = createReadingSaveTiming(1, () => 0);
    timing.count({ plannedYears: 10, storedCharacters: -1, recordsRead: NaN, caseId: "private", body: "private" } as never);
    const snapshot = timing.snapshot(); snapshot.counts.plannedYears = 900;
    expect(timing.snapshot().counts).toEqual({ plannedYears: 10 });
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      timing.finish("failed"); publishReadingSaveTiming(timing);
      expect(log).toHaveBeenCalledWith(READING_SAVE_TIMING_PREFIX, JSON.stringify(timing.snapshot()));
      expect(log.mock.calls[0]![1]).not.toMatch(/caseId|private|"body"/);
    } finally { log.mockRestore(); }
  });
});
