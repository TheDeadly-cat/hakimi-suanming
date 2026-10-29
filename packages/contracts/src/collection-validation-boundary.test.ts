import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  LOCAL_APP_SETTINGS_ID,
  LOCAL_APP_SETTINGS_RECORD_VERSION,
  LOCAL_RESEARCHER_PROFILE_ID,
  LOCAL_RESEARCHER_PROFILE_RECORD_VERSION,
  SCHEMA_VERSION,
  caseRecordSchema,
  caseTagsSchema,
  fullBackupPayloadSchema,
  birthInputSchema,
  ruleProfileSchema,
  pillarFactSchema,
  researchNoteRecordSchema,
  storedEventRecordSchema,
  localResearcherProfileRecordSchema,
  localAttachmentRecordSchema,
  knowledgeDocumentRecordSchema,
  comparisonCellSchema,
  comparisonRowSchema,
  installedRulePackRecordSchema,
  utf16MinLength,
  utf16MaxLength,
  utf16Length
} from "./index";

function observedElements(length: number) {
  let reads = 0;
  const input: unknown[] = Array.from({ length });
  for (let index = 0; index < length; index += 1) {
    Object.defineProperty(input, index, {
      enumerable: true,
      get: () => {
        reads += 1;
        return null;
      }
    });
  }
  return { input, readCount: () => reads };
}

describe("bounded collection validation before element traversal", () => {
  it("rejects oversized case tags before reading malformed elements", () => {
    const observed = observedElements(21);
    const result = caseTagsSchema.safeParse(observed.input);
    expect(result.success).toBe(false);
    expect(observed.readCount()).toBe(0);
    if (result.success) throw new Error("Oversized tags were accepted");
    expect(result.error.issues).toEqual([
      expect.objectContaining({ code: "too_big", origin: "array", maximum: 20, path: [] })
    ]);
  });

  it.each(["researcherProfiles", "appSettings"] as const)(
    "rejects oversized backup %s before reading malformed records",
    (partition) => {
      const observed = observedElements(2);
      const result = fullBackupPayloadSchema.shape[partition].safeParse(observed.input);
      expect(result.success).toBe(false);
      expect(observed.readCount()).toBe(0);
      if (result.success) throw new Error("Oversized configuration partition was accepted");
      expect(result.error.issues).toEqual([
        expect.objectContaining({ code: "too_big", origin: "array", maximum: 1, path: [] })
      ]);
    }
  );

  it("preserves valid tags at the supported limit without truncation", () => {
    const tags = Array.from({ length: 20 }, (_, index) => `tag-${index}`);
    expect(caseTagsSchema.parse(tags)).toEqual(tags);
    expect(caseTagsSchema.parse([])).toEqual([]);
  });

  it("preserves valid singleton and empty configuration partitions", () => {
    const common = {
      schemaVersion: SCHEMA_VERSION,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z"
    };
    const profile = {
      ...common,
      recordVersion: LOCAL_RESEARCHER_PROFILE_RECORD_VERSION,
      recordType: "local_researcher_profile",
      id: LOCAL_RESEARCHER_PROFILE_ID,
      displayName: "Synthetic researcher",
      organization: "",
      researchFocus: "Boundary regression"
    };
    const settings = {
      ...common,
      recordVersion: LOCAL_APP_SETTINGS_RECORD_VERSION,
      recordType: "local_app_settings",
      id: LOCAL_APP_SETTINGS_ID,
      locale: "zh-CN",
      defaultTimeZone: "Asia/Shanghai",
      defaultCalendarType: "gregorian",
      preferredDensity: "comfortable"
    };
    expect(fullBackupPayloadSchema.shape.researcherProfiles.parse([profile])).toEqual([profile]);
    expect(fullBackupPayloadSchema.shape.appSettings.parse([settings])).toEqual([settings]);
    expect(fullBackupPayloadSchema.shape.researcherProfiles.parse([])).toEqual([]);
    expect(fullBackupPayloadSchema.shape.appSettings.parse([])).toEqual([]);
  });

  it("still rejects invalid values and duplicate tags within the size limit", () => {
    expect(caseTagsSchema.safeParse([null]).success).toBe(false);
    expect(caseTagsSchema.safeParse(["same", "same"]).success).toBe(false);
    expect(fullBackupPayloadSchema.shape.researcherProfiles.safeParse([null]).success).toBe(false);
    expect(fullBackupPayloadSchema.shape.appSettings.safeParse([null]).success).toBe(false);
  });

  it("preserves existing UTF-16 limits for stored aliases, notes and tags", () => {
    const astral = "\u{1F600}";
    expect(caseRecordSchema.shape.alias.safeParse(astral.repeat(40)).success).toBe(true);
    expect(caseRecordSchema.shape.alias.safeParse(astral.repeat(41)).success).toBe(false);
    expect(caseRecordSchema.shape.notes.safeParse(astral.repeat(10_000)).success).toBe(true);
    expect(caseRecordSchema.shape.notes.safeParse(astral.repeat(10_001)).success).toBe(false);
    expect(caseTagsSchema.safeParse([astral.repeat(15)]).success).toBe(true);
    expect(caseTagsSchema.safeParse([astral.repeat(16)]).success).toBe(false);
  });
});

