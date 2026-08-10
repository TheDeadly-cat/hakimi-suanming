import {
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR,
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR,
  releaseDatabaseDescriptorForDefaultViteBuild
} from "./release-protocol";

/** Generic Vite entry: v13 unless the isolated cross-Schema harness is active. */
export const DEFAULT_VITE_RELEASE_DATABASE_DESCRIPTOR =
  releaseDatabaseDescriptorForDefaultViteBuild(process.env, process.argv);

/** Explicit production-v14 entry: frozen and independent of process.env. */
export const PRODUCTION_V14_VITE_RELEASE_DATABASE_DESCRIPTOR =
  PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR;

/** Explicit production-v15 candidate: frozen and independent of process.env. */
export const PRODUCTION_V15_VITE_RELEASE_DATABASE_DESCRIPTOR =
  PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR;

/** Explicit v13 -> v15 direct-hop candidate: frozen and independent of process.env. */
export const PRODUCTION_V13_TO_V15_VITE_RELEASE_DATABASE_DESCRIPTOR =
  PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR;

/** Explicit v13 -> v16 direct-hop candidate: frozen and independent of process.env. */
export const PRODUCTION_V13_TO_V16_VITE_RELEASE_DATABASE_DESCRIPTOR =
  PRODUCTION_V13_TO_V16_RELEASE_DATABASE_DESCRIPTOR;
