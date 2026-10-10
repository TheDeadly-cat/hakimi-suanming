type DiagnosticTask = Readonly<{ label: string; run: () => Promise<unknown> }>;

/** Keep the journal operation's first error even when evidence or cleanup fails. */
export async function runJournalArtifactCheck(options: Readonly<{
  operation: () => Promise<void>;
  diagnostics: () => readonly DiagnosticTask[];
  cleanup: () => Promise<unknown>;
  attachLifecycle: () => Promise<unknown>;
}>): Promise<void> {
  let operationFailed = false;
  let operationError: unknown;
  const additionalErrors: Error[] = [];
  const captureAdditional = async (label: string, run: () => Promise<unknown>) => {
    try { await run(); }
    catch (cause) { additionalErrors.push(new Error(label, { cause })); }
  };
  try { await options.operation(); }
  catch (error) { operationFailed = true; operationError = error; }

  if (operationFailed) {
    let diagnostics: readonly DiagnosticTask[] = [];
    try { diagnostics = options.diagnostics(); }
    catch (cause) { additionalErrors.push(new Error("Journal failure diagnostics could not be enumerated", { cause })); }
    for (const diagnostic of diagnostics) await captureAdditional(diagnostic.label, diagnostic.run);
  }
  await captureAdditional("Journal browser cleanup failed", options.cleanup);
  await captureAdditional("Journal browser lifecycle attachment failed", options.attachLifecycle);

  if (operationFailed && additionalErrors.length === 0) throw operationError;
  const errors = operationFailed ? [operationError, ...additionalErrors] : additionalErrors;
  if (errors.length > 0) {
    throw new AggregateError(errors, operationFailed
      ? "Journal operation failed; additional diagnostic or cleanup errors are preserved"
      : "Journal browser cleanup or evidence failed", operationFailed ? { cause: operationError } : undefined);
  }
}
