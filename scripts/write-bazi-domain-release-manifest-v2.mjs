import { realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH,
  buildCurrentBaziDomainReleaseManifestV2,
  serializeBaziDomainReleaseManifestV2
} from "./bazi-domain-release-manifest-v2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function writeBaziDomainReleaseManifestV2File(target, manifest) {
  await writeFile(target, serializeBaziDomainReleaseManifestV2(manifest), {
    encoding: "utf8",
    flag: "wx"
  });
}

let isDirectEntry = false;
if (process.argv[1]) {
  try {
    isDirectEntry = await realpath(path.resolve(process.argv[1])) === await realpath(fileURLToPath(import.meta.url));
  } catch {
    console.error("BAZI_DOMAIN_RELEASE_MANIFEST_V2_WRITE_FAILED CLI_ENTRY_UNRESOLVABLE");
    process.exitCode = 1;
  }
}

if (isDirectEntry) {
  if (process.argv.length !== 2 || process.env.NODE_OPTIONS) {
    console.error("BAZI_DOMAIN_RELEASE_MANIFEST_V2_WRITE_FAILED CLI_INVOCATION_REJECTED");
    process.exitCode = 1;
  } else {
    try {
      const manifest = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
      const target = path.resolve(workspaceRoot, ...BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH.split("/"));
      await writeBaziDomainReleaseManifestV2File(target, manifest);
      console.log(JSON.stringify({
        written: BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH,
        manifestDigest: manifest.manifestDigest
      }));
    } catch (error) {
      console.error(
        "BAZI_DOMAIN_RELEASE_MANIFEST_V2_WRITE_FAILED",
        error?.code ?? error?.name ?? "UNKNOWN"
      );
      process.exitCode = 1;
    }
  }
}
