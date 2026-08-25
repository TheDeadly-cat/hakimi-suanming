const UUID_ROUTE_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export const CANDIDATE_SET_ROUTE = new RegExp(
  `^/candidate-sets/(${UUID_ROUTE_SEGMENT})$`,
  "i",
);

export const CASE_REVISION_ROUTE = new RegExp(
  `^/cases/(${UUID_ROUTE_SEGMENT})/revisions/(${UUID_ROUTE_SEGMENT})$`,
  "i",
);

export const CASE_REVISE_ROUTE = new RegExp(
  `^/cases/(${UUID_ROUTE_SEGMENT})/revisions/(${UUID_ROUTE_SEGMENT})/revise$`,
  "i",
);
