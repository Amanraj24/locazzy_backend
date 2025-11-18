import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface CategoryRow extends RowDataPacket {
  category_id: number;
}

// Define ShopRow structure
interface ShopRow extends RowDataPacket {
  shop_id: string;
  owner_id: string;
  shop_name: string;
  description: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
  // Add other shop fields here if needed for the response
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ownerId,
      shopName,
      description,
      categories,
      location,
      visibilityRadius,
      photos,
    } = body;

    // Validation
    if (!ownerId || !shopName || !location || !categories || categories.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate coordinates explicitly as they are mandatory for SQL
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        return NextResponse.json(
            { error: 'Failed to create shop profile', details: "Coordinates (latitude, longitude) must be valid numbers." },
            { status: 400 }
        );
    }
    
    const shopId = uuidv4();

    // Insert shop
    await db.query<ResultSetHeader>(
      `INSERT INTO shops (
        shop_id, owner_id, shop_name, description,
        latitude, longitude, formatted_address,
        street_address, locality, city, state, country,
        postal_code, plus_code, visibility_radius_km
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shopId,
        ownerId,
        shopName,
        description,
        location.latitude,
        location.longitude,
        location.formattedAddress,
        location.streetAddress,
        location.locality,
        location.city,
        location.state,
        location.country,
        location.postalCode,
        location.plusCode,
        visibilityRadius || 5,
      ]
    );

    // Insert categories
    for (const categoryName of categories) {
      const [catRows] = await db.query<CategoryRow[]>(
        'SELECT category_id FROM categories WHERE category_name = ?',
        [categoryName]
      );
      if (catRows.length > 0) {
        const categoryId = catRows[0].category_id;
        await db.query<ResultSetHeader>(
          'INSERT INTO shop_categories (shop_id, category_id) VALUES (?, ?)',
          [shopId, categoryId]
        );
      }
    }

    // Insert photos
    if (photos && photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        const photoId = uuidv4();
        await db.query<ResultSetHeader>(
          `INSERT INTO shop_photos (photo_id, shop_id, photo_url, photo_order)
           VALUES (?, ?, ?, ?)`,
          [photoId, shopId, photos[i].uri, i]
        );
      }
    }
    
    // 🌟 FIX: Fetch the newly created shop details to return in the response
    const [shopRows] = await db.query<ShopRow[]>(
        `SELECT shop_id, owner_id, shop_name, description, latitude, longitude, formatted_address
        FROM shops WHERE shop_id = ?`,
        [shopId]
    );

    const createdShop = shopRows.length > 0 ? shopRows[0] : null;


    return NextResponse.json({
      success: true,
      message: 'Shop profile created successfully',
      shop_id: shopId,
      shop: createdShop, // <-- Include the created shop object
    });
  } catch (error: any) {
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create shop profile', details: error.message },
      { status: 500 }
    );
  }
}

// Update shop profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shopId,
      shopName,
      description,
      categories,
      location,
      visibilityRadius,
      isVisible,
      isOnline,
    } = body;

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }

    // Ensure location data is valid for update
    const latitude = location?.latitude || null;
    const longitude = location?.longitude || null;

    // Update shop details
    await db.query<ResultSetHeader>(
      `UPDATE shops SET
        shop_name = ?,
        description = ?,
        latitude = ?,
        longitude = ?,
        formatted_address = ?,
        street_address = ?,
        locality = ?,
        city = ?,
        state = ?,
        country = ?,
        postal_code = ?,
        plus_code = ?,
        visibility_radius_km = ?,
        is_visible = ?,
        is_online = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE shop_id = ?`,
      [
        shopName,
        description,
        latitude, // Use null fallback if not provided during update
        longitude, // Use null fallback if not provided during update
        location?.formattedAddress,
        location?.streetAddress,
        location?.locality,
        location?.city,
        location?.state,
        location?.country,
        location?.postalCode,
        location?.plusCode,
        visibilityRadius,
        isVisible,
        isOnline,
        shopId,
      ]
    );

    // Update categories
    if (categories) {
      await db.query<ResultSetHeader>('DELETE FROM shop_categories WHERE shop_id = ?', [shopId]);
      for (const categoryName of categories) {
        const [catRows] = await db.query<CategoryRow[]>(
          'SELECT category_id FROM categories WHERE category_name = ?',
          [categoryName]
        );
        if (catRows.length > 0) {
          const categoryId = catRows[0].category_id;
          await db.query<ResultSetHeader>(
            'INSERT INTO shop_categories (shop_id, category_id) VALUES (?, ?)',
            [shopId, categoryId]
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Shop profile updated successfully',
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update shop profile', details: error.message },
      { status: 500 }
    );
  }
}

// Get shop profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    const shopId = searchParams.get('shopId');

    if (!ownerId && !shopId) {
      return NextResponse.json(
        { error: 'Owner ID or Shop ID is required' },
        { status: 400 }
      );
    }

    const whereClause = shopId ? 'shop_id = ?' : 'owner_id = ?';
    const param = shopId || ownerId;

    const [shops] = await db.query<RowDataPacket[]>(
      `SELECT * FROM v_shop_details WHERE ${whereClause}`,
      [param]
    );

    if (shops.length === 0) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Get photos
    const [photos] = await db.query<RowDataPacket[]>(
      'SELECT photo_url, photo_order FROM shop_photos WHERE shop_id = ? ORDER BY photo_order',
      [shops[0].shop_id]
    );

    return NextResponse.json({
      success: true,
      shop: {
        ...shops[0],
        photos: photos,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to get shop profile', details: error.message },
      { status: 500 }
    );
  }
}