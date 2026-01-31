import { describe, it, expect, beforeAll, setDefaultTimeout } from 'bun:test';
import { log, LATEX_COMPILER_URL } from './utils';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

setDefaultTimeout(120000);

const TEMPLATE_DIR = join(process.cwd(), 'public/template');
const OUTPUT_PDF = join(process.cwd(), 'test/output/compiled-template.pdf');

describe('POST /api/v1/papers - Multi-file submission', () => {
  let files: Record<string, string>;

  beforeAll(() => {
    mkdirSync(join(process.cwd(), 'test/output'), { recursive: true });

    log('SETUP', 'Loading template files from public/template/');

    // Text files: plain strings
    const templateTex = readFileSync(join(TEMPLATE_DIR, 'template.tex'), 'utf-8');
    const arxivSty = readFileSync(join(TEMPLATE_DIR, 'arxiv.sty'), 'utf-8');
    const referencesBib = readFileSync(join(TEMPLATE_DIR, 'references.bib'), 'utf-8');

    // Binary files: base64 encoded
    const testPng = readFileSync(join(TEMPLATE_DIR, 'test.png')).toString('base64');

    files = {
      'template.tex': templateTex,
      'arxiv.sty': arxivSty,
      'references.bib': referencesBib,
      'test.png': testPng,
    };

    log('SETUP', 'Files loaded', {
      'template.tex': `${templateTex.length} chars`,
      'arxiv.sty': `${arxivSty.length} chars`,
      'references.bib': `${referencesBib.length} chars`,
      'test.png': `${testPng.length} chars (base64)`,
    });
  });

  it('compiles multi-file arXiv template and saves PDF', async () => {
    log('COMPILE', 'Sending to compiler', { url: LATEX_COMPILER_URL });

    const response = await fetch(LATEX_COMPILER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files,
        mainFile: 'template.tex',
      }),
    });

    log('COMPILE', `Status: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      log('COMPILE', 'Failed', { error: error.slice(0, 1000) });
      throw new Error(`Compilation failed: ${error.slice(0, 500)}`);
    }

    const contentType = response.headers.get('content-type');
    let pdfBuffer: Buffer;

    if (contentType?.includes('application/json')) {
      const json = await response.json();
      if (json.error) throw new Error(json.error);
      pdfBuffer = Buffer.from(json.pdf, 'base64');
    } else {
      pdfBuffer = Buffer.from(await response.arrayBuffer());
    }

    // Verify it's a valid PDF
    expect(pdfBuffer.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdfBuffer.length).toBeGreaterThan(10000);

    // Save the PDF
    await Bun.write(OUTPUT_PDF, pdfBuffer);
    log('COMPILE', `PDF saved: ${OUTPUT_PDF} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

    console.log(`\n✅ PDF saved to: test/output/compiled-template.pdf\n`);
  });
});
