import {
  calculateFortelNamedProjectionDraft,
  compareFortelAgainstFreshIztroDraft
} from "./index.ts";

const args = process.argv.slice(2);

try {
  if (args[0] === "--compare") {
    const [gregorianDate = "1995-08-18", shichenText = "6", sexForCalculation = "male"] = args.slice(1);
    const report = await compareFortelAgainstFreshIztroDraft({
      gregorianDate,
      shichenIndex: Number(shichenText),
      sexForCalculation
    });
    console.log(JSON.stringify(report, null, 2));
  } else {
    const [gregorianDate = "1995-08-18", shichenText = "6", sexForCalculation = "male"] = args;
    const result = await calculateFortelNamedProjectionDraft({
      gregorianDate,
      shichenIndex: Number(shichenText),
      sexForCalculation
    });
    console.log(JSON.stringify({
      warning: "Fortel 1.3.4 engineering behavior only; not expert truth and not a production chart.",
      ...result
    }, null, 2));
  }
} catch (error) {
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "FORTEL_DIFFERENTIAL_DEMO_FAILED";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${code}: ${message}`);
  process.exitCode = 1;
}
