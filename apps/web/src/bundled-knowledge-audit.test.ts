import { link, mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { sha256Hex } from "@hakimi/integrity";
import type { SourceCarrierRecord, SourceRightsRecord } from "@hakimi/contracts";
import { MAX_KNOWLEDGE_DOCUMENT_BYTES, MAX_KNOWLEDGE_SECTIONS } from "@hakimi/knowledge-core";
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
  const rights: SourceRightsRecord = {
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
  const carrier: SourceCarrierRecord = {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_carrier",
    carrierId: "22222222-2222-4222-8222-222222222222",
    documentId,
    documentContentHash: contentHash,
    carrierType: "private_transcription",
    provider: "项目",
    sourceUrl: null,
    acquiredAt: timestamp,
    accessMethod: "项目原创正文直接导出",
    contentDigest: contentHash,
    imageDigest: null,
    ocrDigest: null,
    rights: {
      status: "project_original_verified",
      jurisdiction: "CN",
      licenseId: null,
      copyrightNotice: "项目原创",
      reproductionAllowed: true,
      quotationAllowed: true,
      redistributionAllowed: true,
      evidenceRefs: ["https://example.com/carrier-evidence"]
    },
    storagePolicy: "public_repo",
    review: {
      status: "double_reviewed",
      attestations: [
        { reviewerId: "carrier-reviewer-a", reviewedAt: timestamp, note: "载体正文" },
        { reviewerId: "carrier-reviewer-b", reviewedAt: timestamp, note: "载体权利" }
      ],
      note: ""
    },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  await writeFile(path.join(root, "documents", "source.md"), content, "utf8");
  return { root, content, contentHash, documentId, rights, carrier };
}

async function writeManifest(root: string, entries: unknown[]): Promise<void> {
  await writeFile(path.join(root, "manifest.v2.json"), JSON.stringify({
    schemaVersion: "2.0.0",
    entries
  }), "utf8");
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("bundled knowledge build gate", () => {
  it("accepts an exact-hash, work/edition/carrier-cleared and double-reviewed bundled source", async () => {
    const { root, contentHash, documentId, rights, carrier } = await fixture();
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).resolves.toMatchObject({ entries: [{ outputPath: "knowledge/source.md" }] });
  });

  it("fails when a file is undeclared or its exact content hash changes", async () => {
    const { root, contentHash, documentId, rights, carrier } = await fixture();
    await writeManifest(root, []);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/未登记/);
    await writeFile(path.join(root, "documents", "source.md"), "# 原文\n篡改", "utf8");
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/实际正文哈希/);
  });

  it("rejects unsafe paths and uncleared carrier rights before looking up source-body bytes", async () => {
    const { root, contentHash, documentId, rights, carrier } = await fixture();
    await writeManifest(root, [{
      path: "documents/../missing.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/路径不安全|规范化/);

    carrier.carrierType = "link_only";
    carrier.sourceUrl = "https://example.com/link-only";
    carrier.contentDigest = null;
    carrier.rights.status = "unknown";
    carrier.rights.jurisdiction = null;
    carrier.rights.copyrightNotice = "";
    carrier.rights.reproductionAllowed = false;
    carrier.rights.quotationAllowed = false;
    carrier.rights.redistributionAllowed = false;
    carrier.rights.evidenceRefs = [];
    carrier.storagePolicy = "link_only";
    carrier.review.status = "unreviewed";
    carrier.review.attestations = [];
    await writeManifest(root, [{
      path: "documents/missing.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/载体层|尚未通过/);
  });

  it("shares the production documents-prefix and text-format contract with Stage C", async () => {
    const { root, contentHash, documentId, rights, carrier } = await fixture();
    await writeManifest(root, [{
      path: "knowledge/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/documents/);

    await writeManifest(root, [{
      path: "documents/source.pdf",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/Markdown\/TXT/);

    await writeManifest(root, [{
      path: "documents//source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/规范化/);

    await writeManifest(root, [{
      path: "documents/./source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/规范化/);
  });

  it("uses the shared format inference for a valid .txt dotfile body", async () => {
    const { root, documentId, rights, carrier } = await fixture();
    const content = Array.from({ length: MAX_KNOWLEDGE_SECTIONS }, (_, index) => `# heading-${index}`).join("\n");
    const contentHash = await sha256Hex(content);
    rights.documentContentHash = contentHash;
    carrier.documentContentHash = contentHash;
    carrier.contentDigest = contentHash;
    await rm(path.join(root, "documents", "source.md"));
    await writeFile(path.join(root, "documents", ".txt"), content, "utf8");
    await writeManifest(root, [{
      path: "documents/.txt",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).resolves.toMatchObject({
      entries: [{ path: "documents/.txt", outputPath: "knowledge/.txt" }]
    });
  });

  it("uses the shared deterministic order for a multi-entry production inventory", async () => {
    const { root, content, contentHash, documentId, rights, carrier } = await fixture();
    const secondDocumentId = "33333333-3333-4333-8333-333333333333";
    const secondRights = structuredClone(rights);
    secondRights.documentId = secondDocumentId;
    const secondCarrier = structuredClone(carrier);
    secondCarrier.carrierId = "44444444-4444-4444-8444-444444444444";
    secondCarrier.documentId = secondDocumentId;
    await rm(path.join(root, "documents", "source.md"));
    await writeFile(path.join(root, "documents", "a_.md"), content, "utf8");
    await writeFile(path.join(root, "documents", "a-.md"), content, "utf8");
    await writeManifest(root, [
      {
        path: "documents/a_.md",
        documentId,
        contentHash,
        sourceRights: rights,
        sourceCarrier: carrier
      },
      {
        path: "documents/a-.md",
        documentId: secondDocumentId,
        contentHash,
        sourceRights: secondRights,
        sourceCarrier: secondCarrier
      }
    ]);
    const result = await auditBundledKnowledgeDirectory(root);
    expect(result.entries.map((entry) => entry.path)).toEqual([
      "documents/a-.md",
      "documents/a_.md"
    ]);
  });

  it("rejects a documents-directory symlink or junction before reading its target", async () => {
    const { root, content, contentHash, documentId, rights, carrier } = await fixture();
    const externalRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bundled-external-"));
    temporaryRoots.push(externalRoot);
    await writeFile(path.join(externalRoot, "source.md"), content, "utf8");
    await rm(path.join(root, "documents"), { recursive: true, force: true });
    await symlink(externalRoot, path.join(root, "documents"), process.platform === "win32" ? "junction" : "dir");
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/符号链接|junction/);
  });

  it("rejects a nested in-root junction instead of traversing a materialized alias", async () => {
    const { root, content, contentHash, documentId, rights, carrier } = await fixture();
    const realDirectory = path.join(root, "documents", "real");
    await mkdir(realDirectory);
    await writeFile(path.join(realDirectory, "source.md"), content, "utf8");
    await rm(path.join(root, "documents", "source.md"), { force: true });
    await symlink(realDirectory, path.join(root, "documents", "alias"), process.platform === "win32" ? "junction" : "dir");
    await writeManifest(root, [{
      path: "documents/alias/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/符号链接|junction/);
  });

  it("rejects a hard-link alias instead of treating it as an independently held materialization", async () => {
    const { root, content, contentHash, documentId, rights, carrier } = await fixture();
    const externalRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bundled-hardlink-"));
    temporaryRoots.push(externalRoot);
    const externalPath = path.join(externalRoot, "source.md");
    await writeFile(externalPath, content, "utf8");
    await rm(path.join(root, "documents", "source.md"), { force: true });
    await link(externalPath, path.join(root, "documents", "source.md"));
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/hard-link alias/);
  });

  it("rejects a body larger than the held-handle byte budget", async () => {
    const { root, documentId, rights, carrier } = await fixture();
    const oversized = "a".repeat(MAX_KNOWLEDGE_DOCUMENT_BYTES + 1);
    const contentHash = await sha256Hex(oversized);
    rights.documentContentHash = contentHash;
    carrier.documentContentHash = contentHash;
    carrier.contentDigest = contentHash;
    await writeFile(path.join(root, "documents", "source.md"), oversized, "utf8");
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/超过上限/);
  });

  it("fails when the ancient work is clear but the modern edition layer is unknown", async () => {
    const { root, contentHash, documentId, rights, carrier } = await fixture();
    rights.rights.status = "public_domain_verified";
    rights.rights.workStatus = "public_domain_verified";
    rights.rights.editionStatus = "unknown";
    rights.rights.basis = "public_domain";
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/随包资料必须分别核清|现代版本层/);
  });

  it("fails closed when the carrier record is missing or bound to another exact text", async () => {
    const { root, contentHash, documentId, rights, carrier } = await fixture();
    await writeManifest(root, [{ path: "documents/source.md", documentId, contentHash, sourceRights: rights }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/字段不完整/);

    const otherHash = `b${contentHash.slice(1)}`;
    carrier.documentContentHash = otherHash;
    carrier.contentDigest = otherHash;
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/载体层|尚未通过/);
  });

  it("keeps link-only or unknown-rights carriers out of public bundled output", async () => {
    const { root, contentHash, documentId, rights, carrier } = await fixture();
    carrier.carrierType = "link_only";
    carrier.sourceUrl = "https://example.com/link-only";
    carrier.contentDigest = null;
    carrier.rights.status = "unknown";
    carrier.rights.copyrightNotice = "";
    carrier.rights.reproductionAllowed = false;
    carrier.rights.quotationAllowed = false;
    carrier.rights.redistributionAllowed = false;
    carrier.storagePolicy = "link_only";
    await writeManifest(root, [{
      path: "documents/source.md",
      documentId,
      contentHash,
      sourceRights: rights,
      sourceCarrier: carrier
    }]);
    await expect(auditBundledKnowledgeDirectory(root)).rejects.toThrow(/载体层|尚未通过/);
  });
});
