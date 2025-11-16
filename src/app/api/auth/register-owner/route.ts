// FILE: app/api/auth/register-owner/route.ts
// Shop Owner Registration
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, phoneNumber, ownerName, email } = body;

    // Validation
    if (!businessName || !phoneNumber) {
      return NextResponse.json(
        { error: 'Business name and phone number are required' },
        { status: 400 }
      );
    }

    // Check if phone number already exists
    const [existing] = await db.query(
      'SELECT owner_id FROM shop_owners WHERE phone_number = ?',
      [phoneNumber]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    // Create new shop owner
    const ownerId = uuidv4();
    await db.query(
      `INSERT INTO shop_owners (owner_id, business_name, owner_name, phone_number, email)
       VALUES (?, ?, ?, ?, ?)`,
      [ownerId, businessName, ownerName, phoneNumber, email]
    );

    // Create default notification settings
    await db.query(
      'INSERT INTO notification_settings (owner_id) VALUES (?)',
      [ownerId]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Shop owner registered successfully',
        owner_id: ownerId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register shop owner', details: error.message },
      { status: 500 }
    );
  }
}
