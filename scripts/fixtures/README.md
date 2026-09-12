# Historical manifest v2 inputs

`bazi-domain-manifest-v2-original-inputs.zip` contains 37 original input files for the persisted Bazi manifest v2 and its selected dependency chain. Its SHA-256 is `0d9659b5eb8f652c0803305cbc4372c97cfc46f7d711ceeb5c7dfae98bec71be`. Each entry was checked against the original component or upstream basis pin.

Three inputs were recovered from local Git blobs and verified without executing them:

| Original path | Bytes | Git blob OID | SHA-256 |
| --- | ---: | --- | --- |
| packages/knowledge-core/src/index.ts | 39595 | ea3284d85e2be067a34abe8f6c0181177fd4a788 | 9e6420e8c6c5b3aafd892fdb3c5363af81ea9d9e24ebff6e11897300053524b0 |
| package-lock.json | 175812 | 7a8a2964aae53981c5742d3633af3f5e472c193f | 40a02c7c3166f0c9bc03afa9c1d1f342fb7f54efe1abbf7cb3f5cf6ecb482a4d |
| packages/research-export/src/single-chart-report.ts | 161365 | 5daf540b7fc30c21cf28a156419d7d495e14bf25 | 215a470e79ea6eb844b41a5aad18867279d1a7ae60fd2b9cf6a364cc2c1b5082 |

Tests extract the ZIP into a temporary historical input root. Verifier modules and CLI entry points always load from the current repository. The archived TypeScript is input data; do not import it or install dependencies using the archived lock.

The existing CLI accepts `--historical-input-root <directory>` after extraction. A historical verification result does not select a current manifest or grant content, expert, or release authority. The default invocation continues to check repository inputs without an archive fallback.

## Historical independent source requirements v1 inputs

`independent-source-requirements-v1-original-inputs.zip` contains the 12 exact original inputs needed by the persisted Ziwei and Western v1 requirement ledgers. ZIP SHA-256: `01d97b68ce0ca1380feb72e72a2375e6e25507051301c4972c489639349833d2`. It retains the two ledgers, their six basis artifacts, and the existing HKO child with its three local replay inputs. No remote source check or expert qualification is implied.

Two historical contract sources were recovered from local Git blobs and matched to the original ledger pins:

| Original path | Bytes | Git blob OID | SHA-256 |
| --- | ---: | --- | --- |
| packages/ziwei-doushu-contracts-draft/src/index.ts | 45329 | c81395a8a04c65b3923cf610c33376d5168aba0f | 0474abe7170f17352efd9b0d0f2735f2edbec049bb331441b7bd77ff2b79acc0 |
| packages/western-astrology-contracts-draft/src/index.ts | 41394 | bfe3662fa37bd4e273d298c30a4c9a6ed7b44d65 | 3568cbe0568382354ed59c6bb9bacd0cf4c4d3c52490c1a80a614f2e9db60515 |

The historical test imports verifier modules from the current repository and reads only data from its guarded temporary archive extraction. The archived TypeScript is hashed as data and never imported. This is a separate historical time slice from registry v1 and manifest v2; their existing inputs and pins remain unchanged. The default current commands still resolve the canonical current index without an archive fallback.

## Historical Bazi surface v1.7 domain inputs

`bazi-v17-domain-original-inputs.zip` contains the original v1.7 manifest plus its 34 distinct component inputs. ZIP bytes: 227915. SHA-256: `b00795e335c132350204baabb7e92519dd94f614c789e44211d4b65f9e4908f5`.

Every input matches the original manifest's unchanged file SHA-256. The existing readiness fixture `bazi-expert-intake-readiness-1.5.original.json` supplies the 26038-byte original of `content/system-admission/bazi-binding-freeze-requirements.v1.json`, SHA-256 `662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201`. Other changed inputs were recovered as exact Git blobs; no old opinion or digest was rewritten.

The current verifier reproduces manifest digest `60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932` using this complete historical input root. Tests retain all authorization/count/status and component tampering controls, and separately require the historical verifier to reject today's checkout without borrowing this archive.

The archived JavaScript, TypeScript and package file are input data only. Do not execute their modules or install their dependencies. This is a different historical input slice from manifest v2 and the four-system registry; it cannot supply the latter's missing 20351-byte Western document or grant current/expert/release authority. Original-byte recovery and execution logs remain on Z drive under `governance-failure-triage/bazi-v17-history-fixture-v1/`.
