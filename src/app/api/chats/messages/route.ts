// // FILE: app/api/chats/messages/route.ts
// // Get and send messages
// // ============================================
// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { v4 as uuidv4 } from 'uuid';
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const conversationId = searchParams.get('conversationId');

//     if (!conversationId) {
//       return NextResponse.json(
//         { error: 'Conversation ID is required' },
//         { status: 400 }
//       );
//     }

//     const [messages] = await db.query(
//       `SELECT * FROM messages 
//        WHERE conversation_id = ? 
//        ORDER BY created_at ASC`,
//       [conversationId]
//     );

//     return NextResponse.json({
//       success: true,
//       messages: messages,
//     });
//   } catch (error: any) {
//     console.error('Get messages error:', error);
//     return NextResponse.json(
//       { error: 'Failed to get messages', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// // Send message
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { conversationId, senderType, senderId, messageText } = body;

//     if (!conversationId || !senderType || !senderId || !messageText) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     const messageId = uuidv4();
//     await db.query(
//       `INSERT INTO messages (message_id, conversation_id, sender_type, sender_id, message_text)
//        VALUES (?, ?, ?, ?, ?)`,
//       [messageId, conversationId, senderType, senderId, messageText]
//     );

//     return NextResponse.json({
//       success: true,
//       message_id: messageId,
//     });
//   } catch (error: any) {
//     console.error('Send message error:', error);
//     return NextResponse.json(
//       { error: 'Failed to send message', details: error.message },
//       { status: 500 }
//     );
//   }
// }

// // Mark messages as read
// export async function PUT(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { conversationId, readerType } = body;

//     if (!conversationId || !readerType) {
//       return NextResponse.json(
//         { error: 'Conversation ID and reader type are required' },
//         { status: 400 }
//       );
//     }

//     await db.query(
//       'CALL sp_mark_messages_read(?, ?)',
//       [conversationId, readerType]
//     );

//     return NextResponse.json({
//       success: true,
//       message: 'Messages marked as read',
//     });
//   } catch (error: any) {
//     console.error('Mark read error:', error);
//     return NextResponse.json(
//       { error: 'Failed to mark messages as read', details: error.message },
//       { status: 500 }
//     );
//   }
// }
// FILE: app/api/chats/messages/route.ts
// Get and send messages with document support
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

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

// Send message (text or document)
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Handle file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const conversationId = formData.get('conversationId') as string;
      const senderType = formData.get('senderType') as string;
      const senderId = formData.get('senderId') as string;
      const file = formData.get('file') as File;

      if (!conversationId || !senderType || !senderId || !file) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size exceeds 10MB limit' },
          { status: 400 }
        );
      }

      // Create upload directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat-files');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const fileExtension = path.extname(file.name);
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);
      const fileUrl = `/uploads/chat-files/${fileName}`;

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Save message to database
      const messageId = uuidv4();
      await db.query(
        `INSERT INTO messages (
          message_id, 
          conversation_id, 
          sender_type, 
          sender_id, 
          message_type,
          file_url,
          file_name,
          file_type,
          file_size
        ) VALUES (?, ?, ?, ?, 'document', ?, ?, ?, ?)`,
        [
          messageId, 
          conversationId, 
          senderType, 
          senderId, 
          fileUrl,
          file.name,
          file.type,
          file.size
        ]
      );

      return NextResponse.json({
        success: true,
        message_id: messageId,
        file_url: fileUrl,
        file_name: file.name,
      });
    } 
    // Handle text message
    else {
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
        `INSERT INTO messages (
          message_id, 
          conversation_id, 
          sender_type, 
          sender_id, 
          message_type,
          message_text
        ) VALUES (?, ?, ?, ?, 'text', ?)`,
        [messageId, conversationId, senderType, senderId, messageText]
      );

      return NextResponse.json({
        success: true,
        message_id: messageId,
      });
    }
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
