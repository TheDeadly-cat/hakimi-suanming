import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import { canonicalJson, collectArtifactEntries, readStableRegularFileSnapshot, sha256 } from "./release-evidence-lib.mjs";

// Selection of the already verified personal-use artifact. This does not select
// a new source build or confer content/expert/public-release admission.
export const LOCAL_RESEARCH_RELEASE = Object.freeze({
  buildVersion: "c15ef05bb165",
  evidenceId: "hre1-fe550f335b9d1166535e59d0dbb5db13",
  lockSha256: "1403c9d765fff226b68d5b51e9cbe2c9cb724d7e3fc47893d3d3fa081d38227e",
  artifactSetDigest: "d6774223f58104c78a88df7daef9c771b23a7dc854cf46de240fbe54a7da7cd6",
  fileCount: 137,
  origin: "http://127.0.0.1:5188/",
  nodeVersion: "24.16.0"
});
const LOCK_PATH = "tmp/release-artifact-identity.json";
const PACKAGE_MANIFEST = "local-package-files.json";
const FIXED_RUNTIME_FILES = Object.freeze([
  "LOCAL-RESEARCH-INSTALL.txt",
  "scripts/local-research.mjs",
  "scripts/local-research-package-lib.mjs",
  "scripts/release-artifact-identity-lib.mjs",
  "scripts/release-evidence-lib.mjs",
  "scripts/formal-npm-lifecycle-closure-lib.mjs",
  "scripts/install-local-research.ps1",
  "scripts/launch-local-research.ps1"
]);
const SOURCE_ROOT = fileURLToPath(new URL("../", import.meta.url));

// The caller supplies an entry from the already verified artifact lock. Hash
// chunks as they arrive; never accumulate an unknown listener's complete body.
export async function matchesLocalProbeResponse(response, expected) {
  if (!Number.isSafeInteger(expected?.size) || expected.size < 0
    || !/^[a-f0-9]{64}$/u.test(expected.sha256 ?? "")) {
    throw new Error("Probe requires a bounded artifact file identity.");
  }
  const reader = response.body?.getReader();
  if (!reader) return false;
  let completed = false;
  try {
    const length = response.headers.get("content-length");
    if (response.status !== 200 || (length !== null
      && (!/^(0|[1-9][0-9]*)$/u.test(length) || Number(length) !== expected.size))) return false;
    const digest = createHash("sha256");
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        completed = true;
        return received === expected.size && digest.digest("hex") === expected.sha256;
      }
      if (value.byteLength > expected.size - received) return false;
      received += value.byteLength;
      digest.update(value);
    }
  } finally {
    if (!completed) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function requireOutside(source, destination) {
  const relative = path.relative(path.resolve(source), path.resolve(destination));
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Output must be outside the input package/artifact workspace.");
  }
}
async function copyBytes(source, destination, containmentRoot) {
  const snapshot = await readStableRegularFileSnapshot(source, { containmentRoot, label: "Local package input" });
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, snapshot.bytes, { flag: "wx" });
  return snapshot;
}
// Explicit next local engineering candidate; never selected by version ordering.
// The built application belongs to this source commit; packaging changes are separate.
export const LOCAL_RESEARCH_CANDIDATE = Object.freeze({
  buildVersion: "ab0f35c0d9d1",
  sourceCommit: "564f88e7f47844d10e26bbc79c34e1ce48edf77a",
  evidenceId: "hre1-8b9009e2be973f93113abb9fded99932",
  lockSha256: "78ab59d932cbfec75c63a2f94eaa91f7ae24e2a066eaaaa54a210e8e9773ecc9",
  artifactSetDigest: "45b1b94bedb1995f031cf025f25b349917dadabefc07916fca36b478c83c3459",
  fileCount: 137,
  origin: "http://127.0.0.1:5189/",
  nodeVersion: "24.16.0",
  packageRevision: "1",
  localEngineeringCandidate: true,
  formalAdmissionAuthorized: false,
  expertClaimsAuthorized: false,
  publicReleaseAuthorized: false
});
const CANDIDATE_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-ab0f35c0d9d1/journal-integrity-mobile-actions.json",
    "sha256": "a38f600482f662ee512cfd2237b38ad2ba7ed19a38ee8387ba949fc14a2892eb"
  },
  {
    "path": "tmp/delivery-receipts-ab0f35c0d9d1/persistent-delivery.json",
    "sha256": "06aa075381891dd17c1ebd9e8ae683cb0817f836f9e8f0ad7b431c32f6a86ed7"
  },
  {
    "path": "tmp/delivery-receipts-ab0f35c0d9d1/persistent-results.json",
    "sha256": "834fffe1a6e20b20d51597edf97ea249208e0bcce386fa230540c1ce0ee3e483"
  },
  {
    "path": "tmp/delivery-receipts-ab0f35c0d9d1/pwa.json",
    "sha256": "72a5455f85e0bad05407cd5b1b08bf1f8a899cf61a100785723dfc7e37038d1c"
  },
  {
    "path": "tmp/delivery-receipts-ab0f35c0d9d1/pwa-run.log",
    "sha256": "9a4d2028bf900801e0c62bf6a0790d1e23eb998fe5935ecd6cab0a3b4f76b8c6"
  }
].map((entry) => Object.freeze(entry)));

// PR #16's previously tested artifact is a separate selection. The original
// ab0 definition, receipts and runtime entry points remain available unchanged.
export const LOCAL_RESEARCH_EVENT_INDEX_CANDIDATE = Object.freeze({
  buildVersion: "f0430d400b64",
  sourceCommit: "2482941f46acafc6fe0b331f536db06a45710fc8",
  evidenceId: "hre1-e735fd9bc9080ab00280ac0feee7f7b4",
  lockSha256: "ba590e52629a61fba574be0912bc886e00a848b8c45c4778ba8cd7b7d15b40c5",
  artifactSetDigest: "d44120bfe3bb41cec77b7871deb6469d25b554778dffa2271f39095a61e33e45",
  fileCount: 137,
  artifactRoot: "candidate-artifact",
  origin: "http://127.0.0.1:5189/",
  nodeVersion: "24.16.0",
  packageRevision: "1",
  localEngineeringCandidate: true,
  formalAdmissionAuthorized: false,
  expertClaimsAuthorized: false,
  publicReleaseAuthorized: false
});
const EVENT_INDEX_RECEIPTS = Object.freeze([
  {
    path: "tmp/delivery-receipts-f0430d400b64/evidence-receipt.json",
    sha256: "4110ee321fdc9726003314260238f2ff2bd8df87cfd4e41670bcb0224eb6a82d"
  },
  {
    path: "tmp/delivery-receipts-f0430d400b64/source-git-binding.json",
    sha256: "0b3e433defea738a1057ce990073b2771891ac2a6efbdffb56a6de4adfa779a1"
  }
].map((entry) => Object.freeze(entry)));

