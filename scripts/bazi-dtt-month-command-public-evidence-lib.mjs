import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import { verifyBaziSourceBindingCandidateLedger } from "./bazi-source-binding-candidate-lib.mjs";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";
import { verifyBaziPrcCopyrightLawPublicEvidenceArtifact } from "./bazi-prc-copyright-law-public-evidence-lib.mjs";

export const BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH =
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json";

const BASIS_RELATIVE_PATH = "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md";
const MAX_ARTIFACT_BYTES = 1_000_000;
const MAX_PARENT_BYTES = 1_000_000;
const MAX_BASIS_BYTES = 1_000_000;
const MAX_INPUT_NODES = 100_000;
const MAX_INPUT_DEPTH = 64;
const MAX_INPUT_TEXT = 1_000_000;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const OBSERVATION_ID = "hakimi.bazi.dtt-month-command-public-evidence/2026-08-29T15:17:27.103Z";
const EXPECTED_OBSERVATION_DIGEST = "01e61e4f77526270ef83a0d95fbcb165bf307d5efa09c5a0360ff49bf1735993";

const OBSERVATION_RAW_IDENTITY = Object.freeze({
  rawBytes: 31_062,
  rawSha256: "85788506067b50453545ec786c7a47b0e51a4cf004419cbe8c547f9384c01ae6"
});

const BASIS_IDENTITY = Object.freeze({
  "path": "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "role": "non_authoritative_link_hash_only_operator_recorded_narrative_basis",
  "rawBytes": 10165,
  "rawSha256": "9d0c09d9add17785f41bfdb56628771c12b091b9b0ef3db7caef558a270140cb"
});

