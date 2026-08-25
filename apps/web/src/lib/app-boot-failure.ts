import { safeVisibleText } from "./visible-text";

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

const MAX_BOOT_ERROR_MESSAGE_LENGTH = 512;
const DEFAULT_BOOT_ERROR_MESSAGE = "Application startup failed.";

function normalizeBootErrorMessage(value: unknown, fallback: string): string {
  return safeVisibleText(value, fallback, MAX_BOOT_ERROR_MESSAGE_LENGTH)
    || DEFAULT_BOOT_ERROR_MESSAGE;
}

export function normalizeBootError(reason: unknown, fallback: string): Error {
  let messageSource = reason;
  let name = "Error";

  try {
    if (reason instanceof Error) {
      messageSource = reason.message;
      name = diagnosticBootErrorName(reason);
    }
  } catch {
    // A hostile proxy can throw during instanceof; startup recovery must still
    // receive a stable, non-reflective Error object.
    messageSource = fallback;
  }

  const error = new Error(normalizeBootErrorMessage(messageSource, fallback));
  error.name = name;
  return error;
}

export function diagnosticBootErrorName(error: Error): string {
  let name: string;
  try {
    name = typeof error.name === "string" ? error.name : "Error";
  } catch {
    return "Error";
  }
  return ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "DOMException"].includes(name)
    ? name
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
