import { describe, it, expect, setDefaultTimeout } from 'bun:test';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ARXIV_STY } from '../src/lib/arxiv-template';
import { compileLatex } from '../src/lib/latex-compiler';

setDefaultTimeout(120000);

const TEMPLATE_DIR = join(process.cwd(), 'public/template');
const OUTPUT_PDF = join(process.cwd(), 'test/output/submitted-paper.pdf');

describe('POST /api/v1/papers', () => {
  it('compiles source + images into PDF', async () => {
    mkdirSync(join(process.cwd(), 'test/output'), { recursive: true });

    // Load what a user would send
    const source = readFileSync(join(TEMPLATE_DIR, 'template.tex'), 'utf-8');
    const images = {
      'test.png': readFileSync(join(TEMPLATE_DIR, 'test.png')).toString('base64'),
    };

    console.log(`Loaded source: ${source.length} chars`);
    console.log(`Loaded images: ${Object.keys(images).join(', ')}`);

    // Build files like our endpoint does internally
    const files = {
      'main.tex': source,
      'arxiv.sty': ARXIV_STY,
      ...images,
    };

    // Compile
    console.log('Compiling...');
    const result = await compileLatex(files, 'main.tex');

    if (!result.success) {
      console.error('Compilation failed:', result.error);
      throw new Error(result.error);
    }

    // Verify and save PDF
    expect(result.pdf.slice(0, 5).toString()).toBe('%PDF-');
    await Bun.write(OUTPUT_PDF, result.pdf);

    console.log(`\n✅ PDF saved: test/output/submitted-paper.pdf (${(result.pdf.length / 1024).toFixed(1)} KB)\n`);
  });
});
