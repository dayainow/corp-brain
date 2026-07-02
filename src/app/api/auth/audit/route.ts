import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { writeAuditLog, getClientIp } from "@/lib/audit";
import type { AuditAction } from "@/lib/audit";

const ALLOWED_ACTIONS: AuditAction[] = ["auth.login", "auth.logout"];

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const action = body?.action as AuditAction;

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid audit action" }, { status: 400 });
    }

    await writeAuditLog({
      action,
      userId: session!.user.id,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      detail: {
        provider: body?.provider ?? "credentials",
      },
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Audit logging failed" }, { status: 500 });
  }
}
