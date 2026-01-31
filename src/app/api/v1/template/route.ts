import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { logger } from '@/lib/logger';

// GET /api/v1/template - Get example LaTeX template
export async function GET() {
  try {
    const templateDir = join(process.cwd(), 'public', 'template');

    const [source, image] = await Promise.all([
      readFile(join(templateDir, 'template.tex'), 'utf-8'),
      readFile(join(templateDir, 'test.png')),
    ]);

    return NextResponse.json({
      source,
      images: {
        'test.png': image.toString('base64'),
      },
    });
  } catch (error) {
    logger.error('Template load failed', {
      operation: 'template_load',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to load template' },
      { status: 500 }
    );
  }
}
