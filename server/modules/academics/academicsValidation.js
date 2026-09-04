import { z } from 'zod';
import { objectId } from '../../common/utils/zodHelpers.js';

export const createClassSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createSectionSchema = z.object({
  classId: objectId,
  name: z.string().trim().min(1).max(80),
});

export const listQuery = z.object({
  classId: objectId.optional(),
});
