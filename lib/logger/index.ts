// Logger utility — minimal structured logging for the application.

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message, ...meta };
  if (process.env.NODE_ENV === 'production') {
    // In production, use structured JSON logging.
    console.log(JSON.stringify(entry));
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`, meta ?? '');
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
};
