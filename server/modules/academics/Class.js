// ---------------------------------------------------------------------------
// Class — e.g. "Grade 5". Scoped to a school. Sections hang off a Class.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { tenantPlugin } from '../../common/plugins/tenantPlugin.js';

const classSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

classSchema.index({ schoolId: 1, name: 1 }, { unique: true });

classSchema.plugin(tenantPlugin);

export const Class = mongoose.model('Class', classSchema);
