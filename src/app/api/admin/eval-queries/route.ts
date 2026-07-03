import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { addEvalQuery } from "@/lib/search/eval-store";
import type { EvalQuery } from "@/lib/search/metrics";

export async function POST(req: Request) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  try {
    const body = await req.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const role =
      typeof body?.role === "string" && ["general", "manager", "admin"].includes(body.role)
        ? body.role
        : "general";
    const expectedFiles = Array.isArray(body?.expectedFiles)
      ? body.expectedFiles.filter((f: unknown) => typeof f === "string" && f.trim())
      : typeof body?.expectedFiles === "string"
        ? body.expectedFiles.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    if (!query) {
      return NextResponse.json({ error: "query가 필요합니다." }, { status: 400 });
    }

    const entry: EvalQuery = { query, expectedFiles, role };
    const result = await addEvalQuery(entry);

    if (!result.added) {
      return NextResponse.json(
        { error: result.reason ?? "추가하지 못했습니다.", queries: result.queries },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      added: entry,
      total: result.queries.length,
      hint: "npm run eval:search 로 Hit@3를 재측정하세요.",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
