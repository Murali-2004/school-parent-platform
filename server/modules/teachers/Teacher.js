// ---------------------------------------------------------------------------
// Teacher — profile + assignment data for a User whose role is TEACHER.
// `classesAssigned` is the source of truth for teacherAssignedToClass /
// teacherTeachesStudent authorization checks.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { tenantPlugin } from '../../common/plugins/tenantPlugin.js';

const assignmentSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    // Optional: an assignment can be class-wide (no section) or section-scoped.
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  },
  { _id: false },
);

const teacherSchema = new mongoose.Schema(
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
    subjects: [{ type: String, trim: true }],
    classesAssigned: { type: [assignmentSchema], default: [] },
  },
  { timestamps: true },
);

teacherSchema.index({ schoolId: 1, userId: 1 }, { unique: true });

teacherSchema.plugin(tenantPlugin);

export const Teacher = mongoose.model('Teacher', teacherSchema);
