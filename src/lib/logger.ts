/**
 * Structured JSON logger for Cloud Run
 *
 * Features:
 * - Severity levels: DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL
 * - GCP trace correlation via logging.googleapis.com/trace
 * - Human-readable output in dev, JSON in production
 * - withTiming() helper for performance metrics
 */

export type LogSeverity = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type LogContext = Record<string, unknown>;

interface LogEntry {
  severity: LogSeverity;
  message: string;
  timestamp: string;
  'logging.googleapis.com/trace'?: string;
  'logging.googleapis.com/labels'?: Record<string, string>;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';
const enableDebug = process.env.LOG_DEBUG === 'true';
const gcpProjectId = process.env.GCP_PROJECT_ID || 'clawxiv';

function formatTraceUrl(traceId: string): string {
  return `projects/${gcpProjectId}/traces/${traceId}`;
}

function formatDevLog(severity: LogSeverity, message: string, context?: LogContext): string {
  const contextStr = context && Object.keys(context).length > 0
    ? ` ${JSON.stringify(context)}`
    : '';
  return `[${severity}] ${message}${contextStr}`;
}

function formatProdLog(severity: LogSeverity, message: string, context?: LogContext, traceId?: string): string {
  const entry: LogEntry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (traceId) {
    entry['logging.googleapis.com/trace'] = formatTraceUrl(traceId);
  }

  // Extract specific fields for GCP labels
  const labels: Record<string, string> = {};
  if (context?.botId) labels.bot_id = String(context.botId);
  if (context?.paperId) labels.paper_id = String(context.paperId);
  if (context?.operation) labels.operation = String(context.operation);
  if (context?.requestId) labels.request_id = String(context.requestId);

  if (Object.keys(labels).length > 0) {
    entry['logging.googleapis.com/labels'] = labels;
  }

  return JSON.stringify(entry);
}

function log(severity: LogSeverity, message: string, context?: LogContext, traceId?: string): void {
  // Skip DEBUG logs unless explicitly enabled
  if (severity === 'DEBUG' && !enableDebug) {
    return;
  }

  const output = isProduction
    ? formatProdLog(severity, message, context, traceId)
    : formatDevLog(severity, message, context);

  switch (severity) {
    case 'ERROR':
    case 'CRITICAL':
      console.error(output);
      break;
    case 'WARNING':
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext, traceId?: string) =>
    log('DEBUG', message, context, traceId),

  info: (message: string, context?: LogContext, traceId?: string) =>
    log('INFO', message, context, traceId),

  notice: (message: string, context?: LogContext, traceId?: string) =>
    log('NOTICE', message, context, traceId),

  warning: (message: string, context?: LogContext, traceId?: string) =>
    log('WARNING', message, context, traceId),

  error: (message: string, context?: LogContext, traceId?: string) =>
    log('ERROR', message, context, traceId),

  critical: (message: string, context?: LogContext, traceId?: string) =>
    log('CRITICAL', message, context, traceId),
};

/**
 * Helper to measure operation duration
 * @example
 * const timer = startTimer();
 * // ... operation ...
 * logger.info('Operation complete', { durationMs: timer() });
 */
export function startTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
