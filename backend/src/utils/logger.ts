/**
 * Structured logger for production. Avoids console.log in production code.
 * Logs as JSON-friendly objects for easier parsing in log aggregators.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  return entry;
}

function write(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    write(formatEntry('info', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    write(formatEntry('warn', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>): void {
    write(formatEntry('error', message, meta));
  },
  child(context: Record<string, unknown>) {
    return {
      info: (msg: string, m?: Record<string, unknown>) =>
        logger.info(msg, { ...context, ...m }),
      warn: (msg: string, m?: Record<string, unknown>) =>
        logger.warn(msg, { ...context, ...m }),
      error: (msg: string, m?: Record<string, unknown>) =>
        logger.error(msg, { ...context, ...m }),
    };
  },
};
