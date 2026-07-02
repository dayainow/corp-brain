/**
 * vectors.json → PgVector 마이그레이션 스크립트
 * Usage: DATABASE_URL=... npx tsx scripts/migrate-to-pgvector.ts
 */
import fs from "fs";
import path from "path";
import { initSchema } from "../src/lib/db/client";
import { PgVectorStore } from "../src/lib/vector-store/pgvector-store";
import type { VectorDocument } from "../src/lib/vector-store/types";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 환경 변수가 필요합니다.");
    process.exit(1);
  }

  const jsonPath = path.join(process.cwd(), "src/data/vectors.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("vectors.json 파일이 없습니다. 먼저 Sync Vault를 실행하세요.");
    process.exit(1);
  }

  const docs: VectorDocument[] = JSON.parse(
    await fs.promises.readFile(jsonPath, "utf-8")
  );

  console.log(`마이그레이션 시작: ${docs.length}개 청크`);
  await initSchema();

  const store = new PgVectorStore();
  await store.saveAll(docs);

  const count = await store.count();
  console.log(`마이그레이션 완료! PgVector에 ${count}개 청크 저장됨`);
}

main().catch((err) => {
  console.error("마이그레이션 실패:", err);
  process.exit(1);
});
