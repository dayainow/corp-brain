import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ManifestEntry {
  relativePath: string;
  fileName: string;
  mtimeMs: number;
  contentHash: string;
}

export type IndexManifest = Record<string, ManifestEntry>;

const MANIFEST_PATH = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "data/index-manifest.json"
);

export async function loadManifest(): Promise<IndexManifest> {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) return {};
    const raw = await fs.promises.readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(raw) as IndexManifest;
  } catch {
    return {};
  }
}

export async function saveManifest(manifest: IndexManifest): Promise<void> {
  const dir = path.dirname(MANIFEST_PATH);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  await fs.promises.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.promises.readFile(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function getManifestPath(): string {
  return MANIFEST_PATH;
}

export function isManifestEntryCurrent(
  entry: ManifestEntry | undefined,
  mtimeMs: number,
  contentHash: string
): boolean {
  return !!entry && entry.mtimeMs === mtimeMs && entry.contentHash === contentHash;
}
