// ===========================================================================
// studentService — student reads/writes, always tenant-scoped.
//
// Every function takes an explicit `schoolId` (passed in by the controller
// from req.user.schoolId) and uses `withSchool(Model, schoolId)` so there is
// no code path that can query a student collection unscoped.
//
// NOTE ON ATOMICITY: the parent<->student link is written on both sides in two
// steps. A MongoDB transaction would make that atomic but requires a replica
// set; to keep this foundation runnable on a standalone `mongod` we write
// sequentially and repair drift defensively in relationshipGuard. Swap in a
// `session.withTransaction(...)` here once you run against a replica set/Atlas.
// ===========================================================================
import { ApiError } from '../../common/utils/ApiError.js';
import { withSchool } from '../../common/middleware/schoolScope.js';
import { ROLES } from '../../common/constants.js';
import { Student } from './Student.js';
import { Class } from '../academics/Class.js';
import { Section } from '../academics/Section.js';
import { Parent } from '../parents/Parent.js';
import { Teacher } from '../teachers/Teacher.js';

async function assertClassAndSection(schoolId, classId, sectionId) {
  const cls = await withSchool(Class, schoolId).findOne({ _id: classId });
  if (!cls) throw new ApiError(400, 'classId does not belong to this school.');
  if (sectionId) {
    const section = await withSchool(Section, schoolId).findOne({
      _id: sectionId,
      classId,
    });
    if (!section) {
      throw new ApiError(400, 'sectionId does not belong to that class in this school.');
    }
  }
}

// --- create (SCHOOL_ADMIN) ---------------------------------------------

export async function createStudent(schoolId, input) {
  await assertClassAndSection(schoolId, input.classId, input.sectionId);

  const parentIds = input.parentIds ?? [];
  if (parentIds.length) {
    const found = await withSchool(Parent, schoolId).find({ _id: { $in: parentIds } });
    if (found.length !== parentIds.length) {
      throw new ApiError(400, 'One or more parentIds do not belong to this school.');
    }
  }

  const student = await Student.create({
    schoolId,
    name: input.name,
    classId: input.classId,
    sectionId: input.sectionId ?? null,
    rollNo: input.rollNo,
    parentIds,
  });

  if (parentIds.length) {
    await withSchool(Parent, schoolId).updateMany(
      { _id: { $in: parentIds } },
      { $addToSet: { children: student._id } },
    );
  }

  return student;
}

// --- list (role-aware) ----------------------------------------------- -

export async function listStudents(user, query) {
  const { schoolId, role, id: userId } = user;
  const { page, limit } = query;
  const filter = {};
  if (query.classId) filter.classId = query.classId;
  if (query.sectionId) filter.sectionId = query.sectionId;

  if (role === ROLES.PARENT) {
    const parent = await withSchool(Parent, schoolId).findOne({ userId });
    if (!parent) throw new ApiError(403, 'No parent profile linked to this account.');
    filter._id = { $in: parent.children };
  } else if (role === ROLES.TEACHER) {
    const teacher = await withSchool(Teacher, schoolId).findOne({ userId });
    if (!teacher) throw new ApiError(403, 'No teacher profile linked to this account.');
    const classIds = [...new Set(teacher.classesAssigned.map((a) => String(a.classId)))];

    if (!classIds.length) return { items: [], total: 0, page, limit };
    if (query.classId && !classIds.includes(String(query.classId))) {
      return { items: [], total: 0, page, limit };
    }
    if (!query.classId) filter.classId = { $in: classIds };
  }
  // SCHOOL_ADMIN / SUPER_ADMIN: schoolId filter only.

  const [items, total] = await Promise.all([
    withSchool(Student, schoolId)
      .find(filter)
      .sort({ classId: 1, rollNo: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    withSchool(Student, schoolId).countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

// --- get one -------------------------------------------------------- -
// Row-level authorization already ran in the route (studentAccessGuard).

export async function getStudent(schoolId, studentId) {
  const student = await withSchool(Student, schoolId).findOne({ _id: studentId });
  if (!student) throw new ApiError(404, 'Student not found.');
  return student;
}

// --- update (SCHOOL_ADMIN) ------------------------------------------ -

export async function updateStudent(schoolId, studentId, patch) {
  if (patch.classId || patch.sectionId !== undefined) {
    const target = await withSchool(Student, schoolId).findOne({ _id: studentId });
    if (!target) throw new ApiError(404, 'Student not found.');
    await assertClassAndSection(
      schoolId,
      patch.classId ?? target.classId,
      patch.sectionId === undefined ? target.sectionId : patch.sectionId,
    );
  }

  const student = await withSchool(Student, schoolId).findOneAndUpdate(
    { _id: studentId },
    patch,
    { new: true, runValidators: true },
  );
  if (!student) throw new ApiError(404, 'Student not found.');
  return student;
}

// --- link a parent (SCHOOL_ADMIN) --------------------------------- -

export async function linkParent(schoolId, studentId, parentId) {
  const [student, parent] = await Promise.all([
    withSchool(Student, schoolId).findOne({ _id: studentId }),
    withSchool(Parent, schoolId).findOne({ _id: parentId }),
  ]);
  if (!student) throw new ApiError(404, 'Student not found.');
  if (!parent) throw new ApiError(404, 'Parent not found in this school.');

  await withSchool(Student, schoolId).updateOne(
    { _id: studentId },
    { $addToSet: { parentIds: parentId } },
  );
  await withSchool(Parent, schoolId).updateOne(
    { _id: parentId },
    { $addToSet: { children: studentId } },
  );

  return getStudent(schoolId, studentId);
}
