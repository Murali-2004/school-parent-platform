// ---------------------------------------------------------------------------
// API router — mounts every feature module under /api/v1.
// Each module owns its own sub-router; this file just wires them together.
// ---------------------------------------------------------------------------
import { Router } from 'express';

import authRoutes from '../modules/auth/authRoutes.js';
import schoolRoutes from '../modules/schools/schoolRoutes.js';
import academicsRoutes from '../modules/academics/academicsRoutes.js';
import teacherRoutes from '../modules/teachers/teacherRoutes.js';
import parentRoutes from '../modules/parents/parentRoutes.js';
import studentRoutes from '../modules/students/studentRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

router.use('/auth', authRoutes);
router.use('/schools', schoolRoutes);
router.use('/academics', academicsRoutes);
router.use('/teachers', teacherRoutes);
router.use('/parents', parentRoutes);
router.use('/students', studentRoutes);

export default router;
