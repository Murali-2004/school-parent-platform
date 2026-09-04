// ===========================================================================
// tenantPlugin  —  the LAST line of defence for multi-tenant data isolation.
// ===========================================================================
//
// WHY THIS EXISTS
// --------------
// Every tenant-owned collection (User, Teacher, Parent, Student, Class,
// Section, ...) stores a `schoolId`. The rule is: a query must NEVER run
// without a `schoolId` in its filter, otherwise one school could read or
// mutate another school's data.
//
// Relying on developers to "remember to add schoolId" is how tenant leaks
// happen. This plugin makes forgetting *fail loudly*:
//
//   Student.find({ classId })            -> THROWS  (no schoolId in filter)
//   Student.find({ schoolId, classId })  -> OK
//   Student.find().skipTenantGuard()     -> OK, but explicit + greppable
//
// It is deliberately a "defence in depth" layer. The PRIMARY, ergonomic way to
// query is `req.scoped(Model)` from schoolScope.js, which injects schoolId for
// you. This plugin is what catches the code paths where someone bypassed that.
//
// WHAT IT GUARDS
// --------------
//   - all find* / update* / delete* / count* / distinct queries
//   - aggregate() pipelines (must start with `$match: { schoolId }`)
//
// WHAT IT DOES NOT DO
// ------------------
//   - It does not guard `.save()` on a document you already loaded (you can
//     only load a doc through a guarded query in the first place).
//   - It does not stop a developer from passing the WRONG schoolId. That is
//     the job of authMiddleware (schoolId comes from the signed token) and
//     schoolScope (it injects req.user.schoolId, which the client cannot set).
//
// THE ESCAPE HATCH
// ----------------
// `query.skipTenantGuard()` disables the check for one query. It exists for:
//   - auth flows (look up a user by email before we know their school)
//   - SUPER_ADMIN cross-school reporting
// Every call site is greppable in review: search for `skipTenantGuard`.
// ===========================================================================
import mongoose from 'mongoose';

const TENANT_PATH = 'schoolId';

// Query hooks that carry a filter and therefore must be tenant-scoped.
const GUARDED_QUERY_HOOKS = [
  'count',
  'countDocuments',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'update',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
];

function queryGuard(next) {
  // `this` is a mongoose Query here.
  const opts = this.getOptions?.() ?? {};
  if (opts.skipTenantGuard === true) return next();

  const filter = this.getFilter?.() ?? {};
  const hasTenant = filter[TENANT_PATH] !== undefined && filter[TENANT_PATH] !== null;
  if (hasTenant) return next();

  const modelName = this.model?.modelName ?? 'Model';
  return next(
    new Error(
      `[tenantPlugin] Refusing to run "${this.op}" on "${modelName}" without a ` +
        `"${TENANT_PATH}" filter. Use req.scoped(Model) / withSchool(Model, schoolId), ` +
        `or call .skipTenantGuard() for a deliberate cross-tenant query.`,
    ),
  );
}

/**
 * @param {mongoose.Schema} schema
 */
export function tenantPlugin(schema) {
  // 1. Guarantee the tenant field exists and is indexed. If a schema already
  //    declares `schoolId` (e.g. User, where it is nullable for SUPER_ADMIN)
  //    we leave that definition untouched.
  if (!schema.path(TENANT_PATH)) {
    schema.add({
      [TENANT_PATH]: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true,
      },
    });
  }

  // 2. Attach the guard to every read/write query hook.
  for (const hook of GUARDED_QUERY_HOOKS) {
    schema.pre(hook, queryGuard);
  }

  // 3. Guard aggregation pipelines separately (different hook signature).
  schema.pre('aggregate', function aggregateGuard(next) {
    const opts = this.options ?? {};
    if (opts.skipTenantGuard === true) return next();

    const [first] = this.pipeline();
    const ok =
      first &&
      first.$match &&
      first.$match[TENANT_PATH] !== undefined &&
      first.$match[TENANT_PATH] !== null;

    if (ok) return next();
    return next(
      new Error(
        `[tenantPlugin] aggregate() on "${this._model?.modelName ?? 'Model'}" must start ` +
          `with { $match: { schoolId } } (or pass { skipTenantGuard: true } in options).`,
      ),
    );
  });

  // 4. The explicit, greppable escape hatch: `SomeModel.find().skipTenantGuard()`.
  schema.query.skipTenantGuard = function skipTenantGuard() {
    return this.setOptions({ skipTenantGuard: true });
  };
}
