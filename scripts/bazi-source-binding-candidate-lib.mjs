import { createHash } from "node:crypto";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SHA1_PATTERN = /^[a-f0-9]{40}$/u;

const EXPECTED_CANDIDATE_ORDER = Object.freeze([
  "smt-siku-v10-wikisource-r761703-candidate-v1",
  "dtt-chanwei-wikisource-r2600158-candidate-v1",
  "smt-v5-wikisource-r2706483-candidate-v1",
  "yhzp-wikisource-r2593607-candidate-v1"
]);

const EXPECTED_SOURCE_LOCKS = Object.freeze({
  "smt-siku-v10-wikisource-r761703-candidate-v1": Object.freeze({
    bindingId: "binding:smt-v10:whole-chart",
    evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
    sourceId: "smt-siku-v10-wikisource-r761703",
    pageId: 260849,
    pageTitle: "三命通會 (四庫全書本)/卷10",
    revisionId: 761703,
    parentRevisionId: 657383,
    revisionTimestamp: "2016-10-24T13:15:01Z",
    mediaWikiSha1: "43ac68d5e4a84bdfa98524557a8b3e9b3f1f8426",
    rawWikitextCharacters: 38959,
    rawWikitextUtf8Bytes: 106555,
    rawWikitextSha256: "0a20dc53a4156211b5c8ba89dbb6a8f07f056fde573e37699e28b021b6d026b6",
    quoteLocks: Object.freeze([
      Object.freeze({
        quoteCandidateId: "smt-v10-yueling-minimal-v1",
        rawRevisionLineStart: 10,
        rawRevisionLineEnd: 10,
        rawCharacterStartZeroBased: 236,
        rawCharacterEndExclusive: 252,
        quoteCharacters: 16,
        quoteUtf8Bytes: 48,
        quoteSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f"
      }),
      Object.freeze({
        quoteCandidateId: "smt-v10-tougan-minimal-v1",
        rawRevisionLineStart: 10,
        rawRevisionLineEnd: 10,
        rawCharacterStartZeroBased: 365,
        rawCharacterEndExclusive: 384,
        quoteCharacters: 19,
        quoteUtf8Bytes: 57,
        quoteSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee"
      })
    ])
  }),
  "dtt-chanwei-wikisource-r2600158-candidate-v1": Object.freeze({
    bindingId: "binding:dtt:month-command",
    evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
    sourceId: "dtt-chanwei-wikisource-r2600158",
    pageId: 340255,
    pageTitle: "滴天髓闡微",
    revisionId: 2600158,
    parentRevisionId: 1163183,
    revisionTimestamp: "2025-09-25T13:22:02Z",
    mediaWikiSha1: "6ac3dc412881525c2c0544b75e51512cc0daa573",
    rawWikitextCharacters: 143701,
    rawWikitextUtf8Bytes: 401801,
    rawWikitextSha256: "1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d",
    quoteLocks: Object.freeze([
      Object.freeze({
        quoteCandidateId: "dtt-yueling-minimal-v1",
        rawRevisionLineStart: 2391,
        rawRevisionLineEnd: 2391,
        rawCharacterStartZeroBased: 38616,
        rawCharacterEndExclusive: 38628,
        quoteCharacters: 12,
        quoteUtf8Bytes: 36,
        quoteSha256: "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9"
      }),
      Object.freeze({
        quoteCandidateId: "dtt-rooting-minimal-v1",
        rawRevisionLineStart: 2451,
        rawRevisionLineEnd: 2451,
        rawCharacterStartZeroBased: 40658,
        rawCharacterEndExclusive: 40675,
        quoteCharacters: 17,
        quoteUtf8Bytes: 51,
        quoteSha256: "201ce34c97841b890910cc311d14290d9cb71228f4fe64d1b0f4a419aff6818b"
      })
    ])
  }),
  "smt-v5-wikisource-r2706483-candidate-v1": Object.freeze({
    bindingId: "binding:smt-v5:relative-relations",
    evidenceSubjectId: "bazi.strength.binding.smt-v5.relative-relations.v1",
    sourceId: "smt-v5-wikisource-r2706483",
    pageId: 335940,
    pageTitle: "三命通會/卷五",
    revisionId: 2706483,
    parentRevisionId: 845351,
    revisionTimestamp: "2026-04-23T06:45:01Z",
    mediaWikiSha1: "cd03b24ebd1c63acc3a5b9c9b5f71cda3da9749f",
    rawWikitextCharacters: 10612,
    rawWikitextUtf8Bytes: 30616,
    rawWikitextSha256: "df0446bc9ff7651a91fc866de1eb4f86dec4b045b95cbbd777b1fec70e51f139",
    quoteLocks: Object.freeze([
      Object.freeze({
        quoteCandidateId: "smt-v5-relative-relations-minimal-v1",
        rawRevisionLineStart: 7,
        rawRevisionLineEnd: 8,
        rawCharacterStartZeroBased: 108,
        rawCharacterEndExclusive: 128,
        quoteCharacters: 20,
        quoteUtf8Bytes: 58,
        quoteSha256: "04b00701992b5a8c8e259ff0172de817420f3022dc37bdfe96efe47a1f84d444"
      })
    ])
  }),
  "yhzp-wikisource-r2593607-candidate-v1": Object.freeze({
    bindingId: "binding:yhzp:hidden-listing",
    evidenceSubjectId: "bazi.strength.binding.yhzp.hidden-listing.v1",
    sourceId: "yhzp-wikisource-r2593607",
    pageId: 343323,
    pageTitle: "淵海子平",
    revisionId: 2593607,
    parentRevisionId: 2589932,
    revisionTimestamp: "2025-08-24T18:41:12Z",
    mediaWikiSha1: "9b1ba96079eb641d8663b48f698dbd1b7fbada70",
    rawWikitextCharacters: 61325,
    rawWikitextUtf8Bytes: 173237,
    rawWikitextSha256: "a4447be5d95eb073857cb8cba8f0e58a500de1c283016c76cfdedb0d1b2bb133",
    quoteLocks: Object.freeze([
      Object.freeze({
        quoteCandidateId: "yhzp-hidden-stem-listing-minimal-v1",
        rawRevisionLineStart: 80,
        rawRevisionLineEnd: 80,
        rawCharacterStartZeroBased: 831,
        rawCharacterEndExclusive: 927,
        quoteCharacters: 96,
        quoteUtf8Bytes: 288,
        quoteSha256: "a6f2f818d80148318a769754ff5bb0f74f5b68be96764bfb35843abbaa8fabc2"
      })
    ])
  })
});

