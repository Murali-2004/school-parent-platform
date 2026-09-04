// ===========================================================================
// /api/v1/students
//
// This router is the reference example of how the guard layers compose:
//
//   authMiddleware      -> who are you (req.user from signed token)
//   schoolScope         -> req.scoped / req.tenantFilter bound to your schoolId
//   roleMiddleware(...)  -> is your ROLE allowed on this route at all
//   studentAccessGuard  -> is THIS student yours (parent) / in a class you
//                          teach (teacher); admins pass through
// ===========================================================================
import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/authMiddleware.js';
import { schoolScope } from '../../common/middleware/schoolScope.js';
import { roleMiddleware } from '../../common/middleware/roleMiddleware.js';
import { studentAccessGuard } from '../../common/middleware/relationshipGuard.js';
import { validate } from '../../common/middleware/validate.js';
import { ROLES } from '../../common/constants.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentIdParam,
  listStudentsQuery,
  linkParentSchema,
} from './studentValidation.js';
import * as studentController from './studentController.js';

const router = Router();

// Applies to every route in this module.
router.use(authMiddleware, schoolScope);

// Create — only a school admin.
router.post(
  '/',
  roleMiddleware(ROLES.SCHOOL_ADMIN),
  validate(createStudentSchema),
  studentController.create,
);

// List — admin (all in school), teacher (their classes), parent (their kids).
// studentService.listStudents applies the role-specific filter.
router.get(
  '/',
  roleMiddleware(ROLES.SCHOOL_ADMIN, ROLES.TEACHER, ROLES.PARENT),
  validate(listStudentsQuery, 'query'),
  studentController.list,
);

// Read one — row-level guard enforces the relationship.
router.get(
  '/:studentId',
  roleMiddleware(ROLES.SCHOOL_ADMIN, ROLES.TEACHER, ROLES.PARENT),
  validate(studentIdParam, 'params'),
  studentAccessGuard({ from: 'params', key: 'studentId' }),
  studentController.getById,
);

// Update — only a school admin.
router.patch(
  '/:studentId',
  roleMiddleware(ROLES.SCHOOL_ADMIN),
  validate(studentIdParam, 'params'),
  validate(updateStudentSchema),
  studentController.update,
);

// Link an existing parent to a student — only a school admin.
router.post(
  '/:studentId/parents',
  roleMiddleware(ROLES.SCHOOL_ADMIN),
  validate(studentIdParam, 'params'),
  validate(linkParentSchema),
  studentController.linkParent,
);

export default router;
