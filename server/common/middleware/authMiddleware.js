// ---------------------------------------------------------------------------
// authMiddleware — verifies the access token and populates req.user.
//
// req.user = { id, role, schoolId, email }
//
//   - `id` / `role` / `schoolId` come straight from the SIGNED token payload.
//     The client cannot tamper with them, so downstream middleware
//     (schoolScope, roleMiddleware, relationshipGuard) can trust them without
//     a database round-trip.
//   - `schoolId` is null only for SUPER_ADMIN.
// ---------------------------------------------------------------------------
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authMiddleware = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) throw new ApiError(401, 'Missing or malformed Authorization header');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const msg =
      err?.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    throw new ApiError(401, msg);
  }

  req.user = {
    id: payload.sub,
    role: payload.role,
    schoolId: payload.schoolId ?? null,
    email: payload.email,
  };

  next();
});

// Optional variant: attach req.user if a valid token is present, but do not
// reject anonymous requests. Useful for endpoints with mixed public/private data.
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      schoolId: payload.schoolId ?? null,
      email: payload.email,
    };
  } catch {
    /* ignore an invalid token in optional mode */
  }
  next();
});
