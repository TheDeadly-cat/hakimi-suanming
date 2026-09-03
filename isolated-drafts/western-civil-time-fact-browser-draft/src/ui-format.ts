export function formatUtcOffsetSeconds(value: number): string {
  if (!Number.isSafeInteger(value) || Math.abs(value) >= 86_400) {
    throw new Error("UTC_OFFSET_SECONDS_INVALID");
  }
  const sign = value < 0 ? "−" : "+";
  const absoluteSeconds = Math.abs(value);
  const hours = Math.floor(absoluteSeconds / 3_600);
  const minutes = Math.floor((absoluteSeconds % 3_600) / 60);
  const seconds = absoluteSeconds % 60;
  const base = `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return seconds === 0 ? base : `${base}:${String(seconds).padStart(2, "0")}`;
}
