// ---------------------------------------------------------------------------
// Seed script: creates a SUPER_ADMIN, a demo School, and a SCHOOL_ADMIN for it.
// Idempotent — re-running updates passwords but does not duplicate rows.
//
//   npm run seed
//
// Reads SEED_* variables from .env (see .env.example).
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import './../config/env.js'; // loads + validates .env
import { connectDb, disconnectDb } from '../config/db.js';
import { ROLES, USER_STATUS } from '../common/constants.js';
import { hashPassword } from '../common/utils/password.js';
import { School } from '../modules/schools/School.js';
import { User } from '../modules/users/User.js';

const need = (key) => {
  const v = process.env[key];
  if (!v) {
    // eslint-disable-next-line no-console
    console.error(`[seed] missing required env var: ${key}`);
    process.exit(1);
  }
  return v;
};

async function upsertUser({ email, name, role, schoolId, password }) {
  const passwordHash = await hashPassword(password);
  const doc = await User.findOneAndUpdate(
    { email, schoolId: schoolId ?? null },
    {
      $set: { name, role, status: USER_STATUS.ACTIVE, passwordHash },
      $setOnInsert: { email, schoolId: schoolId ?? null },
    },
    { new: true, upsert: true },
  ).skipTenantGuard();
  return doc;
}

async function run() {
  await connectDb();

  // 1. SUPER_ADMIN (no school).
  const superAdmin = await upsertUser({
    email: need('SEED_SUPER_ADMIN_EMAIL'),
    name: 'Platform Super Admin',
    role: ROLES.SUPER_ADMIN,
    schoolId: null,
    password: need('SEED_SUPER_ADMIN_PASSWORD'),
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] SUPER_ADMIN ready: ${superAdmin.email}`);

  // 2. Demo school.
  const school = await School.findOneAndUpdate(
    { name: need('SEED_SCHOOL_NAME') },
    {
      $set: { city: process.env.SEED_SCHOOL_CITY ?? undefined, active: true },
      $setOnInsert: { name: need('SEED_SCHOOL_NAME'), plan: 'FREE' },
    },
    { new: true, upsert: true },
  );
  // eslint-disable-next-line no-console
  console.log(`[seed] School ready: ${school.name} (${school._id})`);

  // 3. SCHOOL_ADMIN for the demo school.
  const schoolAdmin = await upsertUser({
    email: need('SEED_SCHOOL_ADMIN_EMAIL'),
    name: 'Demo School Admin',
    role: ROLES.SCHOOL_ADMIN,
    schoolId: school._id,
    password: need('SEED_SCHOOL_ADMIN_PASSWORD'),
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] SCHOOL_ADMIN ready: ${schoolAdmin.email} (school ${school._id})`);

  await disconnectDb();
  // eslint-disable-next-line no-console
  console.log('[seed] done.');
  process.exit(0);
}

run().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
