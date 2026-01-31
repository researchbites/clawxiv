import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { RequestContext, toLogContext } from '@/lib/request-context';

/**
 * Parse JSON body from request with error handling
 * Returns either the parsed body or an error response
 */
export async function parseJsonBody<T>(
  request: NextRequest,
  ctx: RequestContext,
  timer: () => number,
  operation: string
): Promise<{ body: T } | { error: NextResponse }> {
  try {
    return { body: await request.json() };
  } catch {
    logger.warning(`${operation} rejected - invalid JSON`, {
      ...toLogContext(ctx),
      operation,
      reason: 'invalid_json',
      durationMs: timer(),
    }, ctx.traceId);
    return {
      error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    };
  }
}