const EXPECTED_FACSIMILE_LOCKS = Object.freeze({
  "smt-siku-v10-wikisource-r761703-candidate-v1": Object.freeze([Object.freeze({
    anchorId: "smt-v10-gujin-volume-472-page-28-facsimile-v1",
    anchorRole: "corroborating_historical_excerpt_not_edition_identity_proof",
    provider: "Wikimedia Commons and Chinese Wikisource",
    carrierFilePageId: 52325762,
    carrierFileTitle: "File:Gujin Tushu Jicheng, Volume 472 (1700-1725).djvu",
    carrierDescriptionUrl: "https://commons.wikimedia.org/wiki/File:Gujin_Tushu_Jicheng,_Volume_472_(1700-1725).djvu",
    carrierFileTimestamp: "2016-10-17T12:20:36Z",
    carrierMediaWikiSha1: "52d4c0998f472e704d85a71f9458d206e43f6128",
    carrierSha256: "be4df89c53764fb0acf26224a47ddc445b403569dde104d283e1fb85768940f7",
    carrierBytes: 21705448,
    carrierPageCount: 125,
    carrierMime: "image/vnd.djvu",
    sourceProvenanceObservation: "commons_credit_links_baidu_pan_original_source_not_independently_verified",
    editionRelation: "Gujin Tushu Jicheng excerpt; not the pinned Siku edition",
    pageLocks: Object.freeze([
      Object.freeze({
        pageRefId: "smt-v10-gujin-v472-page-28",
        quoteCandidateIds: Object.freeze(["smt-v10-yueling-minimal-v1", "smt-v10-tougan-minimal-v1"]),
        scanPageNumber: 28,
        printedPageLabel: null,
        visibleHeading: "三命通會二十八／看命口訣",
        pageId: 959158,
        pageRevisionId: 1898854,
        pageRevisionTimestamp: "2020-06-09T11:26:55Z",
        pageMediaWikiSha1: "c6baac2e33385a3f2c77abcdd117a11ad588f21b",
        pageTranscriptionQualityLevel: 1,
        pageTranscriptionQualityState: "not_proofread"
      })
    ])
  })]),
  "dtt-chanwei-wikisource-r2600158-candidate-v1": Object.freeze([Object.freeze({
    anchorId: "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
    anchorRole: "same_work_later_print_not_version_identity_proof",
    provider: "Wikimedia Commons",
    carrierFilePageId: 125728441,
    carrierFileTitle: "File:SSID-11335994 滴天髓闡微.pdf",
    carrierDescriptionUrl: "https://commons.wikimedia.org/wiki/File:SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf",
    carrierFileTimestamp: "2022-11-20T09:29:18Z",
    carrierMediaWikiSha1: "2d2e1502325c5f026be0f5618d54d8e9c254c232",
    carrierSha256: "d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803",
    carrierBytes: 14751242,
    carrierPageCount: 516,
    carrierMime: "application/pdf",
    sourceProvenanceObservation: "commons_file_page_has_no_machine_readable_source_or_author",
    editionRelation: "1947 Shanghai Dadong Bookstore scan; pinned transcription edition identity not established",
    pageLocks: Object.freeze([
      Object.freeze({
        pageRefId: "dtt-ssid-11335994-pdf-page-170",
        quoteCandidateIds: Object.freeze(["dtt-yueling-minimal-v1"]),
        scanPageNumber: 170,
        printedPageLabel: "二八",
        visibleHeading: "月令",
        pageId: null,
        pageRevisionId: null,
        pageRevisionTimestamp: null,
        pageMediaWikiSha1: null,
        pageTranscriptionQualityLevel: null,
        pageTranscriptionQualityState: "not_applicable_no_page_namespace_revision"
      }),
      Object.freeze({
        pageRefId: "dtt-ssid-11335994-pdf-page-176",
        quoteCandidateIds: Object.freeze(["dtt-rooting-minimal-v1"]),
        scanPageNumber: 176,
        printedPageLabel: "三四",
        visibleHeading: "衰旺",
        pageId: null,
        pageRevisionId: null,
        pageRevisionTimestamp: null,
        pageMediaWikiSha1: null,
        pageTranscriptionQualityLevel: null,
        pageTranscriptionQualityState: "not_applicable_no_page_namespace_revision"
      })
    ])
  }), Object.freeze({
    anchorId: "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
    anchorRole: "same_1947_first_edition_public_scan_with_cadal_source_metadata_not_transcription_identity_proof",
    provider: "Wikimedia Commons",
    carrierFilePageId: 126125545,
    carrierFileTitle: "File:CADAL07005210 滴天髓闡微.djvu",
    carrierDescriptionUrl: "https://commons.wikimedia.org/wiki/File:CADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu",
    carrierFileTimestamp: "2022-11-30T06:30:20Z",
    carrierMediaWikiSha1: "e73a24aee3cfc28f22d39e795b13fe76a5a995ad",
    carrierSha256: "1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60",
    carrierBytes: 17912324,
    carrierPageCount: 521,
    carrierMime: "image/vnd.djvu",
    sourceProvenanceObservation: "commons_description_identifies_cadal_07005210_and_fudan_source_not_independently_verified",
    editionRelation: "Commons describes a 1947-04 Shanghai Dadong first-edition facsimile and the observed page layout matches the other 1947 carrier; pinned transcription edition identity remains unestablished",
    pageLocks: Object.freeze([
      Object.freeze({
        pageRefId: "dtt-cadal-07005210-djvu-page-178",
        quoteCandidateIds: Object.freeze(["dtt-yueling-minimal-v1"]),
        scanPageNumber: 178,
        printedPageLabel: "二八",
        visibleHeading: "月令",
        pageId: null,
        pageRevisionId: null,
        pageRevisionTimestamp: null,
        pageMediaWikiSha1: null,
        pageTranscriptionQualityLevel: null,
        pageTranscriptionQualityState: "not_applicable_no_page_namespace_revision"
      }),
      Object.freeze({
        pageRefId: "dtt-cadal-07005210-djvu-page-184",
        quoteCandidateIds: Object.freeze(["dtt-rooting-minimal-v1"]),
        scanPageNumber: 184,
        printedPageLabel: "三四",
        visibleHeading: "衰旺",
        pageId: null,
        pageRevisionId: null,
        pageRevisionTimestamp: null,
        pageMediaWikiSha1: null,
        pageTranscriptionQualityLevel: null,
        pageTranscriptionQualityState: "not_applicable_no_page_namespace_revision"
      })
    ])
  })]),
  "smt-v5-wikisource-r2706483-candidate-v1": Object.freeze([Object.freeze({
    anchorId: "smt-v5-gujin-volume-470-page-115-facsimile-v1",
    anchorRole: "corroborating_historical_excerpt_not_edition_identity_proof",
    provider: "Wikimedia Commons and Chinese Wikisource",
    carrierFilePageId: 52325594,
    carrierFileTitle: "File:Gujin Tushu Jicheng, Volume 470 (1700-1725).djvu",
    carrierDescriptionUrl: "https://commons.wikimedia.org/wiki/File:Gujin_Tushu_Jicheng,_Volume_470_(1700-1725).djvu",
    carrierFileTimestamp: "2016-10-17T12:08:45Z",
    carrierMediaWikiSha1: "81460135a18a531bf1ca51ac49616e23fb7a5182",
    carrierSha256: "64491cdc159a480686ddc568d6f08c5976e5ea5abc8b27816a5d71e19941c037",
    carrierBytes: 22564579,
    carrierPageCount: 123,
    carrierMime: "image/vnd.djvu",
    sourceProvenanceObservation: "commons_credit_links_baidu_pan_original_source_not_independently_verified",
    editionRelation: "Gujin Tushu Jicheng excerpt; not the pinned Wikisource volume edition",
    pageLocks: Object.freeze([
      Object.freeze({
        pageRefId: "smt-v5-gujin-v470-page-115",
        quoteCandidateIds: Object.freeze(["smt-v5-relative-relations-minimal-v1"]),
        scanPageNumber: 115,
        printedPageLabel: null,
        visibleHeading: "三命通會十二／論古人立印食官財名義",
        pageId: 959331,
        pageRevisionId: 1898698,
        pageRevisionTimestamp: "2020-06-09T11:00:37Z",
        pageMediaWikiSha1: "6773ade6c3941557462cf1c8ddf64dd629011463",
        pageTranscriptionQualityLevel: 1,
        pageTranscriptionQualityState: "not_proofread"
      })
    ])
  })]),
  "yhzp-wikisource-r2593607-candidate-v1": Object.freeze([Object.freeze({
    anchorId: "yhzp-nlc416-15jh007754-99036-page-54-facsimile-v1",
    anchorRole: "same_work_later_print_not_version_identity_proof",
    provider: "Wikimedia Commons",
    carrierFilePageId: 130948304,
    carrierFileTitle: "File:NLC416-15jh007754-99036 淵海子平 子平真詮.pdf",
    carrierDescriptionUrl: "https://commons.wikimedia.org/wiki/File:NLC416-15jh007754-99036_%E6%B7%B5%E6%B5%B7%E5%AD%90%E5%B9%B3_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf",
    carrierFileTimestamp: "2023-04-21T13:52:10Z",
    carrierMediaWikiSha1: "ba319cfa1afb636a20eeed3d0beb90e41b8ce10e",
    carrierSha256: "fca66e109aae987a5a04dc623e5168680d227542e13b56cdd7c39b62e55b605f",
    carrierBytes: 6429274,
    carrierPageCount: 209,
    carrierMime: "application/pdf",
    sourceProvenanceObservation: "commons_description_identifies_national_library_of_china_source_not_independently_verified",
    editionRelation: "Republican-era Wenming Bookstore scan of the same work; pinned transcription edition identity not established",
    pageLocks: Object.freeze([
      Object.freeze({
        pageRefId: "yhzp-nlc416-15jh007754-99036-pdf-page-54",
        quoteCandidateIds: Object.freeze(["yhzp-hidden-stem-listing-minimal-v1"]),
        scanPageNumber: 54,
        printedPageLabel: "三六",
        visibleHeading: "又地支藏遁歌",
        pageId: null,
        pageRevisionId: null,
        pageRevisionTimestamp: null,
        pageMediaWikiSha1: null,
        pageTranscriptionQualityLevel: null,
        pageTranscriptionQualityState: "not_applicable_no_page_namespace_revision"
      })
    ])
  })])
});