// An explicitly frozen dirty application snapshot. baseCommit is its ancestor,
// not a claim that the commit contains the uncommitted application changes.
// Packaging tools are bound separately by the complete package file manifest.
export const LOCAL_RESEARCH_CONVERGENCE_CANDIDATE = Object.freeze({
  buildVersion: "480f5f822bd1",
  baseCommit: "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  sourceDirty: true,
  sourceTreeDigest: "c466bf6ae3e1b3b34c4bb1261709bc6ae34d84554e918921e3c94dafc6512e27",
  evidenceId: "hre1-8c689e0d9d9066f4e931722c5824aec0",
  lockSha256: "1aaaf43aa634d7698e83bc38175c1d0aafc4174246c448d4dd755f59afe3c235",
  artifactSetDigest: "1f3ed95d99541cacc10e7b7891be826c25b7712f96484a11c7fcefedf5d4f696",
  fileCount: 137,
  artifactRoot: "candidate-artifact",
  origin: "http://127.0.0.1:5189/",
  nodeVersion: "24.16.0",
  packageRevision: "1",
  localEngineeringCandidate: true,
  formalAdmissionAuthorized: false,
  expertClaimsAuthorized: false,
  publicReleaseAuthorized: false
});
const CONVERGENCE_RECEIPTS = Object.freeze([
  {
    path: "tmp/delivery-receipts-480f5f822bd1/browser-receipt.json",
    sha256: "065697afad391405d4b49fe327962f5b80df62ca775f0585f28393c3b6925c30"
  },
  {
    path: "tmp/delivery-receipts-480f5f822bd1/application-source-binding.json",
    sha256: "12b162ca4283d39c9cad419f29fa19e0f4024821b407fdab77e1a6a676f792ca"
  },
  {
    path: "tmp/delivery-receipts-480f5f822bd1/candidate-identity.json",
    sha256: "9c0e918dffc26a8773ee534f88fe9172696330d14e26937093705935a4989eb5"
  }
].map((entry) => Object.freeze(entry)));

// No placeholder identity: a real successful build and its immutable receipts
// must be supplied before this separate free-trial selection can be sealed.
export const LOCAL_RESEARCH_TRIAL_CANDIDATE = Object.freeze({
  "buildVersion": "d66d77a2fbab",
  "baseCommit": "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  "sourceDirty": true,
  "sourceTreeDigest": "aa8ee8020bcac47f9c51c2e101d4ecf91221e29434366f8df1305a2e780e9859",
  "evidenceId": "hre1-6258d49c7267a12ee0d7999002e97c7d",
  "lockSha256": "745e0d33d46f89b6827cea8b5a37d5e0470f520f20a03f645c7e58d1612f5fa7",
  "artifactSetDigest": "52421f6b0f028b0b195de3b57b94e8833d95ee1701e88a9002e57b94dfd07911",
  "fileCount": 160,
  "artifactRoot": "candidate-artifact",
  "origin": "http://127.0.0.1:5199/",
  "nodeVersion": "24.16.0",
  "packageRevision": "1",
  "localEngineeringCandidate": true,
  "formalAdmissionAuthorized": false,
  "expertClaimsAuthorized": false,
  "publicReleaseAuthorized": false
});
const TRIAL_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-d66d77a2fbab/browser-receipt.json",
    "sha256": "1c13f0e70e5af74b0369d56c7e1457a73bdcec9614800c3dd8535eb516fce569"
  },
  {
    "path": "tmp/delivery-receipts-d66d77a2fbab/source-freeze-2/application-source-binding.json",
    "sha256": "86b5608dc93c03f305822091677571a7ba348149615ab5a61948615bc8653b81"
  },
  {
    "path": "tmp/delivery-receipts-d66d77a2fbab/candidate-identity.json",
    "sha256": "d221149b6f7f3e9c54229b543a58236cdec596bc7f6e032d764a4a8e87fbaa86"
  },
  {
    "path": "tmp/delivery-receipts-d66d77a2fbab/candidate-build.json",
    "sha256": "abb4df9c71701c39579fd985cc8f3eaa602dfa5557c26307f862674d725490f6"
  }
].map((entry) => Object.freeze(entry)));

// Separate deep-reading trial; populated only after real build and browser evidence.
export const LOCAL_RESEARCH_DEEP_READING_CANDIDATE = Object.freeze({
  "buildVersion": "6fd6a67f6a6c",
  "baseCommit": "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  "sourceDirty": true,
  "sourceTreeDigest": "37310c2c2c1fc2a4e50fcb35e6c0c1dea3637b2c41a9300c5a678a455b3c7c56",
  "evidenceId": "hre1-43085ceeb076949c847478062a7b4fd6",
  "lockSha256": "226d7b5731d9b7060f5d6975285b53c229257f5563dffda486671afc485959be",
  "artifactSetDigest": "713f223a5b68b4f0f5cd4e91522e3786dd0b3c6cd917b78301dbebb905986d33",
  "fileCount": 137,
  "artifactRoot": "candidate-artifact",
  "origin": "http://127.0.0.1:5201/",
  "nodeVersion": "24.16.0",
  "packageRevision": "1",
  "localEngineeringCandidate": true,
  "formalAdmissionAuthorized": false,
  "expertClaimsAuthorized": false,
  "publicReleaseAuthorized": false
});
const DEEP_READING_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-6fd6a67f6a6c/browser-receipt.json",
    "sha256": "3a907a05968b1609545e498ad3c1e681d264b972a5e9876f8136248360365e18"
  },
  {
    "path": "tmp/delivery-receipts-6fd6a67f6a6c/application-source-binding.json",
    "sha256": "93db09e5d85bb6172d7c07453cfb276b341120db035defc4875c43695dc64069"
  },
  {
    "path": "tmp/delivery-receipts-6fd6a67f6a6c/candidate-identity.json",
    "sha256": "6ef5ab1a92297284f6013588f360ac5fef673566a15db25f7188d5b97d8e05dc"
  },
  {
    "path": "tmp/delivery-receipts-6fd6a67f6a6c/candidate-build.json",
    "sha256": "17b1dd0ad334fb860f6a956637daee5b9902d853783416b15401486a7181402b"
  }
].map((entry) => Object.freeze(entry)));

