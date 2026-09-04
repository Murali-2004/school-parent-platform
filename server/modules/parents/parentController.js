// ---------------------------------------------------------------------------
// parentController
//   - GET /parents/me         (parent: own profile + linked children ids)
//   - GET /parents            (school admin: list)
// ---------------------------------------------------------------------------
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { ApiError } from '../../common/utils/ApiError.js';
import { Parent } from './Parent.js';

export const getMe = asyncHandler(async (req, res) => {
  const parent = await req
    .scoped(Parent)
    .findOne({ userId: req.user.id })
    .populate('children', 'name classId sectionId rollNo');
  if (!parent) throw new ApiError(404, 'No parent profile linked to this account.');
  res.json({ parent });
});

export const list = asyncHandler(async (req, res) => {
  const items = await req
    .scoped(Parent)
    .find()
    .populate('userId', 'name email phone status');
  res.json({ items });
});
