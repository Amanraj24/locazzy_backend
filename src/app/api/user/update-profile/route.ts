// ============================================================================
// FILE 1: app/api/user/update-profile/route.ts
// Complete Update Profile API
// ============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export async function PUT(request: NextRequest) {
  console.log('📝 Update Profile API called');
  
  try {
    const body = await request.json();
    const { userId, fullName, email } = body;
    
    console.log('📋 Update request:', { userId, fullName, email: email || 'not provided' });

    // Validation: User ID
    if (!userId) {
      console.error('❌ No user ID provided');
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validation: Full Name
    if (!fullName || !fullName.trim()) {
      console.error('❌ No full name provided');
      return NextResponse.json(
        { success: false, error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Validation: Email format (if provided)
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        console.error('❌ Invalid email format:', email);
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Check if user exists
    console.log('🔍 Checking if user exists...');
    const [existingUser] = await db.query<RowDataPacket[]>(
      'SELECT user_id, full_name, email FROM users WHERE user_id = ?',
      [userId]
    );

    if (!existingUser || existingUser.length === 0) {
      console.error('❌ User not found:', userId);
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ User found:', existingUser[0].full_name);

    // Update user profile
    console.log('💾 Updating profile...');
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE users 
       SET full_name = ?, email = ? 
       WHERE user_id = ?`,
      [fullName.trim(), email?.trim() || null, userId]
    );

    if (result.affectedRows === 0) {
      console.error('❌ No rows updated');
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log('✅ Profile updated, affected rows:', result.affectedRows);

    // Fetch updated user data
    console.log('🔄 Fetching updated user data...');
    const [updatedUser] = await db.query<RowDataPacket[]>(
      `SELECT 
        user_id, 
        full_name, 
        phone_number, 
        email, 
        created_at,
        last_login
      FROM users 
      WHERE user_id = ?`,
      [userId]
    );

    if (!updatedUser || updatedUser.length === 0) {
      console.error('❌ Failed to fetch updated user');
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated profile' },
        { status: 500 }
      );
    }

    const userData = updatedUser[0];
    console.log('✅ Updated user data retrieved:', userData.full_name);

    const response = {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: userData.user_id,
        name: userData.full_name,
        phoneNumber: userData.phone_number,
        email: userData.email || '',
        memberSince: userData.created_at,
        lastLogin: userData.last_login,
      },
    };

    console.log('✅ Sending success response');
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Update profile error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update profile', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Optional: GET method to fetch profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const [userRows] = await db.query<RowDataPacket[]>(
      `SELECT 
        user_id, 
        full_name, 
        phone_number, 
        email, 
        created_at,
        last_login,
        is_active
      FROM users 
      WHERE user_id = ? AND is_active = TRUE`,
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userRows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: userData.user_id,
        name: userData.full_name,
        phoneNumber: userData.phone_number,
        email: userData.email || '',
        memberSince: userData.created_at,
        lastLogin: userData.last_login,
      },
    });

  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get profile', details: error.message },
      { status: 500 }
    );
  }
}
