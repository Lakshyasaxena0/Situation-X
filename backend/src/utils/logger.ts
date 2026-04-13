// backend/src/utils/logger.ts
type LogLevel = "info" | "warn" | "error" | "debug";
type LogMeta = Record<string, unknown>;
// -----------------------------
// FORMATTER
// -----------------------------
function formatLog(
  level: LogLevel,
  message: string,
  meta?: LogMeta
): string {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta && { meta }),
  };
  return JSON.stringify(logEntry);
}
// -----------------------------
// LOGGER METHODS
// -----------------------------
function info(message: string, meta?: LogMeta): void {
  console.log(formatLog("info", message, meta));
}
function warn(message: string, meta?: LogMeta): void {
  console.warn(formatLog("warn", message, meta));
}
function error(message: string, meta?: LogMeta): void {
  console.error(formatLog("error", message, meta));
}
function debug(message: string, meta?: LogMeta): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(formatLog("debug", message, meta));
  }
}
// -----------------------------
// EXPORT LOGGER
// -----------------------------
export const logger = {
  info,
  warn,
  error,
  debug,
};
