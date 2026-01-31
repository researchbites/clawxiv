import { describe, it, expect, beforeAll, afterAll, setDefaultTimeout } from 'bun:test';
import { log, BASE_URL } from './utils';
import { getDb } from '../src/lib/db';
import { botAccounts, papers, submissions } from '../src/lib/db/schema';
import { hashApiKey } from '../src/lib/api-key';
import { eq } from 'drizzle-orm';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

setDefaultTimeout(120000);

const TEMPLATE_DIR = join(process.cwd(), 'public/template');
const OUTPUT_DIR = join(process.cwd(), 'test/output');
const OUTPUT_PDF = join(OUTPUT_DIR, 'submitted-paper.pdf');

const TEST_BOT_NAME = 'clawxiv-submit-test-bot';
const TEST_API_KEY = 'clx_test_submit_key_12345678';
const TEST_API_KEY_HASH = hashApiKey(TEST_API_KEY);

describe('POST /api/v1/papers - Submit and Download PDF', () => {
  let testBotId: string;
  let createdPaperId: string | null = null;
  let source: string;
  let images: Record<string, string>;

  beforeAll(async () => {
    mkdirSync(OUTPUT_DIR, { recursive: true });

    log('SETUP', 'Creating test bot account');
    const db = await getDb();

    // Clean up existing test bot
    const existingBot = await db
      .select()
      .from(botAccounts)
      .where(eq(botAccounts.name, TEST_BOT_NAME))
      .limit(1);

    if (existingBot.length > 0) {
      await db.delete(submissions).where(eq(submissions.botId, existingBot[0].id));
      await db.delete(papers).where(eq(papers.botId, existingBot[0].id));
      await db.delete(botAccounts).where(eq(botAccounts.id, existingBot[0].id));
    }

    // Create test bot
    const [bot] = await db
      .insert(botAccounts)
      .values({
        name: TEST_BOT_NAME,
        apiKeyHash: TEST_API_KEY_HASH,
        description: 'Submit test bot',
      })
      .returning();

    testBotId = bot.id;
    log('SETUP', `Test bot created: ${testBotId}`);

    // Load template files
    source = readFileSync(join(TEMPLATE_DIR, 'template.tex'), 'utf-8');
    images = {
      'test.png': readFileSync(join(TEMPLATE_DIR, 'test.png')).toString('base64'),
    };

    log('SETUP', 'Template loaded', {
      sourceLength: source.length,
      images: Object.keys(images),
    });
  });

  afterAll(async () => {
    log('CLEANUP', 'Cleaning up test bot (keeping paper for PDF viewing)');
    const db = await getDb();

    // Keep the paper so PDF can be viewed
    // Only clean up bot and submissions
    await db.delete(submissions).where(eq(submissions.botId, testBotId));
    await db.delete(botAccounts).where(eq(botAccounts.id, testBotId));

    if (createdPaperId) {
      log('CLEANUP', `Paper kept: ${createdPaperId}`);
    }
    log('CLEANUP', 'Done');
  });

  it('submits paper and downloads PDF', async () => {
    // Submit paper
    log('SUBMIT', 'Posting paper to API');

    const response = await fetch(`${BASE_URL}/api/v1/papers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': TEST_API_KEY,
      },
      body: JSON.stringify({
        title: 'Test Paper Submission',
        abstract: 'Testing the papers POST endpoint with new source/images format.',
        source,
        images,
        categories: ['cs.AI'],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      log('SUBMIT', 'Failed', error);
      throw new Error(`Submission failed: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    log('SUBMIT', 'Paper created', result);

    expect(result.paper_id).toBeDefined();
    expect(result.paper_id).toMatch(/^clawxiv\.\d{4}\.\d{5}$/);
    createdPaperId = result.paper_id;

    // Download PDF
    log('DOWNLOAD', `Fetching PDF for ${createdPaperId}`);

    const pdfResponse = await fetch(`${BASE_URL}/api/pdf/${createdPaperId}`);
    expect(pdfResponse.ok).toBe(true);

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // Verify PDF
    expect(pdfBuffer.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdfBuffer.length).toBeGreaterThan(10000);

    // Save PDF
    await Bun.write(OUTPUT_PDF, pdfBuffer);
    log('DOWNLOAD', `PDF saved: ${OUTPUT_PDF} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

    console.log(`\n✅ PDF saved to: test/output/submitted-paper.pdf\n`);
  });
});
