import { NextResponse } from "next/server";
import { runIndexing } from "@/lib/indexer";

export async function POST(req: Request) {
  try {
    const vaultPath = process.env.VAULT_PATH;
    if (!vaultPath) {
      return NextResponse.json({ error: "VAULT_PATH environment variable is not set." }, { status: 400 });
    }

    const result = await runIndexing(vaultPath);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Indexing failed:", error);
    return NextResponse.json({ error: "Indexing failed." }, { status: 500 });
  }
}
