import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeStaticModuleDependencies,
  verifyRequiredLfCheckoutPolicySource,
  verifyRegistryBindingSource
} from "./verify-historical-natal-source-lock.mjs";

test("collects static import and export-from declarations through the TypeScript AST", () => {
  const dependencies = analyzeStaticModuleDependencies(`
    import { value } from "./imported";
    export { other } from "./re-exported";
    void value;
  `, "static-dependencies.ts");
  assert.deepEqual(dependencies, ["./imported", "./re-exported"]);
});

test("rejects comment-separated dynamic import calls", () => {
  assert.throws(
    () => analyzeStaticModuleDependencies('const loaded = import/* comment */("./index");', "dynamic-import.ts"),
    /must not use dynamic import/u
  );
});

test("rejects comment-separated require calls", () => {
  assert.throws(
    () => analyzeStaticModuleDependencies('const loaded = require/* comment */("./index");', "require-call.ts"),
    /must not use require/u
  );
});

test("comment decoys cannot satisfy the registry binding gate", () => {
  const decoy = `
    // import { HISTORICAL_NATAL_ENGINE_0_4_0, calculateHistoricalNatalChart040 }
    //   from "./historical-natal-chart-executor-0.4.0";
    // executorId: "hakimi-bazi-core:natal-chart-executor:0.4.0",
    // engine: HISTORICAL_NATAL_ENGINE_0_4_0,
    // calculateChart: calculateHistoricalNatalChart040
    export const HISTORICAL_NATAL_EXECUTOR_REGISTRY = Object.freeze([]);
  `;
  assert.throws(
    () => verifyRegistryBindingSource(decoy, "comment-decoy-index.ts"),
    /missing the real named imports/u
  );
});

test("keeps every legacy LF rule exact while allowing independent gate rules", () => {
  const required = ["packages/locked.ts", "packages/gate.mjs"];
  const source = [
    "/packages/locked.ts text eol=lf",
    "/packages/gate.mjs text eol=lf",
    "/packages/new-sidecar.json text eol=lf",
    ""
  ].join("\n");
  assert.deepEqual(
    verifyRequiredLfCheckoutPolicySource(source, required),
    [
      "/packages/locked.ts text eol=lf",
      "/packages/gate.mjs text eol=lf",
      "/packages/new-sidecar.json text eol=lf"
    ]
  );
});

test("rejects duplicate or weakened legacy LF rules", () => {
  assert.throws(
    () => verifyRequiredLfCheckoutPolicySource([
      "/packages/locked.ts text eol=lf",
      "/packages/locked.ts text eol=lf",
      ""
    ].join("\n"), ["packages/locked.ts"]),
    /duplicate policy entries/u
  );
  assert.throws(
    () => verifyRequiredLfCheckoutPolicySource(
      "/packages/locked.ts text=auto eol=lf\n",
      ["packages/locked.ts"]
    ),
    /LF policy expected/u
  );
  assert.throws(
    () => verifyRequiredLfCheckoutPolicySource([
      "/packages/locked.ts text eol=lf",
      "/PACKAGES/LOCKED.TS text eol=lf",
      ""
    ].join("\n"), ["packages/locked.ts"]),
    /case-fold duplicate policy entries/u
  );
});
