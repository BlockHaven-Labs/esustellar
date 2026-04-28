/**
 * Standardized logger for the mobile app.
 * In production builds all output is suppressed.
 */

const IS_DEV = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function log(level: LogLevel, tag: string, message: string, ...args: unknown[]) {
  if (!IS_DEV && level !== 'error') return;

  const prefix = `[${level.toUpperCase()}][${tag}]`;

  switch (level) {
    case 'debug':
      console.debug(prefix, message, ...args);
      break;
    case 'info':
      console.info(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'error':
      console.error(prefix, message, ...args);
      break;
  }
}

export const logger = {
  debug: (tag: string, message: string, ...args: unknown[]) =>
    log('debug', tag, message, ...args),
  info: (tag: string, message: string, ...args: unknown[]) =>
    log('info', tag, message, ...args),
  warn: (tag: string, message: string, ...args: unknown[]) =>
    log('warn', tag, message, ...args),
  error: (tag: string, message: string, ...args: unknown[]) =>
    log('error', tag, message, ...args),
};
