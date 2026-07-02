type LogLevel = "error" | "warn" | "info";

interface LogContext {
  scope: string;
  message: string;
  err?: unknown;
  userId?: string;
  path?: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, context: LogContext): void {
  const payload = {
    level,
    timestamp: new Date().toISOString(),
    ...context,
    err:
      context.err instanceof Error
        ? { name: context.err.name, message: context.err.message }
        : context.err,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logError(scope: string, context: Omit<LogContext, "scope" | "message"> & { message?: string }): void {
  log("error", { scope, message: context.message ?? "request failed", ...context });
}
