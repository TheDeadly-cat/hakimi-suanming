import { describe, expect, it } from "vitest";
import {
  EXPERT_MODE_KEY,
  readExpertMode,
  writeExpertMode
} from "./expert-mode";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    values
  };
}

describe("expert mode preference", () => {
  it("默认关闭，写入后开启，写 false 时清除", () => {
    const storage = memoryStorage();
    expect(readExpertMode(storage)).toBe(false);

    writeExpertMode(storage, true);
    expect(storage.values.get(EXPERT_MODE_KEY)).toBe("1");
    expect(readExpertMode(storage)).toBe(true);

    writeExpertMode(storage, false);
    expect(storage.values.has(EXPERT_MODE_KEY)).toBe(false);
    expect(readExpertMode(storage)).toBe(false);
  });

  it("拒绝损坏值，不把任意字符串当作开启", () => {
    const storage = memoryStorage();
    storage.setItem(EXPERT_MODE_KEY, "yes");
    expect(readExpertMode(storage)).toBe(false);
  });
});
