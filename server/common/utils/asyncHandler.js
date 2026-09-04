// ---------------------------------------------------------------------------
// Wrap an async route handler / middleware so rejected promises are forwarded
// to Express' error pipeline instead of crashing the process.
//
//   router.get('/', asyncHandler(async (req, res) => { ... }));
// ---------------------------------------------------------------------------

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
