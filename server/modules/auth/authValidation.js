// ---------------------------------------------------------------------------
// Zod schemas for the /auth routes.
// ---------------------------------------------------------------------------
import { z } from 'zod';
import { objectId, email, phone, password } from '../../common/utils/zodHelpers.js';
import { SELF_REGISTERABLE_ROLES } from '../../common/constants.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email,
  phone: phone.optional(),
  password,
  // A public signup must target a specific school.
  schoolId: objectId,
  // Only PARENT / TEACHER may self-register. Defaults to PARENT.
  role: z.enum(SELF_REGISTERABLE_ROLES).default('PARENT'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1),
  // Optional: disambiguates when the same email exists at more than one school.
  schoolId: objectId.optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20),
});
