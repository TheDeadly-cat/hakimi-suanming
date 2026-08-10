import { createIztro258RuleSnapshotDraft } from "../src/index.ts";

const snapshot = await createIztro258RuleSnapshotDraft();
process.stdout.write(JSON.stringify(snapshot));
