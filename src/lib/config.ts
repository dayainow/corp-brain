import path from "path";

function resolvePath(relative: string): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), relative);
}

export const config = {
  auth: {
    secret: process.env.AUTH_SECRET,
    url: process.env.AUTH_URL ?? "http://localhost:3000",
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
    model: process.env.OLLAMA_MODEL ?? "llama3",
    apiKey: process.env.OLLAMA_API_KEY ?? "ollama",
  },
  rag: {
    topK: Number(process.env.RAG_TOP_K ?? "5"),
    embeddingModel: process.env.EMBEDDING_MODEL ?? "Xenova/multilingual-e5-small",
  },
  vectorStore: {
    type: (process.env.VECTOR_STORE ?? "json") as "json" | "pgvector",
    jsonPath: resolvePath("src/data/vectors.json"),
    databaseUrl: process.env.DATABASE_URL,
  },
  audit: {
    logPath: resolvePath("data/audit.log"),
  },
  company: {
    name: "NovaPay",
    fullName: "주식회사 노바페이",
    domain: "novapay.kr",
  },
} as const;

export function getVaultPath(): string {
  return process.env.VAULT_PATH
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.VAULT_PATH)
    : resolvePath("vault");
}
