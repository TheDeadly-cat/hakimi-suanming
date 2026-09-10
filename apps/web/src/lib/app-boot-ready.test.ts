import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindReleaseIdentityAttributes } from "../../pwa-build";
import {
  BRIDGE_RELEASE_STORAGE_MANIFEST,
  PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST,
  serializeReleaseStorageManifest,
  type ReleaseStorageManifest
} from "../../release-protocol";

const baseHtml = readFileSync(path.resolve(import.meta.dirname, "../../index.html"), "utf8");
const releaseMetaNames = [
  "hakimi-release-database",
  "hakimi-release-storage-manifest",
  "hakimi-release-storage-manifest-digest",
  "hakimi-release-evidence-id",
  "hakimi-build-version"
] as const;
const initialRootAttributes = [...document.documentElement.attributes]
  .map((attribute) => [attribute.name, attribute.value] as const);
const initialReleaseMetas = releaseMetaNames.flatMap((name) =>
  [...document.querySelectorAll<HTMLMetaElement>(`meta[name="${name}"]`)]
    .map((meta) => ({ name, content: meta.content }))
);

function clearReleaseMetas(): void {
  for (const name of releaseMetaNames) {
    for (const meta of document.querySelectorAll(`meta[name="${name}"]`)) meta.remove();
  }
}

function putMeta(name: string, content: string): void {
  const meta = document.createElement("meta");
  meta.name = name;
  meta.content = content;
  document.head.append(meta);
}

function setRootAttributes(attributes: readonly (readonly [string, string])[]): void {
  const root = document.documentElement;
  for (const attribute of [...root.attributes]) root.removeAttribute(attribute.name);
  for (const [name, value] of attributes) root.setAttribute(name, value);
}

function installReleaseDocument(manifest: ReleaseStorageManifest): void {
  // Parse the real base HTML inertly: no bootstrap script or application runs.
  // Its explicit v13 root attributes must be rebound by the build function.
  const builtHtml = bindReleaseIdentityAttributes(baseHtml, manifest.database);
  const parsed = new DOMParser().parseFromString(builtHtml, "text/html");
  setRootAttributes([...parsed.documentElement.attributes].map((attribute) =>
    [attribute.name, attribute.value] as const
  ));
  clearReleaseMetas();
  const serialized = serializeReleaseStorageManifest(manifest);
  putMeta("hakimi-release-database", JSON.stringify(manifest.database));
  putMeta("hakimi-release-storage-manifest", serialized);
  putMeta("hakimi-release-storage-manifest-digest", createHash("sha256").update(serialized).digest("hex"));
  putMeta("hakimi-release-evidence-id", "unbound-local-build");
  putMeta("hakimi-build-version", "012345abcdef");
  // These two observed fields are set from CURRENT_RELEASE_DATABASE by main.
  document.documentElement.dataset.dbGeneration = manifest.database.dbGeneration;
  document.documentElement.dataset.dbSchema = String(manifest.database.targetSchema);
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PROD", true);
});

