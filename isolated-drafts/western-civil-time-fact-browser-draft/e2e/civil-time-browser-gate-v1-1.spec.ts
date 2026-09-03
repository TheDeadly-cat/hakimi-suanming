import { createHash, createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

const NONCE_COMMITMENT = process.env.HAKIMI_WESTERN_EVIDENCE_RUN_NONCE_COMMITMENT;
const RAW_NONCE = process.env.HAKIMI_WESTERN_EVIDENCE_RUN_NONCE;
if (typeof NONCE_COMMITMENT !== "string" || !/^[a-f0-9]{64}$/u.test(NONCE_COMMITMENT)) {
  throw new Error("missing exact run nonce commitment");
}
if (typeof RAW_NONCE !== "string" || !/^[a-f0-9]{64}$/u.test(RAW_NONCE)
    || createHash("sha256").update(Buffer.from(RAW_NONCE, "hex")).digest("hex") !== NONCE_COMMITMENT) {
  throw new Error("missing exact committed run nonce");
}

test.beforeEach(async ({ page }, testInfo) => {
  const session = await page.context().newCDPSession(page);
  try {
    const version = await session.send("Browser.getVersion");
    const navigatorUserAgent = await page.evaluate(() => navigator.userAgent);
    const projectToken = createHmac("sha256", Buffer.from(RAW_NONCE, "hex"))
      .update(`hakimi.western.same-artifact.project-token.v1\0${testInfo.project.name}`, "utf8")
      .digest("hex");
    const identity = {
      schemaVersion: "hakimi.western.same-artifact.matrix-browser-identity/1",
      projectName: testInfo.project.name,
      runNonceCommitment: NONCE_COMMITMENT,
      projectTokenSha256: createHash("sha256").update(projectToken, "utf8").digest("hex"),
      product: version.product,
      protocolVersion: version.protocolVersion,
      cdpUserAgent: version.userAgent,
      navigatorUserAgent,
      navigatorUserAgentEqualsCdpUserAgent: version.userAgent === navigatorUserAgent
    };
    expect(identity.cdpUserAgent).toContain("HeadlessChrome/");
    expect(identity.navigatorUserAgent).toContain("Mozilla/5.0");
    await testInfo.attach("hakimi-western-matrix-browser-identity-v1", {
      body: Buffer.from(JSON.stringify(identity), "utf8"),
      contentType: "application/json"
    });
  } finally {
    await session.detach();
  }
});

await import("./civil-time-browser-gate.spec.ts");
