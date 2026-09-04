// ---------------------------------------------------------------------------
// teacherController
//   - GET  /teachers/me                     (teacher: own profile)
//   - GET  /teachers                        (school admin: list)
//   - PATCH /teachers/:teacherId/subjects   (school admin)
//   - POST /teachers/:teacherId/assignments (school admin: assign a class/section)
//   - DELETE /teachers/:teacherId/assignments (school admin: remove an assignment)
// ---------------------------------------------------------------------------
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { ApiError } from '../../common/utils/ApiError.js';
import { Teacher } from './Teacher.js';
import { Class } from '../academics/Class.js';
import { Section } from '../academics/Section.js';

export const getMe = asyncHandler(async (req, res) => {
  const teacher = await req.scoped(Teacher).findOne({ userId: req.user.id });
  if (!teacher) throw new ApiError(404, 'No teacher profile linked to this account.');
  res.json({ teacher });
});

export const list = asyncHandler(async (req, res) => {
  const items = await req.scoped(Teacher).find().populate('userId', 'name email phone status');
  res.json({ items });
});

export const updateSubjects = asyncHandler(async (req, res) => {
  const teacher = await req.scoped(Teacher).findOneAndUpdate(
    { _id: req.params.teacherId },
    { subjects: req.body.subjects },
    { new: true, runValidators: true },
  );
  if (!teacher) throw new ApiError(404, 'Teacher not found in your school.');
  res.json({ teacher });
});

export const addAssignment = asyncHandler(async (req, res) => {
  const { classId, sectionId } = req.body;

  // The class/section being assigned must exist IN THIS SCHOOL.
  const cls = await req.scoped(Class).findOne({ _id: classId });
  if (!cls) throw new ApiError(400, 'classId does not belong to this school.');
  if (sectionId) {
    const section = await req.scoped(Section).findOne({ _id: sectionId, classId });
    if (!section) throw new ApiError(400, 'sectionId does not belong to that class.');
  }

  const teacher = await req.scoped(Teacher).findOneAndUpdate(
    { _id: req.params.teacherId },
    { $addToSet: { classesAssigned: { classId, sectionId: sectionId ?? null } } },
    { new: true },
  );
  if (!teacher) throw new ApiError(404, 'Teacher not found in your school.');
  res.status(201).json({ teacher });
});

export const removeAssignment = asyncHandler(async (req, res) => {
  const { classId, sectionId } = req.body;
  const teacher = await req.scoped(Teacher).findOneAndUpdate(
    { _id: req.params.teacherId },
    { $pull: { classesAssigned: { classId, sectionId: sectionId ?? null } } },
    { new: true },
  );
  if (!teacher) throw new ApiError(404, 'Teacher not found in your school.');
  res.json({ teacher });
});
