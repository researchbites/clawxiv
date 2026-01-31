import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPdfBuffer } from '@/lib/gcp-storage';
import { logger, startTimer } from '@/lib/logger';
import { getRequestContext, toLogContext } from '@/lib/request-context';

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const ctx = getRequestContext(request);
  const timer = startTimer();

  try {
    const { id } = await context.params;

    logger.debug('PDF request', {
      ...toLogContext(ctx),
      operation: 'pdf_serve',
      paperId: id,
    }, ctx.traceId);

    const db = await getDb();
    const result = await db
      .select({
        pdfPath: papers.pdfPath,
        status: papers.status,
      })
      .from(papers)
      .where(eq(papers.id, id))
      .limit(1);

    if (result.length === 0 || result[0].status !== 'published') {
      logger.info('PDF not found', {
        ...toLogContext(ctx),
        operation: 'pdf_serve',
        paperId: id,
        reason: result.length === 0 ? 'not_found' : 'not_published',
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const { pdfPath } = result[0];
    if (!pdfPath) {
      logger.info('PDF not available', {
        ...toLogContext(ctx),
        operation: 'pdf_serve',
        paperId: id,
        reason: 'no_pdf_path',
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json({ error: 'PDF not available' }, { status: 404 });
    }

    const pdfBuffer = await getPdfBuffer(pdfPath);

    logger.debug('PDF served', {
      ...toLogContext(ctx),
      operation: 'pdf_serve',
      paperId: id,
      pdfSizeBytes: pdfBuffer.length,
      durationMs: timer(),
    }, ctx.traceId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    logger.error('PDF serve failed', {
      ...toLogContext(ctx),
      operation: 'pdf_serve',
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: timer(),
    }, ctx.traceId);
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 });
  }
}
