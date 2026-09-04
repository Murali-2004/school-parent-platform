// ---------------------------------------------------------------------------
// Section — e.g. "5-A". Belongs to a Class within a school.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { tenantPlugin } from '../../common/plugins/tenantPlugin.js';

const sectionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

sectionSchema.index({ schoolId: 1, classId: 1, name: 1 }, { unique: true });

sectionSchema.plugin(tenantPlugin);

export const Section = mongoose.model('Section', sectionSchema);
