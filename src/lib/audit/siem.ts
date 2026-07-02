import type { AuditEntry } from "./index";
import { config } from "@/lib/config";

/** 감사 로그를 SIEM Webhook(Datadog/Splunk 호환)으로 전송 */
export async function exportToSiem(entry: AuditEntry): Promise<void> {
  const webhookUrl = process.env.AUDIT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "corpbrain",
        service: "corp-brain",
        ...entry,
      }),
    });
  } catch (error) {
    console.error("SIEM export failed:", error);
  }
}

/** 문서 만료 여부 확인 */
export function isDocumentExpired(metadata: Record<string, unknown>): boolean {
  const expires = metadata.expires as string | undefined;
  if (!expires) return false;
  const expiry = new Date(expires);
  if (isNaN(expiry.getTime())) return false;
  return expiry < new Date();
}
