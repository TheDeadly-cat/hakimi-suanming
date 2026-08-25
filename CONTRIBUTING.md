# Contributing

Hakimi Bazi Workbench is a local-first research application with strict database-generation, backup, Service Worker, provenance, and expert-evidence boundaries. A small-looking import or storage change can affect existing browser data, so contributions must make their release and data impact explicit.

## Current project status

The repository is an engineering preview, not a completed Web v1. The ordinary build remains pinned to:

```text
legacy-v13 / targetSchema 13 / migrationId null
```

Schema 15 and 16 paths are isolated candidates. Ziwei, Western astrology, and cross-system packages are isolated drafts and must not enter the production Bazi application graph, database, navigation, or full v1.2 backup without a separate admission decision.

The project license and external-contribution terms have not yet been selected. Do not describe the repository as open source. External contributors should obtain direction from the repository owner before submitting code or assets.

## Toolchain

The repository pins:

- Node.js `24.16.0`
- npm `11.13.0`

Install exactly from the lockfile:

```powershell
npm ci
```

The root `.npmrc` enables strict engine checks so an incompatible Node.js or npm version fails instead of silently changing the validated environment.

## Required change discipline

- Preserve local and untracked work. Do not reset, clean, overwrite, stage, or commit unrelated files.
- Do not change the default release identity as part of an unrelated feature, documentation, refactor, or test change.
- Do not write directly to IndexedDB to bypass mutation epoch, CAS, freeze, lease, shadow migration, backup preflight, or Service Worker coordination.
- Keep database generation, Service Worker, backup/restore, user experience, and content changes separately reviewable.
- Unknown Schema or migration identities must fail closed or enter an explicit read-only recovery path.
- Use synthetic or anonymized fixtures. Never commit credentials, real birth data, private notes, full backups, browser profiles, or sensitive attachments.
- Record third-party provenance and redistribution rights independently.

## Evidence language

Report each evidence class separately:

- Typecheck, unit, integration, and deterministic differential results are engineering evidence.
- Browser results apply only to the named browser, version, scenario, and current build.
- Responsive emulation is not fixed-device evidence.
- Hashes and receipts prove only the contract they actually bind; they are not signatures or expert review.
- Domain truth requires real, scoped expert review.
- Source traceability does not automatically grant commercial redistribution rights.

Never promote a historical Markdown test count to current-commit evidence without rerunning the covered gate.

## Local checks

For a normal code change, start with the affected contract and then run the quick repository gate before requesting merge:

```powershell
npm run typecheck
npm test
npm run build
```

These commands cover the default application graph and ordinary `legacy-v13` build. They do not prove cross-Schema migration, fixed Android behavior, public deployment safety, expert truth, or content rights. Run the relevant named Playwright, migration, capacity, backup, privacy, or isolated-draft gate when the change touches that scope.

## Pull requests

Use the repository pull-request template. Include:

- the exact problem and non-goals;
- release, database, cache, backup, rollback, and privacy impact;
- commands actually run and their current results;
- evidence that was not run or remains external;
- a statement that unrelated work was preserved.

A Schema promotion or release-identity change requires its own decision and release evidence. Passing the quick CI workflow is necessary but never sufficient for Schema 16 promotion or public Web v1 release.
