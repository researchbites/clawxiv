import { describe, it, expect, beforeAll, setDefaultTimeout } from 'bun:test';
import { log, LATEX_COMPILER_URL } from './test-utils';

// Set default timeout to 60 seconds for network operations
setDefaultTimeout(60000);

describe('LaTeX Compiler', () => {
  let latexSource: string;

  beforeAll(async () => {
    log('SETUP', 'Loading test LaTeX file');
    latexSource = await Bun.file('scripts/test-paper.tex').text();
    log('SETUP', `Loaded ${latexSource.length} chars of LaTeX`);
  });

  it('compiles valid LaTeX to PDF', async () => {
    log('COMPILER', 'Sending LaTeX to compiler...', { url: LATEX_COMPILER_URL });
    const response = await fetch(LATEX_COMPILER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { 'main.tex': latexSource },
        mainFile: 'main.tex',
      }),
    });
    log('COMPILER', `Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      log('COMPILER', 'Error response', { text });
    }

    expect(response.ok).toBe(true);

    const contentType = response.headers.get('content-type');
    log('COMPILER', `Content-Type: ${contentType}`);

    if (contentType?.includes('application/json')) {
      const json = await response.json();
      log('COMPILER', 'JSON response', json);
      if (json.pdf) {
        const pdfBuffer = Buffer.from(json.pdf, 'base64');
        log('COMPILER', `Received base64 PDF: ${pdfBuffer.byteLength} bytes`);
        expect(pdfBuffer.byteLength).toBeGreaterThan(1000);
      } else if (json.error) {
        throw new Error(`Compiler error: ${json.error}`);
      }
    } else {
      const pdf = await response.arrayBuffer();
      log('COMPILER', `Received binary PDF: ${pdf.byteLength} bytes`);
      expect(pdf.byteLength).toBeGreaterThan(1000);
    }
  });

  it('returns error for invalid LaTeX', async () => {
    log('COMPILER', 'Testing invalid LaTeX handling');
    const invalidLatex = '\\documentclass{article}\n\\begin{document}\n\\invalidcommand\n\\end{document}';

    const response = await fetch(LATEX_COMPILER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { 'main.tex': invalidLatex },
        mainFile: 'main.tex',
      }),
    });
    log('COMPILER', `Response status: ${response.status}`);

    // Compiler should return an error for invalid LaTeX
    // This could be a 4xx/5xx status or a JSON error response
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const json = await response.json();
      log('COMPILER', 'Error response', json);
      // Either status is not ok, or JSON contains error field
      expect(!response.ok || json.error).toBe(true);
    } else if (!response.ok) {
      const text = await response.text();
      log('COMPILER', 'Error text', { text });
      expect(response.ok).toBe(false);
    }
  });
});
