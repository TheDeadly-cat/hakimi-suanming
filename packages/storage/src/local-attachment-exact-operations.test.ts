import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalAttachmentRecord } from "@hakimi/contracts";
import {
  CaseRepository,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
  LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
  LocalAttachmentIntegrityError,
  LocalAttachmentPurposeMetadataSnapshotLimitError,
  ReleaseDatabaseWriteLockedError,
  ResearchDatabase,
  type CreateAttachmentInput,
  type LocalAttachmentPurposeMetadataSnapshotLimitCode,
  type UnlinkedLocalAttachmentExactIdentity
} from "./index";
import {
  assertExactUnlinkedAttachmentCreateCapacity,
  assertLocalAttachmentPurposeCapacityTotals,
  type ExactUnlinkedAttachmentCreateCapacityInput
} from "./local-attachment-purpose-capacity";

const databases: ResearchDatabase[] = [];
const FIXED_NOW = "2026-08-25T00:00:00.000Z";
const MEDIA_TYPE =
  "application/vnd.hakimi.bazi-citation-applicability-observation-pair-lifecycle+json";
const DESCRIPTION = "hakimi.bazi.citation-applicability-observation-pair-lifecycle.local-sensitive/1:" +
  "a".repeat(64);

function createRepository(options: { releaseWritesLocked?: boolean } = {}): CaseRepository {
  const database = new ResearchDatabase(
    `hakimi-exact-unlinked-attachments-v13-${crypto.randomUUID()}`,
    { targetSchema: 13, ...options }
  );
  databases.push(database);
  return new CaseRepository(database, () => FIXED_NOW);
}

