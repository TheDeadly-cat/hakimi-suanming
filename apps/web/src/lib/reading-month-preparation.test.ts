import { describe, expect, it, vi } from "vitest";
import type { PreparedKeyMonthYear } from "./key-month-event-source";
import { createReadingMonthPreparation } from "./reading-month-preparation";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
// Scheduling tests use an opaque result identity. Chart/source correctness is
// verified by key-month-event-source; this helper must pass that payload through.
const result = (year: number) => Object.freeze({ year, testIdentity: Symbol(String(year)) }) as unknown as PreparedKeyMonthYear;

describe("reading month preparation scheduling", () => {
  it("limits actual overlapping calculations to two while queued years continue as each lane completes", async () => {
    const years = [2026, 2027, 2028, 2029, 2030, 2031];
    const gates = new Map(years.map(year => [year, deferred<PreparedKeyMonthYear>()]));
    const started: number[] = []; let active = 0, peak = 0;
    const prepare = vi.fn(async (year: number) => {
      started.push(year); active += 1; peak = Math.max(peak, active);
      try { return await gates.get(year)!.promise; } finally { active -= 1; }
    });
    const pool = createReadingMonthPreparation(years, prepare), promises = new Map(years.map(year => [year, pool.read(year)]));
    await vi.waitFor(() => expect(started).toHaveLength(2));
    expect(active).toBe(2); expect(pool.ready()).toEqual([]);
    for (const year of [2027, 2026, 2029, 2028, 2031, 2030]) {
      await vi.waitFor(() => expect(started).toContain(year));
      gates.get(year)!.resolve(result(year)); await promises.get(year);
      expect(active).toBeLessThanOrEqual(2);
    }
    expect(peak).toBe(2); expect(active).toBe(0);
    expect(prepare).toHaveBeenCalledTimes(years.length);
    expect(pool.ready().map(item => item.year)).toEqual(years);
  });

  it("deduplicates the same year across direct reading, full preparation and repeated allowed inputs", async () => {
    const a = deferred<PreparedKeyMonthYear>(), b = deferred<PreparedKeyMonthYear>();
    const prepare = vi.fn((year: number) => year === 2028 ? a.promise : b.promise);
    const allowed = [2028, 2028, 2026], pool = createReadingMonthPreparation(allowed, prepare);
    const first = pool.read(2028), duplicate = pool.read(2028), all = pool.all();
    expect(duplicate).toBe(first);
    allowed.push(2039); // The generation's allowed set is captured, not a live UI array.
    await expect(pool.read(2039)).rejects.toThrow("计算范围");
    await vi.waitFor(() => expect(prepare).toHaveBeenCalledTimes(2));
    const payloadA = result(2028), payloadB = result(2026);
    a.resolve(payloadA); b.resolve(payloadB);
    expect(await first).toBe(payloadA); expect(await all).toEqual([payloadA, payloadB]);
    expect(pool.read(2028)).toBe(first);
    expect(await pool.all()).toEqual([payloadA, payloadB]); expect(prepare).toHaveBeenCalledTimes(2);
    const snapshot = pool.ready(); snapshot.pop();
    expect(pool.ready()).toEqual([payloadB, payloadA]);
  });

  it("surfaces a failure, keeps other successful years, and retries only on a later explicit request", async () => {
    const failure = new Error("月份来源暂不可读"); let attempts = 0;
    const prepare = vi.fn(async (year: number) => {
      if (year === 2026 && ++attempts === 1) throw failure;
      return result(year);
    });
    const pool = createReadingMonthPreparation([2026, 2027, 2028], prepare);
    const failed = pool.read(2026), good = pool.read(2027), queued = pool.read(2028);
    await expect(failed).rejects.toBe(failure); await Promise.all([good, queued]);
    expect(pool.ready().map(item => item.year)).toEqual([2027, 2028]);
    expect(prepare.mock.calls.filter(([year]) => year === 2026)).toHaveLength(1);
    const retry = pool.read(2026), sharedRetry = pool.read(2026);
    expect(retry).not.toBe(failed); expect(sharedRetry).toBe(retry);
    expect((await retry).year).toBe(2026);
    expect(prepare.mock.calls.filter(([year]) => year === 2026)).toHaveLength(2);
    expect(pool.ready().map(item => item.year)).toEqual([2026, 2027, 2028]);
  });

  it("rejects full preparation on a failed year without fabricating completeness, then reuses successes on explicit retry", async () => {
    let fail = true;
    const prepare = vi.fn(async (year: number) => { if (year === 2027 && fail) throw new Error("缺少同年来源"); return result(year); });
    const pool = createReadingMonthPreparation([2026, 2027], prepare);
    await expect(pool.all()).rejects.toThrow("缺少同年来源");
    expect(pool.ready().map(item => item.year)).toEqual([2026]);
    fail = false;
    expect((await pool.all()).map(item => item.year)).toEqual([2026, 2027]);
    expect(prepare.mock.calls.filter(([year]) => year === 2026)).toHaveLength(1);
    expect(prepare.mock.calls.filter(([year]) => year === 2027)).toHaveLength(2);
  });

  it("rejects out-of-range, fractional and nonfinite requested years before scheduling any calculation", async () => {
    const prepare = vi.fn(async (year: number) => result(year)), pool = createReadingMonthPreparation([2026, 2028], prepare);
    for (const year of [2025, 2027, 2029, 2026.5, NaN, Infinity, -Infinity])
      await expect(pool.read(year)).rejects.toThrow("所选年份不在这份报告的计算范围内");
    expect(prepare).not.toHaveBeenCalled(); expect(pool.ready()).toEqual([]);
    expect((await pool.read(2026)).year).toBe(2026); expect(prepare).toHaveBeenCalledTimes(1);
  });

  it("rejects a response for another year without caching it under either year and allows explicit correction", async () => {
    const wrong = result(2030), correct = result(2026), prepare = vi.fn().mockResolvedValueOnce(wrong).mockResolvedValueOnce(correct);
    const pool = createReadingMonthPreparation([2026, 2030], prepare), first = pool.read(2026);
    await expect(first).rejects.toThrow("月份计算返回了其他年份，未替换当前年份");
    expect(pool.ready()).toEqual([]); expect(prepare).toHaveBeenCalledTimes(1);
    expect(await pool.read(2026)).toBe(correct); expect(pool.ready()).toEqual([correct]);
    expect(prepare.mock.calls.map(([year]) => year)).toEqual([2026, 2026]);
  });

  it("handles an empty report range without calling the producer", async () => {
    const prepare = vi.fn(async (year: number) => result(year)), pool = createReadingMonthPreparation([], prepare);
    expect(await pool.all()).toEqual([]); expect(pool.ready()).toEqual([]);
    await expect(pool.read(2026)).rejects.toThrow("计算范围"); expect(prepare).not.toHaveBeenCalled();
  });
});
