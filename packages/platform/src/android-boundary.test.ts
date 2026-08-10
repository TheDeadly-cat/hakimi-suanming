import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceRoot = process.cwd();
const packagesRoot = join(workspaceRoot, "packages");

function productionTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...productionTypeScriptFiles(absolute));
    else if ((entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) && !entry.name.includes(".test.")) files.push(absolute);
  }
  return files;
}

describe("Android migration boundary", () => {
  it("核心计算、存储、备份与导出包不直接调用浏览器 DOM 文件接口", () => {
    const violations: string[] = [];
    for (const packageEntry of readdirSync(packagesRoot, { withFileTypes: true })) {
      if (!packageEntry.isDirectory() || packageEntry.name === "platform") continue;
      const sourceDirectory = join(packagesRoot, packageEntry.name, "src");
      for (const file of productionTypeScriptFiles(sourceDirectory)) {
        const source = readFileSync(file, "utf8");
        if (/\b(?:window|document|navigator)\s*\./.test(source) || /\bnew\s+Blob\b|\bcreateObjectURL\s*\(/.test(source)) {
          violations.push(file.replace(`${workspaceRoot}\\`, ""));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("Web 业务代码只通过平台端口选择、保存、分享和打印文件", () => {
    const webSourceRoot = join(workspaceRoot, "apps", "web", "src");
    const violations: string[] = [];
    const forbidden = [
      /\bURL\.createObjectURL\s*\(/,
      /\bdocument\.createElement\s*\(\s*["']a["']\s*\)/,
      /\bdocument\.createElement\s*\(\s*["']input["']\s*\)/,
      /\bnavigator\.(?:share|canShare)\b/,
      /\bwindow\.print\s*\(/,
      /\bdownload(?:Blob|Text)File\b/
    ];
    for (const file of productionTypeScriptFiles(webSourceRoot)) {
      const source = readFileSync(file, "utf8");
      if (forbidden.some((pattern) => pattern.test(source))) {
        violations.push(file.replace(`${workspaceRoot}\\`, ""));
      }
    }
    expect(violations).toEqual([]);
  });
});
