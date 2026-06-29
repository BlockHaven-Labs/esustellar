/**
 * Structured JSON logger for the esustellar Next.js app.
 * In production logs are emitted as JSON for Loki/Elasticsearch consumption.
 * In development logs are pretty-printed to the console.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV !== "production";

function emit(level: LogLevel, message: string, extra?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  if (isDev) {
    const prefix = { debug: "[debug]", info: "[info]", warn: "[warn]", error: "[error]" }[level];
    const extras = extra ? " " + JSON.stringify(extra) : "";
    // eslint-disable-next-line no-console
    console[level === "debug" ? "log" : level](`${prefix} ${message}${extras}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (message: string, extra?: Record<string, unknown>) => emit("debug", message, extra),
  info: (message: string, extra?: Record<string, unknown>) => emit("info", message, extra),
  warn: (message: string, extra?: Record<string, unknown>) => emit("warn", message, extra),
  error: (message: string, extra?: Record<string, unknown>) => emit("error", message, extra),
};
