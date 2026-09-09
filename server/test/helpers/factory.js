// ===========================================================================
// Test data factories. These write directly through the models (not the HTTP
// API) so a test can arrange a scenario in a few lines. Links are written on
// both sides, exactly like the seed script.
// ===========================================================================
import { School } from '../../modules/schools/School.js';
import { User } from '../../modules/users/User.js';
import { Teacher } from '../../modules/teachers/Teacher.js';
import { Parent } from '../../modules/parents/Parent.js';
import { Student } from '../../modules/students/Student.js';
import { Class } from '../../modules/academics/Class.js';
import { Section } from '../../modules/academics/Section.js';
import { ROLES } from '../../common/constants.js';
import { hashPassword } from '../../common/utils/password.js';
import { signAccessToken } from '../../common/utils/jwt.js';

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter += 1)}`;

export async function makeSchool(overrides = {}) {
  return School.create({ name: `School ${uniq()}`, city: 'Testville', ...overrides });
}

export async function makeUser({ role, schoolId, email, password = 'password123', ...rest }) {
  const user = await User.create({
    name: rest.name ?? `${role} ${uniq()}`,
    email: email ?? `${role.toLowerCase()}.${uniq()}@example.test`,
    passwordHash: await hashPassword(password),
    role,
    schoolId: schoolId ?? null,
    ...rest,
  });
  return { user, password, token: signAccessToken(user) };
}

export async function makeSchoolAdmin(schoolId, overrides = {}) {
  return makeUser({ role: ROLES.SCHOOL_ADMIN, schoolId, ...overrides });
}

export async function makeClassWithSection(schoolId, className = 'Grade 1', sectionName = 'A') {
  const klass = await Class.create({ schoolId, name: `${className} ${uniq()}` });
  const section = await Section.create({ schoolId, classId: klass._id, name: sectionName });
  return { klass, section };
}

export async function makeTeacher(schoolId, { classesAssigned = [], subjects = [] } = {}) {
  const auth = await makeUser({ role: ROLES.TEACHER, schoolId });
  const teacher = await Teacher.create({
    userId: auth.user._id,
    schoolId,
    subjects,
    classesAssigned,
  });
  return { ...auth, teacher };
}

/** Creates a Parent (+ user) and any number of Students, linked on both sides. */
export async function makeParentWithChildren(schoolId, { klass, section }, childNames = ['Kid']) {
  const auth = await makeUser({ role: ROLES.PARENT, schoolId });
  const parent = await Parent.create({ userId: auth.user._id, schoolId, children: [] });

  const students = [];
  for (const name of childNames) {
    const student = await Student.create({
      schoolId,
      name,
      classId: klass._id,
      sectionId: section?._id ?? null,
      rollNo: `R${uniq()}`,
      parentIds: [parent._id],
    });
    students.push(student);
  }
  parent.children = students.map((s) => s._id);
  await parent.save();

  return { ...auth, parent, students };
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
