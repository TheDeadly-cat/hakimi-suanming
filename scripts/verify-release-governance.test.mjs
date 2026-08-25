import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import pwaCrossBrowserConfig from "../apps/web/playwright.pwa-cross-browser.config.ts";
import { RELEASE_BROWSER_MATRIX } from "../apps/web/playwright.release-browser-matrix.ts";
import webV1CrossBrowserConfig from "../apps/web/playwright.web-v1-cross-browser.config.ts";
import {
  REQUIRED_MIGRATION_WORKFLOW_COMMANDS,
  REQUIRED_MIGRATION_WORKFLOW_PATHS,
  REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS,
  REQUIRED_RELEASE_BROWSER_IDS,
  REQUIRED_RELEASE_BROWSER_MATRIX,
  REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS,
  REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER,
  REQUIRED_RELEASE_BROWSER_SCRIPTS,
  REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND,
  REQUIRED_RELEASE_FILES,
  verifyMigrationWorkflowGovernance,
  verifyReleaseBrowserInstallPrerequisite,
  verifyReleaseBrowserGovernance,
  verifyReleaseBrowserPlaywrightConfig,
  verifyReleaseReceiptMirror
} from "./verify-release-governance.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = await readFile(
  path.join(workspaceRoot, ".github/workflows/migration-ci.yml"),
  "utf8"
);
const decisions = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/web-v1-release-decisions.json"),
  "utf8"
));
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const releaseWorkflow = await readFile(
  path.join(workspaceRoot, ".github/workflows/release-evidence.yml"),
  "utf8"
);
const releaseRunbook = await readFile(
  path.join(workspaceRoot, "docs/release/web-v1-release-and-rollback-runbook.md"),
  "utf8"
);

function withoutExactLine(source, exactLine) {
  const lines = source.split(/\r?\n/u);
  const index = lines.indexOf(exactLine);
  assert.notEqual(index, -1, `Fixture line is missing: ${exactLine}`);
  lines.splice(index, 1);
  return lines.join("\n");
}

function receiptLine(document, id) {
  const line = document.split(/\r?\n/u).find((candidate) => candidate.includes(`--id ${id} `));
  assert.ok(line, `Receipt fixture is missing: ${id}`);
  return line;
}

function swapExactLines(source, firstLine, secondLine) {
  const lines = source.split(/\r?\n/u);
  const firstIndex = lines.indexOf(firstLine);
  const secondIndex = lines.indexOf(secondLine);
  assert.notEqual(firstIndex, -1, `Fixture line is missing: ${firstLine}`);
  assert.notEqual(secondIndex, -1, `Fixture line is missing: ${secondLine}`);
  [lines[firstIndex], lines[secondIndex]] = [lines[secondIndex], lines[firstIndex]];
  return lines.join("\n");
}

test("accepts the checked-in migration workflow trigger and command closure", () => {
  assert.doesNotThrow(() => verifyMigrationWorkflowGovernance(workflow));
});

for (const command of REQUIRED_MIGRATION_WORKFLOW_COMMANDS) {
  test(`rejects migration workflow when command is missing: ${command}`, () => {
    const weakenedWorkflow = withoutExactLine(workflow, `      - run: ${command}`);
    assert.throws(
      () => verifyMigrationWorkflowGovernance(weakenedWorkflow),
      (error) => error instanceof Error && error.message === `Migration CI is missing ${command}.`
    );
  });
}

for (const requiredPath of REQUIRED_MIGRATION_WORKFLOW_PATHS) {
  test(`rejects migration workflow when pull_request path is missing: ${requiredPath}`, () => {
    const weakenedWorkflow = withoutExactLine(workflow, `      - "${requiredPath}"`);
    assert.throws(
      () => verifyMigrationWorkflowGovernance(weakenedWorkflow),
      (error) => error instanceof Error &&
        error.message === `Migration CI pull_request.paths is missing ${requiredPath}.`
    );
  });
}

test("accepts the checked-in Chrome and Edge release evidence matrix", () => {
  assert.doesNotThrow(() => verifyReleaseBrowserGovernance(decisions, packageJson));
});

test("required release files include the browser result and evidence command closure", () => {
  for (const requiredFile of [
    "apps/web/playwright.release-browser-result.ts",
    "apps/web/playwright.release-browser-strict-reporter.ts",
    "apps/web/playwright.web-v1-cross-browser.config.ts",
    "apps/web/e2e/web-v1-continuous-flow.spec.ts",
    "scripts/generate-release-evidence.mjs",
    "scripts/release-browser-result-evidence.mjs",
    "scripts/run-release-evidence-command.mjs",
    "scripts/verify-release-evidence.mjs"
  ]) {
    assert.equal(REQUIRED_RELEASE_FILES.includes(requiredFile), true, requiredFile);
  }
});

