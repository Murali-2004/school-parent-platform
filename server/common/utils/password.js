// ---------------------------------------------------------------------------
// Password hashing. Uses bcrypt.
//
// NOTE (Windows dev): `bcrypt` is a native module. If `npm install` fails to
// build it on your machine, swap to the pure-JS drop-in replacement:
//   npm remove bcrypt && npm install bcryptjs
// then change the import below to `from 'bcryptjs'`. The API is identical.
// ---------------------------------------------------------------------------
import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';

export function hashPassword(plain) {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
