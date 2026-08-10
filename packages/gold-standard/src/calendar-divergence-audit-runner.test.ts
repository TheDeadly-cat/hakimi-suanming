import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("连续历法窗口在线审计 runner 的离线失败关闭门", () => {
  it("拒绝缩短、重签和改写来源的 fixture，并重建 HKO 月首样本", () => {
    const scriptPath = path.join(
      process.cwd(),
      "packages",
      "gold-standard",
      "scripts",
      "audit-calendar-divergence-windows.mjs"
    );
    const result = spawnSync(process.execPath, [scriptPath, "--self-test"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      selfTestPassed: true,
      negativeCases: 3,
      hkoParserCases: 3
    });
  });
});
