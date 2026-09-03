# Ziwei civil-time input resolution draft

This private, export-closed Node engineering draft resolves one exact Gregorian
civil minute against an explicitly selected, content-addressed `@hakimi/tzdb-core`
snapshot and then maps the requested wall-clock minute to the 13 shichen slots
already frozen by `@hakimi/ziwei-doushu-contracts-draft`.

It closes only the executable boundary between a declared civil wall time and
the existing early-Zi / twelve-shichen / late-Zi partition. It does not create
or impersonate the current `ZiweiBirthInputDraft`: that parent contract still
requires callers to provide `shichenIndex` and fixes
`civilContext.usedForCalculation=false`. It never imports or invokes iztro,
Fortel, a Web surface, storage, or any Western/Vedic adapter.

## Accepted request

The request is a descriptor-safe plain JavaScript object with the exact fields
defined by `ZiweiCivilTimeResolutionRequest`. The first draft accepts only:

- `calendarInput.calendar="gregorian"` in the selected tzdb artifact's
  `1900-01-01..2100-12-31` range;
- `localTime="HH:mm"`, `timePrecision="exact_minute"`, and
  `uncertainty="exact"`;
- an explicit IANA zone, explicit `reject|earlier|later` overlap policy, exact
  content-addressed tzdb snapshot ID, and declared coordinates;
- `solarTimeAdjustment="none"`.

`24:00`, seconds, unknown/interval/candidate time, Chinese-lunisolar input,
defaulted time zones, geocoding, host `Intl`, true-solar-time adjustment, and
unknown fields all fail closed. A DST gap is always rejected. A DST overlap is
rejected under `reject`; `earlier` and `later` select by ascending UTC instant.
Neither offset magnitude nor a daylight/standard label decides the branch.

## Output and late-Zi boundary

A success is only a process-local branded `resolved_candidate`. It binds the
normalized request, parent contract version, exact parent slot-table snapshot,
tzdb descriptor, chosen civil instant, shichen projection, and domain-separated
SHA-256 digests. Hashes are integrity identifiers, not signatures.

`00:00..00:59` maps to slot 0 and `23:00..23:59` maps to slot 12. For late Zi,
the candidate records `requiredDownstreamRuleField="rules.lateZiDay"` but always
keeps `lateZiDayPolicyApplied=false` and `effectiveCalculationDate=null`. The
adapter therefore does not decide the disputed day-boundary rule.

The full candidate contains person-derived civil date/time, coordinates, UTC
instant, shichen, and digests. It fixes `safeToLog`, `safeToPersist`, and
`safeToPublish` to `false`. `projectZiweiCivilTimeRedactedSummary` accepts only a
live branded candidate and omits every exact/derived birth value and digest; its
own publication/logging permissions also remain false.

## Trust and authority boundary

The adapter hard-locks parent contract `0.1.0-draft.3` and system
`ziwei-doushu`; a parent version or identity change fails closed instead of
silently following the imported constant. The raw request is captured before
the first asynchronous operation. Accessors,
symbols, custom prototypes, aliases/cycles, negative zero, excess keys, and
throwing reflection traps fail closed. Transparent Proxy exclusion, raw JSON
byte identity, duplicate-key exclusion, full same-realm primordial isolation,
cross-file atomicity, interval integrity, and ABA exclusion are not established.
The parent slot table and tzdb registry descriptor are reobserved after resolver
loading, but pre/post equality is not proof that an ABA mutation did not occur.

The package performs one process-local `WeakSet` capability-registration
mutation for a successful candidate. It performs no persistent, user-state, or
Schema-13 mutation, so it issues no mutation epoch receipt. Its no-storage-read
claim is limited to user/business storage: runtime module loading and bundled
tzdb artifact access are not excluded. Any future persistence must separately satisfy the project's
mutation epoch and atomic commit boundary. `legacy-v13 / targetSchema 13 /
migrationId null` is recorded only as project context and is not inherited as a
Ziwei product identity.

Passing tests changes no admission count. Binding remains `0/27`, independent
experts remain `0/2`, and all content, expert, rights/legal, release, deployment,
public-release, and high-risk authority fields remain false.

Focused validation:

```powershell
node_modules\.bin\tsc.cmd --noEmit -p packages\ziwei-civil-time-input-resolution-draft\tsconfig.json
node_modules\.bin\vitest.cmd run packages\ziwei-civil-time-input-resolution-draft\src\index.test.ts
```
