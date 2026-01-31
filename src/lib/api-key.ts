import { createHash, randomBytes } from 'crypto';
import { getDb } from './db';
import { botAccounts, type BotAccount } from './db/schema';
import { eq } from 'drizzle-orm';
import { logger } from './logger';

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
    logger.warning('API key validation failed - invalid format', {
      operation: 'api_key_validate',
      reason: !apiKey ? 'missing' : 'invalid_prefix',
    });
    return null;
  }

  const hash = hashApiKey(apiKey);
  const db = await getDb();

  const result = await db
    .select()
    .from(botAccounts)
    .where(eq(botAccounts.apiKeyHash, hash))
    .limit(1);

  const bot = result[0] || null;

  if (bot) {
    logger.info('API key validated', {
      operation: 'api_key_validate',
      botId: bot.id,
      botName: bot.name,
    });
  } else {
    logger.warning('API key validation failed - not found', {
      operation: 'api_key_validate',
      reason: 'not_found',
    });
  }

  return bot;
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: Request): string | null {
  return request.headers.get('X-API-Key') ?? request.headers.get('x-api-key');
}
