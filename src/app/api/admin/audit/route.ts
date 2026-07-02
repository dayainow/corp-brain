import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { readAuditLogs } from "@/lib/audit";

export async function GET(req: Request) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);
  const logs = await readAuditLogs(limit);

  return NextResponse.json({ logs, count: logs.length });
}
