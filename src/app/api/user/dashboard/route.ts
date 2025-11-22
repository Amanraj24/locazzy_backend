// FILE: app/api/user/dashboard/route.ts
// Customer Dashboard/Activity Overview
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
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 1. Get recent conversations for the user
    const [recentConversations] = await db.query<RowDataPacket[]>(
      `SELECT 
        c.conversation_id,
        c.shop_id,
        s.shop_name,
        c.last_message,
        c.last_message_time,
        c.unread_count_customer
      FROM conversations c
      JOIN shops s ON c.shop_id = s.shop_id
      WHERE c.user_id = ? 
      ORDER BY c.updated_at DESC
      LIMIT 5`,
      [userId]
    );

    // 2. Get recent ratings given by the user
    const [recentRatings] = await db.query<RowDataPacket[]>(
      `SELECT r.rating_id, r.rating_value, r.review_comment, r.created_at, s.shop_name
       FROM ratings r
       JOIN shops s ON r.shop_id = s.shop_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [userId]
    );

    // 3. Get total counts (chats, ratings)
    const [counts] = await db.query<RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM conversations WHERE user_id = ?) AS total_chats,
        (SELECT COUNT(*) FROM ratings WHERE user_id = ?) AS total_ratings`,
      [userId, userId]
    );

    const stats = counts[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        totalChats: stats.total_chats || 0,
        totalRatings: stats.total_ratings || 0,
        recentChats: recentConversations.map(chat => ({ 
          id: chat.conversation_id, 
          shopName: chat.shop_name,
          lastMessage: chat.last_message, 
          time: chat.last_message_time,
          unreadCount: chat.unread_count_customer,
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
      { error: 'Failed to get customer dashboard data', details: error.message },
      { status: 500 }
    );
  }
}