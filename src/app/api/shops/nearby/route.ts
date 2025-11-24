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
  is_visible: boolean; // Added is_visible for clarity
  is_online: boolean;  // Added is_online for clarity
  average_rating: number;
  total_ratings: number;
  distance_km?: number; // Optional if loading all shops
  categories: string;
}

interface PhotoRow extends RowDataPacket {
  photo_url: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Read parameters as strings first to check for existence
    const latParam = searchParams.get('latitude');
    const lonParam = searchParams.get('longitude');
    const radius = parseInt(searchParams.get('radius') || '10');
    const category = searchParams.get('category') || 'All';
    
    // Determine if we should perform a localized search
    const isLocationBasedSearch = latParam !== null && lonParam !== null;
    
    let shops: ShopRow[] = [];

    if (isLocationBasedSearch) {
      const latitude = parseFloat(latParam!);
      const longitude = parseFloat(lonParam!);
      
      // Basic validation for numbers
      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid latitude or longitude provided' },
          { status: 400 }
        );
      }
      
      // Call stored procedure for localized search
      // Note: The stored procedure sp_get_nearby_shops handles visibility checks 
      const [results] = await db.query<ShopRow[][]>(
        'CALL sp_get_nearby_shops(?, ?, ?, ?)',
        [latitude, longitude, radius, category]
      );
      
      shops = results[0] || [];

    } else {
      // --- BROWSE ALL SHOPS MODE (Location parameters are missing or null) ---
      
      let query = `
          SELECT 
              s.shop_id,
              s.shop_name,
              s.description,
              s.latitude,
              s.longitude,
              s.formatted_address,
              s.is_online,
              s.average_rating,
              s.total_ratings,
              s.is_visible,
              GROUP_CONCAT(c.category_name SEPARATOR ', ') AS categories
          FROM shops s
          LEFT JOIN shop_categories sc ON s.shop_id = sc.shop_id
          LEFT JOIN categories c ON sc.category_id = c.category_id
          WHERE s.is_visible = TRUE AND s.is_online = TRUE
      `;
      
      const queryParams: (string | number)[] = [];
      
      if (category !== 'All') {
          query += ` AND c.category_name = ?`;
          queryParams.push(category);
      }
      
      query += ` GROUP BY s.shop_id ORDER BY s.average_rating DESC, s.created_at DESC`;
      
      const [directResults] = await db.query<ShopRow[]>(
          query,
          queryParams
      );
      
      shops = directResults;
    }

    // Process results (Photos and Category Formatting)
    const shopsWithPhotos = await Promise.all(
      shops.map(async (shop) => {
        const [photos] = await db.query<PhotoRow[]>(
          'SELECT photo_url FROM shop_photos WHERE shop_id = ? ORDER BY photo_order LIMIT 1',
          [shop.shop_id]
        );
        
        // Ensure that categories are always returned as a clean array of strings
        const categoryArray = shop.categories ? shop.categories.split(', ') : [];
        
        return {
          ...shop,
          categories: categoryArray, 
          image: photos.length > 0 
            ? photos[0].photo_url 
            : 'https://via.placeholder.com/300x200', // Default placeholder
          // Ensure distance_km is only included if it was calculated (i.e., location search)
          distance_km: shop.distance_km,
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