import path from "node:path";
import {
  assertStrictReleaseBrowserResultSummary,
  isReleaseBrowserReceiptId
} from "../apps/web/playwright.release-browser-result.ts";
import {
  canonicalJson,
  readStableRegularFileSnapshot,
  relativePathWithin,
} from "./release-evidence-lib.mjs";

function exactKeys(value, keys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

export async function verifyReleaseBrowserResultSummaryBinding({
  cwd,
  receiptsDirectory,
  receipt
}) {
  const required = isReleaseBrowserReceiptId(receipt.id);
  if (!required) {
    if (receipt.browserResultSummary !== null || receipt.browserResultSummaryError !== null) {
      throw new Error(`Non-browser receipt contains browser result data: ${receipt.id}`);
    }
    return null;
  }
  if (receipt.browserResultSummaryError !== null) {
    throw new Error(`Release browser result summary failed: ${receipt.id}`);
  }
  const binding = receipt.browserResultSummary;
  if (!exactKeys(binding, ["path", "sha256", "summary"])) {
    throw new Error(`Release browser result binding is malformed: ${receipt.id}`);
  }
  if (
    typeof binding.path !== "string"
    || typeof binding.sha256 !== "string"
    || !/^[a-f0-9]{64}$/u.test(binding.sha256)
  ) {
    throw new Error(`Release browser result path or digest is malformed: ${receipt.id}`);
  }

  const summaryPath = path.resolve(cwd, binding.path);
  relativePathWithin(receiptsDirectory, summaryPath, `Browser result ${receipt.id}`);
  if (
    binding.path !== relativePathWithin(cwd, summaryPath, `Browser result ${receipt.id}`)
  ) {
    throw new Error(`Release browser result path is not canonical: ${receipt.id}`);
  }
  const snapshot = await readStableRegularFileSnapshot(summaryPath, {
    containmentRoot: receiptsDirectory,
    label: `Browser result ${receipt.id}`
  });
  if (snapshot.sha256 !== binding.sha256) {
    throw new Error(`Release browser result digest mismatch: ${receipt.id}`);
  }
  const summary = JSON.parse(snapshot.bytes.toString("utf8"));
  if (canonicalJson(summary) !== canonicalJson(binding.summary)) {
    throw new Error(`Release browser result embedded summary mismatch: ${receipt.id}`);
  }
  assertStrictReleaseBrowserResultSummary(summary, receipt.id);
  return binding;
}
