import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NATAL_AUTHORITY_SOURCES, NATAL_AUTHORITY_SOURCES_VERSION } from "./natal-authority-sources";

describe("local natal authority source provenance", () => {
  it("binds the two distinct original clauses to their own facsimile pages and exact UTF-8 digests", () => {
    expect(NATAL_AUTHORITY_SOURCES_VERSION).toBe("hakimi.natal-authority-sources/0.1.0");
    const expected = [
      { id: "natal-zq-lujie-authority-clearing", page: 91, printed: "八十二", text: "官煞競出必取清方爲貴格" },
      { id: "natal-zq-self-combination-not-removal", page: 20, printed: "十一", text: "惟是本身十干合之不爲合去" }
    ];
    expect(NATAL_AUTHORITY_SOURCES.map((source) => source.id)).toEqual(expected.map((source) => source.id));
    for (const target of expected) {
      const source = NATAL_AUTHORITY_SOURCES.find((entry) => entry.id === target.id)!;
      expect(source.excerpt).toBe(target.text);
      expect(source.url.endsWith(`#page=${target.page}`)).toBe(true);
      const origin = source.provenance!;
      expect(origin.kind).toBe("facsimile_page");
      expect(origin.excerptSha256).toBe(createHash("sha256").update(source.excerpt, "utf8").digest("hex"));
      expect(origin.facsimile!.pdfPageOneBased).toBe(target.page);
      expect(origin.facsimile!.printedPage).toBe(target.printed);
      expect(origin.facsimile!.pdfSha256).toBe("71402a780b0351b54edf121a51bc4a4a4ce5896496c35b954563ee06f1a6f620");
      expect(origin.facsimile!.pageImageSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(origin.facsimile!.clauses).toEqual([{ role: "exception", stem: null, transcription: source.excerpt, sha256: origin.excerptSha256 }]);
      expect(origin.textVariant).toContain("非徐乐吾评注");
    }
    expect(new Set(NATAL_AUTHORITY_SOURCES.map((source) => source.provenance!.facsimile!.pageImageSha256)).size).toBe(2);
  });
});
