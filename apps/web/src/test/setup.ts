import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

globalThis.__HAKIMI_RESEARCH_DATABASE_RUNTIME__ = {
  databaseName: "hakimi-vitest-explicit-runtime-fixture",
  targetSchema: 14,
  releaseWritesLocked: false
};

afterEach(() => cleanup());
