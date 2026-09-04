// ---------------------------------------------------------------------------
// Token helpers.
//
//  - Access token: a signed JWT. Payload carries `role` and `schoolId` so that
//    authMiddleware can populate req.user WITHOUT a DB hit on every request,
//    and so schoolScope always has a tenant to filter by.
//
//  - Refresh token: NOT a JWT. It is an opaque 96-hex-char random string. Only
//    its SHA-256 hash is stored (in the RefreshToken collection), so a database
//    leak does not hand out usable refresh tokens. Rotation + reuse detection
//    live in the auth service.
// ---------------------------------------------------------------------------
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

/**
 * @param {{ _id?: any, id?: any, role: string, schoolId?: any, email: string }} user
 */
export function signAccessToken(user) {
  const subject = String(user._id ?? user.id);
  return jwt.sign(
    {
      role: user.role,
      // schoolId is null for SUPER_ADMIN (they are not bound to one school).
      schoolId: user.schoolId ? String(user.schoolId) : null,
      email: user.email,
    },
    env.JWT_ACCESS_SECRET,
    { subject, expiresIn: env.JWT_ACCESS_TTL },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/** Create a fresh refresh token: return the raw value (sent to client) + its hash (stored). */
export function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex');
  return { raw, hash: hashRefreshToken(raw) };
}

export function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function refreshTokenExpiryDate() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
