import fs from "fs";
import path from "path";
import type { EvalQuery } from "./metrics";
import { normalizeQuery } from "./eval-candidates";

const EVAL_PATH = path.join(process.cwd(), "data/eval-queries.json");

export function getEvalQueriesPath(): string {
  return EVAL_PATH;
}

export async function loadEvalQueries(): Promise<EvalQuery[]> {
  const raw = await fs.promises.readFile(EVAL_PATH, "utf-8");
  return JSON.parse(raw) as EvalQuery[];
}

export async function addEvalQuery(
  entry: EvalQuery
): Promise<{ added: boolean; reason?: string; queries: EvalQuery[] }> {
  const query = entry.query.trim();
  if (!query) {
    return { added: false, reason: "query가 비어 있습니다.", queries: await loadEvalQueries() };
  }

  const queries = await loadEvalQueries();
  const normalized = normalizeQuery(query);
  if (queries.some((q) => normalizeQuery(q.query) === normalized)) {
    return { added: false, reason: "이미 eval-queries에 있습니다.", queries };
  }

  const next: EvalQuery = {
    query,
    expectedFiles: entry.expectedFiles.filter(Boolean),
    role: entry.role ?? "general",
  };
  queries.push(next);
  await fs.promises.writeFile(
    EVAL_PATH,
    `${JSON.stringify(queries, null, 2)}\n`,
    "utf-8"
  );
  return { added: true, queries };
}
