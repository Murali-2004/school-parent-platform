// ===========================================================================
// relationshipGuard  —  ROW-LEVEL authorization ("is this MINE?").
// ===========================================================================
//
// schoolScope answers "is this row in my school?".
// roleMiddleware answers "is my role allowed on this route?".
// relationshipGuard answers the remaining question:
//
//     "Even within my school, am I ALLOWED to touch THIS specific student /
//      class / section?"
//
//   - A PARENT may only touch a Student they are linked to.
//   - A TEACHER may only touch a Class/Section they are assigned to (and,
//     transitively, the Students in those classes).
//   - SCHOOL_ADMIN may touch any row in their own school (schoolScope already
//     constrains them to it), so these guards pass them through.
//   - SUPER_ADMIN passes through entirely.
//
// HOW THE PARENT<->STUDENT LINK IS CHECKED
// ---------------------------------------
// The link is stored redundantly on BOTH sides:
//     Parent.children : [Student _id]
//     Student.parentIds : [Parent _id]
// We treat the parent as authorized if EITHER side records the link (defensive:
// a half-written link from a bug still fails safe-ish, and we log a warning).
// Both documents are loaded with an explicit schoolId filter so a parent from
// School A can never resolve a student in School B even if IDs are guessed.
//
// HOW THE TEACHER<->CLASS LINK IS CHECKED
// --------------------------------------
//     Teacher.classesAssigned : [{ classId, sectionId? }]
// A teacher is authorized for a (classId[, sectionId]) pair if their
// assignments contain a matching entry. If the route supplies a sectionId it
// must match; if it only supplies a classId, any assignment to that class is
// enough.
//
// USAGE
// -----
//   router.get('/students/:studentId',
//     authMiddleware, schoolScope,
//     studentAccessGuard({ from: 'params', key: 'studentId' }),
//     studentController.getById);
//
//   router.post('/announcements',
//     authMiddleware, schoolScope,
//     teacherAssignedToClass({ from: 'body' }),
//     announcementController.create);
// ===========================================================================
import { ROLES } from '../constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Parent } from '../../modules/parents/Parent.js';
import { Teacher } from '../../modules/teachers/Teacher.js';
import { Student } from '../../modules/students/Student.js';

// --- helpers ---------------------------------------------------------------

const readKey = (req, from, key) => {
  const bag = from === 'params' ? req.params : from === 'query' ? req.query : req.body;
  return bag?.[key];
};

const isAdmin = (role) => role === ROLES.SUPER_ADMIN || role === ROLES.SCHOOL_ADMIN;

const idEquals = (a, b) => a != null && b != null && String(a) === String(b);

/**
 * Load the Parent profile row for the logged-in user, scoped to their school.
 * Cached on req so multiple guards in one request don't re-query.
 */
async function loadParentProfile(req) {
  if (req.parentProfile) return req.parentProfile;
  const parent = await Parent.findOne({
    userId: req.user.id,
    schoolId: req.user.schoolId,
  });
  if (!parent) throw new ApiError(403, 'No parent profile is linked to this account.');
  req.parentProfile = parent;
  return parent;
}

async function loadTeacherProfile(req) {
  if (req.teacherProfile) return req.teacherProfile;
  const teacher = await Teacher.findOne({
    userId: req.user.id,
    schoolId: req.user.schoolId,
  });
  if (!teacher) throw new ApiError(403, 'No teacher profile is linked to this account.');
  req.teacherProfile = teacher;
  return teacher;
}

// --- PARENT owns STUDENT --------------------------------------------------

/**
 * Verify the logged-in parent is linked to the referenced student.
 * On success, attaches `req.student` and `req.parentProfile`.
 *
 * @param {{ from?: 'params'|'body'|'query', key?: string }} [opts]
 */
