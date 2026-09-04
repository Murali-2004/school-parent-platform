// ---------------------------------------------------------------------------
// RefreshToken — one row per issued refresh token.
//
//   - Only the SHA-256 `tokenHash` is stored, never the raw token.
//   - Rotation: on refresh, the presented token is revoked and a new row is
//     created; `replacedByHash` links the chain.
//   - Reuse detection: if an ALREADY-REVOKED token is presented, the auth
//     service revokes the user's whole active token set (see authService.js).
//   - `expiresAt` has a TTL index so expired rows self-delete.
//
// This collection is NOT tenant-scoped: lookups are by `tokenHash` and happen
// before we have a trusted school context. `schoolId` is stored for auditing.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },

    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByHash: { type: String, default: null },

    createdByIp: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

// TTL: MongoDB removes the document once `expiresAt` passes.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.virtual('isActive').get(function () {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
});

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
