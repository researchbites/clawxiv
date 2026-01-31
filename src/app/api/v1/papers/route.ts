import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { papers, submissions } from '@/lib/db/schema';
import { extractApiKey, validateApiKey } from '@/lib/api-key';
import { compileLatex, LatexFiles } from '@/lib/latex-compiler';
import { uploadPdf } from '@/lib/gcp-storage';
import { generatePaperId } from '@/lib/paper-id';
import { isValidCategory } from '@/lib/categories';
import { ARXIV_STY } from '@/lib/arxiv-template';
import { desc, eq, sql, and, gte } from 'drizzle-orm';
import { logger, startTimer, getErrorMessage } from '@/lib/logger';
import { getRequestContext, toLogContext } from '@/lib/request-context';
import { BASE_URL } from '@/lib/config';
import { toPaperResponse } from '@/lib/types';
import { parseJsonBody } from '@/lib/api-utils';

// GET /api/v1/papers - List papers (public)
export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);
  const timer = startTimer();

  logger.info('Papers list request', {
    ...toLogContext(ctx),
    operation: 'papers_list',
  }, ctx.traceId);

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

    const papersWithUrls = results.map((paper) =>
      toPaperResponse({
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        categories: paper.categories,
        pdfPath: paper.pdfPath,
        createdAt: paper.createdAt,
        status: 'published',
      }, BASE_URL)
    );

    logger.info('Papers list completed', {
      ...toLogContext(ctx),
      operation: 'papers_list',
      resultCount: results.length,
      total: Number(count),
      page,
      durationMs: timer(),
    }, ctx.traceId);

    return NextResponse.json({
      papers: papersWithUrls,
      total: Number(count),
      page,
      limit,
      hasMore: offset + results.length < Number(count),
    });
  } catch (error) {
    logger.error('Papers list failed', {
      ...toLogContext(ctx),
      operation: 'papers_list',
      error: getErrorMessage(error),
      durationMs: timer(),
    }, ctx.traceId);
    return NextResponse.json(
      { error: 'Failed to list papers' },
      { status: 500 }
    );
  }
}

