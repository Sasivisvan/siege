// ============================================
// SIEGE Server — Input Validation Middleware
// ============================================

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Run validation chains and return 400 with structured errors if any fail.
 *
 * Usage:
 * ```
 * router.post('/path',
 *   validate([
 *     body('email').isEmail().withMessage('Valid email is required'),
 *     body('password').isLength({ min: 6 }),
 *   ]),
 *   handler
 * )
 * ```
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Return structured error response
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array().map((err) => ({
          field: 'path' in err ? err.path : 'unknown',
          message: err.msg,
        })),
      },
    });
  };
}
