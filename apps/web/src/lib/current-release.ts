import {
  BRIDGE_RELEASE_DATABASE_DESCRIPTOR,
  parseReleaseDatabaseDescriptor,
  type ReleaseDatabaseDescriptor
} from "../../release-protocol";

const RELEASE_META_NAME = "hakimi-release-database";

export function readCurrentReleaseDatabaseDescriptor(
  documentLike: Pick<Document, "querySelector"> | undefined = typeof document === "undefined" ? undefined : document
): ReleaseDatabaseDescriptor {
  const raw = documentLike
    ?.querySelector<HTMLMetaElement>(`meta[name="${RELEASE_META_NAME}"]`)
    ?.content;
  if (!raw) {
    if (import.meta.env.PROD) throw new Error("生产页面缺少数据库代际描述符。");
    return BRIDGE_RELEASE_DATABASE_DESCRIPTOR;
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (cause) {
    throw new Error("页面数据库代际描述符不是合法 JSON。", { cause });
  }
  return parseReleaseDatabaseDescriptor(decoded);
}

export const CURRENT_RELEASE_DATABASE = readCurrentReleaseDatabaseDescriptor();
