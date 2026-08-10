import type { ZiweiBrowserSourceIdentityDraft } from "./browser-artifact.ts";

// The dedicated Browser-preview Vite plugin replaces this entire module with a fixed
// source-graph identity. Any direct/non-dedicated build must fail closed at module load.
throw new Error("Ziwei Browser source identity was not injected by the dedicated Vite boundary");

const generatedBrowserSourceIdentity: ZiweiBrowserSourceIdentityDraft = null as never;

export default generatedBrowserSourceIdentity;
