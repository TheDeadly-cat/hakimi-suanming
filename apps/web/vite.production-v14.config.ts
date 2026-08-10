import { createWebViteConfig } from "./vite.config";
import { PRODUCTION_V14_VITE_RELEASE_DATABASE_DESCRIPTOR } from "./vite-release-config";

/**
 * This explicit config is the only production entry point that may emit the
 * v13 -> v14 shadow-database release descriptor. It deliberately ignores all
 * HAKIMI_DB_* environment variables so the release is reproducible.
 */
export default createWebViteConfig(PRODUCTION_V14_VITE_RELEASE_DATABASE_DESCRIPTOR);
