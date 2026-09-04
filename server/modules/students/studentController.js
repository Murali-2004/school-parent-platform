// ---------------------------------------------------------------------------
// studentController — thin HTTP layer. All tenant scoping + row-level checks
// happen in middleware (schoolScope, studentAccessGuard) and studentService.
// ---------------------------------------------------------------------------
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as studentService from './studentService.js';

export const create = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.user.schoolId, req.body);
  res.status(201).json({ student });
});

export const list = asyncHandler(async (req, res) => {
  const result = await studentService.listStudents(req.user, req.query);
  res.json(result);
});

export const getById = asyncHandler(async (req, res) => {
  const student = await studentService.getStudent(
    req.user.schoolId,
    req.params.studentId,
  );
  res.json({ student });
});

export const update = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudent(
    req.user.schoolId,
    req.params.studentId,
    req.body,
  );
  res.json({ student });
});

export const linkParent = asyncHandler(async (req, res) => {
  const student = await studentService.linkParent(
    req.user.schoolId,
    req.params.studentId,
    req.body.parentId,
  );
  res.json({ student });
});
