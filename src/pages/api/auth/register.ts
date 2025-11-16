// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserQueries } from '@/lib/dbconfig';

interface RegisterRequest {
  phoneNumber: string;
  fullName: string;
  firebaseUid: string;
}

interface RegisterResponse {
  message: string;
  userId?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, fullName, firebaseUid }: RegisterRequest = req.body;

    // Validate input
    if (!phoneNumber || !fullName || !firebaseUid) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate phone number format
    if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check if user already exists
    const existingUserByPhone = await UserQueries.findByPhone(phoneNumber);
    if (existingUserByPhone) {
      return res.status(409).json({ message: 'Phone number already registered' });
    }

    const existingUserByUid = await UserQueries.findByFirebaseUid(firebaseUid);
    if (existingUserByUid) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Create new user
    const result = await UserQueries.create(phoneNumber, fullName, firebaseUid);

    return res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}