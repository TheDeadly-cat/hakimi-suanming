import { describe, expect, it, vi } from "vitest";
import { createReadingSourceCache } from "./local-reading-source-cache";

describe("single verified reading input cache", () => {
  it("reuses only a complete equal producer input and never accumulates an older input", () => {
    const cache = createReadingSourceCache<{ text: string }>();
    const build = vi.fn(() => ({ text: "original" }));
    const input = { version: "producer/1", revision: { id: "a", hash: "h", includeHour: true }, context: { ref: "one", body: "original context" } };
    const value = cache.read(input, build);
    expect(cache.read(structuredClone(input), build)).toBe(value);
    expect(build).toHaveBeenCalledTimes(1);
    for (const changed of [{ ...input, version: "producer/2" }, { ...input, revision: { ...input.revision, includeHour: false } },
      { ...input, context: { ...input.context, body: "changed context under same ref" } }]) cache.read(changed, build);
    expect(build).toHaveBeenCalledTimes(4);
    cache.read(input, build);
    expect(build).toHaveBeenCalledTimes(5);
  });
  it("detects mutated input and cached output, and drops the previous value after failed rebuild", () => {
    const cache = createReadingSourceCache<{ text: string }>();
    const input = { values: ["original"] }, build = vi.fn(() => ({ text: input.values[0]! }));
    const original = cache.read(input, build);
    original.text = "modified cached result";
    expect(cache.read(input, build)).toEqual({ text: "original" });
    input.values[0] = "changed source";
    expect(cache.read(input, build)).toEqual({ text: "changed source" });
    expect(build).toHaveBeenCalledTimes(3);
    expect(() => cache.read({ values: ["invalid"] }, () => { throw new Error("source rejected"); })).toThrow("source rejected");
    cache.read(input, build);
    expect(build).toHaveBeenCalledTimes(4);
  });
});