describe("persisted UTF-16 text limits after the Zod code-point change", () => {
  const fields: [string, z.ZodType, number][] = [
    ["case alias", caseRecordSchema.shape.alias, 80],
    ["case notes", caseRecordSchema.shape.notes, 20_000],
    ["case tag", caseTagsSchema.element, 30],
    ["birth location", birthInputSchema.shape.location.shape.label, 80],
    ["birth source note", birthInputSchema.shape.sourceNote, 500],
    ["rule profile label", ruleProfileSchema.shape.label, 80],
    ["rule profile notice", ruleProfileSchema.shape.notice, 300],
    ["research note body", researchNoteRecordSchema.shape.body, 200_000],
    ["research note tag", researchNoteRecordSchema.shape.tags.element, 40],
    ["research source reference", researchNoteRecordSchema.shape.sourceRefs.element, 500],
    ["event title", storedEventRecordSchema.shape.title, 120],
    ["event body", storedEventRecordSchema.shape.body, 200_000],
    ["researcher display name", localResearcherProfileRecordSchema.shape.displayName, 80],
    ["researcher organization", localResearcherProfileRecordSchema.shape.organization, 200],
    ["researcher focus", localResearcherProfileRecordSchema.shape.researchFocus, 2_000],
    ["attachment name", localAttachmentRecordSchema.shape.fileName, 255],
    ["attachment description", localAttachmentRecordSchema.shape.description, 2_000],
    ["knowledge title", knowledgeDocumentRecordSchema.shape.title, 300],
    ["knowledge content", knowledgeDocumentRecordSchema.shape.content, 2_000_000],
    ["comparison cell", comparisonCellSchema.shape.value, 1_000_000],
    ["comparison row value", comparisonRowSchema.shape.values.element, 1_000_000],
    ["installed canonical JSON text", installedRulePackRecordSchema.shape.canonicalJson, 2 * 1024 * 1024]
  ];
  it.each(fields)("keeps the exact original %s boundary for BMP, astral and lone-surrogate text", (_name, schema, maximum) => {
    const samples = ["中".repeat(maximum), "😀".repeat(Math.floor(maximum / 2)) + (maximum % 2 ? "中" : ""),
      "中".repeat(maximum - 1) + "\ud83d"];
    for (const value of samples) {
      expect(value.length).toBe(maximum);
      expect(schema.parse(value)).toBe(value);
      const invalid = schema.safeParse(value + "中");
      expect(invalid.success).toBe(false);
      if (invalid.success) throw new Error("Over-limit text was accepted");
      expect(invalid.error.issues).toEqual([expect.objectContaining({ code: "too_big", origin: "string", maximum, inclusive: true, path: [] })]);
    }
  });

  it("retains existing error codes, default/custom messages and min/exact checks without coercing text", () => {
    const min = z.string().check(utf16MinLength(2)), max = z.string().check(utf16MaxLength(2));
    const exact = z.string().check(utf16Length(2));
    const issues = (schema: z.ZodType, value: unknown) => {
      const result = schema.safeParse(value);
      if (result.success) throw new Error("Expected invalid text");
      return result.error.issues;
    };
    expect(min.parse("😀")).toBe("😀"); // two UTF-16 units, one code point
    expect(exact.parse("😀")).toBe("😀");
    expect(issues(min, "a")).toEqual(issues(z.string().min(2), "a"));
    expect(issues(max, "abc")).toEqual(issues(z.string().max(2), "abc"));
    expect(issues(exact, "a")).toEqual(issues(z.string().length(2), "a"));
    expect(issues(exact, "abc")).toEqual(issues(z.string().length(2), "abc"));
    expect(issues(z.string().check(utf16MaxLength(2, "保留原容量说明")), "😀中")[0]?.message).toBe("保留原容量说明");
    expect(issues(max, null)[0]?.code).toBe("invalid_type");
    expect(caseRecordSchema.shape.alias.safeParse("  ").success).toBe(false);
  });

  it("keeps original one-unit stems and two-unit pillars, including the pre-existing surrogate policy", () => {
    expect(pillarFactSchema.shape.stem.safeParse("😀").success).toBe(false);
    expect(pillarFactSchema.shape.stem.parse("\ud83d")).toBe("\ud83d");
    expect(pillarFactSchema.shape.ganZhi.parse("😀")).toBe("😀");
    expect(pillarFactSchema.shape.ganZhi.safeParse("😀中").success).toBe(false);
    expect(pillarFactSchema.shape.hiddenStems.safeParse(["😀"]).success).toBe(false);
  });

  it("reports original nested paths and rejects oversized backup partitions before reading their rows", () => {
    const note = { schemaVersion: SCHEMA_VERSION, id: "11111111-1111-4111-8111-111111111111",
      caseId: "22222222-2222-4222-8222-222222222222", anchor: { kind: "revision", revisionId: "33333333-3333-4333-8333-333333333333" },
      bodyFormat: "markdown", body: "😀".repeat(100_001), tags: [], sourceRefs: [], lifecycle: "active", editVersion: 1,
      createdAt: "2026-10-25T00:00:00.000Z", updatedAt: "2026-10-25T00:00:00.000Z" };
    const result = z.array(researchNoteRecordSchema).safeParse([note]);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Over-limit backup note was accepted");
    expect(result.error.issues[0]).toMatchObject({ code: "too_big", origin: "string", maximum: 200_000, path: [0, "body"] });
    const backup = fullBackupPayloadSchema.shape.researchNotes.safeParse([note]);
    expect(backup.success).toBe(false);
    if (backup.success) throw new Error("Over-limit backup note was accepted");
    // exactStoredRecordSchema intentionally sanitizes issue codes while
    // preserving the original nested path and message; do not bypass it.
    expect(backup.error.issues).toEqual([{ code: "custom", path: [0, "body"], message: result.error.issues[0]!.message }]);
    // These existing count checks remain Zod's native checks, with zero element
    // reads even when every value would independently fail text validation.
    const oversized = observedElements(21);
    expect(caseTagsSchema.safeParse(oversized.input).success).toBe(false);
    expect(oversized.readCount()).toBe(0);
  });
});
