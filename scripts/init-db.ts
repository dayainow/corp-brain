/**
 * PostgreSQL 스키마 초기화
 * Usage: DATABASE_URL=... npm run db:init
 */
import { initSchema } from "../src/lib/db/client";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 환경 변수가 필요합니다.");
    process.exit(1);
  }
  await initSchema();
  console.log("스키마 초기화 완료");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
