// ============================================
// SIEGE Server — HMAC Verification Middleware
// ============================================
// Verifies telemetry payload integrity using
// session-specific HMAC-SHA256 signatures.
// ============================================

import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { Session } from '../models/Session.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { AppError } from './errorHandler.js';
import type { AuthenticatedRequest } from '../types/index.js';

/**
 * Verify HMAC signature on telemetry payloads.
 *
 * Expects:
 * - Header: `X-HMAC-Signature: <hex-encoded HMAC-SHA256>`
 * - Body:   `{ sessionId: "...", events: [...] }`
 *
 * If signature is invalid:
 * 1. Immediately flags session with API_MANIPULATION event
 * 2. Sets risk score to 100%
 * 3. Returns 403
 */
export async function verifyHMAC(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const signature = req.headers['x-hmac-signature'] as string;
    const { sessionId } = req.body;

    if (!signature) {
      throw new AppError('Missing X-HMAC-Signature header', 400);
    }

    if (!sessionId) {
      throw new AppError('Missing sessionId in request body', 400);
    }

    // Fetch session with HMAC secret
    const session = await Session.findById(sessionId).select('+hmacSecret');

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.candidateId.toString() !== req.user!.userId) {
      throw new AppError('Session does not belong to this user', 403);
    }

    if (session.status !== 'active') {
      throw new AppError(`Session is ${session.status}. Cannot accept telemetry.`, 400);
    }

    // Compute expected HMAC
    const expectedSignature = crypto
      .createHmac('sha256', session.hmacSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      // HMAC MISMATCH — Potential attack!
      console.error(`🚨 HMAC MISMATCH for session ${sessionId}. Possible payload tampering.`);

      // Flag the session immediately
      await TelemetryEvent.create({
        sessionId: session._id,
        candidateId: session.candidateId,
        examId: session.examId,
        timestamp: Date.now(),
        eventType: 'API_MANIPULATION',
        metadata: {
          reason: 'HMAC signature mismatch',
          receivedSignature: signature.substring(0, 16) + '...', // Log partial for debugging
        },
      });

      // Set risk to maximum
      session.riskScore = 100;
      session.status = 'flagged';
      await session.save();

      throw new AppError('Invalid HMAC signature. Session flagged.', 403);
    }

    // Attach session to request for downstream use
    (req as AuthenticatedRequest & { session: typeof session }).session = session;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('HMAC verification failed', 500));
    }
  }
}