// Separate 2026-10-21 reading trial. Report edition 0.17 is not an app or DB
// schema version. Populate only this slot after a real locked build and review.
export const LOCAL_RESEARCH_READING_017_CANDIDATE = Object.freeze({
  "buildVersion": "b43c3a06d356",
  "baseCommit": "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  "sourceDirty": true,
  "partialSourceDigest": "87f2457f3dc96fac7f66c262416c68fc7e5301de71d97ea820e6d25b9af72930",
  "sourceIdentityScope": "Explicit application/source set excluding protected file; not a full source-tree identity. Normal compiler traversal retained.",
  "evidenceId": "hre1-516514a819fc2c43beb277a2510436f5",
  "lockSha256": "f6f72d5beedb7db605fc91274be12d81cc4d2478c915d0df600139104d720cd1",
  "artifactSetDigest": "783a82e6814ae8984c41a2406e52c4a0277faa45f5b7701dde4fb2abcca5eb0b",
  "fileCount": 142,
  "artifactRoot": "candidate-artifact",
  "origin": "http://127.0.0.1:5202/",
  "nodeVersion": "24.16.0",
  "packageRevision": "1",
  "displayName": "哈基米八字试用版",
  "displayVersion": "2026-10-21",
  "reportEdition": "0.17.0",
  "applicationVersion": "0.2.0-p0",
  "localEngineeringCandidate": true,
  "formalAdmissionAuthorized": false,
  "expertClaimsAuthorized": false,
  "publicReleaseAuthorized": false
});
const READING_017_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-b43c3a06d356/application-source-binding.json",
    "sha256": "c46511afd1773049fa130de753fc05aa558fa63135e9533de49e972db3da557d"
  },
  {
    "path": "tmp/delivery-receipts-b43c3a06d356/build-receipt.json",
    "sha256": "5f468c64b2c99764221428b31c231d8c41a91161fffce92d616e1c4df08ea13e"
  },
  {
    "path": "tmp/delivery-receipts-b43c3a06d356/candidate-identity.json",
    "sha256": "04b12f3dbc1e902c65bcaa0c5d21394866e05fd60359771fda62aa6c9097c3d6"
  },
  {
    "path": "tmp/delivery-receipts-b43c3a06d356/build.log",
    "sha256": "a191d7d8c492f03a27c2610060cf8d08e01783b6172de85c4c6e63d34da8a8d8"
  },
  {
    "path": "tmp/delivery-receipts-b43c3a06d356/build-local.mjs",
    "sha256": "38c44c4b769c413db99d64be133e68d7e72eb2d060542b45dd422060e4d68f39"
  },
  {
    "path": "tmp/delivery-receipts-b43c3a06d356/vite.config.mjs",
    "sha256": "47d072b33f0f5b1dcfae593346c39740856e6020c02deffb9e47ceb227ee1998"
  }
].map((entry) => Object.freeze(entry)));

// Reading consistency update: a new immutable selection, on the existing 5202
// origin so the user's browser storage remains in the same place. Old 017 stays.
export const LOCAL_RESEARCH_READING_018_CANDIDATE = Object.freeze({
  "buildVersion": "10fb8875506c",
  "baseCommit": "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  "sourceDirty": true,
  "partialSourceDigest": "e1d036bd0e5d73d07d3e59b524f06a84eac8ae7099166debec3ff4841b09b457",
  "sourceIdentityScope": "Explicit application/source set excluding protected file; not a full source-tree identity. Normal compiler traversal and all Vite plugins retained.",
  "evidenceId": "hre1-0906d9f2dfe6500f5a6b893c2382c465",
  "lockSha256": "df1822f417c134bcdd95e8c0ae5658a956edee445392ab414852a318addb938a",
  "artifactSetDigest": "9b655eb34c0b061a16e88e5e880e8a60f01a9e25e797efc6c495aa93c498eb5b",
  "fileCount": 142,
  "artifactRoot": "candidate-artifact",
  "origin": "http://127.0.0.1:5202/",
  "nodeVersion": "24.16.0",
  "packageRevision": "1",
  "displayName": "哈基米八字试用版",
  "displayVersion": "2026-10-21 · 解读一致性更新",
  "reportEdition": "0.18.0",
  "synthesisVersion": "0.18.0",
  "applicationVersion": "0.2.0-p0",
  "localEngineeringCandidate": true,
  "formalAdmissionAuthorized": false,
  "expertClaimsAuthorized": false,
  "publicReleaseAuthorized": false
});
const READING_018_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-10fb8875506c/application-source-binding.json",
    "sha256": "c6034047bc555f2f8d753a1cf306c5f33ad0d254f4ce6954e3503bbe6d215085"
  },
  {
    "path": "tmp/delivery-receipts-10fb8875506c/build-receipt.json",
    "sha256": "8c5bd756aef210524909dcc31247b6eb618125f1237074bcb6f87fe08eab332d"
  },
  {
    "path": "tmp/delivery-receipts-10fb8875506c/candidate-identity.json",
    "sha256": "89187bb3459a2d13165b021c0956189c9b95ab804b52b27aa8820d81432b1f27"
  },
  {
    "path": "tmp/delivery-receipts-10fb8875506c/build.log",
    "sha256": "69e6f3019a0043e6e2cd2c6aed393268a6bd8bbb99fbd37e641df11b3188d155"
  },
  {
    "path": "tmp/delivery-receipts-10fb8875506c/build-helper.mjs",
    "sha256": "b364ffa64baaa85908dd585229c2967a9ee7162d1ccfeafdf33d0cabde2fa4f7"
  },
  {
    "path": "tmp/delivery-receipts-10fb8875506c/vite.config.mjs",
    "sha256": "53a5a4b17302b603d7f965888066c3aa8651f15a418f1a1371535550292c0950"
  }
].map((entry) => Object.freeze(entry)));

