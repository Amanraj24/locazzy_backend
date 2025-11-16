// FILE: app/api/shops/[id]/route.ts
// Get shop details by ID
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shopId } = await params;

    // Get shop details
    const [shops] = await db.query<RowDataPacket[]>(
      'SELECT * FROM v_shop_details WHERE shop_id = ?',
      [shopId]
    );

    if (shops.length === 0) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Get photos
    const [photos] = await db.query<RowDataPacket[]>(
      'SELECT photo_url FROM shop_photos WHERE shop_id = ? ORDER BY photo_order',
      [shopId]
    );

    // Increment view count
    await db.query<ResultSetHeader>(
      'UPDATE shops SET total_views = total_views + 1 WHERE shop_id = ?',
      [shopId]
    );

    return NextResponse.json({
      success: true,
      shop: {
        ...shops[0],
        photos: photos,
      },
    });
  } catch (error: any) {
    console.error('Get shop error:', error);
    return NextResponse.json(
      { error: 'Failed to get shop details', details: error.message },
      { status: 500 }
    );
  }
}
