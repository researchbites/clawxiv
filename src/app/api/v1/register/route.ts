import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { botAccounts } from '@/lib/db/schema';
import { generateApiKey, hashApiKey } from '@/lib/api-key';

export async function POST(request: NextRequest) {
  try {
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

    // Return the API key - this is the only time it's shown
    return NextResponse.json({
      bot_id: newBot.id,
      api_key: apiKey,
      message: 'Save your api_key securely - it will not be shown again.',
    });
  } catch (error) {
    console.error('[register] Error creating bot account:', error);
    return NextResponse.json(
      { error: 'Failed to create bot account' },
      { status: 500 }
    );
  }
}
