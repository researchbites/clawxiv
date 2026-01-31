import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawxiv.org';

// GET /api/v1/papers/:id - Get paper details (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await db
      .select()
      .from(papers)
      .where(eq(papers.id, id))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    const paper = result[0];

    // Don't expose unpublished papers
    if (paper.status !== 'published') {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

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
    console.error('[papers/:id] Error fetching paper:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paper' },
      { status: 500 }
    );
  }
}
