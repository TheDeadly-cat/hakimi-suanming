import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR, PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR } from "../release-protocol";
import { defineHistoricalSchemaBoundaryTests } from "./historical-schema-boundary-helpers";
defineHistoricalSchemaBoundaryTests("v13-v15", BRIDGE_RELEASE_DATABASE_DESCRIPTOR, PRODUCTION_V13_TO_V15_RELEASE_DATABASE_DESCRIPTOR);
