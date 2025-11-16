// FILE: app/api/chats/route.ts
// Get all conversations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface ConversationRow extends RowDataPacket {
  conversation_id: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const userId = searchParams.get('userId');

    if (!shopId && !userId) {
      return NextResponse.json(
        { error: 'Shop ID or User ID is required' },
        { status: 400 }
      );
    }

    const whereClause = shopId ? 'shop_id = ?' : 'user_id = ?';
    const param = shopId || userId;

    const [conversations] = await db.query<RowDataPacket[]>(
      `SELECT * FROM v_recent_conversations WHERE ${whereClause} ORDER BY updated_at DESC`,
      [param]
    );

    return NextResponse.json({
      success: true,
      conversations: conversations,
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversations', details: error.message },
      { status: 500 }
    );
  }
}

// Create new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, userId } = body;

    if (!shopId || !userId) {
      return NextResponse.json(
        { error: 'Shop ID and User ID are required' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const [existing] = await db.query<ConversationRow[]>(
      'SELECT conversation_id FROM conversations WHERE shop_id = ? AND user_id = ?',
      [shopId, userId]
    );

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        conversation_id: existing[0].conversation_id,
      });
    }

    // Create new conversation
    const conversationId = uuidv4();
    await db.query<ResultSetHeader>(
      'INSERT INTO conversations (conversation_id, shop_id, user_id) VALUES (?, ?, ?)',
      [conversationId, shopId, userId]
    );

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
    });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error.message },
      { status: 500 }
    );
  }
}
