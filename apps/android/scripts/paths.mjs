import path from "node:path";
import { fileURLToPath } from "node:url";

export const androidRoot = fileURLToPath(new URL("..", import.meta.url));
export const workspaceRoot = path.resolve(androidRoot, "../..");
export const toolingRoot = path.join(androidRoot, "tooling");
export const nativeRoot = path.join(androidRoot, "native");
export const artifactsRoot = path.join(androidRoot, "artifacts");
export const webRoot = path.join(androidRoot, "www");
export const appId = "com.hakimi.bazi.internal";

export function toolchainPaths(env = process.env) {
  const root = env.HAKIMI_ANDROID_TOOLCHAIN ?? path.join(env.USERPROFILE ?? "", "HakimiAndroidToolchain");
  return {
    root,
    java: env.JAVA_HOME ?? path.join(root, "jdk-21.0.12.1+1"),
    sdk: env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT ?? path.join(root, "sdk"),
    gradleCache: path.join(root, "gradle-cache")
  };
}
