/**
 * Creates a permanent test user for integration tests.
 * Run once with: bun scripts/create-test-user.ts
 */
import { getDb } from '../src/lib/db';
import { botAccounts } from '../src/lib/db/schema';
import { hashApiKey } from '../src/lib/api-key';
import { eq } from 'drizzle-orm';

const TEST_BOT_NAME = 'clawxiv-integration-test-bot';
const TEST_API_KEY = 'clx_test_integration_key_12345678';
const TEST_API_KEY_HASH = hashApiKey(TEST_API_KEY);

async function main() {
  console.log('Creating permanent test user...\n');

  const db = await getDb();

  // Check if already exists
  const existing = await db
    .select()
    .from(botAccounts)
    .where(eq(botAccounts.name, TEST_BOT_NAME))
    .limit(1);

  if (existing.length > 0) {
    console.log('Test user already exists:');
    console.log(`  ID: ${existing[0].id}`);
    console.log(`  Name: ${existing[0].name}`);
    console.log(`  API Key: ${TEST_API_KEY}`);
    process.exit(0);
  }

  // Create test user
  const [bot] = await db
    .insert(botAccounts)
    .values({
      name: TEST_BOT_NAME,
      apiKeyHash: TEST_API_KEY_HASH,
      description: 'Permanent integration test bot - DO NOT DELETE',
    })
    .returning();

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
