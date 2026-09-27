type ShutdownOptions = Readonly<{
  requestClose(): Promise<unknown>;
  nativeExit: Promise<void>;
  isTerminated(): boolean;
  killOwnedProcess(): void;
  disconnect(): Promise<unknown>;
  verifyExit(): void;
  protocolResult?(error: unknown): void;
  graceMs?: number;
  totalMs?: number;
}>;

/** One deadline includes protocol, native exit, owned-process cleanup and detach. */
export async function closeOwnedBrowser(options: ShutdownOptions): Promise<void> {
  const start = performance.now();
  const totalMs = options.totalMs ?? 15_000;
  const graceMs = options.graceMs ?? 10_000;
  if (!(graceMs > 0 && totalMs > graceMs)) throw new Error("Invalid browser shutdown deadlines.");
  const deadline = start + totalMs;
  const errors: unknown[] = [];
  let protocolError: unknown;
  async function within(operation: () => Promise<unknown>, until: number, stage: string) {
    const remaining = until - performance.now();
    if (remaining <= 0) throw new Error("Owned browser shutdown deadline exceeded: " + stage);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.resolve().then(operation),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Owned browser shutdown deadline exceeded: " + stage)), remaining);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  try {
    await within(async () => {
      if (!options.isTerminated()) {
        // A successful native close can drop CDP before the response arrives.
        await options.requestClose().catch(error => {
          protocolError = error;
          options.protocolResult?.(error);
        });
      }
      await options.nativeExit;
    }, start + graceMs, "close request and native exit");
    options.verifyExit();
  } catch (error) {
    if (protocolError !== undefined) errors.push(protocolError);
    errors.push(error);
  }
  try {
    if (!options.isTerminated()) {
      options.killOwnedProcess();
      await within(() => options.nativeExit, deadline, "owned-process cleanup");
    }
  } catch (error) { errors.push(error); }
  try {
    await within(options.disconnect, deadline, "CDP disconnect");
  } catch (error) { errors.push(error); }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, "Owned browser shutdown and cleanup failed.");
}