function exactIdentity(record: LocalAttachmentRecord): UnlinkedLocalAttachmentExactIdentity {
  if (record.link !== null) throw new Error("Test fixture requires an unlinked attachment.");
  return {
    id: record.id,
    fileName: record.fileName,
    mediaType: record.mediaType,
    byteLength: record.byteLength,
    contentHash: record.contentHash,
    description: record.description,
    link: null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function successorInput(
  text = '{"kind":"observation-successor"}',
  fileName = "observation-successor.json"
): CreateAttachmentInput {
  return {
    fileName,
    mediaType: MEDIA_TYPE,
    bytes: Uint8Array.from(new TextEncoder().encode(text)),
    description: DESCRIPTION,
    link: null
  };
}

async function createSource(repository: CaseRepository, suffix = "source"): Promise<LocalAttachmentRecord> {
  return repository.createAttachment({
    fileName: `${suffix}.json`,
    mediaType: MEDIA_TYPE,
    bytes: new TextEncoder().encode(`{"kind":"${suffix}"}`),
    description: DESCRIPTION,
    link: null
  });
}

async function expectPurposeLimit(
  promise: Promise<unknown>,
  code: LocalAttachmentPurposeMetadataSnapshotLimitCode
): Promise<void> {
  let captured: unknown;
  try {
    await promise;
  } catch (error) {
    captured = error;
  }
  expect(captured).toBeInstanceOf(LocalAttachmentPurposeMetadataSnapshotLimitError);
  expect(captured).toMatchObject({ code });
}

function expectSynchronousPurposeLimit(
  run: () => void,
  code: LocalAttachmentPurposeMetadataSnapshotLimitCode
): void {
  let captured: unknown;
  try {
    run();
  } catch (error) {
    captured = error;
  }
  expect(captured).toBeInstanceOf(LocalAttachmentPurposeMetadataSnapshotLimitError);
  expect(captured).toMatchObject({ code });
}

afterEach(async () => {
  vi.restoreAllMocks();
  const current = databases.splice(0);
  const names = [...new Set(current.map((database) => database.name))];
  for (const database of current) database.close();
  await Promise.all(names.map((name) => Dexie.delete(name)));
});

describe("exact unlinked LocalAttachment operations", () => {
  it("creates with zero exact sources and exactly deletes on physical targetSchema 13 without touching mutationState", async () => {
    const repository = createRepository();
    const source = await createSource(repository);
    expect(repository.database.verno).toBe(13);
    expect(repository.database.tables.map((table) => table.name)).not.toContain("mutationState");

    Object.defineProperty(repository.database, "mutationState", {
      configurable: true,
      get: () => {
        throw new Error("targetSchema 13 exact attachment operations accessed mutationState");
      }
    });

    const created = await repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput(),
      []
    );
    expect(created.created).toBe(true);
    expect(created.record.link).toBeNull();
    expect(await repository.database.attachments.count()).toBe(2);

    const deduplicated = await repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput(undefined, "ignored-zero-source-name.json"),
      []
    );
    expect(deduplicated).toMatchObject({ created: false });
    expect(deduplicated.record.id).toBe(created.record.id);

    await repository.deleteExactUnlinkedAttachment(exactIdentity(created.record));
    expect(await repository.database.attachments.toArray()).toEqual([source]);
  });

  it("atomically deduplicates concurrent successors using the existing bounded purpose lookup", async () => {
    const repository = createRepository();
    const source = await createSource(repository);
    const sourceIdentity = { ...exactIdentity(source) };

    const results = await Promise.all([
      repository.createAttachmentOnceWithExactUnlinkedSources(
        successorInput(undefined, "first-name.json"),
        [sourceIdentity]
      ),
      repository.createAttachmentOnceWithExactUnlinkedSources(
        successorInput(undefined, "ignored-second-name.json"),
        [sourceIdentity]
      )
    ]);

    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results.filter((result) => !result.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result.record.id)).size).toBe(1);
    expect(await repository.database.attachments.count()).toBe(2);
  });

  it("returns an existing copy at the 64-match boundary, rejects the 65th dedicated copy, and leaves legacy create behavior unchanged", async () => {
    const repository = createRepository();
    const existing: LocalAttachmentRecord[] = [];
    for (let index = 0; index < LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES; index += 1) {
      existing.push(await createSource(repository, `purpose-cap-${index}`));
    }

    const deduplicated = await repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput('{"kind":"purpose-cap-0"}', "deduplicated-name-is-ignored.json"),
      []
    );
    expect(deduplicated).toMatchObject({ created: false });
    expect(deduplicated.record.id).toBe(existing[0]?.id);

    await expectPurposeLimit(
      repository.createAttachmentOnceWithExactUnlinkedSources(
        successorInput("dedicated-match-65"),
        []
      ),
      "MATCH_LIMIT_EXCEEDED"
    );
    expect(await repository.database.attachments.count()).toBe(LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES);

    const legacy = await repository.createAttachmentOnce(successorInput("legacy-create-remains-unlimited-by-purpose"));
    expect(legacy.created).toBe(true);
    expect(await repository.database.attachments.count()).toBe(LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES + 1);
  });

  it("serializes concurrent dedicated writes at the 64-match boundary so only one can commit", async () => {
    const repository = createRepository();
    for (let index = 0; index < LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES - 1; index += 1) {
      await createSource(repository, `concurrent-cap-${index}`);
    }

    const results = await Promise.allSettled([
      repository.createAttachmentOnceWithExactUnlinkedSources(
        successorInput("concurrent-cap-first"),
        []
      ),
      repository.createAttachmentOnceWithExactUnlinkedSources(
        successorInput("concurrent-cap-second"),
        []
      )
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0]?.value).toMatchObject({ created: true });
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(LocalAttachmentPurposeMetadataSnapshotLimitError);
    expect(rejected[0]?.reason).toMatchObject({ code: "MATCH_LIMIT_EXCEEDED" });
    expect(await repository.database.attachments.count()).toBe(LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES);
  });

  it("counts every same-MIME row regardless of purpose before admitting a dedicated copy", async () => {
    const repository = createRepository();
    const template = await repository.createAttachment({
      fileName: "other-purpose-0.json",
      mediaType: MEDIA_TYPE,
      bytes: new TextEncoder().encode("other-purpose"),
      description: "another bounded purpose",
      link: null
    });
    await repository.database.attachments.bulkAdd(Array.from(
      { length: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS - 1 },
      (_, index): LocalAttachmentRecord => ({
        ...template,
        id: crypto.randomUUID(),
        fileName: `other-purpose-${index + 1}.json`
      })
    ));

    await expectPurposeLimit(
      repository.createAttachmentOnceWithExactUnlinkedSources(
        successorInput("same-media-row-overflow"),
        []
      ),
      "SCAN_ROW_LIMIT_EXCEEDED"
    );
    expect(await repository.database.attachments.count()).toBe(LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS);
  });

  it("enforces encoded-character and declared-byte boundaries with precise typed errors", () => {
    expect(() => assertLocalAttachmentPurposeCapacityTotals({
      sameMediaRows: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
      scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
      exactPurposeMatches: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
      matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES
    })).not.toThrow();
    expect(() => assertExactUnlinkedAttachmentCreateCapacity({
      sameMediaRows: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS - 1,
      scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS - 4,
      exactPurposeMatches: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES - 1,
      matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES - 1,
      successorEncodedCharacters: 4,
      successorDeclaredBytes: 1
    })).not.toThrow();

    expectSynchronousPurposeLimit(() => assertLocalAttachmentPurposeCapacityTotals({
      sameMediaRows: 0,
      scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS + 1,
      exactPurposeMatches: 0,
      matchedDeclaredBytes: 0
    }), "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED");
    expectSynchronousPurposeLimit(() => assertLocalAttachmentPurposeCapacityTotals({
      sameMediaRows: 0,
      scannedEncodedCharacters: 0,
      exactPurposeMatches: 0,
      matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES + 1
    }), "MATCHED_BYTE_LIMIT_EXCEEDED");
    expectSynchronousPurposeLimit(() => assertExactUnlinkedAttachmentCreateCapacity({
      sameMediaRows: 0,
      scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
      exactPurposeMatches: 0,
      matchedDeclaredBytes: 0,
      successorEncodedCharacters: 4,
      successorDeclaredBytes: 0
    }), "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED");
    expectSynchronousPurposeLimit(() => assertExactUnlinkedAttachmentCreateCapacity({
      sameMediaRows: 0,
      scannedEncodedCharacters: 0,
      exactPurposeMatches: 0,
      matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
      successorEncodedCharacters: 0,
      successorDeclaredBytes: 1
    }), "MATCHED_BYTE_LIMIT_EXCEEDED");
    expectSynchronousPurposeLimit(() => assertExactUnlinkedAttachmentCreateCapacity({
      sameMediaRows: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_SCAN_ROWS,
      scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
      exactPurposeMatches: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
      matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
      successorEncodedCharacters: 4,
      successorDeclaredBytes: 1
    }), "SCAN_ROW_LIMIT_EXCEEDED");
    expectSynchronousPurposeLimit(() => assertExactUnlinkedAttachmentCreateCapacity({
      sameMediaRows: 0,
      scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
      exactPurposeMatches: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
      matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
      successorEncodedCharacters: 4,
      successorDeclaredBytes: 1
    }), "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED");
    expectSynchronousPurposeLimit(() => assertExactUnlinkedAttachmentCreateCapacity({
      sameMediaRows: 0,
      scannedEncodedCharacters: 0,
      exactPurposeMatches: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHES,
      matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
      successorEncodedCharacters: 0,
      successorDeclaredBytes: 1
    }), "MATCH_LIMIT_EXCEEDED");
  });

  it("rolls a sentinel row back when encoded-character or declared-byte admission rejects inside a write transaction", async () => {
    const repository = createRepository();
    const sentinel = await createSource(repository, "capacity-rollback-sentinel");
    const cases: readonly Readonly<{
      code: LocalAttachmentPurposeMetadataSnapshotLimitCode;
      input: ExactUnlinkedAttachmentCreateCapacityInput;
    }>[] = [
      {
        code: "SCAN_ENCODED_CHARACTER_LIMIT_EXCEEDED",
        input: {
          sameMediaRows: 0,
          scannedEncodedCharacters: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_ENCODED_CHARACTERS,
          exactPurposeMatches: 0,
          matchedDeclaredBytes: 0,
          successorEncodedCharacters: 4,
          successorDeclaredBytes: 0
        }
      },
      {
        code: "MATCHED_BYTE_LIMIT_EXCEEDED",
        input: {
          sameMediaRows: 0,
          scannedEncodedCharacters: 0,
          exactPurposeMatches: 0,
          matchedDeclaredBytes: LOCAL_ATTACHMENT_PURPOSE_METADATA_MAX_MATCHED_BYTES,
          successorEncodedCharacters: 0,
          successorDeclaredBytes: 1
        }
      }
    ];

    for (const testCase of cases) {
      await expectPurposeLimit(repository.database.transaction(
        "rw",
        repository.database.attachments,
        async () => {
          await repository.database.attachments.add({
            ...sentinel,
            id: crypto.randomUUID(),
            fileName: `must-not-land-${testCase.code}.json`
          });
          assertExactUnlinkedAttachmentCreateCapacity(testCase.input);
        }
      ), testCase.code);
      expect(await repository.database.attachments.toArray()).toEqual([sentinel]);
    }
  });

  it("accepts at most sixteen unique exact sources", async () => {
    const repository = createRepository();
    const sources: LocalAttachmentRecord[] = [];
    for (let index = 0; index < 17; index += 1) {
      sources.push(await createSource(repository, `bounded-source-${index}`));
    }

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("sixteen-sources"),
      sources.slice(0, 16).map(exactIdentity)
    )).resolves.toMatchObject({ created: true });

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("seventeen-sources"),
      sources.map(exactIdentity)
    )).rejects.toBeInstanceOf(RangeError);
    expect(await repository.database.attachments.count()).toBe(18);
  });

  it("uses caller-independent input and source snapshots captured before the first await", async () => {
    const repository = createRepository();
    const source = await createSource(repository);
    const sourceIdentity = { ...exactIdentity(source) };
    const sources = [sourceIdentity];
    const input = successorInput("stable-before-await", "stable.json");
    const expectedBytes = Uint8Array.from(input.bytes);

    const pending = repository.createAttachmentOnceWithExactUnlinkedSources(input, sources);
    input.fileName = "mutated-after-call.json";
    input.bytes.fill(0);
    sourceIdentity.fileName = "mutated-source-after-call.json";
    sources.splice(0, 1);

    const created = await pending;
    expect(created.record.fileName).toBe("stable.json");
    expect(await repository.readAttachmentBytes(created.record.id)).toEqual(expectedBytes);
  });

  it("fails closed when a captured source was deleted or replaced", async () => {
    const repository = createRepository();
    const deletedSource = await createSource(repository, "deleted-source");
    const deletedIdentity = exactIdentity(deletedSource);
    await repository.deleteAttachment(deletedSource.id);

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("deleted-source-successor"),
      [deletedIdentity]
    )).rejects.toMatchObject({ code: "ATTACHMENT_NOT_FOUND" });

    const replacedSource = await createSource(repository, "replaced-source");
    const replacedIdentity = exactIdentity(replacedSource);
    await repository.database.attachments.put({
      ...replacedSource,
      description: `${DESCRIPTION}:changed`
    });

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("replaced-source-successor"),
      [replacedIdentity]
    )).rejects.toMatchObject({ code: "ATTACHMENT_CHANGED" });
    expect(await repository.database.attachments.count()).toBe(1);
  });

  it("verifies every source body before creating a successor", async () => {
    const repository = createRepository();
    const first = await createSource(repository, "first-source");
    const corrupt = await createSource(repository, "corrupt-source");
    await repository.database.attachments.put({
      ...corrupt,
      contentHash: "0".repeat(64)
    });

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("should-not-commit"),
      [exactIdentity(first), exactIdentity(corrupt)]
    )).rejects.toBeInstanceOf(LocalAttachmentIntegrityError);
    expect(await repository.database.attachments.count()).toBe(2);
  });

  it("rejects accessor, symbol, custom-prototype, sparse, and duplicate identities before hashing or storage", async () => {
    const repository = createRepository();
    const source = await createSource(repository);
    const identity = exactIdentity(source);
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");
    const get = vi.spyOn(repository.database.attachments, "get");
    let getterCalls = 0;

    const accessorIdentity = { ...identity } as Record<string, unknown>;
    Object.defineProperty(accessorIdentity, "id", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return source.id;
      }
    });
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("accessor"),
      [accessorIdentity as unknown as UnlinkedLocalAttachmentExactIdentity]
    )).rejects.toBeInstanceOf(TypeError);
    expect(getterCalls).toBe(0);

    const symbolIdentity = { ...identity };
    Object.defineProperty(symbolIdentity, Symbol("hidden"), {
      enumerable: true,
      value: "hidden"
    });
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("symbol"),
      [symbolIdentity]
    )).rejects.toBeInstanceOf(TypeError);

    const customPrototypeIdentity = Object.assign(
      Object.create({ inherited: true }) as object,
      identity
    ) as UnlinkedLocalAttachmentExactIdentity;
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("prototype"),
      [customPrototypeIdentity]
    )).rejects.toBeInstanceOf(TypeError);

    const sparseSources = new Array<UnlinkedLocalAttachmentExactIdentity>(2);
    sparseSources[0] = identity;
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("sparse"),
      sparseSources
    )).rejects.toBeInstanceOf(TypeError);

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("duplicate"),
      [identity, { ...identity }]
    )).rejects.toBeInstanceOf(TypeError);

    const namedEmptySources: UnlinkedLocalAttachmentExactIdentity[] = [];
    Object.defineProperty(namedEmptySources, "unexpected", {
      enumerable: true,
      value: identity
    });
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("named-empty"),
      namedEmptySources
    )).rejects.toBeInstanceOf(TypeError);

    expect(digest).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(await repository.database.attachments.count()).toBe(1);
  });

  it("rejects malicious create input descriptors before reading a selected source", async () => {
    const repository = createRepository();
    const source = await createSource(repository);
    const input = successorInput() as Record<PropertyKey, unknown>;
    let getterCalls = 0;
    Object.defineProperty(input, "fileName", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "getter.json";
      }
    });
    const get = vi.spyOn(repository.database.attachments, "get");

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      input as CreateAttachmentInput,
      [exactIdentity(source)]
    )).rejects.toBeInstanceOf(TypeError);
    expect(getterCalls).toBe(0);

    const symbolInput = successorInput() as CreateAttachmentInput & Record<PropertyKey, unknown>;
    symbolInput[Symbol("hidden")] = true;
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      symbolInput,
      [exactIdentity(source)]
    )).rejects.toBeInstanceOf(TypeError);

    const customPrototypeInput = Object.assign(
      Object.create({ inherited: true }) as object,
      successorInput("custom-prototype")
    ) as CreateAttachmentInput;
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      customPrototypeInput,
      [exactIdentity(source)]
    )).rejects.toBeInstanceOf(TypeError);

    expect(get).not.toHaveBeenCalled();
    expect(await repository.database.attachments.count()).toBe(1);
  });

  it("rejects Proxy and forged Uint8Array prototypes without traps or species and copies ordinary bytes species-free", async () => {
    const repository = createRepository();
    const digest = vi.spyOn(globalThis.crypto.subtle, "digest");
    let getPrototypeOfTrapCalls = 0;
    const proxiedBytes = new Proxy({}, {
      getPrototypeOf: () => {
        getPrototypeOfTrapCalls += 1;
        return Uint8Array.prototype;
      }
    }) as unknown as Uint8Array;
    const proxiedInput = successorInput("proxied-byte-object");
    proxiedInput.bytes = proxiedBytes;
    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      proxiedInput,
      []
    )).rejects.toBeInstanceOf(TypeError);
    expect(getPrototypeOfTrapCalls).toBe(0);

    const forgedBytes = new Uint8Array([1, 2, 3]);
    let speciesGetterCalls = 0;
    const ForgedUint8Array = function Uint8Array(): void {};
    Object.defineProperty(ForgedUint8Array, Symbol.species, {
      configurable: true,
      get: () => {
        speciesGetterCalls += 1;
        forgedBytes[0] = 99;
        return Uint8Array;
      }
    });
    const forgedPrototype = Object.create(null) as object;
    Object.defineProperties(forgedPrototype, {
      BYTES_PER_ELEMENT: { configurable: true, value: 1 },
      constructor: { configurable: true, value: ForgedUint8Array }
    });
    Object.setPrototypeOf(forgedBytes, forgedPrototype);
    const forgedInput = successorInput("forged-byte-prototype");
    forgedInput.bytes = forgedBytes;

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      forgedInput,
      []
    )).rejects.toBeInstanceOf(TypeError);
    expect(speciesGetterCalls).toBe(0);
    expect(forgedBytes[0]).toBe(1);
    expect(digest).not.toHaveBeenCalled();
    expect(await repository.database.attachments.count()).toBe(0);

    const ordinaryBytes = new Uint8Array([4, 5, 6]);
    let constructorGetterCalls = 0;
    Object.defineProperty(ordinaryBytes, "constructor", {
      configurable: true,
      get: () => {
        constructorGetterCalls += 1;
        return ForgedUint8Array;
      }
    });
    const ordinaryInput = successorInput("ordinary-byte-prototype");
    ordinaryInput.bytes = ordinaryBytes;
    const created = await repository.createAttachmentOnceWithExactUnlinkedSources(
      ordinaryInput,
      []
    );
    expect(constructorGetterCalls).toBe(0);
    expect(await repository.readAttachmentBytes(created.record.id)).toEqual(new Uint8Array([4, 5, 6]));
  });

  it("requires the complete immutable identity before deletion", async () => {
    const repository = createRepository();
    const attachment = await createSource(repository);
    const identity = exactIdentity(attachment);
    const alternateHash = attachment.contentHash === "0".repeat(64)
      ? "1".repeat(64)
      : "0".repeat(64);
    const changedIdentities: UnlinkedLocalAttachmentExactIdentity[] = [
      { ...identity, fileName: "changed.json" },
      { ...identity, mediaType: "application/json" },
      { ...identity, byteLength: identity.byteLength + 1 },
      { ...identity, contentHash: alternateHash },
      { ...identity, description: `${identity.description}:changed` },
      {
        ...identity,
        createdAt: "2026-08-24T00:00:00.000Z"
      },
      {
        ...identity,
        updatedAt: "2026-08-26T00:00:00.000Z"
      }
    ];

    for (const changed of changedIdentities) {
      await expect(repository.deleteExactUnlinkedAttachment(changed)).rejects.toMatchObject({
        code: "ATTACHMENT_CHANGED"
      });
      expect(await repository.database.attachments.count()).toBe(1);
    }

    await expect(repository.deleteExactUnlinkedAttachment({
      ...identity,
      id: crypto.randomUUID()
    })).rejects.toMatchObject({ code: "ATTACHMENT_NOT_FOUND" });
    await expect(repository.deleteExactUnlinkedAttachment({
      ...identity,
      link: {
        kind: "research_subject",
        subjectId: crypto.randomUUID()
      }
    } as unknown as UnlinkedLocalAttachmentExactIdentity)).rejects.toBeInstanceOf(TypeError);

    await repository.database.attachments.put({
      ...attachment,
      link: {
        kind: "research_subject",
        subjectId: crypto.randomUUID()
      }
    });
    await expect(repository.deleteExactUnlinkedAttachment(identity)).rejects.toMatchObject({
      code: "ATTACHMENT_CHANGED"
    });
    await repository.database.attachments.put(attachment);

    await repository.deleteExactUnlinkedAttachment(identity);
    expect(await repository.database.attachments.count()).toBe(0);
  });

  it("honors the release write lock for exact creates and deletes", async () => {
    const repository = createRepository();
    const source = await createSource(repository);
    repository.database.lockReleaseWrites();

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("release-locked"),
      []
    )).rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);
    await expect(repository.deleteExactUnlinkedAttachment(exactIdentity(source)))
      .rejects.toBeInstanceOf(ReleaseDatabaseWriteLockedError);

    expect(await repository.database.attachments.toArray()).toEqual([source]);
  });

  it("rolls exact creates and deletes back when their transaction callback fails after mutation", async () => {
    const repository = createRepository();
    const source = await createSource(repository);
    const sourceIdentity = exactIdentity(source);
    const add = repository.database.attachments.add.bind(repository.database.attachments);
    const addSpy = vi.spyOn(repository.database.attachments, "add").mockImplementation((async (
      record: LocalAttachmentRecord
    ) => {
      await add(record);
      throw new Error("synthetic create rollback");
    }) as never);

    await expect(repository.createAttachmentOnceWithExactUnlinkedSources(
      successorInput("create-rollback"),
      []
    )).rejects.toThrow("synthetic create rollback");
    expect(await repository.database.attachments.toArray()).toEqual([source]);
    addSpy.mockRestore();

    const remove = repository.database.attachments.delete.bind(repository.database.attachments);
    vi.spyOn(repository.database.attachments, "delete").mockImplementation((async (id: string) => {
      await remove(id);
      throw new Error("synthetic delete rollback");
    }) as never);

    await expect(repository.deleteExactUnlinkedAttachment(sourceIdentity))
      .rejects.toThrow("synthetic delete rollback");
    expect(await repository.database.attachments.toArray()).toEqual([source]);
  });
});