test("accepts the exact release browser configs and install prerequisites", () => {
  assert.doesNotThrow(() => verifyReleaseBrowserPlaywrightConfig(
    pwaCrossBrowserConfig,
    {
      receiptId: "pwa",
      testMatch: "pwa-install-and-offline-cold-start.spec.ts",
      outputDirectoryName: "hakimi-bazi-pwa-cross-browser-results",
      timeout: 120_000
    }
  ));
  assert.doesNotThrow(() => verifyReleaseBrowserInstallPrerequisite(
    releaseWorkflow,
    "Release workflow"
  ));
  assert.doesNotThrow(() => verifyReleaseBrowserInstallPrerequisite(
    releaseRunbook,
    "Release runbook"
  ));
});

for (const [label, mutate] of [
  ["executablePath override", (config) => {
    config.projects[0].use.launchOptions = { executablePath: "C:/wrong/chrome.exe" };
  }],
  ["synthetic userAgent", (config) => {
    config.projects[0].use.userAgent = "synthetic";
  }],
  ["webServer drift", (config) => {
    config.webServer.command = "node wrong-server.mjs";
  }],
  ["release identity drift", (config) => {
    config.projects[0].metadata.releaseIdentity.targetSchema = 16;
  }],
  ["focused test permission", (config) => {
    config.forbidOnly = false;
  }],
  ["hidden test filter", (config) => {
    config.testIgnore = "**/*";
  }]
]) {
  test(`rejects release browser config drift: ${label}`, () => {
    const pwa = structuredClone(pwaCrossBrowserConfig);
    mutate(pwa);
    assert.throws(
      () => verifyReleaseBrowserGovernance(
        decisions,
        packageJson,
        RELEASE_BROWSER_MATRIX,
        { pwa, "web-v1-flow": webV1CrossBrowserConfig }
      ),
      /Release browser/u
    );
  });
}

for (const [documentLabel, document, exactLine] of [
  [
    "Release workflow",
    releaseWorkflow,
    `      - run: ${REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND}`
  ],
  ["Release runbook", releaseRunbook, REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND]
]) {
  test(`rejects ${documentLabel} without the branded browser install prerequisite`, () => {
    assert.throws(
      () => verifyReleaseBrowserInstallPrerequisite(
        withoutExactLine(document, exactLine),
        documentLabel
      ),
      /exactly one branded browser install prerequisite/u
    );
  });

  test(`rejects ${documentLabel} with duplicate browser install prerequisites`, () => {
    assert.throws(
      () => verifyReleaseBrowserInstallPrerequisite(
        `${document}\n${REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND}\n`,
        documentLabel
      ),
      /exactly one branded browser install prerequisite/u
    );
  });
}

for (const [field, driftedValue] of Object.entries({
  policyId: "desktop-edge-drifted",
  projectName: "edge-alias",
  channel: "chrome",
  deviceName: "Desktop Chrome"
})) {
  test(`rejects release governance when the fixed browser tuple drifts: ${field}`, () => {
    const weakenedMatrix = structuredClone(RELEASE_BROWSER_MATRIX);
    weakenedMatrix[0][field] = driftedValue;
    assert.throws(
      () => verifyReleaseBrowserGovernance(decisions, packageJson, weakenedMatrix),
      /project\/channel\/device matrix does not match policy/u
    );
  });
}

