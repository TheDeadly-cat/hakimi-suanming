# Vedic civil-time input resolution draft

This private, export-closed package resolves one exact proleptic-Gregorian civil
date and minute/second wall time against the explicitly content-addressed IANA
tzdb 2026c snapshot bundled by `@hakimi/tzdb-core`.

It is an isolated Vedic engineering candidate only. It does not issue a full
Vedic input-acceptance, normalization, fact, rule, success, or formal
time-resolution receipt. It does not satisfy the Vedic
`utc_conversion_and_time_scale` requirement, establish leap-second/UT1/TT/TDB/EOP
provenance, calculate a chart, establish source rights or expert truth, or
authorize release/deployment.

The input profile is deliberately narrow:

- proleptic Gregorian only;
- uncertainty representation `exact` only;
- exact minute or exact second only;
- an explicit IANA zone, tzdb version, and content-addressed snapshot ID;
- the package-local Vedic draft overlap policies reject/earlier/later.

Intervals, candidate sets, perturbation models, geocoding, host `Intl`, OS time
zone data, network access, storage, and persistence are outside this package.
The underlying resolver is bounded to its declared 1900-01-01..2100-12-31
range and its current ±48-hour nearby-offset/max-two-candidate model. Zone-name
acceptance is not a claim that caller casing is the canonical IANA spelling.
Earlier/later is ordered only by ascending UTC epoch milliseconds, never by
offset numeric value and never as a daylight-saving/standard-time truth claim.
The runtime binds and rechecks the registry descriptor and resolver snapshot,
but the current tzdb-core runtime does not recompute the descriptor SHA-256 over
all loaded Zone/Link bytes; full runtime byte closure therefore remains false.
Because this API accepts a JavaScript object rather than raw JSON bytes, it also
does not establish duplicate-key exclusion or raw-byte identity.

Calendar, precision, exact-uncertainty, and overlap-policy identities in this
package are project-authored adapter-draft choices. The formal Vedic
requirements still have zero resolved selections. A projection digest covers
only this bounded object, never all thirteen Vedic input requirements. The
optional local-resolution declaration is not a full Vedic schema instance.
Transparent Proxy exclusion and complete same-realm primordial-poisoning
isolation are not established.
The no-storage audit covers user-data/application stores; it does not claim that
Node module loading or bundled runtime-artifact access performed zero reads.

Focused validation:

```powershell
node node_modules/typescript/bin/tsc --noEmit -p isolated-drafts/vedic-civil-time-input-resolution-draft/tsconfig.json
node node_modules/vitest/vitest.mjs run isolated-drafts/vedic-civil-time-input-resolution-draft/src/index.test.ts
```
