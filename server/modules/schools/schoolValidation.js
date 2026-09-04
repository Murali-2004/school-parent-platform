import { z } from 'zod';
import { SCHOOL_PLANS } from '../../common/constants.js';

export const createSchoolSchema = z.object({
  name: z.string().trim().min(2).max(160),
  city: z.string().trim().max(120).optional(),
  plan: z.enum(SCHOOL_PLANS).default('FREE'),
  active: z.boolean().default(true),
});

export const updateSchoolSchema = createSchoolSchema.partial();

export const listSchoolsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