// Full plain-language reading update; filled only from the real 019 artifact.
// Retain the immutable 017/018 selections and the existing 5202 data origin.
export const LOCAL_RESEARCH_READING_019_CANDIDATE = Object.freeze({
  "buildVersion": "203ac377160f",
  "baseCommit": "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  "sourceDirty": true,
  "partialSourceDigest": "93bd6e4227305d7cb78d2f8c7644c0c9a4790057d177f29628457348d946282c",
  "sourceIdentityScope": "Explicit application/source set excluding protected file; not a full source-tree identity. Normal compiler traversal and all Vite plugins retained.",
  "evidenceId": "hre1-9bc73030c3b31f54bbcaf90cbe3eff23",
  "lockSha256": "46d1ec976f15381c2372754842d1d3079612eea059795231754d321c557f1c7e",
  "artifactSetDigest": "8fa18c2814096bf1d153fa9933f1ab8ff629bb6a1987d1a483143a9e021685ad",
  "fileCount": 142,
  "artifactRoot": "candidate-artifact",
  "origin": "http://127.0.0.1:5202/",
  "nodeVersion": "24.16.0",
  "packageRevision": "1",
  "displayName": "哈基米八字试用版",
  "displayVersion": "2026-10-22 · 完整白话解读更新",
  "reportEdition": "0.19.0",
  "synthesisVersion": "0.19.0",
  "applicationVersion": "0.2.0-p0",
  "localEngineeringCandidate": true,
  "formalAdmissionAuthorized": false,
  "expertClaimsAuthorized": false,
  "publicReleaseAuthorized": false
});
const READING_019_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-203ac377160f/application-source-binding.json",
    "sha256": "ce52cc0489fcdec5a183cece05f66314a71a08abb112edf6da7b4c7ccb2b5466"
  },
  {
    "path": "tmp/delivery-receipts-203ac377160f/build-receipt.json",
    "sha256": "f4a1fdea08aed840a6911b6e0024de5c99ee7d413c23fa39d05ad1e74dfab31d"
  },
  {
    "path": "tmp/delivery-receipts-203ac377160f/candidate-identity.json",
    "sha256": "4b34afa38780653665ab7ca414b24f62b1289ec5c19043e8ecc84ec0e9282171"
  },
  {
    "path": "tmp/delivery-receipts-203ac377160f/build.log",
    "sha256": "6ac97724f3e1e85ab42184269eff7cae888658cfa1cea96e074b99b4a00be929"
  },
  {
    "path": "tmp/delivery-receipts-203ac377160f/build-helper.mjs",
    "sha256": "682fb940aeeabb225e7ad184e24ece51dad8637bc2b82f7cbae62fd735ff7a1a"
  },
  {
    "path": "tmp/delivery-receipts-203ac377160f/vite.config.mjs",
    "sha256": "ab3a4ca154d7006df9554059322a4dedbc64e03ef56c61709eb511291c6419f8"
  }
].map((entry) => Object.freeze(entry)));

// Concrete life-language reading update; seal only after the real 020 build.
// Existing selections and browser data origin remain unchanged.
export const LOCAL_RESEARCH_READING_020_CANDIDATE = Object.freeze({
  "buildVersion": "6afa6a38cc6e",
  "baseCommit": "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  "sourceDirty": true,
  "partialSourceDigest": "3d3b389f25f14cf53fcaf17b315f856a20ec57d4648d9ae5a232be9b42c10aa3",
  "sourceIdentityScope": "Explicit application/source set excluding protected file; not a full source-tree identity. Normal compiler traversal and all Vite plugins retained.",
  "evidenceId": "hre1-ec35d97cd1b9ba86db167ec191461c48",
  "lockSha256": "1d29ee52b45a505de814a431ea533aea240374a84a367c38376ff3aa0584f3b6",
  "artifactSetDigest": "69064ec03d686be7b4b88d9cf01b787773d23901eae8048b7095c075d7e3dc7d",
  "fileCount": 142,
  "artifactRoot": "candidate-artifact",
  "origin": "http://127.0.0.1:5202/",
  "nodeVersion": "24.16.0",
  "packageRevision": "1",
  "displayName": "哈基米八字试用版",
  "displayVersion": "2026-10-22 · 具体生活白话解读更新",
  "reportEdition": "0.20.0",
  "synthesisVersion": "0.19.0",
  "synthesisSourceVersion": "hakimi.local-reading-synthesis/0.19.0",
  "applicationVersion": "0.2.0-p0",
  "localEngineeringCandidate": true,
  "formalAdmissionAuthorized": false,
  "expertClaimsAuthorized": false,
  "publicReleaseAuthorized": false
});
const READING_020_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-6afa6a38cc6e/application-source-binding.json",
    "sha256": "66317844f39a833709b5ed86f01a8beac508b702e4b253cc5b2045a939cf5189"
  },
  {
    "path": "tmp/delivery-receipts-6afa6a38cc6e/build-receipt.json",
    "sha256": "204eb93b802d235f8512087ba7156c18a5b90be53198afec0f9f17598041f4e1"
  },
  {
    "path": "tmp/delivery-receipts-6afa6a38cc6e/candidate-identity.json",
    "sha256": "36e7b79bdef880069b4cd38e43f93dbb6307f35fb483656541fbbd594676e6d4"
  },
  {
    "path": "tmp/delivery-receipts-6afa6a38cc6e/build.log",
    "sha256": "3c6f35f1dbb721e1ef8e15414e0fe3ca8a13225b503137f08daa84bae5d581f0"
  },
  {
    "path": "tmp/delivery-receipts-6afa6a38cc6e/build-helper.mjs",
    "sha256": "73370593c8886a0ed495a2c3a655598c709abfe94bf4e7824f065741775ac015"
  },
  {
    "path": "tmp/delivery-receipts-6afa6a38cc6e/vite.config.mjs",
    "sha256": "fca6ed3787332cb5658d24a78fcbe0c17c1d9b5ecb9aaa65fdb1a0895c7e2315"
  }
].map((entry) => Object.freeze(entry)));

