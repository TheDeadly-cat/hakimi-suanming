import {
  BACKUP_DATA_SCHEMA_VERSION_V1,
  FULL_BACKUP_DIGEST_ALGORITHM,
  FULL_BACKUP_FORMAT,
  FULL_BACKUP_SCOPE,
  SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION,
  type SavedViewFullBackupManifest,
  type SavedViewFullBackupPayload
} from "@hakimi/contracts";
import { canonicalStringify } from "@hakimi/integrity";
import { recomputeSavedViewFullBackupDigests } from "../src/index";

const payload: SavedViewFullBackupPayload = {
  cases: [],
  revisions: [],
  candidateSets: [],
  researchNotes: [],
  events: [],
  savedViews: [],
  knowledgeDocuments: [],
  citations: [],
  sourceRights: []
};

const manifest: SavedViewFullBackupManifest = {
  format: FULL_BACKUP_FORMAT,
  formatVersion: SAVED_VIEW_FULL_BACKUP_FORMAT_VERSION,
  schemaVersion: BACKUP_DATA_SCHEMA_VERSION_V1,
  scope: FULL_BACKUP_SCOPE,
  appVersion: "0.2.0-p0",
  exportedAt: "2026-08-01T00:00:00.000Z",
  digestAlgorithm: FULL_BACKUP_DIGEST_ALGORITHM,
  counts: {
    cases: 0,
    revisions: 0,
    candidateSets: 0,
    researchNotes: 0,
    events: 0,
    savedViews: 0,
    knowledgeDocuments: 0,
    citations: 0,
    sourceRights: 0
  }
};

const digests = await recomputeSavedViewFullBackupDigests({ manifest, payload });
process.stdout.write(`${JSON.stringify(JSON.parse(canonicalStringify({ manifest, digests, payload })), null, 2)}\n`);
