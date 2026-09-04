// ---------------------------------------------------------------------------
// /api/v1/auth
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { authMiddleware } from '../../common/middleware/authMiddleware.js';
import { authLimiter } from '../../common/middleware/rateLimiters.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './authValidation.js';
import * as authController from './authController.js';

const router = Router();

// Rate-limited credential endpoints.
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// Token lifecycle.
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(logoutSchema), authController.logout);

// Who am I (requires a valid access token).
router.get('/me', authMiddleware, authController.me);

export default router;
