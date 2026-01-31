const LATEX_COMPILER_URL = 'https://latex-compiler-207695074628.us-west1.run.app/api/compile';

export type CompileResult =
  | { success: true; pdf: Buffer }
  | { success: false; error: string };

export async function compileLatex(source: string): Promise<CompileResult> {
  try {
    const res = await fetch(LATEX_COMPILER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: { 'main.tex': source },
        mainFile: 'main.tex',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Compiler returned ${res.status}: ${text}` };
    }

    const contentType = res.headers.get('content-type');

    // Check if response is JSON (error) or PDF
    if (contentType?.includes('application/json')) {
      const json = await res.json();
      if (json.error) {
        return { success: false, error: json.error };
      }
      // If it's a base64-encoded PDF in JSON
      if (json.pdf) {
        return { success: true, pdf: Buffer.from(json.pdf, 'base64') };
      }
      return { success: false, error: 'Unexpected JSON response from compiler' };
    }

    // Binary PDF response
    const arrayBuffer = await res.arrayBuffer();
    return { success: true, pdf: Buffer.from(arrayBuffer) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during compilation'
    };
  }
}
