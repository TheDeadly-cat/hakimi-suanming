import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  inspectBaziCurrentExpertReview,
  parseBaziExpertInspectionArguments
} from "./bazi-expert-inspection-cli-lib.mjs";
import { getBaziExpertProgressCliOutcome } from "./bazi-scoped-current-cli-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const CLI = path.join(ROOT, "scripts/inspect-bazi-current-expert-review.mjs");
const FORMAL = path.join(ROOT, "scripts/resolve-bazi-current-expert-review-packet.mjs");
const packageJson = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const workflow = await readFile(path.join(ROOT, ".github/workflows/quick-ci.yml"), "utf8");
function child(args, executable = CLI, overrides = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS; delete env.NODE_PATH;
  return spawnSync(process.execPath, [...(overrides.execArgv ?? []), executable, ...args], {
    cwd: os.tmpdir(), encoding: "utf8", windowsHide: true, timeout: 30_000,
    env: { ...env, ...overrides.env }
  });
}

test("structure verifies the real selected packet without counting opinions or granting admission", async () => {
  const result = await inspectBaziCurrentExpertReview(ROOT, parseBaziExpertInspectionArguments(["--structure"]));
  assert.equal(result.exitCode, 0);
  assert.equal(result.output.commandRole, "packet_structure");
  assert.equal(result.output.status, "structure_verified");
  assert.equal(result.output.resolution.currentAvailable, true);
  assert.equal(result.output.resolution.artifact.path, "content/bazi-strength-expert-review-packet.current.json");
  assert.equal("expertReviewProgress" in result.output.resolution, false);
  assert.equal(result.output.expertAdmissionAssessed, false);
  assert.equal(result.output.expertAdmissionAuthorized, false);
  assert(Object.values(result.output.resolution.authorityBoundary).every((value) => value === false));
  assert.throws(() => { result.output.resolution.authorityBoundary.releaseReady = true; }, TypeError);
});

test("progress successfully reports the supplied empty input and keeps qualified experts at zero", () => {
  const result = child(["--progress"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const report = JSON.parse(result.stdout);
  assert.equal(report.commandRole, "review_progress");
  assert.equal(report.status, "progress_reported");
  assert.equal(report.inputScope, "none_supplied");
  const progress = report.resolution.expertReviewProgress;
  assert.equal(progress.requiredIndependentExperts, 2);
  assert.equal(progress.receivedOriginalOpinions, 0);
  assert.equal(progress.qualifiedIndependentOpinions, 0);
  assert.equal(progress.status, "blocked");
  assert.equal(progress.expertReviewBundleComplete, false);
  assert.equal(report.expertAdmissionAuthorized, false);
});

test("structure CLI derives its workspace from the real entrypoint, not the caller cwd", () => {
  const result = child(["--structure"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, "structure_verified");
});

test("existing formal command and explicit admission alias remain qualification blocked", () => {
  assert.equal(packageJson.scripts["check:bazi-expert-review-packet"], "node scripts/resolve-bazi-current-expert-review-packet.mjs");
  assert.equal(packageJson.scripts["check:bazi-expert-admission"], packageJson.scripts["check:bazi-expert-review-packet"]);
  const result = child([], FORMAL);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "EXPERT_QUALIFICATION_RECEIPT_LOADER_UNAVAILABLE\n");
  const progress = JSON.parse(result.stdout);
  assert.equal(progress.expertReviewProgress.qualifiedIndependentOpinions, 0);
  assert.equal(progress.authorityBoundary.expertClaimsAuthorized, false);
  // Caller assertions cannot turn the unchanged formal stop line into a pass.
  assert.equal(getBaziExpertProgressCliOutcome({ currentAvailable: true, expertReviewProgress: {
    qualificationReceiptLoaderAvailable: true, qualifiedIndependentOpinions: 2, status: "qualified"
  } }).exitCode, 1);
});

test("the library refuses frozen lookalike requests before loading any workspace", async () => {
  const fake = Object.freeze({ role: "packet_structure", privateIntakePath: null });
  await assert.rejects(inspectBaziCurrentExpertReview("missing-workspace-must-not-be-read", fake), /ARGUMENTS_FORBIDDEN/u);
  await assert.rejects(inspectBaziCurrentExpertReview(ROOT, { qualified: true }), /ARGUMENTS_FORBIDDEN/u);
});

test("unknown operations, qualification flags and private input on structure are rejected", () => {
  for (const args of [[], ["--admit"], ["--structure", "--qualified"], ["--progress", "--qualified", "true"],
    ["--structure", "--private-intake", "secret.json"], ["--progress", "--private-intake", ""],
    ["--progress", "--private-intake", "--help"], ["--progress", "unexpected.json"]]) {
    assert.throws(() => parseBaziExpertInspectionArguments(args), /ARGUMENTS_FORBIDDEN/u);
    const result = child(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "ARGUMENTS_FORBIDDEN\n");
  }
});

test("visible preload environments and flags stop before a reader is loaded", () => {
  for (const overrides of [{ env: { NODE_OPTIONS: "--no-warnings" } }, { env: { NODE_PATH: "/synthetic/untrusted" } },
    { execArgv: ["--import", "data:text/javascript,void%200"] }]) {
    const result = child(["--structure"], CLI, overrides);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "PRELOAD_ENVIRONMENT_FORBIDDEN\n");
  }
});

test("a missing current workspace cannot produce successful inspection output", async () => {
  const empty = await mkdtemp(path.join(os.tmpdir(), "hb-expert-empty-"));
  await assert.rejects(inspectBaziCurrentExpertReview(empty, parseBaziExpertInspectionArguments(["--structure"])));
  await assert.rejects(inspectBaziCurrentExpertReview(empty, parseBaziExpertInspectionArguments(["--progress"])));
});

test("explicit empty private intake is read as provided input and never grants qualification", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "hb-expert-private-"));
  const request = path.join(privateRoot, "request.json");
  await writeFile(request, "[]\n", { flag: "wx" });
  const result = child(["--progress", "--private-intake", request]);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.inputScope, "explicit_private_intake_file");
  assert.equal(report.resolution.expertReviewProgress.qualifiedIndependentOpinions, 0);
  assert.equal(report.expertAdmissionAuthorized, false);
  assert.equal(result.stdout.includes(privateRoot), false);
});

