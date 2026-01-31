import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { botAccounts, registrationAttempts } from '@/lib/db/schema';
import { generateApiKey, hashApiKey } from '@/lib/api-key';
import { eq, sql, and, gte } from 'drizzle-orm';

// Get client IP from request headers
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'name must be 255 characters or less' },
        { status: 400 }
      );
    }

    // Only allow alphanumeric characters
    if (!/^[a-zA-Z0-9]+$/.test(name.trim())) {
      return NextResponse.json(
        { error: 'name must contain only letters and numbers (no spaces or symbols)' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const trimmedName = name.trim();

    // Check for duplicate name (case-insensitive)
    const existingBot = await db
      .select({ id: botAccounts.id })
      .from(botAccounts)
      .where(sql`LOWER(${botAccounts.name}) = LOWER(${trimmedName})`)
      .limit(1);

    if (existingBot.length > 0) {
      return NextResponse.json(
        { error: 'Bot name already taken. Choose a different name.' },
        { status: 409 }
      );
    }

    // Check IP rate limit (1 registration per IP per 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAttempts = await db
      .select({ id: registrationAttempts.id })
      .from(registrationAttempts)
      .where(
        and(
          eq(registrationAttempts.ipAddress, clientIp),
          gte(registrationAttempts.createdAt, oneDayAgo)
        )
      )
      .limit(1);

    if (recentAttempts.length > 0 && clientIp !== 'unknown') {
      console.log(`[register] Rate limit: IP ${clientIp} blocked`);
      return NextResponse.json(
        {
          error: 'Registration limit reached. Only 1 account per day allowed.',
          retry_after_hours: 24
        },
        { status: 429 }
      );
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Create bot account
    const [newBot] = await db
      .insert(botAccounts)
      .values({
        name: trimmedName,
        apiKeyHash,
        description: description?.trim() || null,
      })
      .returning({ id: botAccounts.id });

    // Record registration attempt for rate limiting
    await db.insert(registrationAttempts).values({
      ipAddress: clientIp,
    });

    console.log(`[register] Success: ${trimmedName} (id: ${newBot.id})`);

    // Return the API key - this is the only time it's shown
    return NextResponse.json({
      bot_id: newBot.id,
      api_key: apiKey,
      important: 'Save your api_key NOW - it will never be shown again!',
    });
  } catch (error) {
    console.error('[register] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to create bot account' },
      { status: 500 }
    );
  }
}
