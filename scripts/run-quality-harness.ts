#!/usr/bin/env tsx
import { formatHarnessReport, runQualityHarness } from "../.ax/harnesses/quality-suite-harness";

const report = runQualityHarness();
console.log(formatHarnessReport(report));
process.exit(report.passed ? 0 : 1);
