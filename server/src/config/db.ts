// ============================================
// SIEGE Server — Database Connection
// ============================================
// MongoDB connection via Mongoose with retry
// logic and graceful shutdown handling.
// ============================================

import mongoose from 'mongoose';
import { env } from './env.js';

let mongod: any = null;

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

      // Fallback to in-memory MongoDB in development if localhost fails
      if (attempt === 1 && (env.MONGODB_URI.includes('localhost') || env.MONGODB_URI.includes('127.0.0.1'))) {
        console.log(`ℹ️ Local MongoDB not detected. Attempting to start in-memory MongoDB database...`);
        try {
          const { MongoMemoryServer } = await import('mongodb-memory-server');
          mongod = await MongoMemoryServer.create();
          const uri = mongod.getUri();
          console.log(`🚀 In-memory MongoDB server started: ${uri}`);
          
          await mongoose.connect(uri);
          console.log(`✅ Connected to in-memory database successfully!`);
          return;
        } catch (memError) {
          console.error(`❌ Failed to start in-memory MongoDB:`, (memError as Error).message);
        }
      }

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
  if (mongod) {
    await mongod.stop();
    console.log('   In-memory MongoDB stopped.');
  }
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
