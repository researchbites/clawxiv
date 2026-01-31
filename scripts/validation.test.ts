import { describe, it, expect, beforeAll, setDefaultTimeout } from 'bun:test';
import { log, BASE_URL } from './test-utils';

setDefaultTimeout(30000);

describe('API Validation', () => {
  let apiKey: string;

  beforeAll(async () => {
    try {
      apiKey = await Bun.file('scripts/.test-api-key').text();
      log('SETUP', `API key loaded: ${apiKey.slice(0, 10)}...`);
    } catch {
      throw new Error(
        'API key not found. Run register.test.ts first: bun test scripts/register.test.ts'
      );
    }
  });

  it('rejects request without API key (401)', async () => {
    log('VALIDATION', 'Testing: missing API key');
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test',
        latex_source: '\\documentclass{article}\\begin{document}Test\\end{document}',
      }),
    });
    log('VALIDATION', `Status: ${response.status}`);
    expect(response.status).toBe(401);
  });

  it('rejects invalid API key (401)', async () => {
    log('VALIDATION', 'Testing: invalid API key');
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'clx_invalid_key_12345',
      },
      body: JSON.stringify({
        title: 'Test',
        latex_source: '\\documentclass{article}\\begin{document}Test\\end{document}',
      }),
    });
    log('VALIDATION', `Status: ${response.status}`);
    expect(response.status).toBe(401);
  });

  it('rejects missing title (400)', async () => {
    log('VALIDATION', 'Testing: missing title');
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        latex_source: '\\documentclass{article}\\begin{document}Test\\end{document}',
      }),
    });
    log('VALIDATION', `Status: ${response.status}`);
    const data = await response.json();
    log('VALIDATION', 'Error response', data);
    expect(response.status).toBe(400);
  });

  it('rejects missing latex_source (400)', async () => {
    log('VALIDATION', 'Testing: missing latex_source');
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        title: 'Test Paper',
      }),
    });
    log('VALIDATION', `Status: ${response.status}`);
    const data = await response.json();
    log('VALIDATION', 'Error response', data);
    expect(response.status).toBe(400);
  });

  it('rejects invalid categories (400)', async () => {
    log('VALIDATION', 'Testing: invalid categories');
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        title: 'Test',
        latex_source: '\\documentclass{article}\\begin{document}Test\\end{document}',
        categories: ['invalid.XX', 'fake.YY'],
      }),
    });
    log('VALIDATION', `Status: ${response.status}`);
    const data = await response.json();
    log('VALIDATION', 'Error response', data);
    expect(response.status).toBe(400);
    expect(data.error).toContain('categor');
  });

  it('accepts empty categories array (uses default)', async () => {
    log('VALIDATION', 'Testing: empty categories array (should succeed)');
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        title: 'Test Paper Empty Categories',
        latex_source: '\\documentclass{article}\\begin{document}Test\\end{document}',
        categories: [],
      }),
    });
    log('VALIDATION', `Status: ${response.status}`);
    const data = await response.json();
    log('VALIDATION', 'Response', data);
    // Empty categories array is allowed - defaults to []
    expect(response.status).toBe(200);
    expect(data.paper_id).toBeDefined();
  });

  it('rejects non-existent paper ID (404)', async () => {
    log('VALIDATION', 'Testing: non-existent paper');
    const response = await fetch(`${BASE_URL}/api/v1/papers/clawxiv.9999.99999`);
    log('VALIDATION', `Status: ${response.status}`);
    expect(response.status).toBe(404);
  });
});
