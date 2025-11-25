// // FILE: app/api/shops/[id]/route.ts
// // Get shop details by ID
// // ============================================

// import { NextRequest, NextResponse } from 'next/server';
// import { db } from '@/lib/db';
// import { RowDataPacket, ResultSetHeader } from 'mysql2';

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id: shopId } = await params;

//     // Get shop details
//     const [shops] = await db.query<RowDataPacket[]>(
//       'SELECT * FROM v_shop_details WHERE shop_id = ?',
//       [shopId]
//     );

//     if (shops.length === 0) {
//       return NextResponse.json(
//         { error: 'Shop not found' },
//         { status: 404 }
//       );
//     }

//     // Get photos
//     const [photos] = await db.query<RowDataPacket[]>(
//       'SELECT photo_url FROM shop_photos WHERE shop_id = ? ORDER BY photo_order',
//       [shopId]
//     );

//     // Increment view count
//     await db.query<ResultSetHeader>(
//       'UPDATE shops SET total_views = total_views + 1 WHERE shop_id = ?',
//       [shopId]
//     );

//     return NextResponse.json({
//       success: true,
//       shop: {
//         ...shops[0],
//         photos: photos,
//       },
//     });
//   } catch (error: any) {
//     console.error('Get shop error:', error);
//     return NextResponse.json(
//       { error: 'Failed to get shop details', details: error.message },
//       { status: 500 }
//     );
//   }
// }
// app/api/shops/[id]/route.ts - Complete Fixed Version
// Get shop details by ID with categories as array
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
    
    console.log('Getting shop details for:', shopId);

    // Get shop details from view
    const [shops] = await db.query<RowDataPacket[]>(
      'SELECT * FROM v_shop_details WHERE shop_id = ?',
      [shopId]
    );

    if (shops.length === 0) {
      console.log('Shop not found:', shopId);
      return NextResponse.json(
        { success: false, error: 'Shop not found' },
        { status: 404 }
      );
    }

    const shop = shops[0];

    // Get photos
    const [photos] = await db.query<RowDataPacket[]>(
      'SELECT photo_url FROM shop_photos WHERE shop_id = ? ORDER BY photo_order',
      [shopId]
    );

    // Increment view count (async, don't wait)
    db.query<ResultSetHeader>(
      'UPDATE shops SET total_views = total_views + 1 WHERE shop_id = ?',
      [shopId]
    ).catch(err => console.error('Failed to increment view count:', err));

    // Convert categories string to array for consistency with nearby endpoint
    const categoryArray = shop.categories 
      ? shop.categories.split(', ').filter((cat: string) => cat.trim()) 
      : [];

    console.log('Shop details loaded:', {
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      categories: categoryArray,
      photos_count: photos.length
    });

    return NextResponse.json({
      success: true,
      shop: {
        ...shop,
        categories: categoryArray, // Return as array
        photos: photos,
      },
    });
  } catch (error: any) {
    console.error('Get shop error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get shop details', details: error.message },
      { status: 500 }
    );
  }
}