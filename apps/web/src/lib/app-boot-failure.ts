export type AppBootFailureSource =
  | "route"
  | "storage"
  | "calculation"
  | "paint"
  | "window_error"
  | "unhandled_rejection"
  | "timeout";

export type AppBootFailure = {
  storageReady: boolean;
  source: AppBootFailureSource;
  error: Error;
};

export function normalizeBootError(reason: unknown, fallback: string): Error {
  if (reason instanceof Error) return reason;
  return new Error(typeof reason === "string" && reason ? reason : fallback);
}

export function diagnosticBootErrorName(error: Error): string {
  return ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "DOMException"].includes(error.name)
    ? error.name
    : "Error";
}

export function diagnosticBootFailureMessage(source: AppBootFailureSource): string {
  const messages: Record<AppBootFailureSource, string> = {
    route: "The requested application route did not pass startup verification.",
    storage: "The local storage read probe did not pass startup verification.",
    calculation: "The deterministic calculation smoke test did not pass.",
    paint: "The verified route did not complete its startup paint check.",
    window_error: "An uncaught window error occurred before startup confirmation.",
    unhandled_rejection: "An unhandled promise rejection occurred before startup confirmation.",
    timeout: "Application startup verification exceeded its fixed time limit."
  };
  return messages[source];
}
