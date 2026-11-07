import fs from "node:fs";
import { syncBuiltinESMExports, registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

// Fail before any source read. This is a scoped verification guard, not a
// replacement module or permission to run the unrestricted full build.
function check(value) {
  if (typeof value === "number") return;
  const raw = value instanceof URL ? fileURLToPath(value) : Buffer.isBuffer(value) ? value.toString() : String(value);
  const normalized = raw.replaceAll("\\", "/").toLowerCase();
  if (/(?:^|\/)local-user-data-cleanup\.ts(?:[?#].*)?$/u.test(normalized)) {
    throw new Error("MAIN_ROUTE_PROTECTED_SOURCE_READ_DENIED");
  }
}
for (const method of ["readFileSync", "readFile", "openSync", "open", "createReadStream"]) {
  const original = fs[method];
  fs[method] = function (path, ...args) { check(path); return Reflect.apply(original, this, [path, ...args]); };
}
for (const method of ["readFile", "open"]) {
  const original = fs.promises[method];
  fs.promises[method] = function (path, ...args) { check(path); return Reflect.apply(original, this, [path, ...args]); };
}
syncBuiltinESMExports();
registerHooks({ load(url, context, nextLoad) { check(url.startsWith("file:") ? new URL(url) : url); return nextLoad(url, context); } });
