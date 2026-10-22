import { describe, expect, it } from "vitest";
import { decodeReadingReportBundle, encodeReadingReportBundle, READING_REPORT_BUNDLE_MARKER } from "./local-reading-report-bundle";
import { packReadingSnapshot, unpackReadingSnapshot } from "./local-reading-snapshot-codec";

const input = { reading: "# 阅读稿\r\n本人补充：原样 🌿 e\u0301\n<script>字面文本</script>", archive: "\ufeff# 完整档案\n原结论\u200b与引用全部保留。\r\n", version: "hakimi.local-reading-edition/0.1.0" };
function modify(text: string, update: (value: any) => void): string {
  const value = JSON.parse(text.slice(READING_REPORT_BUNDLE_MARKER.length + 1));
  update(value);
  return `${READING_REPORT_BUNDLE_MARKER}\n${JSON.stringify(value)}`;
}

describe("saved reading report bundle", () => {
  it("roundtrips both exact texts and version through the existing codec, including CRLF, BOM and Unicode", async () => {
    const before = JSON.stringify(input);
    const encoded = await encodeReadingReportBundle(input);
    expect(await decodeReadingReportBundle(await unpackReadingSnapshot(await packReadingSnapshot(encoded)))).toEqual(input);
    expect(JSON.stringify(input)).toBe(before);
  });
  it("leaves legacy notes, feedback and an incidental marker in ordinary prose untouched", async () => {
    for (const text of ["旧原文", "# 原反馈\n原句", `原文引用\n${READING_REPORT_BUNDLE_MARKER}`, "<!-- hakimi.reading-snapshot/gzip-v1 -->\n旧封套"])
      expect(await decodeReadingReportBundle(text)).toBeNull();
  });
  it("rejects changed reading, archive, version, byte count, digest and swapped roles", async () => {
    const encoded = await encodeReadingReportBundle(input);
    const mutations = [
      (x: any) => { x.reading.text += "改"; }, (x: any) => { x.archive.text = "另一份档案"; },
      (x: any) => { x.version = "other/2"; }, (x: any) => { x.reading.utf8Bytes += 1; },
      (x: any) => { x.archive.sha256 = "0".repeat(64); }, (x: any) => { [x.reading, x.archive] = [x.archive, x.reading]; }
    ];
    for (const mutation of mutations) await expect(decodeReadingReportBundle(modify(encoded, mutation))).rejects.toThrow("原记录仍保留");
  });
  it("rejects unsupported markers, noncanonical duplicate keys, unexpected fields, invalid text and truncated JSON", async () => {
    const encoded = await encodeReadingReportBundle(input);
    const malformed = [encoded.replace("bundle/v1", "bundle/v2"), `\ufeff${encoded}`, encoded.slice(0, -1),
      encoded.replace('{"format":', '{"extra":0,"extra":0,"format":'),
      modify(encoded, x => { x.extra = true; }), modify(encoded, x => { x.reading.extra = true; }),
      modify(encoded, x => { x.reading.text = "\ud800"; }), modify(encoded, x => { x.archive = []; }),
      modify(encoded, x => { x.archive.utf8Bytes = 1.5; }), encoded + "\n"];
    for (const text of malformed) await expect(decodeReadingReportBundle(text)).rejects.toThrow("原记录仍保留");
  });
  it("keeps two complete long texts within the unchanged stored-note limit without dropping content", async () => {
    const report = { reading: "# 已保存通读稿\n" + "本段答案与适用条件。🌿\n".repeat(12_000),
      archive: "# 已保存完整档案\n" + "原判断／原节点／原条件全部保留。\n".repeat(18_000), version: input.version };
    const encoded = await encodeReadingReportBundle(report), stored = await packReadingSnapshot(encoded);
    expect(encoded.length).toBeGreaterThan(200_000);
    expect(stored.length).toBeLessThanOrEqual(200_000);
    expect(await decodeReadingReportBundle(await unpackReadingSnapshot(stored))).toEqual(report);
  });
  it("rejects invalid producer inputs and an envelope beyond the existing 8 MiB plaintext budget", async () => {
    await expect(encodeReadingReportBundle({ ...input, reading: "\ud800" })).rejects.toThrow();
    await expect(encodeReadingReportBundle({ ...input, version: "bad\nversion" })).rejects.toThrow();
    await expect(encodeReadingReportBundle({ ...input, archive: "a".repeat(8 * 1024 * 1024) })).rejects.toThrow();
    await expect(decodeReadingReportBundle(`${READING_REPORT_BUNDLE_MARKER}\n${"a".repeat(8 * 1024 * 1024)}`)).rejects.toThrow();
  });
});
