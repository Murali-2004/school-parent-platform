// ---------------------------------------------------------------------------
// validate(schema, target) — Zod request validation middleware.
//
//   router.post('/login', validate(loginSchema), authController.login);
//   router.get('/students', validate(listStudentsQuery, 'query'), ...);
//
// On success the parsed (and coerced/defaulted) value REPLACES req[target],
// so controllers always see clean, typed data.
// On failure it forwards a 422 ApiError with the flattened Zod issues.
// ---------------------------------------------------------------------------
import { ApiError } from '../utils/ApiError.js';

export const validate =
  (schema, target = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(new ApiError(422, 'Validation failed', result.error.flatten()));
    }
    // req.query is a getter-only in some Express versions — assign defensively.
    try {
      req[target] = result.data;
    } catch {
      Object.defineProperty(req, target, { value: result.data, configurable: true });
    }
    next();
  };
