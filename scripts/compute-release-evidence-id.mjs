import path from "node:path";
import {
  computeEvidenceId,
  computeSourceTreeDigest,
  parseCli,
  readGitState,
  sha256File
} from "./release-evidence-lib.mjs";

const flags = parseCli(process.argv.slice(2));
const cwd = process.cwd();
const channel = String(flags.get("channel") ?? "default-v13");
const git = readGitState(cwd);
if (git.dirty && flags.get("allow-dirty") !== true) {
  throw new Error("Formal release evidence ID requires a clean Git source tree. Use --allow-dirty only for a non-release local snapshot.");
}
const evidenceId = computeEvidenceId({
  gitCommit: git.commit,
  sourceTreeDigest: await computeSourceTreeDigest(cwd),
  lockfileDigest: await sha256File(path.resolve(cwd, "package-lock.json")),
  channel
});
process.stdout.write(`${evidenceId}\n`);
