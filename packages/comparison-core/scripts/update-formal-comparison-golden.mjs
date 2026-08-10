import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] ?? "--check";
if (mode !== "--check" && mode !== "--write") {
  process.stderr.write("只支持 --check 或显式 --write；普通测试不会改写工程黄金样本。\n");
  process.exitCode = 2;
} else {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const workspaceRoot = path.resolve(packageRoot, "../..");
  const vitestEntry = path.join(workspaceRoot, "node_modules/vitest/vitest.mjs");
  const configPath = path.join(workspaceRoot, "apps/web/vitest.config.ts");
  const testPath = path.join(packageRoot, "src/formal-comparison-golden.test.ts");
  const result = spawnSync(
    process.execPath,
    [vitestEntry, "run", "--config", configPath, testPath],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        HAKIMI_FORMAL_COMPARISON_GOLDEN_MODE: mode === "--write" ? "write" : "check"
      }
    }
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
