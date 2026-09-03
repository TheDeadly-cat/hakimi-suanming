import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadFormallyVerifiedDeployedHostExpectation,
  validateRealDeployedHostPreflight,
  verifyRealDeployedHost
} from "./deployed-security-headers-lib.mjs";

function parseArguments(argv) {
  const values = {
    target: null,
    artifactRoot: null,
    evidencePath: null,
    receiptsPath: null,
    policyPath: "docs/security/hosting-security-policy.json"
  };
  const seen = new Set();
  const mapping = {
    "--artifact-root": "artifactRoot",
    "--evidence": "evidencePath",
    "--receipts": "receiptsPath",
    "--policy": "policyPath"
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      if (values.target !== null) throw new Error("Only one deployed-host target may be supplied.");
      values.target = argument;
      continue;
    }
    const key = mapping[argument];
    if (!key || seen.has(key) || index + 1 >= argv.length) {
      throw new Error(`Invalid or duplicate option: ${argument}.`);
    }
    seen.add(key);
    values[key] = argv[index + 1];
    index += 1;
  }
  if (!values.target || !values.artifactRoot || !values.evidencePath || !values.receiptsPath) {
    throw new Error(
      "Usage: npm run verify:deployed-security-headers -- https://deployment.example --artifact-root dist/web --evidence dist/web/release-evidence.json --receipts tmp/release-evidence-receipts"
    );
  }
  return values;
}

function failureCode(stages) {
  if (!stages.realHostPreflightPassed) return "REAL_HOST_PREFLIGHT_FAILED";
  if (!stages.formalReleaseEvidenceVerified) return "FORMAL_RELEASE_EVIDENCE_FAILED";
  if (!stages.artifactExpectationLoaded) return "ARTIFACT_EXPECTATION_FAILED";
  return "REAL_HOST_VERIFICATION_FAILED";
}

function preflightFailure(error, stages) {
  return {
    schemaVersion: 1,
    summaryType: "deployed_host_verification_v1",
    verificationKind: "real-network",
    dnsResolutionAttempted: false,
    networkAttempted: false,
    networkCompleted: false,
    strictGatePassed: false,
    preparationGates: {
      ...stages,
      realHostVerified: false,
      publicReleaseGatePassed: false
    },
    claims: {
      engineeringEvidenceOnly: true,
      realHostVerified: false,
      browserRuntimeVerified: false,
      publicDeploymentAuthorized: false,
      releaseReady: false
    },
    errors: [{
      code: failureCode(stages),
      detail: error instanceof Error ? error.message : "Unknown preflight failure"
    }]
  };
}

const preparationGates = {
  realHostPreflightPassed: false,
  formalReleaseEvidenceVerified: false,
  artifactExpectationLoaded: false,
  deployedHostVerifierInvoked: false
};

try {
  const args = parseArguments(process.argv.slice(2));
  const cwd = process.cwd();
  const policy = JSON.parse(await readFile(path.resolve(cwd, args.policyPath), "utf8"));
  validateRealDeployedHostPreflight({ baseUrl: args.target, policy });
  preparationGates.realHostPreflightPassed = true;
  let expectation;
  try {
    expectation = await loadFormallyVerifiedDeployedHostExpectation({
      cwd,
      artifactRoot: args.artifactRoot,
      evidencePath: args.evidencePath,
      receiptsPath: args.receiptsPath,
      policy,
      policyPath: args.policyPath
    });
  } catch (error) {
    if (error?.formalReleaseEvidenceVerified === true) {
      preparationGates.formalReleaseEvidenceVerified = true;
    }
    throw error;
  }
  preparationGates.formalReleaseEvidenceVerified = true;
  preparationGates.artifactExpectationLoaded = true;
  preparationGates.deployedHostVerifierInvoked = true;
  const result = await verifyRealDeployedHost({ baseUrl: args.target, policy, expectation });
  process.stdout.write(`${JSON.stringify({ ...result, preparationGates }, null, 2)}\n`);
  if (!result.strictGatePassed) process.exitCode = 1;
} catch (error) {
  process.stdout.write(`${JSON.stringify(preflightFailure(error, preparationGates), null, 2)}\n`);
  process.exitCode = 1;
}
