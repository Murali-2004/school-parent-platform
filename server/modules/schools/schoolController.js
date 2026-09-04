// ---------------------------------------------------------------------------
// schoolController — SUPER_ADMIN manages the tenant list; a SCHOOL_ADMIN may
// read only their own school.
//
// `School` has no tenantPlugin (it is the tenant root), so queries here are
// plain Mongoose calls guarded purely by roleMiddleware + explicit id checks.
// ---------------------------------------------------------------------------
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { ApiError } from '../../common/utils/ApiError.js';
import { ROLES } from '../../common/constants.js';
import { School } from './School.js';

export const create = asyncHandler(async (req, res) => {
  const school = await School.create(req.body);
  res.status(201).json({ school });
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, active } = req.query;
  const filter = {};
  if (active !== undefined) filter.active = active;

  const [items, total] = await Promise.all([
    School.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    School.countDocuments(filter),
  ]);

  res.json({ items, page, limit, total });
});

export const getById = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;

  // A SCHOOL_ADMIN may only read their OWN school.
  if (req.user.role === ROLES.SCHOOL_ADMIN && String(req.user.schoolId) !== schoolId) {
    throw new ApiError(403, 'You can only view your own school.');
  }

  const school = await School.findById(schoolId);
  if (!school) throw new ApiError(404, 'School not found.');
  res.json({ school });
});

export const update = asyncHandler(async (req, res) => {
  const school = await School.findByIdAndUpdate(req.params.schoolId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!school) throw new ApiError(404, 'School not found.');
  res.json({ school });
});
