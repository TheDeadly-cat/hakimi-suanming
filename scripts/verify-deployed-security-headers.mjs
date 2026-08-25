import { readFile } from "node:fs/promises";
import path from "node:path";

const target = process.argv[2];
if (!target) throw new Error("Usage: npm run verify:deployed-security-headers -- https://deployment.example/");
const url = new URL(target);
if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error("A public hosting verification target must use HTTPS.");
}
const policy = JSON.parse(await readFile(path.resolve("docs/security/hosting-security-policy.json"), "utf8"));
const response = await fetch(url, { redirect: "error" });
if (!response.ok) throw new Error(`Deployment returned HTTP ${response.status}.`);
for (const [name, expected] of Object.entries(policy.headers)) {
  const actual = response.headers.get(name);
  if (actual !== expected) throw new Error(`${name} mismatch on deployed response.`);
}
const html = await response.text();
for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/giu)) {
  const scriptUrl = new URL(match[1], url);
  if (scriptUrl.origin !== url.origin) throw new Error(`External script is not allowed: ${scriptUrl.href}`);
}
process.stdout.write(`${JSON.stringify({ target: url.href, status: response.status, headersVerified: true }, null, 2)}\n`);
