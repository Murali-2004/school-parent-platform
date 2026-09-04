// ---------------------------------------------------------------------------
// /api/v1/teachers
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/authMiddleware.js';
import { schoolScope } from '../../common/middleware/schoolScope.js';
import { roleMiddleware } from '../../common/middleware/roleMiddleware.js';
import { validate } from '../../common/middleware/validate.js';
import { ROLES } from '../../common/constants.js';
import {
  teacherIdParam,
  updateProfileSchema,
  assignmentSchema,
} from './teacherValidation.js';
import * as teacherController from './teacherController.js';

const router = Router();

router.use(authMiddleware, schoolScope);

router.get('/me', roleMiddleware(ROLES.TEACHER), teacherController.getMe);

router.get('/', roleMiddleware(ROLES.SCHOOL_ADMIN), teacherController.list);

router.patch(
  '/:teacherId/subjects',
  roleMiddleware(ROLES.SCHOOL_ADMIN),
  validate(teacherIdParam, 'params'),
  validate(updateProfileSchema),
  teacherController.updateSubjects,
);

router.post(
  '/:teacherId/assignments',
  roleMiddleware(ROLES.SCHOOL_ADMIN),
  validate(teacherIdParam, 'params'),
  validate(assignmentSchema),
  teacherController.addAssignment,
);

router.delete(
  '/:teacherId/assignments',
  roleMiddleware(ROLES.SCHOOL_ADMIN),
  validate(teacherIdParam, 'params'),
  validate(assignmentSchema),
  teacherController.removeAssignment,
);

export default router;
