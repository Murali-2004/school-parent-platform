// ---------------------------------------------------------------------------
// academicsController — Class & Section management for a SCHOOL_ADMIN.
//
// Every query goes through `req.scoped(...)` / `req.tenantFilter(...)` so the
// caller's schoolId (from their token) is always applied. Never call
// `Class.find()` / `Section.find()` directly here — the tenantPlugin would
// throw anyway, but the point is to not tempt it.
// ---------------------------------------------------------------------------
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { ApiError } from '../../common/utils/ApiError.js';
import { Class } from './Class.js';
import { Section } from './Section.js';

// --- classes -----------------------------------------------------------

export const createClass = asyncHandler(async (req, res) => {
  const doc = await Class.create(req.tenantFilter({ name: req.body.name }));
  res.status(201).json({ class: doc });
});

export const listClasses = asyncHandler(async (req, res) => {
  const items = await req.scoped(Class).find().sort({ name: 1 });
  res.json({ items });
});

// --- sections --------------------------------------------------------- -

export const createSection = asyncHandler(async (req, res) => {
  const { classId, name } = req.body;

  // The referenced class must exist IN THIS SCHOOL.
  const parentClass = await req.scoped(Class).findOne({ _id: classId });
  if (!parentClass) throw new ApiError(404, 'Class not found in your school.');

  const doc = await Section.create(req.tenantFilter({ classId, name }));
  res.status(201).json({ section: doc });
});

export const listSections = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.classId) filter.classId = req.query.classId;
  const items = await req.scoped(Section).find(filter).sort({ name: 1 });
  res.json({ items });
});