const EXPECTED_SOURCE_PARENT = Object.freeze({
  "path": "content/bazi-strength-source-binding-candidates.v1.json",
  "rawBytes": 47753,
  "rawSha256": "e2ac6a7a0ea1209dd92a38dfae82c494df4792da1a102c11d2fdb2caa80e41f7",
  "ledgerId": "hakimi.bazi.strength.source-binding-candidates/1.5.0",
  "ledgerDigest": "44ed9e23490c11c625602b77574efbf7331305bd1bf87634c5b91f568e8b85af",
  "sourceCandidateId": "dtt-chanwei-wikisource-r2600158-candidate-v1",
  "sourceCandidateDigest": "26182f43d801dedb7433e53d8e390efc32195ef08555199d933e36a1ed65ca61",
  "parentMutated": false,
  "parentBacklinkAdded": false
});
const EXPECTED_RIGHTS_PARENT = Object.freeze({
  "path": "content/bazi-strength-source-rights-candidates.v1.json",
  "rawBytes": 20806,
  "rawSha256": "433116caf1a2b9c233739093b0a2436f13c7f268dfa8af6c1ce481964b48b179",
  "ledgerId": "hakimi.bazi.strength.source-rights-candidates/1.1.0",
  "ledgerDigest": "3776e4b8799ca5221c1765a735c3e34c637b4f4952c9243836fedfbf1ee30a36",
  "rightsCandidateId": "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
  "rightsCandidateDigest": "631f530ded6a17652c8a419246805b278d0f6f5511b96a1fd6274f386fce633d",
  "parentMutated": false,
  "parentBacklinkAdded": false
});
const EXPECTED_RELATED_LAW = Object.freeze({
  "path": "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "rawBytes": 19961,
  "rawSha256": "c0e91874bd0b9e7c99d4db2b79df1e68c483fc1e68ed06700be44d5bf6bc10cf",
  "observationId": "hakimi.bazi.source-rights.prc-copyright-law-public-evidence/1.0.0",
  "observationDigest": "f2cbbbf2d34b6f6ee69272805799def74f582f0058de8cfbab3321a84a44146c",
  "relation": "one_way_rule_observation_reference_only",
  "candidateSpecificLegalApplicationEstablished": false,
  "legalConclusionEstablished": false
});
const RELEASE_GOVERNANCE = Object.freeze({
  "activeLine": "legacy-v13",
  "targetSchema": 13,
  "migrationId": null,
  "mutationEpochBoundaryRequired": true,
  "publicDeploymentAuthorized": false,
  "expertClaimsAuthorized": false
});
const EXPECTED_CATALOG_FIELDS = Object.freeze({
  "subjectLock": {
    "bindingId": "binding:dtt:month-command",
    "evidenceSubjectId": "bazi.strength.binding.dtt.month-command.v1",
    "sourceId": "dtt-chanwei-wikisource-r2600158",
    "sourceCandidateId": "dtt-chanwei-wikisource-r2600158-candidate-v1",
    "rightsCandidateId": "dtt-chanwei-wikisource-r2600158-rights-candidate-v1",
    "selectedQuoteCandidate": {
      "quoteCandidateId": "dtt-yueling-minimal-v1",
      "heading": "十五、月令",
      "rawRevisionLineStart": 2391,
      "rawRevisionLineEnd": 2391,
      "rawCharacterStartZeroBased": 38616,
      "rawCharacterEndExclusive": 38628,
      "quoteCharacters": 12,
      "quoteUtf8Bytes": 36,
      "quoteSha256": "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9",
      "occurrenceCountInPinnedRevision": 1,
      "quoteTextStored": false
    },
    "selectedNormalizedCollationCandidates": [
      {
        "collationCandidateId": "dtt-yueling-ssid-11335994-page-170-normalized-collation-v1",
        "anchorId": "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
        "pageRefId": "dtt-ssid-11335994-pdf-page-170",
        "quoteCandidateId": "dtt-yueling-minimal-v1",
        "observedAt": "2026-08-25T18:48:11.944Z",
        "carrierSha256": "d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803",
        "transcriptionQuoteSha256": "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9",
        "carrierGlyphSequenceSha256": "23440d78a05ca6d7c97d3c45261f8f4970a5a4fae6b5b90fa46e7c3204b3fe28",
        "transcriptionGlyphSequenceSha256": "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
        "normalizedSequenceCharacters": 11,
        "normalizedSequenceSha256": "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
        "scriptVariantPairCount": 1,
        "punctuationDifferenceObserved": true,
        "exactGlyphSequenceEqual": false,
        "result": "normalized_correspondence_observed_not_exact_transcription",
        "humanCollatorAttestationCount": 0,
        "domainExpertReviewCount": 0,
        "rightsEffect": "none",
        "bindingFreezeEffect": "none",
        "collationDigest": "154645461e0b47de7a04c660f7f56a89493e8ce8722fc6041f5baabaff936bc9"
      },
      {
        "collationCandidateId": "dtt-yueling-cadal-07005210-page-178-normalized-collation-v1",
        "anchorId": "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
        "pageRefId": "dtt-cadal-07005210-djvu-page-178",
        "quoteCandidateId": "dtt-yueling-minimal-v1",
        "observedAt": "2026-08-25T20:17:10.106Z",
        "carrierSha256": "1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60",
        "transcriptionQuoteSha256": "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9",
        "carrierGlyphSequenceSha256": "23440d78a05ca6d7c97d3c45261f8f4970a5a4fae6b5b90fa46e7c3204b3fe28",
        "transcriptionGlyphSequenceSha256": "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
        "normalizedSequenceCharacters": 11,
        "normalizedSequenceSha256": "53d755230c068c883d93a77eae1f216e050a56cd57ac1021710a65df12c5e159",
        "scriptVariantPairCount": 1,
        "punctuationDifferenceObserved": true,
        "exactGlyphSequenceEqual": false,
        "result": "normalized_correspondence_observed_not_exact_transcription",
        "humanCollatorAttestationCount": 0,
        "domainExpertReviewCount": 0,
        "rightsEffect": "none",
        "bindingFreezeEffect": "none",
        "collationDigest": "b4ef49ed4c0369c12c97137370481059860068d068444a00f8b552a54adbc5d0"
      }
    ],
    "projectedQuoteCandidateCount": 1,
    "projectedNormalizedCollationCandidateCount": 2,
    "otherQuoteCandidatesProjected": 0,
    "otherCollationCandidatesProjected": 0
  },
  "operatorRecordedCapturePolicy": {
    "access": "public_read_only_unauthenticated_https_get",
    "captureImplementation": "powershell_invoke_webrequest_rawcontentstream_and_transient_outfile_sha256",
    "userAgent": "HakimiDttPublicEvidenceAudit/1.0 (public read-only; no credentials)",
    "credentialsUsed": false,
    "loginOrProtectedBackendUsed": false,
    "accessControlBypassed": false,
    "apiResponseBodiesHashedInMemory": true,
    "carrierFilesHashedFromBoundaryCheckedSystemTemporaryDirectory": true,
    "temporaryCarrierFilesDeletedAfterHashing": true,
    "captureExecutionReceiptStored": false,
    "wireBytesCaptured": false,
    "tlsPeerCertificateCaptured": false
  },
  "operatorRecordedCaptures": {
    "primaryCaptureStartedAt": "2026-08-29T15:17:27.103Z",
    "primaryCaptureCompletedAt": "2026-08-29T15:17:44.685Z",
    "wikisource": {
      "requestedUrl": "https://zh.wikisource.org/w/api.php?action=query&format=json&formatversion=2&prop=revisions&revids=2600158&rvprop=ids%7Ctimestamp%7Csha1%7Ccontentmodel%7Ccontent&rvslots=main",
      "requestStartedAt": "2026-08-29T15:17:27.115Z",
      "requestCompletedAt": "2026-08-29T15:17:29.109Z",
      "httpStatus": 200,
      "redirected": false,
      "contentType": "application/json",
      "deliveredDecodedBodyBytes": 413611,
      "deliveredDecodedBodySha256": "50a6dcd01360f2cf48df8ca0fe51db7b4e87255505b1aa530506ba307b56e7e9",
      "pageId": 340255,
      "revisionId": 2600158,
      "parentRevisionId": 1163183,
      "revisionTimestamp": "2025-09-25T13:22:02Z",
      "mediaWikiSha1": "6ac3dc412881525c2c0544b75e51512cc0daa573",
      "contentModel": "wikitext",
      "contentFormat": "text/x-wiki",
      "rawWikitextCharacters": 143701,
      "rawWikitextUtf8Bytes": 401801,
      "rawWikitextSha256": "1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d",
      "selectedQuoteLocatorMatchesParent": true,
      "oldidMainSlotPdOldLiteralObserved": false,
      "responseBodyStored": false,
      "sourceBodyStored": false
    },
    "commonsImageInfo": {
      "requestedUrl": "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=info%7Cimageinfo&inprop=url&titles=File%3ASSID-11335994%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf%7CFile%3ACADAL07005210%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu&iiprop=timestamp%7Cuser%7Cuserid%7Csize%7Csha1%7Cmime%7Cmediatype%7Cextmetadata%7Curl",
      "requestStartedAt": "2026-08-29T15:17:29.268Z",
      "requestCompletedAt": "2026-08-29T15:17:30.434Z",
      "httpStatus": 200,
      "redirected": false,
      "contentType": "application/json",
      "deliveredDecodedBodyBytes": 5215,
      "deliveredDecodedBodySha256": "9bc0b63a255ff926fd7154a4de8495eb06f4066a670f7157f6976a914359bfc1",
      "responseBodyStored": false
    },
    "commonsFilePageRevisions": {
      "requestedUrl": "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=revisions&revids=708090379%7C1104458375&rvprop=ids%7Ctimestamp%7Csha1%7Ccontent&rvslots=main",
      "requestStartedAt": "2026-08-29T15:17:30.447Z",
      "requestCompletedAt": "2026-08-29T15:17:31.763Z",
      "httpStatus": 200,
      "redirected": false,
      "contentType": "application/json",
      "deliveredDecodedBodyBytes": 2633,
      "deliveredDecodedBodySha256": "f1b2082c7d64b90fdc1da44525a82faedcfdc27f4c9475f22f62f54463a7a17b",
      "responseBodyStored": false
    },
    "renderedNoticeDependencies": {
      "parseRequestedUrl": "https://zh.wikisource.org/w/api.php?action=parse&format=json&formatversion=2&oldid=2600158&prop=templates",
      "parseRequestStartedAt": "2026-08-29T15:21:32.094Z",
      "parseRequestCompletedAt": "2026-08-29T15:21:33.589Z",
      "parseHttpStatus": 200,
      "parseDeliveredDecodedBodyBytes": 876,
      "parseDeliveredDecodedBodySha256": "f010e2cc374b0290222c7499c6e6461b3bdb809c04303536de16be4632b4ad51",
      "renderedTemplateNamesObserved": [
        "Template:License",
        "Template:PD-old",
        "Template:清朝作品"
      ],
      "sourceOldidMainSlotLiteralTemplateNamesObserved": [
        "Template:清朝作品"
      ],
      "oldidMainSlotPdOldLiteralObserved": false,
      "renderedPagePdOldDependencyObserved": true,
      "dependencyRequestedUrl": "https://zh.wikisource.org/w/api.php?action=query&format=json&formatversion=2&prop=revisions&revids=2636660%7C2636674%7C2319541&rvprop=ids%7Ctimestamp%7Csha1%7Ccontent&rvslots=main",
      "dependencyRequestStartedAt": "2026-08-29T15:21:33.605Z",
      "dependencyRequestCompletedAt": "2026-08-29T15:21:34.760Z",
      "dependencyHttpStatus": 200,
      "dependencyDeliveredDecodedBodyBytes": 1839,
      "dependencyDeliveredDecodedBodySha256": "9cc78b51e9bc7a0fb6be0597695e1309c2a2a7929cfa38e1bca2dccde66a6f36",
      "dependencies": [
        {
          "title": "Template:License",
          "revisionId": 2319541,
          "parentRevisionId": 2319540,
          "revisionTimestamp": "2023-10-11T02:02:11Z",
          "mediaWikiSha1": "f305bdff00d9a651947405734114571cae449c05",
          "mainSlotUtf8Bytes": 67,
          "mainSlotSha256": "098ae242ed74142f59b2f167e6e2e7f692eba1ccc8e815cdc4a64f1c0d046ab2",
          "bodyStored": false
        },
        {
          "title": "Template:PD-old",
          "revisionId": 2636674,
          "parentRevisionId": 2636461,
          "revisionTimestamp": "2025-12-27T10:41:21Z",
          "mediaWikiSha1": "c2c6e6c001f87a344f0a326a547342a5e640b477",
          "mainSlotUtf8Bytes": 760,
          "mainSlotSha256": "6511e0973086c81d1a0b44d174e97c9c4d9ef9d647685d6f7e091d3215b8bbf2",
          "bodyStored": false
        },
        {
          "title": "Template:清朝作品",
          "revisionId": 2636660,
          "parentRevisionId": 2456276,
          "revisionTimestamp": "2025-12-27T10:26:34Z",
          "mediaWikiSha1": "93659245fc7282b3273f8b4741053c7e38591c32",
          "mainSlotUtf8Bytes": 135,
          "mainSlotSha256": "d35b76fbe13cd68917a1b1287b56d09d30e3fd8ad4dbd1c1587261f6bce96eaa",
          "bodyStored": false
        }
      ],
      "dependencyRevisionsPinnedAtCapture": true,
      "oldidAlonePinsRenderedNotice": false,
      "responseBodiesStored": 0
    },
    "cadalAllSlots": {
      "requestedUrl": "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=revisions&revids=1104458375&rvprop=ids%7Ctimestamp%7Csha1%7Csize%7Ccontentmodel%7Ccontent&rvslots=*",
      "requestStartedAt": "2026-08-29T15:28:56.053Z",
      "requestCompletedAt": "2026-08-29T15:28:57.881Z",
      "httpStatus": 200,
      "redirected": false,
      "contentType": "application/json",
      "deliveredDecodedBodyBytes": 4238,
      "deliveredDecodedBodySha256": "473117b638a05f8b08204eee8b3031ce803083ffca4634fc67545b899fb08060",
      "pageId": 126125545,
      "revisionId": 1104458375,
      "parentRevisionId": 841608363,
      "revisionTimestamp": "2025-10-24T20:27:06Z",
      "revisionAggregateMediaWikiSha1": "3df322a75e5f71d1772344c139dcf21833d5534b",
      "revisionAggregateSize": 4306,
      "mainSlotContentModel": "wikitext",
      "mainSlotCharacters": 883,
      "mainSlotUtf8Bytes": 975,
      "mainSlotSha256": "30194bbd8c92409dc8efb02f536b0909a6b29fa793528bc6ac81063bb04bc001",
      "mediaInfoSlotContentModel": "wikibase-mediainfo",
      "mediaInfoSlotContentFormat": "application/json",
      "mediaInfoSlotCharacters": 2402,
      "mediaInfoSlotUtf8Bytes": 2402,
      "mediaInfoSlotSha256": "cb1703b72f307f1a12f9efed976d1e95d9e39bd94554f037d465c21f410a4394",
      "mainSlotBodyStored": false,
      "mediaInfoSlotBodyStored": false,
      "mediaInfoCountsAsIndependentRightsSource": false,
      "responseBodyStored": false
    },
    "wikisourcePageNamespaceProbe": {
      "requestedUrl": "https://zh.wikisource.org/w/api.php?action=query&format=json&formatversion=2&prop=info&titles=Index%3ASSID-11335994%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf%7CPage%3ASSID-11335994%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf%2F170%7CPage%3ASSID-11335994%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf%2F176%7CIndex%3ACADAL07005210%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu%7CPage%3ACADAL07005210%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu%2F178%7CPage%3ACADAL07005210%20%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu%2F184",
      "requestStartedAt": "2026-08-29T15:28:57.924Z",
      "requestCompletedAt": "2026-08-29T15:28:59.016Z",
      "httpStatus": 200,
      "redirected": false,
      "contentType": "application/json",
      "deliveredDecodedBodyBytes": 1179,
      "deliveredDecodedBodySha256": "b6bb339591b4a605f104c54070839da3dee0eb0133c4dd35ebc2efdc9ad8a56c",
      "titles": [
        {
          "title": "Index:SSID-11335994 滴天髓闡微.pdf",
          "namespaceId": 106,
          "missing": true,
          "pageId": null
        },
        {
          "title": "Page:SSID-11335994 滴天髓闡微.pdf/170",
          "namespaceId": 104,
          "missing": true,
          "pageId": null
        },
        {
          "title": "Page:SSID-11335994 滴天髓闡微.pdf/176",
          "namespaceId": 104,
          "missing": true,
          "pageId": null
        },
        {
          "title": "Index:CADAL07005210 滴天髓闡微.djvu",
          "namespaceId": 106,
          "missing": true,
          "pageId": null
        },
        {
          "title": "Page:CADAL07005210 滴天髓闡微.djvu/178",
          "namespaceId": 104,
          "missing": true,
          "pageId": null
        },
        {
          "title": "Page:CADAL07005210 滴天髓闡微.djvu/184",
          "namespaceId": 104,
          "missing": true,
          "pageId": null
        }
      ],
      "exactTitleCount": 6,
      "missingTitleCount": 6,
      "pointInTimeOnly": true,
      "responseBodyStored": false
    }
  },
  "policyRevisionReferences": [
    {
      "policyId": "wmf-terms-r554823",
      "provider": "Wikimedia Foundation Governance Wiki",
      "permanentUrl": "https://foundation.wikimedia.org/w/index.php?title=Policy%3ATerms_of_Use&oldid=554823#7._Licensing_of_Content",
      "pageId": 21261,
      "revisionId": 554823,
      "parentRevisionId": 554674,
      "revisionTimestamp": "2026-02-21T02:54:13Z",
      "mediaWikiSha1": "2ed02699a89770800d4297b97a3b61d07bce2588",
      "source": "parent_source_rights_ledger_projection",
      "applicabilityEstablished": false,
      "legalConclusion": "not_established"
    },
    {
      "policyId": "cc-by-sa-4.0-legal-code",
      "provider": "Creative Commons",
      "permanentUrl": "https://creativecommons.org/licenses/by-sa/4.0/legalcode",
      "pageId": null,
      "revisionId": null,
      "parentRevisionId": null,
      "revisionTimestamp": null,
      "mediaWikiSha1": null,
      "source": "parent_source_rights_ledger_projection",
      "applicabilityEstablished": false,
      "legalConclusion": "not_established"
    },
    {
      "policyId": "commons-reuse-r1259943424",
      "provider": "Wikimedia Commons",
      "permanentUrl": "https://commons.wikimedia.org/w/index.php?title=Commons%3AReusing_content_outside_Wikimedia&oldid=1259943424",
      "pageId": 1130401,
      "revisionId": 1259943424,
      "parentRevisionId": 1259943327,
      "revisionTimestamp": "2026-08-11T22:45:52Z",
      "mediaWikiSha1": "76bb7ffb1b9561c3a83b684d6f69d502ca050ef6",
      "source": "parent_source_rights_ledger_projection",
      "applicabilityEstablished": false,
      "legalConclusion": "not_established"
    }
  ],
  "sourceGroupAccounting": {
    "operatorRecordedSourceGroupCount": 2,
    "operatorRecordedSourceGroupIds": [
      "DTT_WIKISOURCE_REVISION_2600158_FAMILY",
      "DTT_COMMONS_METADATA_AND_HOSTING_FAMILY"
    ],
    "distinctCarrierByteIdentityCount": 2,
    "commonsUpstreamGroupCount": 1,
    "observedSameUploaderAccountLabelAndIdPairCount": 1,
    "sharedUploaderLabel": "Bot for Freedom",
    "sharedUploaderId": 11190818,
    "sharedUploaderIdentityVerified": false,
    "independentEditionWitnessCount": 0,
    "independentRightsSourceCount": 0,
    "mediaInfoCountsAsIndependentRightsSource": false,
    "twoCarriersCountAsTwoIndependentEditions": false,
    "twoCarriersCountAsTwoIndependentLegalOpinions": false
  },
  "carrierObservations": [
    {
      "anchorId": "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
      "carrierFilePageId": 125728441,
      "carrierFileTitle": "File:SSID-11335994 滴天髓闡微.pdf",
      "carrierDescriptionUrl": "https://commons.wikimedia.org/wiki/File:SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf",
      "currentFilePageRevisionId": 708090379,
      "fixedFilePageRevisionId": 708090379,
      "fixedFilePageRevisionTimestamp": "2022-11-20T09:29:18Z",
      "fixedFilePageRevisionAggregateMediaWikiSha1": "781410219e98836c08901c4d66bf762dfe9d2f20",
      "fixedFilePageMainSlotCharacters": 901,
      "fixedFilePageMainSlotUtf8Bytes": 933,
      "fixedFilePageMainSlotSha256": "55d405f7cc909c4ee2f356e3bacd7da2903bc759596e6ab1cae13b58014fbc05",
      "pdScanTemplateOccurrenceCount": 1,
      "pdOldTemplateOccurrenceCount": 0,
      "categoryTokensObserved": [
        "PD Old",
        "PD-scan (PD-old)",
        "CC-PD-Mark"
      ],
      "publicDomainMarkCountsAsLicense": false,
      "topLevelNoticeObservation": "pd_scan_top_level_observed",
      "parentNoticeProjectionReestablished": true,
      "imageInfoTimestamp": "2022-11-20T09:29:18Z",
      "imageInfoUploaderLabel": "Bot for Freedom",
      "imageInfoUploaderId": 11190818,
      "uploaderIdentityVerified": false,
      "imageInfoMediaWikiSha1": "2d2e1502325c5f026be0f5618d54d8e9c254c232",
      "imageInfoBytes": 14751242,
      "imageInfoMime": "application/pdf",
      "download": {
        "requestedUrl": "https://upload.wikimedia.org/wikipedia/commons/d/db/SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf",
        "finalResponseUrl": "https://upload.wikimedia.org/wikipedia/commons/d/db/SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf",
        "requestStartedAt": "2026-08-29T15:17:31.801Z",
        "requestCompletedAt": "2026-08-29T15:17:37.601Z",
        "httpStatus": 200,
        "contentLength": 14751242,
        "etag": "ddc30202f8dd1a30450b172363630243",
        "lastModified": "Sun, 20 Nov 2022 09:29:18 GMT",
        "downloadedBytes": 14751242,
        "downloadedSha256": "d6a7d1daf6513ce9fb9940ff8331b96804c10cdafbeac00d4d3d0a37229e1803",
        "sha256MatchesParent": true
      },
      "selectedPageRef": {
        "pageRefId": "dtt-ssid-11335994-pdf-page-170",
        "scanPageNumber": 170,
        "printedPageLabel": "二八",
        "visibleHeading": "月令",
        "pageUrl": "https://commons.wikimedia.org/wiki/File:SSID-11335994_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.pdf?page=170",
        "pageId": null,
        "pageRevisionId": null,
        "pageRevisionTimestamp": null,
        "pageMediaWikiSha1": null,
        "pageTranscriptionQualityState": "not_applicable_no_page_namespace_revision"
      },
      "selectedCollationCandidateId": "dtt-yueling-ssid-11335994-page-170-normalized-collation-v1",
      "selectedCollationDigest": "154645461e0b47de7a04c660f7f56a89493e8ce8722fc6041f5baabaff936bc9",
      "repositoryCarrierFileStored": false,
      "repositoryPageImageStored": false
    },
    {
      "anchorId": "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
      "carrierFilePageId": 126125545,
      "carrierFileTitle": "File:CADAL07005210 滴天髓闡微.djvu",
      "carrierDescriptionUrl": "https://commons.wikimedia.org/wiki/File:CADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu",
      "currentFilePageRevisionId": 1104458375,
      "fixedFilePageRevisionId": 1104458375,
      "fixedFilePageRevisionTimestamp": "2025-10-24T20:27:06Z",
      "fixedFilePageRevisionParentId": 841608363,
      "fixedFilePageRevisionAggregateMediaWikiSha1": "3df322a75e5f71d1772344c139dcf21833d5534b",
      "fixedFilePageRevisionAggregateSize": 4306,
      "fixedFilePageMainSlotCharacters": 883,
      "fixedFilePageMainSlotUtf8Bytes": 975,
      "fixedFilePageMainSlotSha256": "30194bbd8c92409dc8efb02f536b0909a6b29fa793528bc6ac81063bb04bc001",
      "pdScanTemplateOccurrenceCount": 0,
      "pdOldTemplateOccurrenceCount": 1,
      "categoryTokensObserved": [
        "PD Old",
        "CC-PD-Mark"
      ],
      "publicDomainMarkCountsAsLicense": false,
      "topLevelNoticeObservation": "pd_old_top_level_observed_without_pd_scan_template",
      "parentNoticeProjectionReestablished": false,
      "imageInfoTimestamp": "2022-11-30T06:30:20Z",
      "imageInfoUploaderLabel": "Bot for Freedom",
      "imageInfoUploaderId": 11190818,
      "uploaderIdentityVerified": false,
      "imageInfoMediaWikiSha1": "e73a24aee3cfc28f22d39e795b13fe76a5a995ad",
      "imageInfoBytes": 17912324,
      "imageInfoMime": "image/vnd.djvu",
      "download": {
        "requestedUrl": "https://upload.wikimedia.org/wikipedia/commons/d/d1/CADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu",
        "finalResponseUrl": "https://upload.wikimedia.org/wikipedia/commons/d/d1/CADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu",
        "requestStartedAt": "2026-08-29T15:17:37.657Z",
        "requestCompletedAt": "2026-08-29T15:17:44.652Z",
        "httpStatus": 200,
        "contentLength": 17912324,
        "etag": "f3be2ba747b8454f560d1eac8310cedb",
        "lastModified": "Wed, 30 Nov 2022 06:30:20 GMT",
        "downloadedBytes": 17912324,
        "downloadedSha256": "1d0a16f528ed3074cdefad33b2d2f9233a47199cf88a8b02001c897e16996e60",
        "sha256MatchesParent": true
      },
      "selectedPageRef": {
        "pageRefId": "dtt-cadal-07005210-djvu-page-178",
        "scanPageNumber": 178,
        "printedPageLabel": "二八",
        "visibleHeading": "月令",
        "pageUrl": "https://commons.wikimedia.org/wiki/File:CADAL07005210_%E6%BB%B4%E5%A4%A9%E9%AB%93%E9%97%A1%E5%BE%AE.djvu?page=178",
        "pageId": null,
        "pageRevisionId": null,
        "pageRevisionTimestamp": null,
        "pageMediaWikiSha1": null,
        "pageTranscriptionQualityState": "not_applicable_no_page_namespace_revision"
      },
      "selectedCollationCandidateId": "dtt-yueling-cadal-07005210-page-178-normalized-collation-v1",
      "selectedCollationDigest": "b4ef49ed4c0369c12c97137370481059860068d068444a00f8b552a54adbc5d0",
      "mediaInfoSlotContentModel": "wikibase-mediainfo",
      "mediaInfoSlotContentFormat": "application/json",
      "mediaInfoSlotCharacters": 2402,
      "mediaInfoSlotUtf8Bytes": 2402,
      "mediaInfoSlotSha256": "cb1703b72f307f1a12f9efed976d1e95d9e39bd94554f037d465c21f410a4394",
      "mediaInfoSlotBodyStored": false,
      "mediaInfoCountsAsIndependentRightsSource": false,
      "repositoryCarrierFileStored": false,
      "repositoryPageImageStored": false
    }
  ],
  "relationBoundary": {
    "parentDescribedSame1947EditionRelationObserved": true,
    "sameEditionRelationshipIndependentlyEstablished": false,
    "twoCarrierFilesAreNotTwoIndependentEditionWitnesses": true,
    "viewerPageLocatorIsNotPageNamespaceRevision": true,
    "exactPageNamespaceTitlesProbed": 6,
    "exactPageNamespaceTitlesMissingAtCapture": 6,
    "pageNamespaceAbsenceIsPointInTimeOnly": true,
    "selectedPageNamespaceRevisionCount": 0,
    "versionIdentityEstablished": false,
    "transcriptionIdentityEstablished": false,
    "exactGlyphCollationEstablished": false,
    "humanCollationEstablished": false
  },
  "parentNoticeDiscrepancy": {
    "parentSourceLedgerStoredNoticeForBothCarriers": "commons_public_domain_and_pd_scan_notice_observed_not_adjudicated",
    "ssidCurrentFixedFilePageObservation": "pd_scan_top_level_observed",
    "cadalCurrentFixedFilePageObservation": "pd_old_top_level_observed_without_pd_scan_template",
    "affectedAnchorId": "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
    "mediaInfoIsIndependentRightsSource": false,
    "publicDomainMarkCountsAsLicense": false,
    "markerAuthorityAndAccuracyVerified": false,
    "parentNoticeProjectionReestablishedForAllCarriers": false,
    "discrepancyState": "unresolved_parent_not_mutated_reconciliation_required",
    "promotionBlocked": true,
    "rightsEffect": "none",
    "bindingFreezeEffect": "none"
  },
  "bindingBoundary": {
    "candidateEvidenceIncrementRecorded": true,
    "pinnedRevisionIdentityMatchesParentOperatorRecorded": true,
    "selectedQuoteLocatorAndHashMatchesParentOperatorRecorded": true,
    "twoFullCarrierSha256ValuesMatchParentOperatorRecorded": true,
    "sourceBodyFrozen": false,
    "exactQuoteVerifiedForFreeze": false,
    "versionAndTranscriptionIdentityEstablished": false,
    "workIdentityEstablished": false,
    "editionIdentityEstablished": false,
    "carrierIdentityEstablished": false,
    "rightsEvidenceComplete": false,
    "bindingFrozen": false,
    "bindingFrozenVerified": 0,
    "bindingRequired": 12,
    "bindingDigest": null
  },
  "storageBoundary": {
    "distributionPolicy": "link_only",
    "sourceBodiesStored": 0,
    "apiResponseBodiesStored": 0,
    "quoteTextsStored": 0,
    "pageImagesStored": 0,
    "carrierFilesStored": 0,
    "carrierGlyphSequencesStored": 0,
    "repositoryInspectionDerivativesStored": 0,
    "materializedSourcePackagesStored": 0,
    "temporaryCarrierFilesDeletedAfterHashing": true
  },
  "networkObservationBoundary": {
    "operatorRecordedNetworkFacts": true,
    "pointInTimeOnly": true,
    "publicReadOnly": true,
    "credentialsUsed": false,
    "loginOrProtectedBackendUsed": false,
    "remoteCaptureMechanicallyVerifiedByOfflineVerifier": false,
    "fullCarrierFileSha256RecomputedByOperator": true,
    "networkProvenanceEstablished": false,
    "publisherAuthenticityEstablished": false,
    "redirectChainCaptured": false,
    "wireBytesCaptured": false,
    "tlsPeerCertificateCaptured": false,
    "futureFreshnessEstablished": false
  },
  "rightsBoundary": {
    "workLayerCleared": false,
    "editionLayerCleared": false,
    "transcriptionLayerCleared": false,
    "carrierLayerCleared": false,
    "applicableTermsResolved": false,
    "noticeDiscrepancyResolved": false,
    "publicDomainMarkCountsAsLicense": false,
    "markerAuthorityAndAccuracyVerified": false,
    "formalSourceRightsRecordCount": 0,
    "formalSourceCarrierRecordCount": 0,
    "knowledgeDocumentCount": 0,
    "redistributableSourceCount": 0,
    "humanLegalReviewerIds": [],
    "legalConclusion": "not_established",
    "redistributionAuthorized": false,
    "publicRepositoryBodyInclusionAuthorized": false,
    "publicBuildInclusionAuthorized": false
  },
  "integrityBoundary": {
    "parentRawIdentitiesRecorded": true,
    "parentSemanticDigestsRecorded": true,
    "oneWayChildToParentLinksOnly": true,
    "parentFilesMutated": false,
    "parentBacklinksAdded": false,
    "centralRegistryResigned": false,
    "crossSystemReceiptsResigned": false,
    "crossFileAtomicSnapshot": false,
    "mutationEpochAvailable": false,
    "intervalMutationExcluded": false,
    "abaExcluded": false,
    "observationDigestIsDigitalSignature": false
  },
  "authorityBoundary": {
    "contentTruthEstablished": false,
    "baziRuleTruthEstablished": false,
    "sourceBundleComplete": false,
    "rightsBundleComplete": false,
    "expertReviewBundleComplete": false,
    "independentExpertReviewsVerified": 0,
    "independentExpertReviewsRequired": 2,
    "expertTruthEstablished": false,
    "fullRepositoryTypecheckPassed": false,
    "defaultWebBuildPassed": false,
    "browserOrPwaAcceptancePassed": false,
    "releaseEvidenceComplete": false,
    "deploymentAndRollbackConfirmed": false,
    "releaseReady": false,
    "publicDeploymentAuthorized": false,
    "expertClaimsAuthorized": false
  },
  "doesNotEstablish": [
    "remote_capture_authenticity",
    "publisher_authenticity",
    "work_or_edition_identity",
    "transcription_identity",
    "independent_edition_witness",
    "exact_glyph_collation",
    "content_truth",
    "bazi_rule_truth",
    "expert_truth",
    "rights_clearance",
    "legal_opinion",
    "redistribution_authority",
    "binding_freeze",
    "full_repository_typecheck",
    "default_web_build",
    "browser_or_pwa_acceptance",
    "release_evidence",
    "deployment_or_rollback",
    "release_readiness",
    "public_deployment_authorization"
  ]
});

