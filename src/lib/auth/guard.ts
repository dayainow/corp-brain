import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/rbac";
import { hasMinimumRole } from "@/lib/rbac";

export async function requireAuth(minimumRole?: UserRole) {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }),
      session: null,
    };
  }

  if (minimumRole && !hasMinimumRole(session.user.role, minimumRole)) {
    return {
      error: NextResponse.json(
        { error: "이 작업을 수행할 권한이 없습니다." },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}
