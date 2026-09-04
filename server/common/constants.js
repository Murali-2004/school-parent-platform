// ---------------------------------------------------------------------------
// Shared enums / constants used across modules.
// ---------------------------------------------------------------------------

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN', // platform operator; may act across all schools
  SCHOOL_ADMIN: 'SCHOOL_ADMIN', // full access within ONE school (their schoolId)
  TEACHER: 'TEACHER', // access limited to their assigned classes/sections
  PARENT: 'PARENT', // access limited to their own children
});

export const ROLE_VALUES = Object.freeze(Object.values(ROLES));

// Roles that are allowed to self-register through the public /auth/register
// route. SCHOOL_ADMIN and SUPER_ADMIN are created by the seed script or by a
// higher-privileged admin, never by public signup.
export const SELF_REGISTERABLE_ROLES = Object.freeze([ROLES.PARENT, ROLES.TEACHER]);

export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  SUSPENDED: 'SUSPENDED',
});

export const SCHOOL_PLANS = Object.freeze(['FREE', 'BASIC', 'PRO']);
