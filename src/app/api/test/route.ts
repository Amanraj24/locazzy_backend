// TEST ENDPOINT
// FILE: app/api/test/route.ts
// ============================================

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [result] = await db.query('SELECT 1 + 1 as result');
    return NextResponse.json({
      success: true,
      message: 'API is working!',
      database: 'Connected',
      test_result: result,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'API connection failed',
      error: error.message,
    });
  }
}