/**
 * Request context extraction for Cloud Run trace correlation
 *
 * Extracts trace context from X-Cloud-Trace-Context header
 * Format: TRACE_ID/SPAN_ID;o=TRACE_TRUE
 */

import { randomUUID } from 'crypto';

export interface RequestContext {
  traceId: string;
  spanId?: string;
  requestId: string;
  traceSampled: boolean;
}

/**
 * Parse the X-Cloud-Trace-Context header
 * Format: TRACE_ID/SPAN_ID;o=TRACE_TRUE
 */
function parseCloudTraceHeader(header: string | null): { traceId?: string; spanId?: string; sampled: boolean } {
  if (!header) {
    return { sampled: false };
  }

  // Format: TRACE_ID/SPAN_ID;o=TRACE_TRUE
  const parts = header.split(';');
  const traceParts = parts[0].split('/');

  const traceId = traceParts[0] || undefined;
  const spanId = traceParts[1] || undefined;

  // o=1 means trace sampling is enabled
  const sampled = parts[1]?.includes('o=1') ?? false;

  return { traceId, spanId, sampled };
}

/**
 * Extract request context from a Request object
 * Generates a request ID if none exists
 */
export function getRequestContext(request: Request): RequestContext {
  const cloudTrace = parseCloudTraceHeader(
    request.headers.get('X-Cloud-Trace-Context') ?? request.headers.get('x-cloud-trace-context')
  );

  // Use existing request ID or generate one
  const requestId = request.headers.get('x-request-id') ?? randomUUID().slice(0, 8);

  // Use Cloud Trace ID or generate a local one
  const traceId = cloudTrace.traceId ?? randomUUID().replace(/-/g, '');

  return {
    traceId,
    spanId: cloudTrace.spanId,
    requestId,
    traceSampled: cloudTrace.sampled,
  };
}

/**
 * Convert RequestContext to log context fields
 */
export function toLogContext(ctx: RequestContext): Record<string, string> {
  return {
    traceId: ctx.traceId,
    requestId: ctx.requestId,
    ...(ctx.spanId && { spanId: ctx.spanId }),
  };
}
