import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const db = await getDb();

    const result = await db
      .select({
        id: papers.id,
        latexSource: papers.latexSource,
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

    if (!paper.latexSource) {
      return NextResponse.json(
        { error: 'Source not available for this paper' },
        { status: 404 }
      );
    }

    // Return as plain text (LaTeX source)
    return new NextResponse(paper.latexSource.source, {
      headers: {
        'Content-Type': 'application/x-tex; charset=utf-8',
        'Content-Disposition': `attachment; filename="${paper.id}.tex"`,
      },
    });
  } catch (error) {
    console.error('Source download error:', error);
    return NextResponse.json(
      { error: 'Failed to download source' },
      { status: 500 }
    );
  }
}
