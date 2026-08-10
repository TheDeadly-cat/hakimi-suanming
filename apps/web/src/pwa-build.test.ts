import { describe, expect, it } from "vitest";
import { computeOfflineCacheVersion, type OfflineCacheVersionInput } from "../pwa-build";

function input(): OfflineCacheVersionInput {
  return {
    workerTemplate: "worker-v1",
    htmlDocument: "<html><head><title>v1</title></head><body></body></html>",
    bundle: {
      "assets/app-fixed-name.js": { type: "chunk", code: "console.log('v1')" }
    },
    publicAssets: {
      "manifest.webmanifest": "{\"name\":\"v1\"}",
      "icons/icon-192.png": new Uint8Array([1, 2, 3])
    }
  };
}

describe("PWA content cache version", () => {
  it("同一内容不受对象插入顺序影响", () => {
    const first = input();
    const reordered: OfflineCacheVersionInput = {
      workerTemplate: first.workerTemplate,
      htmlDocument: first.htmlDocument,
      bundle: Object.fromEntries(Object.entries(first.bundle).reverse()),
      publicAssets: Object.fromEntries(Object.entries(first.publicAssets).reverse())
    };
    expect(computeOfflineCacheVersion(first)).toBe(computeOfflineCacheVersion(reordered));
  });

  it.each([
    ["真实构建 HTML", (value: OfflineCacheVersionInput) => { value.htmlDocument = "<html><head><title>v2</title></head><body></body></html>"; }],
    ["固定文件名 JS", (value: OfflineCacheVersionInput) => { value.bundle["assets/app-fixed-name.js"] = { type: "chunk", code: "console.log('v2')" }; }],
    ["manifest", (value: OfflineCacheVersionInput) => { value.publicAssets["manifest.webmanifest"] = "{\"name\":\"v2\"}"; }],
    ["图标", (value: OfflineCacheVersionInput) => { value.publicAssets["icons/icon-192.png"] = new Uint8Array([1, 2, 4]); }],
    ["Service Worker", (value: OfflineCacheVersionInput) => { value.workerTemplate = "worker-v2"; }]
  ])("仅修改%s内容也会生成新版本", (_label, mutate) => {
    const before = input();
    const after = input();
    mutate(after);
    expect(Object.keys(after.bundle)).not.toContain("index.html");
    expect(computeOfflineCacheVersion(after)).not.toBe(computeOfflineCacheVersion(before));
  });
});