// Differentiated life-language reading update; seal only after the real 021 build.
// Existing selections and browser data origin remain unchanged.
export const LOCAL_RESEARCH_READING_021_CANDIDATE = Object.freeze({
  "buildVersion": "78847c37a740",
  "baseCommit": "6cb7075ff16980972fb6d4ac4738e3d186c181cf",
  "sourceDirty": true,
  "partialSourceDigest": "60f99fa24127de793411047e1130efbb1f5a098d05aa6b1efdf8c8bfd56e336f",
  "sourceIdentityScope": "Explicit application/source set excluding protected file; not a full source-tree identity. Normal compiler traversal and all Vite plugins retained.",
  "evidenceId": "hre1-c96e883068df2afb0096abc234e244ad",
  "lockSha256": "5b26d32d70026335a1e05b0b790b490f6482f4f50769fb2bc368c4c93a43dae7",
  "artifactSetDigest": "647ab2eb54d7139227a42ee97e48b356bc05c9eeb7aede98081046ad333b96ae",
  "fileCount": 142,
  "artifactRoot": "candidate-artifact",
  "origin": "http://127.0.0.1:5202/",
  "nodeVersion": "24.16.0",
  "packageRevision": "1",
  "displayName": "哈基米八字试用版",
  "displayVersion": "2026-10-22 · 差异化生活解读更新",
  "reportEdition": "0.21.0",
  "synthesisVersion": "0.19.0",
  "synthesisSourceVersion": "hakimi.local-reading-synthesis/0.19.0",
  "applicationVersion": "0.2.0-p0",
  "localEngineeringCandidate": true,
  "formalAdmissionAuthorized": false,
  "expertClaimsAuthorized": false,
  "publicReleaseAuthorized": false
});
const READING_021_RECEIPTS = Object.freeze([
  {
    "path": "tmp/delivery-receipts-78847c37a740/application-source-binding.json",
    "sha256": "a0f5cdffb1cf93eaa7e5cb1956d8f29df8d96d15b391b7ef29da4251382b56b6"
  },
  {
    "path": "tmp/delivery-receipts-78847c37a740/build-receipt.json",
    "sha256": "20850bc99902b0e74cce7def6e20b85870fafb2743cd5caa9177ef674c635f3c"
  },
  {
    "path": "tmp/delivery-receipts-78847c37a740/candidate-identity.json",
    "sha256": "4f8e36651775d241c8a4064e2c670fd892fd9ab5d5779153e8ce9e780cd3bfa2"
  },
  {
    "path": "tmp/delivery-receipts-78847c37a740/build.log",
    "sha256": "8f77ef630f323c19b3dc093a6f5148b905a193446b5dc9bbebdeb664be17d257"
  },
  {
    "path": "tmp/delivery-receipts-78847c37a740/build-helper.mjs",
    "sha256": "a903b97ffe511ab5b2209a0f738e3c779e727303ddad390844bf03100e9e5608"
  },
  {
    "path": "tmp/delivery-receipts-78847c37a740/vite.config.mjs",
    "sha256": "0cf0a1f5533f6556a40f7d7124bd622c60b53da2a09f28d8fd9cc0eace1f1dc8"
  }
].map((entry) => Object.freeze(entry)));

// Stable local 0.21.1 trial; seal only after the frozen source is built.
// Existing 021 identity, installation and browser data origin remain unchanged.
export const LOCAL_RESEARCH_READING_0211_CANDIDATE = null;
const READING_0211_RECEIPTS = Object.freeze([]);

