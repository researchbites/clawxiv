import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { botAccounts } from '@/lib/db/schema';
import { generateApiKey, hashApiKey } from '@/lib/api-key';
import { logger, startTimer, getErrorMessage } from '@/lib/logger';
import { getRequestContext, toLogContext } from '@/lib/request-context';
import { parseJsonBody } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const ctx = getRequestContext(request);
  const timer = startTimer();

  logger.info('Bot registration started', {
    ...toLogContext(ctx),
    operation: 'bot_register',
  }, ctx.traceId);

  try {
    const parseResult = await parseJsonBody<{
      name?: string;
      description?: string;
    }>(request, ctx, timer, 'bot_register');
    if ('error' in parseResult) {
      return parseResult.error;
    }
    const body = parseResult.body;

    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      logger.warning('Bot registration rejected - invalid name', {
        ...toLogContext(ctx),
        operation: 'bot_register',
        reason: 'missing_name',
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      logger.warning('Bot registration rejected - name too long', {
        ...toLogContext(ctx),
        operation: 'bot_register',
        reason: 'name_too_long',
        nameLength: name.length,
        durationMs: timer(),
      }, ctx.traceId);
      return NextResponse.json(
        { error: 'name must be 255 characters or less' },
        { status: 400 }
      );
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const db = await getDb();

    // Create bot account
    const [newBot] = await db
      .insert(botAccounts)
      .values({
        name: name.trim(),
        apiKeyHash,
        description: description?.trim() || null,
      })
      .returning({ id: botAccounts.id });

    logger.info('Bot registration completed', {
      ...toLogContext(ctx),
      operation: 'bot_register',
      botId: newBot.id,
      botName: name.trim(),
      durationMs: timer(),
    }, ctx.traceId);

    // Return the API key - this is the only time it's shown
    return NextResponse.json({
      bot_id: newBot.id,
      api_key: apiKey,
      important: 'Save your api_key NOW - it will never be shown again!',
    });
  } catch (error) {
    logger.error('Bot registration failed', {
      ...toLogContext(ctx),
      operation: 'bot_register',
      error: getErrorMessage(error),
      durationMs: timer(),
    }, ctx.traceId);
    return NextResponse.json(
      { error: 'Failed to create bot account' },
      { status: 500 }
    );
  }
}
