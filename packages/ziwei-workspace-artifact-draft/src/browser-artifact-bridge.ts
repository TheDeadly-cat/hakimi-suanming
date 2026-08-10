// Deliberately narrow same-system bridge. Persistence may verify and preserve
// the complete Browser engineering artifact, but it cannot execute iztro or
// import the preview UI/Worker entry points.
export {
  ZIWEI_BROWSER_ENGINEERING_ARTIFACT_KIND,
  ZIWEI_BROWSER_ENGINEERING_ARTIFACT_VERSION,
  ZIWEI_BROWSER_SOURCE_DIGEST_ALGORITHM,
  ZIWEI_BROWSER_SOURCE_IDENTITY_VERSION,
  ZIWEI_BROWSER_SOURCE_PATHS,
  calculateZiweiBrowserSourceGraphSha256,
  createZiweiBrowserEngineeringArtifactDraft,
  verifyZiweiBrowserEngineeringArtifactDraft,
  ziweiBrowserEngineeringArtifactDraftSchema
} from "../../ziwei-iztro-adapter-draft/src/browser-preview/browser-artifact.ts";

export type {
  ZiweiBrowserEngineeringArtifactDraft,
  ZiweiBrowserArtifactVerificationResult,
  ZiweiBrowserSourceIdentityDraft
} from "../../ziwei-iztro-adapter-draft/src/browser-preview/browser-artifact.ts";
