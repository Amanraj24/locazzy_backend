// lib/dbconfig.ts
import mysql from 'mysql2/promise';

// Database configuration interface
interface DBConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

// Database configuration from environment variables
const dbConfig: DBConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool for better performance
let pool: mysql.Pool | null = null;

export const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};

// Get a single connection
export const getConnection = async (): Promise<mysql.PoolConnection> => {
  const pool = getPool();
  return await pool.getConnection();
};

// Execute query helper
export const executeQuery = async (
  query: string,
  params?: any[]
): Promise<any> => {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(query, params);
    return results;
  } finally {
    connection.release();
  }
};

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Close all connections (useful for graceful shutdown)
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
};

// Database models and queries
export const UserQueries = {
  // Check if user exists by phone number
  findByPhone: async (phoneNumber: string) => {
    const query = 'SELECT * FROM users WHERE phone_number = ?';
    const results = await executeQuery(query, [phoneNumber]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  },

  // Check if user exists by Firebase UID
  findByFirebaseUid: async (firebaseUid: string) => {
    const query = 'SELECT * FROM users WHERE firebase_uid = ?';
    const results = await executeQuery(query, [firebaseUid]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  },

  // Create new user
  create: async (phoneNumber: string, fullName: string, firebaseUid: string) => {
    const query = `
      INSERT INTO users (phone_number, full_name, firebase_uid, created_at, updated_at) 
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    const result = await executeQuery(query, [phoneNumber, fullName, firebaseUid]);
    return result;
  },

  // Update user
  update: async (userId: number, data: { full_name?: string }) => {
    const query = 'UPDATE users SET full_name = ?, updated_at = NOW() WHERE id = ?';
    const result = await executeQuery(query, [data.full_name, userId]);
    return result;
  },

  // Get user by ID
  findById: async (userId: number) => {
    const query = 'SELECT id, phone_number, full_name, firebase_uid, created_at FROM users WHERE id = ?';
    const results = await executeQuery(query, [userId]);
    return Array.isArray(results) && results.length > 0 ? results[0] : null;
  },

  // Delete user (soft delete - you can add is_deleted column)
  delete: async (userId: number) => {
    const query = 'DELETE FROM users WHERE id = ?';
    const result = await executeQuery(query, [userId]);
    return result;
  },

  // Get all users (with pagination)
  findAll: async (limit: number = 50, offset: number = 0) => {
    const query = `
      SELECT id, phone_number, full_name, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const results = await executeQuery(query, [limit, offset]);
    return results;
  },

  // Count total users
  count: async (): Promise<number> => {
    const query = 'SELECT COUNT(*) as total FROM users';
    const results = await executeQuery(query);
    return results[0]?.total || 0;
  },
};

// Export default configuration
export default dbConfig;

// Types for TypeScript
export interface User {
  id: number;
  phone_number: string;
  full_name: string;
  firebase_uid: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDTO {
  phoneNumber: string;
  fullName: string;
  firebaseUid: string;
}

export interface UpdateUserDTO {
  full_name?: string;
}

/* 
SQL SCHEMA - Run this in your Hostinger MySQL Database:

CREATE DATABASE IF NOT EXISTS auth_db;
USE auth_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone_number),
  INDEX idx_firebase_uid (firebase_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Add is_active column for user status
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Optional: Add last_login column
ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL;
*/