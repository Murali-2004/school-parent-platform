// ---------------------------------------------------------------------------
// Rate limiters (express-rate-limit).
//
//   - globalLimiter : applied to the whole API as a blunt abuse cap.
//   - authLimiter   : tight cap on /auth/login and /auth/register to slow down
//                     credential stuffing / account enumeration.
// ---------------------------------------------------------------------------
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';

const baseOptions = {
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false, // disable X-RateLimit-* headers
};

export const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { error: { message: 'Too many requests, please try again later.' } },
});

export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  // Count only failed attempts against the limit where possible.
  skipSuccessfulRequests: true,
  message: {
    error: { message: 'Too many authentication attempts, please try again later.' },
  },
});
