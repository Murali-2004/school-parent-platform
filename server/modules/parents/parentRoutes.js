// ---------------------------------------------------------------------------
// /api/v1/parents
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { authMiddleware } from '../../common/middleware/authMiddleware.js';
import { schoolScope } from '../../common/middleware/schoolScope.js';
import { roleMiddleware } from '../../common/middleware/roleMiddleware.js';
import { ROLES } from '../../common/constants.js';
import * as parentController from './parentController.js';

const router = Router();

router.use(authMiddleware, schoolScope);

router.get('/me', roleMiddleware(ROLES.PARENT), parentController.getMe);
router.get('/', roleMiddleware(ROLES.SCHOOL_ADMIN), parentController.list);

export default router;
