// pages/api/auth/verify-user.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserQueries } from '@/lib/dbconfig';

interface VerifyUserRequest {
  phoneNumber: string;
}

interface VerifyUserResponse {
  exists: boolean;
  user?: {
    id: number;
    full_name: string;
  } | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyUserResponse | { message: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { phoneNumber }: VerifyUserRequest = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    const user = await UserQueries.findByPhone(phoneNumber);

    return res.status(200).json({
      exists: !!user,
      user: user ? {
        id: user.id,
        full_name: user.full_name,
      } : null,
    });
  } catch (error) {
    console.error('Verify user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
