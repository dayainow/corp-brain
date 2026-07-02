-- CorpBrain PostgreSQL + PgVector 스키마
-- docker compose up -d postgres 후 실행

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  file_name   TEXT NOT NULL UNIQUE,
  source      TEXT,
  role        TEXT NOT NULL DEFAULT 'general',
  title       TEXT,
  author      TEXT,
  uploaded_by TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vector_chunks (
  id          TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  source      TEXT,
  role        TEXT NOT NULL DEFAULT 'general',
  text        TEXT NOT NULL,
  embedding   vector(384),
  chunk_index INT NOT NULL DEFAULT 0,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_file_name ON vector_chunks(file_name);
CREATE INDEX IF NOT EXISTS idx_chunks_role ON vector_chunks(role);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON vector_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_documents_role ON documents(role);
