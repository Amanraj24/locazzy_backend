import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ShopRow extends RowDataPacket {
  shop_name: string;
  is_visible: number;
  visibility_radius_km: number;
}

interface StatsRow extends RowDataPacket {
  total_chats: number;
  average_rating: number;
  total_ratings: number;
}

interface ViewsRow extends RowDataPacket {
  views_today: number;
}

// Interface for Categories returned by the view
interface CategoryRow extends RowDataPacket {
  category_name: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }

    // 1. Get core shop info (Name, Visibility, Radius)
    const [shopInfoRows] = await db.query<ShopRow[]>(
      `SELECT 
        shop_name, 
        is_visible, 
        visibility_radius_km 
      FROM shops 
      WHERE shop_id = ?`,
      [shopId]
    );

    if (shopInfoRows.length === 0) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }
    const shopInfo = shopInfoRows[0];

    // 2. Get shop categories
    const [categoryRows] = await db.query<CategoryRow[]>(
        `SELECT c.category_name 
        FROM shop_categories sc
        JOIN categories c ON sc.category_id = c.category_id
        WHERE sc.shop_id = ?`,
        [shopId]
    );
    const categories = categoryRows.map(row => row.category_name);


    // 3. Get total stats (from assumed pre-calculated fields or views)
    const [shopStats] = await db.query<StatsRow[]>(
      `SELECT total_chats, average_rating, total_ratings
       FROM shops WHERE shop_id = ?`,
      [shopId]
    );

    // 4. Get today's views
    const [todayViews] = await db.query<ViewsRow[]>(
      `SELECT COALESCE(SUM(view_count), 0) as views_today
       FROM shop_views
       WHERE shop_id = ? AND view_date = CURDATE()`,
      [shopId]
    );

    // 5. Get recent chats
    const [recentChats] = await db.query<RowDataPacket[]>(
      `SELECT * FROM v_recent_conversations 
       WHERE shop_id = ? 
       ORDER BY updated_at DESC 
       LIMIT 5`,
      [shopId]
    );

    // 6. Get recent ratings
    const [recentRatings] = await db.query<RowDataPacket[]>(
      `SELECT r.*, u.full_name as user_name
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.shop_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [shopId]
    );

    // 7. Structure and return the full dashboard data
    return NextResponse.json({
      success: true,
      data: { // Wrapping the data in a 'data' object to match client expectation
        shopInfo: {
          shopName: shopInfo.shop_name,
          isVisible: Boolean(shopInfo.is_visible),
          visibilityRadius: shopInfo.visibility_radius_km || 5,
          categories: categories,
        },
        stats: {
          totalChats: shopStats[0]?.total_chats || 0,
          activeChats: 0, // Placeholder - requires specific query for active chats
          unreadMessages: 0, // Placeholder - requires specific query for unread counts
          totalRatings: shopStats[0]?.total_ratings || 0,
          averageRating: shopStats[0]?.average_rating || 0,
          todayViews: todayViews[0]?.views_today || 0,
          weekViews: 0, // Placeholder - requires query
          monthViews: 0, // Placeholder - requires query
        },
        recentActivity: recentChats.map(chat => ({ 
          id: chat.chat_id, 
          type: 'chat', 
          message: chat.latest_message_text, 
          time: chat.updated_at, 
          userName: chat.customer_name 
        })),
        topRatings: recentRatings.map(rating => ({
          id: rating.rating_id,
          userName: rating.user_name,
          rating: rating.rating_value,
          comment: rating.review_comment,
          date: rating.created_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard data', details: error.message },
      { status: 500 }
    );
  }
}