// ---------------------------------------------------------------------------
// Parent — profile data for a User whose role is PARENT.
// `children` is one side of the parent<->student link (Student.parentIds is the
// other). relationshipGuard.parentOwnsStudent checks BOTH sides.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { tenantPlugin } from '../../common/plugins/tenantPlugin.js';

const parentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  },
  { timestamps: true },
);

parentSchema.index({ schoolId: 1, userId: 1 }, { unique: true });

parentSchema.plugin(tenantPlugin);

export const Parent = mongoose.model('Parent', parentSchema);
