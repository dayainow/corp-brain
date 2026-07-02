#!/usr/bin/env tsx
/**
 * Vault 전체 인덱싱 CLI (CI·로컬 eval용)
 * Usage: npm run index:vault
 */
import { getVaultPath } from "../src/lib/config";
import { runIndexing } from "../src/lib/indexer";

async function main() {
  const vaultPath = getVaultPath();
  const result = await runIndexing(vaultPath);
  console.log(`\n완료: ${result.files}개 파일, ${result.chunks}개 청크`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
