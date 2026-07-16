// ============================================
// SIEGE Server — Database Connection
// ============================================
// MongoDB connection via Mongoose with retry
// logic and graceful shutdown handling.
// ============================================

import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB with retry logic.
 * Retries up to 5 times with 5-second delays.
 */
export async function connectDB(): Promise<void> {
  const MAX_RETRIES = 5;
  const RETRY_DELAY_MS = 5000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log(`✅ MongoDB connected successfully`);
      console.log(`   Database: ${mongoose.connection.name}`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`);
      console.error(`   ${(error as Error).message}`);

      if (attempt === MAX_RETRIES) {
        console.error(`\n💀 All ${MAX_RETRIES} connection attempts failed.`);
        throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts`);
      }

      console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

// --- Connection Event Logging ---

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

// --- Graceful Shutdown ---

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 Received ${signal}. Closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log('   MongoDB connection closed.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