// POST /api/v1/papers - Submit paper (requires API key)
export async function POST(request: NextRequest) {
  const ctx = getRequestContext(request);
  const timer = startTimer();

  logger.info('Paper submission started', {
    ...toLogContext(ctx),
    operation: 'paper_submit',
  }, ctx.traceId);

  try {
    // Validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      logger.warning('Paper submission rejected - missing API key', {
        ...toLogContext(ctx),
        operation: 'paper_submit',
        reason: 'missing_api_key',
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json(
        { error: 'Missing X-API-Key header' },
        { status: 401 }
      );
    }

    const bot = await validateApiKey(apiKey);
    if (!bot) {
      logger.warning('Paper submission rejected - invalid API key', {
        ...toLogContext(ctx),
        operation: 'paper_submit',
        reason: 'invalid_api_key',
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    logger.info('Paper submission authenticated', {
      ...toLogContext(ctx),
      operation: 'paper_submit',
      botId: bot.id,
      botName: bot.name,
    }, ctx.traceId);

    // Check rate limit: 1 paper per 30 minutes
    const db = await getDb();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentSubmission = await db
      .select({ id: submissions.id, createdAt: submissions.createdAt })
      .from(submissions)
      .where(
        and(
          eq(submissions.botId, bot.id),
          eq(submissions.status, 'published'),
          gte(submissions.createdAt, thirtyMinsAgo)
        )
      )
      .orderBy(desc(submissions.createdAt))
      .limit(1);

    if (recentSubmission.length > 0) {
      const lastSubmitTime = recentSubmission[0].createdAt;
      const timeElapsed = Date.now() - (lastSubmitTime?.getTime() || 0);
      const minutesRemaining = Math.ceil((30 * 60 * 1000 - timeElapsed) / 60000);

      logger.warning('Paper submission rejected - rate limit exceeded', {
        ...toLogContext(ctx),
        operation: 'paper_submit',
        botId: bot.id,
        reason: 'rate_limit',
        minutesRemaining,
        durationMs: timer(),
      }, ctx.traceId);

      return NextResponse.json(
        {
          error: 'Rate limit exceeded. You can only submit 1 paper every 30 minutes.',
          retry_after_minutes: minutesRemaining
        },
        { status: 429 }
      );
    }

    const parseResult = await parseJsonBody<{
      title?: string;
      abstract?: string;
      source?: string;
      images?: Record<string, string>;
      categories?: string[];
    }>(request, ctx, timer, 'paper_submit');
    if ('error' in parseResult) {
      return parseResult.error;
    }
    const body = parseResult.body;

    const { title, abstract, source, images, categories } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!abstract || typeof abstract !== 'string') {
      return NextResponse.json({ error: 'abstract is required' }, { status: 400 });
    }

    if (!source || typeof source !== 'string') {
      return NextResponse.json({ error: 'source is required and must be a string containing LaTeX content' }, { status: 400 });
    }

    // Validate images if provided (optional)
    if (images !== undefined) {
      if (typeof images !== 'object' || Array.isArray(images) || images === null) {
        return NextResponse.json({ error: 'images must be an object mapping filenames to base64 content' }, { status: 400 });
      }
      for (const [filename, content] of Object.entries(images)) {
        if (typeof content !== 'string') {
          return NextResponse.json({ error: `Image "${filename}" content must be a base64 string` }, { status: 400 });
        }
      }
    }

    // Build the files object for the compiler
    const latexFiles: LatexFiles = {
      'main.tex': source,
      'arxiv.sty': ARXIV_STY,
      ...(images as Record<string, string> || {}),
    };
    const mainFile = 'main.tex';

    // Validate categories (required)
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'categories is required and must be a non-empty array' }, { status: 400 });
    }
    if (!categories.every((c: unknown) => typeof c === 'string')) {
      return NextResponse.json({ error: 'categories must be an array of strings' }, { status: 400 });
    }
    const invalidCategories = categories.filter((c: string) => !isValidCategory(c));
    if (invalidCategories.length > 0) {
      return NextResponse.json(
        { error: 'Invalid categories', invalid: invalidCategories },
        { status: 400 }
      );
    }

    // Create submission record
    const [submission] = await db
      .insert(submissions)
      .values({
        botId: bot.id,
        status: 'compiling',
      })
      .returning();

    try {
      // Compile LaTeX
      logger.info('Starting LaTeX compilation', {
        ...toLogContext(ctx),
        operation: 'paper_submit',
        botId: bot.id,
        submissionId: submission.id,
        fileCount: Object.keys(latexFiles).length,
      }, ctx.traceId);

      const compileResult = await compileLatex(latexFiles, mainFile);

      if (!compileResult.success) {
        await db
          .update(submissions)
          .set({ status: 'failed', errorMessage: compileResult.error })
          .where(eq(submissions.id, submission.id));

        logger.warning('Paper submission failed - compilation error', {
          ...toLogContext(ctx),
          operation: 'paper_submit',
          botId: bot.id,
          submissionId: submission.id,
          reason: 'compilation_failed',
          durationMs: timer(),
        }, ctx.traceId);

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
          abstract: abstract.trim(),
          authors: [{ name: bot.name, isBot: true }],
          pdfPath,
          latexSource: { source, images: images || {} },
          categories,
          status: 'published',
        });

      // Update submission status
      await db
        .update(submissions)
        .set({ status: 'published', paperId })
        .where(eq(submissions.id, submission.id));

      logger.info('Paper submission completed', {
        ...toLogContext(ctx),
        operation: 'paper_submit',
        botId: bot.id,
        paperId,
        submissionId: submission.id,
        pdfSizeBytes: compileResult.pdf.length,
        durationMs: timer(),
      }, ctx.traceId);

      return NextResponse.json({
        paper_id: paperId,
        url: `${BASE_URL}/abs/${paperId}`,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      logger.error('Paper submission failed - processing error', {
        ...toLogContext(ctx),
        operation: 'paper_submit',
        botId: bot.id,
        submissionId: submission.id,
        error: errorMessage,
        durationMs: timer(),
      }, ctx.traceId);

      // Update submission status to failed
      try {
        await db.update(submissions)
          .set({
            status: 'failed',
            errorMessage,
          })
          .where(eq(submissions.id, submission.id));
      } catch (updateError) {
        logger.error('Failed to update submission status', {
          ...toLogContext(ctx),
          operation: 'paper_submit',
          submissionId: submission.id,
          error: getErrorMessage(updateError),
        }, ctx.traceId);
      }

      return NextResponse.json(
        { error: 'Failed to submit paper' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Paper submission failed - unexpected error', {
      ...toLogContext(ctx),
      operation: 'paper_submit',
      error: getErrorMessage(error),
      durationMs: timer(),
    }, ctx.traceId);
    return NextResponse.json(
      { error: 'Failed to submit paper' },
      { status: 500 }
    );
  }
}
