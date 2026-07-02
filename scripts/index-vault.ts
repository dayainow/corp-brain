#!/usr/bin/env tsx
/**
 * Vault 인덱싱 CLI (CI·로컬 eval용)
 * Usage:
 *   npm run index:vault
 *   npm run index:vault -- --incremental
 */
import { getVaultPath } from "../src/lib/config";
import { runIndexing, runIncrementalSync } from "../src/lib/indexer";

async function main() {
  const incremental = process.argv.includes("--incremental");
  const vaultPath = getVaultPath();
  const result = incremental
    ? await runIncrementalSync(vaultPath)
    : await runIndexing(vaultPath);
  console.log(`\n완료 (${result.mode}):`, result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
