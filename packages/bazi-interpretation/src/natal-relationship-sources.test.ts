import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { NATAL_RELATIONSHIP_SOURCES, NATAL_RELATIONSHIP_SOURCES_VERSION } from "./natal-relationship-sources";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const byId = (id: string) => NATAL_RELATIONSHIP_SOURCES.find(source => source.id === id)!;

describe("natal relationship source evidence", () => {
  it("keeps all five previously cited source objects intact", () => {
    const legacy = {
      "relationship-foundation-zq-position": "2df3db5acf428cf97f34ecbe026b5c4bc65430e635a159f0881811cc8f4c96f0",
      "relationship-foundation-zq-star-palace": "168efb280dd8d58eacac3fc6c61c0f83519ab5ae10f8135e96648908467dc502",
      "relationship-foundation-zq-counterconditions": "c079ba6be638b126609232047dee5d031d30cbedc11c0a46adc36cb45996514e",
      "relationship-foundation-smt-female-mapping": "e92a0ed3ede0780ab1fa053dafa8ede5e47e3243b0bb6a7f8ce98b8a5eb73a80",
      "relationship-foundation-zq-combination-limits": "bf0f45ea0f932e4e8be00c1f0bd23996946d51501c61ab98d7479a2ee4f69508"
    };
    for (const [id, digest] of Object.entries(legacy)) expect(sha(JSON.stringify(byId(id)))).toBe(digest);
  });

  it("binds every excerpt and new scanned clause to its recorded UTF-8 digest", () => {
    expect(NATAL_RELATIONSHIP_SOURCES_VERSION).toBe("hakimi.natal-relationship-sources/0.2.0");
    expect(new Set(NATAL_RELATIONSHIP_SOURCES.map(source => source.id)).size).toBe(8);
    for (const source of NATAL_RELATIONSHIP_SOURCES) {
      expect(sha(source.excerpt)).toBe(source.provenance!.excerptSha256);
      for (const clause of source.provenance!.facsimile?.clauses ?? []) expect(sha(clause.transcription)).toBe(clause.sha256);
    }
    const palace = byId("relationship-foundation-zq-family-palaces");
    expect(palace.excerpt).toBe("年月日時，自上而下，祖父妻子亦自上而下。");
    expect(palace.provenance!.facsimile).toMatchObject({
      pdfPageOneBased: 52, printedPage: "四十三",
      pdfSha256: "71402a780b0351b54edf121a51bc4a4a4ce5896496c35b954563ee06f1a6f620",
      pageImageSha256: "cdf0af695f77ac94176897c8834846950e80b905a3c05d0b331d817a33c4fac2"
    });
    const method = byId("relationship-foundation-zq-family-role-method");
    expect(method.excerpt).toBe("作何喜忌，察而配之，即可以了然矣。");
    expect(method.provenance!.facsimile!.pdfPageOneBased).toBe(53);
    expect(method.provenance!.textVariant).toContain("非徐乐吾评注");
  });

  it("separates the fixed transcription and traditional method from modern household conclusions", () => {
    const source = byId("relationship-foundation-smt-star-position");
    expect(source.excerpt).toBe("須看四柱之中父母兄弟妻子星居何地");
    expect(source.url).toContain("oldid=2082208");
    expect(source.provenance).toMatchObject({ kind: "wikisource_revision", revisionId: 2082208, excerptTransform: "verbatim" });
    expect(source.provenance!.licenseUrl).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(source.provenance!.textVariant).toContain("非沈氏正文、非徐注");
    expect(source.interpretation).toContain("不能把偏印一概译成继母");
    for (const id of ["relationship-foundation-zq-family-palaces", "relationship-foundation-zq-family-role-method", "relationship-foundation-smt-star-position"])
      expect(byId(id).interpretation).toMatch(/本地(?:现代)?解释/u);
  });
});
