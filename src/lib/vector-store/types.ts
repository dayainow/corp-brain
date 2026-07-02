export interface VectorDocument {
  id: string;
  text: string;
  metadata: {
    source: string;
    fileName: string;
    role?: string;
    [key: string]: unknown;
  };
  embedding: number[];
}

export interface DocumentMeta {
  id: string;
  fileName: string;
  source: string;
  role: string;
  title?: string;
  author?: string;
  uploadedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
