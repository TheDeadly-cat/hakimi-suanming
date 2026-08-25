import assert from "node:assert/strict";
import test from "node:test";
import {
  compareZoneAndLinkNameSets,
  inspectZoneAndLinkNameSet
} from "./verify-artifact.mjs";

function artifact(version, zones, links) {
  return { version, zones, links };
}

test("includes both Link endpoints and supports an alias link chain", () => {
  const chained = artifact("2026c", ["Zone/Base|payload"], [
    "Zone/Base|Alias/Mid",
    "Alias/Mid|Alias/Leaf"
  ]);
  const inspection = inspectZoneAndLinkNameSet(chained);
  assert.deepEqual([...inspection.names].sort(), [
    "Alias/Leaf",
    "Alias/Mid",
    "Zone/Base"
  ]);
  assert.equal(inspection.zoneNameCount, 1);
  assert.equal(inspection.linkAliasCount, 2);
});

test("fails closed when reachable Link endpoint sets differ", () => {
  const active = artifact("2026c", ["Zone/Base|payload"], [
    "Zone/Base|Alias/Mid",
    "Alias/Mid|Alias/Stable"
  ]);
  const retained = artifact("2025b", ["Zone/Base|payload"], ["Zone/Base|Alias/Stable"]);
  assert.throws(
    () => compareZoneAndLinkNameSets(active, retained),
    /active-only=\["Alias\/Mid"\]/u
  );
});

test("accepts reordered link chains when the endpoint union is identical", () => {
  const active = artifact("2026c", ["Zone/Base|payload"], [
    "Zone/Base|Alias/Mid",
    "Alias/Mid|Alias/Leaf"
  ]);
  const retained = artifact("2025b", ["Zone/Base|payload"], [
    "Alias/Mid|Alias/Leaf",
    "Zone/Base|Alias/Mid"
  ]);
  assert.equal(compareZoneAndLinkNameSets(active, retained).equal, true);
});

test("rejects identical endpoint unions when one Link topology is detached from every Zone", () => {
  const connected = artifact("2026c", ["Zone/Base|payload"], [
    "Zone/Base|Alias/A",
    "Alias/A|Alias/B",
    "Alias/B|Alias/C"
  ]);
  const detached = artifact("2025b", ["Zone/Base|payload"], [
    "Zone/Base|Alias/A",
    "Alias/B|Alias/C"
  ]);
  assert.deepEqual([...inspectZoneAndLinkNameSet(connected).names].sort(), [
    "Alias/A",
    "Alias/B",
    "Alias/C",
    "Zone/Base"
  ]);
  assert.throws(
    () => compareZoneAndLinkNameSets(connected, detached),
    /Link endpoints unreachable from every Zone: \["Alias\/B","Alias\/C"\]/u
  );
});

test("rejects duplicate Zone names, malformed pairs and duplicate alias/right identities", () => {
  assert.throws(
    () => inspectZoneAndLinkNameSet(artifact("test", ["Zone/A|one", "Zone/A|two"], [])),
    /duplicate Zone name/u
  );
  assert.throws(
    () => inspectZoneAndLinkNameSet(artifact("test", ["Zone/A|one"], ["Zone/A|"])),
    /malformed packed Link identity/u
  );
  assert.throws(
    () => inspectZoneAndLinkNameSet(artifact("test", ["Zone/A|one"], [
      "Zone/A|Alias/X",
      "Target/B|Alias/X"
    ])),
    /duplicate Link alias\/right identity/u
  );
});
