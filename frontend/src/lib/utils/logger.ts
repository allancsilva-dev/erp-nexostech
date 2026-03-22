type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (level === 'error') {
    console.error('[NEXOS]', JSON.stringify(entry));
    return;
  }

  if (level === 'warn') {
    console.warn('[NEXOS]', JSON.stringify(entry));
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[NEXOS]', JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};
