// ---------------------------------------------------------------------------
// Student — belongs to exactly one school, one class, and (optionally) one
// section. `parentIds` is one side of the parent<->student link.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { tenantPlugin } from '../../common/plugins/tenantPlugin.js';

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
      index: true,
    },
    rollNo: { type: String, trim: true },
    parentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Parent' }],
  },
  { timestamps: true },
);

// Roll numbers are unique within a class+section of a school (when present).
studentSchema.index(
  { schoolId: 1, classId: 1, sectionId: 1, rollNo: 1 },
  { unique: true, partialFilterExpression: { rollNo: { $type: 'string' } } },
);

studentSchema.plugin(tenantPlugin);

export const Student = mongoose.model('Student', studentSchema);
