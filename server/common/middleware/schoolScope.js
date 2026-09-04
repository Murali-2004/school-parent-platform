// ===========================================================================
// schoolScope  —  the PRIMARY, ergonomic tenant-isolation layer.
// ===========================================================================
//
// THE PROBLEM
// -----------
// In a multi-tenant system every DB read/write against a tenant-owned
// collection must be filtered by the caller's schoolId. If a controller writes
// `Student.find({ classId })` and forgets `schoolId`, School A can read School
// B's students. That is the single worst bug this codebase can ship.
//
// THE APPROACH (two layers)
// -------------------------
//   Layer 1 (this file): give controllers a helper that INJECTS schoolId for
//           them, so the correct thing is also the easy thing:
//
//               req.scoped(Student).find({ classId })
//               // -> Student.find({ schoolId: <from token>, classId })
//
//   Layer 2 (tenantPlugin.js): if someone bypasses layer 1 and calls
//           `Student.find({ classId })` directly, the Mongoose pre-hook THROWS.
//
// WHERE schoolId COMES FROM
// -------------------------
// `req.user.schoolId`, which authMiddleware copied out of the SIGNED access
// token. The client never supplies it in a body/query/param, so it cannot be
// spoofed. Any `schoolId` in a request body is ignored — see req.scoped/req.tenantFilter.
//
// SUPER_ADMIN
// -----------
// SUPER_ADMIN has `schoolId === null`. They are not bound to a tenant, so
// `req.scoped()` / `req.tenantFilter()` THROW for them — a super admin must go
// through an explicit cross-tenant path (`req.crossTenant(Model)`) or supply an
// explicit schoolId, so cross-school access is always deliberate and auditable.
// ===========================================================================
import { ROLES } from '../constants.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Mount AFTER authMiddleware on any router that touches tenant data.
 * Adds three helpers to `req`.
 */
export function schoolScope(req, _res, next) {
  const role = req.user?.role;
  const schoolId = req.user?.schoolId ?? null;

  const requireTenant = () => {
    if (!schoolId) {
      throw new ApiError(
        403,
        role === ROLES.SUPER_ADMIN
          ? 'SUPER_ADMIN has no school context; use an explicit cross-tenant endpoint or pass a schoolId.'
          : 'This request has no school context.',
      );
    }
    return schoolId;
  };

  // ---- req.scoped(Model) -------------------------------------------------
  // Returns a Mongoose Query already constrained to this school. Chain the
  // real operation onto it:
  //     const list  = await req.scoped(Student).find({ classId });
  //     const one   = await req.scoped(Student).findOne({ _id: id });
  //     await req.scoped(Student).updateOne({ _id: id }, patch);
  req.scoped = (Model) => Model.where({ schoolId: requireTenant() });

  // ---- req.tenantFilter(extra) ----------------------------------------- -
  // Plain object with schoolId merged in — for `.create()`, `$match` stages,
  // `insertMany`, or anywhere you need the filter as data rather than a query.
  //     await Student.create(req.tenantFilter({ name, classId }));
  req.tenantFilter = (extra = {}) => ({ schoolId: requireTenant(), ...extra });

  // ---- req.crossTenant(Model) ---------------------------------------- - -
  // Deliberate SUPER_ADMIN-only escape hatch. Returns an UNSCOPED query (the
  // tenantPlugin guard is disabled). Every call site is greppable.
  req.crossTenant = (Model) => {
    if (req.user?.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Cross-tenant access is restricted to SUPER_ADMIN.');
    }
    return Model.find().skipTenantGuard();
  };

  next();
}

/**
 * Framework-free variant for use in services / scripts / tests where there is
 * no `req`. Same idea: never query a tenant model without going through this.
 *
 *     const students = await withSchool(Student, schoolId).find({ classId });
 */
export function withSchool(Model, schoolId) {
  if (!schoolId) throw new ApiError(400, 'withSchool() requires a schoolId');
  return Model.where({ schoolId });
}
