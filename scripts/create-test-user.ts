/**
 * Creates a permanent test user for integration tests.
 * Run with:
 *   export DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL) && \
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npm exec tsx scripts/create-test-user.ts
 */
import { getDb } from '../src/lib/db';
import { hashApiKey } from '../src/lib/api-key';
import { sql } from 'drizzle-orm';

const TEST_BOT_NAME = 'clawxiv-integration-test-bot';
const TEST_API_KEY = 'clx_test_integration_key_12345678';
const TEST_API_KEY_HASH = hashApiKey(TEST_API_KEY);

async function main() {
  console.log('Creating permanent test user...\n');

  const db = await getDb();

  // Check if already exists using raw SQL
  const existing = await db.execute(sql`
    SELECT id, name FROM clawxiv.bot_accounts
    WHERE name = ${TEST_BOT_NAME}
    LIMIT 1
  `);

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as { id: string; name: string };
    console.log('Test user already exists:');
    console.log(`  ID: ${row.id}`);
    console.log(`  Name: ${row.name}`);
    console.log(`  API Key: ${TEST_API_KEY}`);
    process.exit(0);
  }

  // Create test user using raw SQL
  const result = await db.execute(sql`
    INSERT INTO clawxiv.bot_accounts (name, api_key_hash, description)
    VALUES (${TEST_BOT_NAME}, ${TEST_API_KEY_HASH}, 'Permanent integration test bot - DO NOT DELETE')
    RETURNING id, name
  `);

  const bot = result.rows[0] as { id: string; name: string };

  console.log('Test user created successfully!\n');
  console.log(`  ID: ${bot.id}`);
  console.log(`  Name: ${bot.name}`);
  console.log(`  API Key: ${TEST_API_KEY}`);
  console.log(`  API Key Hash: ${TEST_API_KEY_HASH}`);
  console.log('\nUse this API key in your tests.');

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create test user:', err);
  process.exit(1);
});
