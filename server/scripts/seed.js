// ===========================================================================
// Pilot-school seed script.   Run:  npm run seed        (idempotent)
//                                   npm run seed -- --fresh   (destructive)
// ===========================================================================
//
// Creates a complete, internally-consistent pilot school for testing:
//
//   1x School            "Greenwood International School"
//   1x SCHOOL_ADMIN      admin@greenwood.test
//   2x Class             Grade 1, Grade 2
//   3x Section           Grade 1-A, Grade 1-B, Grade 2-A
//   2x Teacher (+users)  Anita Rao (Grade 1 A/B), Vikram Singh (Grade 2 A)
//   2x Parent  (+users)  Meera Nair, Rohan Gupta
//   3x Student           Aarav Nair (1-A), Diya Nair (1-B), Kabir Gupta (2-A)
//
// Every parent<->student link is written on BOTH sides (Parent.children and
// Student.parentIds) so the data is consistent for relationshipGuard.
//
// IDEMPOTENT by default: re-running matches existing rows on their natural keys
// (school name, email, class name, roll number, ...) and updates them in place.
// It will NOT create duplicates and is safe to run repeatedly.
//
// DESTRUCTIVE with `--fresh` (or SEED_FRESH=true): first deletes every document
// belonging to the pilot school (scoped by schoolId — other schools and the
// SUPER_ADMIN are never touched), waits 3s, then re-seeds from scratch.
//
// All seeded users share one password: SEED_DEFAULT_PASSWORD (default below).
// Optionally also upserts a SUPER_ADMIN if SEED_SUPER_ADMIN_EMAIL is set.
// ===========================================================================
import mongoose from 'mongoose';
import './../config/env.js'; // loads + validates .env
import { connectDb, disconnectDb } from '../config/db.js';
import { ROLES, USER_STATUS } from '../common/constants.js';
import { hashPassword } from '../common/utils/password.js';
import { School } from '../modules/schools/School.js';
import { User } from '../modules/users/User.js';
import { Class } from '../modules/academics/Class.js';
import { Section } from '../modules/academics/Section.js';
import { Teacher } from '../modules/teachers/Teacher.js';
import { Parent } from '../modules/parents/Parent.js';
import { Student } from '../modules/students/Student.js';

const FRESH = process.argv.includes('--fresh') || process.env.SEED_FRESH === 'true';
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Pilot@12345';

// --- pilot dataset --------------------------------------------------------

const PILOT = {
  school: { name: 'Greenwood International School', city: 'Bengaluru', plan: 'PRO' },
  admin: { name: 'Grace Admin', email: 'admin@greenwood.test' },
  classes: [
    { name: 'Grade 1', sections: ['A', 'B'] },
    { name: 'Grade 2', sections: ['A'] },
  ],
  teachers: [
    {
      name: 'Anita Rao',
      email: 'anita.rao@greenwood.test',
      subjects: ['English', 'EVS'],
      assign: [
        ['Grade 1', 'A'],
        ['Grade 1', 'B'],
      ],
    },
    {
      name: 'Vikram Singh',
      email: 'vikram.singh@greenwood.test',
      subjects: ['Mathematics', 'Science'],
      assign: [['Grade 2', 'A']],
    },
  ],
  parents: [
    { name: 'Meera Nair', email: 'meera.nair@greenwood.test' },
    { name: 'Rohan Gupta', email: 'rohan.gupta@greenwood.test' },
  ],
  students: [
    { name: 'Aarav Nair', klass: 'Grade 1', section: 'A', rollNo: '1', parents: ['meera.nair@greenwood.test'] },
    { name: 'Diya Nair', klass: 'Grade 1', section: 'B', rollNo: '2', parents: ['meera.nair@greenwood.test'] },
    { name: 'Kabir Gupta', klass: 'Grade 2', section: 'A', rollNo: '1', parents: ['rohan.gupta@greenwood.test'] },
  ],
};

// --- helpers -------------------------------------------------------------

/** Upsert on a natural-key filter. Natural key goes in `filter`, everything
 *  else in `set`. Never put the same field in both (Mongo upsert conflict). */
async function upsert(Model, filter, set) {
  const update = Object.keys(set).length ? { $set: set } : {};
  return Model.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });
}

