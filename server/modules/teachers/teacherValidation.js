import { z } from 'zod';
import { objectId } from '../../common/utils/zodHelpers.js';

export const teacherIdParam = z.object({ teacherId: objectId });

export const updateProfileSchema = z.object({
  subjects: z.array(z.string().trim().min(1).max(60)).max(20),
});

export const assignmentSchema = z.object({
  classId: objectId,
  sectionId: objectId.optional(),
});
