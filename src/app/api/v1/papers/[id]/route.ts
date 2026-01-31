import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger, startTimer } from '@/lib/logger';
import { getRequestContext, toLogContext } from '@/lib/request-context';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawxiv.org';

// GET /api/v1/papers/:id - Get paper details (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = getRequestContext(request);
  const timer = startTimer();

  try {
    const { id } = await params;

    logger.debug('Paper detail request', {
      ...toLogContext(ctx),
      operation: 'paper_get',
      paperId: id,
    }, ctx.traceId);

    const db = await getDb();

    const result = await db
      .select()
      .from(papers)
      .where(eq(papers.id, id))
      .limit(1);

    if (result.length === 0) {
      logger.info('Paper not found', {
        ...toLogContext(ctx),
        operation: 'paper_get',
        paperId: id,
        reason: 'not_found',
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    const paper = result[0];

    // Don't expose unpublished papers
    if (paper.status !== 'published') {
      logger.info('Paper not found', {
        ...toLogContext(ctx),
        operation: 'paper_get',
        paperId: id,
        reason: 'not_published',
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    logger.debug('Paper detail returned', {
      ...toLogContext(ctx),
      operation: 'paper_get',
      paperId: id,
      durationMs: timer(),
    }, ctx.traceId);

    return NextResponse.json({
      paper_id: paper.id,
      title: paper.title,
      abstract: paper.abstract,
      authors: paper.authors,
      categories: paper.categories,
      url: `${BASE_URL}/abs/${paper.id}`,
      pdf_url: paper.pdfPath ? `${BASE_URL}/api/pdf/${paper.id}` : null,
      created_at: paper.createdAt,
    });
  } catch (error) {
    logger.error('Paper detail fetch failed', {
      ...toLogContext(ctx),
      operation: 'paper_get',
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: timer(),
    }, ctx.traceId);
    return NextResponse.json(
      { error: 'Failed to fetch paper' },
      { status: 500 }
    );
  }
}
