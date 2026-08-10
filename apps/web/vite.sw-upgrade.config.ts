import path from "node:path";
import { defineConfig, mergeConfig, type Plugin } from "vite";
import baseConfig from "./vite.config";

const generation = process.env.HAKIMI_SW_UPGRADE_GENERATION;
const outputDirectory = process.env.HAKIMI_SW_UPGRADE_OUT_DIR;
const fault = process.env.HAKIMI_SW_UPGRADE_FAULT ?? "none";

if (!generation || !/^[a-z0-9-]+$/i.test(generation)) {
  throw new Error("HAKIMI_SW_UPGRADE_GENERATION 必须是安全的非空代际标识");
}
if (!outputDirectory || !path.isAbsolute(outputDirectory)) {
  throw new Error("HAKIMI_SW_UPGRADE_OUT_DIR 必须是绝对输出目录");
}
if (fault !== "none" && fault !== "research-route") {
  throw new Error(`未知的 SW 升级夹具故障模式：${fault}`);
}

/**
 * 只供真实双构建浏览器门使用。代际标记同时进入入口 bundle 与独立预缓存资源，
 * 让 A/B 拥有真实不同的 Vite 资源图和内容指纹；生产构建不加载此配置。
 */
function serviceWorkerGenerationFixturePlugin(): Plugin {
  return {
    name: "hakimi-sw-generation-fixture",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replaceAll("\\", "/").split("?", 1)[0];
      if (normalizedId.endsWith("/src/main.tsx")) {
        return {
          code: `${code}\nif (typeof document !== "undefined") document.documentElement.dataset.e2eSwGeneration = ${JSON.stringify(generation)};`,
          map: null
        };
      }
      if (fault === "research-route" && normalizedId.endsWith("/src/pages/research-query-page.tsx")) {
        const componentSignature = "export function ResearchQueryPage() {";
        if (!code.includes(componentSignature)) {
          throw new Error("研究路由夹具无法定位 ResearchQueryPage 组件入口");
        }
        return {
          code: code.replace(
            componentSignature,
            `${componentSignature}\n  throw new Error(${JSON.stringify(`synthetic ${generation} research route boot failure`)});`
          ),
          map: null
        };
      }
      return undefined;
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: `e2e-sw-generation-${generation}.txt`,
        source: `${generation}\n`
      });
    }
  };
}

export default mergeConfig(baseConfig, defineConfig({
  plugins: [serviceWorkerGenerationFixturePlugin()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true
  }
}));
