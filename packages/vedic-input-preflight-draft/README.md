# Vedic input preflight draft

This isolated Browser/Worker surface replays exactly four project-controlled, no-person structural probes against the pinned `hakimi.vedic.input/0.1-draft` schema. Every probe must produce a diagnostic rejection. The package has no production export and is not imported by the Bazi app, the four-system admission registry, or any release parent.

The surface does not accept user birth data, does not persist, and does not perform application fetch/XHR calls. It does not establish a complete validator, an admitted input, time-zone or ephemeris correctness, Vedic facts or rules, source rights, expert review, release readiness, or public deployment authority.

Target flow:

```text
isolated page load
  -> run four fixed probes
  -> fresh dedicated Worker
  -> four exact diagnostic rejection receipts
  -> acceptedInputs=0 / productReceipts=0 / authority=false
```

Focused verification:

```powershell
node node_modules/typescript/bin/tsc -p packages/vedic-input-preflight-draft/tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run --config packages/vedic-input-preflight-draft/vitest.config.ts
node node_modules/vite/bin/vite.js build --config packages/vedic-input-preflight-draft/vite.browser-preflight.config.mjs
node node_modules/@playwright/test/cli.js test --config packages/vedic-input-preflight-draft/playwright.browser-preflight.config.ts
```

The Playwright entrypoint always rebuilds this isolated surface before starting
its preview server, so it cannot silently validate an older `dist` directory.
The client treats the first Worker event as terminal, validates that event
exactly, and immediately terminates the Worker; later events cannot recover or
alter the settled result.

The default project release governance remains `legacy-v13 / targetSchema 13 / migrationId null`; it is not inherited as a Vedic product identity.