async function upsertUser({ email, name, role, schoolId }) {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  // schoolId is part of the unique key -> keep it in the filter only.
  // SUPER_ADMIN has schoolId null, so the filter carries a null and we must
  // opt the tenant guard out for that one lookup.
  const query = User.findOneAndUpdate(
    { email, schoolId: schoolId ?? null },
    { $set: { name, role, status: USER_STATUS.ACTIVE, passwordHash } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  if (schoolId == null) query.skipTenantGuard();
  return query;
}

async function wipePilotSchool() {
  const existing = await School.findOne({ name: PILOT.school.name });
  if (!existing) {
    console.warn('[seed] --fresh: no existing pilot school to delete.');
    return;
  }
  const schoolId = existing._id;
  console.warn(
    `[seed] --fresh: DELETING all data for "${PILOT.school.name}" (${schoolId}). ` +
      'Other schools and SUPER_ADMIN are untouched. Ctrl-C now to abort...',
  );
  await new Promise((r) => setTimeout(r, 3000));

  const results = await Promise.all([
    Student.deleteMany({ schoolId }),
    Section.deleteMany({ schoolId }),
    Class.deleteMany({ schoolId }),
    Teacher.deleteMany({ schoolId }),
    Parent.deleteMany({ schoolId }),
    User.deleteMany({ schoolId }),
    School.deleteOne({ _id: schoolId }),
  ]);
  const deleted = results.reduce((n, r) => n + (r.deletedCount ?? 0), 0);
  console.warn(`[seed] --fresh: removed ${deleted} documents.`);
}

// --- main --------------------------------------------------------------

async function run() {
  await connectDb();

  if (FRESH) await wipePilotSchool();

  // Optional SUPER_ADMIN (only if you set the env var).
  if (process.env.SEED_SUPER_ADMIN_EMAIL) {
    const su = await upsertUser({
      email: process.env.SEED_SUPER_ADMIN_EMAIL,
      name: 'Platform Super Admin',
      role: ROLES.SUPER_ADMIN,
      schoolId: null,
    });
    console.log(`[seed] SUPER_ADMIN         ${su.email}`);
  }

  // 1. School
  const school = await upsert(
    School,
    { name: PILOT.school.name },
    { city: PILOT.school.city, plan: PILOT.school.plan, active: true },
  );
  const schoolId = school._id;
  console.log(`[seed] School              ${school.name} (${schoolId})`);

  // 2. School admin
  const admin = await upsertUser({
    email: PILOT.admin.email,
    name: PILOT.admin.name,
    role: ROLES.SCHOOL_ADMIN,
    schoolId,
  });
  console.log(`[seed] SCHOOL_ADMIN        ${admin.email}`);

  // 3. Classes + sections. Build lookup maps: "Grade 1" -> classDoc,
  //    "Grade 1|A" -> sectionDoc.
  const classByName = new Map();
  const sectionByKey = new Map();
  for (const c of PILOT.classes) {
    const classDoc = await upsert(Class, { schoolId, name: c.name }, {});
    classByName.set(c.name, classDoc);
    for (const sName of c.sections) {
      const sectionDoc = await upsert(
        Section,
        { schoolId, classId: classDoc._id, name: sName },
        {},
      );
      sectionByKey.set(`${c.name}|${sName}`, sectionDoc);
    }
  }
  console.log(
    `[seed] Classes/Sections    ${classByName.size} classes, ${sectionByKey.size} sections`,
  );

  // 4. Teachers (+ their user rows + class assignments)
  for (const t of PILOT.teachers) {
    const user = await upsertUser({
      email: t.email,
      name: t.name,
      role: ROLES.TEACHER,
      schoolId,
    });
    const classesAssigned = t.assign.map(([cName, sName]) => ({
      classId: classByName.get(cName)._id,
      sectionId: sectionByKey.get(`${cName}|${sName}`)?._id ?? null,
    }));
    await upsert(
      Teacher,
      { schoolId, userId: user._id },
      { subjects: t.subjects, classesAssigned },
    );
    console.log(`[seed] TEACHER             ${t.email}  [${t.subjects.join(', ')}]`);
  }

  // 5. Parents (+ their user rows). children[] is filled in step 6.
  const parentByEmail = new Map();
  for (const p of PILOT.parents) {
    const user = await upsertUser({
      email: p.email,
      name: p.name,
      role: ROLES.PARENT,
      schoolId,
    });
    const parentDoc = await upsert(Parent, { schoolId, userId: user._id }, {});
    parentByEmail.set(p.email, parentDoc);
    console.log(`[seed] PARENT              ${p.email}`);
  }

  // 6. Students — set parentIds explicitly, then reconcile Parent.children so
  //    BOTH sides of every link agree.
  const childrenByParent = new Map(); // parentId(str) -> Set(studentId str)
  for (const s of PILOT.students) {
    const classDoc = classByName.get(s.klass);
    const sectionDoc = sectionByKey.get(`${s.klass}|${s.section}`);
    const parentIds = s.parents.map((email) => parentByEmail.get(email)._id);

    const studentDoc = await upsert(
      Student,
      { schoolId, classId: classDoc._id, sectionId: sectionDoc._id, rollNo: s.rollNo },
      { name: s.name, parentIds },
    );

    for (const pid of parentIds) {
      const key = String(pid);
      if (!childrenByParent.has(key)) childrenByParent.set(key, new Set());
      childrenByParent.get(key).add(String(studentDoc._id));
    }
    console.log(
      `[seed] STUDENT             ${s.name}  (${s.klass}-${s.section}, roll ${s.rollNo})`,
    );
  }

  for (const [parentId, studentIdSet] of childrenByParent) {
    await Parent.updateOne(
      { _id: parentId, schoolId },
      { $set: { children: [...studentIdSet].map((id) => new mongoose.Types.ObjectId(id)) } },
    );
  }

  // --- summary ---------------------------------------------------------
  console.log('\n[seed] done. Pilot school ready.\n');
  console.log('  Login (all seeded users share this password):');
  console.log(`    password: ${DEFAULT_PASSWORD}`);
  console.log('  Accounts:');
  console.log(`    SCHOOL_ADMIN  ${PILOT.admin.email}`);
  for (const t of PILOT.teachers) console.log(`    TEACHER       ${t.email}`);
  for (const p of PILOT.parents) console.log(`    PARENT        ${p.email}`);
  console.log(`\n  schoolId: ${schoolId}\n`);

  await disconnectDb();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
