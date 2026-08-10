import type { WesternBrowserNodeReference } from "./protocol.ts";

// Vite replaces this fail-closed sentinel only when the isolated build plugin
// has freshly replayed every reference seed through the audited Node adapter.
const unavailableOutsideIsolatedBuild: WesternBrowserNodeReference = null as never;

export default unavailableOutsideIsolatedBuild;
