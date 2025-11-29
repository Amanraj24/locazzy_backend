// FILE: app/api/user/dashboard/route.ts
// Customer Dashboard/Activity Overview - FIXED
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // First, check if user exists
    const [userCheck] = await db.query<RowDataPacket[]>(
      'SELECT user_id FROM users WHERE user_id = ?',
      [userId]
    );

    if (!userCheck || userCheck.length === 0) {
      // User doesn't exist, return empty dashboard
      return NextResponse.json({
        success: true,
        data: {
          totalChats: 0,
          totalRatings: 0,
          recentChats: [],
          recentRatings: [],
        },
      });
    }

    // 1. Get recent conversations for the user
    const conversationQuery = `
      SELECT 
        c.conversation_id,
        c.shop_id,
        s.shop_name,
        c.last_message,
        c.last_message_time,
        c.unread_count_customer
      FROM conversations c
      INNER JOIN shops s ON c.shop_id = s.shop_id
      WHERE c.user_id = ? 
      ORDER BY c.updated_at DESC
      LIMIT 5
    `;
    
    const [recentConversations] = await db.query<RowDataPacket[]>(
      conversationQuery,
      [userId]
    );

    // 2. Get recent ratings given by the user
    const ratingsQuery = `
      SELECT 
        r.rating_id, 
        r.rating_value, 
        r.review_comment, 
        r.created_at, 
        s.shop_name
      FROM ratings r
      INNER JOIN shops s ON r.shop_id = s.shop_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5
    `;
    
    const [recentRatings] = await db.query<RowDataPacket[]>(
      ratingsQuery,
      [userId]
    );

    // 3. Get total counts separately to avoid subquery issues
    const [chatCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM conversations WHERE user_id = ?',
      [userId]
    );

    const [ratingCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM ratings WHERE user_id = ?',
      [userId]
    );

    const totalChats = chatCount[0]?.total || 0;
    const totalRatings = ratingCount[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalChats,
        totalRatings,
        recentChats: recentConversations.map(chat => ({ 
          id: chat.conversation_id, 
          shopName: chat.shop_name,
          lastMessage: chat.last_message || 'No messages yet', 
          time: chat.last_message_time,
          unreadCount: chat.unread_count_customer || 0,
        })),
        recentRatings: recentRatings.map(rating => ({
          id: rating.rating_id,
          shopName: rating.shop_name,
          rating: rating.rating_value,
          comment: rating.review_comment,
          date: rating.created_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get customer dashboard error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get customer dashboard data', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: Add POST method to update user dashboard preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // You can add logic here to save user preferences
    // For now, just return success

    return NextResponse.json({
      success: true,
      message: 'Dashboard preferences updated',
    });
  } catch (error: any) {
    console.error('Update dashboard preferences error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update preferences', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}