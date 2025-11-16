// pages/api/health.ts - Health check endpoint
import type { NextApiRequest, NextApiResponse } from 'next';
import { testConnection } from '@/lib/dbconfig';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const dbConnected = await testConnection();
    
    return res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'Connected' : 'Disconnected',
    });
  } catch (error) {
    return res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
    });
  }
}