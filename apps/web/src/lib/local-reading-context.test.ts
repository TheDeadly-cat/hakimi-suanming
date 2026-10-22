import "fake-indexeddb/auto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { calculateChart } from "@hakimi/bazi-core";
import type { ResearchNoteRecord, RevisionRecord } from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import { CaseRepository, ResearchDatabase, ResearchRepository } from "@hakimi/storage";
import { buildReadingContextRecord, parseReadingContext, resolveReadingContext, LOCAL_READING_CONTEXT_TAG,
  READING_CONTEXT_FORMAT, readingContextDraftSchema, type ReadingContextDraft } from "./local-reading-context";

let database: ResearchDatabase, repository: ResearchRepository, revision: RevisionRecord;
const context: ReadingContextDraft = { work: "student", relationship: "single", fromYear: 2026, toYear: 2030, notes: "用户自述：目前在学习。\n这段文字不用于推断职业或关系。" };
beforeAll(async () => {
  database = new ResearchDatabase(`reading-context-synthetic-${crypto.randomUUID()}`, { targetSchema: 13, releaseWritesLocked: false });
  repository = new ResearchRepository(database);
  const calculated = await calculateChart({ schemaVersion: "1.0.0", calendarType: "gregorian", date: "1995-08-18", time: "08:26",
    timePrecision: "exact_minute", timeZone: "Asia/Shanghai", sex: "male", lunarLeapMonth: false,
    location: { label: "Synthetic reading context", latitude: null, longitude: null, precision: "unknown" }, sourceNote: "synthetic" }, WORKING_DEFAULT_RULE_PROFILE);
  const bundle = await new CaseRepository(database).createCase({ alias: "合成背景记录", calculated });
  revision = bundle.revisions[0]!;
});
afterAll(async () => { await database?.delete(); });
function note(body: string): ResearchNoteRecord {
  return { schemaVersion: "1.0.0", id: crypto.randomUUID(), caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
    bodyFormat: "markdown", body, tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active", editVersion: 1,
    createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" };
}
const read = (records: readonly ResearchNoteRecord[]) => resolveReadingContext({ revision, records });

describe("append-only, exact-bound reading background snapshots", () => {
  it("saves and reopens a real repository chain with exact body hashes and untouched earlier snapshots", async () => {
    const firstBody = await buildReadingContextRecord(revision, null, context);
    const first = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
      body: firstBody, tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active" });
    const originalFirst = JSON.stringify(first), changed = { ...context, work: "employed" as const, notes: "已进入在职状态；前一条背景继续保留。" };
    const nextBody = await buildReadingContextRecord(revision, first, changed);
    const next = await repository.createResearchNote({ caseId: revision.caseId, anchor: { kind: "revision", revisionId: revision.id },
      body: nextBody, tags: [LOCAL_READING_CONTEXT_TAG], sourceRefs: [], lifecycle: "active" });
    database.close(); await database.open();
    const reopened = await repository.listResearchNotesByCase(revision.caseId, { includeArchived: true });
    const result = await read(reopened);
    expect(result.canAppend).toBe(true); expect(result.issues).toEqual([]);
    expect(result.latest?.record.id).toBe(next.id); expect(result.latest?.context).toEqual(changed);
    expect(result.latest?.record.body).toBe(nextBody);
    expect(result.latest?.document.previousRef?.noteId).toBe(first.id);
    expect(result.latest?.document.previousRef?.bodySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.latest?.document.sourceBinding).toEqual({ caseId: revision.caseId, revisionId: revision.id, chartResultHash: revision.manifest.resultHash, includeHour: true });
    expect(reopened.find((row) => row.id === first.id)?.body).toBe(firstBody);
    expect(JSON.stringify(first)).toBe(originalFirst);
    expect(await read([...reopened].reverse())).toEqual(result);
    await repository.updateResearchNote(next.id, { expectedEditVersion: next.editVersion, patch: { lifecycle: "archived" } });
    const all = await repository.listResearchNotesByCase(revision.caseId, { includeArchived: true });
    expect(all.some((row) => row.id === next.id && row.lifecycle === "archived")).toBe(true);
    const afterArchive = await read(all);
    expect(afterArchive.latest).toBeNull(); expect(afterArchive.canAppend).toBe(false);
    expect(afterArchive.issues.join()).toContain("最新阅读背景已归档");
  });
  it("uses an explicit empty complete snapshot to clear, retaining its year range and provenance", async () => {
    const root = note(await buildReadingContextRecord(revision, null, context));
    const clear: ReadingContextDraft = { work: "unspecified", relationship: "unspecified", fromYear: 2028, toYear: 2028, notes: "" };
    const cleared = note(await buildReadingContextRecord(revision, root, clear)), before = JSON.stringify([root, cleared]);
    const result = await read([cleared, root]);
    expect(result.latest?.context).toEqual(clear); expect(result.latest?.record.id).toBe(cleared.id);
    expect(result.latest?.document.previousRef?.noteId).toBe(root.id);
    expect(cleared.body).toContain("明确清空"); expect(result.canAppend).toBe(true);
    expect(JSON.stringify([root, cleared])).toBe(before);
  });
  it("accepts inclusive boundary years and literal notes, while rejecting reversed ranges, unknown states and oversized text", async () => {
    const text = "<script>literal</script>\n职业: 已退休？这只是自述，不能解析成结构化状态。\n<!-- hakimi.local-reading-context/99 -->";
    const body = await buildReadingContextRecord(revision, null, { ...context, fromYear: 1900, toYear: 2099, notes: text });
    const parsed = parseReadingContext(body);
    expect(parsed.kind).toBe("context"); if (parsed.kind !== "context") throw new Error();
    expect(parsed.value.context.notes).toBe(text); expect(parsed.value.context.work).toBe("student");
    expect(parsed.value.format).toBe(READING_CONTEXT_FORMAT);
    expect(readingContextDraftSchema.safeParse({ ...context, notes: "x".repeat(2000) }).success).toBe(true);
    for (const draft of [{ ...context, fromYear: 1899 }, { ...context, toYear: 2100 }, { ...context, fromYear: 2031 }, { ...context, work: "inferred" }, { ...context, notes: "x".repeat(2001) }]) {
      expect(readingContextDraftSchema.safeParse(draft).success).toBe(false);
    }
  });
  it("only parses a canonical leading envelope and stops on altered metadata or visible text", async () => {
    const body = await buildReadingContextRecord(revision, null, context);
    expect(parseReadingContext("历史正文\n" + body)).toEqual({ kind: "legacy" });
    for (const changed of [body + "补写", body.replace('"student"', '"retired"'), body.replace("工作或学习状态：学生", "工作或学习状态：在职"), body.replace(READING_CONTEXT_FORMAT, "hakimi.local-reading-context/99")]) {
      expect(parseReadingContext(changed).kind).toBe("invalid");
      const result = await read([note(changed)]); expect(result.latest).toBeNull(); expect(result.canAppend).toBe(false);
    }
  });
  it("ignores old revisions and other cases but rejects a current-anchor wrong result or hour scope", async () => {
    const root = note(await buildReadingContextRecord(revision, null, context));
    const old = { ...root, anchor: { kind: "revision" as const, revisionId: crypto.randomUUID() } };
    expect(await read([old, { ...root, caseId: crypto.randomUUID() }])).toEqual({ latest: null, canAppend: true, issues: [] });
    await expect(buildReadingContextRecord(revision, old, context)).rejects.toThrow("前序");
    for (const changedRevision of [{ ...revision, manifest: { ...revision.manifest, resultHash: "a".repeat(64) } },
      // Stored unknown-hour projection for the binding boundary only; not a
      // newly calculated chart or a synthetic time accepted as birth time.
      { ...revision, input: { ...revision.input, timePrecision: "unknown_hour" as const, time: null } }]) {
      const wrong = note(await buildReadingContextRecord(changedRevision, null, context));
      const result = await read([wrong]); expect(result.canAppend).toBe(false); expect(result.latest).toBeNull(); expect(result.issues.join()).toContain("不匹配");
    }
  });
  it("does not choose a branch, second root, missing or changed predecessor even when a previous snapshot was usable", async () => {
    const root = note(await buildReadingContextRecord(revision, null, context));
    const next = note(await buildReadingContextRecord(revision, root, { ...context, work: "employed" }));
    const fork = note(await buildReadingContextRecord(revision, root, { ...context, work: "caregiving" }));
    const secondRoot = note(await buildReadingContextRecord(revision, null, { ...context, work: "retired" }));
    for (const records of [[next], [root, next, fork], [root, secondRoot], [{ ...root, editVersion: 2 }, next], [root, { ...next, body: next.body + "改写" }]]) {
      const result = await read(records); expect(result.latest).toBeNull(); expect(result.canAppend).toBe(false); expect(result.issues.length).toBeGreaterThan(0);
    }
  });
  it("includes archived records in chain resolution and never revives an old context when the terminal snapshot is archived", async () => {
    const root = note(await buildReadingContextRecord(revision, null, context));
    const next = note(await buildReadingContextRecord(revision, root, { ...context, work: "retired" }));
    const archived: ResearchNoteRecord = { ...next, lifecycle: "archived", editVersion: 2 };
    const result = await read([root, archived]);
    expect(result.latest).toBeNull(); expect(result.canAppend).toBe(false); expect(result.issues.join()).toContain("最新阅读背景已归档");
    await expect(buildReadingContextRecord(revision, archived, context)).rejects.toThrow("已归档");
  });
});