test("malformed private requests expose only a safe error code", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "hb-expert-private-invalid-"));
  const request = path.join(privateRoot, "private-name-must-not-leak.json");
  await writeFile(request, '{"private-original-text-sentinel":', { flag: "wx" });
  const result = child(["--progress", "--private-intake", request]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^[A-Z][A-Z0-9_]*\n$/u);
  assert.equal(result.stderr.includes(privateRoot), false);
  assert.equal(result.stderr.includes("private-original-text-sentinel"), false);
});

function jobBlock(id) {
  const start = workflow.indexOf(`  ${id}:\n`);
  assert.notEqual(start, -1, id);
  const tail = workflow.slice(start);
  const next = tail.slice(1).search(/\n  [a-z][a-z0-9-]*:\n/u);
  return next < 0 ? tail : tail.slice(0, next + 1);
}
function runAggregate(id, states) {
  const block = jobBlock(id);
  const script = block.slice(block.indexOf("        run: |\n") + "        run: |\n".length)
    .split("\n").filter(Boolean).map((line) => line.slice(10)).join("\n");
  assert.match(script, /failures=0/u);
  const bash = process.platform === "win32" ? path.join(process.env.ProgramFiles ?? "C:\\Program Files", "Git/bin/bash.exe") : "bash";
  if (process.platform === "win32") assert(existsSync(bash), "Git Bash is required to execute the real CI aggregation contract");
  const env = { ...process.env };
  for (const [name, state] of Object.entries(states)) env[name.toUpperCase().replaceAll("-", "_")] = state;
  return spawnSync(bash, ["--noprofile", "--norc", "-c", script], { env, encoding: "utf8", windowsHide: true, timeout: 10_000 });
}
const engineeringJobs = ["ci-contracts", "node-release-evidence", "node-package-artifacts", "toolchain-and-boundaries",
  "history-checkpoint-governance", "current-index-governance", "bazi-current-semantics", "full-typecheck", "full-vitest",
  "default-v13-web-build", "artifact-manifest-verification"];

test("engineering aggregate can pass while the independent expert admission is blocked", () => {
  const states = Object.fromEntries(engineeringJobs.map((id) => [id, "success"]));
  states["bazi-expert-admission"] = "failure";
  const engineering = runAggregate("engineering-gate-aggregate", states);
  assert.equal(engineering.status, 0, engineering.stderr);
  assert.equal(jobBlock("engineering-gate-aggregate").includes("bazi-expert-admission"), false);
  states["engineering-gate-aggregate"] = "success";
  assert.equal(runAggregate("release-gate-aggregate", states).status, 1);
});

test("both aggregates reject every failure skip cancellation or missing result", () => {
  for (const id of ["engineering-gate-aggregate", "release-gate-aggregate"]) {
    const jobs = id === "engineering-gate-aggregate" ? engineeringJobs : [...engineeringJobs, "bazi-expert-admission", "engineering-gate-aggregate"];
    const states = Object.fromEntries(jobs.map((job) => [job, "success"]));
    assert.equal(runAggregate(id, states).status, 0);
    for (const job of jobs) for (const status of ["failure", "skipped", "cancelled", ""]) {
      assert.equal(runAggregate(id, { ...states, [job]: status }).status, 1, `${id} ${job} ${status}`);
    }
  }
});

test("formal release workflow and existing npm lifecycles retain expert admission", async () => {
  const release = await readFile(path.join(ROOT, ".github/workflows/release-evidence.yml"), "utf8");
  const gate = release.indexOf("run: npm run check:bazi-expert-admission");
  assert(gate > 0 && gate < release.indexOf("Compute source-bound evidence id"));
  assert.equal(release.split("run: npm run check:bazi-expert-admission").length, 2);
  assert(packageJson.scripts["check:current-boundaries"].includes("npm run check:bazi-expert-review-packet"));
  const engineering = jobBlock("bazi-current-semantics");
  assert(engineering.includes("npm run check:bazi-expert-packet-structure"));
  assert(engineering.includes("npm run report:bazi-expert-review-progress"));
  assert.equal(engineering.includes("run: npm run check:bazi-expert-review-packet"), false);
  assert.equal(engineering.includes("run: npm run check:bazi-expert-admission"), false);
  assert(jobBlock("bazi-expert-admission").includes("run: npm run check:bazi-expert-admission"));
});
