// FILE: app/api/shops/nearby/route.ts (Existing & Complete for Customer Search)
// Search nearby shops
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

interface ShopRow extends RowDataPacket {
  shop_id: string;
  shop_name: string;
  description: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
  is_online: boolean;
  average_rating: number;
  total_ratings: number;
  distance_km: number;
  categories: string;
}

interface PhotoRow extends RowDataPacket {
  photo_url: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');
    const radius = parseInt(searchParams.get('radius') || '10');
    const category = searchParams.get('category') || 'All';

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Call stored procedure to get shops filtered by location, radius, and category
    // Note: The stored procedure sp_get_nearby_shops handles visibility checks (is_visible=TRUE, is_online=TRUE)
    const [results] = await db.query<ShopRow[][]>(
      'CALL sp_get_nearby_shops(?, ?, ?, ?)',
      [latitude, longitude, radius, category]
    );

    const shops = results[0] || [];

    // Get the primary photo for each shop for the listing view
    const shopsWithPhotos = await Promise.all(
      shops.map(async (shop) => {
        const [photos] = await db.query<PhotoRow[]>(
          'SELECT photo_url FROM shop_photos WHERE shop_id = ? ORDER BY photo_order LIMIT 1',
          [shop.shop_id]
        );
        return {
          ...shop,
          categories: shop.categories ? shop.categories.split(', ') : [], // Format categories as an array
          image: photos.length > 0 
            ? photos[0].photo_url 
            : 'https://via.placeholder.com/300x200', // Default placeholder
        };
      })
    );

    return NextResponse.json({
      success: true,
      shops: shopsWithPhotos,
      count: shopsWithPhotos.length,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search shops', details: error.message },
      { status: 500 }
    );
  }
}