// ---------------------------------------------------------------------------
// authController — thin HTTP layer over authService.
// ---------------------------------------------------------------------------
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as authService from './authService.js';

const requestMeta = (req) => ({
  ip: req.ip,
  userAgent: req.get('user-agent') ?? undefined,
});

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body, requestMeta(req));
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body, requestMeta(req));
  res.status(200).json(result);
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshSession(req.body, requestMeta(req));
  res.status(200).json(result);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutSession(req.body);
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ user });
});
