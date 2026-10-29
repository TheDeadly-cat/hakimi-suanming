export type AppFailurePhaseState = {
  appBootConfirmed: boolean;
  bootFailed: boolean;
  bootConfirmationSent: boolean;
  requiresReleaseInteractionConfirmation: boolean;
};

/** Classify an error without changing any boot, release, or write gate. */
export function appFailurePhase(state: AppFailurePhaseState): "boot" | "runtime" {
  // Preserve the existing post-ServiceWorker-confirmation behavior.
  if (state.bootConfirmationSent) return "runtime";
  // Development and non-worker documents never send BOOT_OK. Their completed
  // local checks still distinguish later errors from an initial boot failure.
  return state.appBootConfirmed && !state.bootFailed && !state.requiresReleaseInteractionConfirmation
    ? "runtime"
    : "boot";
}
