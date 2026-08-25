export type DisposableWorker = Pick<
  Worker,
  "terminate" | "onmessage" | "onerror" | "onmessageerror"
>;

const disposedWorkers = new WeakSet<object>();

/** Releases a disposable Worker without allowing cleanup failures to strand its caller. */
export function disposeWorkerSafely(worker: DisposableWorker): void {
  try {
    if (disposedWorkers.has(worker)) return;
    disposedWorkers.add(worker);
  } catch {
    // A non-standard Worker must still reach the best-effort cleanup below.
  }
  for (const handler of ["onmessage", "onerror", "onmessageerror"] as const) {
    try {
      worker[handler] = null;
    } catch {
      // One rejected handler setter must not prevent the remaining handlers from being cleared.
    }
  }
  try {
    worker.terminate();
  } catch {
    // A caller's resolve/reject path must remain authoritative over cleanup failures.
  }
}
