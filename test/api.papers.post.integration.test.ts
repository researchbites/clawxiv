import { describe, it, expect, beforeAll, afterAll, setDefaultTimeout } from 'bun:test';
import { log, BASE_URL } from './utils';
import { getDb } from '../src/lib/db';
import { botAccounts, papers, submissions } from '../src/lib/db/schema';
import { hashApiKey } from '../src/lib/api-key';
import { eq, and } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

setDefaultTimeout(120000);

const TEMPLATE_DIR = join(process.cwd(), 'public/template');

// Test bot credentials
const TEST_BOT_NAME = 'clawxiv-integration-test-bot';
const TEST_API_KEY = 'clx_test_integration_key_12345678';
const TEST_API_KEY_HASH = hashApiKey(TEST_API_KEY);

describe('POST /api/v1/papers - Integration Test', () => {
  let testBotId: string;
  let createdPaperId: string | null = null;
  let source: string;
  let images: Record<string, string>;

  beforeAll(async () => {
    log('SETUP', 'Creating test bot account in database');

    const db = await getDb();

    // Check if test bot already exists and delete it
    const existingBot = await db
      .select()
      .from(botAccounts)
      .where(eq(botAccounts.name, TEST_BOT_NAME))
      .limit(1);

    if (existingBot.length > 0) {
      log('SETUP', 'Cleaning up existing test bot');
      await db.delete(submissions).where(eq(submissions.botId, existingBot[0].id));
      await db.delete(papers).where(eq(papers.botId, existingBot[0].id));
      await db.delete(botAccounts).where(eq(botAccounts.id, existingBot[0].id));
    }

    // Create test bot account
    const [bot] = await db
      .insert(botAccounts)
      .values({
        name: TEST_BOT_NAME,
        apiKeyHash: TEST_API_KEY_HASH,
        description: 'Integration test bot - safe to delete',
      })
      .returning();

    testBotId = bot.id;
    log('SETUP', `Test bot created: ${TEST_BOT_NAME}`, { botId: testBotId });

    // Load template files from public/template/
    log('SETUP', 'Loading template files from public/template/');
    source = readFileSync(join(TEMPLATE_DIR, 'template.tex'), 'utf-8');
    const testPng = readFileSync(join(TEMPLATE_DIR, 'test.png')).toString('base64');

    images = {
      'test.png': testPng,
    };

    log('SETUP', 'Template files loaded', {
      'source (template.tex)': `${source.length} chars`,
      'test.png': `${testPng.length} chars (base64)`,
    });
  });

  afterAll(async () => {
    log('CLEANUP', 'Cleaning up test data');
    const db = await getDb();

    // Delete created paper if exists
    if (createdPaperId) {
      await db.delete(papers).where(eq(papers.id, createdPaperId));
      log('CLEANUP', `Deleted paper: ${createdPaperId}`);
    }

    // Delete submissions for test bot
    await db.delete(submissions).where(eq(submissions.botId, testBotId));
    log('CLEANUP', 'Deleted submissions for test bot');

    // Delete test bot account
    await db.delete(botAccounts).where(eq(botAccounts.id, testBotId));
    log('CLEANUP', `Deleted test bot: ${TEST_BOT_NAME}`);
  });

  it('should reject request without API key', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Paper',
        source: '\\documentclass{article}\\begin{document}Hello\\end{document}',
        categories: ['cs.AI'],
      }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Missing X-API-Key header');
    log('TEST', 'Correctly rejected missing API key');
  });

  it('should reject request with invalid API key', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'clx_invalidkey1234567890123456',
      },
      body: JSON.stringify({
        title: 'Test Paper',
        source: '\\documentclass{article}\\begin{document}Hello\\end{document}',
        categories: ['cs.AI'],
      }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Invalid API key');
    log('TEST', 'Correctly rejected invalid API key');
  });

  it('should reject request with missing required fields', async () => {
    // Missing title
    let response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        source: '\\documentclass{article}\\begin{document}Hello\\end{document}',
        categories: ['cs.AI'],
      }),
    });
    expect(response.status).toBe(400);
    let json = await response.json();
    expect(json.error).toBe('title is required');
    log('TEST', 'Correctly rejected missing title');

    // Missing source
    response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        title: 'Test Paper',
        categories: ['cs.AI'],
      }),
    });
    expect(response.status).toBe(400);
    json = await response.json();
    expect(json.error).toBe('source is required and must be a string containing LaTeX content');
    log('TEST', 'Correctly rejected missing source');

    // Missing categories
    response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        title: 'Test Paper',
        source: '\\documentclass{article}\\begin{document}Hello\\end{document}',
      }),
    });
    expect(response.status).toBe(400);
    json = await response.json();
    expect(json.error).toBe('categories is required and must be a non-empty array');
    log('TEST', 'Correctly rejected missing categories');
  });

  it('should submit paper with template source and store metadata correctly', async () => {
    const testTitle = 'Integration Test: Autonomous Research Paper Submission';
    const testAbstract = 'This paper tests the end-to-end submission flow for clawxiv, verifying that papers are compiled, uploaded, and stored correctly.';
    const testCategories = ['cs.AI', 'cs.LG'];

    log('SUBMIT', 'Submitting paper with template source', {
      title: testTitle,
      categories: testCategories,
      sourceLength: source.length,
      imageCount: Object.keys(images).length,
    });

    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        title: testTitle,
        abstract: testAbstract,
        source,
        images,
        categories: testCategories,
      }),
    });

    log('SUBMIT', `Response status: ${response.status}`);

    if (!response.ok) {
      const errorJson = await response.json();
      log('SUBMIT', 'Submission failed', errorJson);
      throw new Error(`Submission failed: ${JSON.stringify(errorJson)}`);
    }

    const json = await response.json();
    log('SUBMIT', 'Paper submitted successfully', json);

    // Verify response format
    expect(json.paper_id).toBeDefined();
    expect(json.paper_id).toMatch(/^clawxiv\.\d{4}\.\d{5}$/);
    expect(json.url).toContain(`/abs/${json.paper_id}`);

    createdPaperId = json.paper_id;

    // Verify paper in database
    log('VERIFY', 'Checking database for paper');
    const db = await getDb();

    const [paper] = await db
      .select()
      .from(papers)
      .where(eq(papers.id, createdPaperId))
      .limit(1);

    expect(paper).toBeDefined();
    expect(paper.title).toBe(testTitle);
    expect(paper.abstract).toBe(testAbstract);
    expect(paper.botId).toBe(testBotId);
    expect(paper.status).toBe('published');
    expect(paper.categories).toEqual(testCategories);
    expect(paper.authors).toEqual([{ name: TEST_BOT_NAME, isBot: true }]);

    // Verify PDF was uploaded (pdfPath is set)
    expect(paper.pdfPath).toBeDefined();
    expect(paper.pdfPath).toBe(`${createdPaperId}.pdf`);

    // Verify LaTeX source was stored in new format
    expect(paper.latexSource).toBeDefined();
    const latexSource = paper.latexSource as { source: string; images: Record<string, string> };
    expect(latexSource.source).toBe(source);
    expect(latexSource.images).toHaveProperty('test.png');

    log('VERIFY', 'Paper metadata verified in database', {
      id: paper.id,
      title: paper.title,
      status: paper.status,
      pdfPath: paper.pdfPath,
    });

    // Verify submission record
    const [submission] = await db
      .select()
      .from(submissions)
      .where(and(
        eq(submissions.botId, testBotId),
        eq(submissions.paperId, createdPaperId)
      ))
      .limit(1);

    expect(submission).toBeDefined();
    expect(submission.status).toBe('published');

    log('VERIFY', 'Submission record verified', { status: submission.status });

    // Verify bot paper count incremented
    const [updatedBot] = await db
      .select()
      .from(botAccounts)
      .where(eq(botAccounts.id, testBotId))
      .limit(1);

    expect(updatedBot.paperCount).toBeGreaterThanOrEqual(1);
    log('VERIFY', 'Bot paper count updated', { paperCount: updatedBot.paperCount });

    console.log(`\n✅ Paper submitted and verified: ${createdPaperId}\n`);
  });

  it('should retrieve submitted paper via GET endpoint', async () => {
    if (!createdPaperId) {
      throw new Error('No paper was created in previous test');
    }

    const response = await fetch(`${BASE_URL}/api/v1/papers/${createdPaperId}`);
    expect(response.status).toBe(200);

    const paper = await response.json();
    expect(paper.id).toBe(createdPaperId);
    expect(paper.title).toContain('Integration Test');

    log('GET', 'Paper retrieved via API', { id: paper.id, title: paper.title });
  });
});
