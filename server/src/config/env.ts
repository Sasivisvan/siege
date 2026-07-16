// ============================================
// SIEGE Server — Environment Configuration
// ============================================
// Loads and validates environment variables.
// Throws on startup if any required var is missing.
// ============================================

import dotenv from 'dotenv';
import path from 'path';

// Load .env file automatically from current working directory
dotenv.config();

/**
 * Validated environment configuration.
 * Access via `import { env } from './config/env.js'`
 */
export const env = {
  // Server
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',

  // Database
  MONGODB_URI: requireEnv('MONGODB_URI'),

  // Authentication
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // HMAC (Telemetry Security)
  HMAC_SECRET: requireEnv('HMAC_SECRET'),

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;

/**
 * Require an environment variable or throw a clear error.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
      `   Copy .env.example to .env and fill in the values.`
    );
  }
  return value;
}
