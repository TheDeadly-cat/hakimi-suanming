import {
  normalizeBootError,
  type AppBootFailure,
  type AppBootFailureSource
} from "./app-boot-failure";

export type LatchedAppBootFailure = Readonly<Pick<AppBootFailure, "source" | "error">>;
export type AppBootFailureListener = (failure: LatchedAppBootFailure) => void;

function notifyListenerSafely(
  listener: AppBootFailureListener,
  failure: LatchedAppBootFailure
): void {
  try {
    listener(failure);
  } catch {
    // A subscriber is an observer; it cannot replace or interrupt the latched
    // startup failure that recovery UI and release coordination rely on.
  }
}

export class AppBootFailureLatch {
  private failure: LatchedAppBootFailure | null = null;
  private readonly listeners = new Set<AppBootFailureListener>();

  get current(): LatchedAppBootFailure | null {
    return this.failure;
  }

  report(source: AppBootFailureSource, reason: unknown): LatchedAppBootFailure {
    if (this.failure) return this.failure;

    const error = normalizeBootError(reason, `${source} boot failure`);
    Object.freeze(error);
    const failure: LatchedAppBootFailure = Object.freeze({
      source,
      error
    });
    this.failure = failure;

    for (const listener of [...this.listeners]) notifyListenerSafely(listener, failure);
    return failure;
  }

  subscribe(listener: AppBootFailureListener): () => void {
    this.listeners.add(listener);
    if (this.failure) notifyListenerSafely(listener, this.failure);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
