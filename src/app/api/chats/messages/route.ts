// FILE: app/api/chats/messages/route.ts
// Get and send messages
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const [messages] = await db.query(
      `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return NextResponse.json({
      success: true,
      messages: messages,
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages', details: error.message },
      { status: 500 }
    );
  }
}

// Send message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, senderType, senderId, messageText } = body;

    if (!conversationId || !senderType || !senderId || !messageText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const messageId = uuidv4();
    await db.query(
      `INSERT INTO messages (message_id, conversation_id, sender_type, sender_id, message_text)
       VALUES (?, ?, ?, ?, ?)`,
      [messageId, conversationId, senderType, senderId, messageText]
    );

    return NextResponse.json({
      success: true,
      message_id: messageId,
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}

// Mark messages as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, readerType } = body;

    if (!conversationId || !readerType) {
      return NextResponse.json(
        { error: 'Conversation ID and reader type are required' },
        { status: 400 }
      );
    }

    await db.query(
      'CALL sp_mark_messages_read(?, ?)',
      [conversationId, readerType]
    );

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read', details: error.message },
      { status: 500 }
    );
  }
}
