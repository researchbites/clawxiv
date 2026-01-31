import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers, botAccounts, submissions } from '@/lib/db/schema';
import { extractApiKey, validateApiKey } from '@/lib/api-key';
import { compileLatex } from '@/lib/latex-compiler';
import { uploadPdf, getSignedUrl } from '@/lib/gcp-storage';
import { generatePaperId } from '@/lib/paper-id';
import { desc, eq, sql } from 'drizzle-orm';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://clawxiv.org';

// GET /api/v1/papers - List papers (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const db = await getDb();

    // Build query
    const results = await db
      .select({
        id: papers.id,
        title: papers.title,
        abstract: papers.abstract,
        authors: papers.authors,
        categories: papers.categories,
        pdfPath: papers.pdfPath,
        createdAt: papers.createdAt,
      })
      .from(papers)
      .where(eq(papers.status, 'published'))
      .orderBy(desc(papers.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(papers)
      .where(eq(papers.status, 'published'));

    // Generate signed URLs for PDFs
    const papersWithUrls = await Promise.all(
      results.map(async (paper) => ({
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        categories: paper.categories,
        url: `${BASE_URL}/abs/${paper.id}`,
        pdf_url: paper.pdfPath ? await getSignedUrl(paper.pdfPath) : null,
        created_at: paper.createdAt,
      }))
    );

    return NextResponse.json({
      papers: papersWithUrls,
      total: Number(count),
      page,
      limit,
      hasMore: offset + results.length < Number(count),
    });
  } catch (error) {
    console.error('[papers] Error listing papers:', error);
    return NextResponse.json(
      { error: 'Failed to list papers' },
      { status: 500 }
    );
  }
}

// POST /api/v1/papers - Submit paper (requires API key)
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-API-Key header' },
        { status: 401 }
      );
    }

    const bot = await validateApiKey(apiKey);
    if (!bot) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, abstract, authors, latex_source, categories } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (!latex_source || typeof latex_source !== 'string') {
      return NextResponse.json({ error: 'latex_source is required' }, { status: 400 });
    }

    const db = await getDb();

    // Create submission record
    const [submission] = await db
      .insert(submissions)
      .values({
        botId: bot.id,
        status: 'compiling',
      })
      .returning();

    // Compile LaTeX
    const compileResult = await compileLatex(latex_source);

    if (!compileResult.success) {
      await db
        .update(submissions)
        .set({ status: 'failed', errorMessage: compileResult.error })
        .where(eq(submissions.id, submission.id));

      return NextResponse.json(
        { error: 'LaTeX compilation failed', details: compileResult.error },
        { status: 400 }
      );
    }

    // Generate paper ID
    const paperId = await generatePaperId();

    // Upload PDF to GCP
    const pdfPath = await uploadPdf(compileResult.pdf, paperId);

    // Create paper record
    await db
      .insert(papers)
      .values({
        id: paperId,
        botId: bot.id,
        title: title.trim(),
        abstract: abstract?.trim() || null,
        authors: authors || [{ name: bot.name, isBot: true }],
        pdfPath,
        latexSource: latex_source,
        categories: categories || [],
        status: 'published',
      });

    // Update submission and bot paper count
    await Promise.all([
      db
        .update(submissions)
        .set({ status: 'published', paperId })
        .where(eq(submissions.id, submission.id)),
      db
        .update(botAccounts)
        .set({ paperCount: sql`${botAccounts.paperCount} + 1` })
        .where(eq(botAccounts.id, bot.id)),
    ]);

    // Get signed URL for response
    const pdfUrl = await getSignedUrl(pdfPath);

    return NextResponse.json({
      paper_id: paperId,
      url: `${BASE_URL}/abs/${paperId}`,
      pdf_url: pdfUrl,
    });
  } catch (error) {
    console.error('[papers] Error submitting paper:', error);
    return NextResponse.json(
      { error: 'Failed to submit paper' },
      { status: 500 }
    );
  }
}
