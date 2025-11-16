import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends RowDataPacket {
  owner_id?: string;
  user_id?: string;
  business_name?: string;
  full_name?: string;
  phone_number: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, userType } = body; // userType: 'owner' or 'customer'

    if (!phoneNumber || !userType) {
      return NextResponse.json(
        { error: 'Phone number and user type are required' },
        { status: 400 }
      );
    }

    let user: UserRow | undefined;
    if (userType === 'owner') {
      const [rows] = await db.query<UserRow[]>(
        'SELECT * FROM shop_owners WHERE phone_number = ? AND is_active = TRUE',
        [phoneNumber]
      );
      user = rows[0];
    } else {
      const [rows] = await db.query<UserRow[]>(
        'SELECT * FROM users WHERE phone_number = ? AND is_active = TRUE',
        [phoneNumber]
      );
      user = rows[0];
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 404 }
      );
    }

    // Update last login
    const table = userType === 'owner' ? 'shop_owners' : 'users';
    const idField = userType === 'owner' ? 'owner_id' : 'user_id';
    const userId = userType === 'owner' ? user.owner_id : user.user_id;
    
    await db.query<ResultSetHeader>(
      `UPDATE ${table} SET last_login = CURRENT_TIMESTAMP WHERE ${idField} = ?`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: userId,
        name: user.business_name || user.full_name,
        phoneNumber: user.phone_number,
        type: userType,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error.message },
      { status: 500 }
    );
  }
}
