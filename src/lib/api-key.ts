import { createHash, randomBytes } from 'crypto';
import { getDb } from './db';
import { botAccounts, type BotAccount } from './db/schema';
import { eq } from 'drizzle-orm';

const API_KEY_PREFIX = 'clx_';

/**
 * Generate a new API key with the format: clx_<32 random hex chars>
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(16).toString('hex'); // 32 chars
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Hash an API key for storage using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate an API key and return the bot account if valid
 */
export async function validateApiKey(apiKey: string): Promise<BotAccount | null> {
  if (!apiKey || !apiKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const hash = hashApiKey(apiKey);
  const db = await getDb();

  const result = await db
    .select()
    .from(botAccounts)
    .where(eq(botAccounts.apiKeyHash, hash))
    .limit(1);

  return result[0] || null;
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: Request): string | null {
  return request.headers.get('X-API-Key') ?? request.headers.get('x-api-key');
}
