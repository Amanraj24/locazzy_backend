// FILE: app/api/auth/register-user/route.ts
// Customer Registration
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, phoneNumber, email } = body;

    if (!fullName || !phoneNumber) {
      return NextResponse.json(
        { error: 'Full name and phone number are required' },
        { status: 400 }
      );
    }

    const [existing] = await db.query(
      'SELECT user_id FROM users WHERE phone_number = ?',
      [phoneNumber]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    const userId = uuidv4();
    await db.query(
      `INSERT INTO users (user_id, full_name, phone_number, email)
       VALUES (?, ?, ?, ?)`,
      [userId, fullName, phoneNumber, email]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user_id: userId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user', details: error.message },
      { status: 500 }
    );
  }
}
