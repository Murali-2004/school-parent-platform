// ===========================================================================
// authService — all auth business logic. Controllers stay thin.
//
// TENANT NOTE: this is one of the few places that legitimately queries User
// WITHOUT a schoolId filter — we look people up by email/id before we have a
// trusted school context. Every such query calls `.skipTenantGuard()`
// explicitly so it is obvious and greppable in review.
// ===========================================================================
import { ROLES, USER_STATUS } from '../../common/constants.js';
import { ApiError } from '../../common/utils/ApiError.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiryDate,
} from '../../common/utils/jwt.js';
import { School } from '../schools/School.js';
import { User } from '../users/User.js';
import { RefreshToken } from '../users/RefreshToken.js';
import { Parent } from '../parents/Parent.js';
import { Teacher } from '../teachers/Teacher.js';

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    schoolId: user.schoolId ? String(user.schoolId) : null,
    status: user.status,
  };
}

/** Issue an access token + a NEW refresh-token row. */
async function issueTokenPair(user, meta = {}) {
  const accessToken = signAccessToken(user);
  const { raw, hash } = generateRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hash,
    schoolId: user.schoolId ?? null,
    expiresAt: refreshTokenExpiryDate(),
    createdByIp: meta.ip,
    userAgent: meta.userAgent,
  });

  return { accessToken, refreshToken: raw, user: publicUser(user) };
}

// --- register ------------------------------------------------------------

export async function registerUser(input, meta) {
  const school = await School.findById(input.schoolId);
  if (!school || !school.active) {
    throw new ApiError(400, 'Invalid or inactive school.');
  }

  const existing = await User.findOne({
    schoolId: school._id,
    email: input.email,
  }).skipTenantGuard(); // schoolId IS in the filter, but be explicit anyway
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists for this school.');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    role: input.role,
    schoolId: school._id,
    status: USER_STATUS.ACTIVE,
  });

  // Create the role-specific profile row so relationshipGuard has something to
  // check against later.
  if (user.role === ROLES.PARENT) {
    await Parent.create({ userId: user._id, schoolId: school._id, children: [] });
  } else if (user.role === ROLES.TEACHER) {
    await Teacher.create({
      userId: user._id,
      schoolId: school._id,
      subjects: [],
      classesAssigned: [],
    });
  }

  return issueTokenPair(user, meta);
}

// --- login --------------------------------------------------------------

export async function loginUser({ email, password, schoolId }, meta) {
  const filter = { email };
  if (schoolId) filter.schoolId = schoolId;

  // Cross-tenant lookup by email is intentional here.
  const matches = await User.find(filter).select('+passwordHash').skipTenantGuard();

  if (matches.length === 0) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (matches.length > 1) {
    throw new ApiError(
      409,
      'This email is registered at more than one school. Include "schoolId" to sign in.',
    );
  }

  const user = matches[0];
  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(403, `Account is ${user.status.toLowerCase()}.`);
  }

  return issueTokenPair(user, meta);
}

// --- refresh (rotation + reuse detection) -------------------------------

export async function refreshSession({ refreshToken }, meta) {
  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) {
    throw new ApiError(401, 'Invalid refresh token.');
  }

  // REUSE DETECTION: a token that was already rotated away is being presented
  // again -> likely theft. Nuke every active refresh token for this user.
  if (stored.revokedAt) {
    await RefreshToken.updateMany(
      { userId: stored.userId, revokedAt: null },
      { revokedAt: new Date() },
    );
    throw new ApiError(401, 'Refresh token has been revoked. Please sign in again.');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(401, 'Refresh token expired. Please sign in again.');
  }

  const user = await User.findById(stored.userId).skipTenantGuard();
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(401, 'Account is unavailable.');
  }

  // Rotate: revoke the presented token and issue a fresh pair.
  const { raw, hash: newHash } = generateRefreshToken();
  stored.revokedAt = new Date();
  stored.replacedByHash = newHash;
  await stored.save();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: newHash,
    schoolId: user.schoolId ?? null,
    expiresAt: refreshTokenExpiryDate(),
    createdByIp: meta.ip,
    userAgent: meta.userAgent,
  });

  return {
    accessToken: signAccessToken(user),
    refreshToken: raw,
    user: publicUser(user),
  };
}

// --- logout ------------------------------------------------------------ -

export async function logoutSession({ refreshToken }) {
  const tokenHash = hashRefreshToken(refreshToken);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() },
  );
  // Always report success — do not leak whether the token existed.
}

// --- current user ----------------------------------------------------- -

export async function getCurrentUser(userId) {
  const user = await User.findById(userId).skipTenantGuard();
  if (!user) throw new ApiError(404, 'User not found.');
  return publicUser(user);
}
