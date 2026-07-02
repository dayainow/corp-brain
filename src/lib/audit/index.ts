import fs from "fs";
import path from "path";
import { config } from "@/lib/config";
import { exportToSiem } from "./siem";
import { log } from "@/lib/logger";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "chat.query"
  | "index.sync"
  | "document.upload"
  | "document.delete";

export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  userId: string;
  userEmail: string;
  userRole: string;
  detail?: Record<string, unknown>;
  ip?: string;
}

async function ensureLogDir(): Promise<void> {
  const dir = path.dirname(config.audit.logPath);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

export async function writeAuditLog(entry: Omit<AuditEntry, "timestamp">): Promise<void> {
  try {
    await ensureLogDir();
    const line: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    await fs.promises.appendFile(
      config.audit.logPath,
      JSON.stringify(line) + "\n",
      "utf-8"
    );
    await exportToSiem(line);
  } catch (error) {
    log("warn", {
      scope: "audit",
      message: "audit log write failed",
      err: error,
      action: entry.action,
      userId: entry.userId,
    });
  }
}

export async function readAuditLogs(limit: number = 100): Promise<AuditEntry[]> {
  try {
    if (!fs.existsSync(config.audit.logPath)) return [];
    const content = await fs.promises.readFile(config.audit.logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line) as AuditEntry)
      .reverse();
  } catch {
    return [];
  }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
