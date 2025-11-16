// FILE: app/api/ratings/route.ts
// Submit and get ratings
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, userId, ratingValue, reviewComment } = body;

    if (!shopId || !userId || !ratingValue) {
      return NextResponse.json(
        { error: 'Shop ID, User ID, and rating value are required' },
        { status: 400 }
      );
    }

    if (ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json(
        { error: 'Rating value must be between 1 and 5' },
        { status: 400 }
      );
    }

    const ratingId = uuidv4();
    await db.query(
      `INSERT INTO ratings (rating_id, shop_id, user_id, rating_value, review_comment)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating_value = ?, review_comment = ?, updated_at = CURRENT_TIMESTAMP`,
      [ratingId, shopId, userId, ratingValue, reviewComment, ratingValue, reviewComment]
    );

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
    });
  } catch (error: any) {
    console.error('Submit rating error:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating', details: error.message },
      { status: 500 }
    );
  }
}

// Get ratings for a shop
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

    const [ratings] = await db.query(
      `SELECT r.*, u.full_name as user_name
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.shop_id = ?
       ORDER BY r.created_at DESC`,
      [shopId]
    );

    return NextResponse.json({
      success: true,
      ratings: ratings,
    });
  } catch (error: any) {
    console.error('Get ratings error:', error);
    return NextResponse.json(
      { error: 'Failed to get ratings', details: error.message },
      { status: 500 }
    );
  }
}
