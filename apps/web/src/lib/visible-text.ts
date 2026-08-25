const DEFAULT_MAX_CODE_POINTS = 600;
const MAX_VISIBLE_CODE_POINTS = 10_000;
const UNSAFE_VISIBLE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/gu;

function resolveMaxCodePoints(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) return DEFAULT_MAX_CODE_POINTS;
  return Math.min(value, MAX_VISIBLE_CODE_POINTS);
}

function cleanVisibleText(value: unknown, maxCodePoints: number): string {
  if (typeof value !== "string") return "";
  const source = value.slice(0, maxCodePoints * 8);
  const cleaned = source
    .normalize("NFC")
    .replace(UNSAFE_VISIBLE_TEXT_PATTERN, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!cleaned) return "";
  const codePoints = Array.from(cleaned);
  return codePoints.length > maxCodePoints
    ? `${codePoints.slice(0, maxCodePoints).join("")}…`
    : cleaned;
}

export function safeVisibleText(
  value: unknown,
  fallback: string,
  maxCodePoints = DEFAULT_MAX_CODE_POINTS
): string {
  const resolvedMax = resolveMaxCodePoints(maxCodePoints);
  return cleanVisibleText(value, resolvedMax) || cleanVisibleText(fallback, resolvedMax);
}

export function safeVisibleErrorMessage(
  reason: unknown,
  fallback: string,
  maxCodePoints = DEFAULT_MAX_CODE_POINTS
): string {
  try {
    return safeVisibleText(reason instanceof Error ? reason.message : "", fallback, maxCodePoints);
  } catch {
    return safeVisibleText("", fallback, maxCodePoints);
  }
}
