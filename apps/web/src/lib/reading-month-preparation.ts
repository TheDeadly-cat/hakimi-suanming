import type { PreparedKeyMonthYear } from "./key-month-event-source";

/** One immutable source generation. Two calculations at most, shared by reading and full export. */
export function createReadingMonthPreparation(years: readonly number[], prepare: (year: number) => Promise<PreparedKeyMonthYear>) {
  const allowed = new Set(years);
  const pending = new Map<number, Promise<PreparedKeyMonthYear>>();
  const prepared = new Map<number, PreparedKeyMonthYear>();
  const lanes: Promise<unknown>[] = [Promise.resolve(), Promise.resolve()];
  let cursor = 0;
  const read = (year: number): Promise<PreparedKeyMonthYear> => {
    if (!allowed.has(year)) return Promise.reject(new Error("所选年份不在这份报告的计算范围内。"));
    const found = pending.get(year);
    if (found) return found;
    const lane = cursor++ % lanes.length;
    const result = lanes[lane]!.then(() => prepare(year)).then(value => {
      if (value.year !== year) throw new Error("月份计算返回了其他年份，未替换当前年份。");
      prepared.set(year, value);
      return value;
    });
    pending.set(year, result);
    lanes[lane] = result.catch(() => undefined);
    void result.catch(() => { if (pending.get(year) === result) pending.delete(year); });
    return result;
  };
  return { read, all: () => Promise.all([...allowed].map(read)), ready: () => [...prepared.values()].sort((a, b) => a.year - b.year) };
}
