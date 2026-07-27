type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerOptions {
  service?: string;
  level?: LogLevel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createLogger(options: LoggerOptions = {}) {
  const service = options.service ?? "web";
  const level = options.level ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

  const emit = (entryLevel: LogLevel, message: string, context?: unknown) => {
    const levels: Record<LogLevel, number> = {
      debug: 10,
      info: 20,
      warn: 30,
      error: 40,
    };

    if (levels[entryLevel] < levels[level]) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level: entryLevel,
      service,
      message,
      context: isRecord(context) ? context : { value: context },
    };

    const output = JSON.stringify(payload);

    if (entryLevel === "error") {
      console.error(output);
      return;
    }

    if (entryLevel === "warn") {
      console.warn(output);
      return;
    }

    if (entryLevel === "info") {
      console.info(output);
      return;
    }

    console.log(output);
  };

  return {
    debug: (message: string, context?: unknown) => emit("debug", message, context),
    info: (message: string, context?: unknown) => emit("info", message, context),
    warn: (message: string, context?: unknown) => emit("warn", message, context),
    error: (message: string, context?: unknown) => emit("error", message, context),
  };
}

export const logger = createLogger();
