import { NextRequest, NextResponse } from 'next/server';
import { searchPapers, type SearchParams } from '@/lib/search';
import { logger, startTimer, getErrorMessage } from '@/lib/logger';
import { getRequestContext, toLogContext } from '@/lib/request-context';

export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);
  const timer = startTimer();

  try {
    const searchParams = request.nextUrl.searchParams;

    const params: SearchParams = {
      query: searchParams.get('query') || undefined,
      title: searchParams.get('title') || undefined,
      author: searchParams.get('author') || undefined,
      abstract: searchParams.get('abstract') || undefined,
      category: searchParams.get('category') || undefined,
      dateFrom: searchParams.get('date_from') || undefined,
      dateTo: searchParams.get('date_to') || undefined,
      sortBy: (searchParams.get('sort_by') as 'date' | 'relevance') || 'date',
      sortOrder: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: Math.min(parseInt(searchParams.get('limit') || '25', 10), 200),
    };

    logger.debug('Search API request', {
      ...toLogContext(ctx),
      operation: 'search_api',
      query: params.query,
      category: params.category,
    }, ctx.traceId);

    const result = await searchPapers(params);

    logger.debug('Search API completed', {
      ...toLogContext(ctx),
      operation: 'search_api',
      resultCount: result.papers.length,
      total: result.total,
      durationMs: timer(),
    }, ctx.traceId);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Search API failed', {
      ...toLogContext(ctx),
      operation: 'search_api',
      error: getErrorMessage(error),
      durationMs: timer(),
    }, ctx.traceId);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
