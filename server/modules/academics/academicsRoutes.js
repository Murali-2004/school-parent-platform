// ---------------------------------------------------------------------------
// /api/v1/academics
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/authMiddleware.js';
import { roleMiddleware } from '../../common/middleware/roleMiddleware.js';
import { schoolScope } from '../../common/middleware/schoolScope.js';
import { validate } from '../../common/middleware/validate.js';
import { ROLES } from '../../common/constants.js';
import {
  createClassSchema,
  createSectionSchema,
  listQuery,
} from './academicsValidation.js';
import * as ctrl from './academicsController.js';

const router = Router();

// Every route below is tenant-scoped and admin-only.
router.use(authMiddleware, schoolScope, roleMiddleware(ROLES.SCHOOL_ADMIN));

router.post('/classes', validate(createClassSchema), ctrl.createClass);
router.get('/classes', ctrl.listClasses);

router.post('/sections', validate(createSectionSchema), ctrl.createSection);
router.get('/sections', validate(listQuery, 'query'), ctrl.listSections);

export default router;
