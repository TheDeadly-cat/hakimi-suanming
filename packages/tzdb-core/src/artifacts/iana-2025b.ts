import packedData from "moment-timezone-2025b/data/packed/latest.json";

export type PackedTzdbData = {
  version: string;
  zones: string[];
  links: string[];
  countries?: string[];
};

/**
 * Kept behind a dynamic import so ordinary current-snapshot calculations do
 * not parse the historical Zone/Link table until an old record is replayed.
 */
export default packedData as PackedTzdbData;