for (const [documentLabel, document] of [
  ["Release workflow", releaseWorkflow],
  ["Release runbook", releaseRunbook]
]) {
  test(`accepts the checked-in canonical receipt mirror: ${documentLabel}`, () => {
    assert.doesNotThrow(() => verifyReleaseReceiptMirror(
      decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
      document,
      documentLabel
    ));
  });

  test(`rejects ${documentLabel} when the Web v1 browser receipt is missing`, () => {
    const webV1ReceiptLine = receiptLine(document, "web-v1-flow");
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        withoutExactLine(document, webV1ReceiptLine),
        documentLabel
      ),
      (error) => error instanceof Error &&
        error.message === `${documentLabel} is missing receipt web-v1-flow.`
    );
  });

  test(`rejects ${documentLabel} when receipt commands are swapped between IDs`, () => {
    const pwaCommand = decisions.releaseEvidence.defaultV13RequiredReceiptCommands.pwa.join(" ");
    const webV1Command = decisions.releaseEvidence.defaultV13RequiredReceiptCommands["web-v1-flow"].join(" ");
    const weakenedDocument = document
      .replace(`-- ${pwaCommand}`, "-- __PWA_COMMAND_PLACEHOLDER__")
      .replace(`-- ${webV1Command}`, `-- ${pwaCommand}`)
      .replace("-- __PWA_COMMAND_PLACEHOLDER__", `-- ${webV1Command}`);
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      (error) => error instanceof Error &&
        error.message === `${documentLabel} command for pwa does not match policy.`
    );
  });

  test(`rejects ${documentLabel} when a receipt command only has the canonical prefix`, () => {
    const pwaCommand = decisions.releaseEvidence.defaultV13RequiredReceiptCommands.pwa.join(" ");
    const weakenedDocument = document.replace(`-- ${pwaCommand}`, `-- ${pwaCommand}:drifted`);
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      (error) => error instanceof Error &&
        error.message === `${documentLabel} command for pwa does not match policy.`
    );
  });

  test(`rejects ${documentLabel} when canonical receipt execution order drifts`, () => {
    const weakenedDocument = swapExactLines(
      document,
      receiptLine(document, "pwa"),
      receiptLine(document, "web-v1-flow")
    );
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      /receipt order mismatch/u
    );
  });

  test(`rejects ${documentLabel} when the required receipt ID list is not sorted`, () => {
    const canonicalIds = Object.keys(
      decisions.releaseEvidence.defaultV13RequiredReceiptCommands
    ).sort();
    const unsortedIds = [...canonicalIds];
    [unsortedIds[0], unsortedIds[1]] = [unsortedIds[1], unsortedIds[0]];
    const weakenedDocument = document.replace(
      `--require-receipts ${canonicalIds.join(",")}`,
      `--require-receipts ${unsortedIds.join(",")}`
    );
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      /does not require the complete canonical receipt set/u
    );
  });
}

test("keeps the canonical release receipt execution order explicit", () => {
  assert.deepEqual(
    REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER,
    [
      "governance",
      "evidence-tooling",
      "typecheck",
      "unit",
      "build",
      "boot",
      "pwa",
      "web-v1-flow",
      "cross-schema-v13-v16",
      "orphaned-v13-recovery",
      "built-contract"
    ]
  );
});

for (const browserId of REQUIRED_RELEASE_BROWSER_IDS) {
  test(`rejects release governance when browser support is missing: ${browserId}`, () => {
    const weakenedDecisions = structuredClone(decisions);
    weakenedDecisions.browserSupport.supportedEngineeringMatrix =
      weakenedDecisions.browserSupport.supportedEngineeringMatrix.filter((value) => value !== browserId);
    assert.throws(
      () => verifyReleaseBrowserGovernance(weakenedDecisions, packageJson),
      /release browser matrix must be exactly/u
    );
  });
}

for (const claimField of REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS) {
  test(`rejects release governance when an unsupported browser claim is authorized: ${claimField}`, () => {
    const weakenedDecisions = structuredClone(decisions);
    weakenedDecisions.browserSupport[claimField] = true;
    assert.throws(
      () => verifyReleaseBrowserGovernance(weakenedDecisions, packageJson),
      (error) => error instanceof Error &&
        error.message === `Unsupported release browser claim must remain false: ${claimField}.`
    );
  });
}

test("keeps the fixed release browser tuple anchor independent of the runtime matrix", () => {
  assert.deepEqual(
    RELEASE_BROWSER_MATRIX.map((browser) => ({ ...browser })),
    REQUIRED_RELEASE_BROWSER_MATRIX
  );
});

for (const receiptId of Object.keys(REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS)) {
  test(`rejects release governance when browser receipt policy drifts: ${receiptId}`, () => {
    const weakenedDecisions = structuredClone(decisions);
    delete weakenedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands[receiptId];
    assert.throws(
      () => verifyReleaseBrowserGovernance(weakenedDecisions, packageJson),
      (error) => error instanceof Error &&
        error.message === `Release browser receipt policy mismatch: ${receiptId}.`
    );
  });
}

for (const scriptName of Object.keys(REQUIRED_RELEASE_BROWSER_SCRIPTS)) {
  test(`rejects release governance when browser script drifts: ${scriptName}`, () => {
    const weakenedPackageJson = structuredClone(packageJson);
    weakenedPackageJson.scripts[scriptName] = "playwright test --config apps/web/playwright.config.ts";
    assert.throws(
      () => verifyReleaseBrowserGovernance(decisions, weakenedPackageJson),
      (error) => error instanceof Error &&
        error.message === `Release browser package script mismatch: ${scriptName}.`
    );
  });
}
