// ---------------------------------------------------------------------------
// Model registry. Importing this module once (server.js does) guarantees every
// Mongoose model is registered before any `ref` is resolved or index is built.
// Modules may also import models directly from their own folder.
// ---------------------------------------------------------------------------
export { School } from '../modules/schools/School.js';
export { User } from '../modules/users/User.js';
export { RefreshToken } from '../modules/users/RefreshToken.js';
export { Teacher } from '../modules/teachers/Teacher.js';
export { Parent } from '../modules/parents/Parent.js';
export { Student } from '../modules/students/Student.js';
export { Class } from '../modules/academics/Class.js';
export { Section } from '../modules/academics/Section.js';
