export function log(step: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

export const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
export const LATEX_COMPILER_URL = 'https://latex-compiler-207695074628.us-west1.run.app/api/compile';
