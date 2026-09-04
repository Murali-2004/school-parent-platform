// ---------------------------------------------------------------------------
// User — the authentication identity for every human on the platform.
// Role-specific data lives in Teacher / Parent profile documents.
//
// TENANT NOTE: User gets the tenantPlugin, but `schoolId` is nullable here
// because SUPER_ADMIN belongs to no school. Auth flows that must look a user up
// before the school is known (e.g. login by email) call `.skipTenantGuard()`
// explicitly — see modules/auth/authService.js.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';
import { ROLE_VALUES, USER_STATUS } from '../../common/constants.js';
import { tenantPlugin } from '../../common/plugins/tenantPlugin.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },

    // Never selected by default — controllers must `.select('+passwordHash')`.
    passwordHash: { type: String, required: true, select: false },

    role: { type: String, enum: ROLE_VALUES, required: true },

    // null only for SUPER_ADMIN.
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
  },
  { timestamps: true },
);

// Email is unique PER SCHOOL (the same person could be a parent at two schools).
userSchema.index({ schoolId: 1, email: 1 }, { unique: true });

userSchema.plugin(tenantPlugin);

export const User = mongoose.model('User', userSchema);
