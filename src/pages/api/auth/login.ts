// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserQueries } from '@/lib/dbconfig';

interface LoginRequest {
  phoneNumber: string;
  firebaseUid: string;
}

interface LoginResponse {
  message: string;
  user?: {
    id: number;
    phone_number: string;
    full_name: string;
    created_at: Date;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, firebaseUid }: LoginRequest = req.body;

    if (!phoneNumber || !firebaseUid) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find user by phone number
    const user = await UserQueries.findByPhone(phoneNumber);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify Firebase UID matches
    if (user.firebase_uid !== firebaseUid) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    // Return user data (excluding sensitive info)
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        phone_number: user.phone_number,
        full_name: user.full_name,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
