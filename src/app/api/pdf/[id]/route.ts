import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPdfBuffer } from '@/lib/gcp-storage';

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;

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
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
    }

    const { pdfPath } = result[0];
    if (!pdfPath) {
      return NextResponse.json({ error: 'PDF not available' }, { status: 404 });
    }

    const pdfBuffer = await getPdfBuffer(pdfPath);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('[api/pdf] Error serving PDF:', error);
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 });
  }
}
