#!/usr/bin/env tsx
import { formatHarnessReport, runQualityHarness } from "../.ax/harnesses/quality-suite-harness";

async function main() {
  const report = await runQualityHarness();
  console.log(formatHarnessReport(report));
  process.exit(report.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
