import type {
  CaseImportBatch,
  CaseImportColumnMapping,
  CaseImportConfigurationIssue,
  CaseImportIterationSummary,
  CsvSourceProgress,
  DuplicatePolicy
} from "@hakimi/case-import";

export type CaseImportWorkerStartOptions = {
  mapping: CaseImportColumnMapping;
  duplicatePolicy: DuplicatePolicy;
  existingFingerprints: string[];
  tagSeparator?: string;
  chunkSize: number;
  parseCharacterBudget?: number;
};

export type CaseImportWorkerRequest =
  | { type: "read_headers"; blob: Blob }
  | { type: "start"; blob: Blob; options: CaseImportWorkerStartOptions }
  | { type: "batch_ack"; batchNumber: number }
  | { type: "cancel" };

export type CaseImportWorkerSerializedError = {
  name: string;
  message: string;
  code?: string;
  issues?: CaseImportConfigurationIssue[];
};

export type CaseImportWorkerResponse =
  | { type: "headers"; headers: string[] }
  | { type: "source_progress"; progress: CsvSourceProgress }
  | { type: "batch"; batch: CaseImportBatch }
  | { type: "complete"; summary: CaseImportIterationSummary }
  | { type: "error"; error: CaseImportWorkerSerializedError };
