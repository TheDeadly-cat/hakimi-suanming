import type { ZiweiRuleSnapshotDraft } from "../contract-bridge.ts";

// The dedicated Vite configuration replaces this typed sentinel with a freshly generated,
// digest-bound Node reference snapshot. Executing the module without that gate fails closed.
const generatedRuleSnapshot: ZiweiRuleSnapshotDraft = null as never;

export default generatedRuleSnapshot;
