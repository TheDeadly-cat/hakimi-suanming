// Deliberately narrow same-system bridge. The workspace may invoke the audited
// fresh Browser Worker client and derive its read-only display projection, but
// it cannot import the adapter host UI or the upstream iztro package directly.
export {
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_MAX_BYTES,
  ZIWEI_CORE_MINOR_STAR_SANFANG_REVIEW_FEEDBACK_PROFILE,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_FILENAME,
  ZIWEI_NATAL_TRANSFORMATION_PALACE_REVIEW_FEEDBACK_MAX_BYTES,
  calculateZiweiInFreshBrowserWorker,
  createZiweiBrowserDisplayProjection,
  createZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  createZiweiNatalTransformationPalaceReviewFeedbackTemplate,
  preflightZiweiCoreMinorStarSanfangReviewFeedback,
  preflightZiweiNatalTransformationPalaceReviewFeedback,
  serializeZiweiCoreMinorStarSanfangReviewFeedbackTemplate,
  serializeZiweiNatalTransformationPalaceReviewFeedbackTemplate,
  ziweiCoreMinorStarSanfangReviewFeedbackFilename
} from "../../ziwei-iztro-adapter-draft/src/browser-preview/browser-client.ts";

export type {
  BrowserProbeDisplayProjection,
  BrowserProbeSuccessResult,
  ZiweiBrowserCalculationOptions,
  ZiweiCoreMinorStarSanfangReviewFeedbackEnvelope,
  ZiweiCoreMinorStarSanfangReviewFeedbackItem,
  ZiweiCoreMinorStarSanfangReviewFeedbackPreflight,
  ZiweiNatalTransformationPalaceReviewFeedbackEnvelope,
  ZiweiNatalTransformationPalaceReviewFeedbackPreflight,
  ZiweiNatalTransformationPalaceReviewItem
} from "../../ziwei-iztro-adapter-draft/src/browser-preview/browser-client.ts";
