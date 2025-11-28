// FILE: app/api/user/update-profile/route.ts
// Update User Profile API
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fullName, email } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Check if user exists
    const [existingUser] = await db.query(
      'SELECT user_id FROM users WHERE user_id = ?',
      [userId]
    );

    if (!Array.isArray(existingUser) || existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user profile
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE users 
       SET full_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [fullName.trim(), email?.trim() || null, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Fetch updated user data
    const [updatedUser] = await db.query(
      `SELECT user_id, full_name, phone_number, email, created_at, updated_at 
       FROM users WHERE user_id = ?`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: Array.isArray(updatedUser) ? updatedUser[0] : null,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    );
  }
}