const EXPECTED_TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion", "recordType", "observationId", "status", "observedAt", "releaseGovernance",
  "parentSourceBindingLedger", "parentSourceRightsLedger", "relatedLawObservation", "basisArtifact",
  "subjectLock", "operatorRecordedCapturePolicy", "operatorRecordedCaptures",
  "policyRevisionReferences", "sourceGroupAccounting", "carrierObservations", "relationBoundary",
  "parentNoticeDiscrepancy", "bindingBoundary", "storageBoundary", "networkObservationBoundary",
  "rightsBoundary", "integrityBoundary", "authorityBoundary", "doesNotEstablish", "observationDigest"
]);

const EXPECTED_FIELD_CODES = Object.freeze({
  subjectLock: "SUBJECT_CATALOG_MISMATCH",
  operatorRecordedCapturePolicy: "CAPTURE_POLICY_MISMATCH",
  operatorRecordedCaptures: "CAPTURE_CATALOG_MISMATCH",
  policyRevisionReferences: "POLICY_CATALOG_MISMATCH",
  sourceGroupAccounting: "SOURCE_GROUP_ACCOUNTING_INVALID",
  carrierObservations: "CARRIER_CATALOG_MISMATCH",
  relationBoundary: "RELATION_PROMOTION_FORBIDDEN",
  parentNoticeDiscrepancy: "NOTICE_DISCREPANCY_INVALID",
  bindingBoundary: "BINDING_PROMOTION_FORBIDDEN",
  storageBoundary: "STORAGE_PROMOTION_FORBIDDEN",
  networkObservationBoundary: "NETWORK_PROMOTION_FORBIDDEN",
  rightsBoundary: "RIGHTS_PROMOTION_FORBIDDEN",
  integrityBoundary: "INTEGRITY_CLAIM_INVALID",
  authorityBoundary: "AUTHORITY_PROMOTION_FORBIDDEN",
  doesNotEstablish: "DOES_NOT_ESTABLISH_MISMATCH"
});

