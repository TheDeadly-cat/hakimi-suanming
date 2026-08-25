import { safeVisibleText } from "./visible-text";

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const INVALID_DATE_TIME_LABEL = "\u65f6\u95f4\u65e0\u6548";
const MISSING_HASH_LABEL = "\u6458\u8981\u7f3a\u5931";
const MAX_HASH_SOURCE_CODE_POINTS = 512;

export function formatDateTime(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return INVALID_DATE_TIME_LABEL;
  }

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return INVALID_DATE_TIME_LABEL;
  }

  return dateTimeFormatter.format(parsed);
}

export function shortHash(value: unknown): string {
  const normalized = safeVisibleText(value, "", MAX_HASH_SOURCE_CODE_POINTS);
  if (!normalized) {
    return MISSING_HASH_LABEL;
  }

  const codePoints = Array.from(normalized);
  if (codePoints.length <= 15) {
    return normalized;
  }

  return `${codePoints.slice(0, 8).join("")}…${codePoints.slice(-6).join("")}`;
}
