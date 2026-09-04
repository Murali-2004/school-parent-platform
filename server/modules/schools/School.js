// ---------------------------------------------------------------------------
// School — the tenant root. Every other tenant-owned document points back here
// via `schoolId`. School itself is NOT tenant-scoped (it has no schoolId and
// does not get the tenantPlugin); only SUPER_ADMIN manages this collection.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { SCHOOL_PLANS } from '../../common/constants.js';

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    plan: { type: String, enum: SCHOOL_PLANS, default: 'FREE' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }, // adds createdAt + updatedAt
);

schoolSchema.index({ name: 1, city: 1 });

export const School = mongoose.model('School', schoolSchema);
