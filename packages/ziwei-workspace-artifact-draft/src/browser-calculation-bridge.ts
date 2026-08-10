// Deliberately narrow same-system bridge. The workspace may invoke the audited
// fresh Browser Worker client and derive its read-only display projection, but
// it cannot import the adapter host UI or the upstream iztro package directly.
export {
  calculateZiweiInFreshBrowserWorker,
  createZiweiBrowserDisplayProjection
} from "../../ziwei-iztro-adapter-draft/src/browser-preview/browser-client.ts";

export type {
  BrowserProbeDisplayProjection,
  BrowserProbeSuccessResult,
  ZiweiBrowserCalculationOptions
} from "../../ziwei-iztro-adapter-draft/src/browser-preview/browser-client.ts";
