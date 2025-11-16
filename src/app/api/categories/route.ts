// FILE: app/api/categories/route.ts
// Get all categories
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET(request: NextRequest) {
  try {
    const [categories] = await db.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY display_order'
    );

    return NextResponse.json({
      success: true,
      categories: categories,
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to get categories', details: error.message },
      { status: 500 }
    );
  }
}