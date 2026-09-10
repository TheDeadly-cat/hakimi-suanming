import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  bindReleaseIdentityAttributes,
  computeOfflineCacheVersion,
  type OfflineCacheVersionInput
} from "../pwa-build";
import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR
} from "../release-protocol";

const indexTemplate = readFileSync(path.resolve(import.meta.dirname, "../index.html"), "utf8");
const identityAttributes = ["data-release-contract", "data-target-schema", "data-migration-id"] as const;

describe("built root release identity", () => {
  it("真实模板的三个 v13 属性与默认构建字节保持不变", () => {
    const root = indexTemplate.match(/<html[\s\S]*?>/u)?.[0];
    expect(root).toContain('data-release-contract="legacy-v13"');
    expect(root).toContain('data-target-schema="13"');
    expect(root).toContain('data-migration-id="null"');
    expect(bindReleaseIdentityAttributes(indexTemplate, BRIDGE_RELEASE_DATABASE_DESCRIPTOR)).toBe(indexTemplate);
  });

  it("真实模板绑定 Schema 16 身份且保留其余全部字节", () => {
    const bound = bindReleaseIdentityAttributes(indexTemplate, PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR);
    expect(bound).toBe(indexTemplate
      .replace('data-release-contract="legacy-v13"', 'data-release-contract="research-v16-mutation-state"')
      .replace('data-target-schema="13"', 'data-target-schema="16"')
      .replace('data-migration-id="null"', 'data-migration-id="v13-to-v16-mutation-state-v1"'));
  });

  it.each(identityAttributes)("拒绝缺失根属性 %s", (attribute) => {
    const malformed = indexTemplate.replace(new RegExp(`\\s+${attribute}="[^"]*"`, "u"), "");
    expect(() => bindReleaseIdentityAttributes(malformed, BRIDGE_RELEASE_DATABASE_DESCRIPTOR)).toThrow("Missing root release identity attribute");
  });

  it.each(identityAttributes)("拒绝重复根属性 %s，包括大小写变体", (attribute) => {
    const malformed = indexTemplate.replace("<html", `<html ${attribute.toUpperCase()}="duplicate"`);
    expect(() => bindReleaseIdentityAttributes(malformed, BRIDGE_RELEASE_DATABASE_DESCRIPTOR)).toThrow("Duplicate root release identity attribute");
  });

  it.each([
    indexTemplate.replace(/<html[\s\S]*?>/u, "<div>"),
    indexTemplate.replace("</html>", "</html><html></html>"),
    indexTemplate.replace('data-target-schema="13"', "data-target-schema=13"),
    indexTemplate.replace('data-target-schema="13"', 'data-target-schema="13" =broken')
  ])("拒绝无根、重复根及不规范必要属性", (malformed) => {
    expect(() => bindReleaseIdentityAttributes(malformed, BRIDGE_RELEASE_DATABASE_DESCRIPTOR)).toThrow();
  });

  it("保留单双引号并转义属性值，不把引号内的 > 当作根标签结束", () => {
    const quoted = indexTemplate
      .replace('lang="zh-CN"', 'lang="zh-CN" title="a > b"')
      .replace('data-release-contract="legacy-v13"', "data-release-contract='legacy-v13'");
    const bound = bindReleaseIdentityAttributes(quoted, {
      ...PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
      dbGeneration: "quoted'\"<&>",
      migrationId: "migration'\"<&>"
    });
    expect(bound).toContain("data-release-contract='quoted&#39;&quot;&lt;&amp;&gt;'");
    expect(bound).toContain('data-migration-id="migration&#39;&quot;&lt;&amp;&gt;"');
    expect(bound).toContain('title="a > b"');
  });

  it("仅绑定真实 HTML 身份也进入缓存指纹", () => {
    const before = input();
    before.htmlDocument = bindReleaseIdentityAttributes(indexTemplate, BRIDGE_RELEASE_DATABASE_DESCRIPTOR);
    const after = { ...before, htmlDocument: bindReleaseIdentityAttributes(indexTemplate, PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR) };
    expect(computeOfflineCacheVersion(after)).not.toBe(computeOfflineCacheVersion(before));
  });
});

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
