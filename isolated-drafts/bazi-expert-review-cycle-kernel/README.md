# Bazi expert review cycle kernel draft

This is a standalone, non-workspace, zero-instance, authority-none contract
draft for the Bazi expert-review lifecycle. It has no `package.json`, package
name, export, workspace link, root dependency, or production integration.

The draft adds two deliberately narrow executable boundaries:

1. `evaluateBaziExpertReviewCycleTransition` parses a closed transition request
   and always returns a deterministic failure response. The currently relevant
   `request_collection_start` path binds the exact red conditions observed at
   this tranche: formal packet/intake drift, no current packet closure, Bazi
   binding freeze `0/12`, incomplete source and three-layer rights bundles, no
   owner external-intake authorization, no participation consents, no verified
   authority/identity/credential/scope/independence/opinion instances, no
   immutable bundle manifest, and no Schema 13 mutation-epoch/atomic/ABA
   receipts.
2. `inspectBaziExpertReviewBundleManifestCandidate` accepts only the exact
   zero-instance shape for sixteen future receipt families. Any non-empty
   family is rejected instead of being treated as synthetic evidence. The
   report is a diagnostic candidate only; it never creates or accepts a formal
   manifest.

All recognized positive lifecycle operations remain non-executable in this
version. That includes authority verification, independence, blind opinions,
sealing, disagreement inventory, reconciliation, bundle sealing, correction,
withdrawal, credential revocation, and artifact-drift invalidation. The
append-only/re-close ideas are explicitly candidate requirements with
`baziOwnerAcceptanceRecorded=false`, `countsAsCurrentBaziPolicy=false`, and
`inheritedFromVedicAuthority=false`. They do not claim a current Bazi policy,
persistent ledger, issued receipt, or working positive transition. Cross-phase
lifecycle events do not assert a single valid from-state in this draft.

## Boundary that must remain explicit

- Default release governance stays `legacy-v13 / targetSchema 13 /
  migrationId null`.
- `reviewCycleEpoch` is a new D-line draft identity only. It is not and must
  never be reported as the missing Schema 13 mutation epoch.
- Every failure response projects identical previous/next state, review-cycle
  epoch, state digest, chain head, consumed-nonce head, and
  credential-revocation head values. With no store or commit observer, that is
  not proof that any external state remained unchanged.
- The returned `failureResponseDigest` identifies only the closed response
  projection. It is not a digital signature, accepted receipt, persistence
  proof, first-seen proof, custody proof, or cross-process replay proof.
- The runtime evaluator does not read upstream files. Focused tests compare the
  pinned observation hashes with current workspace bytes; the protocol labels
  those pins `observationOnly` and
  `upstreamBytesVerifiedByKernelRuntime=false`.
- No explicit real-name, credential, opinion, signature, private-dossier, or
  quote field is accepted. Opaque 64-hex identifiers and heads are not inspected
  for their derivation, so both APIs fix `personDataPresenceAssessed=false`,
  `personDerivedDigestExcluded=false`, and `safeToPublish=false`.
- Closed JSON capture applies a defensive per-array length ceiling of `4096`
  before manifest-shape validation. This does not allow one through 4096
  receipts: every one of the sixteen manifest families must still have exactly
  length zero. It is not a total byte, node, object-key, string, recursion-depth,
  CPU, memory, or general denial-of-service budget.
- The parser captures the relevant primordials at module load and avoids live
  array iteration/method dispatch in its security-sensitive capture, zero-count,
  freeze, and digest paths. Focused regressions cover post-import mutation of
  `push`, `map`, array iteration, WeakSet methods, inherited numeric setters,
  and inherited descriptor `value`. Descriptor maps and descriptor fields must
  pass captured own-property checks. This is not a sandbox and does not
  establish safety for a realm compromised before module evaluation.
- Append-only correction/withdrawal/revocation and gate re-close behavior is a
  proposed Bazi draft requirement only. This draft does not implement or
  persist it and cannot obtain owner acceptance for it.
- Content truth, expert truth, rights/legal judgment, release readiness,
  expert-claim authorization, public-release authorization, and public
  deployment authorization all remain false.

The standalone directory is absent from the saved Bazi v1.7 component path set
and does not modify the saved manifest, expert packet, intake gap, central
registry, Web/runtime consumers, root `package.json`, or lockfile. A focused
isolation observation verifies no literal reference in the enumerated current
code/JSON/YAML/PowerShell/shell/HTML/CSS/Markdown/text files under `apps/`,
`packages/`, and `scripts/`, plus selected root toolchain files, except the
explicitly restricted and uninspected
`apps/web/src/lib/local-user-data-cleanup.ts`. It is not registered in the
generic workspace draft gate, and it does not prove that the restricted file,
unscanned binary formats, or every possible future computed import is clean.
