import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR, PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR } from "../release-protocol";
import { defineHistoricalSchemaBoundaryTests } from "./historical-schema-boundary-helpers";
defineHistoricalSchemaBoundaryTests("v13-v14", BRIDGE_RELEASE_DATABASE_DESCRIPTOR, PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR);