const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset")?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;
const VERIFIED_RESULTS = new WeakSet();

export class BaziDttMonthCommandPublicEvidenceError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziDttMonthCommandPublicEvidenceError";
    Object.defineProperties(this, {
      code: { value: code, enumerable: false, configurable: false, writable: false },
      safeForCli: { value: true, enumerable: false, configurable: false, writable: false }
    });
  }
}

function fail(code, message, cause) {
  throw new BaziDttMonthCommandPublicEvidenceError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new Set();
  let count = 0;
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    count += 1;
    if (count > MAX_INPUT_NODES) fail("JSON_TOO_COMPLEX", "DTT month-command observation JSON AST 超过节点上限。");
    visitor(node);
    for (const [key, child] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(child)) {
        for (let index = child.length - 1; index >= 0; index -= 1) stack.push(child[index]);
      } else if (child && typeof child === "object") {
        stack.push(child);
      }
    }
  }
}

function captureUint8Array(bytes, label, maxBytes) {
  if (utilTypes.isProxy(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  let bytePrototype;
  try {
    bytePrototype = Object.getPrototypeOf(bytes);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 的字节原型不可读。`, cause);
  }
  if (!utilTypes.isUint8Array(bytes)
    || (bytePrototype !== Uint8Array.prototype && bytePrototype !== Buffer.prototype)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 的内部字节槽不可读。`, cause);
  }
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0
    || !Number.isSafeInteger(byteLength) || byteLength < 0
    || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    fail("JSON_BYTES_INVALID", `${label} 的字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (typeof utilTypes.isSharedArrayBuffer === "function" && utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) fail("JSON_BYTES_INVALID", `${label} backing buffer 无效。`);
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      fail("JSON_BYTES_INVALID", `${label} backing buffer 状态不可读。`, cause);
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    fail("JSON_BYTES_INVALID", `${label} 无法复制到私有固定缓冲区。`, cause);
  }
  return captured;
}

function parseCapturedJson(captured, label) {
  if (captured.byteLength >= 3
    && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(captured);
  } catch (cause) {
    fail("JSON_UTF8_INVALID", `${label} 不是严格 UTF-8。`, cause);
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "bazi-dtt-month-command-public-evidence.json",
      sourceType: "script"
    });
  } catch (cause) {
    fail("JSON_INVALID", `${label} 不能按严格 JSON 检查。`, cause);
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  try {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
    }
    return parsed;
  } catch (cause) {
    if (cause instanceof BaziDttMonthCommandPublicEvidenceError) throw cause;
    fail("JSON_INVALID", `${label} 不是合法 JSON。`, cause);
  }
}

export function parseBaziDttMonthCommandPublicEvidenceJsonBytes(
  bytes,
  label = "八字中国著作权法公开证据观察 child",
  maxBytes = MAX_ARTIFACT_BYTES
) {
  return parseCapturedJson(captureUint8Array(bytes, label, maxBytes), label);
}

function capturePassiveJsonValue(value, state, depth) {
  if (depth > MAX_INPUT_DEPTH) fail("INPUT_DEPTH_EXCEEDED", "DTT month-command observation 输入超过最大深度。");
  state.nodes += 1;
  if (state.nodes > MAX_INPUT_NODES) fail("INPUT_NODE_LIMIT_EXCEEDED", "DTT month-command observation 输入超过节点上限。");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("INPUT_VALUE_INVALID", "DTT month-command observation 输入含无效数值。");
    return value;
  }
  if (typeof value === "string") {
    state.textCharacters += value.length;
    if (state.textCharacters > MAX_INPUT_TEXT) fail("INPUT_TEXT_LIMIT_EXCEEDED", "DTT month-command observation 输入超过文本上限。");
    return value;
  }
  if (typeof value !== "object") fail("INPUT_VALUE_INVALID", "DTT month-command observation 只接受 JSON 数据值。");
  if (utilTypes.isProxy(value)) fail("INPUT_PROXY_FORBIDDEN", "DTT month-command observation 输入不接受 Proxy。");
  if (state.active.has(value)) fail("INPUT_CYCLE_FORBIDDEN", "DTT month-command observation 输入不接受循环引用。");
  state.active.add(value);
  try {
    let array;
    let prototype;
    let descriptors;
    try {
      array = Array.isArray(value);
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch (cause) {
      fail("INPUT_OBJECT_UNSAFE", "DTT month-command observation 输入不能被安全捕获。", cause);
    }
    const descriptorKeys = Reflect.ownKeys(descriptors);
    if (descriptorKeys.some((key) => typeof key === "symbol")) {
      fail("INPUT_SYMBOL_FORBIDDEN", "DTT month-command observation 输入不接受 Symbol 属性。");
    }
    if (array) {
      if (prototype !== Array.prototype) fail("INPUT_PROTOTYPE_INVALID", "DTT month-command observation 数组原型无效。");
      const lengthDescriptor = descriptors.length;
      const length = lengthDescriptor?.value;
      if (lengthDescriptor?.get || lengthDescriptor?.set
        || !Number.isSafeInteger(length) || length < 0 || length > MAX_INPUT_NODES) {
        fail("INPUT_ARRAY_INVALID", "DTT month-command observation 数组长度无效。");
      }
      const allowedKeys = new Set(["length", ...Array.from({ length }, (_entry, index) => String(index))]);
      if (descriptorKeys.some((key) => !allowedKeys.has(key))) {
        fail("INPUT_ARRAY_INVALID", "DTT month-command observation 数组含额外属性。");
      }
      const output = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          fail("INPUT_ARRAY_INVALID", "DTT month-command observation 不接受稀疏数组或访问器元素。");
        }
        output.push(capturePassiveJsonValue(descriptor.value, state, depth + 1));
      }
      return output;
    }
    if (prototype !== Object.prototype) fail("INPUT_PROTOTYPE_INVALID", "DTT month-command observation 只接受普通对象。");
    const output = {};
    for (const key of descriptorKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        fail("INPUT_ACCESSOR_FORBIDDEN", "DTT month-command observation 不接受访问器或不可枚举字段。");
      }
      Object.defineProperty(output, key, {
        value: capturePassiveJsonValue(descriptor.value, state, depth + 1),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    state.active.delete(value);
  }
}

function capturePassiveJsonSnapshot(value) {
  return capturePassiveJsonValue(value, {
    active: new WeakSet(),
    nodes: 0,
    textCharacters: 0
  }, 0);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const output = {};
    for (const key of Object.keys(value).sort(compareCodeUnits)) {
      Object.defineProperty(output, key, {
        value: canonicalValue(value[key]),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  }
  fail("NON_CANONICAL_JSON", "DTT month-command observation 只接受有限规范 JSON 值。");
}

export function canonicalStringifyBaziDttMonthCommandPublicEvidence(value) {
  return JSON.stringify(canonicalValue(capturePassiveJsonSnapshot(value)));
}

export function computeBaziDttMonthCommandPublicEvidenceDigest(value) {
  const snapshot = capturePassiveJsonSnapshot(value);
  const { observationDigest: _observationDigest, ...unsigned } = snapshot;
  return createHash("sha256")
    .update(canonicalStringifyBaziDttMonthCommandPublicEvidence(unsigned), "utf8")
    .digest("hex");
}

function deepFreezeJson(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreezeJson(child, seen);
  return Object.freeze(value);
}

function assertExactKeys(value, expectedKeys, label, code = "UNKNOWN_FIELD_FORBIDDEN") {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(code, `${label} 必须是普通对象。`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...expectedKeys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, `${label} 字段集合不精确。`);
}

function exactJson(left, right) {
  return canonicalStringifyBaziDttMonthCommandPublicEvidence(left)
    === canonicalStringifyBaziDttMonthCommandPublicEvidence(right);
}

function verifyBoundary(actual, expected, label, code) {
  assertExactKeys(actual, Object.keys(expected), label);
  if (!exactJson(actual, expected)) fail(code, `${label} 发生越权或漂移。`);
}


function canonicalUtc(value, label) {
  if (typeof value !== "string" || !UTC_PATTERN.test(value)) {
    fail("CAPTURE_TIME_INVALID", label + " 不是 canonical UTC。");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    fail("CAPTURE_TIME_INVALID", label + " 不是 canonical UTC。");
  }
  return parsed.getTime();
}

const PUBLIC_HOSTS = new Set([
  "zh.wikisource.org",
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "foundation.wikimedia.org",
  "creativecommons.org"
]);

function validatePublicUrl(value, expected, label) {
  if (typeof value !== "string" || value.length > 2_048 || value !== expected) {
    fail("SOURCE_URL_INVALID", label + " 必须是固定公开 URL literal。");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch (cause) {
    fail("SOURCE_URL_INVALID", label + " 不能解析。", cause);
  }
  if (parsed.protocol !== "https:" || !PUBLIC_HOSTS.has(parsed.hostname) || parsed.port
    || parsed.username || parsed.password) {
    fail("SOURCE_URL_INVALID", label + " 必须是允许域名的无凭据 HTTPS URL。");
  }
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(parsed.pathname).toLowerCase();
  } catch (cause) {
    fail("SOURCE_URL_INVALID", label + " 路径编码无效。", cause);
  }
  if (/(?:^|\/)(?:login|signin|sign-in|auth|oauth|session)(?:\/|$)/u.test(decodedPath)) {
    fail("SOURCE_URL_FORBIDDEN", label + " 不得指向登录或认证路径。");
  }
}

const URL_FIELD_NAMES = new Set([
  "requestedUrl", "parseRequestedUrl", "dependencyRequestedUrl", "permanentUrl",
  "carrierDescriptionUrl", "finalResponseUrl", "pageUrl"
]);

function validateCatalogScalars(actual, expected, label) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) return;
    for (let index = 0; index < expected.length; index += 1) {
      validateCatalogScalars(actual[index], expected[index], label + "[" + index + "]");
    }
    return;
  }
  if (!expected || typeof expected !== "object") return;
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) return;
  for (const key of Object.keys(expected)) {
    if (!Object.hasOwn(actual, key)) continue;
    const nextLabel = label + "." + key;
    if (URL_FIELD_NAMES.has(key)) {
      validatePublicUrl(actual[key], expected[key], nextLabel);
    } else if ((key.endsWith("At") || key.endsWith("Timestamp"))
      && typeof expected[key] === "string" && UTC_PATTERN.test(expected[key])) {
      canonicalUtc(actual[key], nextLabel);
    } else {
      validateCatalogScalars(actual[key], expected[key], nextLabel);
    }
  }
}

function verifyCatalogField(observation, key) {
  const expected = EXPECTED_CATALOG_FIELDS[key];
  validateCatalogScalars(observation[key], expected, key);
  if (!exactJson(observation[key], expected)) {
    fail(EXPECTED_FIELD_CODES[key], key + " 固定目录或红门发生漂移。");
  }
}

function verifyNoticeDependencyBoundary(observation) {
  const wikisource = observation.operatorRecordedCaptures.wikisource;
  const dependencies = observation.operatorRecordedCaptures.renderedNoticeDependencies;
  if (wikisource.oldidMainSlotPdOldLiteralObserved !== false
    || dependencies.oldidMainSlotPdOldLiteralObserved !== false
    || dependencies.renderedPagePdOldDependencyObserved !== true
    || dependencies.dependencyRevisionsPinnedAtCapture !== true
    || dependencies.oldidAlonePinsRenderedNotice !== false) {
    fail("NOTICE_DEPENDENCY_PROMOTION_FORBIDDEN",
      "固定 oldid 正文不得被重写为含 PD-old，捕获时动态依赖也不得冒充 oldid 冻结通知。");
  }
  const expectedTitles = ["Template:License", "Template:PD-old", "Template:清朝作品"];
  if (!exactJson(dependencies.renderedTemplateNamesObserved, expectedTitles)
    || !exactJson(dependencies.sourceOldidMainSlotLiteralTemplateNamesObserved, ["Template:清朝作品"])) {
    fail("NOTICE_DEPENDENCY_CATALOG_MISMATCH", "动态通知依赖目录发生漂移。");
  }
}

export function verifyBaziDttMonthCommandPublicEvidenceArtifact(input) {
  const observation = capturePassiveJsonSnapshot(input);
  assertExactKeys(observation, EXPECTED_TOP_LEVEL_KEYS, "observation");
  if (observation.schemaVersion !== "1.0.0"
    || observation.recordType !== "bazi_dtt_month_command_public_evidence_observation_v1"
    || observation.observationId !== OBSERVATION_ID
    || observation.status !== "link_hash_only_operator_recorded_public_revision_and_transient_carrier_hash_observation_not_formal_admission"
    || observation.observedAt !== "2026-08-29T15:17:27.103Z") {
    fail("OBSERVATION_IDENTITY_INVALID", "DTT month-command observation 根身份无效。");
  }
  canonicalUtc(observation.observedAt, "observedAt");
  verifyBoundary(observation.releaseGovernance, RELEASE_GOVERNANCE,
    "releaseGovernance", "RELEASE_GOVERNANCE_DRIFT");
  verifyBoundary(observation.parentSourceBindingLedger, EXPECTED_SOURCE_PARENT,
    "parentSourceBindingLedger", "PARENT_BINDING_MISMATCH");
  verifyBoundary(observation.parentSourceRightsLedger, EXPECTED_RIGHTS_PARENT,
    "parentSourceRightsLedger", "PARENT_BINDING_MISMATCH");
  verifyBoundary(observation.relatedLawObservation, EXPECTED_RELATED_LAW,
    "relatedLawObservation", "RELATED_LAW_BINDING_MISMATCH");
  verifyBoundary(observation.basisArtifact, BASIS_IDENTITY,
    "basisArtifact", "BASIS_BINDING_MISMATCH");
  for (const key of Object.keys(EXPECTED_CATALOG_FIELDS)) verifyCatalogField(observation, key);
  verifyNoticeDependencyBoundary(observation);
  if (typeof observation.observationDigest !== "string"
    || !SHA256_PATTERN.test(observation.observationDigest)) {
    fail("OBSERVATION_DIGEST_INVALID", "observationDigest 必须是小写 SHA-256。");
  }
  const computed = computeBaziDttMonthCommandPublicEvidenceDigest(observation);
  if (computed !== observation.observationDigest) {
    fail("OBSERVATION_DIGEST_MISMATCH", "DTT month-command observation canonical digest 不一致。");
  }
  if (observation.observationDigest !== EXPECTED_OBSERVATION_DIGEST) {
    fail("OBSERVATION_SELF_RESEAL_FORBIDDEN",
      "DTT month-command observation 不接受自重签后的目录或边界变化。");
  }
  return deepFreezeJson(observation);
}

function normalizePathIdentity(value) {
  const normalized = path.resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function validateRelativePath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath
    || relativePath.includes("\\") || relativePath.includes("\0") || relativePath.includes(":")) {
    fail("ARTIFACT_PATH_INVALID", "DTT month-command observation 路径必须是仓内规范相对路径。");
  }
  const parts = relativePath.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    fail("ARTIFACT_PATH_INVALID", "DTT month-command observation 路径不得为空、绝对或逃逸。");
  }
  return parts;
}

function sameEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function captureDirectoryChain(root, parts) {
  const snapshots = [];
  let cursor = root;
  for (const part of [null, ...parts]) {
    if (part !== null) cursor = path.join(cursor, part);
    let metadata;
    let resolved;
    try {
      [metadata, resolved] = await Promise.all([lstat(cursor, { bigint: true }), realpath(cursor)]);
    } catch (cause) {
      fail("DIRECTORY_CHAIN_INVALID", "DTT month-command observation 目录链不可安全读取。", cause);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()
      || normalizePathIdentity(resolved) !== normalizePathIdentity(cursor)) {
      fail("DIRECTORY_CHAIN_INVALID", "DTT month-command observation 目录链包含链接、别名或非目录端点。");
    }
    snapshots.push(Object.freeze({ path: cursor, resolved, metadata }));
  }
  return snapshots;
}

async function revalidateDirectoryChain(snapshots) {
  for (const snapshot of snapshots) {
    let metadata;
    let resolved;
    try {
      [metadata, resolved] = await Promise.all([
        lstat(snapshot.path, { bigint: true }),
        realpath(snapshot.path)
      ]);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "DTT month-command observation 读取期间目录链发生变化。", cause);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()
      || !sameEndpoint(snapshot.metadata, metadata)
      || normalizePathIdentity(resolved) !== normalizePathIdentity(snapshot.resolved)) {
      fail("ENDPOINT_CHANGED", "DTT month-command observation 读取期间目录链发生变化。");
    }
  }
}

async function readBoundedHandle(handle, maxBytes) {
  const buffer = Buffer.allocUnsafe(maxBytes + 1);
  let offset = 0;
  while (offset < buffer.byteLength) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.byteLength - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  if (offset > maxBytes) fail("FILE_SIZE_INVALID", "DTT month-command observation 文件在读取时超过上限。");
  return buffer.subarray(0, offset);
}

async function callTestHook(testHooks, phase, payload) {
  if (typeof testHooks?.[phase] === "function") await testHooks[phase](payload);
}

async function readStableWorkspaceFile(workspaceRootInput, relativePath, maxBytes, testHooks = undefined) {
  const parts = validateRelativePath(relativePath);
  const requestedRoot = path.resolve(workspaceRootInput);
  const directoryChain = await captureDirectoryChain(requestedRoot, parts.slice(0, -1));
  const root = directoryChain[0].resolved;
  const absolutePath = path.resolve(root, ...parts);
  if (!insideRoot(root, absolutePath) || normalizePathIdentity(root) !== normalizePathIdentity(requestedRoot)) {
    fail("ARTIFACT_PATH_INVALID", "DTT month-command observation 路径越出工作区或 root 为别名。");
  }
  let beforePath;
  let resolved;
  try {
    [beforePath, resolved] = await Promise.all([
      lstat(absolutePath, { bigint: true }),
      realpath(absolutePath)
    ]);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", "DTT month-command observation 文件不可读。", cause);
  }
  if (beforePath.isSymbolicLink() || !beforePath.isFile()
    || normalizePathIdentity(resolved) !== normalizePathIdentity(absolutePath)) {
    fail("SYMLINK_REJECTED", "DTT month-command observation 文件拒绝符号链接或路径别名。");
  }
  if (beforePath.nlink !== 1n) fail("HARDLINK_REJECTED", "DTT month-command observation 文件必须是单链接普通文件。");
  if (beforePath.size <= 0n || beforePath.size > BigInt(maxBytes)) {
    fail("FILE_SIZE_INVALID", "DTT month-command observation 文件为空或超限。");
  }
  const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
  let handle;
  try {
    handle = await open(absolutePath, fsConstants.O_RDONLY | noFollow);
  } catch (cause) {
    fail("FILE_UNAVAILABLE", "DTT month-command observation held handle 打开失败。", cause);
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || !sameEndpoint(beforePath, before)) {
      fail("ENDPOINT_CHANGED", "DTT month-command observation 文件在 held handle 打开前变化。");
    }
    await callTestHook(testHooks, "afterOpenBeforeRead", Object.freeze({ absolutePath, handle, relativePath }));
    const readBytes = await readBoundedHandle(handle, maxBytes);
    await callTestHook(testHooks, "afterBytesRead", Object.freeze({ absolutePath, handle, relativePath, readBytes }));
    const after = await handle.stat({ bigint: true });
    let afterPath;
    let afterResolved;
    try {
      [afterPath, afterResolved] = await Promise.all([
        lstat(absolutePath, { bigint: true }),
        realpath(absolutePath)
      ]);
    } catch (cause) {
      fail("ENDPOINT_CHANGED", "DTT month-command observation 文件读取期间路径端点变化。", cause);
    }
    if (afterPath.isSymbolicLink() || !afterPath.isFile() || afterPath.nlink !== 1n
      || !sameEndpoint(before, after) || !sameEndpoint(after, afterPath)
      || BigInt(readBytes.byteLength) !== after.size
      || normalizePathIdentity(afterResolved) !== normalizePathIdentity(absolutePath)) {
      fail("ENDPOINT_CHANGED", "DTT month-command observation 文件读取期间端点变化。");
    }
    await revalidateDirectoryChain(directoryChain);
    const bytes = captureUint8Array(readBytes, relativePath, maxBytes);
    return Object.freeze({
      path: relativePath,
      rawBytes: bytes.byteLength,
      rawSha256: sha256(bytes),
      bytes
    });
  } finally {
    await handle.close().catch(() => {});
  }
}

function assertRawIdentity(snapshot, expected, code, label) {
  if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail(code, `${label} 与固定 raw bytes/SHA-256 不一致。`);
  }
}

function publicArtifactIdentity(snapshot) {
  return Object.freeze({
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  });
}


function inspectBasisBytes(bytes) {
  if (bytes.byteLength >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("BASIS_INVALID", "DTT month-command observation basis 不得包含 UTF-8 BOM。");
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    fail("BASIS_INVALID", "DTT month-command observation basis 不是严格 UTF-8。", cause);
  }
  const requiredMarkers = [
    "# 阶段 C：DTT 月令候选公开证据 child",
    EXPECTED_SOURCE_PARENT.sourceCandidateId,
    EXPECTED_RIGHTS_PARENT.rightsCandidateId,
    EXPECTED_CATALOG_FIELDS.subjectLock.bindingId,
    EXPECTED_CATALOG_FIELDS.subjectLock.evidenceSubjectId,
    "oldid=2600158",
    "PD-old",
    "unresolved",
    "distributionPolicy=link_only",
    "bindingFrozenVerified=0/12",
    "现实独立专家审定仍为 `0/2`",
    "legacy-v13 / targetSchema 13 / migrationId null"
  ];
  if (requiredMarkers.some((marker) => !source.includes(marker))) {
    fail("BASIS_INVALID", "DTT month-command observation basis 缺少本批次固定标记。");
  }
}

async function readObservationArtifact(workspaceRoot, testHooks = undefined) {
  const snapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH,
    MAX_ARTIFACT_BYTES,
    testHooks
  );
  assertRawIdentity(snapshot, OBSERVATION_RAW_IDENTITY,
    "ARTIFACT_DRIFT", "DTT month-command observation child");
  return Object.freeze({
    observation: parseCapturedJson(snapshot.bytes, "DTT month-command observation child"),
    artifact: publicArtifactIdentity(snapshot)
  });
}

function verifySourceParentProjection(observation, sourceLedger) {
  const candidates = sourceLedger.candidates.filter(
    (entry) => entry.candidateId === EXPECTED_SOURCE_PARENT.sourceCandidateId
  );
  if (candidates.length !== 1) {
    fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT 父来源候选必须精确存在一次。");
  }
  const candidate = candidates[0];
  const lock = observation.subjectLock;
  if (candidate.candidateDigest !== EXPECTED_SOURCE_PARENT.sourceCandidateDigest
    || candidate.bindingId !== lock.bindingId || candidate.evidenceSubjectId !== lock.evidenceSubjectId
    || candidate.sourceId !== lock.sourceId || candidate.candidateId !== lock.sourceCandidateId) {
    fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT subject lock 与父来源候选不一致。");
  }
  const quote = candidate.quoteCandidates.filter(
    (entry) => entry.quoteCandidateId === lock.selectedQuoteCandidate.quoteCandidateId
  );
  if (quote.length !== 1) {
    fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT 月令 quote candidate 父投影不存在或重复。");
  }
  const projectedQuote = lock.selectedQuoteCandidate;
  const parentQuote = quote[0];
  if (parentQuote.heading !== projectedQuote.heading
    || parentQuote.rawRevisionLineStart !== projectedQuote.rawRevisionLineStart
    || parentQuote.rawRevisionLineEnd !== projectedQuote.rawRevisionLineEnd
    || parentQuote.rawCharacterStartZeroBased !== projectedQuote.rawCharacterStartZeroBased
    || parentQuote.rawCharacterEndExclusive !== projectedQuote.rawCharacterEndExclusive
    || parentQuote.quoteCharacters !== projectedQuote.quoteCharacters
    || parentQuote.quoteUtf8Bytes !== projectedQuote.quoteUtf8Bytes
    || parentQuote.quoteSha256 !== projectedQuote.quoteSha256
    || parentQuote.quoteOccurrenceInRawRevision !== "unique"
    || projectedQuote.occurrenceCountInPinnedRevision !== 1
    || parentQuote.quoteTextStored !== false || projectedQuote.quoteTextStored !== false) {
    fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT 月令 quote locator/hash 与父来源候选不一致。");
  }
  for (const projected of lock.selectedNormalizedCollationCandidates) {
    const matches = candidate.facsimileCollationCandidates.filter(
      (entry) => entry.collationCandidateId === projected.collationCandidateId
    );
    if (matches.length !== 1) {
      fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT 月令 collation 父投影不存在或重复。");
    }
    const parent = matches[0];
    const expectedProjection = {
      collationCandidateId: parent.collationCandidateId,
      anchorId: parent.anchorId,
      pageRefId: parent.pageRefId,
      quoteCandidateId: parent.quoteCandidateId,
      observedAt: parent.observedAt,
      carrierSha256: parent.carrierSha256,
      transcriptionQuoteSha256: parent.transcriptionQuoteSha256,
      carrierGlyphSequenceSha256: parent.carrierGlyphSequenceSha256,
      transcriptionGlyphSequenceSha256: parent.transcriptionGlyphSequenceSha256,
      normalizedSequenceCharacters: parent.normalizedSequenceCharacters,
      normalizedSequenceSha256: parent.normalizedSequenceSha256,
      scriptVariantPairCount: parent.scriptVariantPairCount,
      punctuationDifferenceObserved: parent.punctuationDifferenceObserved,
      exactGlyphSequenceEqual: parent.exactGlyphSequenceEqual,
      result: parent.result,
      humanCollatorAttestationCount: parent.humanCollatorAttestations.length,
      domainExpertReviewCount: parent.domainExpertReviewIds.length,
      rightsEffect: parent.rightsEffect,
      bindingFreezeEffect: parent.bindingFreezeEffect,
      collationDigest: parent.collationDigest
    };
    if (!exactJson(projected, expectedProjection)) {
      fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT 月令 normalized collation 与父来源候选不一致。");
    }
  }
  for (const carrier of observation.carrierObservations) {
    const anchors = candidate.facsimileAnchors.filter((entry) => entry.anchorId === carrier.anchorId);
    if (anchors.length !== 1) {
      fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT 载体父 anchor 不存在或重复。");
    }
    const anchor = anchors[0];
    const pages = anchor.pageRefs.filter((entry) => entry.pageRefId === carrier.selectedPageRef.pageRefId);
    if (pages.length !== 1
      || anchor.carrierFilePageId !== carrier.carrierFilePageId
      || anchor.carrierFileTitle !== carrier.carrierFileTitle
      || anchor.carrierDescriptionUrl !== carrier.carrierDescriptionUrl
      || anchor.carrierFileTimestamp !== carrier.imageInfoTimestamp
      || anchor.carrierMediaWikiSha1 !== carrier.imageInfoMediaWikiSha1
      || anchor.carrierSha256 !== carrier.download.downloadedSha256
      || anchor.carrierBytes !== carrier.download.downloadedBytes
      || anchor.carrierMime !== carrier.imageInfoMime
      || anchor.repositoryCarrierFileStored !== false
      || anchor.repositoryPageImagesStored !== false
      || pages[0].scanPageNumber !== carrier.selectedPageRef.scanPageNumber
      || pages[0].printedPageLabel !== carrier.selectedPageRef.printedPageLabel
      || pages[0].visibleHeading !== carrier.selectedPageRef.visibleHeading
      || pages[0].pageUrl !== carrier.selectedPageRef.pageUrl
      || pages[0].pageId !== null || pages[0].pageRevisionId !== null
      || pages[0].pageRevisionTimestamp !== null || pages[0].pageMediaWikiSha1 !== null) {
      fail("SOURCE_PARENT_BINDING_MISMATCH", "DTT 载体或 viewer 页定位与父来源候选不一致。");
    }
  }
}

function verifyRightsParentProjection(observation, rightsLedger) {
  const candidates = rightsLedger.candidates.filter(
    (entry) => entry.rightsCandidateId === EXPECTED_RIGHTS_PARENT.rightsCandidateId
  );
  if (candidates.length !== 1) {
    fail("RIGHTS_PARENT_BINDING_MISMATCH", "DTT 父权利候选必须精确存在一次。");
  }
  const candidate = candidates[0];
  if (candidate.candidateDigest !== EXPECTED_RIGHTS_PARENT.rightsCandidateDigest
    || candidate.sourceCandidateId !== observation.subjectLock.sourceCandidateId
    || candidate.bindingId !== observation.subjectLock.bindingId
    || candidate.sourceId !== observation.subjectLock.sourceId
    || candidate.decision.formalSourceRightsRecordCreated !== false
    || candidate.decision.formalSourceCarrierRecordCreated !== false
    || candidate.decision.knowledgeDocumentCreated !== false
    || candidate.decision.distributionPolicy !== "link_only"
    || candidate.decision.legalConclusion !== "not_established") {
    fail("RIGHTS_PARENT_BINDING_MISMATCH", "DTT subject lock 或红门与父权利候选不一致。");
  }
}

async function readAndVerifyDependencies(workspaceRoot, testHooksByPath = undefined) {
  const sourceSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    EXPECTED_SOURCE_PARENT.path,
    MAX_PARENT_BYTES,
    testHooksByPath?.[EXPECTED_SOURCE_PARENT.path]
  );
  assertRawIdentity(sourceSnapshot, EXPECTED_SOURCE_PARENT,
    "SOURCE_PARENT_DRIFT", "父来源候选账");
  const sourceLedger = parseCapturedJson(sourceSnapshot.bytes, "父来源候选账");
  try {
    verifyBaziSourceBindingCandidateLedger(sourceLedger);
  } catch (cause) {
    fail("SOURCE_PARENT_INVALID", "父来源候选账未通过严格验证。", cause);
  }
  if (sourceLedger.ledgerId !== EXPECTED_SOURCE_PARENT.ledgerId
    || sourceLedger.ledgerDigest !== EXPECTED_SOURCE_PARENT.ledgerDigest
    || sourceLedger.candidates.length !== 4) {
    fail("SOURCE_PARENT_DRIFT", "父来源候选账语义身份漂移。");
  }

  const rightsSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    EXPECTED_RIGHTS_PARENT.path,
    MAX_PARENT_BYTES,
    testHooksByPath?.[EXPECTED_RIGHTS_PARENT.path]
  );
  assertRawIdentity(rightsSnapshot, EXPECTED_RIGHTS_PARENT,
    "RIGHTS_PARENT_DRIFT", "父权利候选账");
  const rightsLedger = parseCapturedJson(rightsSnapshot.bytes, "父权利候选账");
  try {
    verifyBaziSourceRightsCandidateLedger(rightsLedger, sourceLedger);
  } catch (cause) {
    fail("RIGHTS_PARENT_INVALID", "父权利候选账未通过严格验证。", cause);
  }
  if (rightsLedger.ledgerId !== EXPECTED_RIGHTS_PARENT.ledgerId
    || rightsLedger.ledgerDigest !== EXPECTED_RIGHTS_PARENT.ledgerDigest) {
    fail("RIGHTS_PARENT_DRIFT", "父权利候选账语义身份漂移。");
  }

  const lawSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    EXPECTED_RELATED_LAW.path,
    MAX_PARENT_BYTES,
    testHooksByPath?.[EXPECTED_RELATED_LAW.path]
  );
  assertRawIdentity(lawSnapshot, EXPECTED_RELATED_LAW,
    "RELATED_LAW_DRIFT", "相关 C-L1 法规则观察");
  const lawObservation = parseCapturedJson(lawSnapshot.bytes, "相关 C-L1 法规则观察");
  try {
    verifyBaziPrcCopyrightLawPublicEvidenceArtifact(lawObservation);
  } catch (cause) {
    fail("RELATED_LAW_INVALID", "相关 C-L1 法规则观察未通过严格验证。", cause);
  }
  if (lawObservation.observationId !== EXPECTED_RELATED_LAW.observationId
    || lawObservation.observationDigest !== EXPECTED_RELATED_LAW.observationDigest) {
    fail("RELATED_LAW_DRIFT", "相关 C-L1 法规则观察语义身份漂移。");
  }
  return Object.freeze({
    sourceLedger,
    rightsLedger,
    lawObservation,
    sourceArtifact: publicArtifactIdentity(sourceSnapshot),
    rightsArtifact: publicArtifactIdentity(rightsSnapshot),
    relatedLawArtifact: publicArtifactIdentity(lawSnapshot)
  });
}

async function buildVerifiedResult(workspaceRoot, persistedRead, callerInput = undefined,
  testHooksByPath = undefined) {
  const dependencies = await readAndVerifyDependencies(workspaceRoot, testHooksByPath);
  const persisted = verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedRead.observation);
  verifySourceParentProjection(persisted, dependencies.sourceLedger);
  verifyRightsParentProjection(persisted, dependencies.rightsLedger);
  if (callerInput !== undefined) {
    const caller = verifyBaziDttMonthCommandPublicEvidenceArtifact(callerInput);
    if (!exactJson(caller, persisted)) {
      fail("CALLER_PERSISTED_MISMATCH",
        "调用方输入与持久化 DTT month-command observation child 不一致。");
    }
  }
  const basisSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    BASIS_RELATIVE_PATH,
    MAX_BASIS_BYTES,
    testHooksByPath?.[BASIS_RELATIVE_PATH]
  );
  assertRawIdentity(basisSnapshot, BASIS_IDENTITY,
    "BASIS_DRIFT", "DTT month-command observation basis");
  inspectBasisBytes(basisSnapshot.bytes);

  const result = deepFreezeJson({
    offlineCheckedInObservationContractMechanicallyVerified: true,
    status: persisted.status,
    observationId: persisted.observationId,
    observationDigest: persisted.observationDigest,
    activeLine: persisted.releaseGovernance.activeLine,
    targetSchema: persisted.releaseGovernance.targetSchema,
    migrationId: persisted.releaseGovernance.migrationId,
    sourceCandidateId: persisted.subjectLock.sourceCandidateId,
    rightsCandidateId: persisted.subjectLock.rightsCandidateId,
    bindingId: persisted.subjectLock.bindingId,
    evidenceSubjectId: persisted.subjectLock.evidenceSubjectId,
    distinctCarrierByteIdentityCount: persisted.sourceGroupAccounting.distinctCarrierByteIdentityCount,
    commonsUpstreamGroupCount: persisted.sourceGroupAccounting.commonsUpstreamGroupCount,
    sharedUploaderIdentityVerified: persisted.sourceGroupAccounting.sharedUploaderIdentityVerified,
    independentEditionWitnessCount: persisted.sourceGroupAccounting.independentEditionWitnessCount,
    independentRightsSourceCount: persisted.sourceGroupAccounting.independentRightsSourceCount,
    mediaInfoCountsAsIndependentRightsSource:
      persisted.sourceGroupAccounting.mediaInfoCountsAsIndependentRightsSource,
    twoCarriersCountAsTwoIndependentEditions:
      persisted.sourceGroupAccounting.twoCarriersCountAsTwoIndependentEditions,
    twoCarriersCountAsTwoIndependentLegalOpinions:
      persisted.sourceGroupAccounting.twoCarriersCountAsTwoIndependentLegalOpinions,
    oldidMainSlotPdOldLiteralObserved:
      persisted.operatorRecordedCaptures.wikisource.oldidMainSlotPdOldLiteralObserved,
    renderedPagePdOldDependencyObserved:
      persisted.operatorRecordedCaptures.renderedNoticeDependencies.renderedPagePdOldDependencyObserved,
    dependencyRevisionsPinnedAtCapture:
      persisted.operatorRecordedCaptures.renderedNoticeDependencies.dependencyRevisionsPinnedAtCapture,
    oldidAlonePinsRenderedNotice:
      persisted.operatorRecordedCaptures.renderedNoticeDependencies.oldidAlonePinsRenderedNotice,
    noticeDiscrepancyResolved: persisted.rightsBoundary.noticeDiscrepancyResolved,
    noticeDiscrepancyPromotionBlocked: persisted.parentNoticeDiscrepancy.promotionBlocked,
    remoteCaptureMechanicallyVerifiedByOfflineVerifier:
      persisted.networkObservationBoundary.remoteCaptureMechanicallyVerifiedByOfflineVerifier,
    networkProvenanceEstablished: persisted.networkObservationBoundary.networkProvenanceEstablished,
    publisherAuthenticityEstablished:
      persisted.networkObservationBoundary.publisherAuthenticityEstablished,
    redirectChainCaptured: persisted.networkObservationBoundary.redirectChainCaptured,
    wireBytesCaptured: persisted.networkObservationBoundary.wireBytesCaptured,
    tlsPeerCertificateCaptured: persisted.networkObservationBoundary.tlsPeerCertificateCaptured,
    futureFreshnessEstablished: persisted.networkObservationBoundary.futureFreshnessEstablished,
    sameEditionRelationshipIndependentlyEstablished:
      persisted.relationBoundary.sameEditionRelationshipIndependentlyEstablished,
    pageNamespaceAbsenceIsPointInTimeOnly:
      persisted.relationBoundary.pageNamespaceAbsenceIsPointInTimeOnly,
    selectedPageNamespaceRevisionCount:
      persisted.relationBoundary.selectedPageNamespaceRevisionCount,
    versionIdentityEstablished: persisted.relationBoundary.versionIdentityEstablished,
    transcriptionIdentityEstablished: persisted.relationBoundary.transcriptionIdentityEstablished,
    exactGlyphCollationEstablished: persisted.relationBoundary.exactGlyphCollationEstablished,
    humanCollationEstablished: persisted.relationBoundary.humanCollationEstablished,
    sourceBodyFrozen: persisted.bindingBoundary.sourceBodyFrozen,
    exactQuoteVerifiedForFreeze: persisted.bindingBoundary.exactQuoteVerifiedForFreeze,
    workIdentityEstablished: persisted.bindingBoundary.workIdentityEstablished,
    editionIdentityEstablished: persisted.bindingBoundary.editionIdentityEstablished,
    carrierIdentityEstablished: persisted.bindingBoundary.carrierIdentityEstablished,
    rightsEvidenceComplete: persisted.bindingBoundary.rightsEvidenceComplete,
    bindingFrozen: persisted.bindingBoundary.bindingFrozen,
    bindingFrozenVerified: persisted.bindingBoundary.bindingFrozenVerified,
    bindingRequired: persisted.bindingBoundary.bindingRequired,
    formalSourceRightsRecordCount: persisted.rightsBoundary.formalSourceRightsRecordCount,
    formalSourceCarrierRecordCount: persisted.rightsBoundary.formalSourceCarrierRecordCount,
    knowledgeDocumentCount: persisted.rightsBoundary.knowledgeDocumentCount,
    redistributableSourceCount: persisted.rightsBoundary.redistributableSourceCount,
    workLayerCleared: persisted.rightsBoundary.workLayerCleared,
    editionLayerCleared: persisted.rightsBoundary.editionLayerCleared,
    transcriptionLayerCleared: persisted.rightsBoundary.transcriptionLayerCleared,
    carrierLayerCleared: persisted.rightsBoundary.carrierLayerCleared,
    applicableTermsResolved: persisted.rightsBoundary.applicableTermsResolved,
    publicDomainMarkCountsAsLicense: persisted.rightsBoundary.publicDomainMarkCountsAsLicense,
    markerAuthorityAndAccuracyVerified:
      persisted.rightsBoundary.markerAuthorityAndAccuracyVerified,
    humanLegalReviewerCount: persisted.rightsBoundary.humanLegalReviewerIds.length,
    candidateSpecificLegalApplicationEstablished:
      persisted.relatedLawObservation.candidateSpecificLegalApplicationEstablished,
    legalConclusion: persisted.rightsBoundary.legalConclusion,
    redistributionAuthorized: persisted.rightsBoundary.redistributionAuthorized,
    publicRepositoryBodyInclusionAuthorized:
      persisted.rightsBoundary.publicRepositoryBodyInclusionAuthorized,
    publicBuildInclusionAuthorized: persisted.rightsBoundary.publicBuildInclusionAuthorized,
    contentTruthEstablished: persisted.authorityBoundary.contentTruthEstablished,
    baziRuleTruthEstablished: persisted.authorityBoundary.baziRuleTruthEstablished,
    sourceBundleComplete: persisted.authorityBoundary.sourceBundleComplete,
    rightsBundleComplete: persisted.authorityBoundary.rightsBundleComplete,
    expertReviewBundleComplete: persisted.authorityBoundary.expertReviewBundleComplete,
    independentExpertReviewsVerified:
      persisted.authorityBoundary.independentExpertReviewsVerified,
    independentExpertReviewsRequired:
      persisted.authorityBoundary.independentExpertReviewsRequired,
    expertTruthEstablished: persisted.authorityBoundary.expertTruthEstablished,
    fullRepositoryTypecheckPassed: persisted.authorityBoundary.fullRepositoryTypecheckPassed,
    defaultWebBuildPassed: persisted.authorityBoundary.defaultWebBuildPassed,
    browserOrPwaAcceptancePassed: persisted.authorityBoundary.browserOrPwaAcceptancePassed,
    releaseEvidenceComplete: persisted.authorityBoundary.releaseEvidenceComplete,
    deploymentAndRollbackConfirmed: persisted.authorityBoundary.deploymentAndRollbackConfirmed,
    releaseReady: persisted.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: persisted.authorityBoundary.publicDeploymentAuthorized,
    expertClaimsAuthorized: persisted.authorityBoundary.expertClaimsAuthorized,
    crossFileAtomicSnapshot: persisted.integrityBoundary.crossFileAtomicSnapshot,
    mutationEpochAvailable: persisted.integrityBoundary.mutationEpochAvailable,
    intervalMutationExcluded: persisted.integrityBoundary.intervalMutationExcluded,
    abaExcluded: persisted.integrityBoundary.abaExcluded,
    observationArtifact: persistedRead.artifact,
    sourceParentArtifact: dependencies.sourceArtifact,
    rightsParentArtifact: dependencies.rightsArtifact,
    relatedLawArtifact: dependencies.relatedLawArtifact,
    basisArtifact: publicArtifactIdentity(basisSnapshot),
    observation: persisted
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export async function readBaziDttMonthCommandPublicEvidence(workspaceRoot = process.cwd()) {
  const persistedRead = await readObservationArtifact(workspaceRoot);
  return verifyBaziDttMonthCommandPublicEvidenceArtifact(persistedRead.observation);
}

export async function loadBaziDttMonthCommandPublicEvidence(workspaceRoot = process.cwd()) {
  const persistedRead = await readObservationArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead);
}

export async function verifyBaziDttMonthCommandPublicEvidence(
  workspaceRoot = process.cwd(),
  callerInput
) {
  const persistedRead = await readObservationArtifact(workspaceRoot);
  return buildVerifiedResult(workspaceRoot, persistedRead, callerInput);
}

export function isVerifiedBaziDttMonthCommandPublicEvidence(value) {
  return Boolean(value && typeof value === "object" && VERIFIED_RESULTS.has(value));
}

export const baziDttMonthCommandPublicEvidenceTestOnly = Object.freeze({
  OBSERVATION_RAW_IDENTITY,
  BASIS_IDENTITY,
  EXPECTED_SOURCE_PARENT,
  EXPECTED_RIGHTS_PARENT,
  EXPECTED_RELATED_LAW,
  EXPECTED_OBSERVATION_DIGEST,
  readBoundedHandle,
  readObservationArtifact,
  readStableWorkspaceFile,
  async loadWithTestHooks(workspaceRoot, testHooksByPath = {}) {
    const persistedRead = await readObservationArtifact(
      workspaceRoot,
      testHooksByPath[BAZI_DTT_MONTH_COMMAND_PUBLIC_EVIDENCE_RELATIVE_PATH]
    );
    return buildVerifiedResult(workspaceRoot, persistedRead, undefined, testHooksByPath);
  }
});