const EXPECTED_COLLATION_CANDIDATE_LOCKS = Object.freeze({
  "smt-siku-v10-wikisource-r761703-candidate-v1": Object.freeze([
    Object.freeze({
      collationCandidateId: "smt-v10-yueling-gujin-v472-page-28-normalized-collation-v1",
      anchorId: "smt-v10-gujin-volume-472-page-28-facsimile-v1",
      pageRefId: "smt-v10-gujin-v472-page-28",
      quoteCandidateId: "smt-v10-yueling-minimal-v1",
      observedAt: "2026-08-25T19:19:23.981Z",
      carrierSha256: "be4df89c53764fb0acf26224a47ddc445b403569dde104d283e1fb85768940f7",
      transcriptionQuoteSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
      carrierGlyphSequenceSha256: "a2dcb5a44deae965e6eec1926651a73a43b7bb5532385b03184efbd38507d029",
      transcriptionGlyphSequenceSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
      normalizedSequenceCharacters: 16,
      normalizedSequenceSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f",
      scriptVariantPairCount: 3
    }),
    Object.freeze({
      collationCandidateId: "smt-v10-tougan-gujin-v472-page-28-exact-glyph-candidate-v1",
      anchorId: "smt-v10-gujin-volume-472-page-28-facsimile-v1",
      pageRefId: "smt-v10-gujin-v472-page-28",
      quoteCandidateId: "smt-v10-tougan-minimal-v1",
      observedAt: "2026-08-25T19:19:23.981Z",
      carrierSha256: "be4df89c53764fb0acf26224a47ddc445b403569dde104d283e1fb85768940f7",
      transcriptionQuoteSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      carrierGlyphSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      transcriptionGlyphSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      normalizedSequenceCharacters: 19,
      normalizedSequenceSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee",
      scriptVariantPairCount: 0
    })
  ]),
  "dtt-chanwei-wikisource-r2600158-candidate-v1": Object.freeze([
    Object.freeze({
      collationCandidateId: "dtt-yueling-ssid-11335994-page-170-normalized-collation-v1",
      anchorId: "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
      pageRefId: "dtt-ssid-11335994-pdf-page-170",
      quoteCandidateId: "dtt-yueling-minimal-v1",
      observedAt: "2026-08-25T18:48:11.944Z",
      carrierSha256: "d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803",
      transcriptionQuoteSha256: "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9",
      carrierGlyphSequenceSha256: "23440d78a05ca6d7c97d3c45261f8f4970a5a4fae6b5b90fa46e7c3204b3fe28",
      transcriptionGlyphSequenceSha256: "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
      normalizedSequenceCharacters: 11,
      normalizedSequenceSha256: "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
      scriptVariantPairCount: 1
    }),
    Object.freeze({
      collationCandidateId: "dtt-rooting-ssid-11335994-page-176-normalized-collation-v1",
      anchorId: "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
      pageRefId: "dtt-ssid-11335994-pdf-page-176",
      quoteCandidateId: "dtt-rooting-minimal-v1",
      observedAt: "2026-08-25T18:48:11.944Z",
      carrierSha256: "d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803",
      transcriptionQuoteSha256: "201ce34c97841b890910cc311d14290d9cb71228f4fe64d1b0f4a419aff6818b",
      carrierGlyphSequenceSha256: "f06ee5afc2fcb42bb12261901aff988ff034c77569bc109231cf0079616b8bfe",
      transcriptionGlyphSequenceSha256: "cdd8f8affa52fc66395e6959eab441b3620fb0c1f1b4a53c728658c934cf5f9d",
      normalizedSequenceCharacters: 16,
      normalizedSequenceSha256: "cdd8f8affa52fc66395e6959eab441b3620fb0c1f1b4a53c728658c934cf5f9d",
      scriptVariantPairCount: 1
    }),
    Object.freeze({
      collationCandidateId: "dtt-yueling-cadal-07005210-page-178-normalized-collation-v1",
      anchorId: "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
      pageRefId: "dtt-cadal-07005210-djvu-page-178",
      quoteCandidateId: "dtt-yueling-minimal-v1",
      observedAt: "2026-08-25T20:17:10.106Z",
      carrierSha256: "1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60",
      transcriptionQuoteSha256: "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9",
      carrierGlyphSequenceSha256: "23440d78a05ca6d7c97d3c45261f8f4970a5a4fae6b5b90fa46e7c3204b3fe28",
      transcriptionGlyphSequenceSha256: "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
      normalizedSequenceCharacters: 11,
      normalizedSequenceSha256: "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
      scriptVariantPairCount: 1
    }),
    Object.freeze({
      collationCandidateId: "dtt-rooting-cadal-07005210-page-184-normalized-collation-v1",
      anchorId: "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
      pageRefId: "dtt-cadal-07005210-djvu-page-184",
      quoteCandidateId: "dtt-rooting-minimal-v1",
      observedAt: "2026-08-25T20:17:10.106Z",
      carrierSha256: "1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60",
      transcriptionQuoteSha256: "201ce34c97841b890910cc311d14290d9cb71228f4fe64d1b0f4a419aff6818b",
      carrierGlyphSequenceSha256: "f06ee5afc2fcb42bb12261901aff988ff034c77569bc109231cf0079616b8bfe",
      transcriptionGlyphSequenceSha256: "cdd8f8affa52fc66395e6959eab441b3620fb0c1f1b4a53c728658c934cf5f9d",
      normalizedSequenceCharacters: 16,
      normalizedSequenceSha256: "cdd8f8affa52fc66395e6959eab441b3620fb0c1f1b4a53c728658c934cf5f9d",
      scriptVariantPairCount: 1
    })
  ]),
  "smt-v5-wikisource-r2706483-candidate-v1": Object.freeze([
    Object.freeze({
      collationCandidateId: "smt-v5-relative-relations-gujin-v470-page-115-normalized-collation-v1",
      anchorId: "smt-v5-gujin-volume-470-page-115-facsimile-v1",
      pageRefId: "smt-v5-gujin-v470-page-115",
      quoteCandidateId: "smt-v5-relative-relations-minimal-v1",
      observedAt: "2026-08-25T19:19:23.981Z",
      carrierSha256: "64491cdc159a480686ddc568d6f08c5976e5ea5abc8b27816a5d71e19941c037",
      transcriptionQuoteSha256: "04b00701992b5a8c8e259ff0172de817420f3022dc37bdfe96efe47a1f84d444",
      carrierGlyphSequenceSha256: "118abf2b412bb6a6e03869161ca421022a318630ad2042ebb24fb129831a569b",
      transcriptionGlyphSequenceSha256: "03ac497b4067b4e7e69b48b853d3c123794eb9e3b9bca02cc00a121a6a9d193d",
      normalizedSequenceCharacters: 16,
      normalizedSequenceSha256: "03ac497b4067b4e7e69b48b853d3c123794eb9e3b9bca02cc00a121a6a9d193d",
      scriptVariantPairCount: 5
    })
  ]),
  "yhzp-wikisource-r2593607-candidate-v1": Object.freeze([
    Object.freeze({
      collationCandidateId: "yhzp-hidden-stem-listing-nlc-page-54-normalized-collation-v1",
      anchorId: "yhzp-nlc416-15jh007754-99036-page-54-facsimile-v1",
      pageRefId: "yhzp-nlc416-15jh007754-99036-pdf-page-54",
      quoteCandidateId: "yhzp-hidden-stem-listing-minimal-v1",
      observedAt: "2026-08-25T19:50:36.415Z",
      carrierSha256: "fca66e109aae987a5a04dc623e5168680d227542e13b56cdd7c39b62e55b605f",
      transcriptionQuoteSha256: "a6f2f818d80148318a769754ff5bb0f74f5b68be96764bfb35843abbaa8fabc2",
      carrierGlyphSequenceSha256: "bb3b88084c0bee2b2d5f820c6132ab0d59c6319b6fe2376f6245f00542ce07fd",
      transcriptionGlyphSequenceSha256: "d66a494cde4d315d9962cb016f40e24b4a4ce3b7a1cdd786b76ad6f5dbdd7ea0",
      normalizedSequenceCharacters: 84,
      normalizedSequenceSha256: "d66a494cde4d315d9962cb016f40e24b4a4ce3b7a1cdd786b76ad6f5dbdd7ea0",
      scriptVariantPairCount: 11
    })
  ])
});

