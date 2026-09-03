import assert from "node:assert/strict";
import test from "node:test";

import {
  SingleBindingIntegratedJsonError,
  canonicalStringifySingleBindingIntegrated,
  parseSingleBindingIntegratedStrictJsonBytes,
  parseSingleBindingIntegratedStrictJsonText
} from "../single-binding-integrated-json.js";

test("strict bytes parser rejects a UTF-8 BOM before TextDecoder can consume it", () => {
  const bytes = Buffer.concat([
    Buffer.from([0xef, 0xbb, 0xbf]),
    Buffer.from('{"ok":true}', "utf8")
  ]);
  assert.throws(
    () => parseSingleBindingIntegratedStrictJsonBytes(bytes, { label: "fixture" }),
    (error) => error instanceof SingleBindingIntegratedJsonError && /BOM/u.test(error.message)
  );
});

test("strict parser rejects invalid UTF-8 and duplicate keys", () => {
  assert.throws(
    () => parseSingleBindingIntegratedStrictJsonBytes(new Uint8Array([0xc3, 0x28])),
    (error) => error instanceof SingleBindingIntegratedJsonError && /UTF-8/u.test(error.message)
  );
  assert.throws(
    () => parseSingleBindingIntegratedStrictJsonText('{"a":1,"a":2}'),
    (error) => error instanceof SingleBindingIntegratedJsonError && /重复键/u.test(error.message)
  );
});

test("canonical JSON is deterministic without changing array order", () => {
  assert.equal(
    canonicalStringifySingleBindingIntegrated({ z: [2, 1], a: { y: true, x: null } }),
    '{"a":{"x":null,"y":true},"z":[2,1]}'
  );
});
