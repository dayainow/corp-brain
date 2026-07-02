function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters in production");
  }

  if (process.env.VECTOR_STORE === "pgvector" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when VECTOR_STORE=pgvector");
  }

  const weakSecrets = [
    "change-me-in-production-32chars",
    "build-time-placeholder-32-chars-min",
    "ci-test-secret-at-least-32-chars-long",
    "e2e-test-secret-at-least-32-chars-long",
  ];
  if (weakSecrets.includes(secret)) {
    throw new Error("AUTH_SECRET must not use a default or placeholder value in production");
  }
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateProductionConfig();
  }
}
