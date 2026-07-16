// ============================================
// SIEGE Server — Rate Limiter
// ============================================

import rateLimit from 'express-rate-limit';

/**
 * Auth endpoints: 5 requests per 15 minutes per IP.
 * Prevents brute-force login attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: { message: 'Too many authentication attempts. Try again in 15 minutes.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Telemetry endpoint: 20 requests per 10 seconds per IP.
 * Allows normal batching but blocks flooding.
 */
export const telemetryLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 20,
  message: {
    success: false,
    error: { message: 'Too many telemetry requests. Slow down.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API: 100 requests per 15 minutes per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: { message: 'Too many requests. Try again later.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
