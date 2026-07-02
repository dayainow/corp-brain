import { Pool, type PoolClient } from "pg";
import { config } from "@/lib/config";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const url = config.vectorStore.databaseUrl;
    if (!url) {
      throw new Error("DATABASE_URL is required for PostgreSQL operations");
    }
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function initSchema(): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const schemaPath = path.join(process.cwd(), "src/lib/db/schema.sql");
  const sql = await fs.promises.readFile(schemaPath, "utf-8");
  await withClient(async (client) => {
    await client.query(sql);
  });
}

export async function isPgAvailable(): Promise<boolean> {
  if (!config.vectorStore.databaseUrl) return false;
  try {
    const client = await getPool().connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}
