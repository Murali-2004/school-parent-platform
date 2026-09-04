// ---------------------------------------------------------------------------
// roleMiddleware(...allowedRoles) — coarse-grained RBAC gate.
//
//   router.post('/schools', roleMiddleware(ROLES.SUPER_ADMIN), ...)
//   router.get('/students', roleMiddleware(ROLES.SCHOOL_ADMIN, ROLES.TEACHER), ...)
//
// This only checks "is this role allowed to hit this route at all". Row-level
// checks ("is this THEIR student / THEIR class") are relationshipGuard's job,
// and tenant isolation is schoolScope + tenantPlugin's job.
// ---------------------------------------------------------------------------
import { ApiError } from '../utils/ApiError.js';

export const roleMiddleware =
  (...allowedRoles) =>
  (req, _res, next) => {
    const allowed = allowedRoles.flat();

    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(
        new ApiError(403, `Insufficient role. Allowed: ${allowed.join(', ')}`),
      );
    }
    next();
  };
