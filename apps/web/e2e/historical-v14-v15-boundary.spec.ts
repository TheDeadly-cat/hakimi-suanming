import { PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR, PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR } from "../release-protocol";
import { defineHistoricalSchemaBoundaryTests } from "./historical-schema-boundary-helpers";
defineHistoricalSchemaBoundaryTests("v14-v15", PRODUCTION_V14_RELEASE_DATABASE_DESCRIPTOR, PRODUCTION_V15_RELEASE_DATABASE_DESCRIPTOR);
