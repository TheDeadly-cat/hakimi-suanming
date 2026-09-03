# Vedic mutation epoch runtime experiment

Private, zero-person-data, ephemeral IndexedDB experiment for the independent
Vedic workstream. It mechanically probes generation-scoped CAS, monotonic
mutation epochs, A-B-A history identity, atomic abort behavior, a labelled
synthetic quota-like post-put abort rollback probe, and stale-generation restore
rejection.

This package is deliberately not a product storage implementation:

- `exports` is empty and production import is forbidden.
- Every database name is random and carries the `ephemeral-mutation-experiment`
  marker. The browser harness attempts best-effort deletion and visibly fails
  closed when deletion is blocked; a crash can still leave the temporary DB.
- Product identity, target schema, migration ID, runtime selection and storage
  backend selection remain absent.
- Restore snapshots are in-memory mechanical probes, not backup artifacts.
- Mutation candidates and restore snapshots require private same-realm brands;
  caller text cannot supply operation IDs, nonces, or idempotency keys.
- Before hashing, each consumed-digest array is captured from exact own data
  descriptors. Holes, symbol or extra string keys, accessors, non-enumerable
  items, invalid or duplicate digests, and over-limit lengths fail closed.
- Module evaluation captures `Reflect.apply` and `WeakMap.prototype.get/set`.
  The focused test only proves that post-import poisoning of `WeakMap#get`
  cannot forge a private brand. Pre-import integrity and the integrity of other
  primordials are not established; private same-realm brands are not a general
  defence against arbitrary code in the same realm. This experiment therefore
  requires a trusted realm at module import and is not a Worker/SES boundary.
- The quota-like probe is a labelled post-put abort injection, not a real
  `QuotaExceededError` or capacity measurement.
- No external monotonic anchor or exclusive/authenticated same-origin store
  ownership exists. A complete old self-consistent envelope/database replay and
  a live same-origin raw IndexedDB writer after this transaction are not
  excluded. CAS compares the complete canonical base only at this commit point;
  it does not authenticate every writer or prevent a later write.
- Engineering observations are frozen but not privately branded or
  authenticated. Their public digest is not issuance proof, and downstream code
  must not treat them as product receipts. `productMutationReceiptIssued`
  remains `false`.
- The technical downstream registry keeps the package-wide bare-import list
  empty and attaches `fake-indexeddb-test-only-v1`. The shared boundary verifier
  permits `fake-indexeddb` only from `*.test.*`; a runtime-source import, policy
  detachment, or package-wide allowlist widening fails closed. Runtime
  dependencies remain empty and production import remains forbidden.
- A passing test or browser run establishes no domain/content truth, source or
  rights conclusion, expert truth, release readiness, or public authorization.

Current focused runtime evidence is `1 file / 10 tests` plus strict TypeScript
and an isolated Vite build. The import boundary adds `3/3` focused policy tests;
the repository-wide boundary suite still has an unrelated existing aggregate
failure and is not recorded as passing. The in-app browser has only passed
initial title/DOM and error/warn-log inspection. The six-probe button has not
been clicked, so no browser evidence yet exists for temporary database creation,
probe outcomes, or cleanup.

Focused checks:

```powershell
npx.cmd tsc --noEmit -p packages/vedic-mutation-epoch-runtime-experiment-draft/tsconfig.json
npx.cmd vitest run --config packages/vedic-mutation-epoch-runtime-experiment-draft/vitest.config.ts
node apps/web/node_modules/vite/bin/vite.js build --config packages/vedic-mutation-epoch-runtime-experiment-draft/vite.browser-experiment.config.mjs --configLoader runner
```