afterEach(() => {
  clearReleaseMetas();
  for (const meta of initialReleaseMetas) putMeta(meta.name, meta.content);
  setRootAttributes(initialRootAttributes);
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("application boot identity from the loaded release", () => {
  it.each([
    ["default v13", BRIDGE_RELEASE_STORAGE_MANIFEST],
    ["candidate v16", PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST]
  ] as const)("accepts matching %s output derived from the real v13 base HTML", async (_label, manifest) => {
    const originalRoot = new DOMParser().parseFromString(baseHtml, "text/html").documentElement;
    expect(originalRoot.dataset.releaseContract).toBe("legacy-v13");
    expect(originalRoot.dataset.targetSchema).toBe("13");
    expect(originalRoot.dataset.migrationId).toBe("null");
    installReleaseDocument(manifest);
    const gate = await import("./app-boot-ready");
    const { CURRENT_RELEASE_ENGINEERING_IDENTITY: identity } = await import("./current-release");
    expect(Object.isFrozen(identity)).toBe(true);
    expect(identity.dbGeneration).toBe(manifest.database.dbGeneration);
    expect(identity.targetSchema).toBe(manifest.database.targetSchema);
    gate.setAppBootReadyState(false);
    expect(gate.isAppBootReady()).toBe(false);
    gate.setAppBootReadyState(true);
    expect(gate.isAppBootReady()).toBe(true);
    expect(document.documentElement.dataset).toMatchObject({
      releaseContract: identity.dbGeneration,
      targetSchema: String(identity.targetSchema),
      migrationId: identity.migrationId ?? "null",
      engineeringEvidenceOnly: "true",
      publicReleaseAuthorized: "false",
      expertTruthClaimed: "false",
      mutationEpochBypassed: "false"
    });
    expect(document.documentElement.getAttribute("aria-busy")).toBe("false");
  });

  it("does not adopt a self-consistent v16 DOM or late metadata after loading v13", async () => {
    installReleaseDocument(BRIDGE_RELEASE_STORAGE_MANIFEST);
    const gate = await import("./app-boot-ready");
    const { CURRENT_RELEASE_ENGINEERING_IDENTITY: identity } = await import("./current-release");
    gate.setAppBootReadyState(true);
    expect(gate.isAppBootReady()).toBe(true);
    installReleaseDocument(PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST);
    document.documentElement.dataset.appBootReady = "true";
    expect(identity.dbGeneration).toBe("legacy-v13");
    expect(gate.isAppBootReady()).toBe(false);
    gate.setAppBootReadyState(true);
    expect(document.documentElement.dataset.appBootReady).toBe("false");
    expect(document.documentElement.dataset.targetSchema).toBe("16");
    expect(document.documentElement.dataset.appBootReadyRejection).toBe("RELEASE_GOVERNANCE_MISMATCH");
  });

  it.each([
    ["dbGeneration", "legacy-v13"],
    ["dbSchema", "13"],
    ["releaseContract", "legacy-v13"],
    ["targetSchema", "13"],
    ["migrationId", "null"]
  ])("rejects an explicit candidate tuple mismatch in %s without repairing it", async (field, value) => {
    installReleaseDocument(PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST);
    const gate = await import("./app-boot-ready");
    document.documentElement.dataset[field] = value;
    gate.setAppBootReadyState(true);
    expect(document.documentElement.dataset[field]).toBe(value);
    expect(document.documentElement.dataset.appBootReady).toBe("false");
    expect(document.documentElement.dataset.appBootReadyRejection).toBe("RELEASE_GOVERNANCE_MISMATCH");
    document.documentElement.dataset.appBootReady = "true";
    expect(gate.isAppBootReady()).toBe(false);
  });

  it.each(["releaseContract", "targetSchema", "migrationId"])("rejects missing production root identity %s", async (field) => {
    installReleaseDocument(PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST);
    const gate = await import("./app-boot-ready");
    delete document.documentElement.dataset[field];
    gate.setAppBootReadyState(false);
    expect(document.documentElement.dataset[field]).toBeUndefined();
    gate.setAppBootReadyState(true);
    expect(document.documentElement.dataset.appBootReady).toBe("false");
    expect(document.documentElement.dataset[field]).toBeUndefined();
    expect(gate.isAppBootReady()).toBe(false);
  });

  it.each([
    ["engineeringEvidenceOnly", "false"],
    ["publicReleaseAuthorized", "true"],
    ["expertTruthClaimed", "true"],
    ["mutationEpochBypassed", "true"]
  ])("keeps the unchanged governance requirement for %s", async (field, value) => {
    installReleaseDocument(PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST);
    const gate = await import("./app-boot-ready");
    gate.setAppBootReadyState(true);
    expect(gate.isAppBootReady()).toBe(true);
    document.documentElement.dataset[field] = value;
    expect(gate.isAppBootReady()).toBe(false);
    gate.setAppBootReadyState(true);
    expect(document.documentElement.dataset.appBootReady).toBe("false");
  });

  it.each(releaseMetaNames)("does not fall back when production metadata %s is missing", async (name) => {
    installReleaseDocument(PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST);
    document.querySelector(`meta[name="${name}"]`)?.remove();
    await expect(import("./app-boot-ready")).rejects.toThrow(/生产页面缺少/u);
    expect(document.documentElement.dataset.appBootReady).toBe("false");
  });

  it.each([
    ["hakimi-release-database", "{"],
    ["hakimi-release-database", JSON.stringify(BRIDGE_RELEASE_STORAGE_MANIFEST.database)],
    ["hakimi-release-storage-manifest", "{"],
    ["hakimi-release-storage-manifest-digest", "not-a-sha256"],
    ["hakimi-release-evidence-id", "claimed-release"],
    ["hakimi-build-version", "not-a-build"]
  ])("does not fall back when production metadata %s is invalid", async (name, value) => {
    installReleaseDocument(PRODUCTION_V13_TO_V16_RELEASE_STORAGE_MANIFEST);
    const meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!meta) throw new Error("Fixture metadata was not installed.");
    meta.content = value;
    await expect(import("./app-boot-ready")).rejects.toThrow();
    expect(document.documentElement.dataset.appBootReady).toBe("false");
  });

  it("retains the development v13 default without overwriting explicit mismatches", async () => {
    vi.stubEnv("PROD", false);
    installReleaseDocument(BRIDGE_RELEASE_STORAGE_MANIFEST);
    clearReleaseMetas();
    delete document.documentElement.dataset.releaseContract;
    delete document.documentElement.dataset.targetSchema;
    delete document.documentElement.dataset.migrationId;
    const gate = await import("./app-boot-ready");
    gate.setAppBootReadyState(true);
    expect(document.documentElement.dataset.releaseContract).toBe("legacy-v13");
    expect(document.documentElement.dataset.targetSchema).toBe("13");
    expect(document.documentElement.dataset.migrationId).toBe("null");
    expect(gate.isAppBootReady()).toBe(true);
    document.documentElement.dataset.targetSchema = "16";
    gate.setAppBootReadyState(true);
    expect(document.documentElement.dataset.targetSchema).toBe("16");
    expect(gate.isAppBootReady()).toBe(false);
  });
});
