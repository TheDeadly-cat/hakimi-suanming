import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sha256Hex } from "@hakimi/integrity";
import { auditBundledKnowledgeDirectory } from "../bundled-knowledge-audit";

const temporaryRoots: string[] = [];
const timestamp = "2026-08-01T00:00:00.000Z";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bundled-source-"));
  temporaryRoots.push(root);
  await mkdir(path.join(root, "documents"));
  const content = "# 原文\n测试";
  const contentHash = await sha256Hex(content);
  const documentId = "11111111-1111-4111-8111-111111111111";
  const rights = {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_rights",
    documentId,
    documentContentHash: contentHash,
    origin: "bundled",
    source: { sourceUrl: "https://example.com/source", publisher: "项目", publicationYear: 2026, acquiredAt: timestamp },
    rights: {
      status: "project_original_verified",
      workStatus: "project_original_verified",
      editionStatus: "project_original_verified",
      basis: "project_authored",
      jurisdiction: "CN",
      licenseId: null,
      copyrightNotice: "项目原创",
      evidenceRefs: ["https://example.com/evidence"],
      distributionPolicy: "redistributable"
    },
    review: {
      status: "double_reviewed",
      attestations: [
        { reviewerId: "reviewer-a", reviewedAt: timestamp, note: "正文" },
        { reviewerId: "reviewer-b", reviewedAt: timestamp, note: "权利" }
      ],
      note: ""
    },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await writeFile(path.join(root, "documents", "source.md"), content, "utf8");
  return { root, contentHash, documentId, rights };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("bundled knowledge build gate", () => {
  it("accepts an exact-hash, dual-layer-cleared and double-reviewed bundled source", async () => {
    const { root, contentHash, documentId, rights } = await fixture();
    await writeFile(path.join(root, "manifest.v1.json"), JSON.stringify({
      schemaVersion: "1.0.0",
      entries: [{ path: "documents/source.md", documentId, contentHash, sourceRights: rights }]
    }), "utf8");
    await expect(auditBundledKnowledgeDirectory(root)).resolves.toMatchObject({ entries: [{ outputPath: "knowledge/source.md" }] });
  });

  it("fails when a file is undeclared or its exact content hash changes", async () => {
    const { root, contentHash, documentId, rights } = await fixture();
    await writeFile(path.join(root, "manifest.v1.json"), JSON.stringify({ schemaVersion: "1.0.0", entries: [] }), "utf8");
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/未登记/);
    await writeFile(path.join(root, "manifest.v1.json"), JSON.stringify({
      schemaVersion: "1.0.0",
      entries: [{ path: "documents/source.md", documentId, contentHash: `b${contentHash.slice(1)}`, sourceRights: rights }]
    }), "utf8");
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/实际正文哈希/);
  });

  it("fails when the ancient work is clear but the modern edition layer is unknown", async () => {
    const { root, contentHash, documentId, rights } = await fixture();
    rights.rights.status = "public_domain_verified";
    rights.rights.workStatus = "public_domain_verified";
    rights.rights.editionStatus = "unknown";
    rights.rights.basis = "public_domain";
    await writeFile(path.join(root, "manifest.v1.json"), JSON.stringify({
      schemaVersion: "1.0.0",
      entries: [{ path: "documents/source.md", documentId, contentHash, sourceRights: rights }]
    }), "utf8");
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/随包资料必须分别核清|现代版本层/);
  });
});
