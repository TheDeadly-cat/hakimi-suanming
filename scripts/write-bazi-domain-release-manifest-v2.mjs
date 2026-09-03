import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH,
  buildCurrentBaziDomainReleaseManifestV2,
  serializeBaziDomainReleaseManifestV2
} from "./bazi-domain-release-manifest-v2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2 || process.env.NODE_OPTIONS) {
  console.error("BAZI_DOMAIN_RELEASE_MANIFEST_V2_WRITE_FAILED CLI_INVOCATION_REJECTED");
  process.exitCode = 1;
} else {
  try {
    const manifest = await buildCurrentBaziDomainReleaseManifestV2(workspaceRoot);
    const target = path.resolve(workspaceRoot, ...BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH.split("/"));
    await writeFile(target, serializeBaziDomainReleaseManifestV2(manifest), {
      encoding: "utf8",
      flag: "wx"
    });
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
