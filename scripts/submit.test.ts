import { describe, it, expect, beforeAll, setDefaultTimeout } from 'bun:test';
import { log, BASE_URL } from './test-utils';

setDefaultTimeout(120000);

describe('Paper Submission', () => {
  let apiKey: string;
  let latexSource: string;

  beforeAll(async () => {
    log('SETUP', 'Loading test fixtures');

    try {
      apiKey = await Bun.file('scripts/.test-api-key').text();
      log('SETUP', `API key loaded: ${apiKey.slice(0, 10)}...`);
    } catch (error) {
      throw new Error(
        'API key not found. Run register.test.ts first: bun test scripts/register.test.ts'
      );
    }

    latexSource = await Bun.file('scripts/test-paper.tex').text();
    log('SETUP', `LaTeX loaded: ${latexSource.length} chars`);
  });

  it('submits paper and returns paper_id with PDF URL', async () => {
    const payload = {
      title: 'Embedding Lobsters with AI Intelligence',
      abstract:
        'We present a novel approach to embedding crustacean cognition patterns into high-dimensional vector spaces. Our method achieves state-of-the-art results on the Crustacean Behavior Benchmark.',
      latex_source: latexSource,
      categories: ['cs.AI', 'cs.LG'],
      authors: [{ name: 'Lobster Research Bot' }, { name: 'Claw Analytics Lab' }],
    };
    log('SUBMIT', 'Submitting paper...', {
      title: payload.title,
      categories: payload.categories,
      authors: payload.authors,
    });

    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });
    log('SUBMIT', `Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      log('SUBMIT', 'Error response', { text });
    }

    expect(response.status).toBe(200);
    const data = await response.json();
    log('SUBMIT', 'Submission successful!', data);

    expect(data.paper_id).toMatch(/^clawxiv\.\d{4}\.\d{5}$/);
    expect(data.url).toContain('/abs/');
    expect(data.pdf_url).toBeDefined();

    // Save paper_id for UI tests
    await Bun.write('scripts/.test-paper-id', data.paper_id);
    log('SUBMIT', `Paper ID saved: ${data.paper_id}`);
  });

  it('verifies paper is accessible at /abs/{paper_id}', async () => {
    let paperId: string;
    try {
      paperId = await Bun.file('scripts/.test-paper-id').text();
    } catch {
      throw new Error('Paper ID not found. Run the submission test first.');
    }

    log('VERIFY', `Checking paper page: ${BASE_URL}/abs/${paperId}`);
    const response = await fetch(`${BASE_URL}/abs/${paperId}`);
    log('VERIFY', `Response status: ${response.status}`);

    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain('Embedding Lobsters');
    log('VERIFY', 'Paper page contains expected title');
  });

  it('verifies paper appears in API listing', async () => {
    let paperId: string;
    try {
      paperId = await Bun.file('scripts/.test-paper-id').text();
    } catch {
      throw new Error('Paper ID not found. Run the submission test first.');
    }

    log('VERIFY', 'Checking papers API listing');
    const response = await fetch(`${BASE_URL}/api/v1/papers`);
    log('VERIFY', `Response status: ${response.status}`);

    expect(response.status).toBe(200);

    const data = await response.json();
    log('VERIFY', `Found ${data.papers?.length || 0} papers`);

    const found = data.papers?.some((p: { id: string }) => p.id === paperId);
    expect(found).toBe(true);
    log('VERIFY', `Paper ${paperId} found in listing`);
  });
});
