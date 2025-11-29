// FILE: app/api/user/dashboard/route.ts
// Complete User Dashboard API - With Profile Data
// ================================================
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

    // 1. Get user profile data with existence check
    const [userRows] = await db.query<RowDataPacket[]>(
      `SELECT 
        user_id, 
        full_name, 
        phone_number, 
        email, 
        created_at, 
        last_login,
        is_active
      FROM users 
      WHERE user_id = ?`,
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userRows[0];

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User account is inactive' },
        { status: 403 }
      );
    }

    // 2. Get total conversations count
    const [chatCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM conversations WHERE user_id = ?',
      [userId]
    );

    // 3. Get total ratings given
    const [ratingCount] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM ratings WHERE user_id = ?',
      [userId]
    );

    // 4. Get total unread messages count
    const [unreadCount] = await db.query<RowDataPacket[]>(
      'SELECT SUM(unread_count_customer) as total FROM conversations WHERE user_id = ?',
      [userId]
    );

    // 5. Get recent conversations with shop details
    const conversationQuery = `
      SELECT 
        c.conversation_id,
        c.shop_id,
        s.shop_name,
        s.category,
        s.address,
        s.phone_number as shop_phone,
        c.last_message,
        c.last_message_time,
        c.unread_count_customer,
        c.updated_at,
        CASE 
          WHEN c.last_message_time IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, c.last_message_time, NOW())
          ELSE NULL 
        END as minutes_ago
      FROM conversations c
      INNER JOIN shops s ON c.shop_id = s.shop_id
      WHERE c.user_id = ? AND s.is_active = TRUE
      ORDER BY c.updated_at DESC
      LIMIT 5
    `;
    
    const [recentConversations] = await db.query<RowDataPacket[]>(
      conversationQuery,
      [userId]
    );

    // 6. Get recent ratings given by the user
    const ratingsQuery = `
      SELECT 
        r.rating_id, 
        r.shop_id,
        r.rating_value, 
        r.review_comment, 
        r.created_at, 
        s.shop_name,
        s.category,
        TIMESTAMPDIFF(DAY, r.created_at, NOW()) as days_ago
      FROM ratings r
      INNER JOIN shops s ON r.shop_id = s.shop_id
      WHERE r.user_id = ? AND s.is_active = TRUE
      ORDER BY r.created_at DESC
      LIMIT 5
    `;
    
    const [recentRatings] = await db.query<RowDataPacket[]>(
      ratingsQuery,
      [userId]
    );

    // 7. Get favorite shops (most interacted with)
    const favoriteShopsQuery = `
      SELECT 
        s.shop_id,
        s.shop_name,
        s.category,
        s.rating,
        COUNT(DISTINCT c.conversation_id) as chat_count,
        COUNT(DISTINCT r.rating_id) as rating_count,
        MAX(c.last_message_time) as last_interaction
      FROM shops s
      LEFT JOIN conversations c ON s.shop_id = c.shop_id AND c.user_id = ?
      LEFT JOIN ratings r ON s.shop_id = r.shop_id AND r.user_id = ?
      WHERE s.is_active = TRUE 
        AND (c.conversation_id IS NOT NULL OR r.rating_id IS NOT NULL)
      GROUP BY s.shop_id, s.shop_name, s.category, s.rating
      ORDER BY (COUNT(DISTINCT c.conversation_id) + COUNT(DISTINCT r.rating_id)) DESC
      LIMIT 3
    `;

    const [favoriteShops] = await db.query<RowDataPacket[]>(
      favoriteShopsQuery,
      [userId, userId]
    );

    // Helper function to format time ago
    const formatTimeAgo = (minutesAgo: number | null): string => {
      if (minutesAgo === null) return 'Never';
      if (minutesAgo < 1) return 'Just now';
      if (minutesAgo < 60) return `${minutesAgo}m ago`;
      if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)}h ago`;
      return `${Math.floor(minutesAgo / 1440)}d ago`;
    };

    const formatDaysAgo = (daysAgo: number): string => {
      if (daysAgo === 0) return 'Today';
      if (daysAgo === 1) return 'Yesterday';
      if (daysAgo < 7) return `${daysAgo} days ago`;
      if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
      return `${Math.floor(daysAgo / 30)} months ago`;
    };

    // Build response
    const dashboardData = {
      // User Profile
      user: {
        id: user.user_id,
        name: user.full_name,
        phoneNumber: user.phone_number,
        email: user.email || '',
        memberSince: user.created_at,
        lastLogin: user.last_login,
        isActive: user.is_active,
      },

      // Stats
      stats: {
        totalChats: chatCount[0]?.total || 0,
        totalRatings: ratingCount[0]?.total || 0,
        unreadMessages: unreadCount[0]?.total || 0,
      },

      // Recent Chats
      recentChats: recentConversations.map(chat => ({
        id: chat.conversation_id,
        shopId: chat.shop_id,
        shopName: chat.shop_name,
        category: chat.category,
        address: chat.address,
        shopPhone: chat.shop_phone,
        lastMessage: chat.last_message || 'No messages yet',
        lastMessageTime: chat.last_message_time,
        timeAgo: formatTimeAgo(chat.minutes_ago),
        unreadCount: chat.unread_count_customer || 0,
        updatedAt: chat.updated_at,
      })),

      // Recent Ratings
      recentRatings: recentRatings.map(rating => ({
        id: rating.rating_id,
        shopId: rating.shop_id,
        shopName: rating.shop_name,
        category: rating.category,
        rating: rating.rating_value,
        comment: rating.review_comment || '',
        createdAt: rating.created_at,
        timeAgo: formatDaysAgo(rating.days_ago),
      })),

      // Favorite/Most Interacted Shops
      favoriteShops: favoriteShops.map(shop => ({
        id: shop.shop_id,
        name: shop.shop_name,
        category: shop.category,
        rating: shop.rating,
        interactions: {
          chats: shop.chat_count || 0,
          ratings: shop.rating_count || 0,
          total: (shop.chat_count || 0) + (shop.rating_count || 0),
        },
        lastInteraction: shop.last_interaction,
      })),
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });

  } catch (error: any) {
    console.error('Get user dashboard error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get dashboard data', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// POST: Update user dashboard preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const [userCheck] = await db.query<RowDataPacket[]>(
      'SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (!userCheck || userCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    // Store preferences as JSON in a preferences column
    // You'll need to add this column to your users table:
    // ALTER TABLE users ADD COLUMN preferences JSON DEFAULT NULL;
    
    if (preferences) {
      await db.query(
        'UPDATE users SET preferences = ? WHERE user_id = ?',
        [JSON.stringify(preferences), userId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard preferences updated successfully',
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

// Optional: DELETE method to clear user dashboard data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action'); // 'clear-chats' or 'clear-ratings'

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const [userCheck] = await db.query<RowDataPacket[]>(
      'SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (!userCheck || userCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'clear-chats':
        // Delete all user conversations and messages
        await db.query(
          'DELETE m FROM messages m INNER JOIN conversations c ON m.conversation_id = c.conversation_id WHERE c.user_id = ?',
          [userId]
        );
        await db.query(
          'DELETE FROM conversations WHERE user_id = ?',
          [userId]
        );
        return NextResponse.json({
          success: true,
          message: 'All chats cleared successfully',
        });

      case 'clear-ratings':
        // Delete all user ratings
        await db.query(
          'DELETE FROM ratings WHERE user_id = ?',
          [userId]
        );
        return NextResponse.json({
          success: true,
          message: 'All ratings cleared successfully',
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Clear dashboard data error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear data', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}