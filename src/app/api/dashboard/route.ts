// FILE: app/api/dashboard/route.ts
// Get dashboard statistics for shop owner
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface StatsRow extends RowDataPacket {
  total_views: number;
  total_chats: number;
  average_rating: number;
  total_ratings: number;
  visibility_radius_km: number;
}

interface ViewsRow extends RowDataPacket {
  views_today: number;
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

    // Get shop stats
    const [shopStats] = await db.query<StatsRow[]>(
      `SELECT total_views, total_chats, average_rating, total_ratings, visibility_radius_km
       FROM shops WHERE shop_id = ?`,
      [shopId]
    );

    // Get recent chats
    const [recentChats] = await db.query<RowDataPacket[]>(
      `SELECT * FROM v_recent_conversations 
       WHERE shop_id = ? 
       ORDER BY updated_at DESC 
       LIMIT 5`,
      [shopId]
    );

    // Get recent ratings
    const [recentRatings] = await db.query<RowDataPacket[]>(
      `SELECT r.*, u.full_name as user_name
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.shop_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [shopId]
    );

    // Get today's views
    const [todayViews] = await db.query<ViewsRow[]>(
      `SELECT COALESCE(SUM(view_count), 0) as views_today
       FROM shop_views
       WHERE shop_id = ? AND view_date = CURDATE()`,
      [shopId]
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalChats: shopStats[0]?.total_chats || 0,
        averageRating: shopStats[0]?.average_rating || 0,
        viewsToday: todayViews[0]?.views_today || 0,
        visibilityRadius: shopStats[0]?.visibility_radius_km || 5,
      },
      recentChats: recentChats,
      recentRatings: recentRatings,
    });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard data', details: error.message },
      { status: 500 }
    );
  }
}