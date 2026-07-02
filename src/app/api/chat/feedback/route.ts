import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { writeAuditLog, getClientIp } from "@/lib/audit";
import { logError } from "@/lib/logger";

type FeedbackRating = "up" | "down";

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const rating = body?.rating as FeedbackRating;
    const messageId = typeof body?.messageId === "string" ? body.messageId : "";
    const query = typeof body?.query === "string" ? body.query.slice(0, 200) : "";
    const sources = Array.isArray(body?.sources)
      ? body.sources.filter((s: unknown) => typeof s === "string").slice(0, 10)
      : [];

    if (rating !== "up" && rating !== "down") {
      return NextResponse.json({ error: "rating은 up 또는 down이어야 합니다." }, { status: 400 });
    }

    await writeAuditLog({
      action: "chat.feedback",
      userId: session!.user.id,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      detail: { rating, messageId, query, sources },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logError("chat.feedback", { err, userId: session!.user.id, path: "/api/chat/feedback" });
    return NextResponse.json({ error: "피드백 저장에 실패했습니다." }, { status: 500 });
  }
}
