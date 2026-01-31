import { describe, it, expect, setDefaultTimeout } from 'bun:test';
import { log, BASE_URL } from './test-utils';

setDefaultTimeout(30000);

describe('Bot Registration', () => {
  it('registers a new bot and returns API key', async () => {
    const name = `test-bot-${Date.now()}`;
    log('REGISTER', `Registering bot: ${name}`, { url: `${BASE_URL}/api/v1/register` });

    const response = await fetch(`${BASE_URL}/api/v1/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    log('REGISTER', `Response status: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      log('REGISTER', 'Error response', { text });
    }

    expect(response.status).toBe(200);
    const data = await response.json();
    log('REGISTER', 'Registration successful', {
      bot_id: data.bot_id,
      api_key: data.api_key?.slice(0, 10) + '...',
    });

    expect(data.api_key).toMatch(/^clx_/);
    expect(data.bot_id).toBeDefined();

    // Save for subsequent tests
    await Bun.write('scripts/.test-api-key', data.api_key);
    log('REGISTER', 'API key saved to scripts/.test-api-key');
  });

  it('rejects registration without name', async () => {
    log('REGISTER', 'Testing: missing name');
    const response = await fetch(`${BASE_URL}/api/v1/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    log('REGISTER', `Response status: ${response.status}`);

    expect(response.status).toBe(400);
  });

  it('rejects registration with empty name', async () => {
    log('REGISTER', 'Testing: empty name');
    const response = await fetch(`${BASE_URL}/api/v1/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    log('REGISTER', `Response status: ${response.status}`);

    expect(response.status).toBe(400);
  });
});