export const parentOwnsStudent = ({ from = 'params', key = 'studentId' } = {}) =>
  asyncHandler(async (req, _res, next) => {
    const { role } = req.user;

    // Admins are already tenant-constrained by schoolScope.
    if (isAdmin(role)) return next();
    if (role !== ROLES.PARENT) {
      throw new ApiError(403, 'This action is only available to parent accounts.');
    }

    const studentId = readKey(req, from, key);
    if (!studentId) throw new ApiError(400, `Missing "${key}".`);

    const parent = await loadParentProfile(req);

    // schoolId filter here is what prevents cross-tenant ID guessing.
    const student = await Student.findOne({ _id: studentId, schoolId: req.user.schoolId });
    if (!student) throw new ApiError(404, 'Student not found in your school.');

    const linkedViaParent = parent.children.some((childId) => idEquals(childId, student._id));
    const linkedViaStudent = student.parentIds.some((pId) => idEquals(pId, parent._id));

    if (!linkedViaParent && !linkedViaStudent) {
      throw new ApiError(403, 'You are not linked to this student.');
    }
    if (linkedViaParent !== linkedViaStudent) {
      // eslint-disable-next-line no-console
      console.warn(
        `[relationshipGuard] half-written parent<->student link: parent=${parent._id} student=${student._id}`,
      );
    }

    req.student = student;
    next();
  });

// --- TEACHER assigned to CLASS / SECTION --------------------------------- -

/**
 * Verify the logged-in teacher is assigned to the referenced class (and
 * section, if one is supplied). On success attaches `req.teacherProfile`.
 *
 * @param {{ from?: 'params'|'body'|'query', classKey?: string, sectionKey?: string }} [opts]
 */
export const teacherAssignedToClass = ({
  from = 'body',
  classKey = 'classId',
  sectionKey = 'sectionId',
} = {}) =>
  asyncHandler(async (req, _res, next) => {
    const { role } = req.user;

    if (isAdmin(role)) return next();
    if (role !== ROLES.TEACHER) {
      throw new ApiError(403, 'This action is only available to teacher accounts.');
    }

    const classId = readKey(req, from, classKey);
    const sectionId = readKey(req, from, sectionKey);
    if (!classId) throw new ApiError(400, `Missing "${classKey}".`);

    const teacher = await loadTeacherProfile(req);

    const assigned = teacher.classesAssigned.some((a) => {
      if (!idEquals(a.classId, classId)) return false;
      if (!sectionId) return true; // class-level match is enough
      return idEquals(a.sectionId, sectionId);
    });

    if (!assigned) {
      throw new ApiError(403, 'You are not assigned to this class/section.');
    }

    next();
  });

/**
 * Verify the logged-in teacher teaches the class the referenced student is in.
 * Combines "load student" + "teacher assigned to student's class".
 * On success attaches `req.student` and `req.teacherProfile`.
 */
export const teacherTeachesStudent = ({ from = 'params', key = 'studentId' } = {}) =>
  asyncHandler(async (req, _res, next) => {
    const { role } = req.user;

    if (isAdmin(role)) return next();
    if (role !== ROLES.TEACHER) {
      throw new ApiError(403, 'This action is only available to teacher accounts.');
    }

    const studentId = readKey(req, from, key);
    if (!studentId) throw new ApiError(400, `Missing "${key}".`);

    const student = await Student.findOne({ _id: studentId, schoolId: req.user.schoolId });
    if (!student) throw new ApiError(404, 'Student not found in your school.');

    const teacher = await loadTeacherProfile(req);
    const assigned = teacher.classesAssigned.some((a) => {
      if (!idEquals(a.classId, student.classId)) return false;
      // If the assignment is section-scoped, the student's section must match.
      if (a.sectionId) return idEquals(a.sectionId, student.sectionId);
      return true;
    });

    if (!assigned) {
      throw new ApiError(403, 'You do not teach this student’s class.');
    }

    req.student = student;
    next();
  });

/**
 * Role-dispatching convenience guard for "read/act on one student":
 *   - admin  -> allowed (schoolScope already constrains to their school)
 *   - parent -> must be linked to the student
 *   - teacher-> must teach the student's class
 */
export const studentAccessGuard = ({ from = 'params', key = 'studentId' } = {}) =>
  asyncHandler(async (req, res, next) => {
    const { role } = req.user;
    if (isAdmin(role)) return next();
    if (role === ROLES.PARENT) return parentOwnsStudent({ from, key })(req, res, next);
    if (role === ROLES.TEACHER) return teacherTeachesStudent({ from, key })(req, res, next);
    return next(new ApiError(403, 'Not allowed.'));
  });
