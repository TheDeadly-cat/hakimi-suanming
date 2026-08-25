## Purpose

Describe the user or engineering problem and the intended outcome.

## Scope

- [ ] The change is limited to the stated purpose.
- [ ] Unrelated local or untracked work was preserved.
- [ ] Database, Service Worker, backup, and content changes are separated where practical.

## Release and data safety

- [ ] The default identity remains `legacy-v13 / targetSchema 13 / migrationId null`.
- [ ] This change does not bypass mutation epoch, CAS, freeze, lease, shadow migration, backup preflight, or Service Worker gates.
- [ ] Any database generation, Schema, migration ID, readable range, table, cache generation, or rollback impact is listed below.
- [ ] Unknown or unsupported generations continue to fail closed.

Release/data impact: None, or explain precisely.

## Evidence

Commands run and results:

```text
Not run yet.
```

- [ ] Engineering tests are not described as expert truth.
- [ ] Browser, device, domain-review, rights, and deployment evidence are reported separately.
- [ ] Historical results are not presented as current-commit verification.

## Documentation and privacy

- [ ] User-visible behavior and current-status documentation were updated where required.
- [ ] Logs, fixtures, screenshots, and attachments contain no credentials or identifiable birth/research data.
- [ ] Third-party source provenance and redistribution rights are recorded separately where applicable.