const TOPIC_BINDING_MAP = Object.freeze({
  "strength.yueling_exact_quote": Object.freeze([
    "binding:dtt:month-command",
    "binding:smt-v10:whole-chart"
  ]),
  "strength.rooting_exact_quote": Object.freeze(["binding:dtt:month-command"]),
  "strength.tougan_exact_quote": Object.freeze(["binding:smt-v10:whole-chart"])
});

function fail(message) {
  throw new Error(`Bazi source-binding candidate gate failed: ${message}`);
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertRecord(value, label) {
  if (!isRecord(value)) fail(`${label} must be an object`);
}

function assertExactKeys(value, keys, label) {
  assertRecord(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} keys expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) fail(`${label} must be a non-empty string`);
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function computeCandidateDigest(candidate) {
  const { candidateDigest: _candidateDigest, ...payload } = candidate;
  return sha256(canonicalJson(payload));
}

export function computeFacsimileCollationCandidateDigest(collationCandidate) {
  const { collationDigest: _collationDigest, ...payload } = collationCandidate;
  return sha256(canonicalJson(payload));
}

export function computeLedgerDigest(ledger) {
  const payload = structuredClone(ledger);
  delete payload.ledgerDigest;
  for (const candidate of payload.candidates ?? []) delete candidate.candidateDigest;
  return sha256(canonicalJson(payload));
}

function verifyQuoteCandidate(quote, lock, candidateId, topicIds) {
  const label = `${candidateId}/${lock.quoteCandidateId}`;
  assertExactKeys(quote, [
    "quoteCandidateId", "conceptualTopics", "heading", "rawRevisionLineStart", "rawRevisionLineEnd",
    "rawCharacterStartZeroBased", "rawCharacterEndExclusive",
    "quoteCharacters", "quoteUtf8Bytes", "quoteSha256", "quoteOccurrenceInRawRevision",
    "quoteTextStored", "supportCandidate"
  ], label);
  for (const [key, expected] of Object.entries(lock)) {
    if (quote[key] !== expected) fail(`${label}.${key} expected ${JSON.stringify(expected)}, got ${JSON.stringify(quote[key])}`);
  }
  assertNonEmptyString(quote.heading, `${label}.heading`);
  assertNonEmptyString(quote.supportCandidate, `${label}.supportCandidate`);
  if (!Array.isArray(quote.conceptualTopics) || quote.conceptualTopics.some((topic) => !topicIds.has(topic))) {
    fail(`${label}.conceptualTopics contains an unknown audit topic`);
  }
  if (quote.quoteOccurrenceInRawRevision !== "unique" || quote.quoteTextStored !== false) {
    fail(`${label} must remain a unique hash-only quote candidate`);
  }
  if (quote.rawCharacterEndExclusive - quote.rawCharacterStartZeroBased !== quote.quoteCharacters) {
    fail(`${label} raw character range must equal quoteCharacters`);
  }
  if (!SHA256_PATTERN.test(quote.quoteSha256)) fail(`${label}.quoteSha256 is invalid`);
}

function verifyFacsimileAnchor(anchor, lock, candidateId, quoteIds) {
  const label = `${candidateId}/${lock.anchorId}`;
  assertExactKeys(anchor, [
    "anchorId", "anchorRole", "provider", "carrierFilePageId", "carrierFileTitle",
    "carrierDescriptionUrl", "carrierFileTimestamp", "carrierMediaWikiSha1", "carrierSha256",
    "carrierBytes", "carrierPageCount", "carrierMime", "licenseOrNoticeObserved",
    "sourceProvenanceObservation", "editionRelation", "comparisonScope", "exactCollationStatus",
    "repositoryCarrierFileStored", "repositoryPageImagesStored", "storagePolicy", "pageRefs"
  ], label);
  for (const key of [
    "anchorId", "anchorRole", "provider", "carrierFilePageId", "carrierFileTitle",
    "carrierDescriptionUrl", "carrierFileTimestamp", "carrierMediaWikiSha1", "carrierSha256",
    "carrierBytes", "carrierPageCount", "carrierMime", "sourceProvenanceObservation", "editionRelation"
  ]) {
    if (anchor[key] !== lock[key]) fail(`${label}.${key} does not match the acquired facsimile lock`);
  }
  if (!URL.canParse(anchor.carrierDescriptionUrl)
    || !SHA1_PATTERN.test(anchor.carrierMediaWikiSha1)
    || !SHA256_PATTERN.test(anchor.carrierSha256)
    || !Number.isInteger(anchor.carrierBytes) || anchor.carrierBytes <= 0
    || !Number.isInteger(anchor.carrierPageCount) || anchor.carrierPageCount <= 0) {
    fail(`${label} carrier identity is invalid`);
  }
  if (anchor.licenseOrNoticeObserved !== "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated"
    || anchor.comparisonScope !== "visual_heading_and_passage_correspondence_only"
    || anchor.exactCollationStatus !== "not_performed"
    || anchor.repositoryCarrierFileStored !== false
    || anchor.repositoryPageImagesStored !== false
    || anchor.storagePolicy !== "link_only") {
    fail(`${label} must remain link-only, visually corroborated, uncollated, and legally unadjudicated`);
  }
  if (!Array.isArray(anchor.pageRefs) || anchor.pageRefs.length !== lock.pageLocks.length) {
    fail(`${label}.pageRefs count does not match the acquired facsimile lock`);
  }

  const coveredQuoteIds = [];
  anchor.pageRefs.forEach((pageRef, index) => {
    const pageLock = lock.pageLocks[index];
    const pageLabel = `${label}/${pageLock.pageRefId}`;
    assertExactKeys(pageRef, [
      "pageRefId", "quoteCandidateIds", "scanPageNumber", "printedPageLabel", "visibleHeading",
      "pageUrl", "pageId", "pageRevisionId", "pageRevisionTimestamp", "pageMediaWikiSha1",
      "pageTranscriptionQualityLevel", "pageTranscriptionQualityState", "correspondenceState"
    ], pageLabel);
    for (const key of [
      "pageRefId", "scanPageNumber", "printedPageLabel", "visibleHeading", "pageId",
      "pageRevisionId", "pageRevisionTimestamp", "pageMediaWikiSha1",
      "pageTranscriptionQualityLevel", "pageTranscriptionQualityState"
    ]) {
      if (pageRef[key] !== pageLock[key]) fail(`${pageLabel}.${key} does not match the acquired page lock`);
    }
    assertExactArray(pageRef.quoteCandidateIds, pageLock.quoteCandidateIds, `${pageLabel}.quoteCandidateIds`);
    if (pageRef.quoteCandidateIds.some((quoteId) => !quoteIds.has(quoteId))) {
      fail(`${pageLabel}.quoteCandidateIds contains a quote outside the candidate`);
    }
    coveredQuoteIds.push(...pageRef.quoteCandidateIds);
    if (!Number.isInteger(pageRef.scanPageNumber) || pageRef.scanPageNumber <= 0
      || pageRef.scanPageNumber > anchor.carrierPageCount
      || !URL.canParse(pageRef.pageUrl)
      || pageRef.correspondenceState !== "visual_passage_correspondence_observed_not_collated") {
      fail(`${pageLabel} visual correspondence locator is invalid`);
    }
    const hasPageRevision = pageRef.pageRevisionId !== null;
    if (hasPageRevision) {
      if (!Number.isInteger(pageRef.pageId) || !Number.isInteger(pageRef.pageRevisionId)
        || Number.isNaN(Date.parse(pageRef.pageRevisionTimestamp))
        || !SHA1_PATTERN.test(pageRef.pageMediaWikiSha1)
        || pageRef.pageTranscriptionQualityLevel !== 1
        || pageRef.pageTranscriptionQualityState !== "not_proofread"
        || !pageRef.pageUrl.includes(`oldid=${pageRef.pageRevisionId}`)) {
        fail(`${pageLabel} page revision identity is invalid`);
      }
    } else if (pageRef.pageId !== null || pageRef.pageRevisionTimestamp !== null
      || pageRef.pageMediaWikiSha1 !== null || pageRef.pageTranscriptionQualityLevel !== null
      || pageRef.pageTranscriptionQualityState !== "not_applicable_no_page_namespace_revision"
      || !pageRef.pageUrl.includes(`page=${pageRef.scanPageNumber}`)) {
      fail(`${pageLabel} file-page locator must not imply a Page namespace revision`);
    }
  });
  assertExactArray([...coveredQuoteIds].sort(), [...quoteIds].sort(), `${label}.coveredQuoteIds`);
}

function verifyFacsimileCollationCandidate(collation, lock, candidate, anchor) {
  const label = `${candidate.candidateId}/${lock.collationCandidateId}`;
  assertExactKeys(collation, [
    "collationCandidateId", "anchorId", "pageRefId", "quoteCandidateId", "observedAt",
    "method", "observerClass", "carrierSha256", "transcriptionQuoteSha256",
    "carrierGlyphSequenceSha256", "transcriptionGlyphSequenceSha256", "comparisonNormalization",
    "normalizedSequenceCharacters", "normalizedSequenceSha256", "scriptVariantPairCount",
    "punctuationDifferenceObserved", "exactGlyphSequenceEqual", "result",
    "humanCollatorAttestations", "domainExpertReviewIds", "rightsEffect", "bindingFreezeEffect",
    "carrierTextStored", "repositoryInspectionDerivativeStored", "collationDigest"
  ], label);
  for (const [key, expected] of Object.entries(lock)) {
    if (collation[key] !== expected) {
      fail(`${label}.${key} expected ${JSON.stringify(expected)}, got ${JSON.stringify(collation[key])}`);
    }
  }
  const quote = candidate.quoteCandidates.find((entry) => entry.quoteCandidateId === collation.quoteCandidateId);
  const page = anchor.pageRefs.find((entry) => entry.pageRefId === collation.pageRefId);
  if (!quote || !page || !page.quoteCandidateIds.includes(collation.quoteCandidateId)
    || collation.anchorId !== anchor.anchorId
    || collation.carrierSha256 !== anchor.carrierSha256
    || collation.transcriptionQuoteSha256 !== quote.quoteSha256) {
    fail(`${label} must bind the exact carrier, page and quote candidate`);
  }
  if (Number.isNaN(Date.parse(collation.observedAt))
    || collation.method !== "manual_visual_character_comparison_of_rendered_public_scan_pages"
    || collation.observerClass !== "automated_agent_nonexpert_visual_inspection"
    || !Number.isInteger(collation.normalizedSequenceCharacters) || collation.normalizedSequenceCharacters <= 0
    || !Number.isInteger(collation.scriptVariantPairCount) || collation.scriptVariantPairCount < 0
    || typeof collation.punctuationDifferenceObserved !== "boolean"
    || !Array.isArray(collation.humanCollatorAttestations) || collation.humanCollatorAttestations.length !== 0
    || !Array.isArray(collation.domainExpertReviewIds) || collation.domainExpertReviewIds.length !== 0
    || collation.rightsEffect !== "none"
    || collation.bindingFreezeEffect !== "none"
    || collation.carrierTextStored !== false
    || collation.repositoryInspectionDerivativeStored !== false) {
    fail(`${label} must remain nonexpert, hash-only, and non-promotional`);
  }
  for (const key of [
    "carrierSha256", "transcriptionQuoteSha256", "carrierGlyphSequenceSha256",
    "transcriptionGlyphSequenceSha256", "normalizedSequenceSha256", "collationDigest"
  ]) {
    if (!SHA256_PATTERN.test(collation[key])) fail(`${label}.${key} is invalid`);
  }
  const isNormalizedCandidate = collation.result === "normalized_correspondence_observed_not_exact_transcription";
  const isExactGlyphCandidate = collation.result
    === "exact_glyph_correspondence_observed_nonexpert_not_verified_collation";
  if (isNormalizedCandidate) {
    if (collation.comparisonNormalization
      !== "remove_punctuation_and_map_observed_glyph_variants_to_pinned_transcription_for_comparison_only"
      || collation.scriptVariantPairCount <= 0
      || collation.exactGlyphSequenceEqual !== false
      || collation.carrierGlyphSequenceSha256 === collation.transcriptionGlyphSequenceSha256
      || collation.transcriptionGlyphSequenceSha256 !== collation.normalizedSequenceSha256) {
      fail(`${label} must disclose glyph drift before comparison normalization`);
    }
  } else if (isExactGlyphCandidate) {
    if (collation.comparisonNormalization !== "none_direct_exact_glyph_sequence_observation"
      || collation.scriptVariantPairCount !== 0
      || collation.punctuationDifferenceObserved !== false
      || collation.exactGlyphSequenceEqual !== true
      || collation.carrierGlyphSequenceSha256 !== collation.transcriptionGlyphSequenceSha256
      || collation.transcriptionGlyphSequenceSha256 !== collation.normalizedSequenceSha256) {
      fail(`${label} exact-glyph observation cannot imply normalization or a verified collation`);
    }
  } else {
    fail(`${label}.result is not an allowed nonexpert comparison candidate state`);
  }
  const expectedDigest = computeFacsimileCollationCandidateDigest(collation);
  if (collation.collationDigest !== expectedDigest) {
    fail(`${label}.collationDigest expected ${expectedDigest}, got ${collation.collationDigest}`);
  }
}

function verifyCandidate(candidate, lock, topicIds) {
  const label = candidate.candidateId;
  assertExactKeys(candidate, [
    "candidateId", "bindingId", "evidenceSubjectId", "sourceId", "workIdentity", "editionIdentity",
    "carrierIdentity", "quoteCandidates", "facsimileAnchors", "facsimileCollationCandidates",
    "rightsObservation", "reviewState", "candidateDigest"
  ], label);
  for (const key of ["bindingId", "evidenceSubjectId", "sourceId"]) {
    if (candidate[key] !== lock[key]) fail(`${label}.${key} does not match the current registry lock`);
  }

  assertExactKeys(candidate.workIdentity, ["title", "attributedAuthor", "workRightsObservation"], `${label}.workIdentity`);
  assertNonEmptyString(candidate.workIdentity.title, `${label}.workIdentity.title`);
  assertNonEmptyString(candidate.workIdentity.attributedAuthor, `${label}.workIdentity.attributedAuthor`);
  assertNonEmptyString(candidate.workIdentity.workRightsObservation, `${label}.workIdentity.workRightsObservation`);

  assertExactKeys(candidate.editionIdentity, ["title", "editionStatus", "facsimileComparisonStatus"], `${label}.editionIdentity`);
  if (candidate.editionIdentity.editionStatus !== "not_independently_collated"
    || candidate.editionIdentity.facsimileComparisonStatus !== "visual_correspondence_only_not_collated") {
    fail(`${label}.editionIdentity must remain visually corroborated but not independently collated`);
  }

  const carrier = candidate.carrierIdentity;
  assertExactKeys(carrier, [
    "provider", "carrierType", "pageId", "pageTitle", "permanentUrl", "revisionId", "parentRevisionId",
    "revisionTimestamp", "mediaWikiSha1", "contentModel", "contentFormat", "rawWikitextCharacters",
    "rawWikitextUtf8Bytes", "rawWikitextSha256", "sourceBodyStored", "storagePolicy"
  ], `${label}.carrierIdentity`);
  for (const key of [
    "pageId", "pageTitle", "revisionId", "parentRevisionId", "revisionTimestamp", "mediaWikiSha1",
    "rawWikitextCharacters", "rawWikitextUtf8Bytes", "rawWikitextSha256"
  ]) {
    if (carrier[key] !== lock[key]) fail(`${label}.carrierIdentity.${key} does not match the acquired revision lock`);
  }
  if (carrier.provider !== "Chinese Wikisource" || carrier.carrierType !== "link_only"
    || carrier.contentModel !== "wikitext" || carrier.contentFormat !== "text/x-wiki"
    || carrier.sourceBodyStored !== false || carrier.storagePolicy !== "link_only") {
    fail(`${label}.carrierIdentity must remain a link-only Wikisource wikitext receipt`);
  }
  if (!URL.canParse(carrier.permanentUrl) || !carrier.permanentUrl.includes(`oldid=${carrier.revisionId}`)) {
    fail(`${label}.carrierIdentity.permanentUrl must bind the exact oldid`);
  }
  if (!SHA1_PATTERN.test(carrier.mediaWikiSha1) || !SHA256_PATTERN.test(carrier.rawWikitextSha256)) {
    fail(`${label}.carrierIdentity digests are invalid`);
  }

  if (!Array.isArray(candidate.quoteCandidates) || candidate.quoteCandidates.length !== lock.quoteLocks.length) {
    fail(`${label}.quoteCandidates count does not match the acquired quote locks`);
  }
  candidate.quoteCandidates.forEach((quote, index) => verifyQuoteCandidate(quote, lock.quoteLocks[index], label, topicIds));

  const expectedFacsimileLocks = EXPECTED_FACSIMILE_LOCKS[label];
  if (!Array.isArray(candidate.facsimileAnchors)
    || candidate.facsimileAnchors.length !== expectedFacsimileLocks.length) {
    fail(`${label}.facsimileAnchors count does not match the fail-closed public carrier locks`);
  }
  const quoteIds = new Set(candidate.quoteCandidates.map((quote) => quote.quoteCandidateId));
  candidate.facsimileAnchors.forEach((anchor, index) => {
    verifyFacsimileAnchor(anchor, expectedFacsimileLocks[index], label, quoteIds);
  });
  const expectedCollations = EXPECTED_COLLATION_CANDIDATE_LOCKS[label];
  if (!Array.isArray(candidate.facsimileCollationCandidates)
    || candidate.facsimileCollationCandidates.length !== expectedCollations.length) {
    fail(`${label}.facsimileCollationCandidates count does not match the acquired collation candidates`);
  }
  candidate.facsimileCollationCandidates.forEach((collation, index) => {
    const anchor = candidate.facsimileAnchors.find((entry) => entry.anchorId === collation.anchorId);
    if (!anchor) fail(`${label}/${collation.collationCandidateId} references an unknown facsimile anchor`);
    verifyFacsimileCollationCandidate(
      collation,
      expectedCollations[index],
      candidate,
      anchor
    );
  });

  const rights = candidate.rightsObservation;
  assertExactKeys(rights, [
    "workLayer", "editionLayer", "carrierLayer", "licenseOrNoticeObserved", "evidenceRefs",
    "rightsReviewAttestations", "distributionDecision", "legalConclusion"
  ], `${label}.rightsObservation`);
  if (rights.workLayer !== "candidate_only" || rights.editionLayer !== "unknown"
    || rights.carrierLayer !== "terms_observed_human_review_required"
    || rights.distributionDecision !== "link_only" || rights.legalConclusion !== "not_established"
    || !Array.isArray(rights.rightsReviewAttestations) || rights.rightsReviewAttestations.length !== 0) {
    fail(`${label}.rightsObservation must remain unreviewed, link-only, and legally unestablished`);
  }
  if (!Array.isArray(rights.evidenceRefs) || rights.evidenceRefs.length < 3
    || rights.evidenceRefs.some((ref) => typeof ref !== "string" || !URL.canParse(ref))) {
    fail(`${label}.rightsObservation.evidenceRefs must contain auditable public URLs`);
  }

  const review = candidate.reviewState;
  assertExactKeys(review, [
    "bindingCandidateState", "sourceIdentityBeyondRevisionMetadata", "contentTruth", "expertReviewIds",
    "frozenAt", "supersedes", "supersededBy"
  ], `${label}.reviewState`);
  if (review.bindingCandidateState !== "revision_locator_quote_hash_and_facsimile_anchor_verified_candidate"
    || review.sourceIdentityBeyondRevisionMetadata !== "facsimile_anchor_observed_identity_not_established"
    || review.contentTruth !== "not_established"
    || !Array.isArray(review.expertReviewIds) || review.expertReviewIds.length !== 0
    || review.frozenAt !== null || review.supersedes !== null || review.supersededBy !== null) {
    fail(`${label}.reviewState cannot imply a frozen binding, source identity, content truth, or expert review`);
  }
  const expectedDigest = computeCandidateDigest(candidate);
  if (candidate.candidateDigest !== expectedDigest) {
    fail(`${label}.candidateDigest expected ${expectedDigest}, got ${candidate.candidateDigest}`);
  }
}

export function verifyBaziSourceBindingCandidateLedger(ledger) {
  assertExactKeys(ledger, [
    "schemaVersion", "recordType", "ledgerId", "status", "acquiredAt", "accessBoundary",
    "facsimileInspectedAt", "facsimileCollationInspectedAt", "facsimileAccessBoundary",
    "conceptualTopicMapping", "candidates",
    "gateSummary", "doesNotEstablish", "ledgerDigest"
  ], "ledger");
  if (ledger.schemaVersion !== "1.5.0"
    || ledger.recordType !== "bazi_strength_source_binding_candidate_ledger"
    || ledger.ledgerId !== "hakimi.bazi.strength.source-binding-candidates/1.5.0"
    || ledger.status !== "research_candidates_only"
    || Number.isNaN(Date.parse(ledger.acquiredAt))
    || Number.isNaN(Date.parse(ledger.facsimileInspectedAt))
    || Number.isNaN(Date.parse(ledger.facsimileCollationInspectedAt))) {
    fail("ledger identity or acquiredAt is invalid");
  }

  assertExactKeys(ledger.accessBoundary, [
    "provider", "apiEndpoint", "publicReadOnly", "authenticatedAccessUsed", "accessControlBypassed",
    "sourceBodiesStored", "quoteTextsStored"
  ], "ledger.accessBoundary");
  if (ledger.accessBoundary.provider !== "Chinese Wikisource public MediaWiki API"
    || ledger.accessBoundary.apiEndpoint !== "https://zh.wikisource.org/w/api.php"
    || ledger.accessBoundary.publicReadOnly !== true
    || ledger.accessBoundary.authenticatedAccessUsed !== false
    || ledger.accessBoundary.accessControlBypassed !== false
    || ledger.accessBoundary.sourceBodiesStored !== false
    || ledger.accessBoundary.quoteTextsStored !== false) {
    fail("accessBoundary must remain public, read-only, unauthenticated, and hash-only");
  }

  assertExactKeys(ledger.facsimileAccessBoundary, [
    "provider", "apiEndpoints", "publicReadOnly", "authenticatedAccessUsed", "accessControlBypassed",
    "repositoryCarrierFilesStored", "repositoryPageImagesStored", "repositoryInspectionDerivativesStored",
    "storagePolicy"
  ], "ledger.facsimileAccessBoundary");
  if (ledger.facsimileAccessBoundary.provider !== "Wikimedia Commons and Chinese Wikisource public APIs"
    || JSON.stringify(ledger.facsimileAccessBoundary.apiEndpoints) !== JSON.stringify([
      "https://commons.wikimedia.org/w/api.php",
      "https://zh.wikisource.org/w/api.php"
    ])
    || ledger.facsimileAccessBoundary.publicReadOnly !== true
    || ledger.facsimileAccessBoundary.authenticatedAccessUsed !== false
    || ledger.facsimileAccessBoundary.accessControlBypassed !== false
    || ledger.facsimileAccessBoundary.repositoryCarrierFilesStored !== false
    || ledger.facsimileAccessBoundary.repositoryPageImagesStored !== false
    || ledger.facsimileAccessBoundary.repositoryInspectionDerivativesStored !== false
    || ledger.facsimileAccessBoundary.storagePolicy !== "link_only") {
    fail("facsimileAccessBoundary must remain public, unauthenticated, link-only, and repository-empty");
  }

  const topicIds = new Set(Object.keys(TOPIC_BINDING_MAP));
  if (!Array.isArray(ledger.conceptualTopicMapping) || ledger.conceptualTopicMapping.length !== topicIds.size) {
    fail("conceptualTopicMapping must contain exactly the three audit topics");
  }
  ledger.conceptualTopicMapping.forEach((mapping, index) => {
    assertExactKeys(mapping, ["topicId", "currentBindingIds", "mappingState", "note"], `conceptualTopicMapping[${index}]`);
    const expectedBindings = TOPIC_BINDING_MAP[mapping.topicId];
    if (!expectedBindings) fail(`conceptualTopicMapping[${index}] contains an unknown topic`);
    assertExactArray(mapping.currentBindingIds, expectedBindings, `${mapping.topicId}.currentBindingIds`);
    assertNonEmptyString(mapping.mappingState, `${mapping.topicId}.mappingState`);
    assertNonEmptyString(mapping.note, `${mapping.topicId}.note`);
  });
  assertExactArray(ledger.conceptualTopicMapping.map((mapping) => mapping.topicId), [...topicIds], "conceptual topic order");

  if (!Array.isArray(ledger.candidates)) fail("candidates must be an array");
  assertExactArray(ledger.candidates.map((candidate) => candidate.candidateId), EXPECTED_CANDIDATE_ORDER, "candidate order");
  ledger.candidates.forEach((candidate) => verifyCandidate(candidate, EXPECTED_SOURCE_LOCKS[candidate.candidateId], topicIds));

  assertExactKeys(ledger.gateSummary, [
    "bindingRequired", "bindingFrozenVerified", "candidateBindingCount", "corroboratingFacsimileAnchors",
    "visualPageCorrespondencesObserved", "normalizedFacsimileCollationCandidatesObserved",
    "exactGlyphFacsimileCorrespondenceCandidatesObserved",
    "exactFacsimileCollationsVerified", "independentHumanFacsimileCollationsVerified", "sourceBodiesStored",
    "quoteTextsStored", "rightsReviewsVerified", "expertReviewsVerified", "sourceBundleComplete",
    "rightsBundleComplete", "releaseReady", "publicDeploymentAuthorized", "expertClaimsAuthorized"
  ], "gateSummary");
  const expectedGate = {
    bindingRequired: 12,
    bindingFrozenVerified: 0,
    candidateBindingCount: 4,
    corroboratingFacsimileAnchors: 5,
    visualPageCorrespondencesObserved: 7,
    normalizedFacsimileCollationCandidatesObserved: 7,
    exactGlyphFacsimileCorrespondenceCandidatesObserved: 1,
    exactFacsimileCollationsVerified: 0,
    independentHumanFacsimileCollationsVerified: 0,
    sourceBodiesStored: 0,
    quoteTextsStored: 0,
    rightsReviewsVerified: 0,
    expertReviewsVerified: 0,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  };
  for (const [key, expected] of Object.entries(expectedGate)) {
    if (ledger.gateSummary[key] !== expected) fail(`gateSummary.${key} expected ${expected}`);
  }

  assertExactArray(ledger.doesNotEstablish, [
    "source_identity_beyond_public_revision_metadata",
    "edition_fidelity_to_facsimile",
    "exact_transcription_identity",
    "independent_human_facsimile_collation",
    "quote_redistribution_permission",
    "content_truth",
    "expert_truth",
    "rights_legal_conclusion",
    "release_readiness",
    "public_release_authorization"
  ], "doesNotEstablish");
  if (!SHA256_PATTERN.test(ledger.ledgerDigest)) fail("ledgerDigest is invalid");
  const expectedLedgerDigest = computeLedgerDigest(ledger);
  if (ledger.ledgerDigest !== expectedLedgerDigest) {
    fail(`ledgerDigest expected ${expectedLedgerDigest}, got ${ledger.ledgerDigest}`);
  }
  return ledger;
}
