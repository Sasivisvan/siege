// ============================================
// SIEGE Server — Application Entry Point
// ============================================
// Express app setup with all middleware, routes,
// and database connection.
// ============================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { globalErrorHandler, AppError } from './middleware/errorHandler.js';

// Route imports (uncomment as phases are built)
import authRoutes from './routes/auth.routes.js';
import examRoutes from './routes/exam.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import sessionRoutes from './routes/session.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

// Services
import { startHeartbeatMonitor } from './services/heartbeat.js';

// ============================================
// Create Express App
// ============================================

const app = express();

// ============================================
// Global Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS — allow requests from the frontend
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-HMAC-Signature'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
if (!env.IS_PRODUCTION) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================
// Health Check
// ============================================

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'SIEGE server is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API Routes
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);

// ============================================
// 404 Handler (must be after all routes)
// ============================================

app.use((_req, _res, next) => {
  next(new AppError('Route not found', 404));
});

// ============================================
// Global Error Handler (must be LAST)
// ============================================

app.use(globalErrorHandler);

// ============================================
// Start Server
// ============================================

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start heartbeat monitor
    startHeartbeatMonitor();

    // Start listening
    app.listen(env.PORT, () => {
      console.log('\n🛡️  SIEGE Server Started');
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Port:        ${env.PORT}`);
      console.log(`   CORS Origin: ${env.CORS_ORIGIN}`);
      console.log(`   Health:      http://localhost:${env.PORT}/api/health`);
      console.log('');
    });
  } catch (error) {
    console.error('💀 Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
