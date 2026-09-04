// ---------------------------------------------------------------------------
// Small reusable Zod building blocks shared by module validation schemas.
// ---------------------------------------------------------------------------
import { z } from 'zod';

// A 24-char hex Mongo ObjectId, kept as a string (Mongoose casts it on query).
export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-character hex ObjectId');

export const email = z.string().email().toLowerCase().trim();

export const phone = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+()\-\s\d]+$/, 'invalid phone number');

// Password policy for signup — deliberately simple; tune later.
export const password = z.string().min(8, 'password must be at least 8 characters').max(128);
