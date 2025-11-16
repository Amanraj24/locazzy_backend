// FILE: app/api/shops/nearby/route.ts
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

    // Call stored procedure
    const [results] = await db.query<ShopRow[][]>(
      'CALL sp_get_nearby_shops(?, ?, ?, ?)',
      [latitude, longitude, radius, category]
    );

    const shops = results[0] || [];

    // Get photos for each shop
    const shopsWithPhotos = await Promise.all(
      shops.map(async (shop) => {
        const [photos] = await db.query<PhotoRow[]>(
          'SELECT photo_url FROM shop_photos WHERE shop_id = ? ORDER BY photo_order LIMIT 1',
          [shop.shop_id]
        );
        return {
          ...shop,
          image: photos.length > 0 
            ? photos[0].photo_url 
            : 'https://via.placeholder.com/300x200',
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
