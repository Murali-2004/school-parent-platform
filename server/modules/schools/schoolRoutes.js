// ---------------------------------------------------------------------------
// /api/v1/schools
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/authMiddleware.js';
import { roleMiddleware } from '../../common/middleware/roleMiddleware.js';
import { validate } from '../../common/middleware/validate.js';
import { ROLES } from '../../common/constants.js';
import {
  createSchoolSchema,
  updateSchoolSchema,
  listSchoolsQuery,
} from './schoolValidation.js';
import * as schoolController from './schoolController.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  roleMiddleware(ROLES.SUPER_ADMIN),
  validate(createSchoolSchema),
  schoolController.create,
);

router.get(
  '/',
  roleMiddleware(ROLES.SUPER_ADMIN),
  validate(listSchoolsQuery, 'query'),
  schoolController.list,
);

router.get(
  '/:schoolId',
  roleMiddleware(ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN),
  schoolController.getById,
);

router.patch(
  '/:schoolId',
  roleMiddleware(ROLES.SUPER_ADMIN),
  validate(updateSchoolSchema),
  schoolController.update,
);

export default router;
