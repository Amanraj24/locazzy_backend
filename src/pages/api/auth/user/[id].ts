// pages/api/auth/user/[id].ts - Get user by ID
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserQueries } from '@/lib/dbconfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const userId = parseInt(id as string);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      const user = await UserQueries.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          phone_number: user.phone_number,
          full_name: user.full_name,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    // Update user
    try {
      const userId = parseInt(id as string);
      const { full_name } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      if (!full_name) {
        return res.status(400).json({ message: 'Full name is required' });
      }

      await UserQueries.update(userId, { full_name });

      return res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'DELETE') {
    // Delete user
    try {
      const userId = parseInt(id as string);

      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }

      await UserQueries.delete(userId);

      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