// Only explicit selections are accepted. Existing imports retain c15ef/ab0.
export function createLocalPackageTools(release) {
  if (!release) throw new Error("The selected local artifact has not been sealed; no package or service can be created.");
  if (release !== LOCAL_RESEARCH_RELEASE && release !== LOCAL_RESEARCH_CANDIDATE
    && release !== LOCAL_RESEARCH_EVENT_INDEX_CANDIDATE
    && release !== LOCAL_RESEARCH_CONVERGENCE_CANDIDATE
    && release !== LOCAL_RESEARCH_TRIAL_CANDIDATE
    && release !== LOCAL_RESEARCH_DEEP_READING_CANDIDATE
    && release !== LOCAL_RESEARCH_READING_017_CANDIDATE
    && release !== LOCAL_RESEARCH_READING_018_CANDIDATE
    && release !== LOCAL_RESEARCH_READING_019_CANDIDATE
    && release !== LOCAL_RESEARCH_READING_020_CANDIDATE
    && release !== LOCAL_RESEARCH_READING_021_CANDIDATE
    && release !== LOCAL_RESEARCH_READING_0211_CANDIDATE) {
    throw new Error("Select a documented local artifact; arbitrary release definitions are not accepted.");
  }
  const isEventIndex = release === LOCAL_RESEARCH_EVENT_INDEX_CANDIDATE;
  const isConvergence = release === LOCAL_RESEARCH_CONVERGENCE_CANDIDATE;
  const isTrial = release === LOCAL_RESEARCH_TRIAL_CANDIDATE;
  const isDeepReading = release === LOCAL_RESEARCH_DEEP_READING_CANDIDATE;
  const isReading017 = release === LOCAL_RESEARCH_READING_017_CANDIDATE;
  const isReading018 = release === LOCAL_RESEARCH_READING_018_CANDIDATE;
  const isReading019 = release === LOCAL_RESEARCH_READING_019_CANDIDATE;
  const isReading020 = release === LOCAL_RESEARCH_READING_020_CANDIDATE;
  const isReading021 = release === LOCAL_RESEARCH_READING_021_CANDIDATE;
  const isReading0211 = release === LOCAL_RESEARCH_READING_0211_CANDIDATE;
  if (isReading017 || isReading018 || isReading019 || isReading020 || isReading021 || isReading0211) {
    const origin = new URL(release.origin);
    if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || origin.pathname !== "/"
      || origin.search || origin.hash || origin.username || origin.password || origin.href !== release.origin
      || !origin.port || ["5188", "5189", "5197", "5199", "5201"].includes(origin.port)) {
      throw new Error("The reading trial requires a new explicit canonical loopback origin; old entry points are reserved.");
    }
    if (isReading018 && (release.origin !== "http://127.0.0.1:5202/" || release.reportEdition !== "0.18.0")) {
      throw new Error("The 018 update must retain the 5202 browser origin and declare its actual report edition.");
    }
    if (isReading019 && (release.origin !== "http://127.0.0.1:5202/" || release.reportEdition !== "0.19.0")) {
      throw new Error("The 019 update must retain the 5202 browser origin and declare its actual report edition.");
    }
    if (isReading020 && (release.origin !== "http://127.0.0.1:5202/" || release.reportEdition !== "0.20.0"
      || release.synthesisVersion !== "0.19.0" || release.synthesisSourceVersion !== "hakimi.local-reading-synthesis/0.19.0")) {
      throw new Error("The 020 update must retain the 5202 browser origin and declare its actual report edition.");
    }
    if (isReading021 && (release.origin !== "http://127.0.0.1:5202/" || release.reportEdition !== "0.21.0"
      || release.synthesisVersion !== "0.19.0" || release.synthesisSourceVersion !== "hakimi.local-reading-synthesis/0.19.0")) {
      throw new Error("The 021 update must retain the 5202 browser origin and declare its actual report edition and synthesis producer.");
    }
    if (isReading0211 && (release.origin !== "http://127.0.0.1:5202/" || release.reportEdition !== "0.21.1"
      || release.concretePeriodProseVersion !== "0.3.2"
      || release.synthesisVersion !== "0.19.0" || release.synthesisSourceVersion !== "hakimi.local-reading-synthesis/0.19.0")) {
      throw new Error("The 0211 update must retain the 5202 origin and declare its actual report, period prose and synthesis versions.");
    }
    if (release.artifactRoot !== "candidate-artifact" || (isReading0211 ? READING_0211_RECEIPTS : isReading021 ? READING_021_RECEIPTS : isReading020 ? READING_020_RECEIPTS : isReading019 ? READING_019_RECEIPTS : isReading018 ? READING_018_RECEIPTS : READING_017_RECEIPTS).length === 0) {
      throw new Error("The reading trial requires its real artifact root and sealed evidence receipts.");
    }
  }
  const isCandidate = release === LOCAL_RESEARCH_CANDIDATE || isEventIndex || isConvergence || isTrial || isDeepReading || isReading017 || isReading018 || isReading019 || isReading020 || isReading021 || isReading0211;
  const artifactRelativeRoot = isEventIndex || isConvergence || isTrial || isDeepReading || isReading017 || isReading018 || isReading019 || isReading020 || isReading021 || isReading0211 ? release.artifactRoot : "dist/web";
  const packageKind = isCandidate ? "local_research_candidate_package" : "fixed_local_research_package";
  const proofFiles = isReading0211 ? READING_0211_RECEIPTS : isReading021 ? READING_021_RECEIPTS : isReading020 ? READING_020_RECEIPTS : isReading019 ? READING_019_RECEIPTS : isReading018 ? READING_018_RECEIPTS : isReading017 ? READING_017_RECEIPTS : isDeepReading ? DEEP_READING_RECEIPTS : isTrial ? TRIAL_RECEIPTS : isConvergence ? CONVERGENCE_RECEIPTS : isEventIndex ? EVENT_INDEX_RECEIPTS : isCandidate ? CANDIDATE_RECEIPTS : [];
  const RUNTIME_FILES = [...(isCandidate ? FIXED_RUNTIME_FILES.map((name) => ({
    "LOCAL-RESEARCH-INSTALL.txt": isReading0211 ? "LOCAL-READING-0211-INSTALL.txt" : isReading021 ? "LOCAL-READING-021-INSTALL.txt" : isReading020 ? "LOCAL-READING-020-INSTALL.txt" : isReading019 ? "LOCAL-READING-019-INSTALL.txt" : isReading018 ? "LOCAL-READING-018-INSTALL.txt" : isReading017 ? "LOCAL-READING-017-INSTALL.txt" : isDeepReading ? "LOCAL-DEEP-READING-INSTALL.txt" : isTrial ? "LOCAL-FREE-TRIAL-INSTALL.txt" : isConvergence ? "LOCAL-CONVERGENCE-CANDIDATE-INSTALL.txt" : isEventIndex ? "LOCAL-EVENT-INDEX-CANDIDATE-INSTALL.txt" : "LOCAL-CANDIDATE-INSTALL.txt",
    "scripts/local-research.mjs": isReading0211 ? "scripts/local-research-reading-0211-candidate.mjs" : isReading021 ? "scripts/local-research-reading-021-candidate.mjs" : isReading020 ? "scripts/local-research-reading-020-candidate.mjs" : isReading019 ? "scripts/local-research-reading-019-candidate.mjs" : isReading018 ? "scripts/local-research-reading-018-candidate.mjs" : isReading017 ? "scripts/local-research-reading-017-candidate.mjs" : isDeepReading ? "scripts/local-research-deep-reading-candidate.mjs" : isTrial ? "scripts/local-research-trial-candidate.mjs" : isConvergence ? "scripts/local-research-convergence-candidate.mjs" : isEventIndex ? "scripts/local-research-event-index-candidate.mjs" : "scripts/local-research-candidate.mjs",
    "scripts/install-local-research.ps1": isReading0211 ? "scripts/install-local-reading-0211-candidate.ps1" : isReading021 ? "scripts/install-local-reading-021-candidate.ps1" : isReading020 ? "scripts/install-local-reading-020-candidate.ps1" : isReading019 ? "scripts/install-local-reading-019-candidate.ps1" : isReading018 ? "scripts/install-local-reading-018-candidate.ps1" : isReading017 ? "scripts/install-local-reading-017-candidate.ps1" : isDeepReading ? "scripts/install-local-deep-reading-candidate.ps1" : isTrial ? "scripts/install-local-trial-candidate.ps1" : isConvergence ? "scripts/install-local-convergence-candidate.ps1" : isEventIndex ? "scripts/install-local-event-index-candidate.ps1" : "scripts/install-local-candidate.ps1",
    "scripts/launch-local-research.ps1": isReading0211 ? "scripts/launch-local-reading-0211-candidate.ps1" : isReading021 ? "scripts/launch-local-reading-021-candidate.ps1" : isReading020 ? "scripts/launch-local-reading-020-candidate.ps1" : isReading019 ? "scripts/launch-local-reading-019-candidate.ps1" : isReading018 ? "scripts/launch-local-reading-018-candidate.ps1" : isReading017 ? "scripts/launch-local-reading-017-candidate.ps1" : isDeepReading ? "scripts/launch-local-deep-reading-candidate.ps1" : isTrial ? "scripts/launch-local-trial-candidate.ps1" : isConvergence ? "scripts/launch-local-convergence-candidate.ps1" : isEventIndex ? "scripts/launch-local-event-index-candidate.ps1" : "scripts/launch-local-candidate.ps1"
  })[name] ?? name) : FIXED_RUNTIME_FILES), ...(isReading0211 ? ["START-READING-0211.cmd"] : isReading021 ? ["START-READING-021.cmd"] : isReading020 ? ["START-READING-020.cmd"] : isReading019 ? ["START-READING-019.cmd"] : isReading018 ? ["START-READING-018.cmd"] : isReading017 ? ["START-READING-017.cmd"] : isDeepReading ? ["START-DEEP-READING.cmd"] : isTrial ? ["START-FREE-TRIAL.cmd"] : [])];
  async function verifyCandidateReceipts(root) {
    for (const entry of proofFiles) {
      const snapshot = await readStableRegularFileSnapshot(path.join(root, entry.path), {
        containmentRoot: root, label: isConvergence || isTrial || isDeepReading || isReading017 || isReading018 || isReading019 || isReading020 || isReading021 || isReading0211 ? "Frozen application evidence" : "Original same-artifact browser receipt"
      });
      if (snapshot.sha256 !== entry.sha256) throw new Error(`Candidate ${isConvergence || isTrial || isDeepReading || isReading017 || isReading018 || isReading019 || isReading020 || isReading021 || isReading0211 ? "evidence" : "browser"} receipt identity mismatch.`);
    }
  }
  async function verifyFixedLocalArtifact(root) {
    const absolute = path.resolve(root);
    const lockPath = path.join(absolute, LOCK_PATH);
    const snapshot = await readStableRegularFileSnapshot(lockPath, { containmentRoot: absolute, label: "Pinned local artifact lock" });
    if (snapshot.sha256 !== release.lockSha256) throw new Error("Fixed local artifact lock identity mismatch.");
    const result = await verifyReleaseArtifactIdentityLock({
      cwd: absolute, dist: path.join(absolute, artifactRelativeRoot), lockPath,
      evidenceId: release.evidenceId
    });
    if (result.lock.buildVersion !== release.buildVersion
      || result.lock.artifactSetDigest !== release.artifactSetDigest
      || result.lock.fileCount !== release.fileCount) throw new Error("Fixed local artifact identity mismatch.");
    await verifyCandidateReceipts(absolute);
    return result;
  }

  async function packageFixedLocalArtifact({ artifactWorkspace, outputDirectory }) {
    const source = path.resolve(artifactWorkspace);
    const output = path.resolve(outputDirectory);
    requireOutside(source, output);
    requireOutside(output, source);
    const verified = await verifyFixedLocalArtifact(source);
    await mkdir(output, { recursive: false });
    for (const entry of verified.lock.files) {
      const rel = `${artifactRelativeRoot}/${entry.path}`;
      const copied = await copyBytes(path.join(source, rel), path.join(output, rel), source);
      if (copied.sha256 !== entry.sha256 || copied.size !== entry.size) throw new Error("Artifact changed while packaging.");
    }
    await copyBytes(path.join(source, LOCK_PATH), path.join(output, LOCK_PATH), source);
    for (const entry of proofFiles) await copyBytes(path.join(source, entry.path), path.join(output, entry.path), source);
    for (const rel of RUNTIME_FILES) await copyBytes(path.join(SOURCE_ROOT, rel), path.join(output, rel), SOURCE_ROOT);
    const files = await collectArtifactEntries(output, [], { containmentRoot: output });
    const manifest = { schemaVersion: 1, kind: packageKind, release: release, files };
    await writeFile(path.join(output, PACKAGE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    await verifyLocalPackage(output);
    await verifyFixedLocalArtifact(source);
    return { packageRoot: output, ...release, packageFileCount: files.length + 1, rebuilt: false };
  }

  async function verifyLocalPackage(root) {
    const absolute = path.resolve(root);
    const snapshot = await readStableRegularFileSnapshot(path.join(absolute, PACKAGE_MANIFEST), {
      containmentRoot: absolute, label: "Local package file manifest"
    });
    const manifest = JSON.parse(snapshot.bytes.toString("utf8"));
    if (manifest?.schemaVersion !== 1 || manifest.kind !== packageKind
      || canonicalJson(manifest.release) !== canonicalJson(release)
      || !Array.isArray(manifest.files)) throw new Error("Local package manifest is invalid.");
    const verified = await verifyFixedLocalArtifact(absolute);
    const expectedPaths = [...verified.lock.files.map((entry) => `${artifactRelativeRoot}/${entry.path}`), LOCK_PATH, ...RUNTIME_FILES, ...proofFiles.map((entry) => entry.path)].sort();
    const actualPaths = manifest.files.map((entry) => entry.path).sort();
    if (canonicalJson(actualPaths) !== canonicalJson(expectedPaths)) throw new Error("Local package required file set is incomplete or duplicated.");
    const actual = await collectArtifactEntries(absolute, [PACKAGE_MANIFEST], { containmentRoot: absolute });
    if (canonicalJson(actual) !== canonicalJson(manifest.files)) throw new Error("Local package bytes differ from its complete file manifest.");
    return { packageRoot: absolute, manifest, manifestSha256: snapshot.sha256, artifact: verified };
  }

  async function installLocalPackage({ packageRoot, destination }) {
    const source = path.resolve(packageRoot);
    const target = path.resolve(destination);
    if (source === target) {
      await verifyLocalPackage(source);
      return { installedRoot: target, reused: true, origin: release.origin };
    }
    requireOutside(source, target);
    requireOutside(target, source);
    const verified = await verifyLocalPackage(source);
    await mkdir(path.dirname(target), { recursive: true });
    try { await mkdir(target); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = await verifyLocalPackage(target);
      if (existing.manifestSha256 !== verified.manifestSha256) throw new Error("Destination contains another package; it will not be replaced.");
      return { installedRoot: target, reused: true, origin: release.origin };
    }
    // The destination is create-only. A failed copy is retained for diagnostics;
    // it cannot be launched and a later install will not overwrite it silently.
    for (const rel of [...verified.manifest.files.map((entry) => entry.path), PACKAGE_MANIFEST]) {
      await copyBytes(path.join(source, rel), path.join(target, rel), source);
    }
    const installed = await verifyLocalPackage(target);
    if (installed.manifestSha256 !== verified.manifestSha256) throw new Error("Installed package differs from input.");
    return { installedRoot: target, reused: false, origin: release.origin };
  }

  function globalHeaders(text) {
    const headers = {};
    let active = false;
    for (const line of text.split(/\r?\n/u)) {
      if (line && !/^\s/u.test(line)) { active = line.trim() === "/*"; continue; }
      const match = /^\s+([^:]+):\s*(.+)$/u.exec(line);
      if (active && match) {
        // This directive is ignored in Report-Only (W3C upgrade-insecure-requests
        // section 3.1) and creates console errors. Adapt only the candidate HTTP
        // response; retain every other directive and the locked hosting file.
        const value = isCandidate && match[1].toLowerCase() === "content-security-policy-report-only"
          ? match[2].split(";").map((part) => part.trim())
            .filter((part) => !/^upgrade-insecure-requests(?:\s|$)/iu.test(part)).join("; ")
          : match[2];
        headers[match[1]] = value;
      }
    }
    return headers;
  }
  const CONTENT_TYPES = Object.freeze({
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
    ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".wasm": "application/wasm"
  });

  // The port is an explicit caller input only for isolated automated tests.
  // Each installed CLI binds only its selected, pinned loopback origin.
  async function startLocalPackageServer(packageRoot, { port = Number(new URL(release.origin).port) } = {}) {
    if (isCandidate && (!Number.isInteger(port) || port < 0 || port > 65535)) throw new Error("Candidate port must be an explicit integer.");
    if (isCandidate && port === 5188) throw new Error("Candidate serving may not use the daily 5188 origin.");
    if ((isReading017 || isReading018 || isReading019 || isReading020 || isReading021 || isReading0211) && [5189, 5197, 5199, 5201].includes(port)) throw new Error("Reading trial serving may not use an existing daily, development, or older trial origin.");
    if (isDeepReading && [5189, 5197, 5199].includes(port)) throw new Error("Deep reading trial serving may not use an existing daily or development origin.");
    if (isTrial && [5189, 5197].includes(port)) throw new Error("Free trial serving may not use an existing daily or development origin.");
    const verified = await verifyLocalPackage(packageRoot);
    const content = new Map();
    for (const entry of verified.artifact.lock.files) {
      const snapshot = await readStableRegularFileSnapshot(path.join(verified.packageRoot, artifactRelativeRoot, entry.path), {
        containmentRoot: verified.packageRoot, label: "Served local artifact"
      });
      if (snapshot.sha256 !== entry.sha256) throw new Error("Artifact changed before preview startup.");
      content.set(`/${entry.path}`, snapshot.bytes);
    }
    const headers = globalHeaders(content.get("/_headers").toString("utf8"));
    const server = createServer((request, response) => {
      if (request.headers.host !== `127.0.0.1:${server.address().port}`) { response.writeHead(403).end(); return; }
      if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
      let pathname;
      try { pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1/").pathname); }
      catch { response.writeHead(400).end(); return; }
      if (pathname.includes("\\") || pathname.includes("\0") || pathname.includes("..")) { response.writeHead(400).end(); return; }
      if (pathname === "/_headers" || pathname === "/release-evidence.json.sha256") { response.writeHead(404).end(); return; }
      let selected = pathname === "/" ? "/index.html" : pathname;
      if (!content.has(selected) && (request.headers.accept ?? "").includes("text/html") && !path.posix.extname(selected)) selected = "/index.html";
      const bytes = content.get(selected);
      if (!bytes) { response.writeHead(404, { "Cache-Control": "no-store" }).end(); return; }
      response.writeHead(200, { ...headers, "Content-Type": CONTENT_TYPES[path.posix.extname(selected)] ?? "application/octet-stream",
        "Cache-Control": "no-store", "Content-Length": bytes.length });
      response.end(request.method === "HEAD" ? undefined : bytes);
    });
    server.requestTimeout = 10000;
    server.headersTimeout = 10000;
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen({ host: "127.0.0.1", port, exclusive: true }, resolve); });
    return { server, origin: `http://127.0.0.1:${server.address().port}/`, release: release };
  }

  async function probeLocalPackage(packageRoot, { origin = release.origin } = {}) {
    const verified = await verifyLocalPackage(packageRoot);
    const url = new URL(origin);
    if (isCandidate && url.port === "5188") throw new Error("Candidate probing may not use the daily 5188 origin.");
    if ((isReading017 || isReading018 || isReading019 || isReading020 || isReading021 || isReading0211) && ["5189", "5197", "5199", "5201"].includes(url.port)) throw new Error("Reading trial probing may not use an existing daily, development, or older trial origin.");
    if (isDeepReading && ["5189", "5197", "5199"].includes(url.port)) throw new Error("Deep reading trial probing may not use an existing daily or development origin.");
    if (isTrial && ["5189", "5197"].includes(url.port)) throw new Error("Free trial probing may not use an existing daily or development origin.");
    if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.pathname !== "/" || url.search || url.hash || url.username) throw new Error("Probe requires an explicit loopback origin.");
    for (const name of ["index.html", "sw.js"]) {
      const expected = verified.artifact.lock.files.find((entry) => entry.path === name);
      try {
        const response = await fetch(new URL(name === "index.html" ? "" : name, url), {
          redirect: "error", signal: AbortSignal.timeout(2000), headers: { "Cache-Control": "no-cache", "Accept-Encoding": "identity" }
        });
        if (!await matchesLocalProbeResponse(response, expected)) return { state: "foreign", origin, reason: `${name} identity mismatch` };
      } catch (error) {
        if (name === "index.html" && error.cause?.code === "ECONNREFUSED") return { state: "stopped", origin };
        return { state: "foreign", origin, reason: "Listener did not return the exact fixed artifact." };
      }
    }
    return { state: "matching", origin, buildVersion: release.buildVersion };
  }
  return Object.freeze({ verifyFixedLocalArtifact, packageFixedLocalArtifact, verifyLocalPackage, installLocalPackage, startLocalPackageServer, probeLocalPackage });
}

export const { verifyFixedLocalArtifact, packageFixedLocalArtifact, verifyLocalPackage, installLocalPackage, startLocalPackageServer, probeLocalPackage } = createLocalPackageTools(LOCAL_RESEARCH_RELEASE);
