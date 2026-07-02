import type { UserRole } from "@/lib/rbac";
import { findUserByEmail } from "./users";

/** SLACK_USER_MAP='{"U001":"lee.minho@novapay.kr"}' */
export function parseSlackUserMap(raw?: string): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([k, v]) => k && v.includes("@"))
    );
  } catch {
    return {};
  }
}

export function resolveSlackUserRole(
  slackUserId: string,
  slackUserName?: string,
  map: Record<string, string> = parseSlackUserMap(process.env.SLACK_USER_MAP)
): { role: UserRole; email: string } {
  const mappedEmail = map[slackUserId];
  if (mappedEmail) {
    const user = findUserByEmail(mappedEmail);
    if (user) {
      return { role: user.role, email: user.email };
    }
  }

  if (slackUserName) {
    const guessEmail = `${slackUserName}@novapay.kr`;
    const user = findUserByEmail(guessEmail);
    if (user) {
      return { role: user.role, email: user.email };
    }
  }

  return { role: "general", email: `${slackUserName ?? slackUserId}@slack` };
}
