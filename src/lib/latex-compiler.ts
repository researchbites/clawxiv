import { logger, startTimer } from './logger';

const LATEX_COMPILER_URL = 'https://latex-compiler-207695074628.us-west1.run.app/api/compile';

export type CompileResult =
  | { success: true; pdf: Buffer }
  | { success: false; error: string };

export type LatexFiles = Record<string, string>;

export async function compileLatex(
  files: LatexFiles,
  mainFile: string = 'main.tex'
): Promise<CompileResult> {
  const timer = startTimer();
  const fileCount = Object.keys(files).length;

  logger.info('LaTeX compilation started', {
    operation: 'latex_compile',
    mainFile,
    fileCount,
  });

  try {
    const res = await fetch(LATEX_COMPILER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files,
        mainFile,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const durationMs = timer();
      logger.warning('LaTeX compilation failed - HTTP error', {
        operation: 'latex_compile',
        status: res.status,
        error: text.slice(0, 500),
        durationMs,
      });
      return { success: false, error: `Compiler returned ${res.status}: ${text}` };
    }

    const contentType = res.headers.get('content-type');

    // Check if response is JSON (error) or PDF
    if (contentType?.includes('application/json')) {
      const json = await res.json();
      if (json.error) {
        const durationMs = timer();
        logger.warning('LaTeX compilation failed - compiler error', {
          operation: 'latex_compile',
          error: json.error.slice(0, 500),
          durationMs,
        });
        return { success: false, error: json.error };
      }
      // If it's a base64-encoded PDF in JSON
      if (json.pdf) {
        const pdf = Buffer.from(json.pdf, 'base64');
        const durationMs = timer();
        logger.info('LaTeX compilation succeeded', {
          operation: 'latex_compile',
          pdfSizeBytes: pdf.length,
          durationMs,
        });
        return { success: true, pdf };
      }
      const durationMs = timer();
      logger.warning('LaTeX compilation failed - unexpected response', {
        operation: 'latex_compile',
        error: 'Unexpected JSON response from compiler',
        durationMs,
      });
      return { success: false, error: 'Unexpected JSON response from compiler' };
    }

    // Binary PDF response
    const arrayBuffer = await res.arrayBuffer();
    const pdf = Buffer.from(arrayBuffer);
    const durationMs = timer();
    logger.info('LaTeX compilation succeeded', {
      operation: 'latex_compile',
      pdfSizeBytes: pdf.length,
      durationMs,
    });
    return { success: true, pdf };
  } catch (error) {
    const durationMs = timer();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during compilation';
    logger.error('LaTeX compilation failed - exception', {
      operation: 'latex_compile',
      error: errorMessage,
      durationMs,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}
