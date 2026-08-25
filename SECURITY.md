# Security Policy

## Supported status

Hakimi Bazi Workbench is currently an engineering preview. There is no publicly supported production release or security-maintenance SLA. The ordinary build remains `legacy-v13 / targetSchema 13 / migrationId null`; higher Schema builds and non-Bazi systems are isolated candidates or drafts.

## Reporting a vulnerability

Do not include credentials, API keys, identifiable birth data, private notes, attachments, full backups, browser profiles, or exploit details containing user data in a public issue.

If GitHub private vulnerability reporting is enabled for this repository, use the repository Security tab and its private reporting form. Otherwise, contact the repository owner through an established private channel before sharing sensitive details. A public issue is appropriate only after sensitive material and exploit details have been removed and disclosure timing has been agreed.

Include, when safely available:

- affected commit or build hash;
- generation, target Schema, migration ID, database name, and Service Worker/cache generation;
- browser, operating system, install mode, and online/offline state;
- minimal reproduction using synthetic data;
- expected and actual trust-boundary behavior;
- whether the issue involves writes, multiple tabs, migration, backup, restore, logs, or read-only recovery.

## Security-relevant properties

Reports are especially useful when they show a failure in one of these properties:

- untrusted content can execute script or read same-origin IndexedDB data;
- a malformed, oversized, encrypted, multi-entry, ZIP64, linked, or integrity-invalid backup reaches a write transaction;
- application shell, Service Worker, cache generation, database generation, Schema, or migration identity can be mismatched while writes remain enabled;
- mutation epoch, CAS, freeze, lease, shadow migration, backup preflight, or read-only recovery can be bypassed;
- a failed or interrupted restore leaves partially replaced user partitions;
- secrets or identifiable research data are written to logs, URLs, telemetry, fixtures, screenshots, or repository files;
- another origin or browser profile can access local data outside browser same-origin isolation;
- dependency or build-pipeline compromise changes the shipped artifact without invalidating release evidence.

Incorrect metaphysics content, disputed schools, engineering differentials, or missing expert review should be tracked as domain-evidence issues unless they also create a software security or privacy impact. Engineering evidence must not be represented as expert truth.

## Testing boundaries

Security research must use data and systems you own or are authorized to test. Do not test against third-party deployments, accounts, devices, or services without permission. Do not use real user backups as fixtures. Preserve source databases and prefer isolated profiles and synthetic data for migration or recovery research.
