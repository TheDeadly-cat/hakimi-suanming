import {
  normalizeBootError,
  type AppBootFailure,
  type AppBootFailureSource
} from "./app-boot-failure";

export type LatchedAppBootFailure = Pick<AppBootFailure, "source" | "error">;
export type AppBootFailureListener = (failure: LatchedAppBootFailure) => void;

export class AppBootFailureLatch {
  private failure: LatchedAppBootFailure | null = null;
  private readonly listeners = new Set<AppBootFailureListener>();

  get current(): LatchedAppBootFailure | null {
    return this.failure;
  }

  report(source: AppBootFailureSource, reason: unknown): LatchedAppBootFailure {
    this.failure ??= {
      source,
      error: normalizeBootError(reason, `${source} boot failure`)
    };
    for (const listener of this.listeners) listener(this.failure);
    return this.failure;
  }

  subscribe(listener: AppBootFailureListener): () => void {
    this.listeners.add(listener);
    if (this.failure) listener(this.failure);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
