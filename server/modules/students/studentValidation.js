import { z } from 'zod';
import { objectId } from '../../common/utils/zodHelpers.js';

export const createStudentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  classId: objectId,
  sectionId: objectId.optional(),
  rollNo: z.string().trim().max(20).optional(),
  parentIds: z.array(objectId).max(4).optional().default([]),
});

export const updateStudentSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    classId: objectId,
    sectionId: objectId.nullable(),
    rollNo: z.string().trim().max(20).nullable(),
  })
  .partial();

export const studentIdParam = z.object({
  studentId: objectId,
});

export const listStudentsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  classId: objectId.optional(),
  sectionId: objectId.optional(),
});

export const linkParentSchema = z.object({
  parentId: objectId,
});
