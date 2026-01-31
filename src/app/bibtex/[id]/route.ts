import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateBibTeX } from '@/components/CitationBlock';
import type { Author } from '@/lib/types';
import { logger } from '@/lib/logger';
import { getRequestContext, toLogContext } from '@/lib/request-context';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const ctx = getRequestContext(request);

  try {
    const { id } = await context.params;
    const db = await getDb();

    const result = await db
      .select({
        id: papers.id,
        title: papers.title,
        abstract: papers.abstract,
        authors: papers.authors,
        categories: papers.categories,
        createdAt: papers.createdAt,
        status: papers.status,
      })
      .from(papers)
      .where(eq(papers.id, id))
      .limit(1);

    if (result.length === 0 || result[0].status !== 'published') {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    const paper = result[0];
    const authors = paper.authors as Author[] | null;

    const bibtex = generateBibTeX(
      paper.id,
      paper.title,
      authors,
      paper.abstract,
      paper.createdAt
    );

    // Return as plain text with BibTeX content type
    return new NextResponse(bibtex, {
      headers: {
        'Content-Type': 'application/x-bibtex; charset=utf-8',
        'Content-Disposition': `attachment; filename="${paper.id}.bib"`,
      },
    });
  } catch (error) {
    logger.error('BibTeX generation failed', {
      ...toLogContext(ctx),
      operation: 'bibtex_generate',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, ctx.traceId);
    return NextResponse.json(
      { error: 'Failed to generate BibTeX' },
      { status: 500 }
    );
  }
}
