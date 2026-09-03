export function isValidUtcOffsetSeconds(value: unknown): value is number {
  return Number.isSafeInteger(value) && Math.abs(value as number) < 86_400;
}

export function formatUtcOffsetSeconds(value: number): string {
  if (!isValidUtcOffsetSeconds(value)) {
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

export function formatVedicCivilBrowserFailureForUi(code: string): string {
  if (code === "DST_GAP_REJECTED") return "本地墙时空档被拒绝";
  if (code === "DST_OVERLAP_REJECTED") return "本地墙时重叠被拒绝";
  return code;
}
